const SANDBOX_ORIGIN = "https://connectors.azure.com";

function requiredString(value, name) {
    const text = String(value || "").trim();
    if (!text) throw new Error(`missing ${name}`);
    return text;
}

export function buildSandboxUrl(config, server) {
    const subscriptionId = requiredString(config?.subscriptionId, "subscriptionId");
    const resourceGroup = requiredString(config?.resourceGroup, "resourceGroup");
    const gatewayName = requiredString(config?.gatewayName, "gatewayName");
    const serverName = requiredString(server, "server");
    const path = [subscriptionId, resourceGroup, gatewayName, "mcp-playground"]
        .map(encodeURIComponent)
        .join("/");
    const url = new URL(`/${path}`, SANDBOX_ORIGIN);
    url.searchParams.set("server", serverName);
    return url.toString();
}

export function resolveSandboxConnector(catalog, installedState, query) {
    const requested = requiredString(query, "server").toLowerCase();
    const available = catalog
        .filter((connector) => installedState[connector.apiName]?.installed)
        .map((connector) => ({
            id: connector.apiName,
            displayName: connector.displayName,
        }));

    const exact = available.filter((connector) =>
        connector.id.toLowerCase() === requested ||
        connector.displayName.toLowerCase() === requested
    );
    if (exact.length === 1) return { connector: exact[0], available };

    const partial = available.filter((connector) =>
        connector.id.toLowerCase().includes(requested) ||
        connector.displayName.toLowerCase().includes(requested)
    );
    if (partial.length === 1) return { connector: partial[0], available };

    return {
        connector: null,
        reason: partial.length > 1 ? "ambiguous" : "not_found_in_my_mcps",
        matches: partial,
        available,
    };
}
