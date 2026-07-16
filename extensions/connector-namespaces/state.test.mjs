import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("saved namespace config uses private directory and file permissions", async (t) => {
    const root = mkdtempSync(join(tmpdir(), "connector-state-"));
    const previousHome = process.env.COPILOT_HOME;
    process.env.COPILOT_HOME = root;
    t.after(() => {
        if (previousHome === undefined) delete process.env.COPILOT_HOME;
        else process.env.COPILOT_HOME = previousHome;
        rmSync(root, { recursive: true, force: true });
    });

    const state = await import(`./state.mjs?permissions=${Date.now()}`);
    const config = {
        subscriptionId: "00000000-0000-0000-0000-000000000000",
        resourceGroup: "example-rg",
        gatewayName: "example-gateway",
    };
    state.saveConfig(config);

    const storageDir = join(root, "extensions", "connector-namespaces", "artifacts");
    const configFile = join(storageDir, "gateway-config.json");
    assert.deepEqual(JSON.parse(readFileSync(configFile, "utf8")), config);
    if (process.platform !== "win32") {
        assert.equal(statSync(storageDir).mode & 0o777, 0o700);
        assert.equal(statSync(configFile).mode & 0o777, 0o600);
    }
});
