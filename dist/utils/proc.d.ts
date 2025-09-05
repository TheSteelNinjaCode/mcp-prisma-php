/** Spawn a child process detached from MCP stdio. */
export declare function spawnDetached(command: string, args: string[], cwd: string): {
    ok: true;
    pid: number;
} | {
    ok: false;
    message: string;
};
/** Windows-only: open a new interactive terminal window running the given command line. */
export declare function spawnExternalTerminalWindows(commandLine: string, cwd: string): {
    ok: true;
} | {
    ok: false;
    message: string;
};
//# sourceMappingURL=proc.d.ts.map