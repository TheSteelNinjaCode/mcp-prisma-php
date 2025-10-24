// src/tools/ppiconsComponentUsage.ts
import { z } from "zod";
import { ensurePrismaPhpProject } from "../utils/project.js";
import { getPPIconUsageDoc, suggestIcons } from "../resources/ppicons-usage.js";
export function registerPPIconsComponentUsage(server, ctx) {
    server.registerTool("pp.ppicons.component.usage", {
        title: "Usage (PPIcons)",
        description: "Return canonical usage for a PPIcon (PHP import + HTML tag). Mirrors PHPXUI usage shape. Supports `asPage`.",
        inputSchema: {
            name: z.string(), // Icon name (e.g., "search", "alarm-clock")
            pattern: z.enum(["icon"]).optional(), // default: "icon"
            asPage: z.boolean().optional(),
            pageTitle: z.string().optional(),
        },
    }, async (args, _extra) => {
        try {
            ensurePrismaPhpProject(ctx);
            const tailwind = !!ctx.CONFIG?.tailwindcss;
            const doc = getPPIconUsageDoc(args.name, tailwind);
            if (!doc) {
                const hints = suggestIcons(args.name, 8);
                const hintText = hints.length
                    ? `\n\nDid you mean:\n- ${hints.join("\n- ")}`
                    : "";
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `No usage doc found for icon "${args.name}".${hintText}`,
                        },
                    ],
                };
            }
            const pattern = (args.pattern ??
                "icon");
            const piece = doc.patterns[pattern];
            if (args.asPage) {
                const php = piece?.phpUse?.trim() ?? "";
                const html = piece?.html?.trim() ?? "";
                const js = (piece?.js ?? "").trim();
                const title = args.pageTitle?.trim() || `${doc.name} Icon Example`;
                const page = `${php}

<h1 class="text-xl font-bold mb-4">${title}</h1>

<div class="flex items-center gap-3">
  ${html}
  <span class="text-sm text-muted-foreground">${doc.name}</span>
</div>

${js ? `\n${js}\n` : ""}`.trim();
                const summary = [
                    `Icon: ${doc.name}`,
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
            // Raw pieces (mirrors PHPXUI usage output shape)
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
//# sourceMappingURL=ppiconsComponentUsage.js.map