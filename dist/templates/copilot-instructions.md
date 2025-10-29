# Prisma PHP • AI Execution Rules (AI‑Aware, Strict Edition)

> Purpose: eliminate guesses and make outputs instantly copy‑pasteable in **Prisma PHP** projects. Updated 2025-10-05 04:28:59.

---

## 🚨 Hard Priority Order (top → bottom)

1. **Use only the allowed runtime/markup surface listed below. Anything else is forbidden.**
2. **Facts over guesses**: run `pp.detectProject` → `pp.config.describe`; _follow_ their outputs when writing code/markup (assume success).
3. **If PHPXUI is installed** (`checks.phpxui.installed === true`) → use semantic tokens: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `border-input`, `ring-ring`. **Never** raw Tailwind grays (`bg-white`, `text-black`, `bg-gray-100`, etc.).
4. **File order**: PHP imports/logic → HTML markup → **one** `<script>` at the bottom.
5. **Visibility**: prefer `hidden` attribute for show/hide; use ternaries **only** for text/attribute values.
6. **Stable keys in loops**; never ad‑hoc/random keys.
7. **Do not invent helpers or directives. Use only what’s listed below.**

---

## ✅ Allowed Runtime Surface

### Core JavaScript API

1. `pp.state<T>(initial)` → `[state, setState]`
2. `pp.ref<T>(initial: T | null)`
3. `pp.effect(fn: () => void | () => void, deps?: Dependency[])`
4. `pp.fetchFunction(name: string, data?: object, abortPrevious?: boolean)` → `Promise<any | string>`

### Markup Directives

1. `pp-for` (only inside `<template>`)
2. `pp-spread`
3. `pp-ref`

> If a symbol is not above, **do not use it**.

---

## 🧭 MCP‑First Workflow (MANDATORY)

### Before Writing ANY Code:

1. **Detect & Describe**

```bash
pp.detectProject        # Confirm project exists
pp.config.describe      # Get project structure
```

❌ NEVER proceed without these two steps.

2. Check Components (if using PHPXUI/PPIcons)

```bash
pp.listComponents                    # List available components
pp.component.addPHPXUI        # Add PHPXUI components (if needed)
pp.phpxui.component.usage <Name>     # Get usage for specific phpxui component
pp.component.addPPIcon    # Add PPIcons components (if needed)
pp.ppicons.component.usage <Name>     # Get usage for specific ppicons component
```

3. Check Routes (if creating/modifying pages)

```bash
pp.listRoutes           # See existing routes
pp.route.create        # Create new route
```

4. Check CRUD Guides (if implementing database operations)

```bash
pp.crud.createGuide     # For inserts
pp.crud.readGuide       # For queries
pp.crud.updateGuide     # For updates
pp.crud.deleteGuide     # For deletions
```

Decision Tree:
User Request
│
├─ "Create/show me..." → pp.detectProject → pp.config.describe → Check guides
├─ "Use component X" → pp.phpxui.component.usage X
├─ "Add route" → pp.listRoutes → pp.route.create
├─ "Setup database" → pp.prisma.prepare
└─ "Update schema" → pp.prisma.generate

---

## 📋 MCP Tools Quick Reference

### 🚨 Always Run First

- `pp.detectProject` + `pp.config.describe`

### 🎨 Before Component Code

- `pp.listComponents` → `pp.phpxui.component.usage <Name>`

### 🗂️ Before Routing

- `pp.listRoutes` → `pp.route.create`

### 🗄️ Database Setup

- New: `pp.prisma.prepare`
- Update: `pp.prisma.generate`

### 📖 Before CRUD Code

- `pp.crud.[create|read|update|delete]Guide`

### Tool Not Listed Above?

**If a tool/API is not in this document, DO NOT USE IT.**

---

## 🗂 File Layout (always this exact order)

```php
<?php
// 1) PHP imports + server logic
use Lib\Prisma\Classes\Prisma;
$prisma = Prisma::getInstance();
$users = $prisma->user->findMany();
?>
<!-- 2) HTML markup -->
<ul>
  <template pp-for="user in users">
    <li key="{user.id}">{user.name}</li>
  </template>
</ul>
<!-- 3) One script block at bottom -->
<script>
  const [users, setUsers] = pp.state(<?= json_encode($users) ?>);
</script>
```

---

## 🔀 Conditionals & Booleans

**Visibility (preferred):**

```html
<div hidden="{!isOpen}">Shown when open</div>
<div hidden="{isOpen}">Shown when closed</div>
```

**Text/attribute ternaries (simple values only):**

```html
<span class="{isActive ? 'text-green-600' : 'text-red-600'}">
  {isActive ? 'Active' : 'Inactive'}
</span>
```

**Boolean attributes** (present/absent semantics):

```html
<input type="checkbox" checked="{isActive}" />
```

**Ternary string guardrail (quotes must wrap string branches):**

- ✅ `{isActive ? 'text-blue-500' : 'text-gray-500'}`
- ❌ `{isActive ? text-blue-500' : 'text-gray-500'}` ← missing opening quote  
  If a branch is not quoted, emit a warning and refuse the output.

---

## 🔗 Refs (`pp-ref`) Patterns

**Single element ref:**

```html
<input type="text" pp-ref="{nameInput}" />
<button onclick="nameInput.current?.focus()">Focus</button>
<script>
  const nameInput = pp.ref(null);
</script>
```

**Callback ref (dynamic/loop):**

```html
<template pp-for="(item, i) in items">
  <div pp-ref="{captureRef(i)}" key="{item.id}">{item.label}</div>
</template>
<script>
  const [items] = pp.state([]);
  const slots = [];
  function captureRef(i) {
    return (el) => {
      if (el) slots[i] = el;
    };
  }
</script>
```

**Rules:**

- Always init with `pp.ref(null)` and null‑check (`ref.current?`).
- Don’t store reactive data in refs; store DOM or imperative handles.
- Clean up in `pp.effect` returns when necessary.

---

## 🎨 Spread (`pp-spread`) Patterns

**Basic:**

```html
<button pp-spread="{...btn}">Submit</button>
<script>
  const [btn] = pp.state({ class: "px-3 py-2", "aria-label": "submit" });
</script>
```

**Multiple spreads & precedence:**

```html
<input pp-spread="{...base, ...validation}" placeholder="Name" />
<script>
  const [base] = pp.state({ class: "input-base", required: true });
  const [validation] = pp.state({ pattern: "[A-Za-z]+" });
</script>
```

> Later spreads override earlier ones; explicit attributes override spreads.

---

## 🔁 Lists (`pp-for`)

```html
<ul>
  <template pp-for="todo in todos">
    <li key="{todo.id}">
      {todo.name}
      <button onclick="removeTodo(todo.id)">Remove</button>
    </li>
  </template>
</ul>
<script>
  const [items, setItems] = pp.state([
    { id: 1, name: "Item 1" },
    { id: 2, name: "Item 2" },
  ]);

  function removeTodo(id) {
    setItems(items.filter((item) => item.id !== id));
  }
</script>
```

**Rules:**

- Place `pp-for` only on `<template>`.
- Keys must be stable (IDs or stable indexes), never random.

---

## ⚡ Effects (`pp.effect`) Cheats

```html
<script>
  // On any reactive change
  pp.effect(() => console.log("Any change"));

  // Once (mount)
  pp.effect(() => {
    // init
    return () => {
      /* cleanup */
    };
  }, []);

  // With deps
  const [count, setCount] = pp.state(0);
  pp.effect(() => {
    console.log("count", count);
  }, [count]);
</script>
```

**Common mistakes**⚠️

- ❌ Passing non‑reactive snapshots in `deps`; pass the **state variable** itself (e.g., `[count]`).
- ❌ Unconditional setters inside effects → infinite loops.
- ❌ Writing component code without checking pp.phpxui.component.usage
- ❌ Creating routes without running pp.listRoutes
- ❌ Assuming project structure without pp.config.describe
- ❌ Using bg-white, text-black instead of semantic tokens when PHPXUI installed

---

## 🧰 Fetching (`pp.fetchFunction`) Example

```php
<?php

function resetPassword($data) {
    // Simulate password reset logic
    return ['message' => 'Password reset link sent to ' . $data->email];
}

?>

<form onsubmit="submitForm(event)">
  <input name="email" type="email" required />
  <button type="submit">Send</button>
</form>
<script>
  const [isSending, setIsSending] = pp.state(false);
  async function submitForm(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    setIsSending(true);
    try {
      const { response } = await pp.fetchFunction("resetPassword", data);
      console.log(response);
    } finally {
      setIsSending(false);
    }
  }
</script>
```

---

## ✅ Checkbox Update Example

```html
<input
  type="checkbox"
  checked="{isActive}"
  onchange="setIsActive(event.target.checked)"
/>
<script>
  const [isActive, setIsActive] = pp.state(false);
</script>
```

## ✅ Two‑Way Binding Example

```html
<input
  type="text"
  value="{name}"
  oninput="setName(event.target.value)"
/>
<script>
  const [name, setName] = pp.state("");
</script>

---

## ❌ Error Patterns to Refuse

### MCP Tool Violations:

- Writing code **before** running `pp.detectProject` + `pp.config.describe`
- Using PHPXUI components without checking `pp.phpxui.component.usage`
- Creating routes without checking `pp.listRoutes`
- Assuming file paths without consulting `pp.config.describe`
- Using raw Tailwind colors when PHPXUI is installed (`checks.phpxui.installed === true`)
- Using any API **not listed** in _Allowed Runtime Surface_.
- Putting `pp-for` directly on non‑`<template>` elements.
- Using ternaries for show/hide instead of `hidden`.
- Missing quotes in string ternaries; if detected → **emit a warning and stop**.
- Multiple `<script>` blocks or scripts not at the bottom.
- Unstable/random keys in lists.
