import { z } from "zod";
import { ucfirst, lcfirstWord, toPlural, ensureAllowedKeys, buildIncludeLines, buildSelectLines, buildOmitLines, METHOD_ALIASES, } from "../utils/utils.js";
/**
 * Generic CREATE scaffolding for Prisma PHP + local Reactivity.
 * Output is a TEXT item with pretty-printed JSON:
 * {
 *   meta: { model, op, handlerName, pluralState, prismaEnabled },
 *   snippets: { php, html, js, notes },
 *   hints: { allowedRootKeys, methodAliases, warnings }
 * }
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
    fields: z.array(z.string()).optional(),
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
    server.registerTool("pphp.crud.createGuide", {
        title: "Generate CREATE pattern (Prisma PHP + local state, generic)",
        description: "UI-agnostic Prisma PHP CREATE scaffolding (auto-switches to front-end-only if prisma is disabled). Place <script> at bottom.",
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
        // FRONT-END-ONLY: prisma disabled → skip backend entirely
        if (!prismaEnabled) {
            const defaultFormObj = fields.length
                ? `{ ${fields.map((f) => `${f}: ''`).join(", ")} }`
                : `{ name: '', email: '', isActive: true }`;
            const php = `<?php /* Prisma PHP ORM is disabled in prisma-php.json → skipping backend handler for CREATE. */ ?>`;
            const html = [
                "<!-- Plain HTML form (front-end only) -->",
                `<form onsubmit="submit${Model}(event)" style="display:grid;gap:8px;max-width:560px">`,
                ...(fields.length
                    ? fields.map((f) => `  <label><div>${f}</div><input value="{{ form.${f} ?? '' }}" oninput="patchForm({ ${f}: this.value })" /></label>`)
                    : [
                        `  <label><div>name</div><input value="{{ form.name ?? '' }}" oninput="patchForm({ name: this.value })" /></label>`,
                        `  <label><div>email</div><input type="email" value="{{ form.email ?? '' }}" oninput="patchForm({ email: this.value })" /></label>`,
                        `  <label style="display:flex;gap:.5rem;align-items:center"><input type="checkbox" onchange="patchForm({ isActive: !!this.checked })" checked="{{ !!form.isActive }}" /><span>isActive</span></label>`,
                    ]),
                `  <div style="display:flex;gap:.5rem;align-items:center">`,
                `    <button type="submit" disabled="{{ saving }}">{{ saving ? 'Saving…' : 'Save' }}</button>`,
                `    <span class="error" pp-if="Object.keys(errors).length">Check errors</span>`,
                `  </div>`,
                `</form>`,
            ].join("\n");
            const js = [
                "<script>",
                "// Put this <script> at the bottom of the page (front-end-only mode).",
                `const [${plural}, set${Model}s] = pphp.state([]);`,
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
                `    // TODO: replace with your API endpoint`,
                `    // const res = await fetch('/api/${modelProp}', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) });`,
                `    // const data = await res.json();`,
                `    // if (!data.ok) { setErrors(data.errors || {}); setSaving(false); return; }`,
                `    // set${Model}s(prev => [data.row ?? form, ...prev]);`,
                `    setSaving(false);`,
                `  } catch (err) { setSaving(false); alert('Save failed'); }`,
                `}`,
                "</script>",
            ].join("\n");
            const notes = [
                "• Prisma is disabled in prisma-php.json → emitting front-end-only scaffolding.",
                "• Replace the fetch() stub with your real API endpoint.",
                "• Objects/arrays are reactive directly. Do NOT use `.value` on `form`.",
            ].join("\n");
            const payload = {
                meta: {
                    model: modelProp,
                    op,
                    handlerName: fnName,
                    pluralState: plural,
                    prismaEnabled,
                },
                snippets: { php, html, js, notes },
                hints: {
                    methodAliases: aliases,
                    warnings: ["Backend handler skipped: prisma=false."],
                },
            };
            return okAsText(payload);
        }
        // Prisma-enabled validations
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
            return err(`The following keys are not allowed for ${op}(): ${bad.join(", ")}.\n` + `Allowed keys: ${ROOT_KEYS_MAP[op].join(", ")}`);
        }
        // Builders
        const includeLines = buildIncludeLines(include, counts);
        const selectLines = buildSelectLines(select);
        const omitLines = buildOmitLines(omit);
        const dataMapLines = (fields.length ? fields : ["name", "email", "isActive"]).map((f) => `            '${f}' => $data->${f} ?? ${f === "isActive" ? "true" : "null"},`);
        // PHP (enabled)
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
        // HTML (same as before)
        const html = [
            "<!-- Plain HTML form; use any component lib. -->",
            `<form onsubmit="submit${Model}(event)" style="display:grid;gap:8px;max-width:560px">`,
            ...(fields.length
                ? fields.map((f) => `  <label><div>${f}</div><input value="{{ form.${f} ?? '' }}" oninput="patchForm({ ${f}: this.value })" /></label>`)
                : [
                    `  <label><div>name</div><input value="{{ form.name ?? '' }}" oninput="patchForm({ name: this.value })" /></label>`,
                    `  <label><div>email</div><input type="email" value="{{ form.email ?? '' }}" oninput="patchForm({ email: this.value })" /></label>`,
                    `  <label style="display:flex;gap:.5rem;align-items:center"><input type="checkbox" onchange="patchForm({ isActive: !!this.checked })" checked="{{ !!form.isActive }}" /><span>isActive</span></label>`,
                ]),
            `  <div style="display:flex;gap:.5rem;align-items:center">`,
            `    <button type="submit" disabled="{{ saving }}">{{ saving ? 'Saving…' : 'Save' }}</button>`,
            `    <span class="error" pp-if="Object.keys(errors).length">Check errors</span>`,
            `  </div>`,
            `</form>`,
        ].join("\n");
        // JS (fix: do NOT use form.value; objects are reactive directly)
        const defaultFormObj = fields.length
            ? `{ ${fields.map((f) => `${f}: ''`).join(", ")} }`
            : `{ name: '', email: '', isActive: true }`;
        const js = [
            "<script>",
            `// Place this <script> at the bottom of the page.`,
            `const [${plural}, set${Model}s] = pphp.state([]);`,
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
            `    const { response } = await pphp.fetchFunction('${fnName}', form);`,
            `    setSaving(false);`,
            `    if (!response?.ok) { if (response?.errors) setErrors(response.errors); return; }`,
            `    if (response?.row) set${Model}s(prev => [response.row, ...prev]);`,
            `  } catch (err) { setSaving(false); alert('Save failed'); }`,
            `}`,
            "</script>",
        ].join("\n");
        const notes = [
            "• Order: PHP at top → HTML → JS <script> at the very bottom.",
            "• Objects/arrays are reactive directly — do NOT use `.value` on `form`.",
            "• Do not mix `select` and `include` in the same Prisma call.",
            `• Aliases: create ⇄ ${aliases.create}, createMany ⇄ ${aliases.createMany}, upsert ⇄ ${aliases.upsert}.`,
        ].join("\n");
        const hints = {
            allowedRootKeys: Array.from(ROOT_KEYS_MAP[op]),
            methodAliases: aliases,
            warnings: [
                "Do not mix `select` and `include`.",
                "For upsert(), 'where' must be unique.",
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
            snippets: { php, html, js, notes },
            hints,
        };
        return okAsText(payload);
    });
}
//# sourceMappingURL=crudCreateGuide.js.map