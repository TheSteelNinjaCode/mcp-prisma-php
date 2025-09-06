import { z } from "zod";
import { ucfirst, lcfirstWord, toPlural, ensureAllowedKeys, buildIncludeLines as _inc, buildSelectLines as _sel, buildOmitLines as _omit, METHOD_ALIASES, } from "../utils/utils.js";
/**
 * Generic READ scaffolding for Prisma PHP + local Reactivity (UI-agnostic).
 * Auto-switches to front-end-only if prisma is disabled.
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
const InputShape = {
    model: z.string().min(1),
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
export function registerCrudReadGuide(server, ctx) {
    server.registerTool("pphp.crud.readGuide", {
        title: "Generate READ pattern (Prisma PHP + local state, generic)",
        description: "UI-agnostic Prisma PHP READ scaffolding (front-end-only when prisma disabled). <script> goes at bottom.",
        inputSchema: InputShape,
    }, async (args) => {
        const parsed = InputObject.safeParse(args);
        if (!parsed.success)
            return err(`Invalid input: ${parsed.error.message}`);
        const prismaEnabled = ctx.CONFIG?.prisma === true;
        const { model, op = "findMany", include = [], counts = [], select = [], omit = [], withWhereStub = false, stateName, itemAlias = "row", fields = [], } = parsed.data;
        const Model = ucfirst(model);
        const modelProp = lcfirstWord(model);
        const plural = (stateName && stateName.trim()) || toPlural(modelProp);
        const aliases = METHOD_ALIASES(Model);
        if (!prismaEnabled) {
            // Front-end only
            const php = `<?php /* Prisma disabled → READ PHP skipped. Provide data from your API in JS. */ ?>`;
            const html = [
                "<!-- Generic HTML using <template pp-for> (front-end only) -->",
                `<div class="data-list">`,
                `  <template pp-for="${itemAlias} in ${plural}">`,
                `    <article class="data-row">`,
                ...(fields.length
                    ? fields.map((f) => `      <div><strong>${f}:</strong> {{ ${itemAlias}.${f} }}</div>`)
                    : [
                        `      <!-- add fields to display:`,
                        `           <div><strong>id:</strong> {{ ${itemAlias}.id }}</div>`,
                        `           <div><strong>name:</strong> {{ ${itemAlias}.name }}</div>`,
                        `      -->`,
                    ]),
                `    </article>`,
                `  </template>`,
                `</div>`,
            ].join("\n");
            const js = [
                "<script>",
                "// Bottom of page. Load from your REST endpoint or other source.",
                `const [${plural}, set${Model}s] = pphp.state([]);`,
                `export async function load${Model}s() {`,
                `  // const res = await fetch('/api/${modelProp}');`,
                `  // const data = await res.json();`,
                `  // set${Model}s(data.items ?? data ?? []);`,
                `}`,
                "</script>",
            ].join("\n");
            const notes = [
                "• Front-end-only mode: fill the list via fetch() in load…().",
                "• Objects/arrays are reactive directly; no `.value`.",
            ].join("\n");
            return okAsText({
                meta: {
                    model: modelProp,
                    op,
                    pluralState: plural,
                    itemAlias,
                    prismaEnabled,
                },
                snippets: { php, html, js, notes },
                hints: {
                    methodAliases: aliases,
                    warnings: ["Backend read skipped: prisma=false."],
                },
            });
        }
        // Prisma-enabled
        if (include.length && select.length) {
            return err("You may not use both `select` and `include` in the same query.");
        }
        const wants = [];
        if (withWhereStub)
            wants.push("where");
        if (select.length)
            wants.push("select");
        if (include.length || counts.length)
            wants.push("include");
        if (omit.length)
            wants.push("omit");
        const { bad } = ensureAllowedKeys(ROOT_KEYS_MAP[op], wants);
        if (bad.length) {
            return err(`The following keys are not allowed for ${op}(): ${bad.join(", ")}.\nAllowed keys: ${ROOT_KEYS_MAP[op].join(", ")}`);
        }
        const incBlock = (() => {
            const inc = _inc(include, counts);
            return inc.length ? ["    'include' => [", ...inc, "    ],"] : [];
        })();
        const php = [
            "<?php",
            "use Lib\\Prisma\\Classes\\Prisma;",
            "",
            `// --- Prisma PHP READ (${op})`,
            `$prisma = Prisma::getInstance();`,
            "",
            `$${plural} = $prisma->${modelProp}->${op}([`,
            ...(withWhereStub
                ? [
                    "    'where' => [",
                    "        // 'email' => ['contains' => $q],",
                    "        // 'isActive' => true,",
                    "        // 'roles' => ['some' => ['name' => ['contains' => $q]]],",
                    "    ],",
                ]
                : []),
            ..._sel(select),
            ...incBlock,
            ..._omit(omit),
            `]);`,
            "?>",
        ].join("\n");
        const fieldLines = fields.length
            ? fields.map((f) => `      <div><strong>${f}:</strong> {{ ${itemAlias}.${f} }}</div>`)
            : [
                `      <!-- add fields to display:`,
                `           <div><strong>id:</strong> {{ ${itemAlias}.id }}</div>`,
                `           <div><strong>name:</strong> {{ ${itemAlias}.name }}</div>`,
                `      -->`,
            ];
        const html = [
            "<!-- Generic HTML using <template pp-for> -->",
            `<div class="data-list">`,
            `  <template pp-for="${itemAlias} in ${plural}">`,
            `    <article class="data-row">`,
            ...fieldLines,
            `    </article>`,
            `  </template>`,
            `</div>`,
        ].join("\n");
        const js = [
            "<script>",
            "// Bottom of page.",
            `const [${plural}, set${Model}s] = pphp.state(<?= json_encode($${plural}) ?>);`,
            "const [q, setQ] = pphp.state('');",
            "const [status, setStatus] = pphp.state('');",
            "",
            `export function edit${Model}(row) { /* open dialog, etc. */ }`,
            `export function remove${Model}(id) { /* call delete, then set${Model}s(...) */ }`,
            "</script>",
        ].join("\n");
        const notes = [
            "• Order: PHP → HTML → JS.",
            "• Arrays/objects are reactive directly (no `.value`).",
            "• `_count` goes inside `include` as '_count' => ['select' => ['rel' => true]].",
            `• Filters: ${Array.from(FILTER_OPERATORS).join(", ")}.`,
            `• Relation ops: ${Array.from(RELATION_OPERATORS).join(", ")}.`,
        ].join("\n");
        const payload = {
            meta: {
                model: modelProp,
                op,
                pluralState: plural,
                itemAlias,
                prismaEnabled,
            },
            snippets: { php, html, js, notes },
            hints: {
                allowedRootKeys: Array.from(ROOT_KEYS_MAP[op]),
                filterOperators: Array.from(FILTER_OPERATORS),
                relationOperators: Array.from(RELATION_OPERATORS),
                methodAliases: aliases,
                warnings: [
                    "Do not mix `select` and `include`.",
                    "`findUnique()` requires unique `where`.",
                ],
            },
        };
        return okAsText(payload);
    });
}
//# sourceMappingURL=crudReadGuide.js.map