import { execSync } from "node:child_process";
export function safeExec(cmd, cwd) {
    try {
        // Use stdio: 'pipe' so we don't pollute MCP stdio protocol
        execSync(cmd, { cwd, stdio: "pipe" });
        return { ok: true };
    }
    catch (e) {
        const msg = e?.message ?? String(e);
        // log to stderr only
        console.error(`[pphp-mcp] ${cmd} failed: ${msg}`);
        return { ok: false, message: msg };
    }
}
//# sourceMappingURL=exec.js.map