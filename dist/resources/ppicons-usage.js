import { PPICONS_COMPONENTS } from "./ppicons-components.js";
/** Normalize user input to a comparable key. */
function normalizeKey(name) {
    return (name ?? "")
        .trim()
        .replace(/_/g, "-")
        .replace(/\s+/g, "-")
        .toLowerCase();
}
/** Find the canonical Set entry (preserves original capitalization like "Pocket"). */
export function findCanonicalIconKey(nameRaw) {
    const q = normalizeKey(nameRaw);
    if (!q)
        return null;
    for (const item of PPICONS_COMPONENTS) {
        const k = item.replace(/_/g, "-").toLowerCase();
        if (k === q)
            return item; // exact normalized match
    }
    return null;
}
/** Turn kebab or mixed string into PascalCase class/tag name. */
export function toPascalCaseIcon(name) {
    // If already looks like PascalCase (e.g., "Pocket"), keep it
    if (/^[A-Z][A-Za-z0-9]*$/.test(name))
        return name;
    return name
        .split(/[-_]/)
        .filter(Boolean)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join("");
}
/** Simple suggestions: prefix → contains. */
export function suggestIcons(nameRaw, limit = 8) {
    const q = normalizeKey(nameRaw);
    if (!q)
        return [];
    const all = Array.from(PPICONS_COMPONENTS);
    const starts = all.filter((n) => normalizeKey(n).startsWith(q));
    if (starts.length)
        return starts.slice(0, limit);
    const contains = all.filter((n) => normalizeKey(n).includes(q));
    return contains.slice(0, limit);
}
/** Build a minimal usage doc for an icon (single pattern: "icon"). */
export function getPPIconUsageDoc(nameRaw, _tailwind) {
    const canonicalKey = findCanonicalIconKey(nameRaw);
    if (!canonicalKey)
        return null;
    const Pascal = toPascalCaseIcon(canonicalKey);
    const phpUse = `<?php

use Lib\\PPIcons\\{ ${Pascal} };

?>`;
    const html = `<${Pascal} class="size-4" aria-label="${Pascal}" />`;
    return {
        name: Pascal,
        requires: [Pascal],
        props: {
            [`${Pascal}[class]`]: 'Tailwind classes. Use "size-4" (1rem) or set width/height: "w-4 h-4".',
            [`${Pascal}[aria-label]`]: "Accessible label for screen readers (set to the icon meaning).",
        },
        patterns: {
            icon: {
                phpUse,
                html,
                notes: [
                    "PPIcons are standalone PHPX components.",
                    "Use Tailwind utilities like text-muted-foreground or text-primary for color.",
                ],
            },
        },
    };
}
//# sourceMappingURL=ppicons-usage.js.map