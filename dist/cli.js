#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Keep your existing helpers if you want:
import { findRoot, readConfig } from "./utils/project.js";
// --- tiny helpers ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function resolveTemplatesDir() {
    const distTpl = path.join(__dirname, "templates");
    if (fs.existsSync(distTpl))
        return distTpl;
    throw new Error(`Templates not found at:\n  ${distTpl}`);
}
const TEMPLATES_DIR = resolveTemplatesDir();
function logOk(msg) {
    console.log("✔︎", msg);
}
function logWarn(msg) {
    console.warn("⚠️", msg);
}
function logInfo(msg) {
    console.log("ℹ️", msg);
}
function getFlag(name) {
    const i = process.argv.findIndex((v) => v === `--${name}` || v.startsWith(`--${name}=`));
    if (i === -1)
        return undefined;
    const v = process.argv[i];
    if (v && v.includes("="))
        return v.split("=")[1];
    const next = process.argv[i + 1];
    if (!next || next.startsWith("--"))
        return true;
    return next;
}
function copyFileSafe(src, dst, { force = false } = {}) {
    if (!force && fs.existsSync(dst)) {
        logWarn(`Skipped existing ${path.relative(process.cwd(), dst)} (use --force to overwrite)`);
        return false;
    }
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    logOk(`Wrote ${path.relative(process.cwd(), dst)}`);
    return true;
}
async function cmdInit() {
    const force = !!getFlag("force");
    const rootArg = getFlag("root") || process.cwd();
    const ROOT = findRoot(rootArg);
    // 1) Scaffold copilot-instructions.md at project root
    const srcCopilot = path.join(TEMPLATES_DIR, "copilot-instructions.md");
    const dstCopilot = path.join(ROOT, "copilot-instructions.md");
    copyFileSafe(srcCopilot, dstCopilot, { force });
    // 2) Scaffold .vscode/mcp.json
    const srcMcp = path.join(TEMPLATES_DIR, "vscode", "mcp.json");
    const dstMcp = path.join(ROOT, ".vscode", "mcp.json");
    copyFileSafe(srcMcp, dstMcp, { force });
    // 2.5) .vscode/settings.json (copy the template)
    const srcSettingsTpl = path.join(TEMPLATES_DIR, "vscode", "settings.json");
    const dstSettings = path.join(ROOT, ".vscode", "settings.json");
    if (fs.existsSync(srcSettingsTpl)) {
        copyFileSafe(srcSettingsTpl, dstSettings, { force });
    }
    else {
        logWarn(`Template not found: ${srcSettingsTpl}`);
    }
    // 3) Optionally add Copilot settings (opt-in)
    const updateSettings = getFlag("update-settings");
    if (updateSettings) {
        const settingsPath = path.join(ROOT, ".vscode", "settings.json");
        let settings = {};
        if (fs.existsSync(settingsPath)) {
            try {
                // VS Code allows comments; for simplicity we only handle pure JSON.
                // If parsing fails, we won’t touch it.
                settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
            }
            catch {
                logWarn("Could not parse .vscode/settings.json; add the Copilot setting manually.");
            }
        }
        const key = "github.copilot.chat.workspaceInstructions";
        if (!settings[key]) {
            settings[key] = "${workspaceFolder}/copilot-instructions.md";
            fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
            logOk(`Added ${key} to .vscode/settings.json`);
        }
        else {
            logInfo(`Setting already present: ${key}`);
        }
    }
    logOk("MCP init complete.");
    logInfo("Tip: In VS Code, ensure the MCP extension reads .vscode/mcp.json.");
}
// --- entrypoint ---
(async () => {
    const sub = process.argv[2];
    if (sub === "init") {
        await cmdInit();
        return;
    }
    if (sub === "doctor") {
        // (Optional) add checks: PATH, Node version, etc.
        logInfo("Doctor not implemented yet.");
        return;
    }
    // Default: run the stdio MCP server
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
    // Reuse your existing server setup (moved to a function for reuse):
    const { startServer } = await import("./server.js");
    const server = await startServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
})();
//# sourceMappingURL=cli.js.map