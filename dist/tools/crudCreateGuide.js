import { z } from "zod";
/**
 * Generic CREATE scaffolding for Prisma PHP + local Reactivity.
 * Output is a TEXT item with pretty-printed JSON:
 * {
 *   meta: { model, op, handlerName, pluralState },
 *   snippets: { php, html, js, notes },
 *   hints: { allowedRootKeys, methodAliases, warnings }
 * }
 */
const ROOT_KEYS_MAP = {
    create: ["data", "include", "omit", "select"],
    createMany: ["data", "skipDuplicates"],
    upsert: ["where", "update", "create"],
};
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
function ensureAllowedKeys(op, wants) {
    const allowed = new Set(ROOT_KEYS_MAP[op]);
    const bad = wants.filter((k) => !allowed.has(k));
    return { bad, allowed };
}
function buildIncludeLines(include, counts) {
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
function buildSelectLines(select) {
    if (!Array.isArray(select) || !select.length)
        return [];
    return [
        `        'select' => [`,
        ...select.map((s) => `            '${s}' => true,`),
        `        ],`,
    ];
}
function buildOmitLines(omit) {
    if (!Array.isArray(omit) || !omit.length)
        return [];
    return [
        `        'omit' => [`,
        ...omit.map((o) => `            '${o}' => true,`),
        `        ],`,
    ];
}
const InputShape = {
    model: z.string().min(1), // base model, any case; will be coerced to lowerCamel on $prisma
    op: z.enum(["create", "createMany", "upsert"]).default("create"),
    include: z.array(z.string()).optional(),
    counts: z.array(z.string()).optional(),
    select: z.array(z.string()).optional(), // mutually exclusive with include
    omit: z.array(z.string()).optional(),
    withWhereStub: z.boolean().optional(), // for upsert
    handlerName: z.string().optional(), // default: save<Model>
    fields: z.array(z.string()).optional(), // e.g. ["firstName","email","isActive"]
    rowsParam: z.string().default("rows"), // createMany payload key
    stateName: z.string().optional(), // local list var name
    returnRow: z.boolean().default(true),
};
const InputObject = z.object(InputShape);
const err = (text) => ({
    isError: true,
    content: [{ type: "text", text }],
});
const okAsText = (obj) => ({
    content: [{ type: "text", text: JSON.stringify(obj, null, 2) }],
});
export function registerCrudCreateGuide(server, _ctx) {
    server.registerTool("pphp.crud.createGuide", {
        title: "Generate CREATE pattern (Prisma PHP + local state, generic)",
        description: "UI-agnostic Prisma PHP CREATE scaffolding: PHP handler + plain HTML form + JS (state). Place <script> at bottom.",
        inputSchema: InputShape,
    }, async (args) => {
        const parsed = InputObject.safeParse(args);
        if (!parsed.success)
            return err(`Invalid input: ${parsed.error.message}`);
        const { model, op = "create", include = [], counts = [], select = [], omit = [], withWhereStub = false, handlerName, fields = [], rowsParam = "rows", stateName, returnRow = true, } = parsed.data;
        if (include.length && select.length) {
            return err("You may not use both `select` and `include` in the same query.");
        }
        const wants = [];
        if (op === "create") {
            wants.push("data");
            if (select.length)
                wants.push("select");
            if (include.length || counts.length)
                wants.push("include");
            if (omit.length)
                wants.push("omit");
        }
        if (op === "createMany")
            wants.push("data", "skipDuplicates");
        if (op === "upsert") {
            wants.push("create", "update");
            if (withWhereStub)
                wants.push("where");
        }
        const { bad } = ensureAllowedKeys(op, wants);
        if (bad.length) {
            return err(`The following keys are not allowed for ${op}(): ${bad.join(", ")}.\n` +
                `Allowed keys: ${ROOT_KEYS_MAP[op].join(", ")}`);
        }
        const Pascal = ucfirst(model);
        const modelProp = lcfirstWord(model); // ✅ lowerCamel on $prisma
        const Model = Pascal;
        const plural = (stateName && stateName.trim()) || toPlural(modelProp);
        const fnName = handlerName || `save${Model}`;
        const aliases = METHOD_ALIASES(Pascal);
        const includeLines = buildIncludeLines(include, counts);
        const selectLines = buildSelectLines(select);
        const omitLines = buildOmitLines(omit);
        const dataMapLines = fields.length
            ? fields.map((f) => `            '${f}' => $data->${f} ?? null, // TODO: validate & coerce`)
            : [
                "            // 'name' => $data->name ?? null,",
                "            // 'email' => $data->email ?? null,",
                "            // 'isActive' => isset($data->isActive) ? (bool)$data->isActive : true,",
            ];
        /* ---------- PHP (place at top) ---------- */
        const php = op === "create"
            ? [
                "<?php",
                "use Lib\\Prisma\\Classes\\Prisma;",
                "// use Lib\\Validator; // add project-specific validation as needed",
                "",
                `function ${fnName}($data) {`,
                "    try {",
                "        $prisma = Prisma::getInstance();",
                "",
                `        $row = $prisma->${modelProp}->create([`,
                "            'data' => [",
                ...dataMapLines,
                "            ],",
                ...(includeLines.length
                    ? [
                        "            'include' => [",
                        ...includeLines,
                        "            ],",
                    ]
                    : []),
                ...(selectLines.length
                    ? selectLines.map((l) => l.startsWith("        ") ? l : `        ${l}`)
                    : []),
                ...(omitLines.length
                    ? omitLines.map((l) => l.startsWith("        ") ? l : `        ${l}`)
                    : []),
                "        ]);",
                `        return ${returnRow ? "['ok' => true, 'row' => $row]" : "['ok' => true]"};`,
                "    } catch (Throwable $e) {",
                "        $msg = $e->getMessage() ?: 'Create failed.';",
                "        if (stripos($msg, 'unique') !== false) {",
                "            return ['ok' => false, 'message' => $msg, 'errors' => ['_global' => $msg]];",
                "        }",
                "        return ['ok' => false, 'message' => $msg];",
                "    }",
                "}",
                "?>",
            ].join("\n")
            : op === "createMany"
                ? [
                    "<?php",
                    "use Lib\\Prisma\\Classes\\Prisma;",
                    "",
                    `function ${fnName}($data) {`,
                    "    try {",
                    "        $prisma = Prisma::getInstance();",
                    `        $rows = is_array($data->${rowsParam} ?? null) ? $data->${rowsParam} : [];`,
                    "        if (!$rows) return ['ok' => false, 'message' => 'No rows provided.'];",
                    "",
                    `        $result = $prisma->${modelProp}->createMany([`,
                    "            'data' => $rows,",
                    "            'skipDuplicates' => true,",
                    "        ]);",
                    "        return ['ok' => true, 'count' => ($result->count ?? null)];",
                    "    } catch (Throwable $e) {",
                    "        return ['ok' => false, 'message' => ($e->getMessage() ?: 'Create failed.')];",
                    "    }",
                    "}",
                    "?>",
                ].join("\n")
                : [
                    "<?php",
                    "use Lib\\Prisma\\Classes\\Prisma;",
                    "",
                    `function ${fnName}($data) {`,
                    "    try {",
                    "        $prisma = Prisma::getInstance();",
                    ...(withWhereStub
                        ? [
                            "        $where = [",
                            "            // 'id' => $data->id ?? null, // TODO unique field",
                            "        ];",
                        ]
                        : ["        $where = [ /* ...unique field(s)... */ ];"]),
                    "",
                    `        $row = $prisma->${modelProp}->upsert([`,
                    "            'where'  => $where,",
                    "            'update' => [",
                    ...dataMapLines,
                    "            ],",
                    "            'create' => [",
                    ...dataMapLines,
                    "            ],",
                    "        ]);",
                    `        return ${returnRow ? "['ok' => true, 'row' => $row]" : "['ok' => true]"};`,
                    "    } catch (Throwable $e) {",
                    "        return ['ok' => false, 'message' => ($e->getMessage() ?: 'Upsert failed.')];",
                    "    }",
                    "}",
                    "?>",
                ].join("\n");
        /* ---------- HTML (middle) ---------- */
        const html = [
            "<!-- Plain HTML form; use any component lib. -->",
            `<form onsubmit="submit${Model}(event)" style="display:grid;gap:8px;max-width:560px">`,
            ...(fields.length
                ? fields.flatMap((f) => {
                    const isBool = f.toLowerCase().startsWith("is");
                    return isBool
                        ? [
                            `  <label style="display:flex;gap:.5rem;align-items:center">`,
                            `    <input type="checkbox" onchange="e => patchForm({ ${f}: !!e.target.checked })" checked="{{ !!form.${f} }}" />`,
                            `    <span>${f}</span>`,
                            `  </label>`,
                        ]
                        : [
                            `  <label>`,
                            `    <div>${f}</div>`,
                            `    <input value="{{ form.${f} ?? '' }}" oninput="e => patchForm({ ${f}: e.target.value })" />`,
                            `  </label>`,
                        ];
                })
                : [
                    `  <label>`,
                    `    <div>name</div>`,
                    `    <input value="{{ form.name ?? '' }}" oninput="e => patchForm({ name: e.target.value })" />`,
                    `  </label>`,
                    `  <label>`,
                    `    <div>email</div>`,
                    `    <input type="email" value="{{ form.email ?? '' }}" oninput="e => patchForm({ email: e.target.value })" />`,
                    `  </label>`,
                    `  <label style="display:flex;gap:.5rem;align-items:center">`,
                    `    <input type="checkbox" onchange="e => patchForm({ isActive: !!e.target.checked })" checked="{{ !!form.isActive }}" />`,
                    `    <span>isActive</span>`,
                    `  </label>`,
                ]),
            `  <div style="display:flex;gap:.5rem;align-items:center">`,
            `    <button type="submit" disabled="{{ saving }}">{{ saving ? 'Saving…' : 'Save' }}</button>`,
            `    <span class="error" pp-if="Object.keys(errors).length">Check errors</span>`,
            `  </div>`,
            `</form>`,
        ].join("\n");
        /* ---------- JS (bottom; wrap in <script>) ---------- */
        const defaultFormObj = fields.length
            ? `{ ${fields.map((f) => `${f}: ''`).join(", ")} }`
            : `{ name: '', email: '', isActive: true }`;
        const js = [
            "<script>",
            `// Place this <script> at the bottom of the page.`,
            `const [${plural}, set${Model}s] = pphp.state([]); // local list; switch to pphp.share later if you need cross-file sharing`,
            `const [form, setForm] = pphp.state(${defaultFormObj});`,
            `const [saving, setSaving] = pphp.state(false);`,
            `const [errors, setErrors] = pphp.state({});`,
            ``,
            `export function patchForm(patch) { setForm(prev => ({ ...prev, ...patch })); }`,
            ``,
            `export async function submit${Model}(e) {`,
            `  e?.preventDefault?.();`,
            `  setSaving(true); setErrors({});`,
            `  try {`,
            `    const { response } = await pphp.fetchFunction('${fnName}', form.value);`,
            `    setSaving(false);`,
            `    if (!response?.ok) { if (response?.errors) setErrors(response.errors); return; }`,
            `    if (response?.row) set${Model}s(prev => [response.row, ...prev]);`,
            `    // Optionally: setForm(${defaultFormObj});`,
            `  } catch (err) { setSaving(false); alert('Save failed'); }`,
            `}`,
            "</script>",
        ].join("\n");
        const notes = [
            "• Order: put PHP at top, then HTML, then the JS <script> at the very bottom.",
            "• Local-first: snippets use pphp.state by default; if you need cross-file sharing later, convert to pphp.share.",
            "• $prisma model access is lowerCamel: e.g., $prisma->userRole->findMany().",
            "• Do not mix `select` and `include` in the same Prisma call.",
            "• Use `omit` to strip sensitive fields from the response (e.g., ['password']).",
            `• Aliases: create ⇄ ${aliases.create}, createMany ⇄ ${aliases.createMany}, upsert ⇄ ${aliases.upsert}.`,
        ].join("\n");
        const hints = {
            allowedRootKeys: Array.from(ROOT_KEYS_MAP[op]),
            methodAliases: aliases,
            warnings: [
                "Do not mix `select` and `include`.",
                "For upsert(), 'where' must target a unique field or combination.",
            ],
        };
        const payload = {
            meta: {
                model: modelProp,
                op,
                handlerName: fnName,
                pluralState: plural,
            },
            snippets: { php, html, js, notes },
            hints,
        };
        return okAsText(payload);
    });
}
//# sourceMappingURL=crudCreateGuide.js.map