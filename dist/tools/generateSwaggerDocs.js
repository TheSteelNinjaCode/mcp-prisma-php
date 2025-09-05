import { safeExec } from "../utils/exec.js";
import { ensurePrismaPhpProject } from "../utils/project.js";
import { hasNpmScript } from "../utils/npm.js";
export function registerGenerateSwaggerDocs(server, ctx) {
    server.registerTool("pphp.generateSwaggerDocs", {
        title: "Generate Swagger Docs",
        description: "Runs `npm run create-swagger-docs` in project root — only if swaggerDocs is enabled in prisma-php.json.",
        inputSchema: {}, // ZodRawShape
    }, async (_args, _extra) => {
        try {
            ensurePrismaPhpProject(ctx);
            // 1) Require swaggerDocs to be enabled in prisma-php.json
            const enabled = ctx.CONFIG?.swaggerDocs === true;
            if (!enabled) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: 'Swagger docs are disabled in prisma-php.json (expected `"swaggerDocs": true`). ' +
                                "Use `pphp.project.update` to enable Swagger in this project, then rerun.",
                        },
                    ],
                };
            }
            // 2) Require the npm script to exist
            if (!hasNpmScript(ctx.ROOT, "create-swagger-docs")) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: 'Could not find the "create-swagger-docs" script in package.json. ' +
                                "Run `pphp.project.update` to add the script, or define it manually, then retry.",
                        },
                    ],
                };
            }
            // 3) Execute
            const r = safeExec("npm run create-swagger-docs", ctx.ROOT);
            if (r.ok) {
                return {
                    content: [{ type: "text", text: "Swagger docs generated." }],
                };
            }
            return { isError: true, content: [{ type: "text", text: r.message }] };
        }
        catch (e) {
            return {
                isError: true,
                content: [{ type: "text", text: e?.message ?? String(e) }],
            };
        }
    });
}
//# sourceMappingURL=generateSwaggerDocs.js.map