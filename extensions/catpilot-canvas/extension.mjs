// Extension: catpilot-canvas
// A modern visual command center for CatPilot. Serves a single-page app over a
// loopback HTTP server and reads/writes the SAME storage the CatPilot agent,
// `cat-pilot` CLI and CatPilot MCP server use (via catpilot-store.mjs).

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";
import * as store from "./catpilot-store.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UI_DIR = path.join(HERE, "ui");

let sessionRef = null;
function log(message, level = "info") {
    try { sessionRef?.log?.(message, { level }); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Single shared loopback server (data is global; every instance is identical).
// ---------------------------------------------------------------------------
let sharedServer = null;
let serverInit = null;
const openInstances = new Set();

const STATIC = {
    "/": { file: "index.html", type: "text/html; charset=utf-8" },
    "/index.html": { file: "index.html", type: "text/html; charset=utf-8" },
    "/app.js": { file: "app.js", type: "text/javascript; charset=utf-8" },
    "/styles.css": { file: "styles.css", type: "text/css; charset=utf-8" },
    "/hero.png": { file: "hero.png", type: "image/png" },
    "/hero.svg": { file: "hero.svg", type: "image/svg+xml" },
};

function sendJson(res, code, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(body);
}

async function readBody(req) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    if (!chunks.length) return {};
    try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return {}; }
}

// REST API: (method, pathname) -> handler(req, params, body) returning data
async function handleApi(req, url) {
    const p = url.pathname;
    const m = req.method;

    // Status / onboarding
    if (p === "/api/status" && m === "GET") {
        return { ...store.configStatus() };
    }
    if (p === "/api/setup" && m === "POST") {
        store.writeConfig(await readBody(req));
        return { ok: true, ...store.configStatus() };
    }
    if (p === "/api/summary" && m === "GET") return store.summary();

    // Tasks
    if (p === "/api/tasks" && m === "GET") return { tasks: store.listTasks(url.searchParams.get("status") || "all") };
    if (p === "/api/tasks" && m === "POST") return { task: store.addTask(await readBody(req)) };
    let mm = p.match(/^\/api\/tasks\/(\d+)$/);
    if (mm && m === "PUT") return { task: store.updateTask(mm[1], await readBody(req)) };
    if (mm && m === "DELETE") return { removed: store.removeTask(mm[1]) };
    mm = p.match(/^\/api\/tasks\/(\d+)\/complete$/);
    if (mm && m === "POST") return { task: store.completeTask(mm[1]) };

    // Journal
    if (p === "/api/journal" && m === "GET") return { entries: store.listJournal(Number(url.searchParams.get("days")) || 3650) };
    if (p === "/api/journal" && m === "POST") return { entry: store.addJournal((await readBody(req)).text) };

    // Milestones
    if (p === "/api/milestones" && m === "GET") return { milestones: store.listMilestones() };
    if (p === "/api/milestones" && m === "POST") return { milestone: store.addMilestone(await readBody(req)) };
    mm = p.match(/^\/api\/milestones\/(\d+)$/);
    if (mm && m === "PUT") return { milestone: store.updateMilestone(mm[1], await readBody(req)) };

    // Memos
    if (p === "/api/memos" && m === "GET") return { memos: store.listMemos() };
    if (p === "/api/memos" && m === "POST") return { memo: store.createMemo(await readBody(req)) };
    mm = p.match(/^\/api\/memos\/(.+)$/);
    if (mm && m === "GET") return { memo: store.readMemo(decodeURIComponent(mm[1])) };

    // Domains: learning | growth | projects
    mm = p.match(/^\/api\/(learning|growth|projects)$/);
    if (mm && m === "GET") return { notes: store.listNotes(mm[1]) };
    if (mm && m === "POST") {
        const body = await readBody(req);
        const { title, body: noteBody, ...frontmatter } = body;
        return { note: store.addNote(mm[1], { title, body: noteBody, frontmatter }) };
    }
    mm = p.match(/^\/api\/(learning|growth|projects)\/(.+)$/);
    if (mm && m === "GET") return { note: store.readNote(mm[1], decodeURIComponent(mm[2])) };

    // Reports (Copilot-generated executive reports)
    if (p === "/api/reports" && m === "GET") return { reports: store.listReports() };
    if (p === "/api/reports" && m === "POST") {
        const body = await readBody(req);
        if (body && typeof body.body === "string" && body.body.length) return { report: store.saveReport(body) };
        return { report: store.generateReport(body || {}) };
    }
    mm = p.match(/^\/api\/reports\/(.+)$/);
    if (mm && m === "GET") return { report: store.readReport(decodeURIComponent(mm[1])) };
    if (mm && m === "DELETE") return { removed: store.deleteReport(decodeURIComponent(mm[1])) };

    // Timeline / activity feed
    if (p === "/api/timeline" && m === "GET") return store.activity({ days: Number(url.searchParams.get("days")) || 14 });

    // Config + interactive data migration
    if (p === "/api/config" && m === "GET") return store.getConfig();
    if (p === "/api/config/plan" && m === "POST") return store.planConfigChange(await readBody(req));
    if (p === "/api/config/apply" && m === "POST") return store.applyConfigChange(await readBody(req));

    // Agent bridge — drive the Copilot session from the canvas
    if (p === "/api/agent" && m === "POST") {
        const { prompt } = await readBody(req);
        if (!prompt || !String(prompt).trim()) throw new Error("prompt is required");
        if (!sessionRef?.send) return { ok: false, error: "No active session." };
        const id = await sessionRef.send(String(prompt));
        return { ok: true, id };
    }
    if (p === "/api/agent/generate" && m === "POST") {
        const { prompt, timeout } = await readBody(req);
        if (!prompt || !String(prompt).trim()) throw new Error("prompt is required");
        if (!sessionRef?.sendAndWait) return { ok: false, error: "No active session." };
        const ev = await sessionRef.sendAndWait(String(prompt), Number(timeout) || 120000);
        return { ok: true, content: ev?.data?.content || "" };
    }

    return null; // not an API route we know
}

// Reject cross-origin / DNS-rebinding attempts against the loopback API. The
// server binds to 127.0.0.1, but a malicious web page could still POST to it
// via a spoofed Host header or a cross-site form/fetch, so we defend in depth:
// only loopback Host values are accepted, cross-site Sec-Fetch-Site is refused,
// and any Origin present must itself be loopback.
function isLoopbackHost(value) {
    if (!value) return false;
    let host = String(value).trim().toLowerCase();
    if (host.startsWith("[")) host = host.slice(1, host.indexOf("]") === -1 ? host.length : host.indexOf("]"));
    else host = host.split(":")[0];
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

function apiGuardReason(req) {
    const host = req.headers["host"];
    if (host && !isLoopbackHost(host)) return "host";
    const site = req.headers["sec-fetch-site"];
    if (site && site !== "same-origin" && site !== "none") return "sec-fetch-site";
    const origin = req.headers["origin"];
    if (origin) {
        try { if (!isLoopbackHost(new URL(origin).hostname)) return "origin"; }
        catch { return "origin"; }
    }
    return null;
}

async function requestListener(req, res) {
    let url;
    try { url = new URL(req.url, "http://127.0.0.1"); } catch { res.writeHead(400); return res.end(); }
    const p = url.pathname;

    if (p.startsWith("/api/")) {
        const denied = apiGuardReason(req);
        if (denied) return sendJson(res, 403, { error: "Forbidden", code: "CROSS_ORIGIN_BLOCKED", reason: denied });
        try {
            const data = await handleApi(req, url);
            if (data === null) return sendJson(res, 404, { error: "Not found" });
            return sendJson(res, 200, data);
        } catch (err) {
            const notConfigured = err?.code === "NOT_CONFIGURED";
            return sendJson(res, notConfigured ? 409 : 400, { error: err.message, code: err.code || null });
        }
    }

    const asset = STATIC[p];
    if (asset) {
        try {
            const buf = await readFile(path.join(UI_DIR, asset.file));
            res.writeHead(200, { "Content-Type": asset.type, "Cache-Control": "no-store" });
            return res.end(buf);
        } catch {
            res.writeHead(404); return res.end("Not found");
        }
    }
    res.writeHead(404); res.end("Not found");
}

async function ensureServer() {
    if (sharedServer) return sharedServer;
    // Cache the in-flight init so concurrent open() calls share one server
    // instead of racing to bind two loopback listeners.
    if (!serverInit) {
        serverInit = (async () => {
            const server = createServer((req, res) => {
                requestListener(req, res).catch(() => { try { res.writeHead(500); res.end(); } catch { /* */ } });
            });
            await new Promise((resolve, reject) => {
                server.once("error", reject);
                server.listen(0, "127.0.0.1", resolve);
            });
            const port = server.address().port;
            sharedServer = { server, url: `http://127.0.0.1:${port}/` };
            log(`CatPilot canvas server listening on ${sharedServer.url}`);
            return sharedServer;
        })().catch((err) => { serverInit = null; throw err; });
    }
    return serverInit;
}

// ---------------------------------------------------------------------------
// Agent-facing actions (mirror the main mutations so the agent can drive it).
// ---------------------------------------------------------------------------
const actions = [
    {
        name: "refresh",
        description: "Return the latest CatPilot dashboard summary (counts, activity, charts data).",
        handler: async () => {
            try { return { ok: true, summary: store.summary() }; }
            catch (err) {
                if (err.code === "NOT_CONFIGURED") return { ok: false, configured: false };
                throw new CanvasError("summary_failed", err.message);
            }
        },
    },
    {
        name: "add_task",
        description: "Add a CatPilot task.",
        inputSchema: {
            type: "object",
            required: ["title"],
            properties: {
                title: { type: "string" },
                due: { type: "string", description: "YYYY-MM-DD" },
                priority: { type: "string", description: "P0/P1/P2/P3 or High/Med/Low" },
                tags: { type: "string" },
                context: { type: "string" },
            },
        },
        handler: async (ctx) => {
            try { return { ok: true, task: store.addTask(ctx.input || {}) }; }
            catch (err) { throw new CanvasError("add_task_failed", err.message); }
        },
    },
    {
        name: "complete_task",
        description: "Mark a CatPilot task as Done by numeric ID.",
        inputSchema: { type: "object", required: ["id"], properties: { id: { type: "number" } } },
        handler: async (ctx) => {
            try { return { ok: true, task: store.completeTask(ctx.input.id) }; }
            catch (err) { throw new CanvasError("complete_task_failed", err.message); }
        },
    },
    {
        name: "add_journal",
        description: "Append a CatPilot journal entry for today.",
        inputSchema: { type: "object", required: ["text"], properties: { text: { type: "string" } } },
        handler: async (ctx) => {
            try { return { ok: true, entry: store.addJournal(ctx.input.text) }; }
            catch (err) { throw new CanvasError("add_journal_failed", err.message); }
        },
    },
    {
        name: "add_milestone",
        description: "Add a CatPilot milestone.",
        inputSchema: {
            type: "object",
            required: ["name"],
            properties: {
                name: { type: "string" },
                targetDate: { type: "string", description: "YYYY-MM-DD" },
                status: { type: "string", enum: ["Planned", "In Progress", "Done"] },
                notes: { type: "string" },
            },
        },
        handler: async (ctx) => {
            try { return { ok: true, milestone: store.addMilestone(ctx.input || {}) }; }
            catch (err) { throw new CanvasError("add_milestone_failed", err.message); }
        },
    },
    {
        name: "generate_report",
        description: "Generate and save a CatPilot executive report (markdown) for a period, built from tasks, milestones and journal.",
        inputSchema: {
            type: "object",
            properties: {
                period: { type: "string", enum: ["today", "this-week", "last-week", "last-7", "this-month", "last-month", "last-30", "all"], description: "Reporting period (default this-week)." },
                title: { type: "string", description: "Optional report title." },
            },
        },
        handler: async (ctx) => {
            try { return { ok: true, report: store.generateReport(ctx.input || {}) }; }
            catch (err) { throw new CanvasError("generate_report_failed", err.message); }
        },
    },
    {
        name: "save_report",
        description: "Save a CatPilot report the agent has authored (e.g. via the report-generator skill) into the canvas reports folder.",
        inputSchema: {
            type: "object",
            required: ["title", "body"],
            properties: {
                title: { type: "string" },
                body: { type: "string", description: "Report content (markdown or HTML)." },
                format: { type: "string", enum: ["markdown", "html"], description: "Defaults to markdown." },
            },
        },
        handler: async (ctx) => {
            try { return { ok: true, report: store.saveReport(ctx.input || {}) }; }
            catch (err) { throw new CanvasError("save_report_failed", err.message); }
        },
    },
];

const canvas = createCanvas({
    id: "catpilot-canvas",
    displayName: "CatPilot",
    description: "Visual command center for CatPilot: dashboard, tasks, journal, milestones, memos, learning, growth, projects, timeline, Copilot reports, settings/migration and a help guide — with charts and agent actions.",
    inputSchema: {
        type: "object",
        properties: { view: { type: "string", description: "Optional initial view: dashboard|timeline|tasks|journal|milestones|memos|learning|growth|projects|reports|settings|help" } },
    },
    actions,
    open: async (ctx) => {
        const srv = await ensureServer();
        openInstances.add(ctx.instanceId);
        const view = ctx.input?.view ? `#${encodeURIComponent(ctx.input.view)}` : "";
        return { title: "CatPilot", status: "Ready", url: `${srv.url}${view}` };
    },
    onClose: async (ctx) => {
        openInstances.delete(ctx.instanceId);
        if (openInstances.size === 0 && sharedServer) {
            const { server } = sharedServer;
            sharedServer = null;
            serverInit = null;
            await new Promise((resolve) => server.close(() => resolve()));
        }
    },
});

sessionRef = await joinSession({ canvases: [canvas] });
