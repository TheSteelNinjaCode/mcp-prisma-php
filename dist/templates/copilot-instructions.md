# Prisma PHP • AI Brief (workspace rules)

**Always use the MCP server `prisma-php` for facts about this project before answering.**  
Prefer MCP tools over guessing or generic patterns.

---

## 🔑 Core rules (ordered)

1. **File order in page files (PHP → HTML → JS)**  
   In any `index.php` / `layout.php` (or component template):

   - **PHP** (imports + server data) at the very **top**.
   - **HTML** markup in the **middle**.
   - **A single `<script>` block at the very bottom**. Never place `<script>` before markup.

   **Skeleton**

   ```php
   <?php
   // 1) PHP (imports + server data)
   use Lib\Something\ClassName;
   $data = ...;
   ?>

   <!-- 2) HTML markup -->
   <div>...</div>

   <!-- 3) JS last -->
   <script>
     // reactive state, handlers, effects
   </script>
   ```

2. **Two-way binding (always use this form):**

   ```html
   <input type="text" pp-bind-value="myVar" oninput="setMyVar(this.value)" />
   <script>
     const [myVar, setMyVar] = pphp.state("");
   </script>
   ```

   **State values & `.value` usage**

   - Objects/arrays are reactive directly: access properties as `user.name` (no `.value` needed).
   - Use `.value` for **primitives** (string/number/boolean).
   - **Also** use `.value` on objects/arrays **when you need the raw/plain snapshot** (e.g., for **spread/merge**, **serialization**, **structural compare**, or **sending in requests**).
     - Example: building a payload →
       ```js
       const payload = { ...userForm.value, ...formObject };
       ```
     - Property access does **not** need `.value` → `userForm.name` ✅

3. **Styling mode (config-driven): Tailwind v4 or plain CSS**

   - **Before styling, read `prisma-php.json`** via MCP. If `tailwindcss: true` → author UI with **Tailwind CSS v4** utilities.  
     If `tailwindcss: false` or missing → **do not output Tailwind classes**; use **plain CSS** classes or **inline styles**.
   - Example (Tailwind on):
     ```html
     <button
       class="rounded-lg px-3 py-2 text-sm bg-primary text-primary-foreground"
     >
       Save
     </button>
     ```
   - Example (Tailwind off):
     ```html
     <button class="btn btn-primary">Save</button>
     <style>
       .btn {
         border-radius: 8px;
         padding: 0.5rem 0.75rem;
         font-size: 0.875rem;
       }
       .btn-primary {
         background: #3b82f6;
         color: #fff;
       }
     </style>
     ```

4. **Imports & components (PSR-4 + top-of-file imports):**  
   Composer must map classes to `src/` (PSR-4):

   ```json
   {
     "autoload": {
       "psr-4": {
         "": "src/"
       }
     }
   }
   ```

   Put all `use ...;` imports at the **top** of the PHP file. Use JSX-style tags:

   ```php
   <?php use Lib\PHPXUI\MyComponent; ?>
   <MyComponent />
   <MyComponent><p>hello</p></MyComponent>
   ```

5. **`pp-bind-spread`** — use it to merge many attributes/events from an object:

   ```html
   <img pp-bind-spread="imgProps" />
   <script>
     const [imgProps, setImgProps] = pphp.state({
       class: "icon icon-save cursor-pointer",
       style: "width:32px;height:32px;",
       title: "Save",
       disabled: false,
       src: "/icons/save.svg",
       alt: "Save",
     });
   </script>
   ```

6. **Dynamic styles:** always use `pp-bind-style` (avoid `style="{{ ... }}"` in PHP files).

   ```html
   <div
     pp-bind-style="isOpen ? 'opacity:1;transform:scale(1)' : 'opacity:0;transform:scale(.98)'"
   ></div>
   ```

7. **Redirects (server-side):** use `Request`:

   ```php
   <?php
     use Lib\Request;
     Request::redirect('/home');
   ?>
   ```

8. **Dynamic route params & request data:** via `Request` statics inside route handlers:
   ```php
   <?php
     use Lib\Request;
     $params = Request::$params;        // URL/search params (?q=...)
     $dyn    = Request::$dynamicParams; // Dynamic segments as assoc array
   ?>
   ```

---

## ❌ Wrong vs ✅ Correct (script placement)

**❌ Wrong (script before markup)**

```php
<?php
use Lib\Prisma\Classes\Prisma;
$prisma = Prisma::getInstance();
$roles = $prisma->userRole->findMany([]);
?>

<script>
const [roles, setRoles] = pphp.share(<?= json_encode($roles) ?>);
</script>

<div class="data-list">
  <template pp-for="role in roles">
    <article class="data-row">
      <div><strong>id:</strong> {{ role.id }}</div>
      <div><strong>name:</strong> {{ role.name }}</div>
    </article>
  </template>
</div>
```

**✅ Correct (PHP → HTML → JS)**

```php
<?php
use Lib\Prisma\Classes\Prisma;

$prisma = Prisma::getInstance();
$roles  = $prisma->userRole->findMany([]);
?>

<div class="data-list">
  <template pp-for="role in roles">
    <article class="data-row">
      <div><strong>id:</strong> {{ role.id }}</div>
      <div><strong>name:</strong> {{ role.name }}</div>
    </article>
  </template>
</div>

<script>
const [roles, setRoles] = pphp.share(<?= json_encode($roles) ?>);
</script>
```

---

## 0) Startup Checklist (run these first)

1. `pphp.detectProject` → must be `true` before continuing.
2. `pphp.config.describe` → keep the summary in mind (paths, flags, enabled modules).
3. `pphp.config.get` → read **specific toggles** you must honor **before generating code**:
   - `backendOnly` → if not `true`, default to **page routes** (`index.php`), avoid `route.php` unless asked.
   - `tailwindcss` → if `true`, emit **Tailwind v4** classes; if `false`/missing, use **plain CSS/inline styles**.
   - `prisma` → gates ORM usage and any Prisma tooling.
4. When needed, fetch more specifics:
   - Routes: `pphp.listRoutes`
   - Components: `pphp.listComponents`
5. If answers depend on project state, **show the tool outputs you used** (short, focused).

---

## 1) Project identity & markers

This is a **Prisma PHP** codebase with:

- PHPX / PHPXUI **class components**.
- Prisma-style ORM, Tailwind + shadcn tokens.
- DX via “PHPX Tag Support” + CLI tools.
- Common files: `phpxui.json`, `settings/prisma-schema.json`, `settings/files-list.json`, `settings/class-logs.json`, `composer.json`, `prisma/schema.prisma`, `prisma/seed.ts`.

**Import placement:** group all `use ...;` at the **very top** of the file (before any markup).

---

## 2) MCP tools (when to use what)

- `pphp.detectProject` — Sanity check that we’re in Prisma PHP.
- `pphp.config.describe` — High-level validated summary of prisma-php config.
- `pphp.config.get` — **Raw config for precise keys/paths (read `backendOnly`, `tailwindcss`, `prisma`)**.
- `pphp.listRoutes` — Source of truth for file-based routes.
- `pphp.listComponents` — Canonical component catalog (from `/settings/class-log.json`).
- `pphp.generateSwaggerDocs` — Runs the Swagger generator when enabled.
- `pphp.prisma.generate` — Runs ORM generate when Prisma is enabled.
- `pphp.prisma.prepare` — Validates DB env + migrates/db push + generate.
- `pphp.component.addPHPXUI` — Add PHPXUI component(s) (Dialog, Toast, Sheet, etc.).
- `pphp.component.addPPIcon` — Add PPIcons icon component(s).
- `pphp.npm.script`, `pphp.updateFilterFiles`, `pphp.project.update` — Project admin & scripts.
- `pphp.crud.createGuide` / `pphp.crud.readGuide` / `pphp.crud.updateGuide` / `pphp.crud.deleteGuide` — task-focused guidance.
- `pphp.scaffoldDashboard` — **Dashboard scaffolder** (honors config toggles).

**Availability workflow (components/icons):**

1. Run `pphp.listComponents` and confirm the component/icon class exists (e.g., `Lib\PPIcons\Eye`, `Lib\PHPXUI\Dialog`).
2. If absent, ask to install and call the appropriate tool: `pphp.component.addPPIcon` or `pphp.component.addPHPXUI`.
3. Re-run `pphp.listComponents` to verify, then output markup with imports at the **top of file**.

**Rule:** If guidance involves routes, components, config, or generation commands, **call the corresponding tool first**.

---

## 3) Routing — how to create & organize routes

> **Do not** emit the full HTML skeleton in page files. `./src/app/layout.php` already provides `<html>`, `<head>`, and `<body pp-component="app">…`.

### 3.0 Route conventions (index vs layout)

- A folder is a **segment**.
  - `app/dashboard/index.php` → **route** at `/dashboard`.
  - `app/dashboard/layout.php` → **layout for `/dashboard` and its children** (not a route).
  - `app/dashboard/users/index.php` → **route** at `/dashboard/users`.
- **Do not** create `layout.php` unless you need shared UI for that segment.

### 3.1 App Router & route segments

- Routes are **file-system based** under `./src/app`. Each folder = one **URL segment**.
- **Nested routes** are created by nesting folders: e.g. `/dashboard/settings` ⇒ `app/dashboard/settings/`.
- Special files per segment:
  - `layout.php` — shared UI for the segment and its children.
  - `index.php` — the **page** for the segment (publicly accessible entry).
  - `loading.php`, `error.php`, `not-found.php` — loading/error/404 UIs for the segment.

### 3.2 Pages & layouts

- `layout.php` at the root is the **root layout**; child `layout.php` files compose beneath it.
- **Page files** (`index.php`) contain **only page content** (markup + reactive `<script>`).

### 3.3 Defining a route (step-by-step)

1. **Read config first** (`pphp.config.get`): honor `backendOnly`, `tailwindcss`, `prisma`.
2. Create a folder under `./src/app` matching your desired path segment.
3. Inside it, add **`index.php` only** for the route content.
4. (Optional) Add `layout.php` to share UI across **children**.
5. Save, then **verify** with `pphp.listRoutes`.

**Examples**

- `/` → `app/index.php`
- `/todos` → `app/todos/index.php`
- `/dashboard/settings` → `app/dashboard/settings/index.php`

### 3.4 Route handlers (`route.php`) — when to create

`route.php` files are for **backend/API handlers** in a segment. **Do not create them by default.**  
Create `route.php` **only if** one of these is true:

1. `backendOnly: true` in `prisma-php.json`.
2. The user **explicitly asks** for a backend/API handler for that segment.

If neither condition is met, **stick with `index.php` only** for that segment.

- Supported methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`.
- You may have both `index.php` and `route.php` in the same folder **only when requested** (UI + API side by side).

**Backend example (only when allowed/requested)**

```
/src/app/api/auth/[...pphpauth]/route.php
```

```php
<?php
  use Lib\Request;
  $dynamic = Request::$dynamicParams; // parsed segments
  if (/* logic */) {
    Request::redirect('/dashboard');
  }
?>
```

### 3.5 Route groups `(group)`

- Wrap a folder name in **parentheses** to create a **route group**: `app/(admin)/users/index.php` → URL is `/users`.
- Groups **do not** affect the URL path but can carry their **own `layout.php`**.

### 3.6 Private routes (`_private`)

- Place private/internal routes in `app/_private/…` (for server-only or internal purposes).

### 3.7 Dynamic route params (via `Request`)

- Dynamic segments use **brackets**. Example catch-all: `app/api/auth/[...pphpauth]/route.php`.
- Inside a dynamic route, read from `Request`:
  ```php
  <?php
    use Lib\Request;
    $dynamic = Request::$dynamicParams; // e.g. ["pphpauth" => ["signin","github"]]
    $params  = Request::$params;        // query/search params
  ?>
  ```

### 3.8 Redirects (server-side, via `Request`)

```php
<?php
  use Lib\Request;
  Request::redirect('/target');
?>
```

### 3.9 XHTML-style closing (required)

- Void elements must **self-close**: `<hr />`, `<br />`, `<input … />`, `<img … />`.
- Close **every** tag in page files.

#### 3.9.1 Boolean attributes must have explicit values (**XML rule**)

In XML/XHTML, **every attribute must have a value** — avoid bare boolean attributes.

**❌ Wrong**

```html
<input value="{{ form.id ?? '' }}" readonly />
<option selected>All</option>
<button disabled>Save</button>
```

**✅ Correct**

```html
<input value="{{ form.id ?? '' }}" readonly="true" />
<option selected="true">All</option>
<button disabled="true">Save</button>
```

- For dynamic booleans, prefer the binding helpers (e.g., `pp-bind-selected="expr"`, `pp-bind-checked="expr"`).  
  The framework will emit XML-safe attributes based on the expression.

### 3.10 Verification workflow (MCP)

```
1) Create files/folders as above.
2) Run pphp.listRoutes
3) If a route doesn’t appear, ensure the folder exists and contains an index.php (for pages) or route.php (for handlers).
```

---

## 4) Reactivity & variables

### 4.1 Where reactive code lives

- Put reactive code in a `<script>` inside the **same page/component**.
- Do **not** add a `type` attribute; the framework controls this.

### 4.2 Declaring reactive variables

- **Tuple form (recommended):**
  ```js
  const [stateVar, setStateVar] = pphp.state(initialValue);
  const [sharedVar, setSharedVar] = pphp.share(initialValue);
  ```
- If a variable **doesn’t need to be reactive**, just use **plain JS**:
  ```js
  const myVar = "hello";
  ```

**`.value` guidance (precise)**

- Property access on objects/arrays: **no `.value`** → `user.name`, `todo.items.length`.
- **Use `.value` for primitives** → `open.value`, `count.value`, `status.value`.
- **Use `.value` on objects/arrays when you need a _plain snapshot_:**
  - **Spread/merge**: `{ ...userForm.value, ...formObject }`
  - **Serialization**: `JSON.stringify(userForm.value)`
  - **Structural compare**: `deepEqual(prevUser, user.value)`
  - **Cross-boundary passing** (e.g., to `fetch`, `dispatchEvent`) where proxies must be de-proxied.

### 4.3 Text & attribute binding

- Text: `{{ myVar }}` → becomes `<span pp-bind="myVar">…</span>`.
- Attributes:
  - `value="{{ myVar }}"` → `pp-bind-value="myVar"` (auto-compiled).
  - Classes: `class="base {{ cond ? 'when-true' : '' }}"` → dynamic portion is tracked.
  - Styles: **always** `pp-bind-style="expr"` (avoid `style="{{ expr }}"`).

### 4.4 Inputs (two-way binding pattern)

```html
{{ myVar }}
<input type="text" pp-bind-value="myVar" oninput="setMyVar(this.value)" />
<script>
  const [myVar, setMyVar] = pphp.state("");
</script>
```

#### 4.4.1 Selects with two-way binding **and type coercion (important)**

When rendering `<option>` items via `pp-for`, browser option `value`s are **strings**.  
If your item ids might be numbers (or mixed), **always normalize types** in `pp-bind-selected` to keep comparisons reliable.

**Rule:** use `String(item.id)` (or `String(role.id)`) on the right side of the comparison.

```html
<select
  name="roleId"
  class="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/70"
  onchange="setRoleId(this.value)"
>
  <option value="" pp-bind-selected="roleId === ''">Rol (todos)</option>
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
  const [roleId, setRoleId] = pphp.state(""); // store as string for stability
</script>
```

**Why:** DOM option values arrive as strings; comparing `"3"` to `3` will fail unless you coerce. Coerce **once** and stay consistent.

### 4.5 Effects (`pphp.effect`)

```js
pphp.effect(() => {
  /* every update */
});
pphp.effect(() => {
  /* once on mount */
}, []);
pphp.effect(() => {
  /* on deps */
}, [dep]);
```

### 4.6 Updating state so effects run

- DOM may update on mutations, but effects that watch `[arr]`/`[obj]` need **new references**:
  ```js
  setTodos([...todos, next]); // arrays
  setUser({ ...user, name: "…" }); // objects
  ```

### 4.7 Lists — `pp-for` (stable keys only)

- Use `<template pp-for="(item, i) in items">` and **never** key by index; prefer `item.id`.

#### 4.7.1 Id type normalization in loops

- **Keys/identity should be strings.** When comparing an item’s `id` from a loop with a selected id that may be `number | string | null`, **normalize types**.
- Prefer **string ids** for items. If an id might be a number (e.g., from a backend), coerce to string during comparisons or when storing the selected id.

**Correct comparison example**

```js
export function saveEdit() {
  if (editingId == null) return;
  setTodos(
    todos.map((todo) =>
      todo.id === String(editingId) ? { ...todo, text: editText.value } : todo
    )
  );
  setEditingId(null);
  setEditText("");
}
```

**Tip — coerce early in handlers**

```js
export function editTodo(id) {
  setEditingId(String(id)); // store as string
  const t = todos.find((t) => t.id === String(id));
  setEditText(t ? t.text : "");
}
export function toggleDone(id) {
  const sid = String(id);
  setTodos(todos.map((t) => (t.id === sid ? { ...t, done: !t.done } : t)));
}
```

### 4.8 Conditional rendering — `pp-if`, `pp-elseif`, `pp-else`

**Syntax**

- `pp-if="condition"` — render when the expression is truthy.
- `pp-elseif="anotherCondition"` — checked if prior branch failed.
- `pp-else` — fallback when no previous conditions matched.

**Examples**

```html
<!-- basic boolean -->
<button class="btn" onclick="setOpen(!open.value)">Toggle</button>
<div class="mt-2" pp-if="open">Now you see me</div>
<div class="mt-2" pp-else>Now you don't</div>
<script>
  const [open, setOpen] = pphp.state(false);
</script>
```

```html
<!-- status flow -->
<div pp-if="status === 'loading'">Loading...</div>
<div pp-elseif="status === 'success'">Loaded successfully!</div>
<div pp-else>Failed to load.</div>
<script>
  const [status, setStatus] = pphp.state("loading"); // 'loading' | 'success' | 'error'
</script>
```

> Keep the chain **contiguous in the DOM** (place `pp-elseif` / `pp-else` immediately after the `pp-if`).

---

### 4.9 Element references — `pp-ref`

Use `pp-ref` to tag DOM elements with a **reference key** you can access imperatively via `pphp.ref(key[, index])`. Ideal for focusing inputs, measuring/scrolling, or toggling classes when declarative bindings aren’t enough.

**Syntax**

- Add `pp-ref="myRef"` to an element to register it.
- `pphp.ref('myRef')` → returns the matched element **or** an array of elements when multiple share the same key.
- `pphp.ref('myRef', 0)` → returns the element at a specific index when multiple match.

**Behavior**

- Refs are collected during hydration; the attribute may be stripped to avoid duplication.
- If only one element matches, `pphp.ref()` returns a single `HTMLElement`. If many match, you’ll get `HTMLElement[]`.
- Passing an index returns exactly that element; out-of-bounds or missing keys throw an error.
- Use stable keys; avoid generating refs dynamically in loops unless you intend to target a collection.

**Examples**

```html
<!-- Focus an input -->
<input type="text" pp-ref="userInput" placeholder="Type your name..." />
<button onclick="focusInput()">Focus</button>
<script>
  export function focusInput() {
    const el = pphp.ref("userInput");
    el && el.focus();
  }
</script>
```

```html
<!-- Multiple elements with the same ref -->
<div pp-ref="item">Item 1</div>
<div pp-ref="item">Item 2</div>
<div pp-ref="item">Item 3</div>
<script>
  const items = pphp.ref("item"); // HTMLElement[]
  const second = pphp.ref("item", 1); // HTMLElement for "Item 2"
  console.log(items.length); // 3
</script>
```

**Gotchas & tips**

- Prefer declarative bindings first (`pp-bind-*`, `pp-for`, `pp-if`). Reach for `pp-ref` for **imperative** needs (focus, measure, scroll).
- In lists, if you need one ref per row, combine the base key with a stable id in your logic and select by **index** when necessary.
- Don’t mutate state from within `pp-ref` lookups during render; call refs in **handlers/effects**.

---

## 5) Examples you can paste

### 5.1 Display & compute

```html
{{ user.name }}
<h1>Welcome, {{ user.name }}!</h1>
<p>Length: {{ textCount.length }}</p>
<p>Balance: {{ Number(account.balance) + Number(bonus) }}</p>
<p>Status: {{ isActive ? 'Active' : 'Inactive' }}</p>
<p class="bg-red-500 {{ textColor }}"></p>
<script>
  // Using pphp.state
  const [user, setUser] = pphp.state({ name: "John Doe" });
  const [textColor, setTextColor] = pphp.state("bg-red-500");
  const [textCount] = pphp.state("Hello World");
  const account = pphp.state({ balance: 100, bonus: 20 });
  pphp.state("isActive", true); // Note: effects don't support this shorthand directly

  // Using pphp.share (globals)
  const [user2, setUser2] = pphp.share({ name: "John Doe" });
  const [textColor2, setTextColor2] = pphp.share("bg-red-500");
  const [textCount2] = pphp.share("Hello World");
  const account2 = pphp.share({ balance: 100, bonus: 20 });
  pphp.share("isActive", true); // Note: effects don't support this shorthand directly
</script>
```

### 5.2 Conditional class vs dynamic style

```html
<!-- Prefer classes -->
<span
  class="text-lg transition-all duration-200 {{ todo.done ? 'line-through text-purple-400' : '' }}"
>
  {{ todo.text }}
</span>

<!-- Use dynamic style only when needed -->
<span
  class="text-lg transition-all duration-200"
  pp-bind-style="todo.done ? 'text-decoration: line-through; color: #a78bfa;' : ''"
>
  {{ todo.text }}
</span>
```

### 5.3 Route handler with redirect & dynamic params

```
/src/app/api/auth/[...pphpauth]/route.php
```

```php
<?php
  use Lib\Request;
  // $dynamic contains parsed segments from the URL
  $dynamic = Request::$dynamicParams;
  if (/* logic */) {
    Request::redirect('/dashboard');
  }
?>
```

---

## 6) Components → Icons (Lib\PPIcons\*)

### 6.0 Universal component usage rule (**IMPORTANT**)

In **page markup** (e.g., `index.php`, `layout.php`), **never instantiate UI components with PHP** like:

```php
<?php echo (new Plus(["class" => "w-5 h-5"]))->render(); ?>
```

Always use the **component tag syntax**. The framework handles instantiation/rendering:

```php
<?php use Lib\PPIcons\Plus; ?>
<Plus class="inline-block w-5 h-5 align-middle" />
```

**Notes**

- Components are **self-closing** with no children: `<Component />`.
- Pass attributes as HTML attributes; use Mustache for dynamic values.

### 6.1 Import placement rule (**ALWAYS at the top**)

Put all `use ...;` imports at the **very top** of the PHP file, grouped with any other imports, **before any markup**.

**Correct**

```php
<?php
use Lib\PPIcons\Eye;                               // single
use Lib\PPIcons\{Eye as EyeIcon, ShoppingCart};    // multiple (aliases optional)
?>
<!-- page markup starts after the import block -->
<Eye />
<ShoppingCart />
```

**Short forms**

```php
<?php use Lib\PPIcons\Eye; ?>
<?php use Lib\PPIcons\{Eye, ShoppingCart}; ?>
```

### 6.2 Basic imports

**Single**

```php
<?php use Lib\PPIcons\Eye; ?>
<Eye />
```

**Multiple**

```php
<?php use Lib\PPIcons\{Eye, ShoppingCart}; ?>
<Eye />
<ShoppingCart />
```

### 6.3 Styling (static)

```php
<?php use Lib\PPIcons\Eye; ?>
<Eye class="w-6 h-6 text-gray-600" title="View" />
```

### 6.4 Reactive styling & attributes

**Conditional class (preferred)**

```html
<?php use Lib\PPIcons\Eye; ?>
<Eye
  class="w-6 h-6 {{ isOn ? 'text-blue-600' : 'text-gray-400' }}"
  onclick="toggle()"
/>
<script>
  const [isOn, setIsOn] = pphp.state(false);
  export function toggle() {
    setIsOn(!isOn.value);
  }
</script>
```

**Dynamic inline style**

```html
<?php use Lib\PPIcons\Eye; ?>
<Eye
  class="w-6 h-6"
  pp-bind-style="'transform: rotate(' + deg.value + 'deg)'"
/>
<script>
  const [deg, setDeg] = pphp.state(0);
</script>
```

**Bind any attribute**

```html
<?php use Lib\PPIcons\Eye; ?>
<Eye aria-label="{{ label }}" />
<script>
  const [label] = pphp.state("Show details");
</script>
```

### 6.5 Events & exported handlers

```html
<?php use Lib\PPIcons\{Eye, ShoppingCart}; ?>

<div class="flex items-center gap-3">
  <Eye
    class="w-6 h-6 cursor-pointer hover:scale-110 transition"
    onclick="onView()"
    aria-label="View details"
  />
  <ShoppingCart
    class="w-6 h-6 cursor-pointer"
    onclick="addToCart()"
    aria-label="Add to cart"
  />
</div>

<script>
  const [count, setCount] = pphp.state(0);
  export function onView() {
    console.log("view");
  }
  export function addToCart() {
    setCount(count.value + 1);
  }
</script>
```

### 6.6 In lists (`pp-for`) — stable keys only

```html
<?php use Lib\PPIcons\{Eye, ShoppingCart}; ?>
<template pp-for="(item, i) in actions">
  <button
    key="{{ item.id }}"
    onclick="run(item.id)"
    class="inline-flex items-center gap-2 px-2 py-1.5 border rounded"
  >
    <Eye class="w-4 h-4" aria-hidden="true" pp-if="item.type === 'view'" />
    <ShoppingCart
      class="w-4 h-4"
      aria-hidden="true"
      pp-if="item.type !== 'view'"
    />
    <span>{{ item.label }}</span>
  </button>
</template>

<script>
  const [actions, setActions] = pphp.state([
    { id: "a1", type: "view", label: "View" },
    { id: "a2", type: "cart", label: "Add" },
  ]);
  export function run(id) {
    console.log("action", id);
  }
</script>
```

### 6.7 Component availability (MCP verification & install)

**Always verify existence before using a component in code.**

**Step-by-step**

1. **List** → `pphp.listComponents` (look for the fully-qualified class, e.g., `Lib\PPIcons\Eye` or `Lib\PHPXUI\Dialog`).
2. **Install if missing** →
   - Icons: `pphp.component.addPPIcon` (canonical icon names; resolves aliases).
   - PHPXUI: `pphp.component.addPHPXUI` (Dialog, Toast, Sheet, etc.).
3. **Verify** → run `pphp.listComponents` again; copy the exact class path from the tool output.
4. **Use** → add `use ...;` at the **top of the file**, then paste the `<Component />` tag.

**Example (icon)**

> Workflow: list → addPPIcon("Eye") → list → import & use

```php
<?php
// after verification via MCP:
use Lib\PPIcons\Eye;
?>
<Eye class="w-5 h-5" aria-hidden="true" />
```

**Example (PHPXUI)**

> Workflow: list → addPHPXUI("Dialog") → list → import & use

```php
<?php
use Lib\PHPXUI\Dialog;
?>
<Dialog open="isOpen">
  <p>Content...</p>
</Dialog>
```

**Third-party components**

- If a component is **not** part of PPIcons/PHPXUI and isn’t listed by `pphp.listComponents`, **ask the user** which library to use and how it’s installed (Composer/NPM). Use `pphp.project.update` or the project’s documented installer if applicable, then verify with `pphp.listComponents`.

**Checklist**

- Imported icons at top: `use Lib\PPIcons\{...};`
- Icons are **self-closed** (`<Eye />`)
- Handlers referenced in markup are **exported**
- Styling respects **Tailwind toggle** (v4 when enabled; no Tailwind otherwise).
- Dynamic styles use `pp-bind-style` only when needed
- Keys in lists are **stable ids**, not indexes
- **Normalize id types** when comparing (`String(selectedId)` if items use string ids).
- Accessibility: `aria-hidden="true"` for decorative icons; labels for interactive

---

## 7) Answering style

- Be concise, **tool-grounded**, and actionable.
- When guidance depends on project state, **cite the MCP calls used** (by name).
- Provide **diffs or complete snippets** that users can paste in.
- For components/icons, **verify with MCP**, install if needed, and include the tool outputs you used.
- Default to **workspace conventions** above every time.

---

## 8) Safety rails for the model (concise checklist)

- Verify with **MCP tools** before asserting facts about routes/components/config.
- **Honor config toggles** (especially `tailwindcss`, `backendOnly`, `prisma`) before generating code or scaffolding.
- **Component availability**: never emit `<Icon />` / `<Component />` or `use Lib\...;` until verified via `pphp.listComponents`. If missing, ask to install and run `pphp.component.addPPIcon` / `pphp.component.addPHPXUI`, then verify.
- **Show your work**: when you decide to use a component, include the MCP outputs you used (short excerpts from `pphp.listComponents` or the add-\* tools).
- Imports at the **top**; use **component tags** instead of manual PHP instantiation.
- Two-way binding uses the exact pattern in **Core rule #1**.
- **`.value` policy**: use for primitives **and** for de-proxied **object/array snapshots** when needed (spreads, JSON, compares, cross-boundary passing). Otherwise, access object properties directly.
- Effects require **immutable updates** (new array/object references).
- Lists: **never** key by index; use a **stable id**.
- Close all tags (XHTML-style); **never** output `<html>/<head>/<body>` in page files.
- Prefer class binding; use **`pp-bind-style`** for dynamic styles; avoid `style="{{ ... }}"` in PHP files.
- Use **`pp-bind-spread`** when merging many attributes/events.
- Route helpers: `Request::redirect()`, `Request::$dynamicParams`, `Request::$params`.
- Export handlers referenced from markup.
- **Routing convention**: `segment/index.php` is a route; `segment/layout.php` is **not** a route.

---

## 9) Quick references (for the AI)

- Use: `pphp.detectProject`, `pphp.config.describe`, `pphp.config.get`, `pphp.listRoutes`, `pphp.listComponents`.
- Tailwind toggle: read **`tailwindcss`** and style accordingly.
- UI rules: Prisma PHP class components; Tailwind + shadcn (when enabled); exported functions for external calls.

---

## 10) PPHP runtime API (public, usable in `<script>`)

> These are the **public methods** available on the global `pphp` (and companions) at runtime.  
> If a method isn’t listed here, **treat it as private** and don’t call it from your code.

### 10.1 State & effects

- `pphp.state<T>(key?: string, initial?: T)` → `[getterFn, setFn]`
  - `.value` on **primitives**, and on **objects/arrays only when a plain snapshot is required** (spread, serialize, compare).
- `pphp.share<T>(key: string, initial?: T)` → `[getterFn, setFn]` (global/shared scope)
- `pphp.getShared<T>(key: string)` → shared value with `.set()` function
- `pphp.clearShare(key?: string)` → clear one or all shared entries
- `pphp.effect(fn, deps?)` → effect with optional dependency array (same semantics you’ve been using)

> **No `pphp.computed`:** derive values either inline in Mustache/`pp-bind-*`, or maintain a derived state with an effect:
>
> ```js
> const [filtered, setFiltered] = pphp.state([]);
> pphp.effect(() => { setFiltered(todos.filter(...)); }, [todos, searchText]);
> ```

### 10.2 DOM & refs

- `pphp.ref(key: string, index?: number)` → `HTMLElement | HTMLElement[]`

### 10.3 Component context

- `pphp.getCurrentComponent(selector?: string): string | null`
- `pphp.getCurrentComponentHierarchy(): string[]`

### 10.4 Events

- `pphp.dispatchEvent(target, valueOrUpdater, opts?)` → Promise<string | false>  
  Trigger a state/event update across scopes. `opts.scope` can be `"current" | "parent" | "root" | string | string[]`.

### 10.5 Navigation, fetch & sync

- `pphp.redirect(url: string)` → Promise<void>
- `pphp.abortActiveRequest(): void`
- `pphp.fetch(url: string, options?: RequestInit, abortPrevious?: boolean)` → Promise<Response>
- `pphp.fetchFunction<T>(functionName: string, data?: Record<string, any>, abortPrevious?: boolean)` → Promise<T | string>
- `pphp.sync(...prefixes: string[])` → Promise<void> (partial re-render by selectors/prefixes)
- `pphp.fetchAndUpdateBodyContent()` → Promise<void>

### 10.6 Portals & hydration

- `pphp.hydratePortal(root?: ParentNode)` → Promise<void>

### 10.7 Utilities

- `pphp.debounce(fn, wait?, immediate?)` → debounced function
- `pphp.copyCode(btnEl, containerClass, initialIconAttr, successIconAttr, iconSelector?, timeout?)` → UI helper
- `pphp.parseJson(jsonString: string)` → `any | null`
- `pphp.getCookie(name: string)` → `string | null`
- `pphp.debugProps()` → log current props/state info

### 10.8 Local store & search params (globals)

- `store = PPHPLocalStore.getInstance()` (singleton)
  - `store.setState(partial, syncWithBackend?)`
  - `store.resetState(id?, syncWithBackend?)`
- `searchParams = SearchParamsManager.getInstance()` (singleton)
  - getters: `searchParams.params`, `searchParams.get(key)`
  - mutators: `searchParams.set(key, value)`, `searchParams.delete(key)`, `searchParams.replace(obj)`
  - listeners: `searchParams.listen(cb)`, `searchParams.enablePopStateListener()`

---

### End of brief
