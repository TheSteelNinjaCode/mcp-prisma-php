import fs from "node:fs";
import path from "node:path";
export function findRoot(startDir = process.cwd()) {
    let dir = startDir;
    while (true) {
        if (fs.existsSync(path.join(dir, "prisma-php.json")))
            return dir;
        const parent = path.dirname(dir);
        if (parent === dir)
            return startDir;
        dir = parent;
    }
}
export function readConfig(root) {
    const file = path.join(root, "prisma-php.json");
    if (!fs.existsSync(file))
        return null;
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    }
    catch {
        return null;
    }
}
export function resolvePHPXUIDir(ctx) {
    return path.join(ctx.ROOT, ctx.CONFIG?.paths?.phpxui ?? "Lib/PHPXUI");
}
export function ensurePrismaPhpProject(ctx) {
    if (!ctx.CONFIG) {
        throw new Error("Not a Prisma PHP project: prisma-php.json was not found at or above the workspace.");
    }
}
//# sourceMappingURL=project.js.map