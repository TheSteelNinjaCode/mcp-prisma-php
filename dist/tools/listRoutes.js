import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ensurePrismaPhpProject } from "../utils/project.js";
function norm(p) {
    return p.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
}
function isRouteIndex(filePath) {
    return filePath.includes("/app/") && filePath.endsWith("/index.php");
}
function isLayout(filePath) {
    return filePath.includes("/app/") && filePath.endsWith("/layout.php");
}
/**
 * Convert an index.php under /app/** to a RouteInfo.
 * Returns null for non-routes or malformed paths.
 */
function toRouteInfo(filePath) {
    // Root route: ./src/app/index.php
    if (filePath.endsWith("/app/index.php")) {
        return {
            url: "/",
            path: "",
            filePath,
            isDynamic: false,
            dynamicSegments: [],
            pattern: "^/$",
            routeGroups: [],
        };
    }
    // Match ".../app/<something>/index.php"
    const m = filePath.match(/\/app\/(.*)\/index\.php$/);
    if (!m || m[1] == null)
        return null;
    const routePath = m[1]; // never undefined after guard
    const segments = routePath.split("/");
    let isDynamic = false;
    const dynamicSegments = [];
    const routeGroups = [];
    let urlPattern = "";
    let displayUrl = "";
    for (const segment of segments) {
        // route groups: "(group)"
        if (/^\(.+\)$/.test(segment)) {
            routeGroups.push(segment.slice(1, -1));
            continue;
        }
        if (/^\[.+\]$/.test(segment)) {
            isDynamic = true;
            const inner = segment.slice(1, -1); // "id" or "...slug"
            if (inner.startsWith("...")) {
                const name = inner.slice(3);
                dynamicSegments.push(name);
                urlPattern += "/(.+)";
                displayUrl += `/{...${name}}`;
            }
            else {
                dynamicSegments.push(inner);
                urlPattern += "/([^/]+)";
                displayUrl += `/{${inner}}`;
            }
        }
        else {
            urlPattern += `/${segment}`;
            displayUrl += `/${segment}`;
        }
    }
    const url = (displayUrl || "/").replace(/\/{2,}/g, "/"); // collapse //
    const pattern = `^${urlPattern}$`;
    return {
        url,
        path: routePath,
        filePath,
        isDynamic,
        dynamicSegments,
        pattern,
        routeGroups,
    };
}
export function registerListRoutes(server, ctx) {
    server.registerTool("pp.listRoutes", {
        title: "List file-based routes",
        description: "Parses ./settings/files-list.json and returns all file-based routes (index.php). Skips layout.php by default and marks not-found.php / error.php as special.",
        inputSchema: {
            verifyFiles: z.boolean().optional(),
            includeLayouts: z.boolean().optional(),
            asMap: z.boolean().optional(),
        },
    }, async (args, _extra) => {
        try {
            ensurePrismaPhpProject(ctx);
            const listPath = path.join(ctx.ROOT, "settings", "files-list.json");
            if (!fs.existsSync(listPath)) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "Missing ./settings/files-list.json — cannot list routes. Generate this file and retry.",
                        },
                    ],
                };
            }
            let raw;
            try {
                raw = fs.readFileSync(listPath, "utf8");
            }
            catch (e) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Unable to read files-list.json: ${e?.message ?? e}`,
                        },
                    ],
                };
            }
            let filesParsed;
            try {
                filesParsed = JSON.parse(raw);
            }
            catch (e) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Invalid JSON in files-list.json: ${e?.message ?? e}`,
                        },
                    ],
                };
            }
            if (!Array.isArray(filesParsed) ||
                !filesParsed.every((s) => typeof s === "string")) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "files-list.json must be a JSON array of strings (relative file paths).",
                        },
                    ],
                };
            }
            const files = filesParsed.map(norm);
            const verify = args?.verifyFiles === true;
            const includeLayouts = args?.includeLayouts === true;
            // specials
            const specials = [];
            const addSpecial = (rel, kind) => {
                if (!files.includes(rel))
                    return;
                const abs = path.resolve(ctx.ROOT, rel.replace(/\//g, path.sep));
                const base = {
                    url: null,
                    path: null,
                    filePath: rel,
                    special: kind,
                    ...(verify ? { exists: fs.existsSync(abs) } : {}),
                };
                specials.push(base);
            };
            addSpecial("./src/app/not-found.php", "not-found");
            addSpecial("./src/app/error.php", "error");
            // routes (index.php under /app)
            const routes = [];
            for (const rel of files) {
                if (!isRouteIndex(rel))
                    continue;
                const info = toRouteInfo(rel);
                if (!info)
                    continue;
                if (verify) {
                    const abs = path.resolve(ctx.ROOT, rel.replace(/\//g, path.sep));
                    routes.push({ ...info, exists: fs.existsSync(abs) });
                }
                else {
                    routes.push(info);
                }
            }
            // layouts (optional; listed for context, not routes)
            const layouts = [];
            if (includeLayouts) {
                for (const rel of files) {
                    if (!isLayout(rel))
                        continue;
                    const m = rel.match(/\/app\/(.*)\/layout\.php$/);
                    const layoutPath = m && m[1] != null ? m[1] : "";
                    const segments = layoutPath ? layoutPath.split("/") : [];
                    const routeGroups = [];
                    let displayUrl = "";
                    for (const seg of segments) {
                        if (/^\(.+\)$/.test(seg)) {
                            routeGroups.push(seg.slice(1, -1));
                            continue;
                        }
                        displayUrl += `/${seg}`;
                    }
                    const urlCtx = (displayUrl || "/").replace(/\/{2,}/g, "/");
                    const base = {
                        url: urlCtx,
                        path: layoutPath || "",
                        filePath: rel,
                        routeGroups,
                        ...(verify
                            ? {
                                exists: fs.existsSync(path.resolve(ctx.ROOT, rel.replace(/\//g, path.sep))),
                            }
                            : {}),
                    };
                    layouts.push(base);
                }
            }
            // Sort routes: static first, then dynamic, then alphabetically
            routes.sort((a, b) => {
                const ad = a.isDynamic === true;
                const bd = b.isDynamic === true;
                if (ad && !bd)
                    return 1;
                if (!ad && bd)
                    return -1;
                return (a.url ?? "").localeCompare(b.url ?? "");
            });
            const payload = {
                routes,
                specials,
                ...(includeLayouts ? { layouts } : {}),
            };
            if (args?.asMap) {
                const map = {};
                for (const r of routes) {
                    // routes always have url
                    map[r.url] = r;
                }
                for (const s of specials) {
                    map[`special:${s.special}`] = s;
                }
                if (includeLayouts) {
                    for (const l of layouts) {
                        map[`layout:${l.url}`] = l;
                    }
                }
                return {
                    content: [{ type: "text", text: JSON.stringify(map, null, 2) }],
                };
            }
            return {
                content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
            };
        }
        catch (e) {
            return {
                isError: true,
                content: [{ type: "text", text: e?.message ?? String(e) }],
            };
        }
    });
}
//# sourceMappingURL=listRoutes.js.map