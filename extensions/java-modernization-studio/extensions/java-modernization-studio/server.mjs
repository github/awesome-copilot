// server.mjs — Per-instance loopback HTTP server + action dispatch for the cockpit.
// Decoupled from the SDK: agent messaging is injected as `sendPrompt`, so this
// module can be exercised by tests without a live session.

import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { scanRepo } from "./scan.mjs";
import { renderHtml } from "./renderer.mjs";
import { buildPrompt, ACTION_LABELS } from "./prompts.mjs";
import { runDoctor } from "./doctor.mjs";
import { makeRun, runAutopilot, AUTOPILOT_MAX_STEPS } from "./autopilot.mjs";

/** Resolve which repo path an open/action context refers to, by precedence. */
export function resolveRepoPath(ctx, lastWorkingDir) {
    const fromInput =
        ctx && ctx.input && typeof ctx.input.repoPath === "string" ? ctx.input.repoPath : null;
    const fromSession =
        ctx && ctx.session && ctx.session.workingDirectory ? ctx.session.workingDirectory : null;
    // No process.cwd() fallback: that resolves to the extension's own directory,
    // not the user's repo, and would make the cockpit scan unrelated files. When
    // nothing resolves we return null and the UI shows a "repo not available"
    // state instead of plausible-but-wrong data.
    return fromInput || fromSession || lastWorkingDir || null;
}

/**
 * Scan the repo and attach the environment readiness report. Tool probing is
 * expensive (spawns several processes), so the doctor result is cached on the
 * instance record and only recomputed on first build or an explicit recheck —
 * not on every per-turn refresh. Probing only runs when `rec.runDoctor` is wired
 * (real instances), so unit tests stay fast and deterministic.
 */
export async function buildState(rec, { recheckEnv = false } = {}) {
    const state = await scanRepo(rec.repoPath);
    if (state && state.ok && typeof rec.runDoctor === "function") {
        if (recheckEnv || rec.doctor == null) {
            try {
                rec.doctor = await rec.runDoctor(state);
            } catch {
                rec.doctor = rec.doctor || null;
            }
        }
        state.doctor = rec.doctor;
    } else if (state && state.ok) {
        state.doctor = rec.doctor || null;
    }
    if (state && state.ok) state.autopilot = rec.autopilot || null;
    return state;
}

/** Write an SSE payload to every connected client of an instance. */
export function broadcast(rec, payload) {
    const data = "data: " + JSON.stringify(payload) + "\n\n";
    for (const res of rec.sseClients) {
        try {
            res.write(data);
        } catch {
            // Client disconnected uncleanly: drop it so we don't keep throwing on
            // every future broadcast (dead clients would otherwise leak in the Set).
            rec.sseClients.delete(res);
        }
    }
}

/** Re-scan the repo and push the fresh snapshot to connected clients. */
export async function pushState(rec, log, opts) {
    let state;
    try {
        state = await buildState(rec, opts);
    } catch (e) {
        if (log) log("appmod-cockpit scan failed: " + e.message, { level: "error" });
        return null;
    }
    broadcast(rec, { type: "state", state });
    return state;
}

/** Clamp a requested step budget into a sane range. */
function clampSteps(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return AUTOPILOT_MAX_STEPS;
    return Math.max(1, Math.min(50, Math.round(v)));
}

/**
 * Kick off an Autopilot run for this instance. Returns immediately; the run loop
 * streams progress to connected clients over SSE. The run promise is parked on
 * the record so it is not garbage-collected mid-flight.
 * @param {object} rec instance record
 * @param {object} payload { scope?: "phase"|"all", maxSteps?, force? }
 * @param {{ runTurn:(p:string)=>Promise<any>, log?:Function }} deps
 */
export async function startAutopilot(rec, payload, deps) {
    if (rec.autopilot && rec.autopilot.running) {
        return { ok: false, error: "Autopilot is already running." };
    }
    if (!deps || typeof deps.runTurn !== "function") {
        return { ok: false, error: "This session can't drive Autopilot." };
    }
    const p = payload || {};
    const start = await buildState(rec);
    if (!start || !start.ok) {
        return { ok: false, error: "Can't read the repo to start Autopilot." };
    }
    if (start.doctor && start.doctor.overall === "blocked" && !p.force) {
        return { ok: false, error: "Your environment isn't ready. Open Readiness and install the missing tools first." };
    }
    const scope = p.scope === "all" ? "all" : "phase";
    const startRank = start.ordering ? start.ordering.activeRank : null;
    const run = makeRun({ scope, maxSteps: clampSteps(p.maxSteps), startRank });
    rec.autopilot = run;
    broadcast(rec, { type: "autopilot", autopilot: run });

    const runDeps = {
        snapshot: () => buildState(rec),
        runTurn: deps.runTurn,
        buildStepPrompt: (step) => buildPrompt("auto_step", { title: step.title, section: step.section }, rec.repoPath),
        onProgress: (r, state) => {
            if (state) broadcast(rec, { type: "state", state });
            else broadcast(rec, { type: "autopilot", autopilot: r });
        },
        log: deps.log,
    };
    rec.autopilotPromise = runAutopilot(run, runDeps)
        .then(() => pushState(rec, deps.log))
        .catch((e) => {
            if (deps.log) deps.log("Autopilot run failed: " + e.message, { level: "error" });
        });
    return { ok: true, message: "Autopilot started", autopilot: run };
}

/**
 * Handle a cockpit action.
 * @param {object} rec instance record ({ repoPath, sseClients, ... })
 * @param {string} kind action kind
 * @param {object} payload action payload
 * @param {{ sendPrompt:(p:string)=>Promise<void>, runTurn?:Function, log?:Function }} deps
 */
export async function dispatchAction(rec, kind, payload, deps) {
    if (kind === "refresh") {
        const state = await pushState(rec, deps && deps.log);
        return { ok: true, message: "Refreshed", state };
    }
    if (kind === "recheck_env") {
        const state = await pushState(rec, deps && deps.log, { recheckEnv: true });
        return { ok: true, message: "Re-checked environment", state };
    }
    if (kind === "autopilot_start") {
        return await startAutopilot(rec, payload, deps);
    }
    if (kind === "autopilot_stop") {
        if (rec.autopilot && rec.autopilot.running) {
            rec.autopilot.cancelled = true;
            broadcast(rec, { type: "autopilot", autopilot: rec.autopilot });
            return { ok: true, message: "Stopping after the current step finishes…" };
        }
        return { ok: false, error: "Autopilot isn't running." };
    }
    if (kind === "autopilot_dismiss") {
        if (rec.autopilot && !rec.autopilot.running) {
            rec.autopilot = null;
            await pushState(rec, deps && deps.log);
        }
        return { ok: true, message: "Dismissed" };
    }
    const prompt = buildPrompt(kind, payload, rec.repoPath);
    if (!prompt) return { ok: false, error: "Unknown action: " + kind };
    if (!deps || typeof deps.sendPrompt !== "function") {
        return { ok: false, error: "Session not ready" };
    }
    const label = ACTION_LABELS[kind] || kind;
    try {
        await deps.sendPrompt(prompt);
        if (deps.log) deps.log("Java Modernization Studio → " + label, { ephemeral: true });
        return { ok: true, label, message: "Sent to the agent: " + label, prompt };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

// Cap the request body the /action endpoint will buffer. Actions carry tiny JSON
// payloads; anything large is a bug or abuse, so we reject rather than buffer it.
const MAX_BODY_BYTES = 256 * 1024;

function readBody(req, max = MAX_BODY_BYTES) {
    return new Promise((resolve) => {
        let data = "";
        let size = 0;
        let done = false;
        req.on("data", (c) => {
            if (done) return;
            size += c.length;
            if (size > max) {
                done = true;
                resolve({ body: "", tooLarge: true });
                if (typeof req.destroy === "function") req.destroy();
                return;
            }
            data += c;
        });
        req.on("end", () => {
            if (!done) {
                done = true;
                resolve({ body: data, tooLarge: false });
            }
        });
        req.on("error", () => {
            if (!done) {
                done = true;
                resolve({ body: "", tooLarge: false });
            }
        });
    });
}

/**
 * Build the request handler for an instance. Exposed for tests so routes can be
 * exercised without binding a socket.
 */
export function makeHandler(rec, { instanceId, initialTab, sendPrompt, runTurn, log }) {
    return async function handler(req, res) {
        const url = new URL(req.url, "http://127.0.0.1");
        try {
            // Per-instance secret: real instances (createInstanceServer) mint a token
            // that the host embeds in the iframe URL. Reject any loopback request that
            // doesn't present it, so other local processes can't read repo state or
            // dispatch agent actions just by guessing the random port. When no token is
            // set (direct makeHandler unit tests) the guard is a no-op.
            if (rec.token) {
                const provided = url.searchParams.get("token");
                if (provided !== rec.token) {
                    res.statusCode = 403;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ ok: false, error: "forbidden" }));
                    return;
                }
            }
            if (req.method === "GET" && url.pathname === "/") {
                res.setHeader("Content-Type", "text/html; charset=utf-8");
                res.end(renderHtml({ instanceId, initialTab, token: rec.token }));
                return;
            }
            if (req.method === "GET" && url.pathname === "/state") {
                const state = await buildState(rec);
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(state));
                return;
            }
            if (req.method === "GET" && url.pathname === "/events") {
                res.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                });
                res.write("retry: 3000\n\n");
                rec.sseClients.add(res);
                req.on("close", () => rec.sseClients.delete(res));
                return;
            }
            if (req.method === "POST" && url.pathname === "/action") {
                const { body, tooLarge } = await readBody(req);
                if (tooLarge) {
                    res.statusCode = 413;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ ok: false, error: "request body too large" }));
                    return;
                }
                let parsed;
                try {
                    parsed = JSON.parse(body || "{}");
                } catch {
                    res.statusCode = 400;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ ok: false, error: "invalid JSON body" }));
                    return;
                }
                if (!parsed || typeof parsed.kind !== "string" || !parsed.kind) {
                    res.statusCode = 400;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ ok: false, error: "missing or invalid 'kind'" }));
                    return;
                }
                const result = await dispatchAction(rec, parsed.kind, parsed.payload, { sendPrompt, runTurn, log });
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(result));
                return;
            }
            res.statusCode = 404;
            res.end("not found");
        } catch (e) {
            if (!res.headersSent) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
            }
            res.end(JSON.stringify({ ok: false, error: e.message }));
        }
    };
}

/**
 * Start a loopback server for one canvas instance.
 * @returns {Promise<object>} rec with { server, url, repoPath, sseClients }
 */
export async function createInstanceServer({ instanceId, repoPath, initialTab, sendPrompt, runTurn, log, runDoctor: runDoctorImpl }) {
    const rec = { server: null, url: "", repoPath, sseClients: new Set(), doctor: null, autopilot: null, token: randomBytes(16).toString("hex") };
    // Wire the environment doctor (injectable for tests); real instances probe the
    // local toolchain, cached and only recomputed on explicit recheck.
    rec.runDoctor = typeof runDoctorImpl === "function" ? runDoctorImpl : (scan) => runDoctor(scan, {});
    const handler = makeHandler(rec, { instanceId, initialTab, sendPrompt, runTurn, log });
    const server = createServer((req, res) => {
        // The handler is async: if it rejects, surface a 500 and log it rather than
        // letting it become an unhandled rejection that can crash the extension.
        handler(req, res).catch((err) => {
            if (log) log("Java Modernization Studio server error: " + (err && err.message ? err.message : err), { level: "error" });
            try {
                if (!res.headersSent) {
                    res.statusCode = 500;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ ok: false, error: "internal error" }));
                } else {
                    res.end();
                }
            } catch {
                /* response already torn down */
            }
        });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    rec.server = server;
    rec.url = "http://127.0.0.1:" + port + "/?token=" + rec.token;
    return rec;
}
