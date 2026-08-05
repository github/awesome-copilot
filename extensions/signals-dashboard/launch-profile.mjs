const PROFILES = new Set(["repo", "connected"]);
const SAFE_MCP_NAME = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function isDeskProfile(value) {
    return typeof value === "string" && PROFILES.has(value.toLowerCase());
}

export function normalizeDeskProfile(value, fallback = "repo") {
    return isDeskProfile(value) ? value.toLowerCase() : fallback;
}

export function isWindowsAppExecutionAlias(candidate, localAppData) {
    if (typeof candidate !== "string" || typeof localAppData !== "string") return false;
    const normalized = candidate.replaceAll("/", "\\").toLowerCase();
    const root = `${localAppData.replaceAll("/", "\\").replace(/\\+$/, "")}` +
        "\\microsoft\\windowsapps\\";
    return normalized.startsWith(root.toLowerCase()) && normalized.endsWith(".exe");
}

export function quoteWindowsCmdArgument(value) {
    return `"${String(value).replaceAll('"', '""')}"`;
}

export function isSafeWindowsCmdShim(value) {
    return typeof value === "string" && !/[%\r\n]/.test(value);
}

export function parsePluginMcpNames(text) {
    let parsed;
    try { parsed = JSON.parse(text); }
    catch {
        // Agency may prefix its pass-through command with human-readable startup
        // lines. Its underlying Copilot JSON is the final object in stdout.
        let start = text.lastIndexOf("{");
        while (start >= 0) {
            try {
                parsed = JSON.parse(text.slice(start));
                break;
            } catch {
                start = text.lastIndexOf("{", start - 1);
            }
        }
        if (start < 0) return null;
    }

    if (!Array.isArray(parsed?.plugins)) return null;

    const names = [];
    const seen = new Set();
    for (const entry of parsed.plugins) {
        if (entry?.kind !== "mcp" || entry.enabled === false) continue;
        if (entry.scope !== "plugin" && entry.source !== "plugin") continue;
        if (typeof entry.name !== "string" || !SAFE_MCP_NAME.test(entry.name)) continue;
        if (!seen.has(entry.name)) {
            seen.add(entry.name);
            names.push(entry.name);
        }
    }
    return names;
}

export function buildDeskAgentArgv({
    deskName,
    workshopDir,
    useAgency,
    agencyCommand = "agency",
    copilotCommand = "copilot",
    profile = "repo",
    pluginMcpNames = [],
    discoverySucceeded = true,
}) {
    const argv = useAgency
        ? [agencyCommand, "copilot"]
        : [copilotCommand, "--name", deskName];

    if (profile === "repo") {
        if (useAgency) argv.push("--no-default-mcps");
    }

    if (profile === "repo" && discoverySucceeded) {
        for (const name of pluginMcpNames) {
            if (SAFE_MCP_NAME.test(name)) argv.push("--disable-mcp-server", name);
        }
    }

    argv.push("--add-dir", workshopDir);
    return argv;
}
