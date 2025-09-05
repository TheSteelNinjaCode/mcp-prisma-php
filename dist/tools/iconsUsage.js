import { z } from "zod";
import { ensurePrismaPhpProject } from "../utils/project.js";
import { PPICONS_NAMES as ICONS } from "../resources/ppicons-names.js";
/** Canonicalize an icon slug as it appears in the catalogue (e.g., eye, shopping-cart, Pocket). */
function toCanonicalIconSlug(name) {
    const raw = (name ?? "").trim();
    if (!raw)
        return null;
    if (ICONS.has(raw))
        return raw;
    const lc = raw.toLowerCase();
    if (ICONS.has(lc))
        return lc;
    const kebab = lc.replace(/_/g, "-").replace(/\s+/g, "-");
    if (ICONS.has(kebab))
        return kebab;
    const title = typeof kebab === "string" && kebab && kebab.length > 0
        ? kebab[0].toUpperCase() + kebab.slice(1)
        : kebab;
    if (title && ICONS.has(title))
        return title;
    return null;
}
/** Canonicalize an icon name to the PHP class name (e.g., "shopping-cart" → "ShoppingCart", "circle-slash-2" → "CircleSlash2"). */
function toPhpClassName(canonicalSlug) {
    return canonicalSlug
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join("");
}
/** Normalize: accept string, string[], or comma/space-separated list. */
function normalizeNames(input) {
    if (!input)
        return [];
    if (Array.isArray(input))
        return input.flatMap(normalizeNames);
    return input
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
}
function renderUseBlock(classes) {
    if (classes.length <= 1) {
        const one = classes[0] ?? "Eye";
        return `<?php\n\nuse Lib\\PPIcons\\${one};\n?>`;
    }
    return `<?php\n\nuse Lib\\PPIcons\\{${classes.join(", ")}};\n?>`;
}
function renderBasicMarkup(classes) {
    if (classes.length <= 1) {
        const C = classes[0] ?? "Eye";
        return `<${C} />`;
    }
    return classes.map((C) => `<${C} />`).join("\n");
}
function renderAttributeExamples(className) {
    return [
        `<!-- Tailwind utility classes -->`,
        `<${className} class="w-6 h-6 text-gray-600" />`,
        ``,
        `<!-- Size & stroke control (SVG passthrough) -->`,
        `<${className} width="24" height="24" stroke="currentColor" stroke-width="1.5" />`,
        ``,
        `<!-- Accessibility -->`,
        `<${className} role="img" aria-label="View details" />`,
        ``,
        `<!-- Data attributes for JS hooks -->`,
        `<${className} data-action="toggle-password" />`,
        ``,
        `<!-- Plain DOM event attribute (optional; or attach via JS) -->`,
        `<${className} onclick="togglePassword()" />`,
    ].join("\n");
}
function renderMiniJsHandler() {
    return [
        `<script>`,
        `document.addEventListener("click", (e) => {`,
        `  const btn = (e.target as HTMLElement).closest('[data-action="toggle-password"]');`,
        `  if (!btn) return;`,
        `  const input = document.querySelector<HTMLInputElement>('#password');`,
        `  if (!input) return;`,
        `  input.type = input.type === 'password' ? 'text' : 'password';`,
        `});`,
        `</script>`,
    ].join("\n");
}
export function registerIconsUsage(server, ctx) {
    server.registerTool("pphp.icons.usage", {
        title: "How to use PPIcons",
        description: "Returns copy-pasteable snippets to import/render PPIcons (single/multiple), style with attributes, and attach a tiny JS handler.",
        inputSchema: {
            names: z.union([z.string(), z.array(z.string())]).optional(),
            withAttributes: z.boolean().optional(), // default true
            withJsHandler: z.boolean().optional(), // default true
        },
    }, async (args) => {
        try {
            ensurePrismaPhpProject(ctx);
            const requested = normalizeNames(args.names);
            const candidates = requested.length
                ? requested
                : ["eye", "shopping-cart"];
            // Validate & build canonical slugs + class names
            const invalid = [];
            const slugs = [];
            const classes = [];
            const seen = new Set();
            for (const n of candidates) {
                const canonical = toCanonicalIconSlug(n);
                if (!canonical) {
                    invalid.push(n);
                    continue;
                }
                const cls = toPhpClassName(canonical);
                if (!seen.has(cls)) {
                    seen.add(cls);
                    slugs.push(canonical);
                    classes.push(cls);
                }
            }
            if (classes.length === 0) {
                const msg = invalid.length > 0
                    ? `No valid icons. Unknown: ${invalid.join(", ")}`
                    : `No icons provided.`;
                return { isError: true, content: [{ type: "text", text: msg }] };
            }
            // Use a definite first element (safe with strict flags)
            const firstClass = classes[0];
            const firstSlug = slugs[0];
            const parts = [];
            // Single example
            parts.push(`# Single icon (normal import)`);
            parts.push("```php");
            parts.push(renderUseBlock([firstClass]));
            parts.push("```");
            parts.push("```html");
            parts.push(`<${firstClass} />`);
            parts.push("```");
            // Multiple example
            if (classes.length > 1) {
                parts.push(`\n# Multiple icons (grouped import)`);
                parts.push("```php");
                parts.push(renderUseBlock(classes));
                parts.push("```");
                parts.push("```html");
                parts.push(renderBasicMarkup(classes));
                parts.push("```");
            }
            // Attributes (default on)
            if (args.withAttributes !== false) {
                parts.push(`\n# Styling & standard HTML/SVG attributes`);
                parts.push("```html");
                parts.push(renderAttributeExamples(firstClass));
                parts.push("```");
            }
            // Tiny JS handler (default on)
            if (args.withJsHandler !== false) {
                parts.push(`\n# Minimal JS handler via data-*`);
                parts.push("```html");
                parts.push(`<input id="password" type="password" class="border px-2 py-1" />`);
                parts.push(`<${firstClass} class="inline w-5 h-5 cursor-pointer" data-action="toggle-password" />`);
                parts.push(renderMiniJsHandler());
                parts.push("```");
            }
            // Install hint (use canonical slugs, not class names)
            parts.push(`\n# Install icons into your project`);
            parts.push("```sh");
            parts.push(`# add specific icons`);
            parts.push(`npx -y ppicons add ${slugs.join(" ")}`);
            parts.push(`# or add all (heavy)`);
            parts.push(`npx -y ppicons add --all`);
            parts.push("```");
            return { content: [{ type: "text", text: parts.join("\n") }] };
        }
        catch (e) {
            return {
                isError: true,
                content: [{ type: "text", text: e?.message ?? String(e) }],
            };
        }
    });
}
//# sourceMappingURL=iconsUsage.js.map