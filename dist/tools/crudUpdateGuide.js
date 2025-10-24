import { z } from "zod";
import { ucfirst, lcfirstWord, toPlural, ensureAllowedKeys, buildIncludeLines, buildSelectLines, buildOmitLines, METHOD_ALIASES, } from "../utils/utils.js";
/**
 * UPDATE tool:
 * Two sections:
 *   1) backend (Prisma PHP model approach)
 *   2) frontend (Todo-style edit/save/cancel)
 */
const ROOT_KEYS_MAP = {
    update: ["data", "where", "include", "omit", "select"],
    updateMany: ["data", "where"],
};
const InputShape = {
    model: z.string().min(1),
    op: z.enum(["update", "updateMany"]).default("update"),
    whereUniqueKey: z.string().default("id"),
    include: z.array(z.string()).optional(),
    counts: z.array(z.string()).optional(),
    select: z.array(z.string()).optional(),
    omit: z.array(z.string()).optional(),
    handlerName: z.string().optional(),
    fields: z.array(z.string()).optional(),
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
export function registerCrudUpdateGuide(server, ctx) {
    server.registerTool("pp.crud.updateGuide", {
        title: "Generate UPDATE pattern (backend + frontend template, separated)",
        description: "Outputs two sections: (1) Backend model approach (Prisma PHP) and (2) Frontend-only Todo edit pattern. Backend omitted if prisma=false.",
        inputSchema: InputShape,
    }, async (args) => {
        const parsed = InputObject.safeParse(args);
        if (!parsed.success)
            return err(`Invalid input: ${parsed.error.message}`);
        const prismaEnabled = ctx.CONFIG?.prisma === true;
        const { model, op = "update", whereUniqueKey = "id", include = [], counts = [], select = [], omit = [], handlerName, fields = [], stateName, returnRow = true, } = parsed.data;
        const Model = ucfirst(model);
        const modelProp = lcfirstWord(model);
        const plural = (stateName && stateName.trim()) || toPlural(modelProp);
        const fnName = handlerName ||
            (op === "update" ? `update${Model}` : `updateMany${Model}`);
        const aliases = METHOD_ALIASES(Model);
        // ---------- BACKEND ----------
        let backend = {
            disabled: true,
            message: "Prisma is disabled (prisma=false). Backend snippet omitted.",
        };
        if (prismaEnabled) {
            if (include.length && select.length)
                return err("You may not use both `select` and `include`.");
            const wants = ["where", "data"];
            if (select.length && op === "update")
                wants.push("select");
            if ((include.length || counts.length) && op === "update")
                wants.push("include");
            if (omit.length && op === "update")
                wants.push("omit");
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
            const dataMapLines = backendFields.map((f) => `            '${f}' => $data->${f} ?? ${f.toLowerCase().startsWith("is") ? "null" : "null"},`);
            const php = op === "update"
                ? [
                    "<?php",
                    "use Lib\\Prisma\\Classes\\Prisma;",
                    "",
                    `function ${fnName}($data) {`,
                    "    try {",
                    "        $prisma = Prisma::getInstance();",
                    `        $whereVal = $data->${whereUniqueKey} ?? null;`,
                    `        if ($whereVal === null || $whereVal === '') return ['ok' => false, 'message' => 'Missing unique key: ${whereUniqueKey}.'];`,
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
                    `        $res = $prisma->${modelProp}->updateMany([ 'where' => $where, 'data' => $payload ]);`,
                    "        return ['ok' => true, 'count' => ($res->count ?? null)];",
                    "    } catch (Throwable $e) {",
                    "        return ['ok' => false, 'message' => ($e->getMessage() ?: 'UpdateMany failed.')];",
                    "    }",
                    "}",
                    "?>",
                ].join("\n");
            const html = [
                "<!-- Backend • Model approach (Update) -->",
                `<form onsubmit="submit${Model}(event)" class="grid gap-3 max-w-md">`,
                `  <label class="grid gap-1">`,
                `    <div class="text-sm text-gray-700">${whereUniqueKey}</div>`,
                `    <input value="{form.${whereUniqueKey} ?? ''}" readonly class="border rounded px-2 py-1 bg-gray-50" />`,
                `  </label>`,
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
                `    <button type="submit" disabled="{saving}" class="bg-green-600 text-white px-3 py-1 rounded">`,
                `      {saving ? 'Saving…' : 'Save changes'}`,
                `    </button>`,
                `    <button type="button" onclick="cancelEdit()" class="bg-gray-300 px-3 py-1 rounded">Cancel</button>`,
                `  </div>`,
                `</form>`,
            ].join("\n");
            const defaultFormObj = [
                `${whereUniqueKey}: ''`,
                ...(fields.length
                    ? fields.map((f) => `${f}: ${f.toLowerCase().startsWith("is") ? "true" : "''"}`)
                    : ["name: ''", "email: ''", "isActive: true"]),
            ].join(", ");
            const js = [
                "<script>",
                `const [${plural}, set${Model}s] = pp.state([]);`,
                `const [form, setForm] = pp.state({ ${defaultFormObj} });`,
                `const [saving, setSaving] = pp.state(false);`,
                `const [errors, setErrors] = pp.state({});`,
                `function cancelEdit() { setForm({ ${defaultFormObj} }); }`,
                `function patchForm(patch) { setForm(prev => ({ ...prev, ...patch })); }`,
                `async function submit${Model}(e) {`,
                `  e?.preventDefault?.(); setSaving(true); setErrors({});`,
                `  try {`,
                `    const { response } = await pp.fetchFunction('${fnName}', form);`,
                `    setSaving(false);`,
                `    if (!response?.ok) { if (response?.errors) setErrors(response.errors); return; }`,
                `    if (response?.row) set${Model}s(prev => prev.map(r => r.${whereUniqueKey} === response.row.${whereUniqueKey} ? response.row : r));`,
                `  } catch (err) { setSaving(false); alert('Update failed'); }`,
                `}`,
                "</script>",
            ].join("\n");
            backend = { php, html, js };
        }
        // ---------- FRONTEND (Todo-style edit) ----------
        const feHtml = [
            `<!-- Update (frontend-only) -->`,
            `<div class="max-w-md mx-auto mt-8 p-4 bg-white rounded shadow">`,
            `  <h2 class="text-xl font-bold mb-4">Edit item</h2>`,
            `  <ul class="mb-4">`,
            `    <template pp-for="row in items">`,
            `      <li key="{row.id}" class="flex items-center gap-2 mb-2">`,
            `        <span class="flex-1">{row.name}</span>`,
            `        <button onclick="startEdit(row)" class="text-blue-600 hover:underline">Edit</button>`,
            `      </li>`,
            `    </template>`,
            `  </ul>`,
            `  <form pp-if="editingId" onsubmit="saveEdit()" class="grid gap-3">`,
            `    <label class="grid gap-1">`,
            `      <div class="text-sm text-gray-700">id</div>`,
            `      <input value="edit.id" readonly class="border rounded px-2 py-1 bg-gray-50" />`,
            `    </label>`,
            `    <label class="grid gap-1">`,
            `      <div class="text-sm text-gray-700">name</div>`,
            `      <input value="{edit.name}" oninput="setEdit({ ...edit, name: this.value })" class="border rounded px-2 py-1" />`,
            `    </label>`,
            `    <label class="inline-flex items-center gap-2">`,
            `      <input type="checkbox" checked="{edit.isActive}" onchange="setEdit({ ...edit, isActive: !!this.checked })" />`,
            `      <span class="text-sm">isActive</span>`,
            `    </label>`,
            `    <div class="flex gap-2">`,
            `      <button type="submit" class="bg-green-600 text-white px-3 py-1 rounded">Save</button>`,
            `      <button type="button" onclick="cancelEdit()" class="bg-gray-300 px-3 py-1 rounded">Cancel</button>`,
            `    </div>`,
            `  </form>`,
            `</div>`,
        ].join("\n");
        const feJs = [
            "<script>",
            `const [items, setItems] = pp.state([{ id: crypto.randomUUID?.() || 1, name: "Sample", isActive: true }]);`,
            `const [editingId, setEditingId] = pp.state("");`,
            `const [edit, setEdit] = pp.state({ id: "", name: "", isActive: true });`,
            `function startEdit(row) {`,
            `  setEditingId(String(row?.id ?? ""));`,
            `  setEdit({ id: row?.id ?? "", name: row?.name ?? "", isActive: !!row?.isActive });`,
            `}`,
            `function cancelEdit() { setEditingId(""); setEdit({ id: "", name: "", isActive: true }); }`,
            `function saveEdit() {`,
            `  if (!editingId) return;`,
            `  setItems(items.map(r => String(r.id) === String(edit.id) ? { ...r, ...edit } : r));`,
            `  cancelEdit();`,
            `  // For API later: PUT /api/items/:id then reconcile list`,
            `}`,
            "</script>",
        ].join("\n");
        const notes = [
            prismaEnabled
                ? "Both sections included: backend (Prisma) + frontend reference (Todo-style)."
                : "Prisma is disabled → backend omitted; use the frontend Todo-style section.",
            "updateMany(): returns only { count } (no rows).",
        ];
        const hints = {
            allowedRootKeys: Array.from(ROOT_KEYS_MAP[op]),
            methodAliases: aliases,
            warnings: [
                "Do not mix `select` and `include`.",
                "update(): requires unique 'where' key.",
            ],
        };
        const payload = {
            meta: {
                model: modelProp,
                op,
                handlerName: fnName,
                pluralState: plural,
                whereUniqueKey,
                prismaEnabled,
            },
            snippets: { backend, frontend: { html: feHtml, js: feJs }, notes },
            hints,
        };
        return okAsText(payload);
    });
}
//# sourceMappingURL=crudUpdateGuide.js.map