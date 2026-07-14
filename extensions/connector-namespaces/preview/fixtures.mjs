// Deterministic fixtures for the standalone canvas preview server.
//
// These mirror the exact response shapes the inline client script in
// renderer.mjs expects, so the preview server can drive every canvas state
// (setup / catalog / error / connecting-spinner / restart-banner) with no
// Copilot app, no ARM, and no real OAuth. Keep these shapes in sync with the
// fetch() handlers in renderer.mjs if those response contracts change.

import { CATEGORY } from "../categories.mjs";

export const subscriptions = [
    { id: "00000000-0000-0000-0000-000000000001", name: "Contoso Production" },
    { id: "11111111-1111-1111-1111-111111111111", name: "Contoso Dev/Test" },
];

// /api/gateways?subscriptionId=... -> { gateways: [{ id, name, location }], hasMore }
// The client splits id on "/" and reads the segment after "resourceGroups",
// so the id must contain a resourceGroups segment.
export const gateways = [
    {
        id: "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg-connectors/providers/Microsoft.ConnectorNamespaces/connectorNamespaces/contoso-ns",
        name: "contoso-ns",
        location: "eastus",
    },
    {
        id: "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg-shared/providers/Microsoft.ConnectorNamespaces/connectorNamespaces/shared-ns",
        name: "shared-ns",
        location: "westus2",
    },
];

// Active namespace shown in the catalog header (config.gatewayName / resourceGroup).
export const config = {
    subscriptionId: "00000000-0000-0000-0000-000000000001",
    gatewayName: "contoso-ns",
    resourceGroup: "rg-connectors",
};

// Catalog tiles. Shape per item: { category, displayName, apiName, description,
// iconUri?, brandColor? }. At least one item must be connectable so the
// connect -> spinner flow can be exercised.
//
// The renderer routes items by category: exactly `category === CATEGORY.microsoft`
// lands in the Microsoft section, everything else in Partners. Keep a mix of
// both here so the preview exercises the full 3-section layout (My MCPs /
// Microsoft / Partners) rather than dumping every tile into one section.
export const catalog = [
    {
        category: CATEGORY.microsoft,
        displayName: "Microsoft Teams",
        apiName: "teams",
        description: "Send messages, manage chats and channels.",
        brandColor: "#5059c9",
    },
    {
        category: CATEGORY.microsoft,
        displayName: "Outlook Mail",
        apiName: "outlook",
        description: "Read, send, and organize email.",
        brandColor: "#0a66c2",
    },
    {
        category: CATEGORY.microsoft,
        displayName: "SharePoint",
        apiName: "sharepoint",
        description: "Browse sites, lists, and documents.",
        brandColor: "#038387",
    },
    {
        category: CATEGORY.partner,
        displayName: "GitHub",
        apiName: "github",
        description: "Manage repos, issues, and pull requests.",
        brandColor: "#24292e",
    },
    {
        category: CATEGORY.partner,
        displayName: "Stripe",
        apiName: "stripe",
        description: "Payments, customers, and invoices.",
        brandColor: "#635bff",
    },
];

// /api/state -> { state: { apiName: InstallState }, pendingRestart }
// InstallState: { installed, connectionStatus, inCli, cliPath?, cliScope? }
// Default state: nothing installed, no pending restart. The catalog renders
// every tile with a "Connect" button.
export const stateEmpty = {
    state: {},
    pendingRestart: false,
};

// One connector already added (shows "Added" + Remove), restart pending so the
// banner is visible on load. Drives both the "added" tile and the banner state.
export const stateInstalledRestart = {
    state: {
        sharepoint: {
            installed: true,
            connectionStatus: "Connected",
            inCli: true,
            cliPath: "~/.copilot/mcp-config.json",
            cliScope: "profile",
        },
    },
    pendingRestart: true,
};

// Install response that forces the connecting flow. needsConsent keeps the
// sign-in modal (with the .si-spin spinner) open; /oauth-status then stays
// pending so the spinner keeps animating for a screenshot.
export const installNeedsConsent = {
    needsConsent: true,
    connName: "preview-conn",
    consentUrl: "http://127.0.0.1:7331/fake-consent",
    location: "eastus",
};
