import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { safeExec } from "../utils/exec.js";
import { ensurePrismaPhpProject } from "../utils/project.js";
import { resolvePhpXUI, suggestPhpXUI, } from "../resources/phpxui-components.js";
import { PPICONS_COMPONENTS as ICONS } from "../resources/ppicons-component.js";
/** Resolve local node_modules/.bin/phpxui */
function localBinPath(root) {
    const base = path.join(root, "node_modules", ".bin");
    const exe = process.platform === "win32" ? "phpxui.cmd" : "phpxui";
    const p = path.join(base, exe);
    return fs.existsSync(p) ? p : null;
}
/** Resolve local node_modules/.bin/ppicons (for optional auto-reroute). */
function localIconsBinPath(root) {
    const base = path.join(root, "node_modules", ".bin");
    const exe = process.platform === "win32" ? "ppicons.cmd" : "ppicons";
    const p = path.join(base, exe);
    return fs.existsSync(p) ? p : null;
}
/** Normalize: accept string, string[], or comma/space-separated list. */
function normalizeNames(input) {
    if (!input)
        return [];
    if (Array.isArray(input))
        return input.flatMap(normalizeNames);
    return input
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
}
/** Catalogue-backed membership with safe input. */
function hasIcon(name) {
    const raw = (name ?? "").trim();
    if (!raw)
        return false;
    if (ICONS.has(raw))
        return true;
    const lc = raw.toLowerCase();
    if (ICONS.has(lc))
        return true;
    // Handle special cases like "Pocket"
    const upperFirst = typeof lc === "string" && lc && lc.length > 0
        ? lc[0].toUpperCase() + lc.slice(1)
        : lc;
    if (ICONS.has(upperFirst))
        return true;
    // common normalizations
    const kebab = lc.replace(/_/g, "-").replace(/\s+/g, "-");
    if (ICONS.has(kebab))
        return true;
    return false;
}
/**
 * Use the ppicons catalogue to decide if a query "looks like" an icon.
 * Handles phrases like "eye icon", "icon-eye", "eye-icon component", "chevron right".
 */
function looksLikeIconName(query) {
    const raw = (query ?? "").trim();
    if (!raw)
        return false;
    // strip noise words, produce base string
    const stripped = raw
        .replace(/\b(icon|icons|component|components|icon-component|component-icon|svg)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    const candidates = new Set();
    const push = (s) => {
        if (s && s.trim())
            candidates.add(s.trim());
    };
    // base variants
    push(stripped);
    push(stripped.replace(/\s+/g, "-")); // "chevron right" -> "chevron-right"
    push(stripped.replace(/\s+/g, "")); // "chevron right" -> "chevronright"
    // handle leading/trailing "icon-" and "-icon"
    push(stripped.replace(/-?icon$/i, "").trim());
    push(stripped.replace(/^icon-?/i, "").trim());
    // consider last word (e.g. "add eye icon")
    const parts = stripped.split(/\s+/);
    const last = parts.length > 0 ? parts[parts.length - 1] : undefined;
    if (last)
        push(last);
    for (const c of candidates) {
        const norm = c.toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
        if (hasIcon(norm))
            return true;
    }
    return false;
}
/** Helper to create namespace hints for success messages */
function createNamespaceHint(components) {
    if (components.length === 0)
        return "";
    if (components.length === 1) {
        return `Import with: use Lib\\PHPXUI\\${components[0]}; then use <${components[0]} /> in markup.`;
    }
    return `Import with: use Lib\\PHPXUI\\{${components.join(", ")}}; then use as HTML tags in markup.`;
}
export function registerAddPHPXUIComponent(server, ctx) {
    server.registerTool("pphp.component.addPHPXUI", {
        title: "Add Component (PHPXUI)",
        description: "Add one or more PHPXUI components (shadcn-style) such as Dialog, Toast, or Sheet. " +
            "Components are installed in the Lib\\PHPXUI namespace following PSR-4 autoloading. " +
            "Use imports like: use Lib\\PHPXUI\\{Component1, Component2}; then use as HTML tags in markup.",
        inputSchema: {
            // Back-compat: support `name`, but also `names` for multiples.
            name: z.string().optional(),
            names: z.union([z.string(), z.array(z.string())]).optional(),
            // Install strategy if phpxui CLI is not present locally:
            // - "none"   (default): just use npx (optionally with a version)
            // - "local": install as devDependency (npm i -D phpxui@ver)
            // - "global": install globally (npm i -g phpxui@ver)
            installIfMissing: z.enum(["none", "local", "global"]).optional(),
            // Optional version to use for install or npx (e.g., "1.2.3" or "latest")
            version: z.string().optional(),
            // Optional: auto-reroute obvious icon names to ppicons
            autoRerouteToIcons: z.boolean().optional(),
        },
    }, async (args, _extra) => {
        try {
            ensurePrismaPhpProject(ctx);
            const installMode = args.installIfMissing ?? "none";
            const pinned = args.version?.trim();
            const localCli = localBinPath(ctx.ROOT);
            // Gather requests
            const requestedRaw = normalizeNames(args.names ?? args.name ?? "");
            if (requestedRaw.length === 0) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "Provide at least one component via `name` or `names`.",
                        },
                    ],
                };
            }
            // Safe auto-reroute block (works with noUncheckedIndexedAccess)
            if (args.autoRerouteToIcons !== false && requestedRaw.length === 1) {
                const only = requestedRaw[0]; // string | undefined
                if (only && !resolvePhpXUI(only) && looksLikeIconName(only)) {
                    const localIcons = localIconsBinPath(ctx.ROOT);
                    const quoted = /^[\w.-]+$/.test(only) ? only : JSON.stringify(only);
                    const cmd = localIcons
                        ? `${JSON.stringify(localIcons)} add ${quoted}`
                        : `npx -y ppicons add ${quoted}`;
                    const rr = safeExec(cmd, ctx.ROOT);
                    if (rr.ok) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Looks like an icon — routed to PPIcons. Icon '${only}' added. Import with: use Lib\\PPIcons\\${only}; then use <${only} /> in markup.`,
                                },
                            ],
                        };
                    }
                    // fall through to normal UI flow on failure
                }
            }
            // Validate against catalogue and canonicalize
            const valid = [];
            const missing = [];
            const seen = new Set();
            for (const raw of requestedRaw) {
                const canonical = resolvePhpXUI(raw);
                if (canonical) {
                    if (!seen.has(canonical)) {
                        valid.push(canonical);
                        seen.add(canonical);
                    }
                }
                else {
                    missing.push({ query: raw, suggestions: suggestPhpXUI(raw) });
                }
            }
            if (missing.length) {
                const lines = missing.map((m) => {
                    const sug = m.suggestions.length
                        ? `  → Suggestions: ${m.suggestions.join(", ")}`
                        : "";
                    return `• "${m.query}" not found.${sug}`;
                });
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Unknown component name(s):\n${lines.join("\n")}`,
                        },
                    ],
                };
            }
            if (valid.length === 0) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "No valid component names after normalization.",
                        },
                    ],
                };
            }
            // Helper to run "phpxui add <Component>" for each.
            const runAdd = (bin) => {
                const results = [];
                const failures = [];
                for (const comp of valid) {
                    const cmd = `${JSON.stringify(bin)} add ${/^[\w.-]+$/.test(comp) ? comp : JSON.stringify(comp)}`;
                    const r = safeExec(cmd, ctx.ROOT);
                    if (r.ok)
                        results.push(comp);
                    else
                        failures.push(`${comp}: ${r.message}`);
                }
                return { results, failures };
            };
            // Prefer local CLI
            if (localCli) {
                const { results, failures } = runAdd(localCli);
                if (failures.length === 0) {
                    const hint = createNamespaceHint(results);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Component(s) added (local phpxui): ${results.join(", ")}. ${hint}`,
                            },
                        ],
                    };
                }
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Some components failed:\n${failures.join("\n")}`,
                        },
                    ],
                };
            }
            // Install or use npx
            if (installMode === "local") {
                const ver = pinned ? `@${pinned}` : "";
                const i = safeExec(`npm i -D phpxui${ver}`, ctx.ROOT);
                if (!i.ok)
                    return {
                        isError: true,
                        content: [{ type: "text", text: `Install failed: ${i.message}` }],
                    };
                const after = localBinPath(ctx.ROOT);
                if (!after) {
                    return {
                        isError: true,
                        content: [
                            {
                                type: "text",
                                text: "Installed phpxui locally, but CLI not found in node_modules/.bin.",
                            },
                        ],
                    };
                }
                const { results, failures } = runAdd(after);
                if (failures.length === 0) {
                    const hint = createNamespaceHint(results);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Component(s) added (installed local phpxui${ver}): ${results.join(", ")}. ${hint}`,
                            },
                        ],
                    };
                }
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Some components failed:\n${failures.join("\n")}`,
                        },
                    ],
                };
            }
            if (installMode === "global") {
                const ver = pinned ? `@${pinned}` : "";
                const i = safeExec(`npm i -g phpxui${ver}`, ctx.ROOT);
                if (!i.ok)
                    return {
                        isError: true,
                        content: [
                            { type: "text", text: `Global install failed: ${i.message}` },
                        ],
                    };
                const npxPkg = pinned ? `phpxui@${pinned}` : "phpxui";
                const res = [];
                const fail = [];
                for (const comp of valid) {
                    const cmd = `npx -y ${npxPkg} add ${/^[\w.-]+$/.test(comp) ? comp : JSON.stringify(comp)}`;
                    const r = safeExec(cmd, ctx.ROOT);
                    if (r.ok)
                        res.push(comp);
                    else
                        fail.push(`${comp}: ${r.message}`);
                }
                if (fail.length === 0) {
                    const hint = createNamespaceHint(res);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Component(s) added (global/npx ${npxPkg}): ${res.join(", ")}. ${hint}`,
                            },
                        ],
                    };
                }
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Some components failed:\n${fail.join("\n")}`,
                        },
                    ],
                };
            }
            // installIfMissing === "none" → pure npx
            {
                const npxPkg = pinned ? `phpxui@${pinned}` : "phpxui";
                const res = [];
                const fail = [];
                for (const comp of valid) {
                    const cmd = `npx -y ${npxPkg} add ${/^[\w.-]+$/.test(comp) ? comp : JSON.stringify(comp)}`;
                    const r = safeExec(cmd, ctx.ROOT);
                    if (r.ok)
                        res.push(comp);
                    else
                        fail.push(`${comp}: ${r.message}`);
                }
                if (fail.length === 0) {
                    const hint = createNamespaceHint(res);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Component(s) added (npx ${npxPkg}): ${res.join(", ")}. ${hint}`,
                            },
                        ],
                    };
                }
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Some components failed:\n${fail.join("\n")}` +
                                ' — You can rerun with { installIfMissing: "local", version: "<ver>" } to pin and persist phpxui.',
                        },
                    ],
                };
            }
        }
        catch (e) {
            return {
                isError: true,
                content: [{ type: "text", text: e?.message ?? String(e) }],
            };
        }
    });
}
//# sourceMappingURL=addPHPXUIComponent.js.map