import { z } from "zod";
import { ucfirst, lcfirstWord, toPlural, ensureAllowedKeys, buildIncludeLines, buildSelectLines, buildOmitLines, METHOD_ALIASES, } from "../utils/utils.js";
/**
 * Generic DELETE scaffolding.
 * Auto-switches to front-end-only if prisma is disabled.
 */
const ROOT_KEYS_MAP = {
    delete: ["where", "include", "omit", "select"],
    deleteMany: ["where"],
};
const InputShape = {
    model: z.string().min(1),
    op: z.enum(["delete", "deleteMany"]).default("delete"),
    whereUniqueKey: z.string().default("id"),
    include: z.array(z.string()).optional(),
    counts: z.array(z.string()).optional(),
    select: z.array(z.string()).optional(),
    omit: z.array(z.string()).optional(),
    handlerName: z.string().optional(),
    stateName: z.string().optional(),
    confirmMessage: z
        .string()
        .default("Are you sure you want to delete this item?"),
};
const InputObject = z.object(InputShape);
const err = (text) => ({
    isError: true,
    content: [{ type: "text", text }],
});
const okAsText = (obj) => ({
    content: [{ type: "text", text: JSON.stringify(obj, null, 2) }],
});
export function registerCrudDeleteGuide(server, ctx) {
    server.registerTool("pphp.crud.deleteGuide", {
        title: "Generate DELETE pattern (Prisma PHP + local state, generic)",
        description: "UI-agnostic Prisma PHP DELETE scaffolding (front-end-only when prisma disabled). Script goes at the bottom.",
        inputSchema: InputShape,
    }, async (args) => {
        const parsed = InputObject.safeParse(args);
        if (!parsed.success)
            return err(`Invalid input: ${parsed.error.message}`);
        const prismaEnabled = ctx.CONFIG?.prisma === true;
        const { model, op = "delete", whereUniqueKey = "id", include = [], counts = [], select = [], omit = [], handlerName, stateName, confirmMessage = "Are you sure you want to delete this item?", } = parsed.data;
        const Model = ucfirst(model.trim());
        const modelProp = lcfirstWord(model); // lowerCamel from original name
        const plural = (stateName && stateName.trim()) || toPlural(modelProp);
        const fnName = handlerName ||
            (op === "delete" ? `delete${Model}` : `deleteMany${Model}`);
        const aliases = METHOD_ALIASES(Model);
        if (!prismaEnabled) {
            const php = `<?php /* Prisma disabled → DELETE PHP skipped. */ ?>`;
            const html = [
                "<!-- Inline delete action (front-end only) -->",
                `<button type="button" onclick="() => requestDeleteById(row.${whereUniqueKey})">Delete</button>`,
                "",
                "<!-- Optional standalone form to delete by ID -->",
                `<form onsubmit="submitDeleteForm(event)" style="margin-top:8px;display:flex;gap:.5rem;align-items:center">`,
                `  <input name="${whereUniqueKey}" placeholder="${whereUniqueKey}" />`,
                `  <button type="submit" disabled="{{ deleting }}">{{ deleting ? 'Deleting…' : 'Delete' }}</button>`,
                `</form>`,
            ].join("\n");
            const js = [
                "<script>",
                "// Bottom of page (front-end-only).",
                `const [${plural}, set${Model}s] = pphp.state([]);`,
                `const [deleting, setDeleting] = pphp.state(false);`,
                `export async function requestDeleteById(id) { if (!id) return; if (!confirm(${JSON.stringify(confirmMessage)})) return; await doDeleteById(id); }`,
                `export async function submitDeleteForm(e) { e?.preventDefault?.(); const fd = new FormData(e.target); const id = fd.get('${whereUniqueKey}') ?? ''; if (!id) return; if (!confirm(${JSON.stringify(confirmMessage)})) return; await doDeleteById(id); }`,
                `async function doDeleteById(id) {`,
                `  setDeleting(true);`,
                `  try {`,
                `    // const res = await fetch('/api/${modelProp}/' + encodeURIComponent(id), { method: 'DELETE' });`,
                `    // const data = await res.json(); if (!data.ok) { alert(data.message || 'Delete failed'); setDeleting(false); return; }`,
                `    set${Model}s(prev => prev.filter(r => String(r.${whereUniqueKey}) !== String(id)));`,
                `    setDeleting(false);`,
                `  } catch (err) { setDeleting(false); alert('Delete failed'); }`,
                `}`,
                "</script>",
            ].join("\n");
            const notes = [
                "• Front-end-only mode: replace fetch() with your endpoint.",
                "• Arrays/objects are reactive directly; no `.value`.",
            ].join("\n");
            return okAsText({
                meta: {
                    model: modelProp,
                    op,
                    handlerName: fnName,
                    pluralState: plural,
                    whereUniqueKey,
                    confirmMessage,
                    prismaEnabled,
                },
                snippets: { php, html, js, notes },
                hints: {
                    methodAliases: aliases,
                    warnings: ["Backend delete skipped: prisma=false."],
                },
            });
        }
        // Prisma-enabled
        if (include.length && select.length)
            return err("You may not use both `select` and `include`.");
        const wants = op === "delete" ? ["where"] : ["where"];
        if (select.length && op === "delete")
            wants.push("select");
        if ((include.length || counts.length) && op === "delete")
            wants.push("include");
        if (omit.length && op === "delete")
            wants.push("omit");
        const { bad } = ensureAllowedKeys(ROOT_KEYS_MAP[op], wants);
        if (bad.length) {
            return err(`The following keys are not allowed for ${op}(): ${bad.join(", ")}.\nAllowed keys: ${ROOT_KEYS_MAP[op].join(", ")}`);
        }
        const includeLines = buildIncludeLines(include, counts);
        const selectLines = buildSelectLines(select);
        const omitLines = buildOmitLines(omit);
        const php = op === "delete"
            ? [
                "<?php",
                "use Lib\\Prisma\\Classes\\Prisma;",
                "",
                `function ${fnName}($data) {`,
                "    try {",
                "        $prisma = Prisma::getInstance();",
                `        $whereVal = $data->${whereUniqueKey} ?? null;`,
                `        if ($whereVal === null || $whereVal === '') return ['ok' => false, 'message' => 'Missing unique key: ${whereUniqueKey}.'];`,
                `        $row = $prisma->${modelProp}->delete([`,
                `            'where' => ['${whereUniqueKey}' => $whereVal],`,
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
                "        return ['ok' => true, 'row' => $row];",
                "    } catch (Throwable $e) {",
                "        return ['ok' => false, 'message' => ($e->getMessage() ?: 'Delete failed.')];",
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
                `        $res = $prisma->${modelProp}->deleteMany([ 'where' => $where ]);`,
                "        return ['ok' => true, 'count' => ($res->count ?? null)];",
                "    } catch (Throwable $e) {",
                "        return ['ok' => false, 'message' => ($e->getMessage() ?: 'DeleteMany failed.')];",
                "    }",
                "}",
                "?>",
            ].join("\n");
        const html = [
            "<!-- Inline delete action (pass current row to requestDelete) -->",
            `<button type="button" onclick="() => requestDeleteById(row.${whereUniqueKey})">Delete</button>`,
            "",
            "<!-- Optional standalone form to delete by ID -->",
            `<form onsubmit="submitDeleteForm(event)" style="margin-top:8px;display:flex;gap:.5rem;align-items:center">`,
            `  <input name="${whereUniqueKey}" placeholder="${whereUniqueKey}" />`,
            `  <button type="submit" disabled="{{ deleting }}">{{ deleting ? 'Deleting…' : 'Delete' }}</button>`,
            `</form>`,
        ].join("\n");
        const js = [
            "<script>",
            "// Place this <script> at the very bottom of the page.",
            `const [${plural}, set${Model}s] = pphp.state([]);`,
            `const [deleting, setDeleting] = pphp.state(false);`,
            `export async function requestDeleteById(id) { if (!id) return; if (!confirm(${JSON.stringify(confirmMessage)})) return; await doDeleteById(id); }`,
            `export async function submitDeleteForm(e) { e?.preventDefault?.(); const fd = new FormData(e.target); const id = fd.get('${whereUniqueKey}') ?? ''; if (!id) return; if (!confirm(${JSON.stringify(confirmMessage)})) return; await doDeleteById(id); }`,
            `async function doDeleteById(id) {`,
            `  setDeleting(true);`,
            `  try {`,
            `    const { response } = await pphp.fetchFunction('${fnName}', { ${whereUniqueKey}: id });`,
            `    setDeleting(false);`,
            `    if (!response?.ok) { alert(response?.message || 'Delete failed'); return; }`,
            `    set${Model}s(prev => prev.filter(r => String(r.${whereUniqueKey}) !== String(id)));`,
            `  } catch (err) { setDeleting(false); alert('Delete failed'); }`,
            `}`,
            "</script>",
        ].join("\n");
        const notes = [
            "• Order: PHP → HTML → JS.",
            "• Objects/arrays are reactive directly (no `.value`).",
            "• delete(): unique `where`; deleteMany(): returns count.",
        ].join("\n");
        const hints = {
            allowedRootKeys: Array.from(ROOT_KEYS_MAP[op]),
            methodAliases: aliases,
            warnings: [
                "Do not mix `select` and `include`.",
                "deleteMany(): re-fetch or reconcile locally.",
            ],
        };
        return okAsText({
            meta: {
                model: modelProp,
                op,
                handlerName: fnName,
                pluralState: plural,
                whereUniqueKey,
                confirmMessage,
                prismaEnabled,
            },
            snippets: { php, html, js, notes },
            hints,
        });
    });
}
//# sourceMappingURL=crudDeleteGuide.js.map