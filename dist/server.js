import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { findRoot, readConfig } from "./utils/project.js";
function getArg(name) {
    const i = process.argv.indexOf(`--${name}`);
    return i !== -1 ? process.argv[i + 1] : undefined;
}
export async function startServer() {
    const rootArg = getArg("root");
    const ROOT = findRoot(rootArg || process.env.PRISMA_PHP_ROOT || process.cwd());
    const CONFIG = readConfig(ROOT);
    const ctx = { ROOT, CONFIG };
    const server = new McpServer({ name: "prisma-php-mcp", version: "0.1.0" });
    const { registerResources } = await import("./resources/index.js");
    const { registerTools } = await import("./tools/index.js");
    registerResources(server, ctx);
    registerTools(server, ctx);
    return server;
}
//# sourceMappingURL=server.js.map