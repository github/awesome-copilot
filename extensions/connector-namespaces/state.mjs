// State management — persists gateway config and tracks added connectors.

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const STORAGE_DIR = join(process.env.COPILOT_HOME || join(homedir(), ".copilot"), "extensions", "connector-namespaces", "artifacts");
const CONFIG_FILE = join(STORAGE_DIR, "gateway-config.json");

// In-memory state
const addedConnectors = new Map();
let sessionConfig = null;

// ---------------------------------------------------------------------------
// Persistent config (gateway selection)
// ---------------------------------------------------------------------------

function ensureStorageDir() {
    if (!existsSync(STORAGE_DIR)) {
        mkdirSync(STORAGE_DIR, { recursive: true });
    }
}

function isValidConfig(data) {
    return (
        data != null &&
        typeof data === "object" &&
        typeof data.subscriptionId === "string" && data.subscriptionId.length > 0 &&
        typeof data.resourceGroup === "string" && data.resourceGroup.length > 0 &&
        typeof data.gatewayName === "string" && data.gatewayName.length > 0
    );
}

export function loadSavedConfig() {
    try {
        if (existsSync(CONFIG_FILE)) {
            const data = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
            // Only accept a fully-formed config. A shapeless or empty object
            // (e.g. the legacy "{}" an old clearConfig used to write) must not
            // masquerade as a valid selection, or the picker gets skipped and
            // the catalog is fetched with missing coordinates.
            if (isValidConfig(data)) {
                sessionConfig = data;
                return data;
            }
        }
    } catch { /* ignore corrupt file */ }
    sessionConfig = null;
    return null;
}

export function saveConfig(config) {
    ensureStorageDir();
    sessionConfig = config;
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function clearConfig() {
    sessionConfig = null;
    // Remove the file outright rather than leaving a "{}" stub that a later
    // loadSavedConfig could misread as a valid selection.
    try { if (existsSync(CONFIG_FILE)) unlinkSync(CONFIG_FILE); } catch { /* ignore */ }
}

export function setSessionConfig(config) {
    sessionConfig = config;
}

export function getSessionConfig() {
    return sessionConfig;
}

// ---------------------------------------------------------------------------
// Added connectors (session-only, not persisted)
// ---------------------------------------------------------------------------

export function getAddedConnectors() {
    return [...addedConnectors.values()];
}

export function addConnector(connector) {
    if (addedConnectors.has(connector.id)) {
        return { added: false, reason: "already_added" };
    }
    addedConnectors.set(connector.id, {
        connector,
        addedAt: new Date().toISOString(),
    });
    return { added: true, connector: connector.displayName };
}

export function removeConnector(connectorId) {
    if (!addedConnectors.has(connectorId)) {
        return { removed: false, reason: "not_found" };
    }
    addedConnectors.delete(connectorId);
    return { removed: true };
}

export function isConnectorAdded(connectorId) {
    return addedConnectors.has(connectorId);
}
