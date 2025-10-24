export function registerDetectProject(server, ctx) {
    server.registerTool("pp.detectProject", {
        title: "Detect Prisma PHP Project",
        description: "Returns true if prisma-php.json exists at the workspace root",
        inputSchema: {}, // ZodRawShape
    }, async () => ({
        content: [{ type: "text", text: String(Boolean(ctx.CONFIG)) }],
    }));
}
//# sourceMappingURL=detectProject.js.map