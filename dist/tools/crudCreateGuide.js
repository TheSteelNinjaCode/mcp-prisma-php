import { z } from "zod";
import { ucfirst, lcfirstWord, toPlural, ensureAllowedKeys, buildIncludeLines, buildSelectLines, buildOmitLines, METHOD_ALIASES, } from "../utils/utils.js";
/**
 * CREATE tool:
 * Returns two clearly separated sections:
 *   1) backend (Prisma PHP model approach)
 *   2) frontend (Todo-style reactive template)
 */
const ROOT_KEYS_MAP = {
    create: ["data", "include", "omit", "select"],
    createMany: ["data", "skipDuplicates"],
    upsert: ["where", "update", "create"],
};
const InputShape = {
    model: z.string().min(1),
    op: z.enum(["create", "createMany", "upsert"]).default("create"),
    include: z.array(z.string()).optional(),
    counts: z.array(z.string()).optional(),
    select: z.array(z.string()).optional(),
    omit: z.array(z.string()).optional(),
    withWhereStub: z.boolean().optional(),
    handlerName: z.string().optional(),
    fields: z.array(z.string()).optional(), // if omitted, defaults to ['name','email','isActive']
    rowsParam: z.string().default("rows"),
    stateName: z.string().optional(),
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
export function registerCrudCreateGuide(server, ctx) {
    server.registerTool("pp.crud.createGuide", {
        title: "Generate CREATE pattern (backend + frontend template, separated)",
        description: "Outputs two sections: (1) Backend model approach (Prisma PHP) and (2) Frontend-only Todo-style template. Backend is omitted if prisma=false.",
        inputSchema: InputShape,
    }, async (args) => {
        const parsed = InputObject.safeParse(args);
        if (!parsed.success)
            return err(`Invalid input: ${parsed.error.message}`);
        const prismaEnabled = ctx.CONFIG?.prisma === true;
        const { model, op = "create", include = [], counts = [], select = [], omit = [], withWhereStub = false, handlerName, fields = [], rowsParam = "rows", stateName, returnRow = true, } = parsed.data;
        // Naming
        const Model = ucfirst(model);
        const modelProp = lcfirstWord(model);
        const plural = (stateName && stateName.trim()) || toPlural(modelProp);
        const fnName = handlerName || `save${Model}`;
        const aliases = METHOD_ALIASES(Model);
        // ---------- BACKEND (Prisma enabled only) ----------
        let backend = {
            disabled: true,
            message: "Prisma is disabled (prisma=false). Backend snippet omitted.",
        };
        if (prismaEnabled) {
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
            const { bad } = ensureAllowedKeys(ROOT_KEYS_MAP[op], wants);
            if (bad.length) {
                return err(`The following keys are not allowed for ${op}(): ${bad.join(", ")}.\nAllowed keys: ${ROOT_KEYS_MAP[op].join(", ")}`);
            }
            const includeLines = buildIncludeLines(include, counts);
            const selectLines = buildSelectLines(select);
            const omitLines = buildOmitLines(omit);
            const backendFields = fields.length
                ? fields
                : ["name", "email", "isActive"];
            const dataMapLines = backendFields.map((f) => `            '${f}' => $data->${f} ?? ${f.toLowerCase().startsWith("is") ? "true" : "null"},`);
            const php = op === "create"
                ? [
                    "<?php",
                    "use Lib\\Prisma\\Classes\\Prisma;",
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
            const html = [
                "<!-- Backend • Model approach (Create) -->",
                `<form onsubmit="submit${Model}(event)" class="grid gap-3 max-w-md">`,
                ...backendFields.map((f) => {
                    const isBool = f.toLowerCase().startsWith("is");
                    return isBool
                        ? [
                            `  <label class="flex items-center gap-2">`,
                            `    <input type="checkbox" onchange="patchForm({ ${f}: !!this.checked })" checked="{!!form.${f}}" />`,
                            `    <span>${f}</span>`,
                            `  </label>`,
                        ].join("\n")
                        : [
                            `  <label class="grid gap-1">`,
                            `    <div class="text-sm text-gray-700">${f}</div>`,
                            `    <input value="{form.${f} ?? ''}" oninput="patchForm({ ${f}: this.value })" class="border rounded px-2 py-1" />`,
                            `  </label>`,
                        ].join("\n");
                }),
                `  <div class="flex gap-2">`,
                `    <button type="submit" disabled="{saving}" class="bg-blue-600 text-white px-3 py-1 rounded">`,
                `      {saving ? 'Saving…' : 'Save'}`,
                `    </button>`,
                `    <span class="text-red-600 text-sm" pp-if="Object.keys(errors).length">Check errors</span>`,
                `  </div>`,
                `</form>`,
            ].join("\n");
            const defaultFormObj = fields.length
                ? `{ ${fields
                    .map((f) => `${f}: ${f.toLowerCase().startsWith("is") ? "true" : "''"}`)
                    .join(", ")} }`
                : `{ name: '', email: '', isActive: true }`;
            const js = [
                "<script>",
                `const [${plural}, set${Model}s] = pp.state([]);`,
                `const [form, setForm] = pp.state(${defaultFormObj});`,
                `const [saving, setSaving] = pp.state(false);`,
                `const [errors, setErrors] = pp.state({});`,
                `function patchForm(patch) { setForm(prev => ({ ...prev, ...patch })); }`,
                `async function submit${Model}(e) {`,
                `  e?.preventDefault?.(); setSaving(true); setErrors({});`,
                `  try {`,
                `    const { response } = await pp.fetchFunction('${fnName}', form);`,
                `    setSaving(false);`,
                `    if (!response?.ok) { if (response?.errors) setErrors(response.errors); return; }`,
                `    if (response?.row) set${Model}s(prev => [response.row, ...prev]);`,
                `    // Optionally reset: setForm(${defaultFormObj});`,
                `  } catch (err) { setSaving(false); alert('Save failed'); }`,
                `}`,
                "</script>",
            ].join("\n");
            backend = { php, html, js };
        }
        // ---------- FRONTEND-ONLY (Todo-style) ----------
        const feHtml = [
            `<!-- Create (frontend-only) -->`,
            `<div class="max-w-md mx-auto mt-8 p-4 bg-white rounded shadow">`,
            `  <h2 class="text-xl font-bold mb-4">Create item</h2>`,
            `  <form onsubmit="addItem(event)" class="flex gap-2 mb-4">`,
            `    <input type="text" value="{newText}" oninput="setNewText(this.value)" placeholder="Type name…" class="flex-1 border rounded px-2 py-1" />`,
            `    <label class="inline-flex items-center gap-2">`,
            `      <input type="checkbox" checked="{newActive}" onchange="setNewActive(!!this.checked)" />`,
            `      <span class="text-sm">isActive</span>`,
            `    </label>`,
            `    <button type="submit" class="bg-blue-500 text-white px-4 py-1 rounded">Add</button>`,
            `  </form>`,
            `  <ul>`,
            `    <template pp-for="row in items">`,
            `      <li key="{row.id}" class="flex items-center gap-2 mb-2">`,
            `        <span class="{row.isActive ? 'text-gray-900' : 'text-gray-400 line-through'}">{row.name}</span>`,
            `      </li>`,
            `    </template>`,
            `  </ul>`,
            `</div>`,
        ].join("\n");
        const feJs = [
            "<script>",
            `const [items, setItems] = pp.state([]);`,
            `const [newText, setNewText] = pp.state("");`,
            `const [newActive, setNewActive] = pp.state(true);`,
            `function addItem(e) {`,
            `  e.preventDefault();`,
            `  const name = newText.trim(); if (!name) return;`,
            `  const row = { id: crypto.randomUUID?.() || Date.now(), name, isActive: !!newActive };`,
            `  setItems([row, ...items]);`,
            `  setNewText(""); setNewActive(true);`,
            `  // For API later: POST row, then reconcile list`,
            `}`,
            "</script>",
        ].join("\n");
        const notes = [
            prismaEnabled
                ? "Both sections included: backend (Prisma) + frontend reference (Todo-style)."
                : "Prisma is disabled → backend omitted; use the frontend Todo-style section.",
        ];
        const hints = {
            allowedRootKeys: Array.from(ROOT_KEYS_MAP[op]),
            methodAliases: aliases,
            warnings: [
                "Do not mix `select` and `include`.",
                "For upsert(), 'where' must target a unique field.",
            ],
        };
        const payload = {
            meta: {
                model: modelProp,
                op,
                handlerName: fnName,
                pluralState: plural,
                prismaEnabled,
            },
            snippets: { backend, frontend: { html: feHtml, js: feJs }, notes },
            hints,
        };
        return okAsText(payload);
    });
}
//# sourceMappingURL=crudCreateGuide.js.map