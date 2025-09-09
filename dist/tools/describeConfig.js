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
        mcp: bool(cfg.mcp),
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
/** Try to read composer.json PSR-4 and return the first base dir for "Lib\\" if present. */
function readComposerPsr4(root) {
    const composerPath = path.join(root, "composer.json");
    const hasComposer = fs.existsSync(composerPath);
    const vendorAutoloadExists = fs.existsSync(path.join(root, "vendor", "autoload.php"));
    if (!hasComposer)
        return {
            hasComposer,
            vendorAutoloadExists,
            libNamespaceBaseAbs: null,
            libNamespaceBaseRel: null,
        };
    try {
        const composer = JSON.parse(fs.readFileSync(composerPath, "utf8"));
        const psr4 = composer?.autoload?.["psr-4"] ?? composer?.autoload?.psr4 ?? {};
        let baseRel = null;
        // Accept any of: "Lib\\": "app/inc/Lib/" OR array form.
        for (const k of Object.keys(psr4)) {
            if (k === "Lib\\" && psr4[k]) {
                const val = psr4[k];
                if (typeof val === "string")
                    baseRel = val;
                else if (Array.isArray(val) && typeof val[0] === "string")
                    baseRel = val[0];
                break;
            }
        }
        if (!baseRel)
            return {
                hasComposer,
                vendorAutoloadExists,
                libNamespaceBaseAbs: null,
                libNamespaceBaseRel: null,
            };
        const baseAbs = path.join(root, baseRel);
        return {
            hasComposer,
            vendorAutoloadExists,
            libNamespaceBaseAbs: baseAbs,
            libNamespaceBaseRel: baseRel.replace(/\\/g, "/"),
        };
    }
    catch {
        return {
            hasComposer,
            vendorAutoloadExists,
            libNamespaceBaseAbs: null,
            libNamespaceBaseRel: null,
        };
    }
}
/** Look for a schema.prisma in common locations. */
function findPrismaSchema(root) {
    const candidates = [
        path.join(root, "prisma", "schema.prisma"),
        path.join(root, "schema.prisma"),
        path.join(root, "app", "prisma", "schema.prisma"),
    ];
    for (const abs of candidates) {
        if (fs.existsSync(abs)) {
            return {
                schemaPathAbs: abs,
                schemaPathRel: path.relative(root, abs).replace(/\\/g, "/"),
            };
        }
    }
    return { schemaPathAbs: null, schemaPathRel: null };
}
/** Read .env and detect DATABASE_URL. */
function readDotEnv(root) {
    const envPath = path.join(root, ".env");
    if (!fs.existsSync(envPath))
        return { envExists: false, hasDatabaseUrl: false };
    try {
        const text = fs.readFileSync(envPath, "utf8");
        const hasDb = /^DATABASE_URL\s*=/m.test(text);
        return { envExists: true, hasDatabaseUrl: hasDb };
    }
    catch {
        return { envExists: true, hasDatabaseUrl: false };
    }
}
/** Resolve Lib\Prisma\Classes\Prisma.php using PSR-4 base. */
function resolvePrismaPhpClass(libBaseAbs) {
    if (!libBaseAbs)
        return {
            prismaClassAbs: null,
            prismaClassRel: null,
            prismaClassExists: false,
        };
    const abs = path.join(libBaseAbs, "Prisma", "Classes", "Prisma.php");
    const exists = fs.existsSync(abs);
    return {
        prismaClassAbs: exists ? abs : null,
        prismaClassRel: exists ? null : null, // filled below in caller with root if needed
        prismaClassExists: exists,
    };
}
function detectPHPXUI(root) {
    const phpxuiConfigPath = path.join(root, "phpxui.json");
    const hasPhpxuiConfig = fs.existsSync(phpxuiConfigPath);
    return {
        hasPhpxuiConfig,
        phpxuiConfigPath: hasPhpxuiConfig ? "./phpxui.json" : null,
        shadcnColorsAvailable: hasPhpxuiConfig, // PHPXUI = shadcn colors
    };
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
        const phpxui = detectPHPXUI(ctx.ROOT);
        // ── Prisma detection & checks ───────────────────────────
        const prismaDeclared = !!cfg.prisma;
        const prismaMode = prismaDeclared ? "prisma" : "frontend-only";
        const schemaInfo = findPrismaSchema(ctx.ROOT);
        const envInfo = readDotEnv(ctx.ROOT);
        const composerInfo = readComposerPsr4(ctx.ROOT);
        const prismaClassInfo = resolvePrismaPhpClass(composerInfo.libNamespaceBaseAbs);
        // Fill rel path if we found the class
        const prismaClassRel = prismaClassInfo.prismaClassAbs
            ? path
                .relative(ctx.ROOT, prismaClassInfo.prismaClassAbs)
                .replace(/\\/g, "/")
            : null;
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
                phpxui: {
                    installed: phpxui.hasPhpxuiConfig,
                    configPath: phpxui.phpxuiConfigPath,
                    shadcnColorsAvailable: phpxui.shadcnColorsAvailable,
                },
                swaggerDocs: {
                    declared: !!cfg.swaggerDocs,
                    hasScript: hasSwaggerScript,
                },
                prisma: {
                    declared: prismaDeclared,
                    mode: prismaMode, // "prisma" | "frontend-only"
                    schemaPath: schemaInfo.schemaPathRel,
                    envExists: envInfo.envExists,
                    hasDatabaseUrl: envInfo.hasDatabaseUrl,
                    composer: {
                        hasComposer: composerInfo.hasComposer,
                        vendorAutoloadExists: composerInfo.vendorAutoloadExists,
                        libNamespaceBase: composerInfo.libNamespaceBaseRel,
                    },
                    prismaClass: {
                        classFqn: "Lib\\Prisma\\Classes\\Prisma",
                        path: prismaClassRel,
                        exists: prismaClassInfo.prismaClassExists,
                    },
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
        // ── PHPXUI notes ────────────────────────────────────────────────
        if (phpxui.hasPhpxuiConfig) {
            summary.notes.push("PHPXUI is installed → Use shadcn/ui color conventions (bg-background, text-foreground, etc.) for components and styling.");
        }
        // ── Swagger notes ─────────────────────────────────────────────────────
        if (cfg.swaggerDocs && !hasSwaggerScript) {
            summary.notes.push('Swagger is enabled but the "create-swagger-docs" script is missing in package.json.');
        }
        // ── PHP path notes ────────────────────────────────────────────────────
        if (cfg.phpRootPathExe && phpExeExists === false) {
            summary.notes.push(`phpRootPathExe points to a file that does not exist: ${cfg.phpRootPathExe}`);
        }
        // ── Prisma notes & guidance ───────────────────────────────────────────
        if (!prismaDeclared) {
            summary.notes.push("Prisma ORM is disabled in prisma-php.json → CRUD tools will emit front-end-only scaffolding (no PHP).");
        }
        else {
            if (!schemaInfo.schemaPathRel) {
                summary.notes.push("Prisma ORM is enabled but schema.prisma was not found (searched ./prisma/schema.prisma, ./schema.prisma, ./app/prisma/schema.prisma).");
            }
            if (!envInfo.envExists) {
                summary.notes.push("Prisma ORM is enabled but .env file is missing.");
            }
            else if (!envInfo.hasDatabaseUrl) {
                summary.notes.push("Prisma ORM is enabled but .env is missing DATABASE_URL.");
            }
            if (!composerInfo.hasComposer) {
                summary.notes.push("composer.json was not found; PSR-4 autoload may be misconfigured for PHP classes.");
            }
            else if (!composerInfo.vendorAutoloadExists) {
                summary.notes.push("vendor/autoload.php was not found. Run `composer install`.");
            }
            if (!composerInfo.libNamespaceBaseAbs) {
                summary.notes.push('PSR-4 mapping for "Lib\\\\" was not found in composer.json autoload.');
            }
            else if (!prismaClassInfo.prismaClassExists) {
                summary.notes.push(`Expected Prisma class at ${path
                    .join(composerInfo.libNamespaceBaseRel, "Prisma/Classes/Prisma.php")
                    .replace(/\\/g, "/")} but it was not found.`);
            }
        }
        return {
            content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
        };
    });
}
//# sourceMappingURL=describeConfig.js.map