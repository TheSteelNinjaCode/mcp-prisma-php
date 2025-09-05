import type { Ctx, PrismaPhpConfig } from "../types.js";
export declare function findRoot(startDir?: string): string;
export declare function readConfig(root: string): PrismaPhpConfig | null;
export declare function resolvePHPXUIDir(ctx: Ctx): string;
export declare function ensurePrismaPhpProject(ctx: Ctx): void;
//# sourceMappingURL=project.d.ts.map