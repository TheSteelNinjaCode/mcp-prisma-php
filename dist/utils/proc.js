import { spawn } from "node:child_process";
/** Spawn a child process detached from MCP stdio. */
export function spawnDetached(command, args, cwd) {
    try {
        const child = spawn(command, args, {
            cwd,
            detached: true,
            stdio: "ignore",
            shell: false,
            windowsHide: true,
        });
        child.unref();
        return { ok: true, pid: child.pid ?? -1 };
    }
    catch (e) {
        return { ok: false, message: e?.message ?? String(e) };
    }
}
/** Windows-only: open a new interactive terminal window running the given command line. */
export function spawnExternalTerminalWindows(commandLine, cwd) {
    try {
        // `start "" cmd /k <commandLine>` opens a new window and keeps it open
        const child = spawn("cmd.exe", ["/c", "start", '""', "cmd.exe", "/k", commandLine], {
            cwd,
            detached: true,
            stdio: "ignore",
            windowsHide: false,
            windowsVerbatimArguments: true,
        });
        child.unref();
        return { ok: true };
    }
    catch (e) {
        return { ok: false, message: e?.message ?? String(e) };
    }
}
//# sourceMappingURL=proc.js.map