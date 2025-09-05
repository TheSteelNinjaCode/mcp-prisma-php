import fs from "node:fs";
import path from "node:path";
/* ──────────────────────────────────────────────────────────── *
 *                          Helpers                             *
 * ──────────────────────────────────────────────────────────── */
function bool(v) {
    return v === true;
}
function featureList(cfg) {
    const flags = {
        swaggerDocs: bool(cfg.swaggerDocs),
        tailwindcss: bool(cfg.tailwindcss),
        websocket: bool(cfg.websocket),
        prisma: bool(cfg.prisma),
        docker: bool(cfg.docker),
        // mcp may be boolean or object in some setups
        mcp: typeof cfg.mcp === "object" ? true : bool(cfg.mcp),
    };
    const installed = [];
    const disabled = [];
    for (const [k, v] of Object.entries(flags))
        (v ? installed : disabled).push(k);
    return { installed, disabled, flags };
}
function fileExists(p) {
    if (!p || typeof p !== "string" || !p.trim())
        return null;
    try {
        return fs.existsSync(p);
    }
    catch {
        return null;
    }
}
function detectTailwind(root) {
    // v3-style config files (optional for v4, but still valid if present)
    const hasConfig = fs.existsSync(path.join(root, "tailwind.config.js")) ||
        fs.existsSync(path.join(root, "tailwind.config.cjs")) ||
        fs.existsSync(path.join(root, "tailwind.config.ts"));
    // CLI binary on all platforms
    const bin = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "tailwindcss.cmd" : "tailwindcss");
    const hasBin = fs.existsSync(bin);
    // Prisma PHP default Tailwind v4 entrypoint
    const v4EntrypointRel = path.join("src", "app", "css", "tailwind.css");
    const v4EntrypointAbs = path.join(root, v4EntrypointRel);
    const hasV4Entrypoint = fs.existsSync(v4EntrypointAbs);
    return {
        hasConfig,
        hasBin,
        hasV4Entrypoint,
        v4EntrypointRel,
        v4EntrypointAbs,
    };
}
function readPackageJson(root) {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
        const scripts = pkg?.scripts ?? {};
        return {
            hasSwaggerScript: typeof scripts["create-swagger-docs"] === "string",
        };
    }
    catch {
        return { hasSwaggerScript: false };
    }
}
/* ──────────────────────────────────────────────────────────── *
 *                       MCP Tool Export                        *
 * ──────────────────────────────────────────────────────────── */
export function registerDescribeConfig(server, ctx) {
    server.registerTool("pphp.config.describe", {
        title: "Describe Prisma PHP project",
        description: "Summarizes prisma-php.json and validates common paths/options (Tailwind v4 entry at ./src/app/css/tailwind.css when enabled).",
        inputSchema: {}, // no inputs
    }, async () => {
        if (!ctx.CONFIG) {
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: "Not a Prisma PHP project (prisma-php.json not found).",
                    },
                ],
            };
        }
        const cfg = ctx.CONFIG;
        const features = featureList(cfg);
        const phpExeExists = fileExists(cfg.phpRootPathExe);
        const excludes = Array.isArray(cfg.excludeFiles) ? cfg.excludeFiles : [];
        const { hasSwaggerScript } = readPackageJson(ctx.ROOT);
        const tailwind = detectTailwind(ctx.ROOT);
        const summary = {
            project: {
                name: cfg.projectName ?? null,
                version: cfg.version ?? null,
                root: ctx.ROOT,
                projectRootPath: cfg.projectRootPath ?? null,
            },
            php: {
                environment: cfg.phpEnvironment ?? null,
                phpExePath: cfg.phpRootPathExe ?? null,
                phpExeExists,
            },
            devServer: {
                bsTarget: cfg.bsTarget ?? null,
                bsPathRewrite: cfg.bsPathRewrite ?? {},
            },
            features: {
                installed: features.installed,
                disabled: features.disabled,
                flags: features.flags,
            },
            excludes: {
                count: excludes.length,
                items: excludes,
            },
            checks: {
                tailwind: {
                    declared: !!cfg.tailwindcss,
                    hasConfig: tailwind.hasConfig,
                    hasBinary: tailwind.hasBin,
                    hasV4Entrypoint: tailwind.hasV4Entrypoint,
                    v4EntrypointPath: `./${tailwind.v4EntrypointRel}`,
                },
                swaggerDocs: {
                    declared: !!cfg.swaggerDocs,
                    hasScript: hasSwaggerScript,
                },
            },
            notes: [],
        };
        // ── Tailwind notes (favor v4 expectation for Prisma PHP) ──────────────
        if (cfg.tailwindcss) {
            if (!tailwind.hasV4Entrypoint) {
                summary.notes.push(`TailwindCSS is enabled (v4 expected) but the entry file was not found at ./` +
                    tailwind.v4EntrypointRel +
                    `.`);
            }
            if (!(tailwind.hasConfig || tailwind.hasBin)) {
                summary.notes.push("TailwindCSS is enabled but no config file or CLI binary was found. In v4 a config is optional, but the CLI should be installed.");
            }
        }
        // Swagger notes
        if (cfg.swaggerDocs && !hasSwaggerScript) {
            summary.notes.push('Swagger is enabled but the "create-swagger-docs" script is missing in package.json.');
        }
        // PHP path notes
        if (cfg.phpRootPathExe && phpExeExists === false) {
            summary.notes.push(`phpRootPathExe points to a file that does not exist: ${cfg.phpRootPathExe}`);
        }
        return {
            content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
        };
    });
}
//# sourceMappingURL=describeConfig.js.map