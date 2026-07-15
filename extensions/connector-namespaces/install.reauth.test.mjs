// Phase 2 regression: Re-authenticate must re-consent the EXISTING connection and
// mint NO new resources.
//
// Before the fix, the "Re-authenticate" button ran the full install path, so it
// created a fresh connection + a fresh mcpserverConfig on every click. A teammate
// saw a new Dynamics config appear on the namespace each time they re-authed, while
// the panel stayed stuck on "Re-authenticate". This test stubs ARM and proves
// reauthConnector adopts the local session's connection and issues ZERO PUTs.
//
// Run: node --test extensions/connector-namespaces/install.reauth.test.mjs

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { delimiter, join } from "node:path";
import { tmpdir } from "node:os";

// Isolate COPILOT_HOME before importing install.mjs because its paths are bound at
// module-eval time. Put a fake Azure CLI on PATH so getToken() stays offline, and
// seed a profile config so the local entry reads as inCli.
const TMP = mkdtempSync(join(tmpdir(), "cn-reauth-"));
process.env.COPILOT_HOME = TMP;
process.env.USERPROFILE = TMP; // homedir() on Windows
process.env.HOME = TMP; // homedir() on posix

const binDir = join(TMP, "bin");
mkdirSync(binDir, { recursive: true });
const tokenJson = JSON.stringify({ accessToken: "fake-token", expires_on: Math.floor(Date.now() / 1000) + 3600 });
writeFileSync(join(binDir, "az"), `#!/usr/bin/env node\nprocess.stdout.write(${JSON.stringify(tokenJson)});\n`);
chmodSync(join(binDir, "az"), 0o755);
writeFileSync(join(binDir, "az.cmd"), `@echo ${tokenJson}\r\n`);
process.env.PATH = `${binDir}${delimiter}${process.env.PATH || ""}`;

const legacyAuthCache = join(TMP, "extensions", "connector-namespaces", "artifacts", "auth-cache.json");
mkdirSync(join(TMP, "extensions", "connector-namespaces", "artifacts"), { recursive: true });
writeFileSync(legacyAuthCache, JSON.stringify({ accessToken: "legacy", refreshToken: "legacy" }));

writeFileSync(
    join(TMP, "mcp-config.json"),
    JSON.stringify({ mcpServers: { "docusign-bbb": { type: "http", url: "https://example/mcp" } } }),
);

// Dynamic import AFTER the env is set. A static top-level import would be hoisted
// and evaluate install.mjs (binding the paths to the real home) before the env
// assignments run.
const {
    deleteConnection,
    finishInstall,
    getInstalledState,
    installConnector,
    loadConnectorMeta,
    reauthConnector,
    removeMcpEntry,
    uninstallConnector,
} = await import("./install.mjs");

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

        if (method === "POST" && url.includes("/listConsentLinks")) return ok({ value: [{ link: "https://consent.example/redir" }] });
        if (url.includes("/managedApis/") && !url.includes("export=true")) {
            return ok({ properties: { connectionParameters: { token: { type: "oauthSetting" } } } });
        }
        if (method === "GET" && /\/mcpserverConfigs\?/.test(url)) return ok({ value: [configA, configB] });
        if (method === "GET" && /\/connections\?/.test(url)) return ok({ value: [connA, connB] });
        if (method === "GET" && /\/connectorGateways\/[^/?]+\?/.test(url)) return ok({ location: "eastus" });
        throw new Error(`unexpected ARM call: ${method} ${url}`);
    };
    t.after(() => {
        globalThis.fetch = realFetch;
    });

    const result = await reauthConnector(config, "docusign", "DocuSign", "https://cb/?c=");
    assert.equal(existsSync(legacyAuthCache), false, "the legacy refresh-token cache must be removed without reading it");

    // Adopts the existing connection, stops at consent, carries the selected config
    // through so finish never mints a new one.
    assert.equal(result.needsConsent, true);
    assert.equal(result.reauth, true);
    assert.equal(result.freshConnection, false);
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
    assert.ok(!calls.some((c) => c.url.includes("export=true")), "reauth must not request unused swagger");
});

test("missing selected connection re-evaluates a valid duplicate before installing", async (t) => {
    const configPath = join(TMP, "mcp-config.json");
    writeFileSync(
        configPath,
        JSON.stringify({ mcpServers: { "api-dead": { type: "http", url: "https://example.com/mcp" } } }),
    );
    const config = { subscriptionId: "sub1", resourceGroup: "rg1", gatewayName: "gw1" };
    const dead = { name: "api-dead", properties: { connectors: [{ name: "shared-api", connectionName: "conn-dead" }] } };
    const live = { name: "api-live", properties: { connectors: [{ name: "shared-api", connectionName: "conn-live" }] } };
    const calls = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (urlArg, opts = {}) => {
        const url = String(urlArg);
        const method = (opts.method || "GET").toUpperCase();
        calls.push({ method, url });
        const ok = (body) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });
        if (method === "GET" && /\/mcpserverConfigs\?/.test(url)) return ok({ value: [dead, live] });
        if (method === "GET" && /\/connections\?/.test(url)) {
            return ok({ value: [
                { name: "conn-dead", properties: { statuses: [{ status: "Unknown" }] } },
                { name: "conn-live", properties: { statuses: [{ status: "Connected" }] } },
            ] });
        }
        if (method === "GET" && /\/connectorGateways\/[^/?]+\?/.test(url)) return ok({ location: "eastus" });
        if (method === "GET" && url.includes("/managedApis/shared-api")) {
            return ok({ properties: { connectionParameters: { token: { type: "oauthSetting" } } } });
        }
        if (method === "POST" && url.includes("/connections/conn-dead/listConsentLinks")) {
            return { ok: false, status: 404, text: async () => "gone" };
        }
        if (method === "POST" && url.includes("/connections/conn-live/listConsentLinks")) {
            return ok({ value: [{ link: "https://consent.example/live" }] });
        }
        if (method === "DELETE" && url.includes("/mcpserverConfigs/api-dead")) return ok({});
        if (method === "GET" && url.includes("/mcpserverConfigs/api-dead")) {
            return { ok: false, status: 404, text: async () => "gone" };
        }
        if (method === "DELETE" && url.includes("/connections/conn-dead")) return ok({});
        throw new Error(`unexpected ARM call: ${method} ${url}`);
    };
    t.after(() => {
        globalThis.fetch = realFetch;
        writeFileSync(configPath, JSON.stringify({ mcpServers: {} }));
    });

    const result = await reauthConnector(config, "shared-api", "Shared API", "https://cb/?c=");
    assert.equal(result.needsConsent, true);
    assert.equal(result.configName, "api-live");
    assert.equal(result.connName, "conn-live");
    assert.ok(calls.some((call) => call.url.includes("/connections/conn-dead/listConsentLinks")));
    assert.ok(calls.some((call) => call.url.includes("/connections/conn-live/listConsentLinks")));
    assert.equal(calls.some((call) => call.method === "PUT"), false, "valid siblings must prevent a fresh install");
});

test("cross-process MCP config writes preserve every entry", async () => {
    const configPath = join(TMP, "mcp-config.json");
    writeFileSync(configPath, JSON.stringify({ mcpServers: {} }));
    const installUrl = new URL("./install.mjs", import.meta.url).href;
    const names = Array.from({ length: 8 }, (_, index) => `parallel-${index}`);

    const runWriter = (name) => new Promise((resolve, reject) => {
        const metadata = {
            gatewayId: "/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Web/connectorGateways/gateway",
            mcpServerConfigId: `/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Web/connectorGateways/gateway/mcpserverConfigs/${name}`,
            connectionId: `/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Web/connectorGateways/gateway/connections/${name}`,
            apiName: name,
        };
        const script = [
            `import { writeMcpEntry } from ${JSON.stringify(installUrl)};`,
            `await writeMcpEntry(${JSON.stringify(name)}, ${JSON.stringify(`https://example.com/${name}`)}, ${JSON.stringify(`key-${name}`)}, "profile", ${JSON.stringify(metadata)});`,
        ].join("\n");
        const child = spawn(process.execPath, ["--input-type=module", "--eval", script], {
            env: { ...process.env, COPILOT_HOME: TMP, HOME: TMP, USERPROFILE: TMP },
            stdio: ["ignore", "ignore", "pipe"],
        });
        let stderr = "";
        child.stderr.on("data", (chunk) => { stderr += chunk; });
        child.once("error", reject);
        child.once("exit", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`config writer exited ${code}: ${stderr}`));
        });
    });

    await Promise.all(names.map(runWriter));
    const stored = JSON.parse(readFileSync(configPath, "utf8")).mcpServers;
    assert.deepEqual(Object.keys(stored).sort(), [...names].sort());
    for (const name of names) {
        assert.equal(stored[name].url, `https://example.com/${name}`);
        assert.equal(stored[name].headers["X-API-Key"], `key-${name}`);
        assert.deepEqual(Object.keys(stored[name]).sort(), ["_connectorNamespace", "headers", "url"]);
        assert.equal(stored[name]._connectorNamespace.apiName, name);
        assert.match(stored[name]._connectorNamespace.gatewayId, /connectorGateways\/gateway$/);
    }
    assert.equal(existsSync(`${configPath}.lock`), false);

    await Promise.all(names.map((name) => removeMcpEntry(name)));
    assert.deepEqual(JSON.parse(readFileSync(configPath, "utf8")).mcpServers, {});
});

test("connector metadata failures are evicted and retried", async (t) => {
    const config = { subscriptionId: "sub1", resourceGroup: "rg1", gatewayName: "gw1" };
    const realFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async (urlArg) => {
        const url = String(urlArg);
        assert.ok(!url.includes("export=true"), "swagger must not be requested when it is not required");
        calls++;
        if (calls === 1) return { ok: false, status: 400, text: async () => "temporary metadata failure" };
        return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ properties: { connectionParameters: {} } }),
        };
    };
    t.after(() => {
        globalThis.fetch = realFetch;
    });

    await assert.rejects(loadConnectorMeta(config, "retry-meta", "eastus", false), /metadata failure/);
    const meta = await loadConnectorMeta(config, "retry-meta", "eastus", false);
    assert.equal(calls, 2);
    assert.deepEqual(meta.connectionParameters, {});
});

test("uninstall surfaces connection deletion failures", async (t) => {
    writeFileSync(
        join(TMP, "mcp-config.json"),
        JSON.stringify({ mcpServers: { "docusign-bbb": { type: "http", url: "https://example/mcp" } } }),
    );
    const config = { subscriptionId: "sub1", resourceGroup: "rg1", gatewayName: "gw1" };
    const remoteConfig = { name: "docusign-bbb", properties: { connectors: [{ name: "docusign", connectionName: "conn-b" }] } };
    const connection = { name: "conn-b", properties: { statuses: [{ status: "Connected" }] } };
    const realFetch = globalThis.fetch;
    const operations = [];
    globalThis.fetch = async (urlArg, opts = {}) => {
        const url = String(urlArg);
        const method = (opts.method || "GET").toUpperCase();
        operations.push(`${method} ${url}`);
        const ok = (body) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });
        if (method === "GET" && /\/mcpserverConfigs\?/.test(url)) return ok({ value: [remoteConfig] });
        if (method === "GET" && /\/connections\?/.test(url)) return ok({ value: [connection] });
        if (method === "DELETE" && url.includes("/mcpserverConfigs/")) return ok({});
        if (method === "GET" && url.includes("/mcpserverConfigs/")) {
            return { ok: false, status: 404, text: async () => "gone" };
        }
        if (method === "DELETE" && url.includes("/connections/")) {
            return { ok: false, status: 400, text: async () => "delete denied" };
        }
        throw new Error(`unexpected ARM call: ${method} ${url}`);
    };
    t.after(() => {
        globalThis.fetch = realFetch;
    });

    await assert.rejects(uninstallConnector(config, "docusign"), /delete denied/);
    const configDelete = operations.findIndex((item) => item.startsWith("DELETE ") && item.includes("/mcpserverConfigs/"));
    const connectionDelete = operations.findIndex((item) => item.startsWith("DELETE ") && item.includes("/connections/"));
    assert.ok(configDelete !== -1 && configDelete < connectionDelete, "configs must be confirmed deleted before their connections");

    const pendingCleanup = join(TMP, "extensions", "connector-namespaces", "artifacts", "pending-cleanup");
    assert.equal(readdirSync(pendingCleanup).filter((name) => name.endsWith(".json")).length, 1, "failed deletion must persist enough state to retry");

    globalThis.fetch = async (urlArg, opts = {}) => {
        const url = String(urlArg);
        const method = (opts.method || "GET").toUpperCase();
        const ok = (body) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });
        if (method === "GET" && /\/mcpserverConfigs\?/.test(url)) return ok({ value: [] });
        if (method === "GET" && /\/connections\?/.test(url)) return ok({ value: [] });
        if (method === "DELETE") return ok({});
        if (method === "GET" && url.includes("/mcpserverConfigs/")) {
            return { ok: false, status: 404, text: async () => "gone" };
        }
        throw new Error(`unexpected ARM call: ${method} ${url}`);
    };
    assert.deepEqual(await uninstallConnector(config, "docusign"), { ok: true, removed: true });
    assert.equal(readdirSync(pendingCleanup).filter((name) => name.endsWith(".json")).length, 0, "successful retry must clear the cleanup journal");
});

test("uninstall surfaces convergence polling failures", async (t) => {
    writeFileSync(
        join(TMP, "mcp-config.json"),
        JSON.stringify({ mcpServers: { "docusign-bbb": { type: "http", url: "https://example/mcp" } } }),
    );
    const config = { subscriptionId: "sub1", resourceGroup: "rg1", gatewayName: "gw1" };
    const remoteConfig = { name: "docusign-bbb", properties: { connectors: [{ name: "docusign", connectionName: "conn-b" }] } };
    const connection = { name: "conn-b", properties: { statuses: [{ status: "Connected" }] } };
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (urlArg, opts = {}) => {
        const url = String(urlArg);
        const method = (opts.method || "GET").toUpperCase();
        const ok = (body) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });
        if (method === "GET" && /\/mcpserverConfigs\?/.test(url)) return ok({ value: [remoteConfig] });
        if (method === "GET" && url.includes("/mcpserverConfigs/")) {
            return { ok: false, status: 400, text: async () => "poll denied" };
        }
        if (method === "GET" && /\/connections\?/.test(url)) return ok({ value: [connection] });
        if (method === "DELETE") return ok({});
        throw new Error(`unexpected ARM call: ${method} ${url}`);
    };
    t.after(() => {
        globalThis.fetch = realFetch;
    });

    await assert.rejects(uninstallConnector(config, "docusign"), /poll denied/);
});

test("concurrent failed uninstalls retain independent retry records", async (t) => {
    const config = { subscriptionId: "sub1", resourceGroup: "rg1", gatewayName: "concurrent-gw" };
    const configs = [
        { name: "alpha-config", properties: { connectors: [{ name: "alpha", connectionName: "alpha-conn" }] } },
        { name: "beta-config", properties: { connectors: [{ name: "beta", connectionName: "beta-conn" }] } },
    ];
    const connections = [
        { name: "alpha-conn", properties: { statuses: [{ status: "Connected" }] } },
        { name: "beta-conn", properties: { statuses: [{ status: "Connected" }] } },
    ];
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (urlArg, opts = {}) => {
        const url = String(urlArg);
        const method = (opts.method || "GET").toUpperCase();
        const ok = (body) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });
        if (method === "GET" && /\/mcpserverConfigs\?/.test(url)) return ok({ value: configs });
        if (method === "GET" && /\/connections\?/.test(url)) return ok({ value: connections });
        if (method === "DELETE" && url.includes("/mcpserverConfigs/")) return ok({});
        if (method === "GET" && url.includes("/mcpserverConfigs/")) {
            return { ok: false, status: 404, text: async () => "gone" };
        }
        if (method === "DELETE" && url.includes("/connections/")) {
            return { ok: false, status: 400, text: async () => "delete denied" };
        }
        throw new Error(`unexpected ARM call: ${method} ${url}`);
    };
    t.after(() => {
        globalThis.fetch = realFetch;
    });

    const results = await Promise.allSettled([
        uninstallConnector(config, "alpha"),
        uninstallConnector(config, "beta"),
    ]);
    assert.deepEqual(results.map((result) => result.status), ["rejected", "rejected"]);

    const pendingCleanup = join(TMP, "extensions", "connector-namespaces", "artifacts", "pending-cleanup");
    const paths = readdirSync(pendingCleanup)
        .filter((name) => name.endsWith(".json"))
        .map((name) => join(pendingCleanup, name));
    const records = paths.map((path) => ({ path, ...JSON.parse(readFileSync(path, "utf8")) }))
        .filter((record) => record.gatewayId.includes("/connectorGateways/concurrent-gw"));
    assert.deepEqual(new Set(records.map((record) => record.apiName)), new Set(["alpha", "beta"]));
    for (const record of records) unlinkSync(record.path);
});

test("local MCP config read failures block cleanup", async () => {
    const configPath = join(TMP, "mcp-config.json");
    writeFileSync(configPath, "{invalid json");
    try {
        await assert.rejects(removeMcpEntry("docusign-bbb"), SyntaxError);
    } finally {
        writeFileSync(configPath, JSON.stringify({ mcpServers: {} }));
    }
});

test("installed state propagates local MCP config read failures", async (t) => {
    const configPath = join(TMP, "mcp-config.json");
    writeFileSync(configPath, "{invalid json");
    const config = { subscriptionId: "sub1", resourceGroup: "rg1", gatewayName: "state-fail-gw" };
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (urlArg, opts = {}) => {
        const url = String(urlArg);
        const method = (opts.method || "GET").toUpperCase();
        const ok = (body) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });
        if (method === "GET" && /\/mcpserverConfigs\?/.test(url)) return ok({ value: [] });
        if (method === "GET" && /\/connections\?/.test(url)) return ok({ value: [] });
        throw new Error(`unexpected ARM call: ${method} ${url}`);
    };
    t.after(() => {
        globalThis.fetch = realFetch;
        writeFileSync(configPath, JSON.stringify({ mcpServers: {} }));
    });

    await assert.rejects(getInstalledState(config), SyntaxError);
});

test("missing-connection reauth journals cleanup and the next install retries it", async (t) => {
    const configPath = join(TMP, "mcp-config.json");
    writeFileSync(
        configPath,
        JSON.stringify({ mcpServers: { "missing-config": { type: "http", url: "https://example/mcp" } } }),
    );
    const config = { subscriptionId: "sub1", resourceGroup: "rg1", gatewayName: "missing-conn-gw" };
    const remoteConfig = {
        name: "missing-config",
        properties: { connectors: [{ name: "missing-api", connectionName: "missing-conn" }] },
    };
    const realFetch = globalThis.fetch;
    let retrying = false;
    globalThis.fetch = async (urlArg, opts = {}) => {
        const url = String(urlArg);
        const method = (opts.method || "GET").toUpperCase();
        const ok = (body) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });
        if (method === "DELETE" && url.includes("/mcpserverConfigs/")) return ok({});
        if (method === "GET" && url.includes("/mcpserverConfigs/missing-config")) {
            return { ok: false, status: 404, text: async () => "gone" };
        }
        if (method === "DELETE" && url.includes("/connections/missing-conn")) {
            return { ok: false, status: 404, text: async () => "gone" };
        }
        if (retrying && method === "GET" && url.includes("/managedApis/missing-api")) {
            return { ok: false, status: 400, text: async () => "stop after cleanup" };
        }
        if (method === "GET" && /\/mcpserverConfigs\?/.test(url)) return ok({ value: [remoteConfig] });
        if (method === "GET" && /\/connections\?/.test(url)) return ok({ value: [] });
        if (method === "GET" && /\/connectorGateways\/[^/?]+\?/.test(url)) return ok({ location: "eastus" });
        if (method === "GET" && url.includes("/managedApis/missing-api")) return ok({ properties: {} });
        if (method === "POST" && url.includes("/connections/missing-conn/listConsentLinks")) {
            writeFileSync(configPath, "{invalid json");
            return { ok: false, status: 404, text: async () => "connection gone" };
        }
        throw new Error(`unexpected ARM call: ${method} ${url}`);
    };
    t.after(() => {
        globalThis.fetch = realFetch;
        writeFileSync(configPath, JSON.stringify({ mcpServers: {} }));
    });

    await assert.rejects(
        reauthConnector(config, "missing-api", "Missing API", "https://cb/?c="),
        SyntaxError,
    );

    const pendingCleanup = join(TMP, "extensions", "connector-namespaces", "artifacts", "pending-cleanup");
    const matchingRecords = () => readdirSync(pendingCleanup)
        .filter((name) => name.endsWith(".json"))
        .map((name) => JSON.parse(readFileSync(join(pendingCleanup, name), "utf8")))
        .filter((record) => record.gatewayId.includes("/connectorGateways/missing-conn-gw") && record.apiName === "missing-api");
    assert.equal(matchingRecords().length, 1, "failed reauth cleanup must retain retry data");

    writeFileSync(
        configPath,
        JSON.stringify({ mcpServers: { "missing-config": { type: "http", url: "https://example/mcp" } } }),
    );
    retrying = true;
    await assert.rejects(
        installConnector(config, "missing-api", "Missing API", "https://cb/?c="),
        /stop after cleanup/,
    );
    assert.equal(matchingRecords().length, 0, "the next install must consume successful pending cleanup");
    const localConfig = JSON.parse(readFileSync(configPath, "utf8"));
    assert.equal(localConfig.mcpServers["missing-config"], undefined, "pending cleanup must remove the stale local entry");
});

test("fresh-connection rollback surfaces deletion failures", async (t) => {
    const config = { subscriptionId: "sub1", resourceGroup: "rg1", gatewayName: "gw1" };
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: false, status: 400, text: async () => "rollback denied" });
    t.after(() => {
        globalThis.fetch = realFetch;
    });

    await assert.rejects(deleteConnection(config, "fresh-conn"), /rollback denied/);
});

test("finish status failures roll back the fresh connection", async (t) => {
    const config = { subscriptionId: "sub1", resourceGroup: "rg1", gatewayName: "gw1" };
    const realFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (urlArg, opts = {}) => {
        const url = String(urlArg);
        const method = (opts.method || "GET").toUpperCase();
        calls.push({ method, url });
        const ok = (body) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });
        if (method === "GET" && url.includes("/managedApis/") && url.includes("export=true")) {
            return ok({ paths: { "/mcp": { post: { operationId: "op", tags: ["agentic"] } } } });
        }
        if (method === "GET" && url.includes("/managedApis/")) return ok({ properties: {} });
        if (method === "GET" && url.includes("/connections/fresh-status?")) {
            return { ok: false, status: 400, text: async () => "status denied" };
        }
        if (method === "DELETE" && url.includes("/connections/fresh-status?")) return ok({});
        throw new Error(`unexpected ARM call: ${method} ${url}`);
    };
    t.after(() => {
        globalThis.fetch = realFetch;
    });

    await assert.rejects(
        finishInstall(config, "status-fail", "Status Fail", "fresh-status", "eastus"),
        /status denied/,
    );
    assert.ok(calls.some((call) => call.method === "DELETE" && call.url.includes("/connections/fresh-status?")));
});

test("failed config cleanup preserves its referenced connection", async (t) => {
    const config = { subscriptionId: "sub1", resourceGroup: "rg1", gatewayName: "gw1" };
    const realFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (urlArg, opts = {}) => {
        const url = String(urlArg);
        const method = (opts.method || "GET").toUpperCase();
        calls.push({ method, url });
        const ok = (body) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });
        if (method === "GET" && url.includes("/managedApis/") && url.includes("export=true")) {
            return ok({ paths: { "/mcp": { post: { operationId: "op", tags: ["agentic"] } } } });
        }
        if (method === "GET" && url.includes("/managedApis/")) return ok({ properties: {} });
        if (method === "GET" && url.includes("/connections/fresh-config?")) {
            return ok({ properties: { statuses: [{ status: "Connected" }] } });
        }
        if (method === "PUT" && url.includes("/mcpserverConfigs/")) {
            return ok({ properties: { mcpEndpointUrl: "https://example.com/mcp" } });
        }
        if (method === "POST" && url.includes("/listApiKey?")) {
            return { ok: false, status: 400, text: async () => "key denied" };
        }
        if (method === "DELETE" && url.includes("/mcpserverConfigs/")) {
            return { ok: false, status: 400, text: async () => "config cleanup denied" };
        }
        if (method === "DELETE" && url.includes("/connections/")) return ok({});
        throw new Error(`unexpected ARM call: ${method} ${url}`);
    };
    t.after(() => {
        globalThis.fetch = realFetch;
    });

    await assert.rejects(
        finishInstall(config, "cleanup-order", "Cleanup Order", "fresh-config", "eastus"),
        /config cleanup denied/,
    );
    assert.ok(
        !calls.some((call) => call.method === "DELETE" && call.url.includes("/connections/")),
        "a surviving config must keep its referenced connection",
    );
});
