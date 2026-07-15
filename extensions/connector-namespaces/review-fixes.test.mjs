import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { delimiter, join } from "node:path";
import { tmpdir } from "node:os";

import { armSegment, parseAzureCliToken, resolvePosixAzureCli, waitForProvisioning } from "./armClient.mjs";

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

test("Azure authentication is brokered by Azure CLI", async () => {
    const source = await readFile(new URL("armClient.mjs", here), "utf8");
    assert.match(source, /account get-access-token --resource/);
    assert.doesNotMatch(source, /04b07795-8ddb-461a-bbee-02f9e1bf7b46/);
    assert.doesNotMatch(source, /refreshToken/);
    assert.match(source, /await fs\.unlink\(LEGACY_AUTH_CACHE\)/);
    assert.match(source, /resolveWindowsAzureCli/);
    assert.match(source, /resolvePosixAzureCli/);
    assert.match(source, /fs\.realpath\(path\)/);
    assert.match(source, /windowsSystemExecutable\("cmd\.exe"\)/);
    assert.match(source, /\{ cwd: homedir\(\), encoding: "utf8"/);
    assert.deepEqual(
        parseAzureCliToken(JSON.stringify({ accessToken: "token", expires_on: 2_000_000_000 })),
        { token: "token", expiresAt: 2_000_000_000_000 },
    );
    assert.throws(() => parseAzureCliToken("{}"), /incomplete ARM token/);
});

test("POSIX Azure CLI resolution rejects workspace-controlled binaries", async () => {
    const root = await mkdtemp(join(tmpdir(), "cn-az-path-"));
    const workspace = join(root, "workspace");
    const workspaceBin = join(workspace, "node_modules", ".bin");
    const trustedBin = join(root, "trusted-bin");
    await Promise.all([
        mkdir(workspaceBin, { recursive: true }),
        mkdir(trustedBin, { recursive: true }),
    ]);
    await Promise.all([
        writeFile(join(workspaceBin, "az"), "workspace", { mode: 0o755 }),
        writeFile(join(trustedBin, "az"), "trusted", { mode: 0o755 }),
    ]);
    try {
        const resolved = await resolvePosixAzureCli(
            [workspaceBin, trustedBin].join(delimiter),
            workspace,
        );
        assert.equal(resolved, await realpath(join(trustedBin, "az")));
        await assert.rejects(
            resolvePosixAzureCli(workspaceBin, workspace),
            /outside the current workspace/,
        );
    } finally {
        await rm(root, { recursive: true, force: true });
    }
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
