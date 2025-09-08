// src/tools/componentUsage.ts
import { z } from "zod";
import { ensurePrismaPhpProject } from "../utils/project.js";
import { getPhpXuiUsageDoc, } from "../resources/phpxui-usage.js";
import { resolvePhpXUI } from "../resources/phpxui-components.js";
export function registerPHPXUIComponentUsage(server, ctx) {
    server.registerTool("pphp.phpxui.component.usage", {
        title: "Usage (PHPXUI)",
        description: "Return canonical usage for a PHPXUI component (imports, HTML, optional JS). Includes multiple patterns (e.g., Dialog with-trigger vs controlled-open). Tailwind-aware.",
        inputSchema: {
            name: z.string(), // Component name (e.g., "Dialog")
            pattern: z.enum(["with-trigger", "controlled-open"]).optional(),
            // Optional: format as a full route page (PHP -> HTML -> JS)
            asPage: z.boolean().optional(),
            pageTitle: z.string().optional(), // used only when asPage = true
        },
    }, async (args, _extra) => {
        try {
            ensurePrismaPhpProject(ctx);
            const canonical = resolvePhpXUI(args.name) || args.name;
            const tailwind = !!ctx.CONFIG?.tailwindcss;
            const doc = getPhpXuiUsageDoc(canonical, tailwind);
            if (!doc) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `No usage doc found for component "${args.name}".`,
                        },
                    ],
                };
            }
            const pattern = args.pattern ?? "with-trigger";
            const piece = doc.patterns[pattern];
            // Build a "page" (PHP -> HTML -> JS) if requested
            if (args.asPage) {
                const php = piece?.phpUse?.trim() ?? "";
                const html = piece?.html?.trim() ?? "";
                const js = (piece?.js ?? "").trim();
                const title = args.pageTitle?.trim() || `${doc.name} Example`;
                const page = `${php}

<h1 class="text-xl font-bold mb-4">${title}</h1>

${html}

${js ? `\n${js}\n` : ""}`.trim();
                const summary = [
                    `Component: ${doc.name}`,
                    `Pattern: ${pattern}`,
                    `Requires: ${doc.requires.join(", ")}`,
                    tailwind ? "TailwindCSS: enabled" : "TailwindCSS: disabled",
                ].join("\n");
                const propsList = doc.props && Object.keys(doc.props).length
                    ? "\n\nProps:\n" +
                        Object.entries(doc.props)
                            .map(([k, v]) => `- ${k}: ${v}`)
                            .join("\n")
                    : "";
                return {
                    content: [
                        {
                            type: "text",
                            text: `${summary}${propsList}\n\nFile: index.php\n\n${page}`,
                        },
                    ],
                };
            }
            // Otherwise, return the raw pieces for flexible composition
            const out = {
                meta: {
                    name: doc.name,
                    pattern,
                    requires: doc.requires,
                    tailwind,
                },
                snippets: {
                    php: piece?.phpUse ?? "",
                    html: piece?.html ?? "",
                    js: piece?.js ?? "",
                },
                props: doc.props ?? {},
                notes: piece?.notes ?? [],
            };
            return {
                content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
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
//# sourceMappingURL=phpxuiComponentUsage.js.map