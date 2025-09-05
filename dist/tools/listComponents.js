import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ensurePrismaPhpProject } from "../utils/project.js";
function norm(p) {
    return p.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
}
export function registerListComponents(server, ctx) {
    server.registerTool("pphp.listComponents", {
        title: "List PHPXUI Components",
        description: "Lists components from ./settings/class-log.json (authoritative list).",
        inputSchema: {
            // If true, include an `exists` flag by checking the file on disk
            verifyFiles: z.boolean().optional(),
            // If true, return a map { FQN: { filePath, exists? } } instead of array
            asMap: z.boolean().optional(),
        },
    }, async (args, _extra) => {
        try {
            ensurePrismaPhpProject(ctx);
            const classLogPath = path.join(ctx.ROOT, "settings", "class-log.json");
            if (!fs.existsSync(classLogPath)) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "Missing ./settings/class-log.json — cannot list components. " +
                                "Generate or restore this file, then retry.",
                        },
                    ],
                };
            }
            let raw;
            try {
                raw = fs.readFileSync(classLogPath, "utf8");
            }
            catch (e) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Unable to read class-log.json: ${e?.message ?? e}`,
                        },
                    ],
                };
            }
            let log;
            try {
                log = JSON.parse(raw);
            }
            catch (e) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Invalid JSON in class-log.json: ${e?.message ?? e}`,
                        },
                    ],
                };
            }
            const verify = args?.verifyFiles === true;
            const entries = Object.entries(log);
            // Build results
            const arr = entries.map(([fqn, info]) => {
                const rel = norm(info?.filePath ?? "");
                const abs = path.resolve(ctx.ROOT, rel.replace(/\//g, path.sep));
                const exists = verify ? fs.existsSync(abs) : undefined;
                return exists === undefined
                    ? { class: fqn, filePath: rel }
                    : { class: fqn, filePath: rel, exists };
            });
            // Sort by class name for stable output
            arr.sort((a, b) => a.class.localeCompare(b.class));
            if (args?.asMap) {
                const map = {};
                for (const item of arr) {
                    map[item.class] =
                        "exists" in item
                            ? { filePath: item.filePath, exists: item.exists }
                            : { filePath: item.filePath };
                }
                return {
                    content: [{ type: "text", text: JSON.stringify(map, null, 2) }],
                };
            }
            return {
                content: [{ type: "text", text: JSON.stringify(arr, null, 2) }],
            };
        }
        catch (e) {
            return {
                isError: true,
                content: [{ type: "text", text: e?.message ?? String(e) }],
            };
        }
    });
}
//# sourceMappingURL=listComponents.js.map