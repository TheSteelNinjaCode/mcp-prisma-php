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
function parseRoutePattern(route) {
    const segments = route.split("/").filter(Boolean);
    const parsedSegments = segments.map((segment) => {
        // Route group: (admin)
        if (segment.startsWith("(") && segment.endsWith(")")) {
            return { type: "group", name: segment.slice(1, -1), urlSegment: null };
        }
        // Private folder: _components
        if (segment.startsWith("_")) {
            return { type: "private", name: segment, urlSegment: null };
        }
        // Catch-all dynamic: [...slug]
        if (segment.startsWith("[...") && segment.endsWith("]")) {
            const param = segment.slice(4, -1);
            return {
                type: "catchall",
                name: segment,
                param,
                urlSegment: `[...${param}]`,
            };
        }
        // Single dynamic: [slug]
        if (segment.startsWith("[") && segment.endsWith("]")) {
            const param = segment.slice(1, -1);
            return {
                type: "dynamic",
                name: segment,
                param,
                urlSegment: `[${param}]`,
            };
        }
        // Regular segment
        return { type: "static", name: segment, urlSegment: segment };
    });
    const urlPath = "/" +
        parsedSegments
            .filter((seg) => seg.urlSegment !== null)
            .map((seg) => seg.urlSegment)
            .join("/");
    return {
        segments: parsedSegments,
        urlPath: urlPath === "/" ? "/" : urlPath.replace(/\/$/, ""),
    };
}
export function registerCreateRoute(server, ctx) {
    server.registerTool("pphp.route.create", {
        title: "Create Route",
        description: "Creates routes following Prisma PHP conventions. Supports static routes, route groups (admin), " +
            "private folders (_components), dynamic routes ([slug], [...slug]), and API handlers. " +
            "Creates index.php (pages) or route.php (APIs) based on backendOnly config.",
        inputSchema: {
            route: z.string(), // e.g., "dashboard", "(admin)/users", "blog/[slug]", "_components/Card"
            title: z.string().optional(),
            description: z.string().optional(),
            withLayout: z.boolean().optional(), // Create layout.php for shared UI
            apiHandler: z.boolean().optional(), // Force route.php creation (overrides backendOnly)
            force: z.boolean().optional(),
        },
    }, async (args, _extra) => {
        try {
            ensurePrismaPhpProject(ctx);
            // 1) Read project config
            const cfgPath = path.join(ctx.ROOT, "prisma-php.json");
            const cfg = readJsonSafe(cfgPath) ?? {};
            const backendOnly = !!cfg.backendOnly;
            const usingTailwind = !!cfg.tailwindcss;
            // 2) Parse route pattern
            const routeInput = args.route.replace(/^\/+|\/+$/g, ""); // trim slashes
            const isHome = routeInput === "" || routeInput === "home";
            const { segments, urlPath } = parseRoutePattern(routeInput);
            // 3) Determine file creation strategy
            const createApiHandler = args.apiHandler || backendOnly;
            const withLayout = !!args.withLayout && !createApiHandler; // layouts only for pages
            const force = !!args.force;
            // 4) Build file paths
            const folderPath = isHome
                ? path.join(ctx.ROOT, "src", "app")
                : path.join(ctx.ROOT, "src", "app", ...segments.map((s) => s.name));
            const fileName = createApiHandler ? "route.php" : "index.php";
            const routeFilePath = path.join(folderPath, fileName);
            const layoutFilePath = withLayout
                ? path.join(folderPath, "layout.php")
                : null;
            // 5) Generate display info
            const staticSegment = segments.filter((s) => s.type === "static").pop();
            const routeTitle = args.title ||
                (staticSegment && staticSegment.name
                    ? staticSegment.name.charAt(0).toUpperCase() +
                        staticSegment.name.slice(1)
                    : "Home");
            const description = args.description ||
                `${routeTitle} ${createApiHandler ? "API handler" : "page"}`;
            fs.mkdirSync(folderPath, { recursive: true });
            const results = [];
            // 6) Generate route content
            let routeContent;
            if (createApiHandler) {
                // API route handler (route.php)
                const dynamicParams = segments
                    .filter((s) => s.type === "dynamic" || s.type === "catchall")
                    .map((s) => s.param)
                    .filter(Boolean);
                const paramComments = dynamicParams.length > 0
                    ? `\n// Available dynamic params: ${dynamicParams.join(", ")}\n// Access via: Request::$dynamicParams['${dynamicParams[0]}']`
                    : "";
                routeContent = `<?php
use Lib\\Request;
use Lib\\Response;

// ${description}${paramComments}

$method = Request::method();

switch ($method) {
    case 'GET':
        $data = [
            'route' => '${phpEscape(urlPath)}',
            'message' => '${phpEscape(description)}',
            'params' => Request::$params,
            'dynamicParams' => Request::$dynamicParams,
        ];
        Response::json($data);
        break;
        
    case 'POST':
        $body = Request::body();
        // TODO: Implement POST logic
        Response::json(['message' => 'Created successfully'], 201);
        break;
        
    case 'PUT':
    case 'PATCH':
        $body = Request::body();
        // TODO: Implement UPDATE logic
        Response::json(['message' => 'Updated successfully']);
        break;
        
    case 'DELETE':
        // TODO: Implement DELETE logic
        Response::json(['message' => 'Deleted successfully']);
        break;
        
    default:
        Response::json(['error' => 'Method not allowed'], 405);
        break;
}
`;
            }
            else {
                // Page route (index.php)
                const dynamicParams = segments
                    .filter((s) => s.type === "dynamic" || s.type === "catchall")
                    .map((s) => s.param)
                    .filter(Boolean);
                let dynamicParamCode = "";
                if (dynamicParams.length > 0) {
                    dynamicParamCode = `
// Dynamic route parameters
$params = Request::$dynamicParams;
${dynamicParams
                        .map((param) => `$${param} = $params['${param}'] ?? null;`)
                        .join("\n")}
`;
                }
                const htmlContent = usingTailwind
                    ? generateTailwindContent(routeTitle, description, urlPath, dynamicParams.filter((p) => typeof p === "string"))
                    : generateInlineContent(routeTitle, description, urlPath, dynamicParams.filter((p) => typeof p === "string"));
                routeContent = `<?php
use Lib\\MainLayout;
${dynamicParamCode}
MainLayout::$title = '${phpEscape(routeTitle)}';
MainLayout::$description = '${phpEscape(description)}';
?>

${htmlContent}
`;
            }
            // 7) Generate layout content if requested
            let layoutContent = null;
            if (withLayout) {
                const layoutHtml = usingTailwind
                    ? `
<!-- Shared UI for ${routeTitle} section -->
<div class="min-h-screen bg-gray-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Add shared navigation, sidebar, etc. -->
    <nav class="mb-8">
      <div class="flex items-center space-x-4">
        <h2 class="text-lg font-semibold text-gray-900">${phpEscape(routeTitle)} Section</h2>
        <!-- Add navigation items -->
      </div>
    </nav>
    
    <!-- Child routes render here -->
    <?= MainLayout::$childLayoutChildren; ?>
  </div>
</div>
`.trim()
                    : `
<!-- Shared UI for ${routeTitle} section -->
<div style="min-height:100vh;background:#f9fafb;">
  <div style="max-width:1280px;margin:0 auto;padding:32px 16px;">
    <!-- Add shared navigation, sidebar, etc. -->
    <nav style="margin-bottom:32px;">
      <div style="display:flex;align-items:center;gap:16px;">
        <h2 style="font-size:18px;font-weight:600;color:#111827;margin:0;">${phpEscape(routeTitle)} Section</h2>
        <!-- Add navigation items -->
      </div>
    </nav>
    
    <!-- Child routes render here -->
    <?= MainLayout::$childLayoutChildren; ?>
  </div>
</div>
`.trim();
                layoutContent = `<?php
use Lib\\MainLayout;
?>

${layoutHtml}
`;
            }
            // 8) Write files
            const writeFile = (filePath, content, type) => {
                const result = {
                    file: norm(path.relative(ctx.ROOT, filePath)),
                    created: false,
                    type,
                    reason: "",
                };
                if (!force && fs.existsSync(filePath)) {
                    result.reason = "exists";
                }
                else {
                    fs.writeFileSync(filePath, content, "utf8");
                    result.created = true;
                }
                results.push(result);
            };
            // Write route file
            writeFile(routeFilePath, routeContent, createApiHandler ? "api-route" : "page-route");
            // Write layout file if requested
            if (layoutContent && layoutFilePath) {
                writeFile(layoutFilePath, layoutContent, "layout");
            }
            // 9) Analyze route type for response
            const hasGroups = segments.some((s) => s.type === "group");
            const hasPrivate = segments.some((s) => s.type === "private");
            const hasDynamic = segments.some((s) => s.type === "dynamic" || s.type === "catchall");
            const routeAnalysis = {
                urlPath,
                isHome,
                hasRouteGroups: hasGroups,
                hasPrivateFolders: hasPrivate,
                hasDynamicParams: hasDynamic,
                dynamicParams: segments
                    .filter((s) => s.type === "dynamic" || s.type === "catchall")
                    .map((s) => ({ param: s.param, type: s.type })),
            };
            const payload = {
                ok: true,
                message: `Created ${createApiHandler ? "API route" : "page route"}: ${urlPath}`,
                routeAnalysis,
                backendOnly,
                usingTailwind,
                withLayout,
                details: results,
                notes: [
                    hasGroups &&
                        "Route groups (admin) organize code without affecting URLs",
                    hasPrivate && "Private folders (_name) are excluded from routing",
                    hasDynamic &&
                        "Dynamic params available via Request::$dynamicParams",
                    withLayout && "Layout provides shared UI for this route section",
                ].filter(Boolean),
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
                        text: `Failed to create route: ${e?.message ?? String(e)}`,
                    },
                ],
            };
        }
    });
}
function generateTailwindContent(title, description, urlPath, dynamicParams) {
    const paramDisplay = dynamicParams.length > 0
        ? `
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <h3 class="text-sm font-medium text-blue-800 mb-2">Dynamic Parameters</h3>
      <div class="text-sm text-blue-700 font-mono">
        <?php if (!empty(Request::$dynamicParams)): ?>
          <?= json_encode(Request::$dynamicParams, JSON_PRETTY_PRINT); ?>
        <?php else: ?>
          No parameters available
        <?php endif; ?>
      </div>
    </div>`
        : "";
    return `
<!-- ${title} page -->
<section class="container mx-auto max-w-4xl p-6">
  <header class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">${phpEscape(title)}</h1>
    <p class="text-lg text-gray-600">${phpEscape(description)}</p>
    <div class="mt-2 text-sm text-gray-500 font-mono">${phpEscape(urlPath)}</div>
  </header>
  ${paramDisplay}
  
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-4">Welcome to ${phpEscape(title)}</h2>
    <p class="text-gray-700 mb-4">This is your ${phpEscape(title.toLowerCase())} page content area.</p>
    
    <!-- Add your page content here -->
    <div class="prose max-w-none">
      <p>Start building your page content here. This route was created following Prisma PHP conventions.</p>
    </div>
  </div>
</section>
`.trim();
}
function generateInlineContent(title, description, urlPath, dynamicParams) {
    const paramDisplay = dynamicParams.length > 0
        ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:24px;">
      <h3 style="font-size:14px;font-weight:500;color:#1e40af;margin:0 0 8px 0;">Dynamic Parameters</h3>
      <div style="font-size:14px;color:#1d4ed8;font-family:monospace;">
        <?php if (!empty(Request::$dynamicParams)): ?>
          <?= json_encode(Request::$dynamicParams, JSON_PRETTY_PRINT); ?>
        <?php else: ?>
          No parameters available
        <?php endif; ?>
      </div>
    </div>`
        : "";
    return `
<!-- ${title} page -->
<section style="max-width:896px;margin:0 auto;padding:24px;">
  <header style="margin-bottom:32px;">
    <h1 style="font-size:30px;font-weight:bold;color:#111827;margin:0 0 8px 0;">${phpEscape(title)}</h1>
    <p style="font-size:18px;color:#4b5563;margin:0;">${phpEscape(description)}</p>
    <div style="margin-top:8px;font-size:14px;color:#6b7280;font-family:monospace;">${phpEscape(urlPath)}</div>
  </header>
  ${paramDisplay}
  
  <div style="background:white;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);border:1px solid #e5e7eb;padding:24px;">
    <h2 style="font-size:20px;font-weight:600;color:#111827;margin:0 0 16px 0;">Welcome to ${phpEscape(title)}</h2>
    <p style="color:#374151;margin:0 0 16px 0;">This is your ${phpEscape(title.toLowerCase())} page content area.</p>
    
    <!-- Add your page content here -->
    <div style="line-height:1.7;color:#374151;">
      <p>Start building your page content here. This route was created following Prisma PHP conventions.</p>
    </div>
  </div>
</section>
`.trim();
}
//# sourceMappingURL=createRoute.js.map