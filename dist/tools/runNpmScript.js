import { z } from "zod";
import { ensurePrismaPhpProject } from "../utils/project.js";
import { hasNpmScript } from "../utils/npm.js";
import { spawnDetached, spawnExternalTerminalWindows } from "../utils/proc.js";
export function registerRunNpmScript(server, ctx) {
    server.registerTool("pp.npm.script", {
        title: "Run arbitrary npm script",
        description: "Runs any npm script from package.json (Windows: opens a terminal).",
        inputSchema: {
            name: z.string(),
            args: z.array(z.string()).optional(),
        },
    }, async (args, _extra) => {
        try {
            ensurePrismaPhpProject(ctx);
            if (!hasNpmScript(ctx.ROOT, args.name)) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `No '${args.name}' script found in package.json.`,
                        },
                    ],
                };
            }
            const extra = Array.isArray(args.args) ? args.args : [];
            if (process.platform === "win32") {
                const line = [
                    "npm",
                    "run",
                    args.name,
                    ...(extra.length ? ["--", ...extra] : []),
                ].join(" ");
                const r = spawnExternalTerminalWindows(line, ctx.ROOT);
                return r.ok
                    ? {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    message: `Opened terminal: npm run ${args.name}`,
                                    cwd: ctx.ROOT,
                                }, null, 2),
                            },
                        ],
                    }
                    : { isError: true, content: [{ type: "text", text: r.message }] };
            }
            const runArgs = ["run", args.name];
            if (extra.length)
                runArgs.push("--", ...extra);
            const r = spawnDetached("npm", runArgs, ctx.ROOT);
            return r.ok
                ? {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                message: `Launched '${args.name}' (detached)`,
                                pid: r.pid,
                                cwd: ctx.ROOT,
                            }, null, 2),
                        },
                    ],
                }
                : { isError: true, content: [{ type: "text", text: r.message }] };
        }
        catch (e) {
            return {
                isError: true,
                content: [{ type: "text", text: e?.message ?? String(e) }],
            };
        }
    });
}
//# sourceMappingURL=runNpmScript.js.map