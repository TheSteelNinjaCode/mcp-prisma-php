export function registerConfigResource(server, ctx) {
    server.registerResource("prisma-php-config", "pphp://config", {
        title: "Prisma PHP Config",
        description: "Contents of prisma-php.json",
        mimeType: "application/json",
    }, async (uri) => ({
        contents: [
            {
                uri: uri.href,
                text: ctx.CONFIG ? JSON.stringify(ctx.CONFIG, null, 2) : "{}",
            },
        ],
    }));
}
//# sourceMappingURL=configResource.js.map