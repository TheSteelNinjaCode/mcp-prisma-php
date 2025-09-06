import { z } from "zod";
import { ucfirst, lcfirstWord, toPlural, ensureAllowedKeys, buildIncludeLines, buildSelectLines, buildOmitLines, METHOD_ALIASES, } from "../utils/utils.js";
/**
 * Generic UPDATE scaffolding.
 * Auto-switches to front-end-only if prisma is disabled.
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
    server.registerTool("pphp.crud.updateGuide", {
        title: "Generate UPDATE pattern (Prisma PHP + local state, generic)",
        description: "UI-agnostic Prisma PHP UPDATE scaffolding (front-end-only when prisma disabled). Place <script> at the bottom.",
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
        if (!prismaEnabled) {
            const defaultFormObj = [
                `${whereUniqueKey}: ''`,
                ...(fields.length
                    ? fields.map((f) => `${f}: ''`)
                    : ["name: ''", "email: ''", "isActive: true"]),
            ].join(", ");
            const php = `<?php /* Prisma disabled → UPDATE PHP skipped. */ ?>`;
            const html = [
                "<!-- Front-end-only update form; fill `form` then call your API in JS -->",
                `<form onsubmit="submit${Model}(event)" style="display:grid;gap:8px;max-width:560px">`,
                `  <label><div>${whereUniqueKey}</div><input value="{{ form.${whereUniqueKey} ?? '' }}" readonly /></label>`,
                ...(fields.length
                    ? fields.map((f) => `  <label><div>${f}</div><input value="{{ form.${f} ?? '' }}" oninput="patchForm({ ${f}: this.value })" /></label>`)
                    : [
                        `  <label><div>name</div><input value="{{ form.name ?? '' }}" oninput="patchForm({ name: this.value })" /></label>`,
                        `  <label><div>email</div><input type="email" value="{{ form.email ?? '' }}" oninput="patchForm({ email: this.value })" /></label>`,
                        `  <label style="display:flex;gap:.5rem;align-items:center"><input type="checkbox" onchange="patchForm({ isActive: !!this.checked })" checked="{{ !!form.isActive }}" /><span>isActive</span></label>`,
                    ]),
                `  <div style="display:flex;gap:.5rem;align-items:center">`,
                `    <button type="submit" disabled="{{ saving }}">{{ saving ? 'Saving…' : 'Save changes' }}</button>`,
                `    <span class="error" pp-if="Object.keys(errors).length">Check errors</span>`,
                `  </div>`,
                `</form>`,
            ].join("\n");
            const js = [
                "<script>",
                "// Bottom of page (front-end-only).",
                `const [${plural}, set${Model}s] = pphp.state([]);`,
                `const [form, setForm] = pphp.state({ ${defaultFormObj} });`,
                `const [saving, setSaving] = pphp.state(false);`,
                `const [errors, setErrors] = pphp.state({});`,
                `export function openEdit${Model}(row) { setErrors({}); setForm({ ${whereUniqueKey}: row?.${whereUniqueKey} ?? '', ${fields.length
                    ? fields.map((f) => `${f}: row?.${f} ?? ''`).join(", ")
                    : "name: row?.name ?? '', email: row?.email ?? '', isActive: !!row?.isActive"} }); }`,
                `export function patchForm(patch) { setForm(prev => ({ ...prev, ...patch })); }`,
                `export async function submit${Model}(e) {`,
                `  e?.preventDefault?.(); setSaving(true); setErrors({});`,
                `  try {`,
                `    // const res = await fetch('/api/${modelProp}/${"${form." + whereUniqueKey + "}"}', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) });`,
                `    // const data = await res.json();`,
                `    // set${Model}s(prev => prev.map(r => r.${whereUniqueKey} === data.row?.${whereUniqueKey} ? data.row : r));`,
                `    setSaving(false);`,
                `  } catch (err) { setSaving(false); alert('Update failed'); }`,
                `}`,
                "</script>",
            ].join("\n");
            const notes = [
                "• Front-end-only mode: wire to your REST/HTTP endpoint.",
                "• Objects/arrays are reactive directly; no `.value`.",
            ].join("\n");
            return okAsText({
                meta: {
                    model: modelProp,
                    op,
                    handlerName: fnName,
                    pluralState: plural,
                    whereUniqueKey,
                    prismaEnabled,
                },
                snippets: { php, html, js, notes },
                hints: {
                    methodAliases: aliases,
                    warnings: ["Backend update skipped: prisma=false."],
                },
            });
        }
        // Prisma-enabled
        if (include.length && select.length)
            return err("You may not use both `select` and `include`.");
        const wants = op === "update" ? ["where", "data"] : ["where", "data"];
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
        const dataMapLines = (fields.length ? fields : ["name", "email", "isActive"]).map((f) => `            '${f}' => $data->${f} ?? ${f === "isActive" ? "null" : "null"},`);
        const php = op === "update"
            ? [
                "<?php",
                "use Lib\\Prisma\\Classes\\Prisma;",
                "// use Lib\\Validator;",
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
            "<!-- Plain HTML update form (UI-agnostic). -->",
            `<form onsubmit="submit${Model}(event)" style="display:grid;gap:8px;max-width:560px">`,
            `  <label><div>${whereUniqueKey}</div><input value="{{ form.${whereUniqueKey} ?? '' }}" readonly /></label>`,
            ...(fields.length
                ? fields.map((f) => `  <label><div>${f}</div><input value="{{ form.${f} ?? '' }}" oninput="patchForm({ ${f}: this.value })" /></label>`)
                : [
                    `  <label><div>name</div><input value="{{ form.name ?? '' }}" oninput="patchForm({ name: this.value })" /></label>`,
                    `  <label><div>email</div><input type="email" value="{{ form.email ?? '' }}" oninput="patchForm({ email: this.value })" /></label>`,
                    `  <label style="display:flex;gap:.5rem;align-items:center"><input type="checkbox" onchange="patchForm({ isActive: !!this.checked })" checked="{{ !!form.isActive }}" /><span>isActive</span></label>`,
                ]),
            `  <div style="display:flex;gap:.5rem;align-items:center">`,
            `    <button type="submit" disabled="{{ saving }}">{{ saving ? 'Saving…' : 'Save changes' }}</button>`,
            `    <span class="error" pp-if="Object.keys(errors).length">Check errors</span>`,
            `  </div>`,
            `</form>`,
        ].join("\n");
        const defaultFormObj = [
            `${whereUniqueKey}: ''`,
            ...(fields.length
                ? fields.map((f) => `${f}: ''`)
                : ["name: ''", "email: ''", "isActive: true"]),
        ].join(", ");
        const js = [
            "<script>",
            "// Bottom of page.",
            `const [${plural}, set${Model}s] = pphp.state([]);`,
            `const [form, setForm] = pphp.state({ ${defaultFormObj} });`,
            `const [saving, setSaving] = pphp.state(false);`,
            `const [errors, setErrors] = pphp.state({});`,
            `export function openEdit${Model}(row) { setErrors({}); setForm({ ${whereUniqueKey}: row?.${whereUniqueKey} ?? '', ${fields.length
                ? fields.map((f) => `${f}: row?.${f} ?? ''`).join(", ")
                : "name: row?.name ?? '', email: row?.email ?? '', isActive: !!row?.isActive"} }); }`,
            `export function patchForm(patch) { setForm(prev => ({ ...prev, ...patch })); }`,
            `export async function submit${Model}(e) {`,
            `  e?.preventDefault?.(); setSaving(true); setErrors({});`,
            `  try {`,
            `    const { response } = await pphp.fetchFunction('${fnName}', form);`,
            `    setSaving(false);`,
            `    if (!response?.ok) { if (response?.errors) setErrors(response.errors); return; }`,
            `    if (response?.row) set${Model}s(prev => prev.map(r => r.${whereUniqueKey} === response.row.${whereUniqueKey} ? response.row : r));`,
            `  } catch (err) { setSaving(false); alert('Update failed'); }`,
            `}`,
            "</script>",
        ].join("\n");
        const notes = [
            "• Order: PHP → HTML → JS.",
            "• Objects/arrays are reactive directly (no `.value`).",
            "• update(): needs unique `where`; updateMany(): returns count only.",
        ].join("\n");
        const hints = {
            allowedRootKeys: Array.from(ROOT_KEYS_MAP[op]),
            methodAliases: aliases,
            warnings: [
                "Do not mix `select` and `include`.",
                "updateMany() does not return rows.",
            ],
        };
        return okAsText({
            meta: {
                model: modelProp,
                op,
                handlerName: fnName,
                pluralState: plural,
                whereUniqueKey,
                prismaEnabled,
            },
            snippets: { php, html, js, notes },
            hints,
        });
    });
}
//# sourceMappingURL=crudUpdateGuide.js.map