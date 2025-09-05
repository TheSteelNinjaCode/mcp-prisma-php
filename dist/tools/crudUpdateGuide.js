import { z } from "zod";
/**
 * Generic UPDATE scaffolding for Prisma PHP + local Reactivity (UI-agnostic).
 * Returns TEXT (pretty JSON):
 * {
 *   meta: { model, op, handlerName, pluralState, whereUniqueKey },
 *   snippets: { php, html, js, notes },
 *   hints: { allowedRootKeys, methodAliases, warnings }
 * }
 */
const ROOT_KEYS_MAP = {
    update: ["data", "where", "include", "omit", "select"],
    updateMany: ["data", "where"],
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
/* ────────────── helpers ────────────── */
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
    return { allowed, bad };
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
/* ────────────── Input schema ────────────── */
const InputShape = {
    /** Base model name (any case). We'll use lowerCamel for $prisma access. */
    model: z.string().min(1),
    /** UPDATE operation */
    op: z.enum(["update", "updateMany"]).default("update"),
    /** Unique where key for update(); default "id" */
    whereUniqueKey: z.string().default("id"),
    /** Relations to include (e.g., ["userRole","userPermission"]) */
    include: z.array(z.string()).optional(),
    /** _count.select fields (e.g., ["assignedTo"]) */
    counts: z.array(z.string()).optional(),
    /** `select` fields (mutually exclusive with `include`) */
    select: z.array(z.string()).optional(),
    /** Fields to omit from payload (e.g., ["password"]) */
    omit: z.array(z.string()).optional(),
    /** Optional handler name. Default: update<Model> or updateMany<Model> */
    handlerName: z.string().optional(),
    /** Column names to map in the example (data block). */
    fields: z.array(z.string()).optional(),
    /** Optional plural local state name for the list (defaults to naive plural). */
    stateName: z.string().optional(),
    /** Whether to return the updated row from update(); default true */
    returnRow: z.boolean().default(true),
};
const InputObject = z.object(InputShape);
/* ────────────── MCP helpers ────────────── */
const err = (text) => ({
    isError: true,
    content: [{ type: "text", text }],
});
const okAsText = (obj) => ({
    content: [{ type: "text", text: JSON.stringify(obj, null, 2) }],
});
/* ────────────── Tool ────────────── */
export function registerCrudUpdateGuide(server, _ctx) {
    server.registerTool("pphp.crud.updateGuide", {
        title: "Generate UPDATE pattern (Prisma PHP + local state, generic)",
        description: "UI-agnostic Prisma PHP UPDATE scaffolding: PHP handler + plain HTML form + JS (state). Place <script> at the bottom.",
        inputSchema: InputShape,
    }, async (args) => {
        const parsed = InputObject.safeParse(args);
        if (!parsed.success)
            return err(`Invalid input: ${parsed.error.message}`);
        const { model, op = "update", whereUniqueKey = "id", include = [], counts = [], select = [], omit = [], handlerName, fields = [], stateName, returnRow = true, } = parsed.data;
        if (include.length && select.length) {
            return err("You may not use both `select` and `include` in the same query.");
        }
        // Validate desired keys against op
        const wants = [];
        if (op === "update") {
            wants.push("where", "data");
            if (select.length)
                wants.push("select");
            if (include.length || counts.length)
                wants.push("include");
            if (omit.length)
                wants.push("omit");
        }
        else {
            wants.push("where", "data");
        }
        const { bad } = ensureAllowedKeys(op, wants);
        if (bad.length) {
            return err(`The following keys are not allowed for ${op}(): ${bad.join(", ")}.\n` +
                `Allowed keys: ${ROOT_KEYS_MAP[op].join(", ")}`);
        }
        // naming
        const Pascal = ucfirst(model);
        const modelProp = lcfirstWord(model); // ✅ lowerCamel on $prisma
        const plural = (stateName && stateName.trim()) || toPlural(modelProp);
        const Model = Pascal;
        const fnName = handlerName ||
            (op === "update" ? `update${Model}` : `updateMany${Model}`);
        const aliases = METHOD_ALIASES(Pascal);
        const includeLines = buildIncludeLines(include, counts);
        const selectLines = buildSelectLines(select);
        const omitLines = buildOmitLines(omit);
        const dataMapLines = fields.length
            ? fields.map((f) => `            '${f}' => $data->${f} ?? null, // TODO: validate & coerce`)
            : [
                "            // 'name' => $data->name ?? null,",
                "            // 'email' => $data->email ?? null,",
                "            // 'isActive' => isset($data->isActive) ? (bool)$data->isActive : null,",
            ];
        /* ---------- PHP (top) ---------- */
        const php = op === "update"
            ? [
                "<?php",
                "use Lib\\Prisma\\Classes\\Prisma;",
                "// use Lib\\Validator; // plug in your project validation as needed",
                "",
                `function ${fnName}($data) {`,
                "    try {",
                "        $prisma = Prisma::getInstance();",
                "",
                `        $whereVal = $data->${whereUniqueKey} ?? null;`,
                `        if ($whereVal === null || $whereVal === '') {`,
                `            return ['ok' => false, 'message' => 'Missing unique key: ${whereUniqueKey}.'];`,
                "        }",
                "",
                `        $row = $prisma->${modelProp}->update([`,
                `            'where' => ['${whereUniqueKey}' => $whereVal],`,
                "            'data'  => [",
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
                "        return ['ok' => false, 'message' => ($e->getMessage() ?: 'Update failed.')];",
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
                "        $where = is_array($data->where ?? null) ? $data->where : [];",
                "        $payload = is_array($data->data ?? null) ? $data->data : [];",
                "        if (!$payload) return ['ok' => false, 'message' => 'No update data provided.'];",
                "",
                `        $res = $prisma->${modelProp}->updateMany([`,
                "            'where' => $where,",
                "            'data'  => $payload,",
                "        ]);",
                "        return ['ok' => true, 'count' => ($res->count ?? null)];",
                "    } catch (Throwable $e) {",
                "        return ['ok' => false, 'message' => ($e->getMessage() ?: 'UpdateMany failed.')];",
                "    }",
                "}",
                "?>",
            ].join("\n");
        /* ---------- HTML (middle) ---------- */
        const html = [
            "<!-- Plain HTML update form (UI-agnostic). Bind the record into `form`. -->",
            `<form onsubmit="submit${Model}(event)" style="display:grid;gap:8px;max-width:560px">`,
            `  <!-- unique key field (readonly for safety) -->`,
            `  <label>`,
            `    <div>${whereUniqueKey}</div>`,
            `    <input value="{{ form.${whereUniqueKey} ?? '' }}" readonly />`,
            `  </label>`,
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
            `    <button type="submit" disabled="{{ saving }}">{{ saving ? 'Saving…' : 'Save changes' }}</button>`,
            `    <span class="error" pp-if="Object.keys(errors).length">Check errors</span>`,
            `  </div>`,
            `</form>`,
        ].join("\n");
        /* ---------- JS (bottom; wrap in <script>) ---------- */
        const defaultFormObj = [
            `${whereUniqueKey}: ''`,
            ...(fields.length
                ? fields.map((f) => `${f}: ''`)
                : ["name: ''", "email: ''", "isActive: true"]),
        ].join(", ");
        const js = [
            "<script>",
            "// Place this <script> at the very bottom of the page.",
            `const [${plural}, set${Model}s] = pphp.state([]);  // local list; switch to pphp.share later if you need cross-file sharing`,
            `const [form, setForm] = pphp.state({ ${defaultFormObj} });`,
            `const [saving, setSaving] = pphp.state(false);`,
            `const [errors, setErrors] = pphp.state({});`,
            ``,
            `export function openEdit${Model}(row) {`,
            `  // Load the selected row into the form state`,
            `  setErrors({});`,
            `  setForm({`,
            `    ${whereUniqueKey}: row?.${whereUniqueKey} ?? '',`,
            ...(fields.length
                ? fields.map((f) => `    ${f}: row?.${f} ?? '',`).join("\n")
                : `    name: row?.name ?? '',\n    email: row?.email ?? '',\n    isActive: !!row?.isActive,`),
            `  });`,
            `}`,
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
            `    if (response?.row) {`,
            `      set${Model}s(prev => prev.map(r => r.${whereUniqueKey} === response.row.${whereUniqueKey} ? response.row : r));`,
            `    }`,
            `  } catch (err) {`,
            `    setSaving(false);`,
            `    alert('Update failed');`,
            `  }`,
            `}`,
            "</script>",
        ].join("\n");
        const notes = [
            "• Order: put PHP at the top, HTML form in the middle, and the JS <script> at the very bottom.",
            "• Local-first: snippets use pphp.state by default; if you need cross-file sharing later, convert to pphp.share.",
            "• $prisma model access is lowerCamel: e.g., $prisma->userRole->update([...]).",
            "• Do not mix `select` and `include` in the same Prisma call.",
            "• update() requires both 'where' (unique) and 'data'. updateMany() requires 'data' (and optional 'where').",
            "• Use 'omit' to strip sensitive fields from the response (e.g., ['password']).",
            `• Aliases: update ⇄ ${aliases.update}, updateMany ⇄ ${aliases.updateMany}.`,
        ].join("\n");
        const hints = {
            allowedRootKeys: Array.from(ROOT_KEYS_MAP[op]),
            methodAliases: aliases,
            warnings: [
                "Do not mix `select` and `include`.",
                "update(): requires a unique 'where' key (default 'id').",
                "updateMany(): returns count; does not return the updated rows.",
            ],
        };
        const payload = {
            meta: {
                model: modelProp,
                op,
                handlerName: fnName,
                pluralState: plural,
                whereUniqueKey,
            },
            snippets: { php, html, js, notes },
            hints,
        };
        return okAsText(payload);
    });
}
//# sourceMappingURL=crudUpdateGuide.js.map