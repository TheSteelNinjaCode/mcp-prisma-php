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

### Critical gotchas (front‑loaded)

- **Route creation**: Create **only `index.php`** unless a layout is explicitly requested.
- **Template expressions**: **Never** use `.value` in `{{ }}` — framework handles reactivity
- **Template usage**: `<template>` **only** for `pp-for` loops; use real elements for `pp-if`.
- **No computed**: `pphp.computed` **does not exist** — derive with `pphp.effect`.
- **Keys**: Never key by index in `pp-for` — use a stable key like `item.id` (use `crypto.randomUUID()` for client‑side items).
- **Select values**: DOM `<option>` values are **strings** — compare with `roleId === String(role.id)`.
- **XML attrs**: Boolean attributes need values (`disabled="true"`), not bare `disabled`.
- **.value usage**: Use `.value` for **operations** (`text.value.trim()`, `todos.value.filter()`, `{...form.value}`); direct properties don’t (`user.name`).
- **Styling**: If Tailwind enabled, prefer **classes** over `pp-bind-style`. If disabled, use `pp-bind-style` with **CSS strings**.

> When answers depend on workspace state, **show the MCP outputs you used** (short).

---

## 1) Project detection & config

- Run **`pphp.detectProject`** → must be `true` before continuing.
- Use **`pphp.config.get`** for precise flags/paths. Honor at least:
  - **`backendOnly`**: if not `true`, default to **page routes** (`index.php`); **do not** propose `route.php` unless asked.
  - **`tailwindcss`**: `true` → Tailwind v4 classes; `false`/missing → plain CSS/inline styles.
  - **`prisma`**: gates usage of Prisma ORM and related tools.

**Decision helper (reactive vs CRUD/server):**

- **Single route creation** → `app/X/index.php` only (no layout).
- **Render‑only / local state** → stay client‑reactive, no server calls.
- **Needs DB / persistence / server validation** → use MCP **CRUD guides** to scaffold server flow. Only create `route.php` when `backendOnly: true` or explicitly requested. Use `pphp.prisma.prepare` before ORM actions if needed.

Helpful lookups: `pphp.listRoutes`, `pphp.listComponents`. Database helper: `pphp.prisma.prepare` (validates env, migrates, generates).

---

## 2) File structure & routing

### 2.1 Page file order & XML rules

- **File order:** PHP (imports + server data) → HTML → **one `<script>` at the bottom**.
- **Attributes (XML/XHTML):** every attribute **must have an explicit value** — e.g. `readonly="true"`, `disabled="true"`, `selected="true"`.

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
  // reactive state, handlers, effects (export functions used in markup)
</script>
```

### 2.2 Route conventions (enhanced — prevent over‑scaffolding)

**Single route creation (default):**

- When the user says “create a route named X” → create **ONLY** `app/X/index.php`.
- **Do NOT** create `layout.php` unless explicitly requested.

**A folder is a segment:**

- `app/dashboard/index.php` → route `/dashboard`
- `app/dashboard/users/index.php` → route `/dashboard/users`

**Layout creation rules (strict):**

- **Only create `layout.php` when:**
  - The user explicitly requests “create a layout for X”
  - The user asks to “scaffold” or “generate dashboard/admin area”
  - The user mentions “shared UI” or “common components” for a segment
- **Never create `layout.php` by default** when creating individual routes.

**Examples:**

```markdown
✅ "Create a route named todo" → `app/todo/index.php` only
✅ "Create todo route with layout" → `app/todo/index.php` + `app/todo/layout.php`
✅ "Scaffold dashboard area" → may include layouts
❌ Auto‑creating layout.php without explicit request
```

**Backend handlers `route.php`** are created **only** if `backendOnly: true` or explicitly requested.

### 2.3 Verify routes

After creating folders/files, run `pphp.listRoutes` and ensure each route folder has **`index.php`**.

### 2.4 Architecture patterns (reactive vs CRUD)

- **Reactive‑only page**: read data via PHP at top, render, and manage UI with client state. **No custom fetches.**
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

### 3.2 `.value` policy (**AI frequently gets this wrong**)

### 3.2 `.value` policy (**AI frequently gets this wrong**)

**Critical separation**: **HTML templates** vs **JavaScript**.

#### **HTML Template Expressions: NEVER use `.value`**

Templates automatically handle reactive access.

```html
<!-- ✅ Correct: No .value in templates -->
{{ user.name }} {{ todos.length }} {{ todos.filter(t => t.done).length }} {{
count + 1 }} {{ status === 'loading' }}

<!-- ❌ Wrong: .value in templates -->
{{ user.value.name }}
<!-- ❌ Never -->
{{ todos.value.length }}
<!-- ❌ Never -->
{{ count.value + 1 }}
<!-- ❌ Never -->
```

#### **JavaScript `<script>`: Use `.value` for operations**

**Always use `.value` for:**

- **Primitives in expressions**: `count.value + 1`, `text.value.trim()`, `!isOpen.value`
- **Array/object operations**: `todos.value.filter()`, `users.value.length`, `{...form.value}`
- **Comparisons with primitives**: `status.value === 'loading'`
- **Function parameters**: `setText(input.value)`

**Direct property access (no `.value`):**

- **Object properties**: `user.name`, `todo.text`, `form.email`

**Memory aid**

- **HTML templates** (`{{ }}`): framework handles reactivity → **No `.value`**
- **JavaScript operations**: manual reactive access → **Use `.value`**

**Examples (correct vs wrong)**

✅ **Correct**

```js
if (!newTodo.value.trim()) return;
setCount(count.value + 1);
setTodos([...todos.value, newItem]);
setTodos(todos.value.filter((t) => t.id !== id));
const payload = { ...userForm.value, extra: true };
```

❌ **Wrong**

```js
if (!newTodo.trim()) return;        // newTodo is a function
setCount(count + 1);                // count is a function
setTodos([...todos, newItem]);      // todos is a function
setTodos(todos.filter(t => ...));   // todos is a function
const payload = { ...userForm, extra }; // userForm is a function
```

**Usage Rules Summary**

| Context            | Rule          | Example                |
| ------------------ | ------------- | ---------------------- |
| HTML Templates     | Never .value  | `{{ todos.length }}`   |
| JS Operations      | Use .value    | `todos.value.filter()` |
| JS Property Access | No .value     | `user.name`            |
| JS Primitives      | Always .value | `count.value + 1`      |

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

### 3.7 Template vs Element usage (**AI gets this wrong**)

**Critical rule**: `<template>` is **ONLY** for `pp-for` loops, not conditionals.

**Correct usage:**

```html
<!-- ✅ Use <template> for loops ONLY -->
<template pp-for="todo in todos">
  <li key="{{ todo.id }}">{{ todo.text }}</li>
</template>

<!-- ✅ Use actual HTML elements for conditionals -->
<div pp-if="isEditing" class="flex gap-2">
  <input type="text" />
  <button>Save</button>
</div>
<span pp-else>{{ todo.text }}</span>
```

**Wrong usage:**

```html
<!-- ❌ Never use <template> with pp-if -->
<template pp-if="condition">
  <div>Content</div>
</template>
```

**Why**: `pp-if` controls visibility via `hidden` attribute; `<template>` is for loop templating only.

**Correct search example (derived state, no computed):**

```html
<input
  type="text"
  pp-bind-value="search"
  oninput="setSearch(this.value)"
  placeholder="Search todos..."
/>

<template pp-for="todo in filteredTodos">
  <li key="{{ todo.id }}">{{ todo.text }}</li>
</template>

<script>
  const [todos, setTodos] = pphp.state([
    { id: crypto.randomUUID(), text: "Learn Prisma PHP" },
  ]);
  const [search, setSearch] = pphp.state("");
  const [filteredTodos, setFilteredTodos] = pphp.state([]);

  // ✅ Use effect for derived state (no pphp.computed)
  pphp.effect(() => {
    const q = search.value.trim().toLowerCase();
    setFilteredTodos(
      q
        ? todos.value.filter((t) => t.text.toLowerCase().includes(q))
        : todos.value
    );
  }, [search, todos]);
</script>
```

---

## 4) Components & icons

- **Import placement:** `use ...;` at the very **top** of PHP files.
- **Tag syntax only** in markup (`<Plus />`), never manual PHP instantiation.
- **Availability workflow:** `pphp.listComponents` → install if missing with `pphp.component.addPPIcon` / `pphp.component.addPHPXUI` → verify again → then import & use.

---

## 5) Styling & UI (enhanced)

### 5.1 Tailwind vs Style Decision (**AI gets this wrong**)

**Check config first**: Read `tailwindcss` flag to determine approach.

**When `tailwindcss: true` (Tailwind enabled):** Prefer **class binding** over `pp-bind-style`.

```html
<!-- ✅ Use Tailwind classes -->
<span
  class="text-lg {{ todo.done ? 'line-through text-gray-400' : 'text-gray-900' }}"
>
  {{ todo.text }}
</span>

<!-- ❌ Avoid style when Tailwind available -->
<span pp-bind-style="todo.done ? 'text-decoration: line-through;' : ''"></span>
```

**When `tailwindcss: false` or missing:** Use `pp-bind-style` with **CSS string syntax**.

```html
<!-- ✅ CSS string syntax -->
<span
  pp-bind-style="todo.done ? 'text-decoration: line-through; color: #9ca3af;' : ''"
>
  {{ todo.text }}
</span>

<!-- ❌ Wrong: object syntax -->
<span
  pp-bind-style="{ textDecoration: todo.done ? 'line-through' : 'none' }"
></span>
```

### 5.2 Style Syntax Rules

When `pp-bind-style` is needed:

- Use **CSS string** format: `'property: value; property2: value2;'`
- **Not** JavaScript object format: `{ property: value }`
- End with semicolons when multiple properties are set

**Examples:**

```html
<!-- ✅ CSS string -->
pp-bind-style="isActive ? 'background-color: blue; color: white;' :
'background-color: gray;'"
<!-- ❌ Object -->
pp-bind-style="{ backgroundColor: isActive ? 'blue' : 'gray', color: 'white' }"
```

### 5.3 Styling decision flow

1. **Check config**: `tailwindcss: true`?
2. **Yes** → Use **Tailwind class** binding
3. **No** → Use **`pp-bind-style`** with CSS strings
4. **Attribute merging**: use **`pp-bind-spread`** when many props/events come from an object

---

## 6) Server communication patterns & anti‑patterns

**Do:** Use MCP **CRUD guides** for server work; create `route.php` only when allowed; leverage Prisma via tools when enabled.

**Don’t:**

- Don’t write ad‑hoc `fetch`/XHR to arbitrary URLs; follow the **CRUD guide** patterns.
- Don’t assume Tailwind exists; **read config first**.
- Don’t emit `<html>/<head>/<body>`; root layout handles that.
- Don’t forget to **export** handlers called from markup.

**Useful APIs:**

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
