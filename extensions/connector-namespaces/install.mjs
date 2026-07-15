// Install flow — creates connection, handles OAuth, creates MCP server config,
// mints API key, and writes to ~/.copilot/mcp-config.json.

import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";
import { getToken, assertArmHost, armSegment, resolveSystemExecutable } from "./armClient.mjs";

const COPILOT_HOME = process.env.COPILOT_HOME || join(homedir(), ".copilot");

// Two scopes the Copilot CLI reads MCP servers from:
//   profile   -> ~/.copilot/mcp-config.json   (private, follows you everywhere)
//   workspace -> <repo>/.mcp.json             (shared with the repo, git-tracked)
const PROFILE_MCP_PATH = join(COPILOT_HOME, "mcp-config.json");
const PENDING_CLEANUP_DIR = join(COPILOT_HOME, "extensions", "connector-namespaces", "artifacts", "pending-cleanup");
let s_workspaceRoot = null;

export function setWorkspaceRoot(path) {
    s_workspaceRoot = path || null;
}

export function getWorkspaceRoot() {
    return s_workspaceRoot;
}

function mcpConfigPath(scope) {
    if (scope === "workspace") {
        if (!s_workspaceRoot) throw new Error("No workspace folder is available for this session.");
        return join(s_workspaceRoot, ".mcp.json");
    }
    return PROFILE_MCP_PATH;
}

const CONFIG_LOCK_TIMEOUT_MS = 10_000;
const CONFIG_LOCK_STALE_MS = 30_000;

// Serialize in-process writes, then hold an exclusive lock file so separate
// Copilot sessions cannot overwrite each other's MCP config changes.
let s_configLock = Promise.resolve();
async function acquireConfigLock(path) {
    const lockPath = `${path}.lock`;
    await fs.mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const deadline = Date.now() + CONFIG_LOCK_TIMEOUT_MS;
    for (;;) {
        const owner = `${process.pid}:${randomBytes(12).toString("hex")}\n`;
        try {
            const handle = await fs.open(lockPath, "wx", 0o600);
            await handle.writeFile(owner, "utf8");
            return async () => {
                await handle.close();
                try {
                    if (await fs.readFile(lockPath, "utf8") === owner) {
                        await fs.unlink(lockPath);
                    }
                } catch (error) {
                    if (error?.code !== "ENOENT") throw error;
                }
            };
        } catch (error) {
            if (error?.code !== "EEXIST") throw error;
            try {
                const stat = await fs.stat(lockPath);
                if (Date.now() - stat.mtimeMs > CONFIG_LOCK_STALE_MS) {
                    const stalePath = `${lockPath}.${process.pid}.${randomBytes(6).toString("hex")}.stale`;
                    await fs.rename(lockPath, stalePath);
                    await fs.unlink(stalePath);
                    continue;
                }
            } catch (statError) {
                if (statError?.code === "ENOENT") continue;
                throw statError;
            }
            if (Date.now() >= deadline) {
                throw new Error(`Timed out waiting for the MCP config lock at ${lockPath}.`);
            }
            await sleep(50);
        }
    }
}

export async function waitForConnected(config, connName, options = {}) {
    const maxPolls = options.maxPolls ?? 20;
    const delay = options.delay ?? sleep;
    const getStatus = options.getStatus ?? getConnectionStatus;
    let status = "Unknown";
    for (let i = 0; i < maxPolls; i++) {
        status = await getStatus(config, connName);
        if (status === "Connected") return status;
        if (i + 1 < maxPolls) await delay(1000);
    }
    throw new Error(`Connection ended in state "${status}".`);
}

function withConfigLock(path, fn) {
    const run = s_configLock.then(async () => {
        const release = await acquireConfigLock(path);
        try {
            return await fn();
        } finally {
            await release();
        }
    }, async () => {
        const release = await acquireConfigLock(path);
        try {
            return await fn();
        } finally {
            await release();
        }
    });
    s_configLock = run.then(() => {}, () => {});
    return run;
}

async function readPendingCleanups(gateway, apiName) {
    let names;
    try {
        names = await fs.readdir(PENDING_CLEANUP_DIR);
    } catch (error) {
        if (error?.code === "ENOENT") return [];
        throw error;
    }

    const records = [];
    for (const name of names) {
        if (!name.endsWith(".json")) continue;
        const path = join(PENDING_CLEANUP_DIR, name);
        let record;
        try {
            record = JSON.parse(await fs.readFile(path, "utf8"));
        } catch (error) {
            if (error?.code === "ENOENT") continue;
            throw error;
        }
        if (!record || typeof record !== "object" || Array.isArray(record)) {
            throw new Error("Pending connector cleanup data is invalid.");
        }
        if (record.gatewayId === gateway && record.apiName === apiName) {
            records.push({ ...record, path });
        }
    }
    return records;
}

async function getPendingCleanup(gateway, apiName) {
    const records = await readPendingCleanups(gateway, apiName);
    if (!records.length) return null;
    return {
        configNames: records.flatMap((record) => Array.isArray(record.configNames) ? record.configNames : []),
        connectionNames: records.flatMap((record) => Array.isArray(record.connectionNames) ? record.connectionNames : []),
        journalFiles: records.map((record) => record.path),
    };
}

async function savePendingCleanup(record) {
    await fs.mkdir(PENDING_CLEANUP_DIR, { recursive: true, mode: 0o700 });
    await fs.chmod(PENDING_CLEANUP_DIR, 0o700).catch(() => {});
    const id = randomBytes(16).toString("hex");
    const tempPath = join(PENDING_CLEANUP_DIR, `${id}.tmp`);
    const path = join(PENDING_CLEANUP_DIR, `${id}.json`);
    await fs.writeFile(tempPath, JSON.stringify(record, null, 2) + "\n", { encoding: "utf8", mode: 0o600, flag: "wx" });
    try {
        await fs.chmod(tempPath, 0o600).catch(() => {});
        await fs.rename(tempPath, path);
        return path;
    } catch (error) {
        try {
            await fs.unlink(tempPath);
        } catch (cleanupError) {
            if (cleanupError?.code !== "ENOENT") {
                throw new AggregateError([error, cleanupError], "Failed to save connector cleanup retry data.");
            }
        }
        throw error;
    }
}

async function clearPendingCleanups(paths) {
    for (const path of new Set(paths)) {
        try {
            await fs.unlink(path);
        } catch (error) {
            if (error?.code !== "ENOENT") throw error;
        }
    }
}

// Validate the MCP endpoint URL before persisting it alongside an API key. The
// value comes from an authenticated ARM read of the user's own gateway, so this
// is defense in depth: require https, reject embedded credentials, and block
// obvious internal/link-local hosts.
export function assertSafeMcpTarget(rawUrl) {
    let u;
    try { u = new URL(rawUrl); } catch { throw new Error("MCP endpoint URL is not a valid URL."); }
    if (u.protocol !== "https:") throw new Error("MCP endpoint URL must use https.");
    if (u.username || u.password) throw new Error("MCP endpoint URL must not embed credentials.");
    const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    const isIpv6 = host.includes(":");
    const blocked =
        host === "localhost" || host.endsWith(".localhost") ||
        host === "metadata.google.internal" || host === "0.0.0.0" ||
        (isIpv6 && (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd"))) ||
        /^(127|10)\./.test(host) ||
        /^169\.254\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    if (blocked) throw new Error(`MCP endpoint URL host is not allowed: ${host}`);
}

// ---------------------------------------------------------------------------
// ARM helpers (using the shared token)
// ---------------------------------------------------------------------------

// ARM occasionally answers with a transient 5xx/429 (backend blip, throttling)
// that clears on a retry. A single one of these shouldn't nuke a whole connect
// flow, so arm() retries them a few times with backoff before surfacing.
const ARM_TRANSIENT = new Set([429, 500, 502, 503, 504]);
const ARM_MAX_ATTEMPTS = 3;
const ARM_BACKOFF_MS = 500;

async function arm(method, url, body) {
    const token = await getToken();
    const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const fullUrl = url.startsWith("http") ? url : `https://management.azure.com${url}`;
    // Guard the exact value handed to fetch so a tainted path segment can never
    // redirect the call off ARM. assertArmHost throws unless fullUrl targets
    // https://management.azure.com/.
    const safeUrl = assertArmHost(fullUrl);

    for (let attempt = 1; ; attempt++) {
        const res = await fetch(safeUrl, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        let parsed;
        try { parsed = text ? JSON.parse(text) : undefined; } catch { parsed = text; }
        if (res.ok) return parsed;

        const msg = parsed?.error?.message ?? parsed?.message ?? text ?? `HTTP ${res.status}`;
        const err = new Error(`ARM ${method} ${res.status}: ${msg}`);
        err.status = res.status;

        // Every ARM call we make is idempotent (GET/PUT/DELETE) or a list-shaped
        // POST (listConsentLinks, listApiKey) that returns the same value on
        // retry, so retrying a transient failure can't spawn duplicate side
        // effects. A 500 is never treated like a 404 elsewhere, so a blip can't
        // trigger teardown of a live resource.
        if (!ARM_TRANSIENT.has(res.status) || attempt >= ARM_MAX_ATTEMPTS) throw err;
        await sleep(ARM_BACKOFF_MS * Math.pow(3, attempt - 1)); // 0.5s, then 1.5s
    }
}

// DELETE that tolerates "already gone" (404) but surfaces every other failure
// instead of silently swallowing it.
async function armDelete(url) {
    try {
        return await arm("DELETE", url);
    } catch (e) {
        if (e.status === 404) return undefined;
        throw e;
    }
}

// ---------------------------------------------------------------------------
// Naming helpers
// ---------------------------------------------------------------------------

function shortId() { return randomBytes(3).toString("hex"); }
function sanitize(s) { return String(s).replace(/[^a-zA-Z0-9]+/g, "").slice(0, 24) || "x"; }
function generateName(displayName) { return `${sanitize(displayName)}-${shortId()}`; }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// Connector metadata (connection parameters + agentic operation id)
// ---------------------------------------------------------------------------

const MANAGED_API_VERSION = "2022-09-01-preview";
const metaCache = new Map(); // apiName + swagger requirement -> Promise<connector metadata>

export function loadConnectorMeta(config, apiName, location, requireSwagger = true) {
    const sub = armSegment(config.subscriptionId);
    const cacheKey = `${sub}:${location}:${apiName}:${requireSwagger}`;
    if (metaCache.has(cacheKey)) return metaCache.get(cacheKey);
    const promise = (async () => {
        const base = `/subscriptions/${sub}/providers/Microsoft.Web/locations/${armSegment(location)}/managedApis/${armSegment(apiName)}`;
        const metaRequest = arm("GET", `${base}?api-version=${MANAGED_API_VERSION}`);
        const swaggerRequest = requireSwagger
            ? arm("GET", `${base}?api-version=${MANAGED_API_VERSION}&export=true`)
            : Promise.resolve(undefined);
        const [meta, swagger] = await Promise.all([metaRequest, swaggerRequest]);
        return {
            connectionParameters: meta?.properties?.connectionParameters ?? null,
            connectionParameterSets: meta?.properties?.connectionParameterSets ?? null,
            opId: swagger ? getMcpServerOperationId(swagger) : undefined,
        };
    })();
    // Cache the in-flight promise so a fast Connect click reuses the prewarm
    // fetch instead of starting a second swagger export. Evict on hard failure
    // so a transient error doesn't poison the cache.
    promise.catch(() => metaCache.delete(cacheKey));
    metaCache.set(cacheKey, promise);
    return promise;
}

// Fire-and-forget pre-warm so the slow swagger fetch happens while the user is
// reading the catalog, not when they click Connect. Concurrency is bounded so a
// large catalog (~43 MCP servers, each 2 ARM GETs) doesn't burst ~86 parallel
// requests on open and trip rate limits. Items are warmed in catalog order, so
// the servers nearest the top of the view warm first.
export function prewarmMeta(config, apiNames, location) {
    Promise.resolve(location || getGatewayLocation(config)).then(async (loc) => {
        const sub = armSegment(config.subscriptionId);
        const pending = apiNames.filter((name) => !metaCache.has(`${sub}:${loc}:${name}:true`));
        const CONCURRENCY = 5;
        let next = 0;
        const worker = async () => {
            while (next < pending.length) {
                const apiName = pending[next++];
                await loadConnectorMeta(config, apiName, loc).catch(() => {});
            }
        };
        const poolSize = Math.min(CONCURRENCY, pending.length);
        await Promise.all(Array.from({ length: poolSize }, worker));
    }).catch(() => {});
}

function getMcpServerOperationId(swagger) {
    if (!swagger?.paths) return undefined;
    for (const methods of Object.values(swagger.paths)) {
        if (!methods || typeof methods !== "object") continue;
        const post = methods.post;
        if (!post?.operationId) continue;
        const tags = (post.tags ?? []).map((t) => String(t).toLowerCase());
        if (tags.includes("deprecated")) continue;
        if (tags.includes("agentic")) return post.operationId;
    }
    return undefined;
}

// Find the OAuth connection parameter name. The consent call 500s if we send a
// parameterName the connector doesn't declare, so derive it from metadata.
function findOAuthParam(meta, redirectUrl) {
    const fallback = { parameterName: "token", redirectUrl };
    let params;
    if (meta?.connectionParameterSets?.values?.length) {
        params = meta.connectionParameterSets.values[0].parameters;
    } else {
        params = meta?.connectionParameters;
    }
    if (!params) return fallback;
    for (const [name, param] of Object.entries(params)) {
        if (param?.type === "oauthSetting" || param?.oAuthSettings) {
            return { parameterName: name, redirectUrl };
        }
    }
    return fallback;
}

// ---------------------------------------------------------------------------
// JWT decode (to get user oid/tid for access policy)
// ---------------------------------------------------------------------------

function decodeJwtPayload(token) {
    const parts = token.split(".");
    if (parts.length < 2) throw new Error("Invalid JWT");
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    return JSON.parse(Buffer.from(b64 + pad, "base64").toString("utf8"));
}

async function getUserContext() {
    const token = await getToken();
    const claims = decodeJwtPayload(token);
    return { objectId: claims.oid, tenantId: claims.tid };
}

// ---------------------------------------------------------------------------
// Connection management
// ---------------------------------------------------------------------------

function gatewayId(config) {
    return `/subscriptions/${armSegment(config.subscriptionId)}/resourceGroups/${armSegment(config.resourceGroup)}/providers/Microsoft.Web/connectorGateways/${armSegment(config.gatewayName)}`;
}

const API_VERSION = "2026-05-01-preview";

const s_locationCache = new Map(); // gatewayId -> location (immutable per gateway)

export async function getGatewayLocation(config) {
    const id = gatewayId(config);
    const cached = s_locationCache.get(id);
    if (cached) return cached;
    const gw = await arm("GET", `${id}?api-version=${API_VERSION}`);
    const loc = (gw.location ?? "").toLowerCase().replace(/\s+/g, "");
    if (loc) s_locationCache.set(id, loc);
    return loc;
}

export async function createConnection(config, apiName, displayName, location) {
    const connName = generateName(displayName);
    await arm("PUT", `${gatewayId(config)}/connections/${connName}?api-version=${API_VERSION}`, {
        location,
        properties: { displayName, connectorName: apiName },
    });
    // Grant current user access policy
    try {
        const { objectId, tenantId } = await getUserContext();
        await arm("PUT", `${gatewayId(config)}/connections/${connName}/accessPolicies/user-${shortId()}?api-version=${API_VERSION}`, {
            location,
            properties: { principal: { type: "ActiveDirectory", identity: { objectId, tenantId } } },
        });
    } catch { /* non-fatal */ }
    return connName;
}

export async function getConsentUrl(config, connName, callbackUrl, oauthParam) {
    const param = oauthParam || { parameterName: "token", redirectUrl: callbackUrl };
    const res = await arm("POST", `${gatewayId(config)}/connections/${armSegment(connName)}/listConsentLinks?api-version=${API_VERSION}`, {
        parameters: [{ parameterName: param.parameterName, redirectUrl: param.redirectUrl }],
    });
    return res?.value?.[0]?.link || null;
}

export async function getConnectionStatus(config, connName) {
    const conn = await arm("GET", `${gatewayId(config)}/connections/${armSegment(connName)}?api-version=${API_VERSION}`);
    return conn?.properties?.statuses?.[0]?.status ?? conn?.properties?.overallStatus ?? "Unknown";
}

export async function createMcpServerConfig(config, apiName, displayName, connName, location, opId, configName = generateName(displayName)) {
    if (!opId) {
        throw new Error(`Cannot configure "${displayName}" as an MCP server: no agentic operation was found in the connector's definition. The connector may not expose an MCP-streamable endpoint, or its swagger failed to load.`);
    }
    const created = await arm("PUT", `${gatewayId(config)}/mcpserverConfigs/${configName}?api-version=${API_VERSION}`, {
        kind: "ManagedMcpServer",
        location,
        properties: {
            description: displayName,
            state: "Enabled",
            disableApiKeyAuth: false,
            // TextOnlyContent must stay false: when true the dataplane wraps tools/list and
            // tools/call responses in a base64 "$content" envelope that spec-compliant MCP
            // clients cannot parse, so zero tools load.
            settings: { TextOnlyContent: false },
            connectors: [{
                name: apiName,
                connectionName: connName,
                displayName,
                operations: [{ name: opId, displayName, description: "" }],
            }],
        },
    });
    return { configName, endpointUrl: created?.properties?.mcpEndpointUrl || null };
}

export async function mintApiKey(config, configName) {
    const notAfter = new Date(Date.now() + 365 * 24 * 3600_000).toISOString();
    const res = await arm("POST", `${gatewayId(config)}/listApiKey?api-version=${API_VERSION}`, {
        keyType: "Primary",
        notAfter,
        scope: configName,
    });
    return res.key;
}

export async function getMcpEndpointUrl(config, configName) {
    const cfg = await arm("GET", `${gatewayId(config)}/mcpserverConfigs/${armSegment(configName)}?api-version=${API_VERSION}`);
    return cfg?.properties?.mcpEndpointUrl || null;
}

// ---------------------------------------------------------------------------
// MCP config writer
// ---------------------------------------------------------------------------

async function readMcpConfigAt(path) {
    try {
        const raw = await fs.readFile(path, "utf8");
        let parsed = JSON.parse(raw);
        // Reject arrays and primitives before treating this as a config object.
        // JSON.parse can return either (a hand-edited "[]" or a bare number),
        // and both break the write path: a string key set on an array is
        // silently dropped by JSON.stringify (the new entry would vanish), and
        // a primitive throws on property assignment. Fall back to a fresh
        // object so writeMcpEntry always persists.
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) parsed = {};
        if (!parsed.mcpServers || typeof parsed.mcpServers !== "object" || Array.isArray(parsed.mcpServers)) parsed.mcpServers = {};
        return parsed;
    } catch (e) {
        if (e.code === "ENOENT") return { mcpServers: {} };
        throw e;
    }
}

async function writeMcpConfigAt(path, cfg) {
    const directory = dirname(path);
    const temporary = `${path}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    await fs.chmod(directory, 0o700).catch(() => {});
    try {
        await fs.writeFile(temporary, JSON.stringify(cfg, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
        await fs.chmod(temporary, 0o600).catch(() => {});
        await fs.rename(temporary, path);
        await fs.chmod(path, 0o600).catch(() => {});
    } finally {
        await fs.unlink(temporary).catch((error) => {
            if (error?.code !== "ENOENT") throw error;
        });
    }
}

export async function writeMcpEntry(name, url, key, scope = "profile", meta = null) {
    assertSafeMcpTarget(url);
    const path = mcpConfigPath(scope);
    return withConfigLock(path, async () => {
        const cfg = await readMcpConfigAt(path);
        cfg.mcpServers[name] = {
            url,
            headers: { "X-API-Key": key },
        };
        // Stamp ARM provenance as a sibling metadata key. The underscore prefix
        // marks it as "metadata, not part of the MCP launch spec" — the CLI
        // tolerates and preserves unknown sibling keys across restarts.
        if (meta) cfg.mcpServers[name]._connectorNamespace = meta;
        await writeMcpConfigAt(path, cfg);
    });
}

// Remove the entry from whichever scope(s) it lives in.
export async function removeMcpEntry(name) {
    let removed = false;
    for (const scope of ["profile", "workspace"]) {
        let path;
        try { path = mcpConfigPath(scope); } catch { continue; }
        const removedAtPath = await withConfigLock(path, async () => {
            const cfg = await readMcpConfigAt(path);
            if (Object.prototype.hasOwnProperty.call(cfg.mcpServers, name)) {
                delete cfg.mcpServers[name];
                await writeMcpConfigAt(path, cfg);
                return true;
            }
            return false;
        });
        removed ||= removedAtPath;
    }
    return removed;
}

async function deleteMcpServerConfigs(config, configNames) {
    for (const configName of configNames) {
        const url = `${gatewayId(config)}/mcpserverConfigs/${armSegment(configName)}?api-version=${API_VERSION}`;
        await armDelete(url);
        let pending = true;
        for (let i = 0; i < 20; i++) {
            try {
                await arm("GET", url);
            } catch (error) {
                if (error?.status === 404) {
                    pending = false;
                    break;
                }
                throw error;
            }
            await sleep(750);
        }
        if (pending) throw new Error(`Timed out waiting for connector configuration "${configName}" deletion.`);
    }
}

async function cleanupConnectorResources(config, apiName, configNames, connectionNames, priorJournalFiles = []) {
    configNames = [...new Set(configNames.filter(Boolean))];
    connectionNames = [...new Set(connectionNames.filter(Boolean))];
    const gateway = gatewayId(config);
    const journalFile = await savePendingCleanup({ gatewayId: gateway, apiName, configNames, connectionNames });
    const journalFiles = [...priorJournalFiles, journalFile];

    await deleteMcpServerConfigs(config, configNames);
    for (const connectionName of connectionNames) {
        await armDelete(`${gateway}/connections/${armSegment(connectionName)}?api-version=${API_VERSION}`);
    }
    for (const configName of configNames) {
        await removeMcpEntry(configName);
    }
    await clearPendingCleanups(journalFiles);
}

// Remove an installed connector: delete its mcpserverConfig, its connection,
// and its CLI entry. apiName is resolved against the current installed state.
export async function uninstallConnector(config, apiName) {
    const state = await getInstalledState(config);
    const entry = state[apiName];
    const gateway = gatewayId(config);
    const pending = await getPendingCleanup(gateway, apiName);
    if (!entry && !pending) return { ok: true, removed: false };

    const candidates = entry ? (entry._candidates ?? [entry]) : [];
    const configNames = [
        ...(pending?.configNames ?? []),
        ...candidates.map((candidate) => candidate.configName),
    ];
    const connectionNames = [
        ...(pending?.connectionNames ?? []),
        ...candidates.map((candidate) => candidate.connectionName),
    ];
    await cleanupConnectorResources(config, apiName, configNames, connectionNames, pending?.journalFiles);

    return { ok: true, removed: true };
}

// Local-only remove: drop just the CLI mcp entry, leaving the namespace
// resources (mcpserverConfig + connection) intact. This is the default
// "Remove" action — it unwires the connector from Copilot without deleting
// anything on Azure. Fast and local; no armDelete, no convergence poll.
export async function removeLocalEntry(config, apiName) {
    const state = await getInstalledState(config);
    const entry = state[apiName];
    if (!entry) return { ok: true, removed: false };
    const candidates = entry._candidates ?? [entry];
    for (const candidate of candidates) {
        if (candidate.inCli && candidate.configName) await removeMcpEntry(candidate.configName);
    }
    return { ok: true, removed: true };
}

// Best-effort rollback of a connection created during an install the user then
// cancelled. At that point no mcpserverConfig exists yet, so uninstallConnector
// can't see it — delete the orphaned connection directly so the tile honestly
// returns to "Connect" and we don't leak a half-made connection on the namespace.
export async function deleteConnection(config, connName) {
    if (!connName) return { ok: true, removed: false };
    await armDelete(`${gatewayId(config)}/connections/${armSegment(connName)}?api-version=${API_VERSION}`);
    return { ok: true, removed: true };
}

async function throwAfterCleanup(error, cleanups) {
    for (const cleanup of cleanups) {
        try {
            await cleanup();
        } catch (cleanupError) {
            throw new AggregateError(
                [error, cleanupError],
                `${error.message} Cleanup also failed: ${cleanupError.message}`,
            );
        }
    }
    throw error;
}

// ---------------------------------------------------------------------------
// Full install pipeline
// ---------------------------------------------------------------------------

function oauthCallbackUrl(callbackBase, connName, capabilityToken = "") {
    const url = new URL(`${callbackBase}${encodeURIComponent(connName)}`);
    if (capabilityToken) {
        url.searchParams.set("cn_token", capabilityToken);
    }
    return url.toString();
}

export async function installConnector(config, apiName, displayName, callbackBase, scope = "profile", capabilityToken = "") {
    const pending = await getPendingCleanup(gatewayId(config), apiName);
    if (pending) {
        await cleanupConnectorResources(
            config,
            apiName,
            pending.configNames,
            pending.connectionNames,
            pending.journalFiles,
        );
    }
    const location = await getGatewayLocation(config);
    const meta = await loadConnectorMeta(config, apiName, location);

    // 1. Create connection
    const connName = await createConnection(config, apiName, displayName, location);
    let finishStarted = false;
    try {
        // The OAuth redirect must carry the connName so the loopback callback keys
        // pendingOAuth by the same value the client polls on.
        const callbackUrl = oauthCallbackUrl(callbackBase, connName, capabilityToken);

        // 2. Quick wait for the connection to converge — some connectors come up
        //    Connected without any OAuth (e.g. service principal / key based).
        await sleep(800);
        const status = await getConnectionStatus(config, connName);
        if (status === "Connected") {
            finishStarted = true;
            return await finishInstall(config, apiName, displayName, connName, location, scope);
        }

        // 3. Needs OAuth — derive the correct consent parameter from metadata.
        const oauthParam = findOAuthParam(meta, callbackUrl);
        const consentUrl = await getConsentUrl(config, connName, callbackUrl, oauthParam);
        if (consentUrl) {
            return { needsConsent: true, consentUrl, connName, location, freshConnection: true };
        }

        // 4. No consent link and not Connected — try to finish anyway.
        finishStarted = true;
        return await finishInstall(config, apiName, displayName, connName, location, scope);
    } catch (error) {
        if (finishStarted) throw error;
        return throwAfterCleanup(error, [() => deleteConnection(config, connName)]);
    }
}

export async function finishInstall(config, apiName, displayName, connName, location, scope = "profile") {
    let configName;
    try {
        if (!location) location = await getGatewayLocation(config);
        const meta = await loadConnectorMeta(config, apiName, location);

        // Poll connection status up to ~20s for Connected.
        const status = await waitForConnected(config, connName);

        // Create MCP server config (endpoint URL comes back on the PUT response).
        let endpointUrl;
        configName = generateName(displayName);
        ({ endpointUrl } = await createMcpServerConfig(config, apiName, displayName, connName, location, meta.opId, configName));

        // Endpoint URL can lag — poll the config a few times if missing.
        for (let i = 0; !endpointUrl && i < 5; i++) {
            await sleep(1000);
            endpointUrl = await getMcpEndpointUrl(config, configName);
        }
        if (!endpointUrl) throw new Error(`MCP endpoint URL not available (connection status: ${status}).`);

        // Mint key and write the CLI entry, stamped with ARM provenance so the
        // install can be recognised regardless of which connector namespace is
        // active when state is next derived.
        const key = await mintApiKey(config, configName);
        const gw = gatewayId(config);
        await writeMcpEntry(configName, endpointUrl, key, scope, {
            gatewayId: gw,
            mcpServerConfigId: `${gw}/mcpserverConfigs/${armSegment(configName)}`,
            connectionId: `${gw}/connections/${armSegment(connName)}`,
            apiName,
        });

        return { ok: true, configName, connName, endpointUrl, scope };
    } catch (error) {
        const cleanups = [];
        if (configName) {
            cleanups.push(() => deleteMcpServerConfigs(config, [configName]));
        }
        cleanups.push(() => deleteConnection(config, connName));
        return throwAfterCleanup(error, cleanups);
    }
}

// ---------------------------------------------------------------------------
// Re-authenticate pipeline (reuse the EXISTING connection + config)
// ---------------------------------------------------------------------------

// Re-run consent for a connector that's already installed, WITHOUT minting a new
// connection or a new mcpserverConfig. This is what the "Re-authenticate" button
// hits; wiring it to the plain install path is exactly what spawned duplicate
// configs. We resolve the selected install-state candidate (post phase-1
// selection, that's the config the local session actually points at), re-consent
// its existing connection, and rebind THAT config locally.
//
// Falls back to a fresh installConnector only when there's genuinely nothing to
// re-auth against: no known connection, or the stored connection was deleted
// server-side (listConsentLinks 404s). In the 404 case we drop the orphaned
// config + local entry first so the fallback install can't leave a duplicate.
export async function reauthConnector(config, apiName, displayName, callbackBase, scope = "profile", capabilityToken = "") {
    return reauthConnectorWithAttempts(config, apiName, displayName, callbackBase, scope, capabilityToken, new Set());
}

async function reauthConnectorWithAttempts(config, apiName, displayName, callbackBase, scope, capabilityToken, attemptedConfigNames) {
    const state = await getInstalledState(config);
    const selected = state[apiName];
    const candidates = selected?._candidates ?? (selected ? [selected] : []);
    const entry = candidates.find((candidate) => !attemptedConfigNames.has(candidate.configName));
    const connName = entry?.connectionName;

    // Nothing installed to re-auth against — treat it as a first-time Connect.
    if (!connName) {
        return installConnector(config, apiName, displayName, callbackBase, scope, capabilityToken);
    }

    const location = await getGatewayLocation(config);
    const meta = await loadConnectorMeta(config, apiName, location, false);
    const callbackUrl = oauthCallbackUrl(callbackBase, connName, capabilityToken);
    const oauthParam = findOAuthParam(meta, callbackUrl);

    let consentUrl;
    try {
        consentUrl = await getConsentUrl(config, connName, callbackUrl, oauthParam);
    } catch (err) {
        // The stored connection is gone (deleted in the portal). Clean up the
        // now-orphaned config + local entry, then fall through to a clean
        // install so we don't strand a dead "Re-authenticate" tile.
        if (err.status === 404) {
            attemptedConfigNames.add(entry.configName);
            const siblingUsesConnection = candidates.some(
                (candidate) => candidate.configName !== entry.configName && candidate.connectionName === connName,
            );
            await cleanupConnectorResources(
                config,
                apiName,
                entry.configName ? [entry.configName] : [],
                siblingUsesConnection ? [] : [connName],
            );
            return reauthConnectorWithAttempts(
                config,
                apiName,
                displayName,
                callbackBase,
                scope,
                capabilityToken,
                attemptedConfigNames,
            );
        }
        throw err;
    }

    // Re-consent the existing connection; finish rebinds the SAME config.
    // configName is carried through so the finish step never creates a new one.
    if (consentUrl) {
        return { needsConsent: true, consentUrl, connName, location, configName: entry.configName, reauth: true, freshConnection: false };
    }

    // Already consentable without a redirect — just rebind the existing config.
    return finishReauth(config, apiName, displayName, connName, entry.configName, location, scope);
}

// Finish a re-auth: rebind an EXISTING mcpserverConfig to the local CLI. Unlike
// finishInstall this never calls createMcpServerConfig, so a re-auth can't spawn
// a duplicate — it reuses configName, mints a fresh key, and rewrites the entry.
export async function finishReauth(config, apiName, displayName, connName, configName, location, scope = "profile") {
    // Defensive: with no config to bind there's nothing to reuse — fall back to
    // a normal finish (which creates one). Shouldn't happen on the reauth path.
    if (!configName) {
        return finishInstall(config, apiName, displayName, connName, location, scope);
    }

    // Wait for the re-consented connection to converge (up to ~20s).
    const status = await waitForConnected(config, connName);

    // Reuse the existing config's endpoint — poll a few times if it lags.
    let endpointUrl = await getMcpEndpointUrl(config, configName);
    for (let i = 0; !endpointUrl && i < 5; i++) {
        await sleep(1000);
        endpointUrl = await getMcpEndpointUrl(config, configName);
    }
    if (!endpointUrl) throw new Error(`MCP endpoint URL not available (connection status: ${status}).`);

    const key = await mintApiKey(config, configName);
    const gw = gatewayId(config);
    await writeMcpEntry(configName, endpointUrl, key, scope, {
        gatewayId: gw,
        mcpServerConfigId: `${gw}/mcpserverConfigs/${armSegment(configName)}`,
        connectionId: `${gw}/connections/${armSegment(connName)}`,
        apiName,
    });

    return { ok: true, configName, connName, endpointUrl, scope, reauth: true };
}

// ---------------------------------------------------------------------------
// Installed-state derivation (source of truth = the gateway + CLI config)
// ---------------------------------------------------------------------------

export async function getInstalledState(config) {
    const wsPath = s_workspaceRoot ? join(s_workspaceRoot, ".mcp.json") : null;
    const [configsRes, connectionsRes, profileCfg, workspaceCfg] = await Promise.all([
        arm("GET", `${gatewayId(config)}/mcpserverConfigs?api-version=${API_VERSION}`),
        arm("GET", `${gatewayId(config)}/connections?api-version=${API_VERSION}`),
        readMcpConfigAt(PROFILE_MCP_PATH),
        wsPath ? readMcpConfigAt(wsPath) : Promise.resolve({ mcpServers: {} }),
    ]);

    const connByName = new Map();
    for (const c of connectionsRes.value ?? []) connByName.set(c.name, c);

    const profileKeys = new Set(Object.keys(profileCfg.mcpServers ?? {}));
    const workspaceKeys = new Set(Object.keys(workspaceCfg.mcpServers ?? {}));

    return deriveInstalledState(configsRes.value ?? [], connByName, profileKeys, workspaceKeys, wsPath);
}

// Pure derivation, split out so it can be unit-tested without live ARM.
// A single apiName can have MULTIPLE gateway configs (a portal-side add, a
// duplicate Connect, a re-auth that minted a fresh config). Collect every
// config per apiName, then pick ONE deterministically instead of letting ARM
// list order decide (last-wins) — that overwrite is what stranded a tile on
// "Re-authenticate" while a sibling config was actually Connected.
export function deriveInstalledState(configs, connByName, profileKeys, workspaceKeys, wsPath) {
    const candidatesByApi = {};
    for (const cfg of configs ?? []) {
        const connector = cfg.properties?.connectors?.[0];
        const apiName = connector?.name;
        if (!apiName) continue;
        const connName = connector?.connectionName;
        const conn = connName ? connByName.get(connName) : null;
        const connectionStatus = conn?.properties?.statuses?.[0]?.status ?? conn?.properties?.overallStatus ?? "Unknown";
        const inWorkspace = workspaceKeys.has(cfg.name);
        const inProfile = profileKeys.has(cfg.name);
        (candidatesByApi[apiName] ??= []).push({
            installed: true,
            configName: cfg.name,
            connectionName: connName || null,
            connectionStatus,
            inCli: inProfile || inWorkspace,
            cliScope: inWorkspace ? "workspace" : (inProfile ? "profile" : null),
            cliPath: inWorkspace ? wsPath : (inProfile ? PROFILE_MCP_PATH : null),
        });
    }

    // Prefer the config the local session actually points at, and prefer a
    // Connected one: inCli && Connected > inCli > Connected > any. Config name
    // breaks ties so ARM list order cannot change the selected resource. Keeps the flat
    // one-entry-per-apiName shape the renderer + tests expect.
    const rank = (e) => (e.inCli ? 2 : 0) + (e.connectionStatus === "Connected" ? 1 : 0);
    const byApi = {};
    for (const [apiName, list] of Object.entries(candidatesByApi)) {
        list.sort((a, b) => rank(b) - rank(a) || a.configName.localeCompare(b.configName));
        const best = list[0];
        // Internal-only signal for logging; the renderer ignores unknown fields.
        byApi[apiName] = list.length > 1 ? { ...best, _configCount: list.length, _candidates: list } : best;
    }
    return byApi;
}

// ---------------------------------------------------------------------------
// Browser opener
// ---------------------------------------------------------------------------

async function launchDetached(command, args) {
    await new Promise((resolve, reject) => {
        const child = spawn(command, args, { detached: true, stdio: "ignore" });
        child.once("error", reject);
        child.once("spawn", () => {
            child.unref();
            resolve();
        });
    });
}

export async function openInBrowser(url) {
    // Only ever hand an http(s) URL to the OS shell — guards against the
    // consent URL being anything that could be reinterpreted as a command.
    let safe;
    try {
        const u = new URL(url);
        if (u.protocol !== "http:" && u.protocol !== "https:") return;
        safe = u.toString();
    } catch {
        return;
    }
    const p = platform();
    if (p === "win32") {
        // rundll32 hands the URL to the default protocol handler as a single
        // literal argv with no shell parsing — avoids cmd.exe `start` metachar
        // and quoting pitfalls.
        await launchDetached(await resolveSystemExecutable("rundll32.exe"), ["url.dll,FileProtocolHandler", safe]);
    } else if (p === "darwin") {
        await launchDetached(await resolveSystemExecutable("open"), [safe]);
    } else {
        await launchDetached(await resolveSystemExecutable("xdg-open"), [safe]);
    }
}

// ---------------------------------------------------------------------------
// Config file opener
// ---------------------------------------------------------------------------

// Hand a local file path to the OS so it opens in the user's default handler
// for that type (typically their editor for .json). Single literal argv on
// every platform — no shell, so a path with spaces or metachars is safe.
async function openPath(filePath) {
    const p = platform();
    if (p === "win32") {
        // FileProtocolHandler also accepts plain file paths and routes them to
        // the registered default app, same no-shell guarantee as openInBrowser.
        await launchDetached(await resolveSystemExecutable("rundll32.exe"), ["url.dll,FileProtocolHandler", filePath]);
    } else if (p === "darwin") {
        await launchDetached(await resolveSystemExecutable("open"), [filePath]);
    } else {
        await launchDetached(await resolveSystemExecutable("xdg-open"), [filePath]);
    }
}

// Open the MCP config this canvas writes to (the profile scope —
// ~/.copilot/mcp-config.json). Creates an empty, correctly-shaped config if
// none exists yet so the editor never opens a missing file. Returns the path
// either way so the UI can show where it lives even if the OS open is a no-op.
export async function openMcpConfigFile() {
    const path = PROFILE_MCP_PATH;
    try {
        await fs.access(path);
    } catch {
        try {
            await fs.mkdir(dirname(path), { recursive: true });
            await fs.writeFile(path, JSON.stringify({ mcpServers: {} }, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
            await fs.chmod(path, 0o600).catch(() => {});
        } catch (err) {
            return { ok: false, path, error: err.message };
        }
    }
    await openPath(path);
    return { ok: true, path };
}
