# Prisma PHP MCP

Prisma PHP MCP is a toolkit and server for Model Context Protocol (MCP) projects using Prisma ORM in PHP environments. It provides a suite of tools for code generation, project management, and best practices enforcement, designed for AI-assisted development workflows.

## Features

- **Component Management**: Add PHPXUI and PPIcon components with catalog support.
- **Project Detection & Description**: Detects and describes Prisma PHP projects, validating configuration and paths.
- **Swagger Docs Generation**: Automates OpenAPI documentation if enabled.
- **Prisma ORM Integration**: Prepares, migrates, and generates ORM code for PHP projects.
- **CRUD Guides**: Built-in guides for Create, Read, Update, and Delete operations.
- **NPM Script Automation**: Run dev servers and arbitrary scripts with Windows compatibility.
- **Filter & Route Listing**: List components, routes, and update filter files.

## AI Code Generation Rules

To ensure clean, maintainable, and robust code, AI agents must follow these rules:

### 1. **Project Structure & Naming**

- Use clear, descriptive names for files, functions, and variables.
- Organize code by feature and responsibility (e.g., tools, resources, utils).
- Avoid unnecessary nesting and keep directory structure flat where possible.

### 2. **Type Safety & Validation**

- Use Zod schemas for input validation and type inference.
- Always validate external inputs and configuration files.
- Prefer explicit types over implicit ones.

### 3. **Error Handling**

- Handle errors gracefully and provide actionable messages.
- Use try/catch blocks for async operations and file I/O.
- Return structured error objects for MCP tools.

### 4. **Best Practices**

- Follow PSR standards for PHP code and TypeScript conventions for tooling.
- Keep functions pure where possible; avoid side effects.
- Document all exported functions and tools with JSDoc or PHPDoc.
- Prefer composition over inheritance.

### 5. **Security & Environment**

- Never expose secrets or sensitive data in logs or errors.
- Use environment variables for configuration, and validate their presence.
- Sanitize all user inputs and outputs.

### 6. **Automation & Tooling**

- Automate repetitive tasks (e.g., migrations, code generation, documentation).
- Ensure all tools are registered in `tools.json` and documented in the README.
- Prefer CLI commands that work cross-platform (Windows, Linux, Mac).

### 7. **Testing & Validation**

- Write tests for critical logic and validation functions.
- Use MCP tool output for integration testing.
- Validate changes with linting and type checks before merging.

### 8. **Documentation**

- Keep this README up to date with all available tools and features.
- Document new tools and guides as they are added.
- Provide usage examples for each tool where possible.

## Available Tools

See `tools.json` for a full list. Key tools include:

- `addPHPXUIComponent` — Add UI components
- `addPPIconComponent` — Add icon components
- `describeConfig` — Describe project config
- `detectProject` — Detect project presence
- `generateSwaggerDocs` — Generate Swagger docs
- `getConfig` — Get raw config
- `listComponents` — List UI components
- `listRoutes` — List all routes
- `prismaGenerate` — Generate ORM code
- `prismaPrepare` — Prepare database and ORM
- `crudCreateGuide`, `crudReadGuide`, `crudUpdateGuide`, `crudDeleteGuide` — CRUD operation guides
- `runNpmScript` — Run dev server and scripts
- `updateFilterFiles`, `updateProject` — Update filters and project
- `createRoute` — Create a new route in the project
- `phpxuiComponentUsage` — Analyze and report usage of PHPXUI components

## Setup & Initialization

You can install and initialize MCP Prisma PHP either locally (per project) or globally:

### Local (per-project)

```sh
npm i -D mcp-prisma-php
npx mcp-prisma-php init
```

### Global

```sh
npm i -g mcp-prisma-php
cd your-project
mcp-prisma-php init
```

After installing, always run the initialization command to set up the required rules, settings, and MCP configuration for VSCode and AI agents. Use `--force` to overwrite any existing configuration if you need a clean setup:

```sh
mcp-prisma-php init --force
```

These commands will:

- Copy the required rules, settings, and MCP configuration files into your project and VSCode editor.
- Ensure the AI agent and code tools follow the Prisma PHP pattern and best practices.
- Use `--force` to overwrite any existing configuration if you need a clean setup.

**Always run these commands after installing or updating the package to enable full AI and MCP support.**

## Contributing

- Follow all AI code generation rules above.
- Register new tools in `tools.json` and document them here.
- Submit PRs with clear descriptions and test coverage.

---

For more details, see the source code and comments in each tool. AI agents should always follow the rules above to ensure code quality and maintainability.

## GitHub Repository

The complete source code for MCP Prisma PHP is hosted on GitHub:

[TheSteelNinjaCode/mcp-prisma-php](https://github.com/TheSteelNinjaCode/mcp-prisma-php.git)

Visit the repository for installation instructions, code samples, issue tracking, and contribution guidelines.
