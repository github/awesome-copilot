import { createHash } from "node:crypto";
import { accessSync, constants as fsConstants, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PREFERENCES = new Set(["off", "on"]);
const SAFE_ROUTE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

/** @deprecated Repo-root state is rejected; kept only for docs/migration mentions. */
export const LOCAL_DELEGATION_STATE_FILE = ".local-delegation.json";
export const LOCAL_DELEGATION_ENV = "WORKSHOP_LOCAL_DELEGATION";
export const LOCAL_DELEGATION_SKILL_NAME = "local-agent-delegation";
export const LOCAL_DELEGATION_USER_STATE_DIR = join(".copilot", "workshop-local-delegation");

/**
 * Stable user-local preference path for a workshop root.
 * Permission state must NOT live in the cloned workshop (a repo can ship
 * preference:on). Key by a hash of the canonical workshop path under ~/.copilot.
 */
export function localDelegationPreferencePath(workshopDir, {
    home = homedir(),
    resolvePath = (p) => p,
} = {}) {
    if (typeof workshopDir !== "string" || !workshopDir) {
        throw new Error("workshopDir is required");
    }
    let canonical = workshopDir;
    try { canonical = resolvePath(workshopDir); } catch { /* keep input */ }
    // Normalize separators only. Do not lowercase: on case-sensitive filesystems
    // /work/Foo and /work/foo are distinct workshops and must not share state.
    const key = createHash("sha256")
        .update(String(canonical).replaceAll("\\", "/"))
        .digest("hex")
        .slice(0, 32);
    return join(home, LOCAL_DELEGATION_USER_STATE_DIR, `${key}.json`);
}

export function isLocalDelegationPreference(value) {
    return typeof value === "string" && PREFERENCES.has(value.toLowerCase());
}

export function normalizeLocalDelegationPreference(value, fallback = "off") {
    return isLocalDelegationPreference(value) ? value.toLowerCase() : fallback;
}

// Windows Terminal / cmd reparse cannot safely carry long multi-space -i strings.
// Keep the orientation prompt short, ASCII, and quote-free. Local Delegation
// policy lives in WORKSHOP_LOCAL_DELEGATION=enabled + the installed skill — not
// on the CLI.
const MAX_ORIENT_PROMPT_CHARS = 280;
// Allow apostrophes (desk's). Ban double quotes, backticks, dashes that WT/cmd
// have split on, and classic cmd metacharacters.
const UNSAFE_ORIENT_CHARS = /["`—–|&<>^%!()\r\n]/;

export function isSafeDeskOrientPrompt(prompt) {
    return typeof prompt === "string"
        && prompt.length > 0
        && prompt.length <= MAX_ORIENT_PROMPT_CHARS
        && !UNSAFE_ORIENT_CHARS.test(prompt);
}

/** One short ASCII notice operators can see in the session start prompt. */
export const LOCAL_DELEGATION_ORIENT_LINE = " Local Delegation env is enabled.";

export function deskOrientPrompt(deskName, { localDelegationEffective = false } = {}) {
    // deskName is already constrained to a slug by the launcher; still keep the
    // prompt free of punctuation that cmd/wt have historically mis-parsed.
    let prompt = `You are sitting down at the ${deskName} desk in this workshop. ` +
        `Read journal.md in this folder first to pick up where the last session ` +
        `left off, then continue the desk's work. Write your journal before you stop.`;
    // Only a single short ASCII line may ride on -i. Full policy stays in env + skill.
    if (localDelegationEffective) {
        const withNotice = prompt + LOCAL_DELEGATION_ORIENT_LINE;
        if (isSafeDeskOrientPrompt(withNotice)) prompt = withNotice;
    }
    return prompt;
}

/**
 * Operator-visible summary for open toasts and badges.
 * Never claims savings; only reports effective state + route id when known.
 */
export function formatLocalDelegationOpenNotice(localDelegation) {
    if (!localDelegation || typeof localDelegation !== "object") {
        return { titleSuffix: "", detail: "" };
    }
    const routeId = localDelegation.availability?.routeId || null;
    if (localDelegation.effective) {
        const routePart = routeId ? ` · route ${routeId}` : "";
        return {
            titleSuffix: " · Local Delegation effective",
            detail: `Local Delegation effective${routePart}`,
        };
    }
    if (localDelegation.requested) {
        return {
            titleSuffix: " · local unavailable",
            detail: localDelegation.warning
                || localDelegation.availability?.reason
                || "Local Delegation requested but unavailable",
        };
    }
    return { titleSuffix: "", detail: "" };
}

export function buildLocalDelegationLaunchEnv(baseEnv = {}, { localDelegationEffective = false } = {}) {
    const env = { ...baseEnv };
    // Windows env names are case-insensitive; spreading process.env yields a
    // case-sensitive object, so clear every spelling before optionally setting.
    const target = LOCAL_DELEGATION_ENV.toLowerCase();
    for (const key of Object.keys(env)) {
        if (key.toLowerCase() === target) delete env[key];
    }
    if (localDelegationEffective) {
        env[LOCAL_DELEGATION_ENV] = "enabled";
    }
    return env;
}

/**
 * cmd.exe prefix that forces WORKSHOP_LOCAL_DELEGATION on or off inside a new
 * Windows Terminal / console session. wt.exe does not reliably forward the
 * caller's process env into a new tab when Terminal is already running.
 */
export function windowsLocalDelegationCmdPrefix(localDelegationEffective = false) {
    return localDelegationEffective
        ? 'set "WORKSHOP_LOCAL_DELEGATION=enabled"&& '
        : 'set "WORKSHOP_LOCAL_DELEGATION="&& ';
}

/**
 * Savings credit is utilization accounting, not a price claim.
 * Failed, unaccepted, redone, or escalated local work earns zero.
 */
export function localSavingsCredit({
    attempted = false,
    gateAccepted = false,
    redone = false,
    escalated = false,
} = {}) {
    if (!attempted || !gateAccepted || redone || escalated) {
        return {
            credit: 0,
            utilization: attempted ? "handled_locally_unaccepted" : "not_attempted",
            reason: !attempted
                ? "not_attempted"
                : escalated
                    ? "escalated"
                    : redone
                        ? "redone"
                        : "gate_not_accepted",
        };
    }
    return {
        credit: 0, // dollar savings are never claimed by Cairn
        utilization: "handled_locally_accepted",
        reason: "accepted_utilization_only",
    };
}

function isReadableFile(path) {
    try {
        if (!statSync(path).isFile()) return false;
        accessSync(path, fsConstants.R_OK);
        return true;
    } catch {
        return false;
    }
}

function skillMarkerPath(dir) {
    return join(dir, "SKILL.md");
}

function looksLikeSkillDir(dir) {
    return isReadableFile(skillMarkerPath(dir));
}

/**
 * Discover the installed local-agent-delegation skill.
 * Injectable probes keep unit tests filesystem-free.
 */
export function findLocalDelegationSkillDir({
    env = process.env,
    home = homedir(),
    exists = existsSync,
    isSkillDir = looksLikeSkillDir,
} = {}) {
    const explicit = (env.WORKSHOP_LOCAL_DELEGATION_SKILL_DIR || "").trim();
    if (explicit) {
        return isSkillDir(explicit) ? explicit : null;
    }

    const candidates = [
        join(home, ".copilot", "skills", LOCAL_DELEGATION_SKILL_NAME),
        join(home, ".agents", "skills", LOCAL_DELEGATION_SKILL_NAME),
    ];

    for (const candidate of candidates) {
        if (isSkillDir(candidate)) return candidate;
    }

    // Marketplace: ~/.copilot/installed-plugins/<marketplace>/<plugin>/
    // Direct:      ~/.copilot/installed-plugins/_direct/<plugin>/
    // Skill dirs may live at skills/, .github/skills/, or com.github.copilot/skills/.
    const pluginsRoot = join(home, ".copilot", "installed-plugins");
    if (exists(pluginsRoot)) {
        try {
            for (const market of readdirSync(pluginsRoot, { withFileTypes: true })) {
                if (!market.isDirectory()) continue;
                const marketRoot = join(pluginsRoot, market.name);
                let pluginEntries;
                try {
                    pluginEntries = readdirSync(marketRoot, { withFileTypes: true });
                } catch {
                    continue;
                }
                for (const plugin of pluginEntries) {
                    if (!plugin.isDirectory()) continue;
                    const pluginRoot = join(marketRoot, plugin.name);
                    const nestedCandidates = [
                        join(pluginRoot, "skills", LOCAL_DELEGATION_SKILL_NAME),
                        join(pluginRoot, ".github", "skills", LOCAL_DELEGATION_SKILL_NAME),
                        join(pluginRoot, "com.github.copilot", "skills", LOCAL_DELEGATION_SKILL_NAME),
                        join(pluginRoot, "com.github.awesome-copilot", "skills", LOCAL_DELEGATION_SKILL_NAME),
                    ];
                    for (const nested of nestedCandidates) {
                        if (isSkillDir(nested)) return nested;
                    }
                }
            }
        } catch {
            // fail closed on scan errors
        }
    }

    return null;
}

function readJsonFile(path, readFile = readFileSync) {
    try {
        return JSON.parse(readFile(path, "utf8"));
    } catch {
        return null;
    }
}

function isRouteId(value) {
    return typeof value === "string" && SAFE_ROUTE_ID.test(value);
}

/**
 * Fail-closed availability. Enable only when skill + qualified route receipt
 * (or explicit env route id) are present. Never invent availability.
 */
export function resolveLocalDelegationAvailability({
    env = process.env,
    home = homedir(),
    now = Date.now(),
    findSkill = findLocalDelegationSkillDir,
    readFile = readFileSync,
    exists = existsSync,
} = {}) {
    const forced = (env.WORKSHOP_LOCAL_DELEGATION_AVAILABLE || "").trim().toLowerCase();
    if (forced === "0" || forced === "false" || forced === "unavailable") {
        return {
            available: false,
            reason: "Forced unavailable by WORKSHOP_LOCAL_DELEGATION_AVAILABLE",
            skillDir: null,
            routeId: null,
        };
    }

    const skillDir = findSkill({ env, home, exists });
    if (!skillDir) {
        return {
            available: false,
            reason: "local-agent-delegation skill is not installed",
            skillDir: null,
            routeId: null,
        };
    }

    const envRoute = (env.WORKSHOP_LOCAL_DELEGATION_ROUTE_ID || "").trim();
    if (envRoute) {
        if (!isRouteId(envRoute)) {
            return {
                available: false,
                reason: "WORKSHOP_LOCAL_DELEGATION_ROUTE_ID is not a safe route id",
                skillDir,
                routeId: null,
            };
        }
        return {
            available: true,
            reason: "Skill installed; route id provided by environment",
            skillDir,
            routeId: envRoute,
        };
    }

    const receiptPath = (env.WORKSHOP_LOCAL_DELEGATION_RECEIPT || "").trim()
        || join(home, ".copilot", "local-agent-runs", "qualified-route.json");
    if (!exists(receiptPath)) {
        return {
            available: false,
            reason: "No qualified route receipt (set WORKSHOP_LOCAL_DELEGATION_ROUTE_ID or write ~/.copilot/local-agent-runs/qualified-route.json)",
            skillDir,
            routeId: null,
        };
    }

    const receipt = readJsonFile(receiptPath, readFile);
    if (!receipt || typeof receipt !== "object") {
        return {
            available: false,
            reason: "Qualified route receipt is unreadable",
            skillDir,
            routeId: null,
        };
    }

    const status = String(receipt.status || "").toLowerCase();
    if (status !== "qualified") {
        return {
            available: false,
            reason: `Route receipt status is '${receipt.status || "missing"}', not qualified`,
            skillDir,
            routeId: isRouteId(receipt.route_id || receipt.routeId) ? (receipt.route_id || receipt.routeId) : null,
        };
    }

    const routeId = receipt.route_id || receipt.routeId || null;
    if (!isRouteId(routeId)) {
        return {
            available: false,
            reason: "Route receipt is missing a safe route_id",
            skillDir,
            routeId: null,
        };
    }

    if (receipt.expires_at || receipt.expiresAt) {
        const expires = Date.parse(receipt.expires_at || receipt.expiresAt);
        if (!Number.isFinite(expires) || expires <= now) {
            return {
                available: false,
                reason: "Qualified route receipt has expired",
                skillDir,
                routeId,
            };
        }
    }

    return {
        available: true,
        reason: "Skill installed; qualified route receipt present",
        skillDir,
        routeId,
    };
}

export function resolveLocalDelegationLaunch({
    preference = "off",
    availability,
} = {}) {
    const pref = normalizeLocalDelegationPreference(preference, "off");
    const available = Boolean(availability?.available);
    if (pref === "on" && !available) {
        return {
            preference: pref,
            requested: true,
            effective: false,
            availability,
            warning: availability?.reason || "Local Delegation unavailable",
        };
    }
    return {
        preference: pref,
        requested: pref === "on",
        effective: pref === "on" && available,
        availability,
        warning: null,
    };
}

export function parseLocalDelegationState(raw) {
    if (!raw || typeof raw !== "object") {
        return { preference: "off" };
    }
    return {
        preference: normalizeLocalDelegationPreference(raw.preference, "off"),
    };
}

export function serializeLocalDelegationState(state) {
    return {
        preference: normalizeLocalDelegationPreference(state?.preference, "off"),
        updatedAt: new Date().toISOString(),
    };
}
