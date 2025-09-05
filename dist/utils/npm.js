import fs from "node:fs";
import path from "node:path";
export function hasNpmScript(root, name) {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
        return typeof pkg?.scripts?.[name] === "string";
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=npm.js.map