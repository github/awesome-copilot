// Phase 2 regression: Re-authenticate must re-consent the EXISTING connection and
// mint NO new resources.
//
// Before the fix, the "Re-authenticate" button ran the full install path, so it
// created a fresh connection + a fresh mcpserverConfig on every click. A teammate
// saw a new Dynamics config appear on the namespace each time they re-authed, while
// the panel stayed stuck on "Re-authenticate". This test stubs ARM and proves
// reauthConnector adopts the local session's connection and issues ZERO PUTs.
//
// Run: node --test .github/extensions/connector-namespaces/install.reauth.test.mjs

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Isolate the process home BEFORE importing install.mjs. PROFILE_MCP_PATH
// (homedir-based) and armClient's TOKEN_DIR (COPILOT_HOME-based) are both bound at
// module-eval time, so the env vars must be set first. Seed a non-expiring fake
// token so getToken() never hits the network or an interactive sign-in, and a
// profile mcp-config so the local config reads as inCli.
const TMP = mkdtempSync(join(tmpdir(), "cn-reauth-"));
process.env.COPILOT_HOME = TMP;
process.env.USERPROFILE = TMP; // homedir() on Windows
process.env.HOME = TMP; // homedir() on posix

const artifactsDir = join(TMP, "extensions", "connector-namespaces", "artifacts");
mkdirSync(artifactsDir, { recursive: true });
writeFileSync(
    join(artifactsDir, "auth-cache.json"),
    JSON.stringify({ token: "fake-token", refreshToken: "fake-refresh", expiresAt: Date.now() + 3600e3 }),
);

const dotCopilot = join(TMP, ".copilot");
mkdirSync(dotCopilot, { recursive: true });
writeFileSync(
    join(dotCopilot, "mcp-config.json"),
    JSON.stringify({ mcpServers: { "docusign-bbb": { type: "http", url: "https://example/mcp" } } }),
);

// Dynamic import AFTER the env is set. A static top-level import would be hoisted
// and evaluate install.mjs (binding the paths to the real home) before the env
// assignments run.
const { reauthConnector } = await import("./install.mjs");

after(() => {
    try {
        rmSync(TMP, { recursive: true, force: true });
    } catch {
        /* best-effort temp cleanup */
    }
});

test("re-authenticate re-consents the existing connection and mints no new resources", async (t) => {
    const config = { subscriptionId: "sub1", resourceGroup: "rg1", gatewayName: "gw1" };

    // Two configs for one apiName — the bug scenario. configA is a portal-added
    // sibling that is NOT in the local CLI; configB is the one the local session
    // points at. Both connections are Connected, so selection turns on inCli:
    // deriveInstalledState must pick configB, and the re-consent must target conn-b.
    const configA = { name: "docusign-aaa", properties: { connectors: [{ name: "docusign", connectionName: "conn-a" }] } };
    const configB = { name: "docusign-bbb", properties: { connectors: [{ name: "docusign", connectionName: "conn-b" }] } };
    const connA = { name: "conn-a", properties: { statuses: [{ status: "Connected" }] } };
    const connB = { name: "conn-b", properties: { statuses: [{ status: "Connected" }] } };

    const calls = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (urlArg, opts = {}) => {
        const url = String(urlArg);
        const method = (opts.method || "GET").toUpperCase();
        calls.push({ method, url });
        const ok = (body) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });
        const fail = (status) => ({ ok: false, status, text: async () => "" });

        if (method === "POST" && url.includes("/listConsentLinks")) return ok({ value: [{ link: "https://consent.example/redir" }] });
        if (url.includes("/managedApis/")) return fail(404); // meta -> null -> fallback oauth param
        if (method === "GET" && /\/mcpserverConfigs\?/.test(url)) return ok({ value: [configA, configB] });
        if (method === "GET" && /\/connections\?/.test(url)) return ok({ value: [connA, connB] });
        if (method === "GET" && /\/connectorGateways\/[^/?]+\?/.test(url)) return ok({ location: "eastus" });
        throw new Error(`unexpected ARM call: ${method} ${url}`);
    };
    t.after(() => {
        globalThis.fetch = realFetch;
    });

    const result = await reauthConnector(config, "docusign", "DocuSign", "https://cb/?c=");

    // Adopts the existing connection, stops at consent, carries the selected config
    // through so finish never mints a new one.
    assert.equal(result.needsConsent, true);
    assert.equal(result.reauth, true);
    assert.equal(result.connName, "conn-b"); // the inCli config's connection
    assert.equal(result.configName, "docusign-bbb"); // never a fresh generateName()

    // The core guarantee: nothing was minted. createConnection and
    // createMcpServerConfig are the only PUTs on the install path; re-auth issues none.
    const puts = calls.filter((c) => c.method === "PUT");
    assert.deepEqual(puts, [], `expected zero PUTs, saw: ${puts.map((p) => p.url).join(", ")}`);

    // And it re-consented the SELECTED connection, not the portal sibling.
    const consent = calls.find((c) => c.url.includes("/listConsentLinks"));
    assert.ok(consent && consent.url.includes("/connections/conn-b/"), "consent must target conn-b");
    assert.ok(
        !calls.some((c) => c.url.includes("/connections/conn-a/listConsentLinks")),
        "must not touch the sibling connection conn-a",
    );
});
