export function registerGetConfig(server, ctx) {
    server.registerTool("pphp.config.get", {
        title: "Get prisma-php.json",
        description: "Returns the raw contents of prisma-php.json from the workspace root",
        inputSchema: {}, // ZodRawShape (empty)
    }, async () => {
        return {
            content: [
                { type: "text", text: JSON.stringify(ctx.CONFIG ?? {}, null, 2) },
            ],
        };
    });
}
//# sourceMappingURL=getConfig.js.map