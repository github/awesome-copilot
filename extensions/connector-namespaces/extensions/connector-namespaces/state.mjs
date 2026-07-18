// State management — persists gateway config and tracks added connectors.

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { armSegment } from "./armClient.mjs";

const STORAGE_DIR = join(process.env.COPILOT_HOME || join(homedir(), ".copilot"), "extensions", "connector-namespaces", "artifacts");
const CONFIG_FILE = join(STORAGE_DIR, "gateway-config.json");

// Persisted default for newly opened canvas instances.
const addedConnectors = new Map();
let savedConfig = null;

// ---------------------------------------------------------------------------
// Persistent config (gateway selection)
// ---------------------------------------------------------------------------

function ensureStorageDir() {
    mkdirSync(STORAGE_DIR, { recursive: true, mode: 0o700 });
    chmodSync(STORAGE_DIR, 0o700);
}

export function isValidConfig(data) {
    const complete = (
        data != null &&
        typeof data === "object" &&
        typeof data.subscriptionId === "string" && data.subscriptionId.length > 0 &&
        typeof data.resourceGroup === "string" && data.resourceGroup.length > 0 &&
        typeof data.gatewayName === "string" && data.gatewayName.length > 0
    );
    if (!complete) return false;
    try {
        armSegment(data.subscriptionId);
        armSegment(data.resourceGroup);
        armSegment(data.gatewayName);
        return true;
    } catch {
        return false;
    }
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
                savedConfig = data;
                return data;
            }
        }
    } catch { /* ignore corrupt file */ }
    savedConfig = null;
    return null;
}

export function saveConfig(config) {
    if (!isValidConfig(config)) {
        throw new Error("Invalid connector namespace configuration.");
    }
    ensureStorageDir();
    savedConfig = config;
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { encoding: "utf-8", mode: 0o600 });
    chmodSync(CONFIG_FILE, 0o600);
}

export function clearConfig() {
    // Remove the file outright rather than leaving a "{}" stub that a later
    // loadSavedConfig could misread as a valid selection.
    try {
        unlinkSync(CONFIG_FILE);
    } catch (error) {
        if (error?.code !== "ENOENT") throw error;
    }
    savedConfig = null;
}

export function getSavedConfig() {
    return savedConfig;
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
