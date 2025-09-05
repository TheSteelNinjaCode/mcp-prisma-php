import { z } from "zod";
/**
 * Generic DELETE scaffolding for Prisma PHP + local Reactivity (UI-agnostic).
 * Returns TEXT (pretty JSON):
 * {
 *   meta: { model, op, handlerName, pluralState, whereUniqueKey, confirmMessage },
 *   snippets: { php, html, js, notes },
 *   hints: { allowedRootKeys, methodAliases, warnings }
 * }
 */
const ROOT_KEYS_MAP = {
    delete: ["where", "include", "omit", "select"],
    deleteMany: ["where"],
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
function lcfirstWord(s) {
    if (!s)
        return s ?? "";
    return (s?.[0]?.toLowerCase() ?? "") + s.slice(1);
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
    /** Base model name (any casing). We'll normalize for $prisma access. */
    model: z.string().min(1),
    /** DELETE operation */
    op: z.enum(["delete", "deleteMany"]).default("delete"),
    /** Unique where key for delete(); default "id" */
    whereUniqueKey: z.string().default("id"),
    /** Relations to include (e.g., ["userRole","userPermission"]) */
    include: z.array(z.string()).optional(),
    /** _count.select relations inside include */
    counts: z.array(z.string()).optional(),
    /** `select` fields (mutually exclusive with `include`) */
    select: z.array(z.string()).optional(),
    /** Fields to omit from payload (e.g., ["password"]) */
    omit: z.array(z.string()).optional(),
    /** Optional handler name. Default: delete<Model> / deleteMany<Model> */
    handlerName: z.string().optional(),
    /** Optional plural local state name for the list (defaults to naive plural). */
    stateName: z.string().optional(),
    /** Confirm message text for the JS confirm dialog */
    confirmMessage: z
        .string()
        .default("Are you sure you want to delete this item?"),
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
export function registerCrudDeleteGuide(server, _ctx) {
    server.registerTool("pphp.crud.deleteGuide", {
        title: "Generate DELETE pattern (Prisma PHP + local state, generic)",
        description: "UI-agnostic Prisma PHP DELETE scaffolding: PHP handler + plain HTML button/form + JS (state). Script goes at the bottom.",
        inputSchema: InputShape,
    }, async (args) => {
        const parsed = InputObject.safeParse(args);
        if (!parsed.success)
            return err(`Invalid input: ${parsed.error.message}`);
        const { model, op = "delete", whereUniqueKey = "id", include = [], counts = [], select = [], omit = [], handlerName, stateName, confirmMessage = "Are you sure you want to delete this item?", } = parsed.data;
        if (include.length && select.length) {
            return err("You may not use both `select` and `include` in the same query.");
        }
        // Validate desired keys against op
        const wants = [];
        if (op === "delete") {
            wants.push("where");
            if (select.length)
                wants.push("select");
            if (include.length || counts.length)
                wants.push("include");
            if (omit.length)
                wants.push("omit");
        }
        else {
            wants.push("where");
        }
        const { bad } = ensureAllowedKeys(op, wants);
        if (bad.length) {
            return err(`The following keys are not allowed for ${op}(): ${bad.join(", ")}.\n` +
                `Allowed keys: ${ROOT_KEYS_MAP[op].join(", ")}`);
        }
        // naming
        const Pascal = ucfirst(model.trim());
        const modelProp = lcfirstWord(Pascal); // ✅ lowerCamel for $prisma access
        const plural = (stateName && stateName.trim()) || toPlural(modelProp);
        const Model = Pascal;
        const fnName = handlerName ||
            (op === "delete" ? `delete${Model}` : `deleteMany${Model}`);
        const aliases = METHOD_ALIASES(Pascal);
        const includeLines = buildIncludeLines(include, counts);
        const selectLines = buildSelectLines(select);
        const omitLines = buildOmitLines(omit);
        /* ---------- PHP (top) ---------- */
        const php = op === "delete"
            ? [
                "<?php",
                "use Lib\\Prisma\\Classes\\Prisma;",
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
                "",
                `        $res = $prisma->${modelProp}->deleteMany([`,
                "            'where' => $where,",
                "        ]);",
                "        return ['ok' => true, 'count' => ($res->count ?? null)];",
                "    } catch (Throwable $e) {",
                "        return ['ok' => false, 'message' => ($e->getMessage() ?: 'DeleteMany failed.')];",
                "    }",
                "}",
                "?>",
            ].join("\n");
        /* ---------- HTML (middle) ---------- */
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
        /* ---------- JS (bottom; wrap in <script>) ---------- */
        const js = [
            "<script>",
            "// Place this <script> block at the very bottom of the page.",
            `const [${plural}, set${Model}s] = pphp.state([]); // local list; switch to pphp.share later if you need cross-file sharing`,
            `const [deleting, setDeleting] = pphp.state(false);`,
            "",
            `export async function requestDeleteById(id) {`,
            `  if (!id) return;`,
            `  if (!confirm(${JSON.stringify(confirmMessage)})) return;`,
            `  await doDeleteById(id);`,
            `}`,
            "",
            `export async function submitDeleteForm(e) {`,
            `  e?.preventDefault?.();`,
            `  const fd = new FormData(e.target);`,
            `  const id = fd.get('${whereUniqueKey}') ?? '';`,
            `  if (!id) return;`,
            `  if (!confirm(${JSON.stringify(confirmMessage)})) return;`,
            `  await doDeleteById(id);`,
            `}`,
            "",
            `async function doDeleteById(id) {`,
            `  setDeleting(true);`,
            `  try {`,
            `    const { response } = await pphp.fetchFunction('${fnName}', { ${whereUniqueKey}: id });`,
            `    setDeleting(false);`,
            `    if (!response?.ok) {`,
            `      alert(response?.message || 'Delete failed');`,
            `      return;`,
            `    }`,
            `    // remove from local list if present`,
            `    set${Model}s(prev => prev.filter(r => String(r.${whereUniqueKey}) !== String(id)));`,
            `  } catch (err) {`,
            `    setDeleting(false);`,
            `    alert('Delete failed');`,
            `  }`,
            `}`,
            "",
            `// For deleteMany, call pphp.fetchFunction('${op === "deleteMany" ? fnName : "deleteMany" + Model}', { where: {/* ... */} })`,
            `// and then either re-fetch or reconcile the local list accordingly.`,
            "</script>",
        ].join("\n");
        const notes = [
            "• Order: PHP at the top, HTML in the middle, JS <script> at the very bottom.",
            "• Local-first: uses pphp.state by default; convert to pphp.share later if cross-file sharing is needed.",
            "• $prisma access uses lowerCamel model name: e.g., $prisma->userRole->delete([...]).",
            "• Do not mix `select` and `include` in the same Prisma call.",
            "• delete() requires a unique 'where' key. deleteMany() accepts an optional 'where' filter and returns { count }.",
            "• You can add 'omit' to strip sensitive fields from the returned row.",
            `• Aliases: delete ⇄ ${aliases.delete}, deleteMany ⇄ ${aliases.deleteMany}.`,
        ].join("\n");
        const hints = {
            allowedRootKeys: Array.from(ROOT_KEYS_MAP[op]),
            methodAliases: aliases,
            warnings: [
                "Do not mix `select` and `include`.",
                "delete(): requires a unique 'where' key (default 'id').",
                "deleteMany(): returns count; you should re-fetch or reconcile the list locally.",
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
            },
            snippets: { php, html, js, notes },
            hints,
        };
        return okAsText(payload);
    });
}
//# sourceMappingURL=crudDeleteGuide.js.map