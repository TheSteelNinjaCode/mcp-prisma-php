import { z } from "zod";
import { ensurePrismaPhpProject } from "../utils/project.js";
import { safeExec } from "../utils/exec.js";
export function registerPrismaGenerate(server, ctx) {
    server.registerTool("pphp.prisma.generate", {
        title: "Prisma ORM generate",
        description: 'Runs `npx ppo generate` only if prisma is enabled in prisma-php.json (`"prisma": true`).',
        inputSchema: {
            extraArgs: z.array(z.string()).optional(),
        },
    }, async (args, _extra) => {
        try {
            ensurePrismaPhpProject(ctx);
            const enabled = ctx.CONFIG?.prisma === true;
            if (!enabled) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: 'Prisma ORM is not enabled in prisma-php.json (expected `"prisma": true`). ' +
                                "Run `pphp.project.update` to update the environment and enable Prisma.",
                        },
                    ],
                };
            }
            const extra = Array.isArray(args.extraArgs) ? args.extraArgs : [];
            const cmd = ["npx", "-y", "ppo", "generate", ...extra].join(" ");
            const r = safeExec(cmd, ctx.ROOT);
            if (r.ok) {
                return {
                    content: [{ type: "text", text: "Prisma generate completed." }],
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
//# sourceMappingURL=prismaGenerate.js.map