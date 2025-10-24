import type { ComponentUsageDoc } from "./phpxui-usage.js";
/** Find the canonical Set entry (preserves original capitalization like "Pocket"). */
export declare function findCanonicalIconKey(nameRaw?: string): string | null;
/** Turn kebab or mixed string into PascalCase class/tag name. */
export declare function toPascalCaseIcon(name: string): string;
/** Simple suggestions: prefix → contains. */
export declare function suggestIcons(nameRaw: string, limit?: number): string[];
/** Build a minimal usage doc for an icon (single pattern: "icon"). */
export declare function getPPIconUsageDoc(nameRaw: string, _tailwind: boolean): ComponentUsageDoc | null;
//# sourceMappingURL=ppicons-usage.d.ts.map