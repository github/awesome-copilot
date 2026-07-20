// Regression guards for install-state selection.
//
// Run: node --test extensions/connector-namespaces/install.test.mjs
//
// These exist because getInstalledState used to collapse N gateway configs for
// one apiName down to a single tile via ARM list order (last-wins). A portal
// add, a duplicate Connect, or a re-auth would mint a sibling config; whichever
// ARM happened to return last owned the tile, so a tile could show
// "Re-authenticate" while a different config for the same connector was already
// Connected. deriveInstalledState now picks deterministically:
//   inCli && Connected > inCli > Connected > any, configName wins ties.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { deriveInstalledState, getConsentUrl, getConnectionStatus, getMcpEndpointUrl, waitForConnected } from "./install.mjs";

// removeLocalEntry does file I/O (getInstalledState reads ARM + mcp configs,
// removeMcpEntry edits them) and calls both as same-module functions, so there
// is no import seam to stub. The invariant that matters — the default "Remove"
// only unlinks the CLI entry and NEVER deletes the Azure resource — is a
// source contract, so we assert it against the function body the same way
// renderer.test.mjs guards its CSS/HTML strings.
function functionBody(source, name) {
    const exported = source.indexOf(`export async function ${name}(`);
    const start = exported !== -1 ? exported : source.indexOf(`async function ${name}(`);
    if (start === -1) return null;
    const open = source.indexOf("{", start);
    if (open === -1) return null;
    let depth = 0;
    for (let i = open; i < source.length; i++) {
        const ch = source[i];
        if (ch === "{") depth++;
        else if (ch === "}") {
            depth--;
            if (depth === 0) return source.slice(open + 1, i);
        }
    }
    return null;
}

const installSource = readFileSync(fileURLToPath(new URL("./install.mjs", import.meta.url)), "utf8");

// Build a fake ARM mcpserverConfig list entry.
function cfg(name, apiName, connName) {
    return { name, properties: { connectors: [{ name: apiName, connectionName: connName }] } };
}

// Build a connName -> connection map with a given status.
function conns(...entries) {
    const m = new Map();
    for (const [connName, status] of entries) {
        m.set(connName, { name: connName, properties: { statuses: [{ status }] } });
    }
    return m;
}

test("picks inCli+Connected over a not-inCli sibling that appears LAST (not last-wins)", () => {
    // good config is FIRST; a broken sibling is LAST. Old last-wins would pick
    // the last one — the fix must pick the good one regardless of order.
    const configs = [
        cfg("good", "shared-api", "connGood"),
        cfg("bad", "shared-api", "connBad"),
    ];
    const connByName = conns(["connGood", "Connected"], ["connBad", "Unknown"]);
    const profileKeys = new Set(["good"]); // only the good config is in the CLI
    const state = deriveInstalledState(configs, connByName, profileKeys, new Set(), null);

    assert.equal(state["shared-api"].configName, "good");
    assert.equal(state["shared-api"].connectionName, "connGood");
    assert.equal(state["shared-api"].connectionStatus, "Connected");
    assert.equal(state["shared-api"].inCli, true);
    assert.equal(state["shared-api"]._configCount, 2);
    assert.deepEqual(state["shared-api"]._candidates.map((item) => item.configName), ["good", "bad"]);
});

test("inCli beats a Connected-but-not-inCli sibling", () => {
    // A is the config the local session points at but not yet Connected; B is
    // Connected on ARM but not in the CLI. Prefer A so remove/re-auth act on the
    // resource the user's session actually uses.
    const configs = [
        cfg("a-incli", "api", "connA"),
        cfg("b-connected", "api", "connB"),
    ];
    const connByName = conns(["connA", "Unknown"], ["connB", "Connected"]);
    const state = deriveInstalledState(configs, connByName, new Set(["a-incli"]), new Set(), null);

    assert.equal(state["api"].configName, "a-incli");
    assert.equal(state["api"].inCli, true);
});

test("inCli && Connected beats inCli-only", () => {
    const configs = [
        cfg("incli-unknown", "api", "connU"),
        cfg("incli-connected", "api", "connC"),
    ];
    const connByName = conns(["connU", "Unknown"], ["connC", "Connected"]);
    const state = deriveInstalledState(configs, connByName, new Set(["incli-unknown", "incli-connected"]), new Set(), null);

    assert.equal(state["api"].configName, "incli-connected");
    assert.equal(state["api"].connectionStatus, "Connected");
});

test("config name breaks equal-rank ties independently of ARM list order", () => {
    const configs = [
        cfg("z-config", "api", "connZ"),
        cfg("a-config", "api", "connA"),
    ];
    const connByName = conns(["connZ", "Connected"], ["connA", "Connected"]);
    const local = new Set(["z-config", "a-config"]);

    const forward = deriveInstalledState(configs, connByName, local, new Set(), null);
    const reverse = deriveInstalledState([...configs].reverse(), connByName, local, new Set(), null);

    assert.equal(forward.api.configName, "a-config");
    assert.equal(reverse.api.configName, "a-config");
});

test("connection convergence reports non-connected terminal results as failures", async () => {
    const states = ["Connecting", "Error"];
    const delays = [];
    await assert.rejects(
        waitForConnected({}, "conn", {
            maxPolls: 2,
            getStatus: async () => states.shift(),
            delay: async (ms) => delays.push(ms),
        }),
        /Connection ended in state "Error"/,
    );
    assert.deepEqual(delays, [1000]);
    assert.equal(
        await waitForConnected({}, "conn", {
            getStatus: async () => "Connected",
            delay: async () => assert.fail("connected state must not sleep"),
        }),
        "Connected",
    );
});

test("single config passes through with no _configCount", () => {
    const configs = [cfg("only", "api", "conn1")];
    const connByName = conns(["conn1", "Connected"]);
    const state = deriveInstalledState(configs, connByName, new Set(["only"]), new Set(), null);

    assert.equal(state["api"].configName, "only");
    assert.equal(state["api"]._configCount, undefined);
});

test("workspace membership counts as inCli and sets scope/path", () => {
    const configs = [cfg("ws", "api", "conn1")];
    const connByName = conns(["conn1", "Connected"]);
    const state = deriveInstalledState(configs, connByName, new Set(), new Set(["ws"]), "/repo/.mcp.json");

    assert.equal(state["api"].inCli, true);
    assert.equal(state["api"].cliScope, "workspace");
    assert.equal(state["api"].cliPath, "/repo/.mcp.json");
});

test("connectionStatus falls back to overallStatus then Unknown", () => {
    const configs = [cfg("c1", "api1", "connOverall"), cfg("c2", "api2", "connMissing")];
    const connByName = new Map([
        ["connOverall", { name: "connOverall", properties: { overallStatus: "Connected" } }],
    ]);
    const state = deriveInstalledState(configs, connByName, new Set(), new Set(), null);

    assert.equal(state["api1"].connectionStatus, "Connected"); // from overallStatus
    assert.equal(state["api2"].connectionStatus, "Unknown");   // no connection at all
});

test("configs with no connector are skipped", () => {
    const configs = [
        { name: "broken", properties: { connectors: [] } },
        cfg("ok", "api", "conn1"),
    ];
    const connByName = conns(["conn1", "Connected"]);
    const state = deriveInstalledState(configs, connByName, new Set(["ok"]), new Set(), null);

    assert.equal(Object.keys(state).length, 1);
    assert.equal(state["api"].configName, "ok");
});

test("removeLocalEntry unlinks the local CLI entry via removeMcpEntry", () => {
    const body = functionBody(installSource, "removeLocalEntry");
    assert.ok(body, "removeLocalEntry function not found in install.mjs");
    assert.match(body, /removeMcpEntry\s*\(/, "removeLocalEntry must call removeMcpEntry to drop the CLI entry");
    assert.match(body, /entry\._candidates/, "removeLocalEntry must process duplicate CLI configs");
    assert.match(body, /candidate\.inCli/, "removeLocalEntry must unlink every local candidate");
});

test("uninstallConnector deletes every duplicate namespace config", () => {
    const body = functionBody(installSource, "uninstallConnector");
    const cleanup = functionBody(installSource, "cleanupConnectorResources");
    assert.ok(body, "uninstallConnector function not found in install.mjs");
    assert.ok(cleanup, "cleanupConnectorResources function not found in install.mjs");
    assert.match(body, /entry\._candidates/, "namespace deletion must process duplicate configs");
    assert.match(body, /cleanupConnectorResources\s*\(/, "uninstall must delegate all collected candidates to shared cleanup");
    assert.match(cleanup, /deleteMcpServerConfigs\(config, configNames\)/);
    assert.match(cleanup, /for \(const connectionName of connectionNames\)/);
    assert.match(cleanup, /for \(const configName of configNames\)/);
});

test("removeLocalEntry never deletes the namespace resource (no armDelete)", () => {
    const body = functionBody(installSource, "removeLocalEntry");
    assert.ok(body, "removeLocalEntry function not found in install.mjs");
    // The default Remove must stay local-only. If someone routes it through
    // uninstallConnector or adds an ARM delete, this fails — which is the point.
    assert.doesNotMatch(body, /armDelete\s*\(/, "removeLocalEntry must not call armDelete");
    assert.doesNotMatch(body, /uninstallConnector\s*\(/, "removeLocalEntry must not delegate to uninstallConnector");
});

// --- ARM path-injection guard (client-reachable read sinks) ---
//
// finishInstall/finishReauth feed client-supplied body.connName / body.configName
// into getConsentUrl, getConnectionStatus, and getMcpEndpointUrl, which build ARM
// URLs. Those names must pass through armSegment() so a traversal / query payload
// can't escape the intended resource path (SSRF / path injection). armSegment
// throws synchronously while the URL is built, before any token or network call,
// so these run fully offline and deterministic. A valid config is used so the
// gatewayId() wrap doesn't throw first — only the bad NAME should reject.
const validConfig = { subscriptionId: "s", resourceGroup: "r", gatewayName: "g" };
const badNames = ["../../evil", "evil/../../secret", "x?injected=1"];

test("getConnectionStatus rejects traversal/injection connName before any ARM call", async () => {
    for (const bad of badNames) {
        await assert.rejects(
            () => getConnectionStatus(validConfig, bad),
            /Invalid ARM resource identifier/,
            `getConnectionStatus should reject connName ${JSON.stringify(bad)}`,
        );
    }
});

test("getConsentUrl rejects traversal/injection connName before any ARM call", async () => {
    for (const bad of badNames) {
        await assert.rejects(
            () => getConsentUrl(validConfig, bad, "http://127.0.0.1:0/auth/callback/x"),
            /Invalid ARM resource identifier/,
            `getConsentUrl should reject connName ${JSON.stringify(bad)}`,
        );
    }
});

test("getMcpEndpointUrl rejects traversal/injection configName before any ARM call", async () => {
    for (const bad of badNames) {
        await assert.rejects(
            () => getMcpEndpointUrl(validConfig, bad),
            /Invalid ARM resource identifier/,
            `getMcpEndpointUrl should reject configName ${JSON.stringify(bad)}`,
        );
    }
});
