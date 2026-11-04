// Extension: agent-radar
// Global live view of running Copilot agents (app, CLI, VS Code) and where their data flows.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";
import { collectSnapshot, inFolder, sessionRoots } from "./collector.mjs";

const UI_HTML = readFileSync(new URL("./ui.html", import.meta.url), "utf8");
const POLL_MS = 2000;

// One shared poller feeds every open panel.
const clients = new Set();
let latest = null, latestJson = "", timer = null, inflight = null;

// Callers that arrive during a poll share its promise, so they all get the same snapshot.
function poll() {
    inflight ||= (async () => {
        try {
            latest = await collectSnapshot();
            const json = JSON.stringify(latest);
            if (json !== latestJson) {
                latestJson = json;
                for (const res of clients) res.write(`data: ${json}\n\n`);
            }
        } catch (e) {
            session?.log(`agent-radar poll failed: ${e.message}`, { level: "warning", ephemeral: true });
        } finally { inflight = null; }
    })();
    return inflight;
}

function ensurePolling() {
    if (!timer) { timer = setInterval(poll, POLL_MS); poll(); }
}
function maybeStopPolling() {
    if (timer && servers.size === 0) { clearInterval(timer); timer = null; }
}

const servers = new Map(); // instanceId -> { server, url }

const SECURITY_HEADERS = {
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
};
const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:";

// Every server has its own secret path prefix. The page, /state, and /events all need it,
// so other local users and web pages (DNS rebinding) cannot read the session data.
async function startServer() {
    const token = randomBytes(24).toString("base64url");
    const prefix = `/${token}/`;
    let origin = "";
    const authorized = (req, url) => {
        if (!origin || req.headers.host !== new URL(origin).host) return false;
        if (req.headers.origin && req.headers.origin !== origin) return false;
        const got = Buffer.from(url.pathname.slice(0, prefix.length)), want = Buffer.from(prefix);
        return got.length === want.length && timingSafeEqual(got, want);
    };
    const server = createServer(async (req, res) => {
        let url;
        try { url = new URL(req.url, "http://127.0.0.1"); } catch {
            res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8", ...SECURITY_HEADERS });
            return res.end("Bad request");
        }
        if (req.method !== "GET" || !authorized(req, url)) {
            res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8", ...SECURITY_HEADERS });
            return res.end("Forbidden");
        }
        const route = url.pathname.slice(prefix.length);
        if (route === "state") {
            if (!latest) await poll();
            res.writeHead(latestJson ? 200 : 503, { "Content-Type": "application/json", ...SECURITY_HEADERS });
            return res.end(latestJson || "{}");
        }
        if (route === "events") {
            res.writeHead(200, { "Content-Type": "text/event-stream", Connection: "keep-alive", ...SECURITY_HEADERS });
            res.write(": hi\n\n");
            clients.add(res);
            const ka = setInterval(() => res.write(": ka\n\n"), 15000);
            req.on("close", () => { clearInterval(ka); clients.delete(res); });
            return;
        }
        if (route !== "") {
            res.writeHead(404, SECURITY_HEADERS);
            return res.end();
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": CSP, ...SECURITY_HEADERS });
        res.end(UI_HTML);
    });
    const listen = (port) => new Promise((resolve, reject) => {
        const onError = (e) => { server.off("listening", onListening); reject(e); };
        const onListening = () => { server.off("error", onError); resolve(); };
        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(port, "127.0.0.1");
    });
    // Try each preferred port one time, then let the OS select a free port.
    let bound = false;
    for (let port = 47800; port < 47810 && !bound; port++) {
        try { await listen(port); bound = true; } catch {}
    }
    if (!bound) await listen(0);
    origin = `http://127.0.0.1:${server.address().port}`;
    return { server, url: origin + prefix };
}

function summarize(snap, activeOnly) {
    const now = snap.now;
    const sessions = snap.sessions.filter((s) => !activeOnly || s.busy || s.waiting || s.backgroundShells?.length > 0);
    const inUse = (i) => sessions.some((s) => sessionRoots(s).some((c) => i.folders.some((f) => inFolder(c, f))));
    return {
        at: new Date(now).toISOString(),
        vscodeWindows: snap.ides.filter((i) => !activeOnly || inUse(i)).map((i) => ({ ide: i.ide, folders: i.folders })),
        sessions: sessions
            .map((s) => ({
                id: s.id, name: s.name, surface: s.surface, repo: s.repo, model: s.model,
                status: s.waiting ? "waiting" : s.busy ? "working" : "idle",
                lastActivitySecondsAgo: Math.round((now - s.lastEventAt) / 1000),
                // Only tool names. Command arguments can contain credentials, so they stay in the local UI.
                runningTools: s.runningTools.map((t) => t.name),
                subagents: s.subagents.filter((a) => !activeOnly || a.running).map((a) => ({ name: a.name, model: a.model, running: a.running })),
                // Shell IDs, PIDs, and start times only. Command lines and logs stay out.
                ...(s.childSessions?.length ? { childSessions: s.childSessions } : {}),
                ...(s.backgroundShells?.length ? { backgroundShells: s.backgroundShells } : {}),
                dataFlowsLast2Min: [...new Set(s.flows.map((f) => f.sink))],
            })),
    };
}

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "agent-radar",
            displayName: "Agent Radar",
            description: "Live global map of all running Copilot agents (app, CLI, VS Code), their sub-agents, what they are doing, and where their data flows.",
            actions: [
                {
                    name: "snapshot",
                    description: "Return a structured summary of all agent sessions, their status, current tool names, sub-agents, and data destinations. Command arguments are not included.",
                    inputSchema: { type: "object", properties: { activeOnly: { type: "boolean", description: "Only sessions that are working or waiting for input (default true)." } } },
                    handler: async (ctx) => {
                        const snap = await collectSnapshot();
                        return summarize(snap, ctx.input?.activeOnly ?? true);
                    },
                },
            ],
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer();
                    servers.set(ctx.instanceId, entry);
                }
                ensurePolling();
                return { title: "Agent Radar", url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    entry.server.closeAllConnections?.();
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
                maybeStopPolling();
            },
        }),
    ],
});
