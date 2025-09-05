// src/tools/scaffoldDashboard.ts
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ensurePrismaPhpProject } from "../utils/project.js";
function norm(p) {
    return p.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
}
function phpEscape(str) {
    return String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
function readJsonSafe(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    }
    catch {
        return null;
    }
}
export function registerScaffoldDashboard(server, ctx) {
    server.registerTool("pphp.scaffold.dashboard", {
        title: "Scaffold dashboard route",
        description: "Creates ./src/app/<route>/index.php and layout.php with Prisma PHP conventions. Reads prisma-php.json to decide Tailwind v4 vs inline CSS.",
        inputSchema: {
            route: z.string().optional(), // default: "dashboard"
            title: z.string().optional(), // default: "Dashboard"
            description: z.string().optional(), // default: "Overview of key metrics"
            force: z.boolean().optional(), // default: false
        },
    }, async (args, _extra) => {
        try {
            ensurePrismaPhpProject(ctx);
            // 1) Read project config to decide styling
            const cfgPath = path.join(ctx.ROOT, "prisma-php.json");
            const cfg = readJsonSafe(cfgPath) ?? {};
            const usingTailwind = !!cfg.tailwindcss; // if true => Tailwind v4 classes; else inline CSS
            // 2) Normalize inputs
            const route = (args?.route ?? "dashboard").replace(/^\/*|\/*$/g, "");
            const title = args?.title ?? "Dashboard";
            const description = args?.description ?? "Overview of key metrics";
            const force = !!args?.force;
            // 3) Paths
            const baseDir = path.join(ctx.ROOT, "src", "app", route);
            const indexPath = path.join(baseDir, "index.php");
            const layoutPath = path.join(baseDir, "layout.php");
            fs.mkdirSync(baseDir, { recursive: true });
            // 4) Templates (NO <script> tags by default — optional/only if needed)
            const layoutHtml = usingTailwind
                ? `
<!-- HTML (shared route chrome) -->
<div class="min-h-dvh w-full">
  <main class="p-4 lg:p-6">
    <?= MainLayout::$childLayoutChildren; ?>
  </main>
</div>
`.trim()
                : `
<!-- HTML (shared route chrome) -->
<div style="min-height:100vh;width:100%;">
  <main style="padding:16px;">
    <?= MainLayout::$childLayoutChildren; ?>
  </main>
</div>
`.trim();
            const indexHtml = usingTailwind
                ? `
<!-- HTML: route page content -->
<section class="grid gap-4">
  <h1 class="text-2xl font-bold">${phpEscape(title)}</h1>
  <p class="text-neutral-600">${phpEscape(description)}</p>
</section>
`.trim()
                : `
<!-- HTML: route page content -->
<section>
  <h1 style="font-size:20px;font-weight:700;margin:0 0 8px 0;">${phpEscape(title)}</h1>
  <p style="opacity:0.8;margin:0;">${phpEscape(description)}</p>
</section>
`.trim();
            const indexPhp = `<?php
use Lib\\MainLayout;

MainLayout::$title = '${phpEscape(title)}';
MainLayout::$description = '${phpEscape(description)}';
?>

${indexHtml}
`;
            const layoutPhp = `<?php
use Lib\\MainLayout;
?>

${layoutHtml}
`;
            // 5) Write files (idempotent; respect --force)
            const results = [];
            const write = (file, content) => {
                if (!force && fs.existsSync(file)) {
                    // If it's the layout and it *doesn't* include the child placeholder, patch it in.
                    if (file.endsWith("layout.php")) {
                        const current = fs.readFileSync(file, "utf8");
                        if (!current.includes("<?= MainLayout::$childLayoutChildren; ?>")) {
                            // Insert before closing main/div/body/html if possible; else append.
                            const patched = current.replace(/<\/main>|<\/div>|<\/body>|<\/html>/i, `\n  <?= MainLayout::$childLayoutChildren; ?>\n$&`) || current + `\n<?= MainLayout::$childLayoutChildren; ?>\n`;
                            fs.writeFileSync(file, patched, "utf8");
                            results.push({
                                file: norm(path.relative(ctx.ROOT, file)),
                                created: false,
                                reason: "patched: inserted MainLayout::$childLayoutChildren",
                            });
                        }
                        else {
                            results.push({
                                file: norm(path.relative(ctx.ROOT, file)),
                                created: false,
                                reason: "exists",
                            });
                        }
                    }
                    else {
                        results.push({
                            file: norm(path.relative(ctx.ROOT, file)),
                            created: false,
                            reason: "exists",
                        });
                    }
                }
                else {
                    fs.writeFileSync(file, content, "utf8");
                    results.push({
                        file: norm(path.relative(ctx.ROOT, file)),
                        created: true,
                    });
                }
            };
            write(indexPath, indexPhp);
            write(layoutPath, layoutPhp);
            const payload = {
                ok: true,
                message: `Scaffolded route "./src/app/${route}"`,
                uiStyle: usingTailwind ? "tailwind" : "inline-css",
                details: results,
                notes: [
                    "index.php = route page content; layout.php = shared UI chrome.",
                    "layout.php must render <?= MainLayout::$childLayoutChildren; ?>.",
                    "No <script> tags added by default; add only when needed.",
                ],
            };
            return {
                content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
            };
        }
        catch (e) {
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Failed to scaffold dashboard: ${e?.message ?? String(e)}`,
                    },
                ],
            };
        }
    });
}
//# sourceMappingURL=scaffoldDashboard.js.map