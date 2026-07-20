// ARM API client — fetches real connector data with interactive Azure credentials.

import { constants as fsConstants, promises as fs } from "node:fs";
import { platform } from "node:os";
import { basename, isAbsolute, join, resolve, sep } from "node:path";
import { getToken } from "./auth.mjs";

export { getToken };

const API_VERSION = "2026-05-01-preview";
const RG_API_VERSION = "2021-04-01";
const MSI_API_VERSION = "2023-01-31";
const SUBS_API_VERSION = "2020-01-01";

function windowsSystemExecutable(name) {
    const systemRoot = process.env.SystemRoot;
    if (systemRoot && isAbsolute(systemRoot)) return join(systemRoot, "System32", name);
    throw new Error(`Could not resolve the Windows system executable ${name}.`);
}

async function trustedExecutablePath(path, expectedName, workspaceRoot = process.cwd()) {
    if (!isAbsolute(path) || /["\r\n]/.test(path)) return null;
    let candidate;
    let workspace;
    try {
        [candidate, workspace] = await Promise.all([
            fs.realpath(path),
            fs.realpath(workspaceRoot),
        ]);
        if (!(await fs.stat(candidate)).isFile()) return null;
        if (platform() !== "win32") await fs.access(candidate, fsConstants.X_OK);
    } catch {
        return null;
    }
    const insensitive = platform() === "win32";
    const normalize = (value) => insensitive ? value.toLowerCase() : value;
    const normalizedCandidate = normalize(resolve(candidate));
    const normalizedWorkspace = normalize(resolve(workspace));
    const workspacePrefix = normalizedWorkspace.endsWith(sep)
        ? normalizedWorkspace
        : `${normalizedWorkspace}${sep}`;
    if (
        normalize(basename(candidate)) !== normalize(expectedName) ||
        normalizedCandidate === normalizedWorkspace ||
        normalizedCandidate.startsWith(workspacePrefix)
    ) return null;
    return candidate;
}

export async function resolveSystemExecutable(name, workspaceRoot = process.cwd()) {
    const candidates = platform() === "win32"
        ? [windowsSystemExecutable(name)]
        : [join("/usr/bin", name), join("/bin", name), join("/usr/local/bin", name)];
    for (const path of candidates) {
        const candidate = await trustedExecutablePath(path, name, workspaceRoot);
        if (candidate) return candidate;
    }
    throw new Error(`Could not resolve the trusted system executable ${name}.`);
}

/**
 * List all enabled Azure subscriptions the user has access to.
 */
// The set of enabled subscriptions is stable for a session, so cache it — the
// first /setup pays the ARM round-trip once and every "Change namespace"
// afterwards serves from memory.
let s_subsCache = null; // { subs, expiresAt }
const SUBS_TTL_MS = 30 * 60 * 1000;

export function invalidateSubscriptionsCache() {
    s_subsCache = null;
}

export async function listSubscriptions({ forceRefresh = false } = {}) {
    const now = Date.now();
    if (!forceRefresh && s_subsCache && s_subsCache.expiresAt > now) return s_subsCache.subs;
    const token = await getToken();
    const url = `https://management.azure.com/subscriptions?api-version=${SUBS_API_VERSION}`;
    const raw = await paginateAll(url, token);
    const subs = raw
        .filter((s) => s.state === "Enabled")
        .map((s) => ({ id: s.subscriptionId, name: s.displayName, tenantId: s.tenantId, state: s.state }));
    s_subsCache = { subs, expiresAt: now + SUBS_TTL_MS };
    return subs;
}

// ARM resource identifiers are a restricted charset (letters, digits and a few
// punctuation chars). Validating each path segment against this allowlist before
// it enters a URL rejects anything containing "/", "?", "#", "@" or ":" — the
// characters that could otherwise alter the request path or redirect the host —
// and acts as a taint barrier so config/file-derived names cannot reach fetch
// unvalidated.
const ARM_SEGMENT = /^[A-Za-z0-9._()-]{1,256}$/;

export function armSegment(value) {
    const s = String(value);
    if (s === "." || s === ".." || !ARM_SEGMENT.test(s)) {
        throw new Error(`Invalid ARM resource identifier: ${s}`);
    }
    return s;
}

function buildBaseUrl(subscriptionId, resourceGroup, gatewayName) {
    return `https://management.azure.com/subscriptions/${armSegment(subscriptionId)}/resourceGroups/${armSegment(resourceGroup)}/providers/Microsoft.Web/connectorGateways/${armSegment(gatewayName)}`;
}

// Hard host allowlist: every request this client makes targets ARM and only
// ARM. The trailing slash matters — it blocks suffix/userinfo bypasses such as
// "https://management.azure.com.evil.com/" and "https://management.azure.com@evil.com/",
// neither of which starts with this exact prefix. This guards the paginated
// nextLink (a server-supplied value) which does not pass through armSegment.
const ARM_BASE = "https://management.azure.com/";

// Returns the URL only if it targets ARM, otherwise throws. Used by callers
// (e.g. install.mjs) that build ARM URLs before handing them here.
export function assertArmHost(rawUrl) {
    const url = String(rawUrl);
    if (!url.startsWith(ARM_BASE)) {
        throw new Error(`Refusing to call non-ARM URL: ${url}`);
    }
    return url;
}

async function armFetch(url, token) {
    // Guard the exact value handed to fetch so a tainted path segment or a
    // server-supplied nextLink can never redirect the call off ARM.
    if (!url.startsWith(ARM_BASE)) {
        throw new Error(`Refusing to call non-ARM URL: ${url}`);
    }
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`ARM ${res.status}: ${body.slice(0, 300)}`);
    }
    return res.json();
}

// ARM normally returns distinct nextLink URLs that terminate, but a buggy or
// hostile endpoint could return a repeating/self-referential nextLink. Guard
// against an unbounded loop with a seen-set and a hard page cap.
const MAX_PAGES = 1000;

async function paginateAll(url, token) {
    const results = [];
    const seen = new Set();
    let nextUrl = url;
    let pages = 0;
    while (nextUrl) {
        if (seen.has(nextUrl) || pages >= MAX_PAGES) break;
        seen.add(nextUrl);
        pages++;
        const data = await armFetch(nextUrl, token);
        if (data.value) results.push(...data.value);
        nextUrl = data.nextLink || null;
    }
    return results;
}

/**
 * List connector gateways in a subscription.
 * Uses $top=10 and stops after the first page for speed.
 * Pass fetchAll=true to paginate through everything.
 */
export async function listConnectorGateways(subscriptionId, { fetchAll = false } = {}) {
    const token = await getToken();
    const url = `https://management.azure.com/subscriptions/${armSegment(subscriptionId)}/providers/Microsoft.Web/connectorGateways?api-version=${API_VERSION}&$top=10`;
    if (fetchAll) return { items: await paginateAll(url, token), hasMore: false };
    // First page only — much faster
    const data = await armFetch(url, token);
    const items = data.value || [];
    return { items, hasMore: !!data.nextLink };
}

/**
 * List managed APIs (traditional connectors)
 */
export async function listManagedApis(subscriptionId, resourceGroup, gatewayName) {
    const token = await getToken();
    const url = `${buildBaseUrl(subscriptionId, resourceGroup, gatewayName)}/managedApis?api-version=${API_VERSION}`;
    return paginateAll(url, token);
}

/**
 * List managed hosted MCP servers
 */
export async function listManagedHostedMcpServers(subscriptionId, resourceGroup, gatewayName) {
    const token = await getToken();
    const url = `${buildBaseUrl(subscriptionId, resourceGroup, gatewayName)}/managedHostedMcpServers?api-version=${API_VERSION}`;
    return paginateAll(url, token);
}

/**
 * List managed MCP operations
 */
export async function listManagedMcpOperations(subscriptionId, resourceGroup, gatewayName) {
    const token = await getToken();
    const url = `${buildBaseUrl(subscriptionId, resourceGroup, gatewayName)}/managedMcpOperations?api-version=${API_VERSION}`;
    return paginateAll(url, token);
}

// ---------------------------------------------------------------------------
// Create connector namespace (provisioning flow)
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Write helper (PUT/PATCH/DELETE) that mirrors armFetch's host guard but keeps
// the parsed error body so callers can surface ARM's message verbatim.
async function armWrite(method, url, body, extraHeaders = {}) {
    if (!url.startsWith(ARM_BASE)) {
        throw new Error(`Refusing to call non-ARM URL: ${url}`);
    }
    const token = await getToken();
    const headers = { Authorization: `Bearer ${token}` };
    Object.assign(headers, extraHeaders);
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let parsed;
    try { parsed = text ? JSON.parse(text) : undefined; } catch { parsed = text; }
    if (!res.ok) {
        const msg = parsed?.error?.message ?? parsed?.message ?? text ?? `HTTP ${res.status}`;
        const err = new Error(`ARM ${method} ${res.status}: ${String(msg).slice(0, 300)}`);
        err.status = res.status;
        throw err;
    }
    return parsed;
}

/**
 * List resource groups in a subscription (sorted by name).
 */
export async function listResourceGroups(subscriptionId) {
    const token = await getToken();
    const url = `https://management.azure.com/subscriptions/${armSegment(subscriptionId)}/resourcegroups?api-version=${RG_API_VERSION}`;
    const items = await paginateAll(url, token);
    return items
        .map((rg) => ({ name: rg.name, location: rg.location }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Create a resource group without updating an existing group on a name race.
 */
export async function createResourceGroup(subscriptionId, name, location) {
    const url = `https://management.azure.com/subscriptions/${armSegment(subscriptionId)}/resourcegroups/${armSegment(name)}?api-version=${RG_API_VERSION}`;
    return armWrite("PUT", url, { location }, { "If-None-Match": "*" });
}

/**
 * List user-assigned managed identities across a subscription (sorted by name).
 */
export async function listUserAssignedIdentities(subscriptionId) {
    const token = await getToken();
    const url = `https://management.azure.com/subscriptions/${armSegment(subscriptionId)}/providers/Microsoft.ManagedIdentity/userAssignedIdentities?api-version=${MSI_API_VERSION}`;
    const items = await paginateAll(url, token);
    return items
        .map((id) => {
            const parts = String(id.id).split("/");
            const rgIdx = parts.findIndex((p) => p.toLowerCase() === "resourcegroups");
            return {
                id: id.id,
                name: id.name,
                resourceGroup: rgIdx >= 0 ? parts[rgIdx + 1] || "" : "",
                location: id.location || "",
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Check whether a connector namespace name is free in the given resource group.
 * Returns true when available (ARM 404), false when taken (200). Uses fetch
 * directly so the 404 isn't thrown the way armFetch would.
 */
export async function checkConnectorGatewayNameAvailable(subscriptionId, resourceGroup, gatewayName) {
    const token = await getToken();
    const url = `${buildBaseUrl(subscriptionId, resourceGroup, gatewayName)}?api-version=${API_VERSION}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 404) return true;
    if (res.ok) return false;
    const body = await res.text();
    throw new Error(`ARM ${res.status}: ${body.slice(0, 200)}`);
}

// ARM `identity` block — mirrors the portal's buildIdentityPayload so the PUT
// body is always explicit ({ type: "None" } when nothing is configured).
export function buildGatewayIdentity(enableSystem, userAssignedIds = []) {
    const hasUser = userAssignedIds.length > 0;
    const type = enableSystem && hasUser
        ? "SystemAssigned,UserAssigned"
        : enableSystem
            ? "SystemAssigned"
            : hasUser
                ? "UserAssigned"
                : "None";
    const identity = { type };
    if (hasUser) {
        identity.userAssignedIdentities = Object.fromEntries(userAssignedIds.map((id) => [id, {}]));
    }
    return identity;
}

export async function waitForProvisioning(initialResult, gatewayName, fetchLatest, {
    maxPolls = 60,
    delay = () => sleep(3000),
} = {}) {
    let result = initialResult;
    let state;
    for (let poll = 0; poll <= maxPolls; poll++) {
        state = result?.properties?.provisioningState;
        if (state === "Succeeded") return result;
        if (state === "Failed" || state === "Canceled") {
            throw new Error(`Provisioning ${state} for "${gatewayName}".`);
        }
        if (poll === maxPolls) break;
        await delay();
        result = await fetchLatest();
    }
    throw new Error(`Provisioning timed out for "${gatewayName}" (last state: ${state ?? "unknown"}).`);
}

/**
 * Create a connector namespace and poll until the
 * provisioningState reaches a terminal value. Throws on Failed/Canceled.
 * Returns the final resource object.
 */
export async function createConnectorGateway(subscriptionId, resourceGroup, gatewayName, { location, identity }) {
    const token = await getToken();
    const url = `${buildBaseUrl(subscriptionId, resourceGroup, gatewayName)}?api-version=${API_VERSION}`;
    const body = { location, properties: {}, identity };
    const result = await armWrite("PUT", url, body, { "If-None-Match": "*" });
    // ~3 min ceiling (60 * 3s). A 202 may have no body, so every state other
    // than explicit Succeeded enters the polling path.
    return waitForProvisioning(result, gatewayName, () => armFetch(url, token));
}
