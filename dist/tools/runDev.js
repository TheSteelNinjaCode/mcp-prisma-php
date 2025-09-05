import { z } from "zod";
import { ensurePrismaPhpProject } from "../utils/project.js";
import { spawnDetached, spawnExternalTerminalWindows } from "../utils/proc.js";
import { hasNpmScript } from "../utils/npm.js";
export function registerRunDev(server, ctx) {
    server.registerTool("pphp.npm.dev", {
        title: "Run dev server",
        description: "Runs `npm run dev` from the project root. On Windows, opens a terminal so you can see logs.",
        inputSchema: {
            args: z.array(z.string()).optional(), // forwarded after '--'
        },
    }, async (args, _extra) => {
        try {
            ensurePrismaPhpProject(ctx);
            if (!hasNpmScript(ctx.ROOT, "dev")) {
                return {
                    isError: true,
                    content: [
                        { type: "text", text: "No 'dev' script found in package.json." },
                    ],
                };
            }
            const extra = Array.isArray(args.args) ? args.args : [];
            if (process.platform === "win32") {
                // Open a visible terminal so the user can see BrowserSync/Tailwind output
                const line = [
                    "npm",
                    "run",
                    "dev",
                    ...(extra.length ? ["--", ...extra] : []),
                ].join(" ");
                const r = spawnExternalTerminalWindows(line, ctx.ROOT);
                if (r.ok) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({ message: "Opened terminal: npm run dev", cwd: ctx.ROOT }, null, 2),
                            },
                        ],
                    };
                }
                return {
                    isError: true,
                    content: [{ type: "text", text: r.message }],
                };
            }
            // Non-Windows: run detached
            const runArgs = ["run", "dev"];
            if (extra.length)
                runArgs.push("--", ...extra);
            const r = spawnDetached("npm", runArgs, ctx.ROOT);
            if (r.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                message: "Dev server launched (detached)",
                                pid: r.pid,
                                cwd: ctx.ROOT,
                            }, null, 2),
                        },
                    ],
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
//# sourceMappingURL=runDev.js.map