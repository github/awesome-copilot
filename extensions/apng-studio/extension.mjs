// Extension: apng-studio
// Interactive studio to create Animated PNG (APNG) files from frames.
//
// Architecture:
//   • Server-owned state: frames live on disk under artifacts/<projectId>/ so
//     they survive extension reloads and are shared between the interactive
//     iframe UI and the agent-callable actions.
//   • One loopback HTTP server per open canvas instance serves the renderer
//     (web/), JSON state, per-frame PNGs, a live `/preview.png`, and mutation
//     endpoints. Server-Sent Events push "changed" so every open panel and the
//     preview stay in sync.
//   • APNG assembly + a small RGBA→PNG encoder live in ./apng.mjs.

import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { join, extname } from "node:path";
import { promises as fs } from "node:fs";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { networkInterfaces } from "node:os";

import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";
import { assembleApng, solidColorPng, encodeRgbaPng } from "./apng.mjs";
import { encodeQr } from "./qr.mjs";

const EXT_DIR = fileURLToPath(new URL(".", import.meta.url));
const WEB_DIR = join(EXT_DIR, "web");
const ARTIFACTS_DIR = join(EXT_DIR, "artifacts");
const EXPORTS_DIR = join(ARTIFACTS_DIR, "exports");
const DEFAULT_PROJECT = "default";

let session;

// ---- helpers ------------------------------------------------------------
const clampInt = (n, lo, hi, dflt) => {
    const v = Math.round(Number(n));
    return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : dflt;
};
const clampDim = (n) => clampInt(n, 1, 2048, 256);
const clampLoops = (n) => clampInt(n, 0, 65535, 0);
const clampDen = (n) => clampInt(n, 1, 65535, 1000);
const clampDispose = (n, dflt = 0) => clampInt(n, 0, 2, dflt);
const clampBlend = (n, dflt = 0) => clampInt(n, 0, 1, dflt);
const frameMs = (f) => Math.round((f.delayNum / f.delayDen) * 1000);

// Normalize a stored/incoming frame record to the full field set, migrating the
// legacy { id, delayMs } shape to explicit delay numerator/denominator plus the
// per-frame compositing ops.
function normalizeFrame(f) {
    const num = f.delayNum != null ? f.delayNum : f.delayMs;
    return {
        id: String(f.id),
        delayNum: clampInt(num, 0, 65535, 100),
        delayDen: clampDen(f.delayDen),
        disposeOp: clampDispose(f.disposeOp),
        blendOp: clampBlend(f.blendOp),
    };
}
const sanitizeId = (s) => String(s || DEFAULT_PROJECT).replace(/[^\w.-]+/g, "_").slice(0, 64) || DEFAULT_PROJECT;
const sanitizeName = (s) => String(s || "animation").replace(/[^\w.-]+/g, "_").slice(0, 80) || "animation";
const ensureDir = (d) => fs.mkdir(d, { recursive: true });

function log(message, level = "info") {
    try {
        session?.log(message, { level });
    } catch {
        /* logging is best-effort */
    }
}

// ---- project store (disk-backed, shared across instances) ---------------
const projects = new Map(); // projectId -> meta
const projectDir = (id) => join(ARTIFACTS_DIR, sanitizeId(id));
const framePath = (id, fid) => join(projectDir(id), `frame-${sanitizeId(fid)}.png`);

async function loadProject(id) {
    const pid = sanitizeId(id);
    if (projects.has(pid)) return projects.get(pid);
    let meta;
    try {
        meta = JSON.parse(await fs.readFile(join(projectDir(pid), "project.json"), "utf8"));
    } catch {
        meta = null;
    }
    if (!meta || typeof meta !== "object") {
        meta = { id: pid, name: pid, width: 256, height: 256, loops: 0, hiddenFirst: false, counter: 0, frames: [] };
    }
    meta.id = pid;
    meta.frames = (Array.isArray(meta.frames) ? meta.frames : []).map(normalizeFrame);
    meta.counter = Number.isFinite(meta.counter) ? meta.counter : meta.frames.length;
    meta.width = clampDim(meta.width);
    meta.height = clampDim(meta.height);
    meta.loops = clampLoops(meta.loops);
    meta.hiddenFirst = !!meta.hiddenFirst;
    projects.set(pid, meta);
    return meta;
}

async function saveProject(meta) {
    await ensureDir(projectDir(meta.id));
    await fs.writeFile(join(projectDir(meta.id), "project.json"), JSON.stringify(meta, null, 2));
}

function publicState(meta) {
    return {
        id: meta.id,
        name: meta.name,
        width: meta.width,
        height: meta.height,
        loops: meta.loops,
        hiddenFirst: meta.hiddenFirst,
        frames: meta.frames.map((f) => ({
            id: f.id,
            delayNum: f.delayNum,
            delayDen: f.delayDen,
            delayMs: frameMs(f),
            disposeOp: f.disposeOp,
            blendOp: f.blendOp,
        })),
    };
}

// ---- mutations ----------------------------------------------------------
async function addFrameBuffer(id, buffer, opts = {}) {
    const meta = await loadProject(id);
    const fid = String(meta.counter++);
    await ensureDir(projectDir(meta.id));
    await fs.writeFile(framePath(meta.id, fid), buffer);
    meta.frames.push(
        normalizeFrame({
            id: fid,
            delayNum: opts.delayNum != null ? opts.delayNum : opts.delayMs != null ? opts.delayMs : 120,
            delayDen: opts.delayDen,
            disposeOp: opts.disposeOp,
            blendOp: opts.blendOp,
        })
    );
    await saveProject(meta);
    broadcast(meta.id);
    return fid;
}

async function moveFrame(id, fid, delta) {
    const meta = await loadProject(id);
    const i = meta.frames.findIndex((f) => f.id === String(fid));
    const j = i + Math.sign(delta);
    if (i < 0 || j < 0 || j >= meta.frames.length) return;
    [meta.frames[i], meta.frames[j]] = [meta.frames[j], meta.frames[i]];
    await saveProject(meta);
    broadcast(meta.id);
}

async function deleteFrame(id, fid) {
    const meta = await loadProject(id);
    const i = meta.frames.findIndex((f) => f.id === String(fid));
    if (i < 0) return;
    meta.frames.splice(i, 1);
    await fs.rm(framePath(meta.id, fid), { force: true });
    await saveProject(meta);
    broadcast(meta.id);
}

async function duplicateFrame(id, fid) {
    const meta = await loadProject(id);
    const i = meta.frames.findIndex((f) => f.id === String(fid));
    if (i < 0) return;
    const nid = String(meta.counter++);
    await fs.copyFile(framePath(meta.id, fid), framePath(meta.id, nid));
    meta.frames.splice(i + 1, 0, normalizeFrame({ ...meta.frames[i], id: nid }));
    await saveProject(meta);
    broadcast(meta.id);
}

// Apply a partial set of frame properties. `delayMs`/`fps` are conveniences that
// resolve to delayNum/delayDen. Only provided fields change.
function applyFrameProps(f, props) {
    if (props.fps != null) {
        f.delayNum = 1;
        f.delayDen = clampInt(props.fps, 1, 65535, f.delayDen);
    }
    if (props.delayMs != null) {
        f.delayNum = clampInt(props.delayMs, 0, 65535, f.delayNum);
        f.delayDen = 1000;
    }
    if (props.delayNum != null) f.delayNum = clampInt(props.delayNum, 0, 65535, f.delayNum);
    if (props.delayDen != null) f.delayDen = clampDen(props.delayDen);
    if (props.disposeOp != null) f.disposeOp = clampDispose(props.disposeOp, f.disposeOp);
    if (props.blendOp != null) f.blendOp = clampBlend(props.blendOp, f.blendOp);
}

async function setFrameProps(id, fid, props) {
    const meta = await loadProject(id);
    const f = meta.frames.find((x) => x.id === String(fid));
    if (!f) return;
    applyFrameProps(f, props || {});
    await saveProject(meta);
    broadcast(meta.id);
}

async function setFramePropsAll(id, props) {
    const meta = await loadProject(id);
    for (const f of meta.frames) applyFrameProps(f, props || {});
    await saveProject(meta);
    broadcast(meta.id);
}

async function clearFrames(id) {
    const meta = await loadProject(id);
    await Promise.all(meta.frames.map((f) => fs.rm(framePath(meta.id, f.id), { force: true })));
    meta.frames = [];
    await saveProject(meta);
    broadcast(meta.id);
}

async function applySettings(id, { width, height, loops, name, hiddenFirst }) {
    const meta = await loadProject(id);
    if (meta.frames.length === 0) {
        if (width != null) meta.width = clampDim(width);
        if (height != null) meta.height = clampDim(height);
    }
    if (loops != null) meta.loops = clampLoops(loops);
    if (typeof hiddenFirst === "boolean") meta.hiddenFirst = hiddenFirst;
    if (typeof name === "string" && name.trim()) meta.name = name.trim().slice(0, 80);
    await saveProject(meta);
    broadcast(meta.id);
    return meta;
}

async function assemble(id) {
    const meta = await loadProject(id);
    if (meta.frames.length === 0) return null;
    const frames = [];
    for (const f of meta.frames) {
        frames.push({
            png: await fs.readFile(framePath(meta.id, f.id)),
            delayNum: f.delayNum,
            delayDen: f.delayDen,
            disposeOp: f.disposeOp,
            blendOp: f.blendOp,
        });
    }
    return assembleApng(frames, { loops: meta.loops, hiddenFirst: meta.hiddenFirst });
}

async function exportApng(id, filename) {
    const bytes = await assemble(id);
    if (!bytes) throw new CanvasError("no_frames", "Nothing to export — add at least one frame first.");
    const meta = await loadProject(id);
    await ensureDir(EXPORTS_DIR);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const base = filename ? sanitizeName(filename.replace(/\.(a?png)$/i, "")) : `${sanitizeName(meta.name)}-${stamp}`;
    const outPath = join(EXPORTS_DIR, `${base}.png`);
    await fs.writeFile(outPath, bytes);
    return { path: outPath, name: `${base}.png`, bytes: bytes.length };
}

// ---- colors (for agent-generated frames) --------------------------------
const NAMED_COLORS = {
    black: "000000", white: "ffffff", red: "ff0000", green: "00c853", lime: "00ff00",
    blue: "2962ff", yellow: "ffeb3b", cyan: "00e5ff", magenta: "ff00ff", orange: "ff9100",
    purple: "9c27b0", pink: "ff4081", gray: "808080", grey: "808080", teal: "009688",
    transparent: "00000000",
};
function parseColor(input) {
    if (input && typeof input === "object") {
        const c = (v) => clampInt(v, 0, 255, 0);
        return { r: c(input.r), g: c(input.g), b: c(input.b), a: input.a == null ? 255 : c(input.a) };
    }
    let s = String(input ?? "").trim().toLowerCase();
    if (NAMED_COLORS[s]) s = NAMED_COLORS[s];
    let hex = s.replace(/^#/, "");
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/.test(hex)) {
        throw new CanvasError("bad_color", `Invalid color: ${input}. Use a hex value (#ff8800) or a name like "blue".`);
    }
    return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255,
    };
}

// ---- HTTP server + SSE --------------------------------------------------
const servers = new Map(); // instanceId -> { server, url, projectId }
const sseClients = new Map(); // projectId -> Set<res>

// Resolve which project an action targets: an explicit projectId wins, else the
// project bound to the invoking canvas instance, else the default project.
function resolveProjectId(ctx) {
    if (ctx?.input?.projectId) return sanitizeId(ctx.input.projectId);
    const entry = servers.get(ctx?.instanceId);
    if (entry) return entry.projectId;
    return DEFAULT_PROJECT;
}

function broadcast(projectId) {
    const set = sseClients.get(sanitizeId(projectId));
    if (!set) return;
    for (const res of set) {
        try {
            res.write(`data: changed\n\n`);
        } catch {
            set.delete(res);
        }
    }
}

const CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
};

function send(res, status, type, body, extraHeaders) {
    res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store", ...(extraHeaders || {}) });
    res.end(body);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
    });
}
async function readJson(req) {
    const buf = await readBody(req);
    if (!buf.length) return {};
    try {
        return JSON.parse(buf.toString("utf8"));
    } catch {
        return {};
    }
}

async function handleRequest(projectId, req, res) {
    const url = new URL(req.url, "http://localhost");
    const path = url.pathname;
    const method = req.method || "GET";

    try {
        // Static renderer assets.
        if (method === "GET" && (path === "/" || path === "/index.html")) {
            return send(res, 200, CONTENT_TYPES[".html"], await fs.readFile(join(WEB_DIR, "index.html")));
        }
        if (method === "GET" && (path === "/app.js" || path === "/styles.css")) {
            const file = path.slice(1);
            return send(res, 200, CONTENT_TYPES[extname(file)] || "text/plain", await fs.readFile(join(WEB_DIR, file)));
        }
        if (path === "/favicon.ico") return send(res, 204, "text/plain", "");

        // State.
        if (method === "GET" && path === "/state") {
            const meta = await loadProject(projectId);
            return send(res, 200, "application/json", JSON.stringify(publicState(meta)));
        }

        // Server-Sent Events.
        if (method === "GET" && path === "/events") {
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-store",
                Connection: "keep-alive",
            });
            res.write(": connected\n\n");
            const pid = sanitizeId(projectId);
            if (!sseClients.has(pid)) sseClients.set(pid, new Set());
            sseClients.get(pid).add(res);
            req.on("close", () => sseClients.get(pid)?.delete(res));
            return;
        }

        // A single frame PNG (for thumbnails / onion skin / draw base).
        if (method === "GET" && path === "/frame") {
            const fid = url.searchParams.get("id");
            try {
                const buf = await fs.readFile(framePath(projectId, fid));
                return send(res, 200, "image/png", buf);
            } catch {
                return send(res, 404, "text/plain", "frame not found");
            }
        }

        // Live-assembled APNG preview (served as image/png — APNG is byte-compatible
        // with PNG, so browsers animate it and default viewers still open it).
        if (method === "GET" && path === "/preview.png") {
            const bytes = await assemble(projectId);
            if (!bytes) return send(res, 204, "image/png", "");
            return send(res, 200, "image/png", Buffer.from(bytes));
        }

        // Add a frame (raw PNG body).
        if (method === "POST" && path === "/frames") {
            const buf = await readBody(req);
            if (!buf.length) return send(res, 400, "text/plain", "empty body");
            const delayMs = url.searchParams.get("delayMs");
            const id = await addFrameBuffer(projectId, buf, { delayMs });
            return send(res, 200, "application/json", JSON.stringify({ id }));
        }

        // JSON mutation endpoints.
        if (method === "POST") {
            const body = await readJson(req);
            switch (path) {
                case "/frames/move":
                    await moveFrame(projectId, body.id, body.delta);
                    return send(res, 200, "application/json", "{}");
                case "/frames/delete":
                    await deleteFrame(projectId, body.id);
                    return send(res, 200, "application/json", "{}");
                case "/frames/duplicate":
                    await duplicateFrame(projectId, body.id);
                    return send(res, 200, "application/json", "{}");
                case "/frames/props":
                    await setFrameProps(projectId, body.id, body);
                    return send(res, 200, "application/json", "{}");
                case "/frames/props-all":
                    await setFramePropsAll(projectId, body);
                    return send(res, 200, "application/json", "{}");
                case "/frames/clear":
                    await clearFrames(projectId);
                    return send(res, 200, "application/json", "{}");
                case "/settings":
                    await applySettings(projectId, body);
                    return send(res, 200, "application/json", "{}");
                case "/export": {
                    const out = await exportApng(projectId, body.filename);
                    log(`APNG exported: ${out.path}`);
                    return send(res, 200, "application/json", JSON.stringify(out));
                }
            }
        }

        // ---- "Send to phone" control plane (loopback only) --------------
        if (method === "POST" && path === "/share/start") {
            try {
                const info = await startShare(projectId);
                return send(res, 200, "application/json", JSON.stringify(info));
            } catch (err) {
                const status = err instanceof CanvasError ? 400 : 500;
                return send(res, status, "text/plain", err.message || "Could not start sharing.");
            }
        }
        if (method === "POST" && path === "/share/stop") {
            stopShare();
            return send(res, 200, "application/json", "{}");
        }
        if (method === "GET" && path === "/share/qr.png") {
            if (!share || Date.now() > share.expiresAt) {
                return send(res, 409, "text/plain", "no active share");
            }
            return send(res, 200, "image/png", Buffer.from(renderQrPng(shareLandingUrl())));
        }

        return send(res, 404, "text/plain", "not found");
    } catch (err) {
        return send(res, 500, "text/plain", String(err && err.message ? err.message : err));
    }
}

async function startServer(entry) {
    const server = createServer((req, res) => handleRequest(entry.projectId, req, res));
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    entry.server = server;
    entry.url = `http://127.0.0.1:${port}/`;
    return entry;
}

// ---- "Send to phone" share server ---------------------------------------
// A separate, read-only HTTP server bound to the LAN so a phone can fetch the
// live animation. It exposes ONLY a landing page and the preview image, gated
// by a short-lived random token, and it shuts itself down when the token
// expires. Mutation endpoints stay on the loopback server and are never
// reachable from the network.
const SHARE_TTL_MS = 10 * 60 * 1000;
let share = null; // { server, ip, port, token, projectId, expiresAt, timer }

// Prefer an RFC1918 private address; skip CGNAT/VPN ranges (e.g. Tailscale
// 100.64/10) unless nothing else is available.
function lanIPv4() {
    const candidates = [];
    for (const addrs of Object.values(networkInterfaces())) {
        for (const a of addrs || []) {
            if (a.family === "IPv4" && !a.internal) candidates.push(a.address);
        }
    }
    const isPrivate = (ip) =>
        /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
    return candidates.find(isPrivate) || candidates[0] || null;
}

function shareLandingUrl() {
    return `http://${share.ip}:${share.port}/s?t=${share.token}`;
}

function tokenValid(token) {
    if (!share || typeof token !== "string" || token.length !== share.token.length) return false;
    try {
        return timingSafeEqual(Buffer.from(token), Buffer.from(share.token));
    } catch {
        return false;
    }
}

function shareLandingHtml(token) {
    const src = `/s/preview.png?t=${encodeURIComponent(token)}`;
    // Self-contained page: no external assets, checkerboard behind the image.
    return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>APNG Studio</title>
<style>
:root { color-scheme: light dark; }
body { margin:0; min-height:100vh; display:flex; flex-direction:column; align-items:center;
  justify-content:center; gap:20px; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  background:#0d1117; color:#e6edf3; padding:24px; box-sizing:border-box; }
h1 { font-size:17px; font-weight:600; margin:0; }
.frame { padding:14px; border-radius:12px;
  background-color:#fff;
  background-image:linear-gradient(45deg,#d9dbe0 25%,transparent 25%),linear-gradient(-45deg,#d9dbe0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d9dbe0 75%),linear-gradient(-45deg,transparent 75%,#d9dbe0 75%);
  background-size:16px 16px; background-position:0 0,0 8px,8px -8px,-8px 0; }
img { display:block; max-width:min(88vw,480px); height:auto; image-rendering:auto; }
a { color:#4493f8; font-size:14px; text-decoration:none; }
p { margin:0; font-size:13px; opacity:.7; }
</style></head><body>
<h1>APNG Studio</h1>
<div class="frame"><img src="${src}" alt="Animated PNG preview" /></div>
<a href="${src}" download="animation.png">Save to your device</a>
<p>Tap and hold the image to save it. This link expires shortly.</p>
</body></html>`;
}

async function shareRequest(req, res) {
    try {
        const url = new URL(req.url, "http://localhost");
        const token = url.searchParams.get("t") || "";
        if (!tokenValid(token)) return send(res, 403, "text/plain", "Invalid or expired link.");
        if (Date.now() > share.expiresAt) {
            stopShare();
            return send(res, 410, "text/plain", "This link has expired.");
        }
        if (req.method === "GET" && (url.pathname === "/s" || url.pathname === "/s/")) {
            return send(res, 200, CONTENT_TYPES[".html"], shareLandingHtml(token));
        }
        if (req.method === "GET" && url.pathname === "/s/preview.png") {
            const bytes = await assemble(share.projectId);
            if (!bytes) return send(res, 204, "image/png", "");
            return send(res, 200, "image/png", Buffer.from(bytes));
        }
        return send(res, 404, "text/plain", "not found");
    } catch (err) {
        return send(res, 500, "text/plain", String(err && err.message ? err.message : err));
    }
}

async function startShare(projectId) {
    const ip = lanIPv4();
    if (!ip) {
        throw new CanvasError(
            "no_network",
            "No local network address found. Connect to Wi-Fi to share to your phone."
        );
    }
    if (!share) {
        const server = createServer(shareRequest);
        await new Promise((resolve, reject) => {
            server.once("error", reject);
            server.listen(0, "0.0.0.0", resolve);
        });
        share = { server, port: server.address().port };
    }
    share.ip = ip;
    share.projectId = projectId;
    share.token = randomBytes(16).toString("hex");
    share.expiresAt = Date.now() + SHARE_TTL_MS;
    if (share.timer) clearTimeout(share.timer);
    share.timer = setTimeout(stopShare, SHARE_TTL_MS);
    share.timer.unref?.();
    return { url: shareLandingUrl(), expiresAt: share.expiresAt, ttlMs: SHARE_TTL_MS };
}

function stopShare() {
    if (!share) return;
    if (share.timer) clearTimeout(share.timer);
    const server = share.server;
    share = null;
    try {
        server.close();
    } catch {
        /* already closing */
    }
}

// Render a QR matrix into a scannable PNG using the RGBA->PNG encoder.
function renderQrPng(text, scale = 8, quiet = 4) {
    const { matrix, size } = encodeQr(text);
    const dim = (size + quiet * 2) * scale;
    const rgba = new Uint8Array(dim * dim * 4).fill(255);
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (!matrix[r][c]) continue;
            for (let y = 0; y < scale; y++) {
                for (let x = 0; x < scale; x++) {
                    const o = (((r + quiet) * scale + y) * dim + ((c + quiet) * scale + x)) * 4;
                    rgba[o] = 0;
                    rgba[o + 1] = 0;
                    rgba[o + 2] = 0;
                    rgba[o + 3] = 255;
                }
            }
        }
    }
    return encodeRgbaPng(dim, dim, rgba);
}

// ---- canvas declaration -------------------------------------------------
const openInputSchema = {
    type: "object",
    properties: {
        projectId: { type: "string", description: "Identifier for the animation project (defaults to 'default')." },
        name: { type: "string", description: "Optional display name for the animation." },
    },
    additionalProperties: false,
};

session = await joinSession({
    canvases: [
        createCanvas({
            id: "apng-studio",
            displayName: "APNG Studio",
            description:
                "Build an Animated PNG (APNG) from frames: upload or draw frames, set per-frame delays and loop count, preview live, and export an animated .png file.",
            inputSchema: openInputSchema,
            actions: [
                {
                    name: "get_state",
                    description: "Return the current project's dimensions, loop count, frame count and per-frame delays.",
                    inputSchema: {
                        type: "object",
                        properties: { projectId: { type: "string" } },
                        additionalProperties: false,
                    },
                    handler: async (ctx) => {
                        const meta = await loadProject(resolveProjectId(ctx));
                        const animated = meta.hiddenFirst ? meta.frames.slice(1) : meta.frames;
                        const totalMs = animated.reduce((a, f) => a + frameMs(f), 0);
                        return {
                            ...publicState(meta),
                            frameCount: meta.frames.length,
                            totalDurationMs: totalMs,
                            exportsDir: EXPORTS_DIR,
                        };
                    },
                },
                {
                    name: "set_settings",
                    description:
                        "Update project settings. width/height only apply when there are no frames yet. loops: 0 = infinite. hiddenFirst: make frame 1 a static fallback that is not part of the animation.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            projectId: { type: "string" },
                            width: { type: "integer", minimum: 1, maximum: 2048 },
                            height: { type: "integer", minimum: 1, maximum: 2048 },
                            loops: { type: "integer", minimum: 0, maximum: 65535 },
                            hiddenFirst: { type: "boolean", description: "Frame 1 becomes a static, non-animated fallback image." },
                            name: { type: "string" },
                        },
                        additionalProperties: false,
                    },
                    handler: async (ctx) => {
                        const { projectId, ...settings } = ctx.input || {};
                        const meta = await applySettings(resolveProjectId(ctx), settings);
                        return publicState(meta);
                    },
                },
                {
                    name: "add_color_frame",
                    description:
                        "Append a solid-color frame at the project's dimensions. Useful for building simple animations programmatically. Color accepts a hex value (#ff8800) or a name like 'blue'.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            projectId: { type: "string" },
                            color: { type: "string", description: "Hex (#rrggbb / #rrggbbaa) or a color name." },
                            delayMs: { type: "integer", minimum: 0, maximum: 65535, description: "Frame delay in ms." },
                            delayNum: { type: "integer", minimum: 0, maximum: 65535, description: "Delay numerator (overrides delayMs)." },
                            delayDen: { type: "integer", minimum: 1, maximum: 65535, description: "Delay denominator (default 1000)." },
                            disposeOp: { type: "integer", minimum: 0, maximum: 2, description: "0=None, 1=Background, 2=Previous." },
                            blendOp: { type: "integer", minimum: 0, maximum: 1, description: "0=Source, 1=Over." },
                        },
                        required: ["color"],
                        additionalProperties: false,
                    },
                    handler: async (ctx) => {
                        const id = resolveProjectId(ctx);
                        const meta = await loadProject(id);
                        const color = parseColor(ctx.input?.color);
                        const png = solidColorPng(meta.width, meta.height, color);
                        const { color: _c, projectId: _p, ...opts } = ctx.input || {};
                        if (opts.delayMs == null && opts.delayNum == null) opts.delayMs = 120;
                        const fid = await addFrameBuffer(id, png, opts);
                        return { frameId: fid, frameCount: meta.frames.length };
                    },
                },
                {
                    name: "set_frame",
                    description:
                        "Change timing/compositing for one frame (by frameId) or every frame (all: true). Timing: delayMs, or fps (exact frame rate), or delayNum/delayDen. Compositing: disposeOp (0=None,1=Background,2=Previous), blendOp (0=Source,1=Over).",
                    inputSchema: {
                        type: "object",
                        properties: {
                            projectId: { type: "string" },
                            frameId: { type: "string", description: "Target frame id. Omit and set all:true to apply to every frame." },
                            all: { type: "boolean", description: "Apply to all frames instead of a single frameId." },
                            delayMs: { type: "integer", minimum: 0, maximum: 65535 },
                            fps: { type: "integer", minimum: 1, maximum: 1000, description: "Exact frame rate; sets delay to 1/fps s." },
                            delayNum: { type: "integer", minimum: 0, maximum: 65535 },
                            delayDen: { type: "integer", minimum: 1, maximum: 65535 },
                            disposeOp: { type: "integer", minimum: 0, maximum: 2 },
                            blendOp: { type: "integer", minimum: 0, maximum: 1 },
                        },
                        additionalProperties: false,
                    },
                    handler: async (ctx) => {
                        const id = resolveProjectId(ctx);
                        const { projectId: _p, frameId, all, ...props } = ctx.input || {};
                        if (all) {
                            await setFramePropsAll(id, props);
                        } else if (frameId != null) {
                            await setFrameProps(id, frameId, props);
                        } else {
                            throw new CanvasError("no_target", "Provide a frameId, or set all:true to apply to every frame.");
                        }
                        return publicState(await loadProject(id));
                    },
                },
                {
                    name: "clear_frames",
                    description: "Remove all frames from the project.",
                    inputSchema: {
                        type: "object",
                        properties: { projectId: { type: "string" } },
                        additionalProperties: false,
                    },
                    handler: async (ctx) => {
                        await clearFrames(resolveProjectId(ctx));
                        return { ok: true };
                    },
                },
                {
                    name: "export",
                    description: "Assemble the frames into an animated .png (APNG) file on disk and return its absolute path.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            projectId: { type: "string" },
                            filename: { type: "string", description: "Optional output filename (without directory)." },
                        },
                        additionalProperties: false,
                    },
                    handler: async (ctx) => {
                        return exportApng(resolveProjectId(ctx), ctx.input?.filename);
                    },
                },
            ],
            open: async (ctx) => {
                const projectId = sanitizeId(ctx.input?.projectId ?? DEFAULT_PROJECT);
                const meta = await loadProject(projectId);
                if (ctx.input?.name && typeof ctx.input.name === "string") {
                    meta.name = ctx.input.name.trim().slice(0, 80);
                    await saveProject(meta);
                }
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = { instanceId: ctx.instanceId, projectId };
                    servers.set(ctx.instanceId, entry);
                    await startServer(entry);
                } else {
                    // Re-open: repoint the existing server at the requested
                    // project in place so the loopback URL stays stable.
                    entry.projectId = projectId;
                }
                return {
                    title: `APNG Studio — ${meta.name}`,
                    url: entry.url,
                    status: `${meta.frames.length} frame${meta.frames.length === 1 ? "" : "s"}`,
                };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    // Tear down any LAN share that belongs to this project so the
                    // network-facing server never outlives its canvas.
                    if (share && share.projectId === entry.projectId) stopShare();
                    servers.delete(ctx.instanceId);
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
            },
        }),
    ],
});

await ensureDir(EXPORTS_DIR);
log("APNG Studio ready.");
