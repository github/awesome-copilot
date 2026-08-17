import test from "node:test";
import assert from "node:assert/strict";
import { join, sep } from "node:path";
import {
    LOCAL_DELEGATION_ORIENT_LINE,
    buildLocalDelegationLaunchEnv,
    deskOrientPrompt,
    findLocalDelegationSkillDir,
    formatLocalDelegationOpenNotice,
    isLocalDelegationPreference,
    isSafeDeskOrientPrompt,
    localDelegationPreferencePath,
    localSavingsCredit,
    normalizeLocalDelegationPreference,
    parseLocalDelegationState,
    resolveLocalDelegationAvailability,
    resolveLocalDelegationLaunch,
    serializeLocalDelegationState,
    windowsLocalDelegationCmdPrefix,
} from "./local-delegation.mjs";
import {
    buildDeskAgentArgv,
    normalizeDeskProfile,
    quoteWindowsCmdArgument,
} from "./launch-profile.mjs";

test("normalizes local-delegation preference independently of desk profile", () => {
    assert.equal(isLocalDelegationPreference("on"), true);
    assert.equal(isLocalDelegationPreference("OFF"), true);
    assert.equal(isLocalDelegationPreference("maybe"), false);
    assert.equal(normalizeLocalDelegationPreference("ON"), "on");
    assert.equal(normalizeLocalDelegationPreference("nope"), "off");
    // Profile axis remains orthogonal and untouched.
    assert.equal(normalizeDeskProfile("connected"), "connected");
    assert.equal(normalizeDeskProfile("repo"), "repo");
});

test("availability is fail-closed without skill or route receipt", () => {
    const missingSkill = resolveLocalDelegationAvailability({
        env: {},
        home: "C:\\home",
        findSkill: () => null,
        exists: () => false,
    });
    assert.equal(missingSkill.available, false);
    assert.match(missingSkill.reason, /not installed/i);

    const skillOnly = resolveLocalDelegationAvailability({
        env: {},
        home: "C:\\home",
        findSkill: () => "C:\\home\\.copilot\\skills\\local-agent-delegation",
        exists: () => false,
    });
    assert.equal(skillOnly.available, false);
    assert.match(skillOnly.reason, /No qualified route receipt/i);
});

test("availability accepts env route id or a qualified receipt", () => {
    const home = join("home");
    const skillDir = join("skills", "local-agent-delegation");
    const viaEnv = resolveLocalDelegationAvailability({
        env: { WORKSHOP_LOCAL_DELEGATION_ROUTE_ID: "foundry-qwen25-7b-qualified" },
        home,
        findSkill: () => skillDir,
        exists: () => false,
    });
    assert.equal(viaEnv.available, true);
    assert.equal(viaEnv.routeId, "foundry-qwen25-7b-qualified");

    // Match host path.join separators so Linux CI exercises the receipt branch.
    const receiptPath = join(home, ".copilot", "local-agent-runs", "qualified-route.json");
    const viaReceipt = resolveLocalDelegationAvailability({
        env: {},
        home,
        now: Date.parse("2026-08-14T12:00:00Z"),
        findSkill: () => skillDir,
        exists: (p) => p === receiptPath,
        readFile: () => JSON.stringify({
            status: "qualified",
            route_id: "foundry-qwen25-7b-qualified",
            expires_at: "2026-12-01T00:00:00Z",
        }),
    });
    assert.equal(viaReceipt.available, true);
    assert.equal(viaReceipt.routeId, "foundry-qwen25-7b-qualified");

    const expired = resolveLocalDelegationAvailability({
        env: {},
        home,
        now: Date.parse("2027-01-01T00:00:00Z"),
        findSkill: () => skillDir,
        exists: (p) => p === receiptPath,
        readFile: () => JSON.stringify({
            status: "qualified",
            route_id: "foundry-qwen25-7b-qualified",
            expires_at: "2026-12-01T00:00:00Z",
        }),
    });
    assert.equal(expired.available, false);
    assert.match(expired.reason, /expired/i);
});

test("requested on + unavailable stays ineffective with a warning", () => {
    const launch = resolveLocalDelegationLaunch({
        preference: "on",
        availability: {
            available: false,
            reason: "local-agent-delegation skill is not installed",
        },
    });
    assert.equal(launch.requested, true);
    assert.equal(launch.effective, false);
    assert.match(launch.warning, /not installed/i);
});

test("launch env enables when effective; -i prompt stays short and quote-free", () => {
    const base = {
        PATH: "/usr/bin",
        WORKSHOP_LOCAL_DELEGATION: "enabled",
        workshop_local_delegation: "enabled",
    };
    const offEnv = buildLocalDelegationLaunchEnv(base, { localDelegationEffective: false });
    assert.equal(Object.hasOwn(offEnv, "WORKSHOP_LOCAL_DELEGATION"), false);
    assert.equal(Object.hasOwn(offEnv, "workshop_local_delegation"), false);
    assert.equal(offEnv.PATH, "/usr/bin");

    const onEnv = buildLocalDelegationLaunchEnv(base, { localDelegationEffective: true });
    assert.equal(onEnv.WORKSHOP_LOCAL_DELEGATION, "enabled");
    assert.equal(Object.hasOwn(onEnv, "workshop_local_delegation"), false);

    const offPrompt = deskOrientPrompt("cost-desk", { localDelegationEffective: false });
    const onPrompt = deskOrientPrompt("cost-desk", { localDelegationEffective: true });
    assert.match(offPrompt, /cost-desk/);
    assert.equal(offPrompt.includes("Local Delegation"), false);
    // One short ASCII line only — never the long policy appendix.
    assert.equal(onPrompt, offPrompt + LOCAL_DELEGATION_ORIENT_LINE);
    assert.match(onPrompt, /Local Delegation env is enabled\./);
    assert.equal(onPrompt.includes("do not delegate"), false);
    assert.equal(isSafeDeskOrientPrompt(onPrompt), true);
    assert.equal(isSafeDeskOrientPrompt('bad "quote"'), false);
    assert.equal(isSafeDeskOrientPrompt("em dash — bad"), false);

    assert.match(windowsLocalDelegationCmdPrefix(true), /enabled/);
    assert.match(windowsLocalDelegationCmdPrefix(false), /WORKSHOP_LOCAL_DELEGATION="&&/);
    const run = ["C:\\tools\\copilot.exe", "-i", onPrompt];
    const cmdLine = windowsLocalDelegationCmdPrefix(true) + run.map(quoteWindowsCmdArgument).join(" ");
    assert.match(cmdLine, /^set "WORKSHOP_LOCAL_DELEGATION=enabled"&& /);
    assert.match(cmdLine, /copilot\.exe/);
});

test("open notice reports effective route without savings claims", () => {
    assert.deepEqual(formatLocalDelegationOpenNotice({
        effective: true,
        requested: true,
        availability: { available: true, routeId: "foundry-qwen25-7b-qualified" },
    }), {
        titleSuffix: " · Local Delegation effective",
        detail: "Local Delegation effective · route foundry-qwen25-7b-qualified",
    });
    assert.deepEqual(formatLocalDelegationOpenNotice({
        effective: false,
        requested: true,
        warning: "local-agent-delegation skill is not installed",
        availability: { available: false, reason: "local-agent-delegation skill is not installed" },
    }).detail, "local-agent-delegation skill is not installed");
    assert.deepEqual(formatLocalDelegationOpenNotice({
        effective: false,
        requested: false,
    }), { titleSuffix: "", detail: "" });
});

test("repo/connected argv stays orthogonal to local-delegation preference", () => {
    const repo = buildDeskAgentArgv({
        deskName: "cost-desk",
        workshopDir: "/workshop",
        useAgency: false,
        copilotCommand: "copilot",
        profile: "repo",
        pluginMcpNames: ["teams"],
    });
    const connected = buildDeskAgentArgv({
        deskName: "cost-desk",
        workshopDir: "/workshop",
        useAgency: false,
        copilotCommand: "copilot",
        profile: "connected",
        pluginMcpNames: ["teams"],
    });
    assert.deepEqual(repo, [
        "copilot", "--name", "cost-desk",
        "--disable-mcp-server", "teams",
        "--add-dir", "/workshop",
    ]);
    assert.deepEqual(connected, [
        "copilot", "--name", "cost-desk",
        "--add-dir", "/workshop",
    ]);
    // Local delegation never injects into argv — only env/prompt.
    assert.equal(repo.includes("local"), false);
    assert.equal(connected.includes("local"), false);
});

test("failed or unaccepted local work earns zero savings credit", () => {
    assert.equal(localSavingsCredit({ attempted: false }).credit, 0);
    assert.equal(localSavingsCredit({ attempted: true, gateAccepted: false }).credit, 0);
    assert.equal(localSavingsCredit({ attempted: true, gateAccepted: true, redone: true }).credit, 0);
    assert.equal(localSavingsCredit({ attempted: true, gateAccepted: true, escalated: true }).credit, 0);
    const accepted = localSavingsCredit({ attempted: true, gateAccepted: true });
    assert.equal(accepted.credit, 0);
    assert.equal(accepted.utilization, "handled_locally_accepted");
});

test("state parse/serialize defaults to off", () => {
    assert.deepEqual(parseLocalDelegationState(null), { preference: "off" });
    assert.equal(parseLocalDelegationState({ preference: "ON" }).preference, "on");
    const serialized = serializeLocalDelegationState({ preference: "on" });
    assert.equal(serialized.preference, "on");
    assert.equal(typeof serialized.updatedAt, "string");
});

test("preference path is user-local and keyed by workshop path, not the repo root", () => {
    const home = join("user-home");
    const a = localDelegationPreferencePath(join("repos", "workshop-a"), {
        home,
        resolvePath: (p) => p,
    });
    const b = localDelegationPreferencePath(join("repos", "workshop-b"), {
        home,
        resolvePath: (p) => p,
    });
    const again = localDelegationPreferencePath(join("repos", "workshop-a"), {
        home,
        resolvePath: (p) => p,
    });
    assert.match(a, /workshop-local-delegation/);
    assert.equal(a.startsWith(home), true);
    assert.equal(a.includes(`${sep}repos${sep}`), false);
    assert.notEqual(a, b);
    assert.equal(a, again);
    // Repo-shipped .local-delegation.json is never the preference path.
    assert.equal(a.endsWith(".local-delegation.json"), false);

    // Case-sensitive filesystems: Foo and foo must not share permission state.
    const upper = localDelegationPreferencePath("/work/Foo", {
        home,
        resolvePath: (p) => p,
    });
    const lower = localDelegationPreferencePath("/work/foo", {
        home,
        resolvePath: (p) => p,
    });
    assert.notEqual(upper, lower);
});

test("skill discovery respects explicit dir and common install roots", () => {
    const found = findLocalDelegationSkillDir({
        env: { WORKSHOP_LOCAL_DELEGATION_SKILL_DIR: "D:\\sealed\\.github\\skills\\local-agent-delegation" },
        home: "C:\\home",
        exists: () => false,
        isSkillDir: (p) => p === "D:\\sealed\\.github\\skills\\local-agent-delegation",
    });
    assert.equal(found, "D:\\sealed\\.github\\skills\\local-agent-delegation");

    const missingExplicit = findLocalDelegationSkillDir({
        env: { WORKSHOP_LOCAL_DELEGATION_SKILL_DIR: "D:\\missing" },
        home: "C:\\home",
        exists: () => false,
        isSkillDir: () => false,
    });
    assert.equal(missingExplicit, null);
});

test("skill discovery walks marketplace/plugin and _direct install layouts", async () => {
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const home = mkdtempSync(join(tmpdir(), "ld-skill-"));
    try {
        const skillDir = join(
            home, ".copilot", "installed-plugins", "awesome-copilot", "sealed-delegation",
            ".github", "skills", "local-agent-delegation");
        mkdirSync(skillDir, { recursive: true });
        writeFileSync(join(skillDir, "SKILL.md"), "# local-agent-delegation\n");
        const found = findLocalDelegationSkillDir({ home, env: {} });
        assert.equal(found, skillDir);

        rmSync(join(home, ".copilot", "installed-plugins", "awesome-copilot"), { recursive: true, force: true });
        const direct = join(
            home, ".copilot", "installed-plugins", "_direct", "sealed-delegation",
            "skills", "local-agent-delegation");
        mkdirSync(direct, { recursive: true });
        writeFileSync(join(direct, "SKILL.md"), "# local-agent-delegation\n");
        const foundDirect = findLocalDelegationSkillDir({ home, env: {} });
        assert.equal(foundDirect, direct);
    } finally {
        rmSync(home, { recursive: true, force: true });
    }
});
