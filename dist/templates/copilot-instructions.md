# Prisma PHP • AI Brief (workspace rules)

**Use the MCP server `prisma-php` for project facts before answering.**  
_MCP = a local tool server exposing project-aware commands. Prefer tools over guessing._

---

## 0) Quick Start (AI reading priority)

1. **Detect & read config first**
   - `pphp.detectProject` must be **true**.
   - `pphp.config.get` → read flags: `tailwindcss`, `backendOnly`, `prisma`.
2. **File order**: **PHP imports/data → HTML markup → one `<script>` block at the very bottom**.
3. **Components**: verify with `pphp.listComponents`; if missing, install via `pphp.component.addPPIcon` / `pphp.component.addPHPXUI`.
4. **Two‑way binding**: `<input pp-bind-value="v" oninput="setV(this.value)" />` + `const [v, setV] = pphp.state("")`.
5. **Styling toggle**: if `tailwindcss: true` → use **Tailwind v4** utilities; otherwise **no Tailwind** (use classes/CSS/inline).
6. **Architecture choice (quick)**: Render‑only? → stay **reactive**. Needs DB/server? → use **MCP CRUD guides** and/or `route.php` **only** when allowed.
7. **Exports**: Any function referenced from markup **must be `export`ed** in the bottom `<script>`.

### Quick patterns (one‑liners)

`{{ user.name }}` · `pp-if="open"` · `pp-for="item in items"` · `pp-bind-style="expr"`

> ⚠️ **Critical gotchas:**  
> • Never key by index in `pp-for` — use a stable key like `item.id`.  
> • DOM `<option>` values are strings — compare with `roleId === String(role.id)`.  
> • In XML/XHTML, boolean attrs need values (`disabled="true"`), not bare `disabled`.

When answers depend on workspace state, **show the MCP outputs you used** (short).

---

## 1) Project detection & config

- Run **`pphp.detectProject`** → must be `true` before continuing.
- Use **`pphp.config.get`** for precise flags/paths. Honor at least:
  - **`backendOnly`**: if not `true`, default to **page routes** (`index.php`); **do not** propose `route.php` unless asked.
  - **`tailwindcss`**: `true` → Tailwind v4 classes; `false`/missing → plain CSS/inline styles.
  - **`prisma`**: gates usage of Prisma ORM and related tools.

**Decision helper (reactive vs CRUD/server):**

- **Render‑only / local state** → stay client‑reactive, no server calls.
- **Needs DB / persistence / server validation** → use MCP **CRUD guides** to scaffold server flow. Only create `route.php` when `backendOnly: true` or explicitly requested. Use `pphp.prisma.prepare` before ORM actions if needed.

Helpful lookups: `pphp.listRoutes`, `pphp.listComponents`. Database helper: `pphp.prisma.prepare` (validates env, migrates, generates).

---

## 2) File structure & routing

### 2.1 Page file order & XML rules

- **File order:** PHP (imports + server data) → HTML → **one `<script>` at the bottom**.
- **Attributes (XML/XHTML):** every attribute **must have an explicit value** — e.g. `readonly="true"`, `disabled="true"`, `selected="true"` (avoid bare boolean attrs).

```php
<?php
// PHP imports + server data
use Lib\Something\ClassName;
$data = ...;
?>

<!-- HTML markup -->
<input value="{{ form.id ?? '' }}" readonly="true" />

<!-- JS last -->
<script>
  // reactive state, handlers, effects
</script>
```

### 2.2 Route conventions

- A folder is a **segment**:
  - `app/dashboard/index.php` → route `/dashboard`
  - `app/dashboard/layout.php` → **layout for that segment** (not a route)
  - `app/dashboard/users/index.php` → route `/dashboard/users`
- Create `layout.php` **only** when you need shared UI for a segment.
- Backend handlers `route.php` are created **only** if `backendOnly: true` or explicitly requested.

### 2.3 Verify routes

After creating folders/files, run `pphp.listRoutes` and ensure each route folder has **`index.php`**.

### 2.4 Architecture patterns (reactive vs CRUD)

- **Reactive‑only page**: read data via PHP at top, render, and manage UI with client state. No custom fetches.
- **CRUD flow**: use MCP **CRUD guides** to generate/guide server endpoints and client hooks:
  - `pphp.crud.createGuide` / `readGuide` / `updateGuide` / `deleteGuide`
  - Prefer generated patterns over ad‑hoc `fetch`; only use `route.php` when permitted by config/request.

---

## 3) State & reactivity (consolidated)

### 3.1 Two‑way binding (canonical)

```html
<input type="text" pp-bind-value="text" oninput="setText(this.value)" />
<input
  type="checkbox"
  pp-bind-checked="done"
  onchange="setDone(this.checked)"
/>
<script>
  const [text, setText] = pphp.state("");
  const [done, setDone] = pphp.state(false);
</script>
```

### 3.2 `.value` policy (with examples)

- **Use `.value` for primitives** (string/number/boolean): `count.value`, `open.value`.
- **Objects/arrays are reactive directly** for property access (`user.name`, `todo.items.length`).
- Use `.value` on objects/arrays **only when a plain snapshot is required**:
  - **Spread/merge**: `const payload = { ...userForm.value, ...extra };`
  - **Serialize**: `JSON.stringify(userForm.value)`
  - **Structural compare**: `deepEqual(prevUser, user.value)`
  - **Cross‑boundary** (send via `fetch`, events): pass `userForm.value`
- **Do not** use `.value` for normal property reads: `userForm.name` ✅

### 3.3 Selects inside `pp-for` (type coercion)

DOM option values are strings. Normalize ids for reliable comparisons.

```html
<select name="roleId" onchange="setRoleId(this.value)">
  <option value="" pp-bind-selected="roleId === ''">All</option>
  <template pp-for="role in userRoles">
    <option
      pp-bind-value="role.id"
      pp-bind-selected="roleId === String(role.id)"
    >
      {{ role.name }}
    </option>
  </template>
</select>
<script>
  const [roleId, setRoleId] = pphp.state(""); // store as string
</script>
```

### 3.4 Effects & immutable updates

```js
pphp.effect(() => {
  /* on deps change */
}, [dep]);
setTodos([...todos, next]); // arrays
setUser({ ...user, name: "New" }); // objects
```

### 3.5 Lists & identity (enhanced)

- **Stable keys only** (prefer string ids); **never** key by index.
- DB items: use `item.id` (coerce in compares: `item.id === String(selectedId)`).
- Client‑side items: generate ids with `crypto.randomUUID()` once at creation.

```html
<template pp-for="todo in todos">
  <li key="{{ todo.id }}">{{ todo.text }}</li>
</template>
<script>
  const [todos, setTodos] = pphp.state([
    { id: crypto.randomUUID(), text: "First" },
  ]);
</script>
```

### 3.6 Function exports (DOM interaction)

Any function called from markup **must be exported** from the bottom `<script>`.

```html
<button onclick="save()">Save</button>
<script>
  export function save() {
    /* ... */
  }
</script>
```

**Wrong:** omitting `export` causes runtime lookup failures.

---

## 4) Components & icons

- **Import placement:** `use ...;` at the very **top** of PHP files.
- **Tag syntax only** in markup (`<Plus />`), never manual PHP instantiation.
- **Availability workflow:** `pphp.listComponents` → install if missing with `pphp.component.addPPIcon` / `pphp.component.addPHPXUI` → verify again → then import & use.

---

## 5) Styling & UI

- **Tailwind toggle (config‑driven):**
  - `tailwindcss: true` → author with **Tailwind v4** utilities.
  - Otherwise → **no Tailwind**; use project CSS classes or inline styles.
- **Dynamic styles:** prefer classes; when needed, use `pp-bind-style="expr"`.
- **Attribute merging:** use `pp-bind-spread` when many props/events come from an object.

---

## 6) Server communication patterns & anti‑patterns

**Do:** Use MCP **CRUD guides** for server work; create `route.php` only when allowed; leverage Prisma via tools when enabled.

- **Redirects & params:** `use Lib\Request;` then `Request::redirect('/path')`, `Request::$dynamicParams`, `Request::$params`.
- **Element refs:** `pp-ref="key"` then `pphp.ref('key'[, index])` for imperative focus/measure/scroll.

---

## 7) MCP tools reference (grouped)

| Group             | Tool                                                                                             | Purpose                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **Project**       | `pphp.detectProject`                                                                             | Confirm Prisma PHP workspace.                                     |
| **Config/Routes** | `pphp.config.get`, `pphp.config.describe`, `pphp.listRoutes`                                     | Read flags/paths; list all routes.                                |
| **Components**    | `pphp.listComponents`, `pphp.component.addPPIcon`, `pphp.component.addPHPXUI`                    | Verify/install icons & PHPXUI components.                         |
| **ORM/DB**        | `pphp.prisma.prepare`, `pphp.prisma.generate`                                                    | Prepare DB (env + migrate + generate) / regenerate Prisma client. |
| **Scaffold**      | `pphp.scaffoldDashboard`                                                                         | Scaffold dashboard UI honoring config toggles.                    |
| **CRUD Guides**   | `pphp.crud.createGuide`, `pphp.crud.readGuide`, `pphp.crud.updateGuide`, `pphp.crud.deleteGuide` | Task‑focused guidance.                                            |
| **Admin/Scripts** | `pphp.npm.script`, `pphp.updateFilterFiles`, `pphp.project.update`, `pphp.generateSwaggerDocs`   | Package scripts, filters, project update, Swagger docs.           |

---

## Answering style (one box)

- Be concise and **tool‑grounded**. Always read config first.
- If you use components/routes/config/ORM, **call the corresponding MCP tool** and show short outputs.
- Follow **file order** and **Tailwind toggle** rules.
- Export handlers referenced by markup. Close all tags. Use stable keys and normalized id comparisons.
- Runtime API: use public `pphp.*` methods as needed (state/share/effect/ref/fetch/redirect/sync).

---

### End of brief
