import { test } from "node:test";
import assert from "node:assert/strict";

import { buildSandboxUrl, resolveSandboxConnector } from "./sandbox.mjs";

const config = {
    subscriptionId: "f34b22a3-2202-4fb1-b040-1332bd928c84",
    resourceGroup: "jack sandboxgroup rg",
    gatewayName: "yeah-github-cli",
};

const catalog = [
    { apiName: "WorkIQTeamsMCP-1a81f9", displayName: "Work IQ Teams MCP" },
    { apiName: "WorkIQSharePointMCP-abcd", displayName: "Work IQ SharePoint MCP" },
    { apiName: "OtherMCP-1234", displayName: "Other MCP" },
];

const installedState = {
    "WorkIQTeamsMCP-1a81f9": { installed: true },
    "WorkIQSharePointMCP-abcd": { installed: true },
    "OtherMCP-1234": { installed: false },
};

test("buildSandboxUrl creates the namespace playground deep link", () => {
    assert.equal(
        buildSandboxUrl(config, "WorkIQTeamsMCP-1a81f9"),
        "https://connectors.azure.com/f34b22a3-2202-4fb1-b040-1332bd928c84/jack%20sandboxgroup%20rg/yeah-github-cli/mcp-playground?server=WorkIQTeamsMCP-1a81f9",
    );
});

test("resolveSandboxConnector finds a My MCP by display-name fragment", () => {
    const result = resolveSandboxConnector(catalog, installedState, "teams");
    assert.deepEqual(result.connector, {
        id: "WorkIQTeamsMCP-1a81f9",
        displayName: "Work IQ Teams MCP",
    });
});

test("resolveSandboxConnector never returns catalog entries outside My MCPs", () => {
    const result = resolveSandboxConnector(catalog, installedState, "Other MCP");
    assert.equal(result.connector, null);
    assert.equal(result.reason, "not_found_in_my_mcps");
    assert.deepEqual(result.available.map((connector) => connector.id), [
        "WorkIQTeamsMCP-1a81f9",
        "WorkIQSharePointMCP-abcd",
    ]);
});

test("resolveSandboxConnector reports ambiguous names with matches", () => {
    const result = resolveSandboxConnector(catalog, installedState, "work iq");
    assert.equal(result.connector, null);
    assert.equal(result.reason, "ambiguous");
    assert.equal(result.matches.length, 2);
});
