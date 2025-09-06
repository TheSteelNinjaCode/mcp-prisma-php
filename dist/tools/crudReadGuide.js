import { z } from "zod";
import { ucfirst, lcfirstWord, toPlural, ensureAllowedKeys, buildIncludeLines as _inc, buildSelectLines as _sel, buildOmitLines as _omit, METHOD_ALIASES, } from "../utils/utils.js";
/**
 * READ tool:
 * Two sections:
 *   1) backend (Prisma PHP model approach)
 *   2) frontend (Todo-style list + search)
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
        title: "Generate READ pattern (backend + frontend template, separated)",
        description: "Outputs two sections: (1) Backend model approach (Prisma PHP) and (2) Frontend-only Todo list + search. Backend is omitted if prisma=false.",
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
        // ---------- BACKEND ----------
        let backend = {
            disabled: true,
            message: "Prisma is disabled (prisma=false). Backend snippet omitted.",
        };
        if (prismaEnabled) {
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
            const bodyLines = [];
            if (withWhereStub) {
                bodyLines.push(`    'where' => [`);
                bodyLines.push(`        // 'name' => ['contains' => $q],`);
                bodyLines.push(`        // 'isActive' => true,`);
                bodyLines.push(`    ],`);
            }
            if (select.length)
                bodyLines.push(..._sel(select));
            if (include.length || counts.length) {
                const inc = _inc(include, counts);
                if (inc.length) {
                    bodyLines.push(`    'include' => [`);
                    bodyLines.push(...inc);
                    bodyLines.push(`    ],`);
                }
            }
            if (omit.length)
                bodyLines.push(..._omit(omit));
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
            const displayFields = fields.length
                ? fields
                : ["id", "name", "isActive"];
            const html = [
                "<!-- Backend • Model approach (Read) -->",
                `<div class="data-list">`,
                `  <template pp-for="${itemAlias} in ${plural}">`,
                `    <article class="data-row border rounded p-3 mb-2">`,
                ...displayFields.map((f) => `      <div><strong>${f}:</strong> {{ ${itemAlias}.${f} }}</div>`),
                `    </article>`,
                `  </template>`,
                `</div>`,
            ].join("\n");
            const js = [
                "<script>",
                `const [${plural}, set${Model}s] = pphp.state(<?= json_encode($${plural}) ?>);`,
                "</script>",
            ].join("\n");
            backend = { php, html, js };
        }
        // ---------- FRONTEND (Todo-style list + search) ----------
        const feHtml = [
            `<!-- Read (frontend-only) -->`,
            `<div class="max-w-md mx-auto mt-8 p-4 bg-white rounded shadow">`,
            `  <h2 class="text-xl font-bold mb-4">Items</h2>`,
            `  <input type="text" pp-bind-value="search" oninput="setSearch(this.value)" placeholder="Search…" class="w-full border rounded px-2 py-1 mb-4" />`,
            `  <div class="flex gap-4 mb-2 text-sm text-gray-700">`,
            `    <span>Total: {{ items.length }}</span>`,
            `    <span>Visible: {{ filtered.length }}</span>`,
            `  </div>`,
            `  <ul>`,
            `    <template pp-for="row in filtered">`,
            `      <li class="flex items-center gap-2 mb-2">`,
            `        <span class="{{ row.isActive ? 'text-gray-900' : 'text-gray-400 line-through' }}">{{ row.name }}</span>`,
            `      </li>`,
            `    </template>`,
            `  </ul>`,
            `</div>`,
        ].join("\n");
        const feJs = [
            "<script>",
            `const [items, setItems] = pphp.state([{ id: crypto.randomUUID?.() || 1, name: "Learn Prisma PHP", isActive: true }]);`,
            `const [search, setSearch] = pphp.state("");`,
            `const [filtered, setFiltered] = pphp.state(items.value);`,
            `pphp.effect(() => {`,
            `  const q = search.value.trim().toLowerCase();`,
            `  setFiltered(q ? items.value.filter(r => (r.name ?? '').toLowerCase().includes(q)) : items.value);`,
            `}, [search, items]);`,
            `// For API later: async function loadItems() { const res = await fetch('/api/items'); setItems(await res.json()); }`,
            "</script>",
        ].join("\n");
        const notes = [
            prismaEnabled
                ? "Both sections included: backend (Prisma) + frontend reference (Todo-style)."
                : "Prisma is disabled → backend omitted; use the frontend Todo-style section.",
            "Frontend templates avoid `.value` in templates; use `.value` in JS when reading/writing state.",
            `Filter operators (backend): ${Array.from(FILTER_OPERATORS).join(", ")}; relation ops: ${Array.from(RELATION_OPERATORS).join(", ")}.`,
        ];
        const payload = {
            meta: {
                model: modelProp,
                op,
                pluralState: plural,
                itemAlias,
                prismaEnabled,
            },
            snippets: { backend, frontend: { html: feHtml, js: feJs }, notes },
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