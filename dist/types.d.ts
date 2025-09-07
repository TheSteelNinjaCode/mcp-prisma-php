export interface PrismaPhpConfig {
    projectName?: string;
    projectRootPath?: string;
    phpEnvironment?: string;
    phpRootPathExe?: string;
    bsTarget?: string;
    bsPathRewrite?: Record<string, string>;
    backendOnly?: boolean;
    swaggerDocs?: boolean;
    tailwindcss?: boolean;
    websocket?: boolean;
    mcp?: boolean;
    prisma?: boolean;
    docker?: boolean;
    version?: string;
    excludeFiles?: string[];
    paths?: {
        phpxui?: string;
        cli?: string;
        root?: string;
    };
    [k: string]: unknown;
}
export interface Ctx {
    ROOT: string;
    CONFIG: PrismaPhpConfig | null;
}
//# sourceMappingURL=types.d.ts.map