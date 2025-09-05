import { z } from "zod";
/**
 * Generic READ scaffolding for Prisma PHP + local Reactivity (UI-agnostic).
 * Returns TEXT (pretty JSON):
 * {
 *   meta: { model, op, pluralState, itemAlias },
 *   snippets: { php, html, js, notes },
 *   hints: { allowedRootKeys, filterOperators, relationOperators, methodAliases, warnings }
 * }
 */
const ROOT_KEYS_MAP = {
    findMany: [
        "where",
        "select",
        "include",
        "orderBy",
        "take",
        "skip",
        "cursor",
        "distinct",
    ],
    findFirst: [
        "where",
        "select",
        "include",
        "omit",
        "orderBy",
        "take",
        "skip",
        "cursor",
        "distinct",
    ],
    findUnique: ["where", "include", "omit", "select"],
};
const FILTER_OPERATORS = [
    "contains",
    "startsWith",
    "endsWith",
    "in",
    "notIn",
    "lt",
    "lte",
    "gt",
    "gte",
    "equals",
    "not",
];
const RELATION_OPERATORS = ["every", "none", "some"];
/** Alternative method names seen in codegen setups */
const METHOD_ALIASES = (modelPascal) => ({
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
function ucfirst(s) {
    if (typeof s === "string" && s.length > 0) {
        return (s?.[0]?.toUpperCase() ?? "") + s.slice(1);
    }
    return s ?? "";
}
function toPlural(word) {
    if (!word)
        return word;
    const lower = word.toLowerCase();
    if (lower.endsWith("s"))
        return lower;
    if (lower.endsWith("y"))
        return lower.slice(0, -1) + "ies";
    return lower + "s";
}
function lcfirstWord(s) {
    if (!s)
        return s ?? "";
    return (s?.[0]?.toLowerCase() ?? "") + s.slice(1);
}
function buildIncludeBlock(include, counts) {
    const lines = [];
    if (Array.isArray(include) && include.length) {
        for (const r of include)
            lines.push(`        '${r}' => true,`);
    }
    if (Array.isArray(counts) && counts.length) {
        lines.push(`        '_count' => [`);
        lines.push(`            'select' => [`);
        for (const c of counts)
            lines.push(`                '${c}' => true,`);
        lines.push(`            ]`);
        lines.push(`        ],`);
    }
    return lines;
}
function buildSelectBlock(select) {
    if (!Array.isArray(select) || !select.length)
        return [];
    return [
        `    'select' => [`,
        ...select.map((s) => `        '${s}' => true,`),
        `    ],`,
    ];
}
function buildOmitBlock(omit) {
    if (!Array.isArray(omit) || !omit.length)
        return [];
    return [
        `    'omit' => [`,
        ...omit.map((o) => `        '${o}' => true,`),
        `    ],`,
    ];
}
function ensureAllowedKeys(op, wants) {
    const allowed = new Set(ROOT_KEYS_MAP[op]);
    const bad = wants.filter((k) => !allowed.has(k));
    return { allowed, bad };
}
const InputShape = {
    model: z.string().min(1), // any case; we'll lowerCamel on $prisma access
    op: z.enum(["findMany", "findFirst", "findUnique"]).default("findMany"),
    include: z.array(z.string()).optional(),
    counts: z.array(z.string()).optional(),
    select: z.array(z.string()).optional(),
    omit: z.array(z.string()).optional(),
    withWhereStub: z.boolean().optional(),
    stateName: z.string().optional(),
    itemAlias: z.string().optional(),
    fields: z.array(z.string()).optional(),
};
const InputObject = z.object(InputShape);
const err = (text) => ({
    isError: true,
    content: [{ type: "text", text }],
});
const okAsText = (obj) => ({
    content: [{ type: "text", text: JSON.stringify(obj, null, 2) }],
});
export function registerCrudReadGuide(server, _ctx) {
    server.registerTool("pphp.crud.readGuide", {
        title: "Generate READ pattern (Prisma PHP + local state, generic)",
        description: "UI-agnostic Prisma PHP READ scaffolding: PHP query + plain HTML pp-for + JS (state). Place <script> at bottom.",
        inputSchema: InputShape,
    }, async (args) => {
        const parsed = InputObject.safeParse(args);
        if (!parsed.success)
            return err(`Invalid input: ${parsed.error.message}`);
        const { model, op = "findMany", include = [], counts = [], select = [], omit = [], withWhereStub = false, stateName, itemAlias = "row", fields = [], } = parsed.data;
        if (include.length && select.length) {
            return err("You may not use both `select` and `include` in the same query.");
        }
        const wantsKeys = [];
        if (withWhereStub)
            wantsKeys.push("where");
        if (select.length)
            wantsKeys.push("select");
        if (include.length || counts.length)
            wantsKeys.push("include");
        if (omit.length)
            wantsKeys.push("omit");
        const { bad } = ensureAllowedKeys(op, wantsKeys);
        if (bad.length) {
            return err(`The following keys are not allowed for ${op}(): ${bad.join(", ")}.\n` + `Allowed keys: ${ROOT_KEYS_MAP[op].join(", ")}`);
        }
        const Pascal = ucfirst(model);
        const modelProp = lcfirstWord(model); // ✅ ensure lowerCamel on $prisma
        const plural = (stateName && stateName.trim()) || toPlural(modelProp);
        const methodAliases = METHOD_ALIASES(Pascal);
        /* ---------- PHP (top) ---------- */
        const bodyLines = [];
        if (withWhereStub) {
            bodyLines.push(`    'where' => [`);
            bodyLines.push(`        // 'email' => ['contains' => $q],`);
            bodyLines.push(`        // 'isActive' => true,`);
            bodyLines.push(`        // 'role' => ['some' => ['name' => ['contains' => $q]]],`);
            bodyLines.push(`    ],`);
        }
        if (select.length)
            bodyLines.push(...buildSelectBlock(select));
        if (include.length || counts.length) {
            const inc = buildIncludeBlock(include, counts);
            if (inc.length) {
                bodyLines.push(`    'include' => [`);
                bodyLines.push(...inc);
                bodyLines.push(`    ],`);
            }
        }
        if (omit.length)
            bodyLines.push(...buildOmitBlock(omit));
        const php = [
            "<?php",
            "use Lib\\Prisma\\Classes\\Prisma;",
            "",
            `// --- Prisma PHP READ (${op})`,
            `$prisma = Prisma::getInstance();`,
            "",
            `$${plural} = $prisma->${modelProp}->${op}([`,
            ...bodyLines,
            `]);`,
            "?>",
        ].join("\n");
        /* ---------- HTML (middle) ---------- */
        const fieldLines = fields.length
            ? fields.map((f) => `      <div><strong>${f}:</strong> {{ ${itemAlias}.${f} }}</div>`)
            : [
                `      <!-- add fields to display:`,
                `           <div><strong>id:</strong> {{ ${itemAlias}.id }}</div>`,
                `           <div><strong>name:</strong> {{ ${itemAlias}.name }}</div>`,
                `      -->`,
            ];
        const html = [
            "<!-- Generic HTML using <template pp-for> (UI-agnostic) -->",
            `<div class="data-list">`,
            `  <template pp-for="${itemAlias} in ${plural}">`,
            `    <article class="data-row">`,
            ...fieldLines,
            `      <!-- actions example:`,
            `           <button onclick="edit${Pascal}(${itemAlias})">Edit</button>`,
            `           <button onclick="remove${Pascal}(${itemAlias}.id)">Delete</button>`,
            `      -->`,
            `    </article>`,
            `  </template>`,
            `</div>`,
        ].join("\n");
        /* ---------- JS (bottom; wrap in <script>) ---------- */
        const js = [
            "<script>",
            "// Place this <script> tag at the bottom of the page.",
            `const [${plural}, set${Pascal}s] = pphp.state(<?= json_encode($${plural}) ?>); // local state; convert to pphp.share if you need cross-file sharing`,
            "// Add any local filters/state you need:",
            "const [q, setQ] = pphp.state('');",
            "const [status, setStatus] = pphp.state('');",
            "",
            "// Example helpers:",
            `export function edit${Pascal}(row) { /* open dialog, etc. */ }`,
            `export function remove${Pascal}(id) { /* call delete, then set${Pascal}s(...) */ }`,
            "</script>",
        ].join("\n");
        const notes = [
            "• Order: PHP first, then HTML, and the JS <script> goes at the very bottom.",
            "• Local-first: use pphp.state (arrays/objects ok). If you need cross-file sharing later, switch to pphp.share.",
            "• $prisma model access is lowerCamel (e.g., $prisma->userRole->findMany()).",
            "• Do not mix `select` and `include`.",
            "• `_count` lives inside `include` as: '_count' => ['select' => ['relation' => true]].",
            `• Filter operators: ${Array.from(FILTER_OPERATORS).join(", ")}.`,
            `• Relation operators: ${Array.from(RELATION_OPERATORS).join(", ")}.`,
            "• Use `omit` to strip sensitive fields (e.g., ['password']) from the JSON payload.",
        ].join("\n");
        const hints = {
            allowedRootKeys: Array.from(ROOT_KEYS_MAP[op]),
            filterOperators: Array.from(FILTER_OPERATORS),
            relationOperators: Array.from(RELATION_OPERATORS),
            methodAliases,
            warnings: [
                "Do not mix `select` and `include`.",
                "`findUnique()` requires a `where` with a unique field.",
            ],
        };
        const payload = {
            meta: { model: modelProp, op, pluralState: plural, itemAlias },
            snippets: { php, html, js, notes },
            hints,
        };
        return okAsText(payload);
    });
}
//# sourceMappingURL=crudReadGuide.js.map