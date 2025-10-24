import { z } from "zod";
import { ucfirst, lcfirstWord, toPlural, ensureAllowedKeys, buildIncludeLines, buildSelectLines, buildOmitLines, METHOD_ALIASES, } from "../utils/utils.js";
/**
 * DELETE tool:
 * Two sections:
 *   1) backend (Prisma PHP model approach)
 *   2) frontend (Todo-style inline delete + confirm)
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
    server.registerTool("pp.crud.deleteGuide", {
        title: "Generate DELETE pattern (backend + frontend template, separated)",
        description: "Outputs two sections: (1) Backend model approach (Prisma PHP) and (2) Frontend-only Todo inline delete. Backend omitted if prisma=false.",
        inputSchema: InputShape,
    }, async (args) => {
        const parsed = InputObject.safeParse(args);
        if (!parsed.success)
            return err(`Invalid input: ${parsed.error.message}`);
        const prismaEnabled = ctx.CONFIG?.prisma === true;
        const { model, op = "delete", whereUniqueKey = "id", include = [], counts = [], select = [], omit = [], handlerName, stateName, confirmMessage = "Are you sure you want to delete this item?", } = parsed.data;
        const Model = ucfirst(model.trim());
        const modelProp = lcfirstWord(model);
        const plural = (stateName && stateName.trim()) || toPlural(modelProp);
        const fnName = handlerName ||
            (op === "delete" ? `delete${Model}` : `deleteMany${Model}`);
        const aliases = METHOD_ALIASES(Model);
        // ---------- BACKEND ----------
        let backend = {
            disabled: true,
            message: "Prisma is disabled (prisma=false). Backend snippet omitted.",
        };
        if (prismaEnabled) {
            if (include.length && select.length)
                return err("You may not use both `select` and `include`.");
            const wants = ["where"];
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
                "<!-- Backend • Model approach (Delete) -->",
                `<button type="button" onclick="() => requestDeleteById(row.${whereUniqueKey})" class="text-red-600">Delete</button>`,
            ].join("\n");
            const js = [
                "<script>",
                `const [${plural}, set${Model}s] = pp.state([]);`,
                `const [deleting, setDeleting] = pp.state(false);`,
                `async function requestDeleteById(id) {`,
                `  if (!id) return;`,
                `  if (!confirm(${JSON.stringify(confirmMessage)})) return;`,
                `  setDeleting(true);`,
                `  try {`,
                `    const { response } = await pp.fetchFunction('${fnName}', { ${whereUniqueKey}: id });`,
                `    if (!response?.ok) { alert(response?.message || 'Delete failed'); setDeleting(false); return; }`,
                `    set${Model}s(prev => prev.filter(r => String(r.${whereUniqueKey}) !== String(id)));`,
                `  } catch (err) { alert('Delete failed'); }`,
                `  finally { setDeleting(false); }`,
                `}`,
                "</script>",
            ].join("\n");
            backend = { php, html, js };
        }
        // ---------- FRONTEND (Todo-style inline delete) ----------
        const feHtml = [
            `<!-- Delete (frontend-only) -->`,
            `<div class="max-w-md mx-auto mt-8 p-4 bg-white rounded shadow">`,
            `  <h2 class="text-xl font-bold mb-4">Delete item</h2>`,
            `  <ul>`,
            `    <template pp-for="row in items">`,
            `      <li key="{row.id}" class="flex items-center gap-2 mb-2">`,
            `        <span class="flex-1">{row.name}</span>`,
            `        <button onclick="removeRow(row.id)" class="text-red-600 hover:underline">Delete</button>`,
            `      </li>`,
            `    </template>`,
            `  </ul>`,
            `</div>`,
        ].join("\n");
        const feJs = [
            "<script>",
            `const [items, setItems] = pp.state([{ id: crypto.randomUUID?.() || 1, name: "Delete me", isActive: true }]);`,
            `function removeRow(id) {`,
            `  if (!confirm(${JSON.stringify(confirmMessage)})) return;`,
            `  setItems(items.filter(r => String(r.id) !== String(id)));`,
            `  // For API later: DELETE /api/items/:id then reconcile`,
            `}`,
            "</script>",
        ].join("\n");
        const notes = [
            prismaEnabled
                ? "Both sections included: backend (Prisma) + frontend reference (Todo-style)."
                : "Prisma is disabled → backend omitted; use the frontend Todo-style section.",
            "deleteMany(): returns only { count }.",
        ];
        const hints = {
            allowedRootKeys: Array.from(ROOT_KEYS_MAP[op]),
            methodAliases: aliases,
            warnings: [
                "Do not mix `select` and `include`.",
                "delete(): requires unique 'where'.",
            ],
        };
        const payload = {
            meta: {
                model: modelProp,
                op,
                handlerName: fnName,
                pluralState: plural,
                whereUniqueKey,
                confirmMessage,
                prismaEnabled,
            },
            snippets: { backend, frontend: { html: feHtml, js: feJs }, notes },
            hints,
        };
        return okAsText(payload);
    });
}
//# sourceMappingURL=crudDeleteGuide.js.map