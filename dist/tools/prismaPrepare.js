import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ensurePrismaPhpProject } from "../utils/project.js";
import { safeExec } from "../utils/exec.js";
// ✅ Prisma PHP supports only these three:
const ProviderEnum = z.enum(["postgresql", "mysql", "sqlite"]);
// Expose a ZodRawShape to the MCP tool (NOT a z.object)
const InputShape = {
    provider: ProviderEnum.optional(),
    dbUrl: z.string().min(1).optional(),
    updateEnv: z.boolean().optional(), // defaults to true if provider is passed
    updateSchemaProvider: z.boolean().optional(), // default true
    migrate: z.boolean().optional(), // default true
    migrateName: z.string().min(1).optional(), // default "init" on first run
    dbPush: z.boolean().optional(), // use prisma db push instead of migrate dev
    createDb: z.boolean().optional(), // --create-db
    generate: z.boolean().optional(), // default true
    extraMigrateArgs: z.array(z.string()).optional(),
    extraGenerateArgs: z.array(z.string()).optional(),
};
const InputObject = z.object(InputShape);
/* ───────────────── helpers ───────────────── */
function readEnv(envPath) {
    if (!fs.existsSync(envPath))
        return {};
    const text = fs.readFileSync(envPath, "utf8");
    const out = {};
    for (const line of text.split(/\r?\n/)) {
        const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
        if (!m || typeof m[1] === "undefined" || typeof m[2] === "undefined")
            continue;
        const key = m[1].trim();
        let val = m[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        out[key] = val;
    }
    return out;
}
function writeEnvValue(envPath, key, value) {
    let text = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
    const line = `${key}="${value}"`;
    if (new RegExp(`^${key}=`, "m").test(text)) {
        text = text.replace(new RegExp(`^${key}=.*$`, "m"), line);
    }
    else {
        if (text && !text.endsWith("\n"))
            text += "\n";
        text += line + "\n";
    }
    fs.writeFileSync(envPath, text, "utf8");
}
function inferProviderFromUrl(url) {
    if (!url)
        return undefined;
    const lower = url.toLowerCase();
    if (lower.startsWith("file:"))
        return "sqlite";
    if (lower.startsWith("postgresql://"))
        return "postgresql";
    if (lower.startsWith("mysql://"))
        return "mysql";
    return undefined;
}
function urlMatchesProvider(url, provider) {
    const lower = url.toLowerCase();
    if (provider === "sqlite")
        return lower.startsWith("file:");
    if (provider === "postgresql")
        return lower.startsWith("postgresql://");
    if (provider === "mysql")
        return lower.startsWith("mysql://");
    return false;
}
/**
 * Canonicalize the datasource block:
 * - remove any existing `provider = ...` and `url = ...` lines
 * - insert exactly one of each with correct indentation
 * - keep any other lines (e.g., shadowDatabaseUrl) untouched
 * Result:
 * datasource db {
 *   provider = "<provider>"
 *   url      = env("DATABASE_URL")
 *   ...
 * }
 */
function syncDatasourceBlock(schemaPath, provider) {
    if (!fs.existsSync(schemaPath)) {
        throw new Error(`schema.prisma not found at ${schemaPath}`);
    }
    const src = fs.readFileSync(schemaPath, "utf8");
    const dsRe = /(datasource\s+db\s*{\s*)([\s\S]*?)(\s*})/m;
    if (!dsRe.test(src)) {
        throw new Error(`Could not find 'datasource db { ... }' block in ${schemaPath}`);
    }
    const updated = src.replace(dsRe, (_full, open, body, close) => {
        // remove provider and url lines
        let cleaned = body
            .replace(/^\s*provider\s*=\s*["'][^"']*["']\s*$(\r?\n)?/gm, "")
            .replace(/^\s*url\s*=\s*.+$(\r?\n)?/gm, "");
        // indentation (use first non-empty line or 2 spaces)
        const indentMatch = cleaned.match(/^\s*(?=\S)/m);
        const indent = indentMatch ? indentMatch[0] : "  ";
        const providerLine = `${indent}provider = "${provider}"\n`;
        const urlLine = `${indent}url      = env("DATABASE_URL")\n`;
        // avoid extra blank lines at top
        cleaned = cleaned.replace(/^\s*(\r?\n)?/, "");
        return `${open}${providerLine}${urlLine}${cleaned}${close}`;
    });
    fs.writeFileSync(schemaPath, updated, "utf8");
}
function hasMigrations(prismaDir) {
    const mDir = path.join(prismaDir, "migrations");
    if (!fs.existsSync(mDir))
        return false;
    const entries = fs
        .readdirSync(mDir)
        .filter((d) => fs.statSync(path.join(mDir, d)).isDirectory());
    return entries.length > 0;
}
/* ───────────────── tool ───────────────── */
export function registerPrismaPrepare(server, ctx) {
    server.registerTool("pphp.prisma.prepare", {
        title: "Prepare database (Prisma)",
        description: "Checks prisma enabled in prisma-php.json, aligns provider + env URL, canonicalizes datasource, runs migrate/db push, then ppo generate.",
        inputSchema: InputShape,
    }, async (raw) => {
        const args = InputObject.parse(raw);
        try {
            // 0) Verify Prisma PHP project and feature flag first
            ensurePrismaPhpProject(ctx);
            const prismaEnabled = ctx.CONFIG?.prisma === true;
            if (!prismaEnabled) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: 'Prisma ORM is disabled in prisma-php.json (expected `"prisma": true`).\n' +
                                "Action: run `pphp.project.update` to enable Prisma.\n" +
                                "Tip: confirm flags via `pphp.config.describe`.",
                        },
                    ],
                };
            }
            const root = ctx.ROOT;
            const prismaDir = path.join(root, "prisma");
            const schemaPath = path.join(prismaDir, "schema.prisma");
            const envPath = path.join(root, ".env");
            // Defaults: if user passed provider, default updateEnv=true; otherwise keep false.
            const updateEnv = args.updateEnv ?? !!args.provider;
            // 1) ENV + provider resolution
            const env = readEnv(envPath);
            const urlInEnv = args.dbUrl ?? env.DATABASE_URL;
            let provider = args.provider ?? inferProviderFromUrl(urlInEnv);
            if (!provider && updateEnv)
                provider = "sqlite"; // quick-start default
            const steps = [];
            // Ensure we have a URL in .env aligned with provider
            if (!urlInEnv) {
                if (updateEnv) {
                    if (!provider) {
                        return {
                            isError: true,
                            content: [
                                {
                                    type: "text",
                                    text: "Provider is unknown and .env has no DATABASE_URL. Pass { provider } or { dbUrl }.",
                                },
                            ],
                        };
                    }
                    if (provider === "sqlite") {
                        const defaultSqlite = "file:./dev.db";
                        writeEnvValue(envPath, "DATABASE_URL", defaultSqlite);
                        steps.push(`.env: set DATABASE_URL="${defaultSqlite}"`);
                    }
                    else {
                        // don't invent credentials for mysql/postgres
                        return {
                            isError: true,
                            content: [
                                {
                                    type: "text",
                                    text: `DATABASE_URL is missing. Provide a valid URL for ${provider} (or switch to sqlite), ` +
                                        `e.g. postgresql://user:pass@localhost:5432/mydb?schema=public`,
                                },
                            ],
                        };
                    }
                }
                else {
                    return {
                        isError: true,
                        content: [
                            {
                                type: "text",
                                text: 'DATABASE_URL is missing in .env. Re-run with { updateEnv: true } or provide { dbUrl: "…" }.',
                            },
                        ],
                    };
                }
            }
            else {
                // URL exists — ensure it matches provider
                if (!provider)
                    provider = inferProviderFromUrl(urlInEnv);
                if (!provider) {
                    return {
                        isError: true,
                        content: [
                            {
                                type: "text",
                                text: "Unable to infer provider from DATABASE_URL. Pass `provider` (postgresql | mysql | sqlite).",
                            },
                        ],
                    };
                }
                if (!urlMatchesProvider(urlInEnv, provider)) {
                    if (updateEnv && provider === "sqlite") {
                        const defaultSqlite = "file:./dev.db";
                        writeEnvValue(envPath, "DATABASE_URL", defaultSqlite);
                        steps.push(`.env: corrected DATABASE_URL to "${defaultSqlite}" for sqlite`);
                    }
                    else {
                        const want = provider === "sqlite"
                            ? "file:./dev.db"
                            : provider === "postgresql"
                                ? "postgresql://user:pass@localhost:5432/mydb?schema=public"
                                : "mysql://user:pass@localhost:3306/mydb";
                        return {
                            isError: true,
                            content: [
                                {
                                    type: "text",
                                    text: `Your DATABASE_URL "${urlInEnv}" does not match provider "${provider}". ` +
                                        `Expected something like: ${want}\n` +
                                        `Fix .env or pass { dbUrl: "…" }.`,
                                },
                            ],
                        };
                    }
                }
            }
            // 2) Canonicalize datasource: provider + url = env("DATABASE_URL")
            if (args.updateSchemaProvider !== false) {
                if (!provider) {
                    return {
                        isError: true,
                        content: [
                            {
                                type: "text",
                                text: "Provider could not be resolved to update schema.prisma.",
                            },
                        ],
                    };
                }
                syncDatasourceBlock(schemaPath, provider);
                steps.push(`schema.prisma: canonicalized datasource (provider="${provider}", url=env("DATABASE_URL"))`);
            }
            // 3) migrate or db push
            const doMigrate = args.migrate !== false && !args.dbPush;
            const doDbPush = !!args.dbPush;
            if (doDbPush) {
                const extra = Array.isArray(args.extraMigrateArgs)
                    ? args.extraMigrateArgs
                    : [];
                const cmd = ["npx", "-y", "prisma", "db", "push", ...extra].join(" ");
                const r = safeExec(cmd, root);
                if (!r.ok)
                    return {
                        isError: true,
                        content: [{ type: "text", text: r.message }],
                    };
                steps.push("prisma db push: completed");
            }
            else if (doMigrate) {
                const firstRun = !hasMigrations(prismaDir);
                const migrateName = args.migrateName ?? (firstRun ? "init" : undefined);
                const extra = Array.isArray(args.extraMigrateArgs)
                    ? args.extraMigrateArgs
                    : [];
                const cmd = [
                    "npx",
                    "-y",
                    "prisma",
                    "migrate",
                    "dev",
                    ...(args.createDb ? ["--create-db"] : []),
                    ...(migrateName ? ["--name", migrateName] : []),
                    ...extra,
                ].join(" ");
                const r = safeExec(cmd, root);
                if (!r.ok)
                    return {
                        isError: true,
                        content: [{ type: "text", text: r.message }],
                    };
                steps.push(`prisma migrate dev: completed${migrateName ? ` (name: ${migrateName})` : ""}`);
            }
            // 4) generate PHP classes
            if (args.generate !== false) {
                const extra = Array.isArray(args.extraGenerateArgs)
                    ? args.extraGenerateArgs
                    : [];
                const cmd = ["npx", "-y", "ppo", "generate", ...extra].join(" ");
                const r = safeExec(cmd, root);
                if (!r.ok)
                    return {
                        isError: true,
                        content: [{ type: "text", text: r.message }],
                    };
                steps.push("ppo generate: completed");
            }
            const summary = [
                `Provider: ${provider}`,
                `Schema: ${path.relative(root, schemaPath)}`,
                `Env: ${path.relative(root, envPath)}`,
                ...steps,
            ].join("\n");
            return { content: [{ type: "text", text: summary }] };
        }
        catch (e) {
            return {
                isError: true,
                content: [{ type: "text", text: e?.message ?? String(e) }],
            };
        }
    });
}
//# sourceMappingURL=prismaPrepare.js.map