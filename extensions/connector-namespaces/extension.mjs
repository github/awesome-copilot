// Canvas extension entry point — MCP Connectors browser.

import { joinSession, createCanvas } from "@github/copilot-sdk/extension";
import { startServer, stopServer } from "./server.mjs";
import { loadSavedConfig, saveConfig, getSessionConfig, getAddedConnectors, addConnector, removeConnector } from "./state.mjs";
import { fetchCatalog } from "./catalog.mjs";
import { setWorkspaceRoot } from "./install.mjs";

// Load any previously saved connector namespace config on startup
loadSavedConfig();

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "connector-namespaces",
            displayName: "MCP Connectors",
            description: "Browse and add MCP connectors to your session \u2014 search by name or category, then add connectors to enable their tools.",
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
                    name: "add_connector",
                    description: "Add an MCP connector to the current session by ID",
                    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
                    handler: async (ctx) => {
                        const config = getSessionConfig();
                        if (!config) return { added: false, reason: "no_gateway_configured" };
                        const catalog = await fetchCatalog(config.subscriptionId, config.resourceGroup, config.gatewayName);
                        const connector = catalog.find((c) => c.id === ctx.input.id);
                        if (!connector) return { added: false, reason: "not_found" };
                        return addConnector(connector);
                    },
                },
                {
                    name: "remove_connector",
                    description: "Remove a previously added connector by ID",
                    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
                    handler: async (ctx) => removeConnector(ctx.input.id),
                },
                {
                    name: "list_connectors",
                    description: "List all connectors currently added to the session",
                    handler: async () => ({ connectors: getAddedConnectors() }),
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
