// Catalog — fetches MCP connectors from the gateway.
//
// The gateway exposes ~1600 managed APIs (the full Logic Apps connector
// catalog). MCP servers are a small subset (~43) and there is no `kind` or
// capability flag that distinguishes them. The only reliable signal is the
// string "mcp" appearing in the API's name OR its display name — and those are
// genuinely independent signals: `workiqsharepoint` has no "mcp" in its name
// (display name "Work IQ SharePoint MCP"), while `hginsightsmcp` has "mcp" in
// its name but a display name of "HG Insights Connect". Matching either keeps
// the full set without an allowlist that has to be hand-maintained.

import { listManagedApis } from "./armClient.mjs";
import { CATEGORY } from "./categories.mjs";

function isMcpServer(api) {
    const name = api.name || "";
    const displayName = api.properties?.generalInformation?.displayName || "";
    return /mcp/i.test(name) || /mcp/i.test(displayName);
}

// Microsoft first-party servers (a365*/d365*/workiq* names, or a Microsoft-
// branded display name) group under "Microsoft"; everything else is a partner
// server. Derived rather than hardcoded so new servers categorize themselves.
function categoryFor(name, displayName) {
    const n = (name || "").toLowerCase();
    const d = (displayName || "").toLowerCase();
    const isMicrosoft =
        /^(a365|d365|workiq)/.test(n) ||
        d.startsWith("microsoft") ||
        d.startsWith("work iq") ||
        d.startsWith("dynamics 365");
    return isMicrosoft ? CATEGORY.microsoft : CATEGORY.partner;
}

let cachedCatalog = null;
let cacheKey = null;

export function invalidateCache() {
    cachedCatalog = null;
    cacheKey = null;
}

export async function fetchCatalog(subscriptionId, resourceGroup, gatewayName) {
    const key = `${subscriptionId}/${resourceGroup}/${gatewayName}`;
    if (cachedCatalog && cacheKey === key) return cachedCatalog;

    const apis = await listManagedApis(subscriptionId, resourceGroup, gatewayName);

    const catalog = apis
        .filter(isMcpServer)
        .map((a) => {
            const props = a.properties || {};
            const general = props.generalInformation || {};
            const metadata = props.metadata || {};
            const displayName = general.displayName || a.name;
            return {
                id: a.name,
                apiName: a.name,
                displayName,
                description: general.description || "",
                iconUri: general.iconUri || "",
                brandColor: metadata.brandColor || "",
                category: categoryFor(a.name, displayName),
            };
        });

    cachedCatalog = catalog;
    cacheKey = key;
    return catalog;
}
