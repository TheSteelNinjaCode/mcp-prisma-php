import z from "zod";
declare const PatternEnum: z.ZodEnum<["with-trigger", "controlled-open", "basic", "as-child", "icon", "default-checked", "controlled"]>;
export type UsagePatternKey = z.infer<typeof PatternEnum>;
export interface UsagePiece {
    phpUse?: string;
    html?: string;
    js?: string;
    notes?: string[];
}
export interface ComponentUsageDoc {
    name: string;
    requires: string[];
    patterns: Partial<Record<UsagePatternKey, UsagePiece>>;
    props?: Record<string, string>;
}
export declare function getPhpXuiUsageDoc(nameRaw: string, tailwind: boolean): ComponentUsageDoc | null;
export {};
//# sourceMappingURL=phpxui-usage.d.ts.map