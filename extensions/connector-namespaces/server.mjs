// Loopback HTTP server — serves connector namespace picker + connector catalog UI.

import { createServer } from "node:http";
import { renderCatalogHtml, renderErrorHtml, renderSetupHtml } from "./renderer.mjs";
import { renderCreateNamespaceHtml } from "./createPage.mjs";
import { addConnector, removeConnector, getSessionConfig, saveConfig, clearConfig } from "./state.mjs";
import { fetchCatalog, invalidateCache } from "./catalog.mjs";
import {
    listConnectorGateways,
    listSubscriptions,
    listResourceGroups,
    listUserAssignedIdentities,
    checkConnectorGatewayNameAvailable,
    createResourceGroup,
    createConnectorGateway,
    buildGatewayIdentity,
} from "./armClient.mjs";
import { installConnector, finishInstall, openInBrowser, openMcpConfigFile, getInstalledState, uninstallConnector, deleteConnection, prewarmMeta } from "./install.mjs";

const servers = new Map();
const starting = new Map(); // instanceId → Promise<entry> while a server is binding
const gatewayCache = new Map();
const pendingOAuth = new Map(); // connName → timestamp

const PENDING_OAUTH_TTL_MS = 15 * 60 * 1000;
// Drop stale/abandoned consent markers so the map can't grow unbounded and a
// brand-new install of the same connection can't observe a stale "done".
function prunePendingOAuth() {
    const now = Date.now();
    for (const [name, ts] of pendingOAuth) {
        if (now - ts > PENDING_OAUTH_TTL_MS) pendingOAuth.delete(name);
    }
}

// Whether a connector was added during the life of THIS extension process.
// MCP tools are only loaded by the CLI at session start, so an install done
// after the process started isn't usable until the session restarts. A real
// session restart spawns a fresh process and resets this to false. `acked`
// lets the user dismiss the reminder for the rest of the process.
let pendingRestart = false;
let restartAcked = false;

function parseBody(req) {
    return new Promise((resolve) => {
        let data = "";
        req.on("data", (chunk) => { data += chunk; });
        req.on("end", () => {
            try { resolve(JSON.parse(data)); }
            catch { resolve({}); }
        });
    });
}

async function handleRequest(req, res, instanceId) {
    const url = new URL(req.url, "http://localhost");

    // --- API routes ---

    if (req.method === "POST" && url.pathname === "/api/add") {
        const body = await parseBody(req);
        const config = getSessionConfig();
        if (!config) { json(res, { added: false, reason: "no_config" }); return; }
        const catalog = await fetchCatalog(config.subscriptionId, config.resourceGroup, config.gatewayName);
        const connector = catalog.find((c) => c.id === body.id);
        json(res, connector ? addConnector(connector) : { added: false, reason: "not_found" });
        return;
    }

    if (req.method === "POST" && url.pathname === "/api/remove") {
        const body = await parseBody(req);
        json(res, removeConnector(body.id));
        return;
    }

    if (req.method === "POST" && url.pathname === "/api/select-gateway") {
        const body = await parseBody(req);
        const { subscriptionId, resourceGroup, gatewayName } = body;
        if (!subscriptionId || !resourceGroup || !gatewayName) {
            json(res, { error: "missing_fields" });
            return;
        }
        saveConfig({ subscriptionId, resourceGroup, gatewayName });
        invalidateCache();
        json(res, { ok: true });
        return;
    }

    if (req.method === "POST" && url.pathname === "/api/change-gateway") {
        clearConfig();
        invalidateCache();
        json(res, { ok: true });
        return;
    }

    if (req.method === "GET" && url.pathname === "/api/gateways") {
        const subId = url.searchParams.get("subscriptionId");
        const all = url.searchParams.get("all") === "true";
        if (!subId) { json(res, { error: "missing subscriptionId" }); return; }
        const cacheKey = `gw:${subId}:${all ? "all" : "top"}`;
        if (gatewayCache.has(cacheKey)) {
            const cached = gatewayCache.get(cacheKey);
            json(res, { gateways: cached.items, hasMore: cached.hasMore, cached: true });
            return;
        }
        try {
            const result = await listConnectorGateways(subId, { fetchAll: all });
            gatewayCache.set(cacheKey, result);
            json(res, { gateways: result.items, hasMore: result.hasMore });
        } catch (err) {
            json(res, { error: err.message });
        }
        return;
    }

    // --- Create connector namespace routes ---

    if (req.method === "GET" && url.pathname === "/api/resource-groups") {
        const subId = url.searchParams.get("subscriptionId");
        if (!subId) { json(res, { error: "missing subscriptionId" }); return; }
        try {
            json(res, { resourceGroups: await listResourceGroups(subId) });
        } catch (err) {
            json(res, { error: err.message });
        }
        return;
    }

    if (req.method === "GET" && url.pathname === "/api/identities") {
        const subId = url.searchParams.get("subscriptionId");
        if (!subId) { json(res, { error: "missing subscriptionId" }); return; }
        try {
            json(res, { identities: await listUserAssignedIdentities(subId) });
        } catch (err) {
            json(res, { error: err.message });
        }
        return;
    }

    if (req.method === "GET" && url.pathname === "/api/check-name") {
        const subId = url.searchParams.get("subscriptionId");
        const resourceGroup = url.searchParams.get("resourceGroup");
        const name = url.searchParams.get("name");
        if (!subId || !resourceGroup || !name) { json(res, { error: "missing_fields" }); return; }
        try {
            json(res, { available: await checkConnectorGatewayNameAvailable(subId, resourceGroup, name) });
        } catch (err) {
            json(res, { error: err.message });
        }
        return;
    }

    if (req.method === "POST" && url.pathname === "/api/create-namespace") {
        const body = await parseBody(req);
        const { subscriptionId, resourceGroup, createNewResourceGroup, region, name, enableSystemIdentity, userAssignedIds } = body;
        if (!subscriptionId || !resourceGroup || !region || !name) {
            json(res, { error: "missing_fields" });
            return;
        }
        try {
            if (createNewResourceGroup) {
                await createResourceGroup(subscriptionId, resourceGroup, region);
            }
            const identity = buildGatewayIdentity(!!enableSystemIdentity, Array.isArray(userAssignedIds) ? userAssignedIds : []);
            await createConnectorGateway(subscriptionId, resourceGroup, name, { location: region, identity });
            saveConfig({ subscriptionId, resourceGroup, gatewayName: name });
            invalidateCache();
            gatewayCache.clear();
            json(res, { ok: true });
        } catch (err) {
            json(res, { error: err.message });
        }
        return;
    }

    // --- Install flow routes ---

    if (req.method === "POST" && url.pathname === "/api/install") {
        const body = await parseBody(req);
        const config = getSessionConfig();
        if (!config) { json(res, { error: "no_config" }); return; }
        const { apiName, displayName } = body;
        if (!apiName) { json(res, { error: "missing apiName" }); return; }
        const serverEntry = servers.get(instanceId);
        const port = serverEntry ? new URL(serverEntry.url).port : "0";
        const callbackBase = `http://127.0.0.1:${port}/auth/callback/`;
        try {
            const result = await installConnector(config, apiName, displayName || apiName, callbackBase, "profile");
            if (result && !result.error && !result.needsConsent) { pendingRestart = true; restartAcked = false; }
            json(res, result);
        } catch (err) {
            json(res, { error: err.message });
        }
        return;
    }

    if (req.method === "POST" && url.pathname === "/api/finish-install") {
        const body = await parseBody(req);
        const config = getSessionConfig();
        if (!config) { json(res, { error: "no_config" }); return; }
        try {
            const result = await finishInstall(config, body.apiName, body.displayName, body.connName, body.location, "profile");
            if (result && !result.error) { pendingRestart = true; restartAcked = false; }
            json(res, result);
        } catch (err) {
            json(res, { error: err.message });
        }
        return;
    }

    if (req.method === "POST" && url.pathname === "/api/open-url") {
        const body = await parseBody(req);
        if (!body.url || !/^https?:\/\//.test(body.url)) { json(res, { error: "invalid url" }); return; }
        openInBrowser(body.url);
        json(res, { ok: true });
        return;
    }

    if (req.method === "POST" && url.pathname === "/api/open-config") {
        try {
            const result = await openMcpConfigFile();
            json(res, result);
        } catch (err) {
            json(res, { ok: false, error: err.message });
        }
        return;
    }

    if (req.method === "GET" && url.pathname === "/oauth-status") {
        prunePendingOAuth();
        const connName = url.searchParams.get("connectionName") || "";
        // Consume the marker once observed so the map self-cleans on the happy
        // path instead of lingering until the TTL sweep. delete() returns true
        // iff the marker existed, which is exactly the "done" signal.
        const done = connName ? pendingOAuth.delete(connName) : false;
        json(res, { done });
        return;
    }

    if (req.method === "GET" && url.pathname === "/api/state") {
        const config = getSessionConfig();
        if (!config) { json(res, { error: "no_config" }); return; }
        try {
            const state = await getInstalledState(config);
            json(res, { state, pendingRestart: pendingRestart && !restartAcked });
        } catch (err) {
            json(res, { error: err.message });
        }
        return;
    }

    if (req.method === "POST" && url.pathname === "/api/ack-restart") {
        restartAcked = true;
        json(res, { ok: true });
        return;
    }

    if (req.method === "POST" && url.pathname === "/api/uninstall") {
        const body = await parseBody(req);
        const config = getSessionConfig();
        if (!config) { json(res, { error: "no_config" }); return; }
        if (!body.apiName) { json(res, { error: "missing apiName" }); return; }
        try {
            const result = await uninstallConnector(config, body.apiName);
            json(res, result);
        } catch (err) {
            json(res, { error: err.message });
        }
        return;
    }

    // Roll back a connection orphaned by a cancelled install (no config exists
    // yet, so /api/uninstall can't find it — delete the connection directly).
    if (req.method === "POST" && url.pathname === "/api/rollback-connection") {
        const body = await parseBody(req);
        const config = getSessionConfig();
        if (!config) { json(res, { error: "no_config" }); return; }
        if (!body.connName) { json(res, { error: "missing connName" }); return; }
        try {
            const result = await deleteConnection(config, body.connName);
            json(res, result);
        } catch (err) {
            json(res, { error: err.message });
        }
        return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/auth/callback/")) {
        const connName = decodeURIComponent(url.pathname.slice("/auth/callback/".length));
        prunePendingOAuth();
        if (connName) pendingOAuth.set(connName, Date.now());
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Sign-in complete</title></head><body style="font-family:system-ui;padding:2rem;"><h2>Sign-in complete</h2><p>You can close this tab and return to Copilot.</p></body></html>`);
        return;
    }

    // --- Page routes ---

    const config = getSessionConfig();

    // Create connector namespace page (reachable with or without a saved config)
    if (url.pathname === "/create") {
        try {
            const subs = await listSubscriptions();
            const preselected = url.searchParams.get("subscriptionId") || "";
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(renderCreateNamespaceHtml(subs, preselected));
        } catch (err) {
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(renderErrorHtml(`Failed to load subscriptions. Sign in to Azure when the browser opens, then reload this page.\n\n${err.message}`));
        }
        return;
    }

    // Setup page (no gateway configured)
    if (!config || url.pathname === "/setup") {
        try {
            const subs = await listSubscriptions();
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(renderSetupHtml(subs));
        } catch (err) {
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(renderErrorHtml(`Failed to load subscriptions. Sign in to Azure when the browser opens, then reload this page.\n\n${err.message}`));
        }
        return;
    }

    // Catalog page
    const filter = url.searchParams.get("filter") || "";
    const category = url.searchParams.get("category") || "";
    const source = url.searchParams.get("source") || "";

    try {
        const catalog = await fetchCatalog(config.subscriptionId, config.resourceGroup, config.gatewayName);
        // Warm connector metadata (opId + connection params) in the background so
        // the Connect click doesn't pay for the slow swagger export.
        prewarmMeta(config, catalog.map((c) => c.apiName));
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(renderCatalogHtml(instanceId, catalog, { filter, category, source, config }));
    } catch (err) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(renderErrorHtml(`Failed to fetch catalog: ${err.message}`));
    }
}

function json(res, data) {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
}

export function startServer(instanceId) {
    const existing = servers.get(instanceId);
    if (existing) return Promise.resolve(existing);
    const inflight = starting.get(instanceId);
    if (inflight) return inflight;

    const p = (async () => {
        const server = createServer((req, res) => handleRequest(req, res, instanceId));
        await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
        const address = server.address();
        const port = typeof address === "object" && address ? address.port : 0;
        const entry = { server, url: `http://127.0.0.1:${port}/` };
        servers.set(instanceId, entry);
        return entry;
    })();
    // Record the in-flight start synchronously so a concurrent open() for the
    // same instance awaits this server instead of binding a second one and
    // leaking the first.
    starting.set(instanceId, p);
    p.finally(() => { if (starting.get(instanceId) === p) starting.delete(instanceId); });
    return p;
}

export async function stopServer(instanceId) {
    const inflight = starting.get(instanceId);
    if (inflight) { try { await inflight; } catch { /* start failed; nothing to close */ } }
    const entry = servers.get(instanceId);
    if (entry) {
        servers.delete(instanceId);
        // close() never resolves while the iframe holds a keep-alive socket —
        // drop live connections first so onClose can't hang and leak the process.
        if (typeof entry.server.closeAllConnections === "function") entry.server.closeAllConnections();
        await new Promise((resolve) => entry.server.close(() => resolve()));
    }
}
