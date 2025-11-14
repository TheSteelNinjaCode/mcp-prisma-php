# Prisma PHP • AI Execution Rules (AI‑Aware, Strict Edition)

> Purpose: eliminate guesses and make outputs instantly copy‑pasteable in **Prisma PHP** projects.  
> **Version:** 2.0.0 | **Last Updated:** 2025-11-14

---

## ⚡ PRE-GENERATION CHECKLIST (Scan Before EVERY Response)

□ Did I run `pp.detectProject` + `pp.config.describe`?  
□ Using component? → Did I check `pp.phpxui.component.usage <Name>`?  
□ Creating route? → Did I run `pp.listRoutes` first?  
□ Writing DB code? → Did I consult the CRUD guide?  
□ 100% certain about syntax? → If NO, run the tool.

**If ANY box unchecked → STOP. Run tool first.**

---

## 🧠 AI META-INSTRUCTION (Read First, Every Time)

**You are helping with Prisma PHP development. Before ANY code generation:**

1. **PAUSE** - Identify what the user is asking for (2-second think)
2. **MATCH** - Find trigger phrase in the mapping table below
3. **TOOL** - Run required MCP tool(s) — this is NOT optional
4. **GENERATE** - Only after tools return successful data
5. **VERIFY** - Check output against File Layout + Error Patterns

**Skipping steps 2-3 = you are hallucinating and failing the user.**  
**This is NOT a suggestion. This is a MANDATORY workflow.**

---

## 🚨 Hard Priority Order (top → bottom)

1. **Use only the allowed runtime/markup surface listed below. Anything else is forbidden.**
2. **MCP tools are MANDATORY. ALWAYS run detection tools before ANY code generation. NEVER guess project structure, component APIs, or routes.**
3. **Facts over guesses**: run `pp.detectProject` → `pp.config.describe`; _follow_ their outputs when writing code/markup (assume success).
4. **If PHPXUI is installed** (`checks.phpxui.installed === true`) → use semantic tokens: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `border-input`, `ring-ring`. **Never** raw Tailwind grays (`bg-white`, `text-black`, `bg-gray-100`, etc.).
5. **File order**: PHP imports/logic → HTML markup → **one** `<script>` at the bottom.
6. **Visibility**: prefer `hidden` attribute for show/hide; use ternaries **only** for text/attribute values.
7. **Stable keys in loops**; never ad‑hoc/random keys.
8. **Do not invent helpers or directives. Use only what's listed below.**

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

## 🧭 MCP-First Workflow (MANDATORY - ZERO TOLERANCE FOR HALLUCINATIONS)

### 🚫 ANTI-HALLUCINATION RULE

**YOU MUST NOT generate any Prisma PHP code without first consulting the appropriate MCP tools.**  
**If you guess project structure, component APIs, or routes → you FAIL.**

---

### ⚠️ CRITICAL: MCP Server vs. MCP Tools (Don't Confuse These!)

**There are TWO different concepts with "MCP" in the name:**

| Concept                | What It Is                                                         | How It Affects You                         |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| **MCP Server Feature** | A project feature in `prisma-php.json` (`"mcp": true/false`)       | Internal project config - NOT your concern |
| **MCP Tools**          | External AI tools (`pp.detectProject`, `pp.config.describe`, etc.) | **YOU MUST ALWAYS USE THESE**              |

---

**🚨 CRITICAL DISTINCTION:**

When you run `pp.config.describe` and see this in the project config:

```json
{
  "mcp": false,
  "prisma": false,
  "tailwindcss": true
}
```

**This does NOT mean:**

- ❌ "Don't use MCP tools"
- ❌ "MCP tools are unavailable"
- ❌ "Skip pp.detectProject and pp.config.describe"

**This ONLY means:**

- ✅ The MCP Server feature is not installed in THIS PROJECT
- ✅ You STILL MUST use all MCP tools (pp.detectProject, pp.config.describe, etc.)
- ✅ MCP tools are ALWAYS available regardless of project config

---

**Think of it like this:**

- **MCP Server** (`"mcp": true/false`) = A feature the user can install in their project (like websocket or docker)
- **MCP Tools** (`pp.*`) = Your external toolkit to interact with ANY Prisma PHP project

**The project's `"mcp": false` has ZERO impact on your requirement to use MCP tools.**

---

**Example of correct interpretation:**

```json
{
  "prisma": false,
  "tailwindcss": true,
  "mcp": false
}
```

**You should interpret this as:**

- "This project does NOT have Prisma ORM installed" → Don't generate Prisma code
- "This project DOES have Tailwind installed" → Use Tailwind classes
- "This project does NOT have MCP Server installed" → Internal feature flag, ignore it

**You should NOT interpret as:**

- ❌ "Don't use pp.detectProject"
- ❌ "Don't use pp.config.describe"
- ❌ "Don't consult MCP tools"

**YOU MUST STILL RUN ALL MCP TOOLS REGARDLESS OF THE `"mcp"` FIELD VALUE.**

---

### 🔴 ALWAYS Run First (Every Single Time)

**Before writing ANY code or answering ANY project-specific question:**

```bash
pp.detectProject        # Confirms prisma-php.json exists
pp.config.describe      # Gets project structure, enabled features, paths
```

**Why:** These two tools prevent 90% of hallucinations. They tell you:

- If Prisma ORM is enabled
- If PHPXUI/Tailwind is installed
- If swaggerDocs is enabled
- Correct file paths for pages/api/css
- Whether backend-only mode is on

**❌ NEVER:**

- Assume Prisma is available
- Guess component import paths
- Write routes without knowing the routing convention
- Use PHPXUI components without checking availability

---

### 📋 Complete Tool Reference (Alphabetical by Category)

#### **🔍 Project Detection & Config (Run FIRST)**

| Tool                 | When to Use                                      | Returns                                          |
| -------------------- | ------------------------------------------------ | ------------------------------------------------ |
| `pp.detectProject`   | **Always first** - Before any code generation    | Boolean - project exists                         |
| `pp.config.describe` | **Always second** - After detection              | Project summary: paths, enabled features, checks |
| `pp.config.get`      | When you need raw JSON config for advanced logic | Full prisma-php.json contents                    |

---

#### **🎨 Component Installation & Usage**

| Tool                         | When to Use                              | Example Trigger                |
| ---------------------------- | ---------------------------------------- | ------------------------------ |
| `pp.listComponents`          | Before using ANY PHPXUI component        | "Show me available components" |
| `pp.component.addPHPXUI`     | User requests Dialog, Toast, Sheet, etc. | "Add a dialog component"       |
| `pp.phpxui.component.usage`  | **ALWAYS before writing PHPXUI code**    | "How do I use Dialog?"         |
| `pp.component.addPPIcon`     | User needs icons (Lucide-style)          | "Add a menu icon"              |
| `pp.ppicons.component.usage` | **ALWAYS before writing icon code**      | "Show me how to use icons"     |

**🚨 CRITICAL:** You MUST run `pp.phpxui.component.usage <ComponentName>` before generating ANY component code. The usage tool returns:

- Correct PHP import syntax
- Required HTML structure
- Optional JavaScript patterns
- Multiple usage patterns (e.g., Dialog with trigger vs controlled)

**❌ NEVER:**

- Guess component prop names
- Invent HTML structure
- Write PHPXUI code without consulting usage tool

---

#### **🗺️ Routing & Pages**

| Tool              | When to Use                                       | Example Trigger                                           |
| ----------------- | ------------------------------------------------- | --------------------------------------------------------- |
| `pp.listRoutes`   | Before creating routes or showing available pages | "What routes exist?"                                      |
| `pp.route.create` | User wants new page or API endpoint               | "Create /admin/users page", "Add API endpoint /api/posts" |

**`pp.route.create` supports:**

- Static routes: `/about` → `src/app/about/index.php`
- Route groups: `/admin/users` → `src/app/admin/users/index.php`
- Dynamic routes: `/posts/[id]` → `src/app/posts/[id]/index.php`
- Catch-all: `/docs/[...slug]` → `src/app/docs/[...slug]/index.php`
- API routes: `/api/users` → `src/app/api/users/route.php` (if backendOnly enabled)
- Private folders: `/_components` (ignored by router)

**🚨 MUST RUN** `pp.listRoutes` before creating routes to avoid duplicates.

---

#### **🗄️ Database & Prisma ORM**

| Tool                  | When to Use                                               | Example Trigger                            |
| --------------------- | --------------------------------------------------------- | ------------------------------------------ |
| `pp.prisma.prepare`   | **Initial DB setup** - First time or after schema changes | "Setup my database", "I changed my schema" |
| `pp.prisma.generate`  | **After** schema updates (when Prisma already configured) | "Regenerate Prisma client"                 |
| `pp.crud.createGuide` | User needs to INSERT records                              | "How do I create a user?"                  |
| `pp.crud.readGuide`   | User needs to SELECT/QUERY records                        | "Show me how to fetch posts"               |
| `pp.crud.updateGuide` | User needs to UPDATE records                              | "How do I edit a todo?"                    |
| `pp.crud.deleteGuide` | User needs to DELETE records                              | "How do I remove items?"                   |

**Decision flow:**
User mentions database/Prisma

↓

1. Run pp.config.describe

2. Check if prisma: true

3. If true:

   - New setup? → pp.prisma.prepare

   - Schema change? → pp.prisma.generate

   - Need CRUD? → Run appropriate guide tool

4. If false:
   - Offer frontend-only patterns (tools still return frontend examples)

**⚠️ IMPORTANT:**

- `pp.prisma.prepare` is the **all-in-one** setup tool (aligns provider, runs migrations, generates client)
- `pp.prisma.generate` is for **regeneration only** (faster, no migrations)
- CRUD guides return **both** backend (Prisma) and frontend patterns

---

#### **📦 Project Maintenance**

| Tool                     | When to Use                                      | Example Trigger                                 |
| ------------------------ | ------------------------------------------------ | ----------------------------------------------- |
| `pp.project.update`      | User wants to update Prisma PHP framework        | "Update my project"                             |
| `pp.update.filterFiles`  | Before bulk file updates (checks excludeFiles)   | Internal use - before writing to multiple files |
| `pp.generateSwaggerDocs` | After API route changes (if swaggerDocs enabled) | "Update my API docs"                            |

---

### 🎯 Decision Tree (Exhaustive)

User Request
│
├─ ANY code generation
│ └─ 🔴 STOP → Run pp.detectProject + pp.config.describe first
│
├─ "Create/add/build a page"
│ └─ pp.listRoutes → pp.route.create
│
├─ "Use/add Dialog/Toast/Sheet" (PHPXUI)
│ └─ pp.listComponents → pp.component.addPHPXUI → pp.phpxui.component.usage
│
├─ "Add/use icons"
│ └─ pp.component.addPPIcon → pp.ppicons.component.usage
│
├─ "Setup database" / "First time Prisma"
│ └─ pp.prisma.prepare
│
├─ "I changed my schema" / "Regenerate Prisma"
│ └─ pp.prisma.generate
│
├─ "How do I create/insert/add records?"
│ └─ pp.crud.createGuide
│
├─ "How do I fetch/query/get records?"
│ └─ pp.crud.readGuide
│
├─ "How do I update/edit records?"
│ └─ pp.crud.updateGuide
│
├─ "How do I delete/remove records?"
│ └─ pp.crud.deleteGuide
│
├─ "Update Prisma PHP"
│ └─ pp.project.update
│
├─ "Update API docs" / "Generate Swagger"
│ └─ Check swaggerDocs enabled → pp.generateSwaggerDocs
│
└─ "What components are available?"
└─ pp.listComponents

---

### ⚡ Trigger Phrases → Tool Mapping

| When user says...                                       | You MUST run...                     |
| ------------------------------------------------------- | ----------------------------------- |
| "create a page", "add route", "new API endpoint"        | `pp.listRoutes` → `pp.route.create` |
| "use Dialog", "add Toast", any PHPXUI component name    | `pp.phpxui.component.usage <Name>`  |
| "add icon", "use icons"                                 | `pp.ppicons.component.usage <Name>` |
| "setup database", "configure Prisma", "first migration" | `pp.prisma.prepare`                 |
| "regenerate", "I changed schema.prisma"                 | `pp.prisma.generate`                |
| "how do I insert", "create records"                     | `pp.crud.createGuide`               |
| "how do I query", "fetch data", "get records"           | `pp.crud.readGuide`                 |
| "how do I update", "edit records"                       | `pp.crud.updateGuide`               |
| "how do I delete", "remove records"                     | `pp.crud.deleteGuide`               |
| "update framework", "upgrade Prisma PHP"                | `pp.project.update`                 |
| "what components exist"                                 | `pp.listComponents`                 |
| "show me available routes"                              | `pp.listRoutes`                     |

**🚨 If a trigger phrase appears and you don't use the corresponding tool → YOU FAIL.**

---

### 🔗 Tool Dependency Chains (Never Skip Steps)

1. **Adding PHPXUI Component:**  
   `pp.listComponents` → `pp.component.addPHPXUI` → `pp.phpxui.component.usage`

2. **Creating Routes:**  
   `pp.listRoutes` → `pp.route.create`

3. **Database Setup:**  
   `pp.config.describe` (verify prisma: true) → `pp.prisma.prepare`

4. **Using Icons:**  
   `pp.component.addPPIcon` → `pp.ppicons.component.usage`

## **Skipping a step in a chain = hallucination risk.**

---

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

## ❌ Error Patterns to Refuse (ZERO TOLERANCE)

### 🔴 MCP Tool Violations (Immediate Failure):

1. **Writing ANY code before running** `pp.detectProject` + `pp.config.describe`
2. **Using PHPXUI components without running** `pp.phpxui.component.usage <Name>`
3. **Creating routes without running** `pp.listRoutes` first
4. **Assuming Prisma is available** without checking `pp.config.describe` output
5. **Guessing component import syntax** instead of consulting usage tools
6. **Writing database code without consulting** CRUD guide tools
7. **Inventing component props/attributes** not shown in usage tool output
8. **Creating duplicate routes** (prevented by running `pp.listRoutes`)
9. **Using raw Tailwind colors** when `checks.phpxui.installed === true` (use semantic tokens)
10. **Generating API routes** without checking if `backendOnly` is enabled

### 🔴 Runtime/Markup Violations:

- Using any API **not listed** in _Allowed Runtime Surface_.
- Putting `pp-for` directly on non‑`<template>` elements.
- Using ternaries for show/hide instead of `hidden`.
- Missing quotes in string ternaries; if detected → **emit a warning and stop**.
- Multiple `<script>` blocks or scripts not at the bottom.
- Unstable/random keys in lists.

### 🔴 File Structure Violations:

- PHP imports/logic not at the top
- HTML markup not in the middle
- `<script>` block not at the bottom (or multiple script blocks)
- Assuming file paths without consulting `pp.config.describe`

---

### ✅ Correct Pattern (ALWAYS):

1. **Detect** → `pp.detectProject`
2. **Describe** → `pp.config.describe`
3. **Consult specific tools** (routes/components/CRUD)
4. **Generate code** using tool outputs
5. **Verify** structure matches Prisma PHP conventions
```

---

## 🔧 Troubleshooting (If You See These Errors...)

| Error/Issue                                 | Likely Cause                        | Fix                             |
| ------------------------------------------- | ----------------------------------- | ------------------------------- |
| "Class not found: Lib\PHPXUI\Dialog"        | Didn't run `pp.component.addPHPXUI` | Run tool to install component   |
| "Route already exists"                      | Didn't check `pp.listRoutes`        | Run tool to see existing routes |
| "Prisma client not generated"               | Skipped `pp.prisma.generate`        | Run after schema changes        |
| Using `bg-white` instead of `bg-background` | Didn't check PHPXUI installation    | Run `pp.config.describe` first  |
| Inventing component props                   | Didn't check usage tool             | Run `pp.phpxui.component.usage` |
