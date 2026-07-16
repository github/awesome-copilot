// MCP smoke-test orchestrator.
//
// Standalone harness that proves the Microsoft first-party MCP servers behind a
// connector gateway actually work end-to-end: connect -> initialize ->
// tools/list -> a safe tools/call. It imports the extension's real pipeline
// (install.mjs, catalog.mjs, armClient.mjs) and connects through the same native
// Streamable HTTP endpoint persisted for the Copilot CLI.
//
// Runs with `node` and a signed-in Azure CLI — no Copilot app required — so it
// can be handed to someone else to reproduce MCP issues. See README.md.
//
// Usage:
//   node extensions/connector-namespaces/test/smoke.mjs [options]
//
// Options:
//   --only=a,b      only test these apiNames (comma-separated)
//   --limit=N       stop after N connectable servers
//   --open-consent  open consent URLs in the browser for servers that need it
//   --no-cleanup    do not uninstall fresh keyless installs afterward

import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

import { loadSavedConfig } from "../state.mjs";
import { getToken } from "../armClient.mjs";
import { CATEGORY } from "../categories.mjs";
import {
    installConnector,
    finishInstall,
    getInstalledState,
    getConnectionStatus,
    getMcpEndpointUrl,
    mintApiKey,
    uninstallConnector,
    openInBrowser,
    assertSafeMcpTarget,
} from "../install.mjs";
import { fetchCatalog } from "../catalog.mjs";
import { probe } from "./mcp-probe.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = join(HERE, "reports");
const PROFILE_MCP_PATH = join(process.env.COPILOT_HOME || join(homedir(), ".copilot"), "mcp-config.json");
const ARTIFACTS_DIR = join(process.env.COPILOT_HOME || join(homedir(), ".copilot"), "extensions", "connector-namespaces", "artifacts");
const PENDING_FILE = join(ARTIFACTS_DIR, "smoke-pending-consent.json");

// The loopback callback never has to be listening — gateway-side consent
// completes in the browser; this URL is only embedded in the redirect.
const CALLBACK_BASE = "http://127.0.0.1:7333/auth/callback/";

function parseArgs(argv) {
    const opts = { only: null, limit: Infinity, openConsent: false, cleanup: true };
    for (const a of argv) {
        if (a.startsWith("--only=")) opts.only = new Set(a.slice(7).split(",").map((s) => s.trim()).filter(Boolean));
        else if (a.startsWith("--limit=")) {
            const limit = Number.parseInt(a.slice(8), 10);
            opts.limit = Number.isNaN(limit) ? Infinity : limit;
        }
        else if (a === "--open-consent") opts.openConsent = true;
        else if (a === "--no-cleanup") opts.cleanup = false;
    }
    return opts;
}

function readPending() {
    try {
        if (existsSync(PENDING_FILE)) return JSON.parse(readFileSync(PENDING_FILE, "utf-8"));
    } catch { /* ignore corrupt */ }
    return {};
}

function writePending(map) {
    if (!existsSync(ARTIFACTS_DIR)) mkdirSync(ARTIFACTS_DIR, { recursive: true, mode: 0o700 });
    chmodSync(ARTIFACTS_DIR, 0o700);
    if (existsSync(PENDING_FILE)) chmodSync(PENDING_FILE, 0o600);
    writeFileSync(PENDING_FILE, JSON.stringify(map, null, 2), { encoding: "utf-8", mode: 0o600 });
    chmodSync(PENDING_FILE, 0o600);
}

// Read the native HTTP MCP credentials from the CLI config.
function credsFromCli(configName) {
    try {
        const cfg = JSON.parse(readFileSync(PROFILE_MCP_PATH, "utf-8"));
        const entry = cfg.mcpServers?.[configName];
        if (entry?.url && entry?.headers?.["X-API-Key"]) {
            return { url: entry.url, key: entry.headers["X-API-Key"] };
        }
    } catch { /* ignore */ }
    return null;
}

// Resolve url+key for an installed+connected server, minting a key if the CLI
// entry is missing (e.g. installed at the gateway but not added to the CLI).
async function resolveCreds(config, state) {
    const fromCli = credsFromCli(state.configName);
    if (fromCli) return fromCli;
    const url = await getMcpEndpointUrl(config, state.configName);
    if (!url) return null;
    const key = await mintApiKey(config, state.configName);
    return { url, key };
}

function redact(text) {
    if (typeof text !== "string") return text;
    // Redact anything that looks like a gateway API key in URLs or headers.
    return text.replace(/([?&](?:key|code|api[-_]?key)=)[^&\s"]+/gi, "$1<redacted>");
}

// Collapse CR/LF so user/network-derived error text can't forge extra log
// lines (CodeQL js/log-injection). Kept separate from redact() so the
// pretty-printed JSON report still retains its newlines.
function logLine(text) {
    return redact(String(text)).replace(/[\r\n]+/g, " ");
}

const C = {
    reset: "\x1b[0m", dim: "\x1b[2m", bold: "\x1b[1m",
    green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", cyan: "\x1b[36m",
};
const tick = (ok) => (ok ? `${C.green}PASS${C.reset}` : `${C.red}FAIL${C.reset}`);

async function main() {
    const opts = parseArgs(process.argv.slice(2));

    // 1. Bootstrap: gateway coords + ARM token (fail fast).
    const config = loadSavedConfig();
    if (!config?.subscriptionId || !config?.resourceGroup || !config?.gatewayName) {
        console.error(`${C.red}No gateway config found.${C.reset} Expected ${join(ARTIFACTS_DIR, "gateway-config.json")}.`);
        console.error("Pick a gateway once in the connector-namespaces canvas, or create that file with { subscriptionId, resourceGroup, gatewayName }.");
        process.exit(2);
    }
    try {
        await getToken();
    } catch (err) {
        console.error(`${C.red}Could not get an ARM token.${C.reset} Sign in to Azure when the browser opens.`);
        console.error(String(err.message || err).slice(0, 300));
        process.exit(2);
    }

    console.log(`${C.bold}MCP smoke test${C.reset}  gateway=${C.cyan}${config.gatewayName}${C.reset}  rg=${config.resourceGroup}`);

    // 2. Target set: Microsoft first-party MCP servers only.
    const catalog = await fetchCatalog(config.subscriptionId, config.resourceGroup, config.gatewayName);
    let servers = catalog.filter((s) => s.category === CATEGORY.microsoft);
    if (opts.only) servers = servers.filter((s) => opts.only.has(s.apiName));
    console.log(`${C.dim}${servers.length} Microsoft servers in catalog${C.reset}\n`);

    const installedState = await getInstalledState(config);
    const pending = readPending();

    const results = [];
    let connectable = 0;

    for (const server of servers) {
        if (connectable >= opts.limit) break;
        const label = server.displayName || server.apiName;
        process.stdout.write(`${C.bold}${label}${C.reset} ${C.dim}(${server.apiName})${C.reset}\n`);

        const record = { apiName: server.apiName, displayName: label, classification: null, probe: null, cleanup: false };
        let creds = null;

        try {
            const state = installedState[server.apiName];
            const pend = pending[server.apiName];

            if (pend) {
                // We surfaced a consent URL on a previous run — check if it's done now.
                const status = await getConnectionStatus(config, pend.connName);
                if (status === "Connected") {
                    console.log(`  ${C.dim}consent completed, finishing install...${C.reset}`);
                    const fin = await finishInstall(config, server.apiName, label, pend.connName, pend.location);
                    creds = credsFromCli(fin.configName) || { url: fin.endpointUrl, key: null };
                    record.classification = "consented-now";
                    delete pending[server.apiName];
                    writePending(pending);
                } else {
                    record.classification = "pending-consent";
                    console.log(`  ${C.yellow}PENDING_CONSENT${C.reset} still ${status}. Consent: ${pend.consentUrl}`);
                    if (opts.openConsent) await openInBrowser(pend.consentUrl);
                    results.push(record);
                    continue;
                }
            } else if (state?.installed && state.connectionStatus === "Connected") {
                record.classification = "probe-only";
                creds = await resolveCreds(config, state);
            } else if (state?.installed) {
                record.classification = "installed-not-connected";
                console.log(`  ${C.yellow}SKIP${C.reset} installed but connection is ${state.connectionStatus}`);
                results.push(record);
                continue;
            } else {
                // Not installed — try a fresh install.
                const res = await installConnector(config, server.apiName, label, CALLBACK_BASE);
                if (res?.ok) {
                    record.classification = "fresh-install";
                    record.cleanup = opts.cleanup;
                    creds = credsFromCli(res.configName) || { url: res.endpointUrl, key: null };
                } else if (res?.needsConsent) {
                    record.classification = "needs-consent";
                    pending[server.apiName] = {
                        connName: res.connName, location: res.location,
                        displayName: label, consentUrl: res.consentUrl, savedAt: Date.now(),
                    };
                    writePending(pending);
                    console.log(`  ${C.yellow}NEEDS_CONSENT${C.reset} consent once, then re-run. URL:\n    ${res.consentUrl}`);
                    if (opts.openConsent) await openInBrowser(res.consentUrl);
                    results.push(record);
                    continue;
                } else {
                    throw new Error("installConnector returned neither ok nor needsConsent");
                }
            }

            if (!creds?.url || !creds?.key) {
                record.error = "could not resolve url+key for probe";
                console.log(`  ${C.red}FAIL${C.reset} ${record.error}`);
                results.push(record);
                continue;
            }
            assertSafeMcpTarget(creds.url);

            connectable++;
            const r = await probe({ ...server, displayName: label, url: creds.url, key: creds.key });
            record.probe = r;

            const callLine = r.steps.toolsCall.status === "skipped"
                ? `${C.yellow}SKIPPED${C.reset}`
                : `${tick(r.steps.toolsCall.ok)}${r.toolCalled ? ` ${C.dim}${r.toolCalled}${C.reset}` : ""}`;
            console.log(`  init ${tick(r.steps.initialize.ok)}  tools/list ${tick(r.steps.toolsList.ok)} ${C.dim}(${r.toolCount})${C.reset}  tools/call ${callLine}`);
            if (r.error) console.log(`  ${C.red}${logLine(r.error)}${C.reset}`);

        } catch (err) {
            record.error = String(err.message || err);
            console.log(`  ${C.red}ERROR${C.reset} ${logLine(record.error).slice(0, 300)}`);
        } finally {
            if (record.cleanup) {
                try {
                    await uninstallConnector(config, server.apiName);
                    console.log(`  ${C.dim}cleaned up fresh install${C.reset}`);
                } catch (err) {
                    record.cleanupError = String(err.message || err);
                    console.log(`  ${C.red}CLEANUP ERROR${C.reset} ${logLine(record.cleanupError).slice(0, 300)}`);
                }
            }
        }

        results.push(record);
        console.log("");
    }

    // 3. Summary + report files.
    const probed = results.filter((r) => r.probe);
    const passed = probed.filter((r) => r.probe.status === "passed");
    const failed = probed.filter((r) => r.probe.status === "failed");
    const safeCallSkipped = probed.filter((r) => r.probe.status === "skipped");
    const orchestrationErrors = results.filter((r) => r.error || r.cleanupError);
    const needsConsent = results.filter((r) => r.classification === "needs-consent" || r.classification === "pending-consent");
    const skipped = [...results.filter((r) => !r.probe && !needsConsent.includes(r)), ...safeCallSkipped];

    console.log(`${C.bold}Summary${C.reset}`);
    console.log(`  probed:        ${probed.length}`);
    console.log(`  ${C.green}passed:        ${passed.length}${C.reset}`);
    console.log(`  ${C.red}failed:        ${failed.length}${C.reset}`);
    console.log(`  ${C.red}errors:        ${orchestrationErrors.length}${C.reset}`);
    console.log(`  ${C.yellow}needs consent: ${needsConsent.length}${C.reset}`);
    console.log(`  skipped:       ${skipped.length}`);
    if (needsConsent.length) {
        console.log(`\n  ${C.yellow}Consent once for these, then re-run to test headless:${C.reset}`);
        for (const r of needsConsent) console.log(`    - ${r.displayName} (${r.apiName})`);
    }

    if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true, mode: 0o700 });
    chmodSync(REPORTS_DIR, 0o700);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const jsonPath = join(REPORTS_DIR, `mcp-smoke-${ts}.json`);
    const logPath = join(REPORTS_DIR, `mcp-smoke-${ts}.log`);

    const report = {
        timestamp: new Date().toISOString(),
        gateway: { gatewayName: config.gatewayName, resourceGroup: config.resourceGroup },
        totals: { probed: probed.length, passed: passed.length, failed: failed.length, errors: orchestrationErrors.length, needsConsent: needsConsent.length, skipped: skipped.length },
        servers: results,
    };
    writeFileSync(jsonPath, redact(JSON.stringify(report, null, 2)), { encoding: "utf-8", mode: 0o600 });
    writeFileSync(logPath, redact(renderLog(report)), { encoding: "utf-8", mode: 0o600 });
    chmodSync(jsonPath, 0o600);
    chmodSync(logPath, 0o600);

    console.log(`\n  report: ${logPath}`);
    console.log(`  json:   ${jsonPath}`);

    // CI-friendly: non-zero if a probe or orchestration step failed.
    process.exit(failed.length > 0 || orchestrationErrors.length > 0 ? 1 : 0);
}

function renderLog(report) {
    const lines = [];
    lines.push(`MCP smoke test  ${report.timestamp}`);
    lines.push(`gateway: ${report.gateway.gatewayName}  rg: ${report.gateway.resourceGroup}`);
    lines.push("");
    for (const s of report.servers) {
        lines.push(`## ${s.displayName} (${s.apiName})`);
        lines.push(`   classification: ${s.classification}`);
        if (s.error) lines.push(`   error: ${s.error}`);
        if (s.cleanupError) lines.push(`   cleanupError: ${s.cleanupError}`);
        if (s.probe) {
            const p = s.probe;
            lines.push(`   serverInfo: ${p.serverInfo || "-"}`);
            lines.push(`   initialize: ${p.steps.initialize.ok ? "PASS" : "FAIL"} (${p.steps.initialize.latencyMs ?? "-"}ms)`);
            lines.push(`   tools/list: ${p.steps.toolsList.ok ? "PASS" : "FAIL"} — ${p.toolCount} tools`);
            const tc = p.steps.toolsCall;
            lines.push(`   tools/call: ${tc.status}${p.toolCalled ? ` [${p.toolCalled}, ${p.toolSource}]` : ""}`);
            if (tc.error) lines.push(`     callError: ${tc.error}`);
            if (p.error) lines.push(`   probeError: ${p.error}`);
        }
        lines.push("");
    }
    const t = report.totals;
    lines.push(`SUMMARY  probed=${t.probed} passed=${t.passed} failed=${t.failed} errors=${t.errors} needsConsent=${t.needsConsent} skipped=${t.skipped}`);
    return lines.join("\n");
}

main().catch((err) => {
    console.error(`${C.red}Fatal:${C.reset} ${err.stack || err}`);
    process.exit(2);
});
