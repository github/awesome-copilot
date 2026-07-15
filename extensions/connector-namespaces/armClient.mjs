// ARM API client — fetches real connector data via an interactive Azure sign-in.

import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { platform, homedir } from "node:os";
import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from "node:fs";
import { join } from "node:path";

const API_VERSION = "2026-05-01-preview";
const RG_API_VERSION = "2021-04-01";
const MSI_API_VERSION = "2023-01-31";
const SUBS_API_VERSION = "2020-01-01";

// Azure CLI's well-known first-party public client. It already has an
// http://localhost loopback redirect registered, so we can run an interactive
// auth-code + PKCE sign-in against it with no app registration of our own. AAD
// accepts any port on a loopback redirect for public clients, so there's no
// secret to ship and nothing for a teammate to configure.
const CLIENT_ID = "04b07795-8ddb-461a-bbee-02f9e1bf7b46";
const AUTHORITY = "https://login.microsoftonline.com/organizations";
// offline_access gets us a refresh token so we prompt the browser once per
// session, then renew silently as the ARM token expires.
const SCOPE = "https://management.azure.com/.default offline_access";
const SIGN_IN_TIMEOUT_MS = 5 * 60 * 1000;

const base64url = (buf) =>
    buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// Open a URL in the default browser without shelling out to az. rundll32's
// FileProtocolHandler on Windows avoids cmd's `&` parsing on query strings.
function openBrowser(url) {
    const os = platform();
    const [cmd, args] =
        os === "win32"
            ? ["rundll32", ["url.dll,FileProtocolHandler", url]]
            : os === "darwin"
              ? ["open", [url]]
              : ["xdg-open", [url]];
    try {
        const child = spawn(cmd, args, { stdio: "ignore", detached: true });
        child.on("error", () => {});
        child.unref();
    } catch {
        // If launching a browser fails, the URL is printed below so the user
        // can open it by hand (e.g. over SSH).
    }
}

async function tokenRequest(form) {
    const res = await fetch(`${AUTHORITY}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(`Azure sign-in failed: ${data.error_description || data.error || res.status}`);
    }
    return {
        token: data.access_token,
        refreshToken: data.refresh_token,
        // expires_in is seconds-from-now; store an absolute ms timestamp.
        expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    };
}

function exchangeCode(code, verifier, redirectUri) {
    return tokenRequest(
        new URLSearchParams({
            client_id: CLIENT_ID,
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
            code_verifier: verifier,
            scope: SCOPE,
        }),
    );
}

function refreshAccessToken(refreshToken) {
    return tokenRequest(
        new URLSearchParams({
            client_id: CLIENT_ID,
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            scope: SCOPE,
        }),
    );
}

// One interactive sign-in: start a loopback server on a random free port, open
// the browser to the AAD authorize endpoint, capture the redirected code, and
// exchange it for an ARM token.
function interactiveSignIn() {
    return new Promise((resolve, reject) => {
        const verifier = base64url(randomBytes(32));
        const challenge = base64url(createHash("sha256").update(verifier).digest());
        const state = base64url(randomBytes(16));
        let redirectUri = "";
        let settled = false;
        let authStarted = false;

        // One handler shared by two loopback listeners (IPv4 + IPv6) on the same
        // OS-chosen port. The redirect_uri uses "localhost" because that's the
        // loopback host registered for the Azure CLI public client, and on
        // Windows "localhost" can resolve to either 127.0.0.1 or ::1, so we
        // listen on both stacks to guarantee the AAD redirect reaches us.
        const handler = (req, res) => {
            const reqUrl = new URL(req.url, "http://localhost");
            if (reqUrl.pathname !== "/") {
                res.writeHead(404).end();
                return;
            }
            const code = reqUrl.searchParams.get("code");
            const returnedState = reqUrl.searchParams.get("state");
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(
                "<html><body style=\"font-family:system-ui,sans-serif;padding:2rem\">" +
                    "<h2>Signed in to Azure</h2><p>You can close this tab and return to your terminal.</p>" +
                    "</body></html>",
            );
            if (!code || returnedState !== state) {
                finish(reject, new Error("Azure sign-in was cancelled or returned an unexpected response."));
                return;
            }
            exchangeCode(code, verifier, redirectUri).then(
                (auth) => finish(resolve, auth),
                (err) => finish(reject, err),
            );
        };

        const v4 = createServer(handler);
        const v6 = createServer(handler);

        const finish = (fn, arg) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            for (const s of [v4, v6]) {
                try {
                    s.close();
                } catch {
                    // listener may never have bound (e.g. no IPv6 loopback); ignore.
                }
            }
            fn(arg);
        };

        const timer = setTimeout(
            () => finish(reject, new Error("Azure sign-in timed out. Run the action again to retry.")),
            SIGN_IN_TIMEOUT_MS,
        );

        const startAuth = () => {
            if (authStarted) return;
            authStarted = true;
            const authUrl =
                `${AUTHORITY}/oauth2/v2.0/authorize?` +
                new URLSearchParams({
                    client_id: CLIENT_ID,
                    response_type: "code",
                    redirect_uri: redirectUri,
                    response_mode: "query",
                    scope: SCOPE,
                    state,
                    code_challenge: challenge,
                    code_challenge_method: "S256",
                    prompt: "select_account",
                }).toString();
            console.error(`\nSign in to Azure to load your connector namespaces:\n${authUrl}\n`);
            openBrowser(authUrl);
        };

        // IPv4 is the primary listener and its errors are fatal. IPv6 is
        // best-effort: machines without IPv6 loopback just use IPv4, so its
        // bind errors are swallowed and we start sign-in once either settles.
        v4.on("error", (err) => finish(reject, err));
        v6.on("error", () => startAuth());

        // Port 0 lets the OS pick a free port; loopback redirects accept any port.
        v4.listen(0, "127.0.0.1", () => {
            const { port } = v4.address();
            redirectUri = `http://localhost:${port}`;
            v6.listen(port, "::1", () => startAuth());
        });
    });
}

// One browser sign-in, then silent refresh-token renewals as the ARM access
// token expires (~60-90min). Refresh 5min early. A single-flight guard makes
// concurrent callers share one sign-in instead of opening two tabs.
//
// The cache is also persisted to disk so a process restart (CLI reload, host
// recycle, crash) renews silently from the saved refresh token instead of
// popping the browser again. Without this, every restart wiped the in-memory
// token and forced a fresh interactive sign-in.
const TOKEN_DIR = join(process.env.COPILOT_HOME || join(homedir(), ".copilot"), "extensions", "connector-namespaces", "artifacts");
const TOKEN_FILE = join(TOKEN_DIR, "auth-cache.json");

let s_auth = null; // { token, refreshToken, expiresAt }
let s_authInFlight = null;
let s_diskLoaded = false;
const EXPIRY_SKEW_MS = 5 * 60 * 1000;

function loadAuthCache() {
    try {
        if (existsSync(TOKEN_FILE)) {
            const data = JSON.parse(readFileSync(TOKEN_FILE, "utf-8"));
            if (data && typeof data.refreshToken === "string" && data.refreshToken.length > 0) {
                return data;
            }
        }
    } catch {
        // Corrupt or unreadable cache — ignore and sign in fresh.
    }
    return null;
}

function saveAuthCache(auth) {
    try {
        if (!existsSync(TOKEN_DIR)) {
            mkdirSync(TOKEN_DIR, { recursive: true });
        }
        const payload = JSON.stringify(
            { token: auth.token, refreshToken: auth.refreshToken, expiresAt: auth.expiresAt },
            null,
            2,
        );
        writeFileSync(TOKEN_FILE, payload, { encoding: "utf-8", mode: 0o600 });
        chmodSync(TOKEN_FILE, 0o600);
    } catch {
        // Best-effort; the in-memory cache still serves this process.
    }
}

// Pull the persisted token in once per process, before the first acquire.
function hydrateFromDisk() {
    if (s_diskLoaded) {
        return;
    }
    s_diskLoaded = true;
    if (!s_auth) {
        const cached = loadAuthCache();
        if (cached) {
            s_auth = cached;
        }
    }
}

async function acquireToken() {
    if (s_auth?.refreshToken) {
        try {
            s_auth = await refreshAccessToken(s_auth.refreshToken);
            saveAuthCache(s_auth);
            return s_auth.token;
        } catch {
            // Refresh token expired or revoked — fall through to interactive.
        }
    }
    s_auth = await interactiveSignIn();
    saveAuthCache(s_auth);
    return s_auth.token;
}

export async function getToken() {
    hydrateFromDisk();
    if (s_auth && s_auth.expiresAt - EXPIRY_SKEW_MS > Date.now()) return s_auth.token;
    if (s_authInFlight) return s_authInFlight;
    s_authInFlight = acquireToken().finally(() => {
        s_authInFlight = null;
    });
    return s_authInFlight;
}

/**
 * List all enabled Azure subscriptions the user has access to.
 */
// The set of enabled subscriptions is stable for a session, so cache it — the
// first /setup pays the ARM round-trip once and every "Change namespace"
// afterwards serves from memory.
let s_subsCache = null; // { subs, expiresAt }
const SUBS_TTL_MS = 30 * 60 * 1000;

export async function listSubscriptions() {
    const now = Date.now();
    if (s_subsCache && s_subsCache.expiresAt > now) return s_subsCache.subs;
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
 * Create (or update) a resource group. Idempotent PUT.
 */
export async function createResourceGroup(subscriptionId, name, location) {
    const url = `https://management.azure.com/subscriptions/${armSegment(subscriptionId)}/resourcegroups/${armSegment(name)}?api-version=${RG_API_VERSION}`;
    return armWrite("PUT", url, { location });
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

const TERMINAL_STATES = new Set(["Succeeded", "Failed", "Canceled"]);

/**
 * Create a connector namespace and poll until the
 * provisioningState reaches a terminal value. Throws on Failed/Canceled.
 * Returns the final resource object.
 */
export async function createConnectorGateway(subscriptionId, resourceGroup, gatewayName, { location, identity }) {
    const token = await getToken();
    const url = `${buildBaseUrl(subscriptionId, resourceGroup, gatewayName)}?api-version=${API_VERSION}`;
    const body = { location, properties: {}, identity };
    let result = await armWrite("PUT", url, body, { "If-None-Match": "*" });
    let state = result?.properties?.provisioningState;
    // ~3 min ceiling (60 * 3s). connectorGateways usually settle in seconds.
    for (let i = 0; i < 60 && state && !TERMINAL_STATES.has(state); i++) {
        await sleep(3000);
        result = await armFetch(url, token);
        state = result?.properties?.provisioningState;
    }
    if (state === "Failed" || state === "Canceled") {
        throw new Error(`Provisioning ${state} for "${gatewayName}".`);
    }
    if (state && !TERMINAL_STATES.has(state)) {
        throw new Error(`Provisioning timed out for "${gatewayName}" (last state: ${state}).`);
    }
    return result;
}
