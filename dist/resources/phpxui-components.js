export const PHPXUI_COMPONENTS = new Set([
    "Accordion",
    "Alert",
    "AlertDialog",
    "AspectRatio",
    "Avatar",
    "Badge",
    "Breadcrumb",
    "Button",
    "Calendar",
    "Card",
    "Carousel",
    "Chart",
    "Checkbox",
    "Collapsible",
    "Combobox",
    "Command",
    "ContextMenu",
    "DataTable",
    "DatePicker",
    "Dialog",
    "Drawer",
    "DropdownMenu",
    "Form",
    "HoverCard",
    "Input",
    "InputOTP",
    "Label",
    "Menubar",
    "NavigationMenu",
    "Pagination",
    "Popover",
    "Progress",
    "RadioGroup",
    "Resizable",
    "ScrollArea",
    "Select",
    "Separator",
    "Sheet",
    "Sidebar",
    "Skeleton",
    "Slider",
    "ToggleSwitch",
    "Table",
    "Tabs",
    "Textarea",
    "Toast",
    "Toggle",
    "ToggleGroup",
    "Tooltip",
]);
/** Precompute "loose" keys → canonical name. */
const CANONICAL_BY_KEY = (() => {
    const m = new Map();
    for (const n of PHPXUI_COMPONENTS) {
        m.set(n, n); // exact
        m.set(n.toLowerCase(), n);
        m.set(n.replace(/\s+/g, "").toLowerCase(), n);
        m.set(n.replace(/\s+/g, "-").toLowerCase(), n);
        m.set(n.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(), n); // PascalCase → kebab
    }
    return m;
})();
/** Resolve various spellings to the canonical component name (or null). */
export function resolvePhpXUI(name) {
    const raw = (name ?? "").trim();
    if (!raw)
        return null;
    if (PHPXUI_COMPONENTS.has(raw))
        return raw;
    const key = raw
        .replace(/_/g, "-")
        .replace(/\s+/g, "-")
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .toLowerCase();
    return CANONICAL_BY_KEY.get(key) ?? null;
}
/** Lightweight Levenshtein for close-match suggestions. */
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (!m)
        return n;
    if (!n)
        return m;
    const dp = new Array(n + 1);
    for (let j = 0; j <= n; j++)
        dp[j] = j;
    for (let i = 1; i <= m; i++) {
        let prev = dp[0];
        dp[0] = i;
        for (let j = 1; j <= n; j++) {
            const tmp = dp[j];
            dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
            prev = tmp;
        }
    }
    return dp[n];
}
/** Suggest up to N close component names. */
export function suggestPhpXUI(name, limit = 6) {
    const q = (name ?? "")
        .trim()
        .replace(/_/g, "-")
        .replace(/\s+/g, "-")
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .toLowerCase();
    const all = Array.from(PHPXUI_COMPONENTS).map((n) => ({
        n,
        k: n.toLowerCase(),
    }));
    // prefix/contains first (fast & relevant)
    const starts = all.filter(({ k }) => k.startsWith(q)).slice(0, limit);
    if (starts.length)
        return starts.map(({ n }) => n);
    const contains = all.filter(({ k }) => k.includes(q)).slice(0, limit);
    if (contains.length)
        return contains.map(({ n }) => n);
    // edit-distance
    const scored = all
        .map(({ n, k }) => [n, levenshtein(q, k)])
        .sort((a, b) => a[1] - b[1])
        .slice(0, limit);
    const maxDist = q.length <= 4 ? 1 : q.length <= 6 ? 2 : 3;
    return scored.filter(([, d]) => d <= maxDist).map(([n]) => n);
}
//# sourceMappingURL=phpxui-components.js.map