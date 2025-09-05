import { z } from "zod";
import { ensurePrismaPhpProject } from "../utils/project.js";
import { PPICONS_NAMES as ICONS } from "../resources/ppicons-names.js";
// slug → ClassName (e.g., "shopping-cart" -> "ShoppingCart")
function slugToClass(slug) {
    return slug
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join("");
}
// Build a set of valid PascalCase class names for all icons
const VALID_ICON_CLASSES = (() => {
    const s = new Set();
    for (const slug of ICONS)
        s.add(slugToClass(slug));
    return s;
})();
function normalizeSnippet(s) {
    return (s ?? "").replace(/\r\n/g, "\n");
}
function extractIconClasses(snippet) {
    let body = snippet;
    // 1) Collect grouped uses: use Lib\PPIcons\{Eye, ShoppingCart};
    const groupedRe = /use\s+Lib\\PPIcons\\\{([^}]+)\};/gi;
    const classes = new Set();
    body = body.replace(groupedRe, (_m, group) => {
        const parts = String(group)
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
        for (const c of parts)
            classes.add(c);
        return ""; // remove from body
    });
    // 2) Collect single uses: use Lib\PPIcons\Eye;
    const singleRe = /use\s+Lib\\PPIcons\\([A-Za-z0-9_]+)\s*;/g;
    body = body.replace(singleRe, (_m, c) => {
        classes.add(String(c));
        return "";
    });
    // 3) Auto-add from tags: <Eye ... />
    const tagRe = /<([A-Z][A-Za-z0-9]*)\b/g;
    let m;
    while ((m = tagRe.exec(body))) {
        const tag = m[1];
        if (typeof tag === "string" && VALID_ICON_CLASSES.has(tag))
            classes.add(tag);
    }
    return {
        classes: Array.from(classes).sort(),
        bodyWithoutUses: body.trimStart(),
    };
}
function renderUseHeader(classes) {
    if (classes.length === 0)
        return "";
    if (classes.length === 1) {
        return `<?php\nuse Lib\\PPIcons\\${classes[0]};\n?>\n\n`;
    }
    return `<?php\nuse Lib\\PPIcons\\{${classes.join(", ")}};\n?>\n\n`;
}
export function registerIconsFixSnippet(server, ctx) {
    server.registerTool("pphp.icons.fixSnippet", {
        title: "Fix icon snippet",
        description: "Moves PPIcons `use` statements to the top of the file, deduplicates, and adds missing imports for icon tags it finds.",
        inputSchema: {
            snippet: z.string().describe("Mixed PHP/HTML snippet to fix"),
            // If true (default), add imports for icon tags found in markup
            autoAddFromTags: z.boolean().optional(),
        },
    }, async (args) => {
        try {
            ensurePrismaPhpProject(ctx);
            const input = normalizeSnippet(args.snippet);
            const { classes, bodyWithoutUses } = extractIconClasses(input);
            const header = renderUseHeader(classes);
            const fixed = header + bodyWithoutUses;
            return {
                content: [{ type: "text", text: fixed }],
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
//# sourceMappingURL=iconsFixSnippet.js.map