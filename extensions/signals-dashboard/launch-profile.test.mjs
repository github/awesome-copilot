import test from "node:test";
import assert from "node:assert/strict";
import {
    buildDeskAgentArgv,
    isDeskProfile,
    isWindowsAppExecutionAlias,
    normalizeDeskProfile,
    parsePluginMcpNames,
} from "./launch-profile.mjs";

test("normalizes supported profiles and defaults unknown values to repo", () => {
    assert.equal(isDeskProfile("repo"), true);
    assert.equal(isDeskProfile("CONNECTED"), true);
    assert.equal(isDeskProfile("other"), false);
    assert.equal(normalizeDeskProfile("CONNECTED"), "connected");
    assert.equal(normalizeDeskProfile("other"), "repo");
});

test("recognizes Windows App Execution Alias paths without trusting repository executables", () => {
    assert.equal(isWindowsAppExecutionAlias(
        "C:\\Users\\person\\AppData\\Local\\Microsoft\\WindowsApps\\wt.exe",
        "C:\\Users\\person\\AppData\\Local"), true);
    assert.equal(isWindowsAppExecutionAlias(
        "C:\\repo\\wt.exe",
        "C:\\Users\\person\\AppData\\Local"), false);
    assert.equal(isWindowsAppExecutionAlias(
        "C:\\Users\\person\\AppData\\Local\\Microsoft\\WindowsApps\\wt.cmd",
        "C:\\Users\\person\\AppData\\Local"), false);
});

test("extracts enabled plugin-scoped MCP names and rejects unsafe names", () => {
    const names = parsePluginMcpNames(JSON.stringify({
        plugins: [
            { kind: "mcp", name: "teams", scope: "plugin", enabled: true },
            { kind: "mcp", name: "repo-mcp", source: "plugin", enabled: true },
            { kind: "mcp", name: "teams", scope: "plugin", enabled: true },
            { kind: "mcp", name: "disabled", scope: "plugin", enabled: false },
            { kind: "mcp", name: "workspace", scope: "repository", enabled: true },
            { kind: "skill", name: "not-an-mcp", scope: "plugin", enabled: true },
            { kind: "mcp", name: "bad;name", scope: "plugin", enabled: true },
        ],
    }));

    assert.deepEqual(names, ["teams", "repo-mcp"]);
    assert.deepEqual(parsePluginMcpNames(`Agency startup\n${JSON.stringify({
        plugins: [{ kind: "mcp", name: "ado", scope: "plugin", enabled: true }],
    })}`), ["ado"]);
    assert.equal(parsePluginMcpNames("not json"), null);
    assert.equal(parsePluginMcpNames("{}"), null);
});

test("builds an Agency repo profile on top of the existing wrapper", () => {
    assert.deepEqual(buildDeskAgentArgv({
        deskName: "cost-desk",
        workshopDir: "C:\\workshop",
        useAgency: true,
        agencyCommand: "C:\\tools\\agency.exe",
        profile: "repo",
        pluginMcpNames: ["teams", "ado"],
    }), [
        "C:\\tools\\agency.exe", "copilot", "--no-default-mcps",
        "--disable-mcp-server", "teams",
        "--disable-mcp-server", "ado",
        "--add-dir", "C:\\workshop",
    ]);
});

test("builds a plain Copilot repo profile without Agency-only flags", () => {
    assert.deepEqual(buildDeskAgentArgv({
        deskName: "cost-desk",
        workshopDir: "/workshop",
        useAgency: false,
        copilotCommand: "/usr/local/bin/copilot",
        profile: "repo",
        pluginMcpNames: ["calendar"],
    }), [
        "/usr/local/bin/copilot", "--name", "cost-desk",
        "--disable-mcp-server", "calendar",
        "--add-dir", "/workshop",
    ]);
});

test("connected and discovery-failure launches preserve the existing tool surface", () => {
    assert.deepEqual(buildDeskAgentArgv({
        deskName: "cost-desk",
        workshopDir: "/workshop",
        useAgency: true,
        profile: "connected",
        pluginMcpNames: ["teams"],
    }), [
        "agency", "copilot", "--add-dir", "/workshop",
    ]);

    assert.deepEqual(buildDeskAgentArgv({
        deskName: "cost-desk",
        workshopDir: "/workshop",
        useAgency: true,
        profile: "repo",
        pluginMcpNames: [],
        discoverySucceeded: false,
    }), [
        "agency", "copilot", "--add-dir", "/workshop",
    ]);
});
