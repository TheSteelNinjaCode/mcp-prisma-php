import path from "node:path";
import { z } from "zod";
import { ensurePrismaPhpProject } from "../utils/project.js";
/**
 * Normalize any path to forward-slash style (stable across Win/Posix),
 * remove leading "./", coalesce duplicate slashes.
 */
function norm(p) {
    return p
        .replace(/\\/g, "/")
        .replace(/^\.\/+/, "")
        .replace(/\/{2,}/g, "/");
}
/** true if value has '*' or '?' */
function hasWildcards(s) {
    return s.includes("*") || s.includes("?");
}
/**
 * Convert a minimal wildcard pattern to RegExp:
 * - '*' -> '.*'
 * - '?' -> '.'
 * Everything else escaped.
 * Anchored ^...$ and case-insensitive on Windows.
 */
function wildcardToRegex(pattern, caseInsensitive) {
    const esc = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&");
    const rx = "^" + esc.replace(/\*/g, ".*").replace(/\?/g, ".") + "$";
    return new RegExp(rx, caseInsensitive ? "i" : undefined);
}
/**
 * Prepare an exclude list into normalized patterns (relative to ROOT where possible).
 * - Absolute entries are converted to relative to ROOT if they are within ROOT; otherwise kept absolute.
 * - Entries ending with '/**' are treated as directory recursive excludes (prefix match).
 * - Entries with '*' or '?' are treated as wildcard patterns against the file's relative path to ROOT.
 * - Otherwise, exact (normalized) path match against relative-to-ROOT.
 */
function prepareExcludes(cfg, ROOT) {
    const caseInsensitive = process.platform === "win32";
    const raw = Array.isArray(cfg.excludeFiles) ? cfg.excludeFiles : [];
    return raw
        .filter((x) => typeof x === "string" && x.trim().length > 0)
        .map((entry) => {
        const original = entry;
        let e = norm(entry.trim());
        // If absolute, attempt to make it relative to ROOT when possible
        if (path.isAbsolute(entry)) {
            const rel = norm(path.relative(ROOT, entry));
            if (!rel.startsWith("..")) {
                e = rel || "."; // inside ROOT
            }
            else {
                // keep absolute normalized
                e = norm(path.resolve(entry));
            }
        }
        const isDirRecursive = e.endsWith("/**");
        const base = isDirRecursive ? e.slice(0, -3) : e;
        const kind = isDirRecursive
            ? "dir"
            : hasWildcards(e)
                ? "wildcard"
                : path.isAbsolute(e)
                    ? "absolute"
                    : "exact";
        const re = kind === "wildcard" ? wildcardToRegex(e, caseInsensitive) : null;
        return { original, e: base, kind, re, caseInsensitive };
    });
}
export function registerUpdateFilterFiles(server, ctx) {
    server.registerTool("pphp.update.filterFiles", {
        title: "Filter files against prisma-php.json excludeFiles",
        description: "Given a list of files (absolute or relative), returns {toUpdate, skipped} based on excludeFiles.",
        inputSchema: {
            // Files to consider (paths can be relative to base or absolute)
            files: z.array(z.string()),
            // Optional base dir to resolve 'files' from (defaults to workspace ROOT)
            base: z.string().optional(),
        },
    }, async (args = { files: [] }) => {
        try {
            ensurePrismaPhpProject(ctx);
            const ROOT = ctx.ROOT;
            // Resolve base
            const baseDir = args.base
                ? path.isAbsolute(args.base)
                    ? args.base
                    : path.resolve(ROOT, args.base)
                : ROOT;
            const excludes = prepareExcludes(ctx.CONFIG, ROOT);
            const toUpdate = [];
            const skipped = [];
            for (const f of args.files) {
                // Resolve to absolute, then to rel-to-ROOT (primary comparison key)
                const abs = path.isAbsolute(f) ? f : path.resolve(baseDir, f);
                const absNorm = norm(path.resolve(abs));
                const relToRoot = norm(path.relative(ROOT, abs));
                const key = relToRoot.startsWith("..") ? absNorm : relToRoot; // prefer relative when inside ROOT
                // Decide match
                let excluded = false;
                let reason = "";
                let match = "";
                for (const ex of excludes) {
                    if (ex.kind === "dir") {
                        // prefix match against rel path (ensure trailing slash in pattern)
                        const pat = ex.e.endsWith("/") ? ex.e : ex.e + "/";
                        const hit = key.startsWith(pat) ||
                            // Also allow exact folder path equals (without trailing slash)
                            key === ex.e;
                        if (hit) {
                            excluded = true;
                            reason = "dir";
                            match = ex.original;
                            break;
                        }
                    }
                    else if (ex.kind === "wildcard") {
                        if (ex.re.test(key)) {
                            excluded = true;
                            reason = "wildcard";
                            match = ex.original;
                            break;
                        }
                    }
                    else if (ex.kind === "exact") {
                        // exact match on rel key; also allow leading './' in config entry
                        const k = key;
                        const e = ex.e.replace(/^\.\//, "");
                        const eq = process.platform === "win32"
                            ? k.toLowerCase() === e.toLowerCase()
                            : k === e;
                        if (eq) {
                            excluded = true;
                            reason = "exact";
                            match = ex.original;
                            break;
                        }
                    }
                    else if (ex.kind === "absolute") {
                        // compare against absolute normalized path key
                        const eq = process.platform === "win32"
                            ? absNorm.toLowerCase() === ex.e.toLowerCase()
                            : absNorm === ex.e;
                        if (eq) {
                            excluded = true;
                            reason = "absolute";
                            match = ex.original;
                            break;
                        }
                    }
                }
                if (excluded) {
                    skipped.push({ file: key, reason, match });
                }
                else {
                    toUpdate.push(key);
                }
            }
            const out = {
                base: norm(baseDir),
                filesCount: args.files.length,
                excludeCount: Array.isArray(ctx.CONFIG?.excludeFiles)
                    ? ctx.CONFIG.excludeFiles.length
                    : 0,
                toUpdate,
                skipped,
                config: {
                    excludeFiles: Array.isArray(ctx.CONFIG?.excludeFiles)
                        ? ctx.CONFIG.excludeFiles
                        : [],
                },
            };
            return {
                content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
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
//# sourceMappingURL=updateFilterFiles.js.map