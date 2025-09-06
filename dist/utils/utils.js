export function ucfirst(s) {
    if (typeof s === "string" && s.length > 0) {
        return (s[0]?.toUpperCase() ?? "") + s.slice(1);
    }
    return s ?? "";
}
export function lcfirstWord(s) {
    if (!s)
        return s ?? "";
    return (s[0]?.toLowerCase() ?? "") + s.slice(1);
}
export function toPlural(word) {
    if (!word)
        return word;
    const lower = word.toLowerCase();
    if (lower.endsWith("s"))
        return lower;
    if (lower.endsWith("y"))
        return lower.slice(0, -1) + "ies";
    return lower + "s";
}
/** Validate requested keys against an allowed list (per-op). */
export function ensureAllowedKeys(allowedList, wants) {
    const allowed = new Set(allowedList);
    const bad = wants.filter((k) => !allowed.has(k));
    return { bad, allowed };
}
/** Builders shared by CRUD generators */
export function buildIncludeLines(include, counts) {
    const lines = [];
    if (Array.isArray(include) && include.length) {
        for (const r of include)
            lines.push(`            '${r}' => true,`);
    }
    if (Array.isArray(counts) && counts.length) {
        lines.push(`            '_count' => [`);
        lines.push(`                'select' => [`);
        for (const c of counts)
            lines.push(`                    '${c}' => true,`);
        lines.push(`                ]`);
        lines.push(`            ],`);
    }
    return lines;
}
export function buildSelectLines(select) {
    if (!Array.isArray(select) || !select.length)
        return [];
    return [
        `        'select' => [`,
        ...select.map((s) => `            '${s}' => true,`),
        `        ],`,
    ];
}
export function buildOmitLines(omit) {
    if (!Array.isArray(omit) || !omit.length)
        return [];
    return [
        `        'omit' => [`,
        ...omit.map((o) => `            '${o}' => true,`),
        `        ],`,
    ];
}
/** Alternative method names sometimes used by codegen setups */
export const METHOD_ALIASES = (modelPascal) => ({
    aggregate: `aggregate${modelPascal}`,
    createMany: `createMany${modelPascal}`,
    create: `create${modelPascal}`,
    deleteMany: `deleteMany${modelPascal}`,
    delete: `delete${modelPascal}`,
    findFirst: `findFirst${modelPascal}`,
    findFirstOrThrow: `findFirst${modelPascal}OrThrow`,
    findMany: `findMany${modelPascal}`,
    findUnique: `findUnique${modelPascal}`,
    findUniqueOrThrow: `findUnique${modelPascal}OrThrow`,
    groupBy: `groupBy${modelPascal}`,
    updateMany: `updateMany${modelPascal}`,
    update: `update${modelPascal}`,
    upsert: `upsert${modelPascal}`,
});
//# sourceMappingURL=utils.js.map