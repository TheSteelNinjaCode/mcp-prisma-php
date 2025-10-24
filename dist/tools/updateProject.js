import { z } from "zod";
import { ensurePrismaPhpProject } from "../utils/project.js";
import { spawnDetached, spawnExternalTerminalWindows } from "../utils/proc.js";
export function registerUpdateProject(server, ctx) {
    server.registerTool("pp.project.update", {
        title: "Update Prisma PHP project",
        description: "Launches `npx pp update project`. On Windows opens a new terminal window for interactive prompts.",
        inputSchema: {
            // Force non-interactive run (try with -y if your CLI supports it)
            nonInteractive: z.boolean().optional(),
        },
    }, async (args, _extra) => {
        try {
            ensurePrismaPhpProject(ctx);
            // Prefer an interactive terminal on Windows so the user can answer prompts.
            if (process.platform === "win32" && !args.nonInteractive) {
                const cmdLine = "npx pp update project";
                const r = spawnExternalTerminalWindows(cmdLine, ctx.ROOT);
                if (r.ok) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    message: "Opened external terminal for `pp update project`.",
                                    cwd: ctx.ROOT,
                                }, null, 2),
                            },
                        ],
                    };
                }
                return {
                    isError: true,
                    content: [{ type: "text", text: r.message }],
                };
            }
            // Fallback: detached background (may not be ideal for interactive prompts)
            const cliArgs = ["pp", "update", "project"];
            if (args.nonInteractive)
                cliArgs.push("-y"); // if your CLI supports it
            const r2 = spawnDetached("npx", cliArgs, ctx.ROOT);
            if ("ok" in r2 && r2.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                message: "Launched `npx pp update project` (detached). If interactive prompts are required, run in a terminal.",
                                pid: r2.pid,
                                cwd: ctx.ROOT,
                            }, null, 2),
                        },
                    ],
                };
            }
            return { isError: true, content: [{ type: "text", text: r2.message }] };
        }
        catch (e) {
            return {
                isError: true,
                content: [{ type: "text", text: e?.message ?? String(e) }],
            };
        }
    });
}
//# sourceMappingURL=updateProject.js.map