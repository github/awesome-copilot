import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { armSegment, waitForProvisioning } from "./armClient.mjs";

const here = new URL(".", import.meta.url);

test("ARM path segments reject traversal aliases", () => {
    assert.throws(() => armSegment("."), /Invalid ARM resource identifier/);
    assert.throws(() => armSegment(".."), /Invalid ARM resource identifier/);
    assert.equal(armSegment("valid.name"), "valid.name");
});

test("namespace creation is create-only and reports provisioning timeout", async () => {
    const source = await readFile(new URL("armClient.mjs", here), "utf8");
    const createResourceGroup = source.slice(
        source.indexOf("export async function createResourceGroup"),
        source.indexOf("export async function listUserAssignedIdentities"),
    );
    const createConnectorGateway = source.slice(
        source.indexOf("export async function createConnectorGateway"),
    );
    assert.match(createResourceGroup, /"If-None-Match": "\*"/);
    assert.match(createConnectorGateway, /"If-None-Match": "\*"/);
    assert.match(source, /Provisioning timed out/);
});

test("namespace creation polls an empty 202 result until explicit success", async () => {
    const states = [
        { properties: { provisioningState: "InProgress" } },
        { properties: { provisioningState: "Succeeded" } },
    ];
    let calls = 0;
    const result = await waitForProvisioning(
        undefined,
        "gateway",
        async () => {
            calls++;
            return states.shift();
        },
        { maxPolls: 2, delay: async () => {} },
    );
    assert.equal(calls, 2);
    assert.equal(result.properties.provisioningState, "Succeeded");
    await assert.rejects(
        waitForProvisioning(undefined, "gateway", async () => undefined, { maxPolls: 1, delay: async () => {} }),
        /last state: unknown/,
    );
});

test("Azure authentication uses an interactive browser and persistent encrypted cache", async () => {
    const [authSource, armSource] = await Promise.all([
        readFile(new URL("auth.mjs", here), "utf8"),
        readFile(new URL("armClient.mjs", here), "utf8"),
    ]);
    assert.match(authSource, /new InteractiveBrowserCredential\(options\)/);
    assert.match(authSource, /useIdentityPlugin\(cachePersistencePlugin\)/);
    assert.match(authSource, /disableAutomaticAuthentication: true/);
    assert.match(authSource, /tokenCachePersistenceOptions/);
    assert.match(authSource, /credential\.authenticate\(\s*this\.scope,\s*\{ abortSignal/);
    assert.match(authSource, /serializeAuthenticationRecord/);
    assert.doesNotMatch(armSource, /get-access-token|az login|resolvePosixAzureCli/);
});

test("installer preserves capability tokens and persists direct HTTP entries", async () => {
    const source = await readFile(new URL("install.mjs", here), "utf8");
    const fallbacks = source.match(/installConnector\(config, apiName, displayName, callbackBase, scope, capabilityToken\)/g);
    assert.equal(fallbacks?.length, 1);
    assert.match(source, /reauthConnectorWithAttempts\([\s\S]*?capabilityToken,[\s\S]*?attemptedConfigNames/);
    assert.match(source, /headers: \{ "X-API-Key": key \}/);
    assert.match(source, /const cacheKey = `\$\{sub\}:\$\{location\}:\$\{apiName\}:\$\{requireSwagger\}`/);
    assert.match(source, /throwAfterCleanup\(error, \[\(\) => deleteConnection\(config, connName\)\]\)/);
    assert.match(source, /freshConnection: true/);
    assert.match(source, /freshConnection: false/);
    assert.match(source, /await fs\.open\(lockPath, "wx", 0o600\)/);
    assert.match(source, /await fs\.rename\(temporary, path\)/);
    assert.match(source, /resolveSystemExecutable\("rundll32\.exe"\)/);
});

test("smoke cleanup runs from finally and reports cleanup failures", async () => {
    const source = await readFile(new URL("test/smoke.mjs", here), "utf8");
    assert.match(source, /finally \{\s*if \(record\.cleanup\)/);
    assert.match(source, /record\.cleanupError/);
    assert.match(source, /failed\.length > 0 \|\| orchestrationErrors\.length > 0/);
    assert.match(source, /probe\.status === "passed"/);
    assert.match(source, /probe\.status === "skipped"/);
    assert.match(source, /mode: 0o700/);
    assert.match(source, /mode: 0o600/);
    assert.match(source, /chmodSync\(PENDING_FILE, 0o600\)/);
});

test("test reports do not persist successful tool response content", async () => {
    const source = await readFile(new URL("test/mcp-probe.mjs", here), "utf8");
    assert.doesNotMatch(source, /toolsCall\.preview\s*=/);
    assert.match(source, /toolsCall\.result = "response received"/);
});

test("obsolete in-memory add and remove canvas actions are not advertised", async () => {
    const source = await readFile(new URL("extension.mjs", here), "utf8");
    assert.doesNotMatch(source, /name: "add_connector"/);
    assert.doesNotMatch(source, /name: "remove_connector"/);
    assert.doesNotMatch(source, /name: "list_connectors"/);
    assert.match(source, /name: "open_sandbox"/);
});
