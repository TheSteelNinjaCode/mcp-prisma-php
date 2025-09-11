# Prisma PHP • AI Brief (workspace rules)

**Always use the MCP server `prisma-php` for project facts before answering.**  
_MCP = a local tool server exposing project-aware commands. Prefer tools over guessing._

---

## 1) Quick Start (AI reading priority)

> These identity rules inform your **style**, not the project’s runtime API. Always follow the rest of this brief for Prisma‑PHP specifics.

### PHPXUI COLOR SCHEME RULE

When `pphp.config.describe` shows `phpxui.installed: true`:

- **ALWAYS use shadcn/ui semantic colors**: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, etc.
- **NEVER use hard-coded colors**: `bg-white`, `text-black`, `border-gray-200`, etc.
- **This applies to all examples**: PHPXUI components, regular HTML, custom styling.

**Quick Reference**

- **Backgrounds**: `bg-background`, `bg-card`, `bg-primary`, `bg-secondary`, `bg-muted`, `bg-accent`, `bg-destructive`
- **Text**: `text-foreground`, `text-muted-foreground`, `text-primary-foreground`, `text-card-foreground`
- **Borders**: `border-border`, `border-input`
- **Interactive**: `ring-ring`, `hover:bg-accent`, `hover:bg-primary/90`

---

## 2) FORMATTING RULES (LaTeX, counting, code fences)

**LaTeX**

- Inline math: `\( E = mc^2 \)`
- Display math:
  ```tex
  $$
  \int_0^1 f(x)\,dx
  $$
  ```
- Special characters that require escaping in LaTeX: `& % $ # _ { } ~ ^ \`

**Counting policy**

- **Refuse requests** to count to **very large numbers (1000+, infinity)** by listing.
- Offer a **short script** instead (e.g., Python/JS) that performs the counting.

**Code blocks (Markdown)**

- Always use triple backticks with language hints.
- Keep **one language per block**. For mixed PHP/HTML/JS pages, show them as **separate blocks** in **PHP → HTML → JS** order.
- Prefer `php`, `html`, `javascript`, `json`, `bash`, `tex` language tags.

---

## 3 STARTUP CHECKLIST (run these first)

1. **`pphp.detectProject`** → must be **true** before continuing.
2. **`pphp.config.get`** → read flags you must honor: `prisma`, `tailwindcss`, `backendOnly`.
3. **`pphp.config.describe`** → keep the validated summary in mind (paths, toggles, **PHPXUI detection**).
4. **Check PHPXUI**: if `checks.phpxui.installed: true` → **use shadcn colors for ALL examples**.
5. When needed: **`pphp.listRoutes`**, **`pphp.listComponents`**.
6. **MANDATORY for components**: before implementing any **PHPXUI** component, plan to run **`pphp.phpxuiComponentUsage <ComponentName>`** (see 3.2).
7. When answers depend on workspace state, **show short MCP outputs you used**.

### 3.1 PHPXUI Component Authority Rule (**MANDATORY**)

**🚨 ALWAYS use `pphp.phpxuiComponentUsage <ComponentName>` before implementing ANY PHPXUI component**

1. **Run the usage tool FIRST** - this gives you the current API
2. **Follow the EXACT patterns** - props, events, structure, everything
3. **Show the MCP output** in your response for transparency
4. **Component APIs evolve** - the usage tool always reflects the latest improvements

**Why this matters:**

- Components like ToggleSwitch and Checkbox now support `pp-bind-checked`
- Event handlers are component-specific (`onclick` vs `onchange`)
- Structure matters (correct nesting for Table components)
- New features are added regularly

**Example workflow:**

```bash
# 1. Always check current API first
pphp.phpxuiComponentUsage ToggleSwitch

# 2. Output shows latest patterns (e.g., pp-bind-checked support)
# 3. Use EXACTLY what the tool shows - no guessing
```

**The usage tool is the single source of truth for all PHPXUI component APIs.**

**Example workflow:**

```bash
# 1) Check if Dialog exists
pphp.listComponents
# 2) Install if needed
pphp.component.addPHPXUI Dialog
# 3) Get correct usage pattern
pphp.phpxuiComponentUsage Dialog
# 4) Implement following the pattern exactly
```

### 3.2 PHPXUI & Color Scheme Detection

**Before providing styling examples:**

1. **Always run `pphp.config.describe`** to check if PHPXUI is installed.
2. **If `checks.phpxui.installed: true`** → Use **shadcn/ui color conventions** for all styling examples.
3. **Never use hard-coded Tailwind colors** when PHPXUI is detected.

**PHPXUI Detection Rule:**

```javascript
// When pphp.config.describe shows:
{
  "checks": {
    "phpxui": {
      "installed": true,
      "shadcnColorsAvailable": true
    }
  }
}
// → Always use: bg-background, bg-card, text-foreground, text-muted-foreground, etc.
// → Never use: bg-white, bg-gray-100, text-black, text-gray-900, etc.
```

### 3.3 Then follow

1. **File order**: **PHP → HTML → one `<script>` at the bottom**.
2. **Components**: verify → install → verify → **check usage** → import → use (see §8).
3. **Styling toggle**: Tailwind v4 only if `tailwindcss: true`; otherwise **no Tailwind**.
4. **CRUD**: use CRUD guide tools (if available). They **auto‑adapt** to `prisma`.
5. **Export handlers** referenced from markup.

**❌ Wrong (script before markup)**

```php
<?php
use Lib\Prisma\Classes\Prisma;
$prisma = Prisma::getInstance();
$roles  = $prisma->userRole->findMany([]);
?>
<script>
const [roles, setRoles] = pphp.share(<?= json_encode($roles) ?>);
</script>
<div>…</div>
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

## 4) AI Common Mistakes (read before coding)

- **Never instantiate components with PHP `new`** — use tag syntax (`<Dialog />`, `<Plus />`). See **Core Rule 5.2**.
- **`<template>` is only for `pp-for`**. Use real elements for conditionals (**`pp-if` / `pp-elseif` / `pp-else="true"`**). See **Gotchas §13**.
- **Don’t use `.value` inside templates** (`{{ }}` or attribute interpolations). See **Core Rule 5.3**.
- **`pp-else` requires explicit `="true"`** — never use bare `pp-else`.
- **Conditional chains must be contiguous** — no other elements between `pp-if/pp-elseif/pp-else="true"`.
- **When PHPXUI is installed, never use hard‑coded Tailwind colors** — use shadcn **semantic tokens**.
- **Stable keys only** in lists; never key by index. Use `item.id` (string).
- **DOM option values are strings**: normalize `String(role.id)` in comparisons.
- **Layouts**: create `layout.php` **only when explicitly requested** (or for scaffolded areas).

### 4.1 PHPXUI Component Event Rules

**CRITICAL: Each PHPXUI component has specific event handlers - never assume generic patterns**

**❌ Common mistakes:**

```html
<!-- Wrong: using onchange instead of onclick -->
<ToggleSwitch pp-bind-checked="active" onchange="setActive(!active)" />
<Checkbox pp-bind-checked="selected" onchange="setSelected(!selected)" />

<!-- Wrong: missing pp-bind- prefix for modern binding -->
<ToggleSwitch checked="active" onclick="setActive(!active)" />
<!-- ^ This still works but pp-bind-checked is preferred -->
```

**✅ Correct modern patterns:**

```html
<!-- Correct: pp-bind-checked + onclick -->
<ToggleSwitch pp-bind-checked="active" onclick="setActive(!active)" />
<Checkbox pp-bind-checked="selected" onclick="setSelected(!selected)" />
```

**RULE: Always use `onclick` for ToggleSwitch and Checkbox - NEVER `onchange`**

---

## 5) Core Rules

### 5.1 Component API Authority (priority #1)

- **MANDATORY**: Use `pphp.phpxuiComponentUsage <ComponentName>` before any PHPXUI component
- **Follow exact patterns**: The tool shows current API including latest improvements
- **Modern bindings**: Components now support `pp-bind-checked` with `onclick` handlers
- **Never assume**: APIs evolve - the usage tool is always current

**Example patterns (from usage tool):**

```html
<!-- Modern controlled pattern -->
<ToggleSwitch pp-bind-checked="isActive" onclick="setIsActive(!isActive)" />
<Checkbox pp-bind-checked="selected" onclick="setSelected(!selected)" />
```

### 5.2 Component usage (priority #2) — **Tag syntax only**

**❌ Wrong**

```php
<?php echo (new Plus(["class" => "w-5 h-5"]))->render(); ?>
```

**✅ Correct**

```php
<?php use Lib\PPIcons\Plus; ?>
<Plus class="inline-block w-5 h-5 align-middle" />
```

### 5.3 Two‑way binding (priority #3)

```html
<input type="text" pp-bind-value="text" oninput="setText(this.value)" />
<script>
  const [text, setText] = pphp.state("");
</script>
```

- **Templates** never use `.value`.
- In `<script>`, use `.value` for **primitives** and when you need a **plain snapshot** of objects/arrays (spread/serialize/compare/pass across boundaries). Property access on objects/arrays (e.g., `user.name`) needs **no** `.value`.

### 5.4 `pp-bind-spread` (priority #5 — attribute merging)

```html
<img pp-bind-spread="imgProps" />
<script>
  const [imgProps] = pphp.state({
    class: "icon cursor-pointer",
    style: "width:32px;height:32px;",
    title: "Save",
    onclick: "handleClick()",
  });
  export function handleClick() {
    /* … */
  }
</script>
```

### 5.6 Lists & identity (priority #6)

- Use **stable string ids**; never key by index.

```html
<template pp-for="todo in todos">
  <li key="{{ todo.id }}">{{ todo.title }}</li>
</template>
```

### 5.7 Export functions (priority #7)

```html
<button onclick="save()">Save</button>
<script>
  export function save() {
    /* … */
  }
</script>
```

---

## 6) XML/XHTML Rules (critical syntax)

- **Boolean attributes require explicit values**: `disabled="true"`, `readonly="true"`, `selected="true"`.
- **Void elements self‑close**: `<input … />`, `<img … />`, `<hr />`, `<br />`.
- Prefer binding helpers for dynamics (`pp-bind-selected`, `pp-bind-checked`, `pp-bind-open`, …).

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

---

## 7) PSR‑4 Complete Guide

**Composer mapping (example)**

```json
{
  "autoload": {
    "psr-4": { "Lib\\": "src/Lib/", "": "src/" }
  }
}
```

**Directory structure (example)**

```
src/
  Lib/
    PHPXUI/
      Dialog.php
    PPIcons/
      Plus.php
```

**Import patterns**

```php
<?php
// Single
use Lib\PPIcons\Plus;

// Grouped + alias
use Lib\PPIcons\{Eye as EyeIcon, ShoppingCart};
use Lib\PHPXUI\{Dialog, DialogHeader, DialogContent, DialogFooter};
?>
```

---

## 8) 🔄 Component Workflow (updated: verify → install → verify → **check usage** → import → use)

1. **Verify**: `pphp.listComponents` for fully‑qualified classes (e.g., `Lib\PPIcons\Eye`, `Lib\PHPXUI\Dialog`).
2. **Install if missing**: Icons → `pphp.component.addPPIcon`; UI → `pphp.component.addPHPXUI`.
3. **Verify again** via `pphp.listComponents`.
4. **🆕 Check Usage**: `pphp.phpxuiComponentUsage <ComponentName>` for correct implementation patterns, required props, and examples.
5. **Import** with grouped `use …;` at the **top**.
6. **Use tags** (`<Eye />`, `<Dialog>…</Dialog>`), **not** `new`.

---

## 9) Components & Icons (usage)

- **Usage patterns**: **Always check `pphp.phpxuiComponentUsage` before implementing** any PHPXUI component to get correct props, structure, and examples.
- **Tag syntax only** (`<Plus />`, `<Dialog />`).
- **Events require exported handlers** in the bottom `<script>`.
- **Lists**: components inside `pp-for` require **stable keys** on the parent element.
- **Accessibility**: decorative icons → `aria-hidden="true"`; interactive icons → an `aria-label`.

**Example**

```php
<?php use Lib\PPIcons\{Eye, ShoppingCart}; ?>
<div class="flex items-center gap-3">
  <Eye class="w-6 h-6" onclick="onView()" aria-label="Ver" />
  <ShoppingCart class="w-6 h-6" onclick="addToCart()" aria-label="Agregar" />
</div>
<script>
  const [count, setCount] = pphp.state(0);
  export function onView() { /* … */ }
  export function addToCart() { setCount(count.value + 1); }
</script>
```

---

## 10) 🧭 Routing (use MCP tool)

### 10.1 Route Creation (preferred method)

**Always use `pphp.route.create` for new routes:**

```bash
# Simple page
pphp.route.create --route "dashboard"

# Route group (URL stays /users)
pphp.route.create --route "(admin)/users"

# Dynamic params
pphp.route.create --route "blog/[slug]" --title "Blog Post"

# API handler (or when backendOnly: true)
pphp.route.create --route "api/users" --apiHandler true

# With shared layout
pphp.route.create --route "dashboard" --withLayout true
```

### 10.2 Route Conventions (auto-handled by tool)

- **Pages**: `app/path/index.php` → URL `/path`
- **API handlers**: `app/api/path/route.php` → URL `/api/path`
- **Route groups**: `app/(admin)/users/index.php` → URL `/users` (group ignored)
- **Private folders**: `app/_components/` → not routable
- **Dynamic**: `[param]`, `[...catchAll]` → `Request::$dynamicParams`

### 10.3 Manual Creation (if needed)

Only create files manually for complex custom scenarios. Follow the tool's output patterns.

---

## 11) 🎨 Styling & UI (consolidated)

### 11.1 Color system decision (PHPXUI‑aware)

**When `phpxui.installed: true` (preferred):**

```html
<span
  class="text-base {{ done ? 'line-through text-muted-foreground' : 'text-foreground' }}"
>
  {{ todo.text }}
</span>
```

**When PHPXUI is NOT installed (Tailwind‑only projects):**

```html
<span
  class="text-base {{ done ? 'line-through text-gray-400' : 'text-gray-900' }}"
>
  {{ todo.text }}
</span>
```

### 11.2 Style binding syntax

- `pp-bind-style` expects **CSS string**: `'prop: value; prop2: value2;'` (not JS objects).

### 11.3 `pp-bind-spread` (see **Core Rule 5.5**)

Use when many attributes/events come from an object.

---

## 12) 🗃️ Database (Prisma)

### 12.1 Database Preparation

- **Full setup**: Use **`pphp.prisma.prepare`** for complete database initialization (checks config, validates `DATABASE_URL`, syncs schema provider, runs migrations or db push, then generates client).
- **Client only**: Use **`pphp.prisma.generate`** for just regenerating the client.

---

## 13) Conditional rendering & inline editors (gotchas)

### 13.1 `<template>` vs real elements

**✅ Use `<template>` only for loops**

```html
<template pp-for="todo in todos">
  <li key="{{ todo.id }}">{{ todo.text }}</li>
</template>
```

**✅ Use real elements for conditionals (with correct syntax)**

```html
<div pp-if="isEditing" class="flex gap-2">Edit form here</div>
<span pp-else="true">Display mode</span>
```

### 13.2 Common conditional rendering patterns

**Simple boolean toggle**

```html
<div pp-if="isOpen">Panel is open</div>
<div pp-else="true">Panel is closed</div>
```

**Multi-branch with `pp-elseif`**

```html
<div pp-if="status === 'loading'">Loading…</div>
<div pp-elseif="status === 'success'">Success!</div>
<div pp-else="true">Error occurred</div>
```

**Numeric comparison**

```html
<p pp-if="count > 0">You have {{ count }} items</p>
<p pp-else="true">No items found</p>
```

### 13.3 Common mistakes to avoid

- **Bare `pp-else` (wrong):**

```html
<div pp-if="condition">Content</div>
<div pp-else>Fallback</div>
<!-- MISSING ="true" -->
```

- **Using `<template>` for conditionals (wrong):**

```html
<template pp-if="condition">Content</template>
<!-- Never use template -->
```

- **Non-contiguous chains (wrong):**

```html
<div pp-if="mode === 'edit'">Edit mode</div>
<span>Some other content</span>
<!-- Breaks the chain -->
<div pp-else="true">View mode</div>
<!-- Won't work -->
```

---

## 14) 📚 Rich Examples

### 14.1 Display & compute

```html
{{ user.name }}
<h1>Welcome, {{ user.name }}!</h1>
<p>Length: {{ textCount.length }}</p>
<p>Balance: {{ Number(account.balance) + Number(bonus) }}</p>
<p>Status: {{ isActive ? 'Active' : 'Inactive' }}</p>
<p class="{{ textColor }}"></p>
<script>
  const [user, setUser] = pphp.state({ name: "John Doe" });
  // Prefer semantic token defaults for PHPXUI projects
  const [textColor, setTextColor] = pphp.state("text-primary");
  const [textCount] = pphp.state("Hello World");
  const account = pphp.state({ balance: 100, bonus: 20 });
</script>
```

### 14.2 Conditional class vs dynamic style

```html
<!-- Prefer classes -->
<span
  class="text-base transition-all duration-200 {{ todo.done ? 'line-through text-muted-foreground' : '' }}"
>
  {{ todo.text }}
</span>

<!-- Use dynamic style only when needed -->
<span
  class="text-base transition-all duration-200"
  pp-bind-style="todo.done ? 'text-decoration: line-through;' : ''"
>
  {{ todo.text }}
</span>
```

### 14.3 Route handler with redirect & dynamic params

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

---

## 15) 🧰 MCP tools (single reference table — updated)

| Group             | Tool                                                                                                       | Purpose                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Project**       | `pphp.detectProject`                                                                                       | Confirm Prisma PHP workspace.                                                |
| **Config/Routes** | `pphp.config.get`, `pphp.config.describe`, `pphp.listRoutes`, `pphp.route.create`                          | Read flags/paths; **create routes with full automation**.                    |
| **Components**    | `pphp.listComponents`, `pphp.component.addPPIcon`, `pphp.component.addPHPXUI`, `pphp.phpxuiComponentUsage` | Verify/install/check usage of icons & PHPXUI components.                     |
| **ORM/DB**        | `pphp.prisma.generate`, `pphp.prisma.prepare`                                                              | Generate Prisma PHP client; full database preparation.                       |
| **Scaffold/Docs** | `pphp.generateSwaggerDocs`                                                                                 | Generate Swagger docs (when enabled).                                        |
| **Admin/Scripts** | `pphp.npm.script`, `pphp.updateFilterFiles`, `pphp.project.update`                                         | Package scripts, normalize filters, project update.                          |
| **CRUD Guides\*** | `pphp.crud.createGuide`, `pphp.crud.readGuide`, `pphp.crud.updateGuide`, `pphp.crud.deleteGuide`           | _If available_: generate CRUD patterns that **auto‑adapt** to `prisma` flag. |

> If a referenced tool is not present in your MCP, skip it and follow the rest of the rules.

---

## 16) PPHP runtime API (public, safe to use in `<script>`)

> These are the **public** runtime methods. If it's not listed here, treat it as **private**.

### 16.1 State & effects

- `pphp.state<T>(initial?: T)` → `[getterFn, setFn]`
  - Use `.value` for **primitives** and when you need a **plain snapshot** of objects/arrays (spread/serialize/compare/pass across boundaries).
  - Property access on objects/arrays: **no** `.value` (`user.name`, `items.length`).
- `pphp.share<T>(initial?: T)` → `[getterFn, setFn]` (global/shared scope)
- `pphp.effect(fn, deps?)`
  - `[]` → run once on mount; `[dep]` → run on changes; omit deps to run each update.

### 16.2 DOM & refs

- `pphp.ref(key: string, index?: number)` → `HTMLElement | HTMLElement[]`  
  Use for focus/measure/scroll; prefer declarative bindings first.

**Focus‑after‑render rule (important)**  
When you reveal/mount an element via state or conditionals, **defer focus** so the DOM is ready:

```html
<input
  type="text"
  pp-bind-value="editTitle"
  oninput="setEditTitle(this.value)"
  class="border-input text-foreground bg-background rounded px-2 py-1"
  pp-ref="editInput"
/>
<script>
  export function startEdit(todo) {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    // Defer focus to the next macrotask so the input exists
    setTimeout(() => {
      const input = pphp.ref("editInput");
      if (input) input.focus();
    }, 0);
  }
</script>
```

- For multiple elements sharing a ref, pick by index: `pphp.ref('rowInput', index)`.

### 16.3 Events

- `pphp.dispatchEvent(target, valueOrUpdater, opts?)` → `Promise<string | false>`  
  `opts.scope`: `"current" | "parent" | "root" | string | string[]`.

### 16.4 Navigation, fetch & sync

- `pphp.redirect(url: string)` → `Promise<void>`
- `pphp.abortActiveRequest(): void`
- `pphp.fetch(url: string, options?: RequestInit, abortPrevious?: boolean)` → `Promise<Response>`
- `pphp.fetchFunction<T>(functionName: string, data?: Record<string, any>, abortPrevious?: boolean)` → `Promise<T | string>`
- `pphp.sync(...prefixes: string[])` → `Promise<void>` (partial re-render by selectors/prefixes)
- `pphp.fetchAndUpdateBodyContent()` → `Promise<void>`

### 16.5 Portals & hydration

- `pphp.hydratePortal(root?: ParentNode)` → `Promise<void>`

### 16.6 Utilities

- `pphp.debounce(fn, wait?: number, immediate?: boolean)` → debounced function
- `pphp.copyCode(btnEl, containerClass, initialIconAttr, successIconAttr, iconSelector?, timeout?)`
- `pphp.parseJson(jsonString: string)` → `any | null`
- `pphp.getCookie(name: string)` → `string | null`
- `pphp.debugProps()` → log current props/state info

### 16.7 Local store & search params (globals)

- `store = PPHPLocalStore.getInstance()`
  - `store.setState(partial, syncWithBackend?)`
  - `store.resetState(id?, syncWithBackend?)`
- `searchParams = SearchParamsManager.getInstance()`
  - Getters: `searchParams.params`, `searchParams.get(key)`
  - Mutators: `searchParams.set(key, value)`, `searchParams.delete(key)`, `searchParams.replace(obj)`
  - Listeners: `searchParams.listen(cb)`, `searchParams.enablePopStateListener()`

---

### End of brief
