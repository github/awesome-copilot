// Canvas extension entry point — MCP Connectors browser.

import { joinSession, createCanvas } from "@github/copilot-sdk/extension";
import { startServer, stopServer } from "./server.mjs";
import { loadSavedConfig, saveConfig, getSessionConfig } from "./state.mjs";
import { fetchCatalog } from "./catalog.mjs";
import { getInstalledState, openInBrowser, setWorkspaceRoot } from "./install.mjs";
import { buildSandboxUrl, resolveSandboxConnector } from "./sandbox.mjs";

// Load any previously saved connector namespace config on startup
loadSavedConfig();

async function openPlayground(server) {
    const config = getSessionConfig();
    if (!config) return { opened: false, reason: "no_namespace_configured" };
    const catalog = await fetchCatalog(config.subscriptionId, config.resourceGroup, config.gatewayName);
    const installedState = await getInstalledState(config);
    const resolved = resolveSandboxConnector(catalog, installedState, server);
    if (!resolved.connector) return { opened: false, ...resolved };
    const url = buildSandboxUrl(config, resolved.connector.id);
    openInBrowser(url);
    return { opened: true, server: resolved.connector, url };
}

const session = await joinSession({
    tools: [
        {
            name: "connector_namespaces_open_playground",
            description: "Open a named connector from My MCPs in the Azure Connector Namespace playground.",
            parameters: {
                type: "object",
                properties: {
                    server: {
                        type: "string",
                        description: "Connector display name or server ID from My MCPs",
                    },
                },
                required: ["server"],
            },
            handler: async ({ server }) => JSON.stringify(await openPlayground(server)),
        },
    ],
    canvases: [
        createCanvas({
            id: "connector-namespaces",
            displayName: "MCP Connectors",
            description: "Browse, connect, and open MCP connectors in the Azure Connector Namespace Sandbox.",
            inputSchema: {
                type: "object",
                properties: {
                    subscriptionId: { type: "string", description: "Azure subscription ID (optional \u2014 if omitted, uses saved config or shows picker)" },
                    resourceGroup: { type: "string", description: "Resource group name" },
                    gatewayName: { type: "string", description: "Connector namespace name" },
                },
            },
            actions: [
                {
                    name: "open_sandbox",
                    description: "Open a named connector from My MCPs in the Azure Connector Namespace Sandbox",
                    inputSchema: {
                        type: "object",
                        properties: {
                            server: {
                                type: "string",
                                description: "Connector display name or server ID from My MCPs",
                            },
                        },
                        required: ["server"],
                    },
                    handler: async (ctx) => openPlayground(ctx.input.server),
                },
            ],
            open: async (ctx) => {
                // If explicit input provided, use it and save for future
                if (ctx.input && ctx.input.subscriptionId && ctx.input.resourceGroup && ctx.input.gatewayName) {
                    saveConfig({
                        subscriptionId: ctx.input.subscriptionId,
                        resourceGroup: ctx.input.resourceGroup,
                        gatewayName: ctx.input.gatewayName,
                    });
                }
                // Otherwise rely on saved config (loaded on startup) — server handles the picker if none saved.
                const entry = await startServer(ctx.instanceId);
                return { title: "MCP Connectors", url: entry.url };
            },
            onClose: async (ctx) => {
                await stopServer(ctx.instanceId);
            },
        }),
    ],
});

// Tell the install pipeline where the workspace .mcp.json lives (if any).
setWorkspaceRoot(session.workspacePath);
