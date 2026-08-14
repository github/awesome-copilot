import test from "node:test";
import assert from "node:assert/strict";
import {
    buildLocalDelegationLaunchEnv,
    deskOrientPrompt,
    findLocalDelegationSkillDir,
    isLocalDelegationPreference,
    localSavingsCredit,
    normalizeLocalDelegationPreference,
    parseLocalDelegationState,
    resolveLocalDelegationAvailability,
    resolveLocalDelegationLaunch,
    serializeLocalDelegationState,
} from "./local-delegation.mjs";
import {
    buildDeskAgentArgv,
    normalizeDeskProfile,
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
    const viaEnv = resolveLocalDelegationAvailability({
        env: { WORKSHOP_LOCAL_DELEGATION_ROUTE_ID: "foundry-qwen25-7b-qualified" },
        home: "C:\\home",
        findSkill: () => "C:\\skills\\local-agent-delegation",
        exists: () => false,
    });
    assert.equal(viaEnv.available, true);
    assert.equal(viaEnv.routeId, "foundry-qwen25-7b-qualified");

    const receiptPath = "C:\\home\\.copilot\\local-agent-runs\\qualified-route.json";
    const viaReceipt = resolveLocalDelegationAvailability({
        env: {},
        home: "C:\\home",
        now: Date.parse("2026-08-14T12:00:00Z"),
        findSkill: () => "C:\\skills\\local-agent-delegation",
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
        home: "C:\\home",
        now: Date.parse("2027-01-01T00:00:00Z"),
        findSkill: () => "C:\\skills\\local-agent-delegation",
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

test("launch env and prompt only enable when effective", () => {
    const base = { PATH: "/usr/bin", WORKSHOP_LOCAL_DELEGATION: "enabled" };
    const offEnv = buildLocalDelegationLaunchEnv(base, { localDelegationEffective: false });
    assert.equal(Object.hasOwn(offEnv, "WORKSHOP_LOCAL_DELEGATION"), false);
    assert.equal(offEnv.PATH, "/usr/bin");

    const onEnv = buildLocalDelegationLaunchEnv(base, { localDelegationEffective: true });
    assert.equal(onEnv.WORKSHOP_LOCAL_DELEGATION, "enabled");

    const offPrompt = deskOrientPrompt("cost-desk", { localDelegationEffective: false });
    assert.equal(offPrompt.includes("Local Delegation is available"), false);
    assert.match(offPrompt, /cost-desk/);

    const onPrompt = deskOrientPrompt("cost-desk", { localDelegationEffective: true });
    assert.match(onPrompt, /Local Delegation is available/);
    assert.match(onPrompt, /local-agent-delegation/);
    assert.match(onPrompt, /no savings credit/i);
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
