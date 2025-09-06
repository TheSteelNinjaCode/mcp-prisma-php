export declare function ucfirst(s: string | undefined): string;
export declare function lcfirstWord(s: string | undefined): string;
export declare function toPlural(word: string): string;
/** Validate requested keys against an allowed list (per-op). */
export declare function ensureAllowedKeys<K extends readonly string[]>(allowedList: K, wants: string[]): {
    bad: string[];
    allowed: Set<K[number]>;
};
/** Builders shared by CRUD generators */
export declare function buildIncludeLines(include?: string[], counts?: string[]): string[];
export declare function buildSelectLines(select?: string[]): string[];
export declare function buildOmitLines(omit?: string[]): string[];
/** Alternative method names sometimes used by codegen setups */
export declare const METHOD_ALIASES: (modelPascal: string) => {
    aggregate: string;
    createMany: string;
    create: string;
    deleteMany: string;
    delete: string;
    findFirst: string;
    findFirstOrThrow: string;
    findMany: string;
    findUnique: string;
    findUniqueOrThrow: string;
    groupBy: string;
    updateMany: string;
    update: string;
    upsert: string;
};
//# sourceMappingURL=utils.d.ts.map