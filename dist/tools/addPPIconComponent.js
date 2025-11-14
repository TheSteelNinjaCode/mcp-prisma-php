import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { safeExec } from "../utils/exec.js";
import { ensurePrismaPhpProject } from "../utils/project.js";
// ⬇️ Local catalogue of valid icon names (1620+). Generate from your list.
import { PPICONS_COMPONENTS as KNOWN_ICONS } from "../resources/ppicons-components.js";
/** Resolve local node_modules/.bin/ppicons */
function localBinPath(root) {
    const base = path.join(root, "node_modules", ".bin");
    const exe = process.platform === "win32" ? "ppicons.cmd" : "ppicons";
    const p = path.join(base, exe);
    return fs.existsSync(p) ? p : null;
}
/** Normalize icon names: allow string, array, or comma/space separated */
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
/** Canonicalize a requested name to the official one from the catalogue, or null if not found. */
function resolveCanonical(name) {
    const raw = name.trim();
    if (!raw)
        return null;
    // Fast paths (exact or with simple tweaks)
    if (KNOWN_ICONS.has(raw))
        return raw;
    const lc = raw.toLowerCase();
    if (KNOWN_ICONS.has(lc))
        return lc;
    const dash = lc.replace(/_/g, "-").replace(/\s+/g, "-");
    if (KNOWN_ICONS.has(dash))
        return dash;
    // Case-insensitive scan (handles entries like "Pocket")
    for (const n of KNOWN_ICONS) {
        if (n.toLowerCase() === lc || n.toLowerCase() === dash)
            return n;
    }
    return null;
}
/** Lightweight Levenshtein distance for fuzzy suggestions */
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (m === 0)
        return n;
    if (n === 0)
        return m;
    const dp = new Array(n + 1).fill(0);
    for (let j = 0; j <= n; j++)
        dp[j] = j;
    for (let i = 1; i <= m; i++) {
        let prev = dp[0];
        dp[0] = i;
        for (let j = 1; j <= n; j++) {
            const tmp = dp[j];
            dp[j] = Math.min(dp[j] + 1, // deletion
            dp[j - 1] + 1, // insertion
            prev + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
            );
            prev = tmp;
        }
    }
    return dp[n];
}
/** Suggest up to N closest icon names */
function suggest(name, limit = 6) {
    const q = name.toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
    const all = Array.from(KNOWN_ICONS);
    // Quick prefix/substring hits
    const starts = all.filter((n) => n.startsWith(q)).slice(0, limit);
    if (starts.length >= 1)
        return starts;
    const contains = all.filter((n) => n.includes(q)).slice(0, limit);
    if (contains.length >= 1)
        return contains;
    // Edit-distance (cap scan to keep it fast — catalogue is ~1.6k)
    const scored = all
        .map((n) => [n, levenshtein(q, n)])
        .sort((a, b) => a[1] - b[1])
        .slice(0, limit);
    // Only show if reasonably close
    const maxDist = q.length <= 4 ? 1 : q.length <= 6 ? 2 : 3;
    return scored.filter(([, d]) => d <= maxDist).map(([n]) => n);
}
/** Validate and canonicalize a list; return { valid, missing } */
function validateRequestedNames(reqNames) {
    const valid = [];
    const missing = [];
    const seen = new Set();
    for (const raw of reqNames) {
        const canonical = resolveCanonical(raw);
        if (canonical) {
            if (!seen.has(canonical)) {
                valid.push(canonical);
                seen.add(canonical);
            }
        }
        else {
            missing.push({ query: raw, suggestions: suggest(raw) });
        }
    }
    return { valid, missing };
}
/** Helper to create namespace hints for success messages */
function createNamespaceHint(icons, isAll = false) {
    if (isAll) {
        return "Import with: use Lib\\PPIcons\\{IconName1, IconName2, ...}; then use <IconName /> in markup.";
    }
    if (icons.length === 0)
        return "";
    if (icons.length === 1) {
        return `Import with: use Lib\\PPIcons\\${icons[0]}; then use <${icons[0]} /> in markup.`;
    }
    return `Import with: use Lib\\PPIcons\\{${icons.join(", ")}}; then use as HTML tags in markup.`;
}
export function registerAddPPIconComponent(server, ctx) {
    server.registerTool("pp.component.addPPIcon", {
        title: "Add Component (PPIcons)",
        description: "Add one or more icon components from the PPIcons catalogue (lucide-style). Icons are installed in the Lib\\PPIcons namespace following PSR-4 autoloading. Use imports like: use Lib\\PPIcons\\{Icon1, Icon2}; then use <IconName /> as HTML tags in markup.",
        inputSchema: {
            // Provide either `names` or set `all: true`
            names: z.union([z.string(), z.array(z.string())]).optional(),
            all: z.boolean().optional(),
            // Pass-through CLI flags
            out: z.string().optional(), // --out <dir>
            force: z.boolean().optional(), // --force
            // Install strategy if ppicons CLI is not present locally:
            // - "none"   (default): run via npx (optionally pinned)
            // - "local": install as devDependency (npm i -D ppicons@ver)
            // - "global": install globally (npm i -g ppicons@ver)
            installIfMissing: z.enum(["none", "local", "global"]).optional(),
            // Optional version to pin for install or npx (e.g., "1.2.3" or "latest")
            version: z.string().optional(),
        },
    }, async (args, _extra) => {
        try {
            ensurePrismaPhpProject(ctx);
            const installMode = args.installIfMissing ?? "none";
            const pinned = args.version?.trim();
            const localCli = localBinPath(ctx.ROOT);
            const requested = normalizeNames(args.names);
            // Validate names unless --all
            let names = [];
            if (!args.all) {
                if (requested.length === 0) {
                    return {
                        isError: true,
                        content: [
                            {
                                type: "text",
                                text: "Provide at least one icon via `names`, or set `all: true` to install the full catalogue.",
                            },
                        ],
                    };
                }
                const { valid, missing } = validateRequestedNames(requested);
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
                                text: `Unknown icon name(s):\n${lines.join("\n")}`,
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
                                text: "No valid icon names after normalization.",
                            },
                        ],
                    };
                }
                names = valid;
            }
            // Build the CLI command tokens
            const tokens = [];
            const push = (t) => tokens.push(t);
            const buildArgList = () => {
                push("add");
                if (args.all) {
                    push("--all");
                }
                else {
                    for (const n of names)
                        push(n);
                }
                if (args.out) {
                    push("--out");
                    push(args.out);
                }
                if (args.force) {
                    push("--force");
                }
                // safely quote
                return tokens
                    .map((t) => (/^[a-zA-Z0-9._-]+$/.test(t) ? t : JSON.stringify(t)))
                    .join(" ");
            };
            // Prefer local CLI
            if (localCli) {
                const cmd = `${JSON.stringify(localCli)} ${buildArgList()}`;
                const r = safeExec(cmd, ctx.ROOT);
                if (r.ok) {
                    const hint = createNamespaceHint(names, args.all);
                    return {
                        content: [
                            {
                                type: "text",
                                text: args.all
                                    ? `All icons installed (local ppicons). ${hint}`
                                    : `Icons added: ${names.join(", ")} (local ppicons). ${hint}`,
                            },
                        ],
                    };
                }
                return {
                    isError: true,
                    content: [{ type: "text", text: r.message }],
                };
            }
            // Install or use npx
            if (installMode === "local") {
                const ver = pinned ? `@${pinned}` : "";
                const i = safeExec(`npm i -D ppicons${ver}`, ctx.ROOT);
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
                                text: "Installed ppicons locally, but CLI not found in node_modules/.bin.",
                            },
                        ],
                    };
                }
                const cmd = `${JSON.stringify(after)} ${buildArgList()}`;
                const r = safeExec(cmd, ctx.ROOT);
                if (r.ok) {
                    const hint = createNamespaceHint(names, args.all);
                    return {
                        content: [
                            {
                                type: "text",
                                text: args.all
                                    ? `All icons installed (installed local ppicons${ver}). ${hint}`
                                    : `Icons added: ${names.join(", ")} (installed local ppicons${ver}). ${hint}`,
                            },
                        ],
                    };
                }
                return {
                    isError: true,
                    content: [{ type: "text", text: r.message }],
                };
            }
            if (installMode === "global") {
                const ver = pinned ? `@${pinned}` : "";
                const i = safeExec(`npm i -g ppicons${ver}`, ctx.ROOT);
                if (!i.ok)
                    return {
                        isError: true,
                        content: [
                            { type: "text", text: `Global install failed: ${i.message}` },
                        ],
                    };
                const npxPkg = pinned ? `ppicons@${pinned}` : "ppicons";
                const r = safeExec(`npx -y ${npxPkg} ${buildArgList()}`, ctx.ROOT);
                if (r.ok) {
                    const hint = createNamespaceHint(names, args.all);
                    return {
                        content: [
                            {
                                type: "text",
                                text: args.all
                                    ? `All icons installed (global/npx ${npxPkg}). ${hint}`
                                    : `Icons added: ${names.join(", ")} (global/npx ${npxPkg}). ${hint}`,
                            },
                        ],
                    };
                }
                return {
                    isError: true,
                    content: [{ type: "text", text: r.message }],
                };
            }
            // installIfMissing === "none" → npx
            {
                const npxPkg = pinned ? `ppicons@${pinned}` : "ppicons";
                const r = safeExec(`npx -y ${npxPkg} ${buildArgList()}`, ctx.ROOT);
                if (r.ok) {
                    const hint = createNamespaceHint(names, args.all);
                    return {
                        content: [
                            {
                                type: "text",
                                text: args.all
                                    ? `All icons installed (npx ${npxPkg}). ${hint}`
                                    : `Icons added: ${names.join(", ")} (npx ${npxPkg}). ${hint}`,
                            },
                        ],
                    };
                }
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: r.message +
                                ' — You can rerun with { installIfMissing: "local", version: "<ver>" } to pin and persist ppicons.',
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
//# sourceMappingURL=addPPIconComponent.js.map