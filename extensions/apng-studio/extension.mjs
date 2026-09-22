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
import { randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { networkInterfaces } from "node:os";

import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";
import { assembleApng, solidColorPng, encodeRgbaPng } from "./apng.mjs";
import { encodeQr } from "./qr.mjs";

const EXT_DIR = fileURLToPath(new URL(".", import.meta.url));
const WEB_DIR = join(EXT_DIR, "web");
const ARTIFACTS_DIR = join(EXT_DIR, "artifacts");
const EXPORTS_DIR = join(ARTIFACTS_DIR, "exports");
const DEFAULT_PROJECT = "default";
const MAX_FRAMES = 600; // count cap so a project can't accumulate unbounded frames
const MAX_TOTAL_BYTES = 256 << 20; // 256 MiB of encoded frames — bounds assembly memory

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
const usedBytes = (meta) => meta.frames.reduce((a, f) => a + (f.bytes || 0), 0);

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
        bytes: Number.isFinite(f.bytes) && f.bytes > 0 ? Math.floor(f.bytes) : 0,
    };
}
// Map a project id to a filesystem-safe key. Ids that are already safe (including
// the legacy "default" and GUID-style ids) are used verbatim, so directories stay
// stable across restarts/upgrades and re-sanitizing is a no-op. Only ids that
// aren't filesystem-safe get a hash suffix — keyed on the raw id — so two distinct
// unsafe ids ("foo/bar" vs "foo?bar") can never share a directory, lock, or entry.
const SAFE_ID = /^[\w.-]{1,64}$/;
const sanitizeId = (s) => {
    const raw = String(s ?? "") || DEFAULT_PROJECT;
    if (raw !== "." && raw !== ".." && SAFE_ID.test(raw)) return raw;
    const prefix = raw.replace(/[^\w.-]+/g, "_").slice(0, 40) || "p";
    return `${prefix}-${createHash("sha256").update(raw).digest("hex").slice(0, 12)}`;
};
// Frame ids are internal monotonic counters, so a lightweight path-safe cleaner is
// enough (and keeps frame filenames readable).
const sanitizeFrameId = (s) => String(s).replace(/[^\w.-]+/g, "_").slice(0, 64) || "0";
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
const loadingProjects = new Map(); // projectId -> in-flight load Promise
const projectLocks = new Map(); // projectId -> tail of the mutation queue
const projectDir = (id) => join(ARTIFACTS_DIR, sanitizeId(id));
const framePath = (id, fid) => join(projectDir(id), `frame-${sanitizeFrameId(fid)}.png`);

// Serialize the full load–mutate–save cycle for a project so concurrent panels
// and agent actions cannot interleave (e.g. allocate the same counter value or
// persist stale snapshots out of order).
function withProjectLock(id, fn) {
    const pid = sanitizeId(id);
    const prev = projectLocks.get(pid) || Promise.resolve();
    const next = prev.then(() => fn());
    // Keep the chain going even if this task rejects; don't leak the rejection.
    projectLocks.set(pid, next.then(() => {}, () => {}));
    return next;
}

async function loadProject(id) {
    const pid = sanitizeId(id);
    if (projects.has(pid)) return projects.get(pid);
    // Dedupe concurrent first-time loads so every caller shares one meta object.
    if (loadingProjects.has(pid)) return loadingProjects.get(pid);
    const p = (async () => {
        let meta = null;
        try {
            meta = JSON.parse(await fs.readFile(join(projectDir(pid), "project.json"), "utf8"));
        } catch (err) {
            // Only a missing file means "new project". Any other read/parse failure
            // (I/O error, corrupt JSON) must surface rather than masquerade as an
            // empty project, or the next save would overwrite real data and leave
            // the frame files orphaned.
            if (!err || err.code !== "ENOENT") {
                throw new CanvasError("project_unreadable", `Could not read project "${pid}": ${err?.message || err}`);
            }
        }
        if (!meta || typeof meta !== "object") {
            meta = { id: pid, name: pid, width: 256, height: 256, loops: 0, hiddenFirst: false, counter: 0, frames: [] };
        }
        meta.id = pid;
        meta.frames = (Array.isArray(meta.frames) ? meta.frames : []).map(normalizeFrame);
        // Backfill encoded sizes for frames persisted before byte-tracking so the
        // aggregate budget reflects real disk usage after an upgrade.
        for (const f of meta.frames) {
            if (!f.bytes) {
                try {
                    f.bytes = (await fs.stat(framePath(pid, f.id))).size;
                } catch {
                    /* frame file gone: leave 0 */
                }
            }
        }
        meta.counter = Number.isFinite(meta.counter) ? meta.counter : meta.frames.length;
        meta.width = clampDim(meta.width);
        meta.height = clampDim(meta.height);
        meta.loops = clampLoops(meta.loops);
        meta.hiddenFirst = !!meta.hiddenFirst;
        projects.set(pid, meta);
        return meta;
    })();
    loadingProjects.set(pid, p);
    try {
        return await p;
    } finally {
        loadingProjects.delete(pid);
    }
}

async function saveProject(meta) {
    const dir = projectDir(meta.id);
    const target = join(dir, "project.json");
    const tmp = join(dir, `.project.${randomBytes(6).toString("hex")}.tmp`);
    try {
        await ensureDir(dir);
        // Write to a temp file then rename, so an interrupted write can never leave
        // a truncated project.json for the next load to misread as empty.
        await fs.writeFile(tmp, JSON.stringify(meta, null, 2));
        await fs.rename(tmp, target);
    } catch (err) {
        // A failed persist must not leave the in-memory cache diverged from disk:
        // evict it so the next access reloads authoritative state instead of the
        // unsaved mutation, and remove any leftover temp file.
        projects.delete(sanitizeId(meta.id));
        await fs.rm(tmp, { force: true }).catch(() => {});
        throw err;
    }
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
// Validate a PNG buffer and return its dimensions. Walks the chunk stream to
// confirm it is structurally a PNG (IHDR first with length 13 and non-zero
// dimensions, at least one IDAT, and IEND) so a malformed upload can't be
// stored and then blow up APNG assembly later.
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
function pngSize(buffer) {
    const bad = () => new CanvasError("bad_frame", "Frame is not a valid PNG image.");
    // The internal encoder returns plain Uint8Arrays while HTTP uploads arrive as
    // Buffers; view any Uint8Array as a Buffer (no copy) so both paths validate.
    if (buffer instanceof Uint8Array && !Buffer.isBuffer(buffer)) {
        buffer = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.length);
    }
    if (!Buffer.isBuffer(buffer) || buffer.length < 8) throw bad();
    for (let i = 0; i < 8; i++) {
        if (buffer[i] !== PNG_SIGNATURE[i]) throw bad();
    }
    let off = 8;
    let width = 0;
    let height = 0;
    let sawIHDR = false;
    let sawIDAT = false;
    let sawIEND = false;
    while (off + 8 <= buffer.length) {
        const len = buffer.readUInt32BE(off);
        const type = buffer.toString("latin1", off + 4, off + 8);
        if (off + 12 + len > buffer.length) throw bad(); // length + type + data + CRC
        if (!sawIHDR) {
            if (type !== "IHDR" || len !== 13) throw bad();
            width = buffer.readUInt32BE(off + 8);
            height = buffer.readUInt32BE(off + 8 + 4);
            const bitDepth = buffer[off + 8 + 8];
            const colorType = buffer[off + 8 + 9];
            const compression = buffer[off + 8 + 10];
            const filterMethod = buffer[off + 8 + 11];
            const interlace = buffer[off + 8 + 12];
            // The codec only handles 8-bit truecolor-with-alpha, non-interlaced
            // PNGs with the standard compression/filter methods (which the
            // renderer and the RGBA encoder always produce). Reject anything
            // else rather than store a frame assembleApng would mis-encode.
            if (bitDepth !== 8 || colorType !== 6 || compression !== 0 || filterMethod !== 0 || interlace !== 0) {
                throw new CanvasError(
                    "bad_frame",
                    "Frame must be an 8-bit RGBA (non-interlaced) PNG."
                );
            }
            sawIHDR = true;
        } else if (type === "IDAT") {
            sawIDAT = true;
        } else if (type === "IEND") {
            sawIEND = true;
            break;
        }
        off += 12 + len;
    }
    if (!sawIHDR || !sawIDAT || !sawIEND || width < 1 || height < 1) throw bad();
    return { width, height };
}

// Lockless core: assumes the caller holds the project lock and passes the loaded
// meta. Writes the frame file and appends the record (does not save/broadcast).
async function addFrameToMeta(meta, buffer, opts = {}) {
    if (meta.frames.length >= MAX_FRAMES) {
        throw new CanvasError("too_many_frames", `An animation can have at most ${MAX_FRAMES} frames.`);
    }
    if (usedBytes(meta) + buffer.length > MAX_TOTAL_BYTES) {
        throw new CanvasError("project_too_large", `Frames would exceed the ${MAX_TOTAL_BYTES >> 20} MiB total limit.`);
    }
    // Resolve (and validate) timing before writing anything so a rejected timing
    // combination can't leave an orphaned frame file / advanced counter behind.
    const timing = resolveTiming(opts, null) || { delayNum: 120, delayDen: 1000 };
    const { width, height } = pngSize(buffer);
    if (width > 2048 || height > 2048) {
        throw new CanvasError("frame_too_large", `Frame is ${width}×${height}; the maximum is 2048×2048.`);
    }
    if (meta.frames.length > 0 && (width !== meta.width || height !== meta.height)) {
        throw new CanvasError(
            "size_mismatch",
            `Frame is ${width}×${height}, but the animation is ${meta.width}×${meta.height}. All frames must share dimensions.`
        );
    }
    // Write the file BEFORE mutating meta, so a failed write leaves the cached
    // project untouched (nothing persisted, nothing to evict, counter intact).
    const fid = String(meta.counter);
    await ensureDir(projectDir(meta.id));
    await fs.writeFile(framePath(meta.id, fid), buffer);
    if (meta.frames.length === 0) {
        // The first frame defines the canvas size; store the real dimensions so
        // metadata and the on-disk PNG always agree.
        meta.width = width;
        meta.height = height;
    }
    meta.counter++;
    meta.frames.push(
        normalizeFrame({
            id: fid,
            delayNum: timing.delayNum,
            delayDen: timing.delayDen,
            disposeOp: opts.disposeOp,
            blendOp: opts.blendOp,
            bytes: buffer.length,
        })
    );
    return fid;
}

async function addFrameBuffer(id, buffer, opts = {}) {
    return withProjectLock(id, async () => {
        const meta = await loadProject(id);
        const fid = await addFrameToMeta(meta, buffer, opts);
        await saveProject(meta);
        broadcast(meta.id);
        return fid;
    });
}

async function moveFrame(id, fid, delta) {
    return withProjectLock(id, async () => {
        const meta = await loadProject(id);
        const i = meta.frames.findIndex((f) => f.id === String(fid));
        const step = Math.sign(Number(delta));
        if (!Number.isFinite(step) || step === 0) return;
        const j = i + step;
        if (i < 0 || j < 0 || j >= meta.frames.length) return;
        [meta.frames[i], meta.frames[j]] = [meta.frames[j], meta.frames[i]];
        await saveProject(meta);
        broadcast(meta.id);
    });
}

async function deleteFrame(id, fid) {
    return withProjectLock(id, async () => {
        const meta = await loadProject(id);
        const i = meta.frames.findIndex((f) => f.id === String(fid));
        if (i < 0) return;
        meta.frames.splice(i, 1);
        // Persist the removal before deleting the file (as clearFrames does) so an
        // interrupted delete can't leave project.json referencing a missing PNG.
        await saveProject(meta);
        broadcast(meta.id);
        await fs.rm(framePath(meta.id, fid), { force: true });
    });
}

async function duplicateFrame(id, fid) {
    return withProjectLock(id, async () => {
        const meta = await loadProject(id);
        const i = meta.frames.findIndex((f) => f.id === String(fid));
        if (i < 0) return;
        if (meta.frames.length >= MAX_FRAMES) {
            throw new CanvasError("too_many_frames", `An animation can have at most ${MAX_FRAMES} frames.`);
        }
        const src = meta.frames[i];
        const srcBytes = src.bytes || (await fs.stat(framePath(meta.id, fid))).size;
        if (usedBytes(meta) + srcBytes > MAX_TOTAL_BYTES) {
            throw new CanvasError("project_too_large", `Frames would exceed the ${MAX_TOTAL_BYTES >> 20} MiB total limit.`);
        }
        const nid = String(meta.counter);
        // Copy the file before advancing the counter / inserting the record, so a
        // failed copy leaves the cached project unchanged.
        await fs.copyFile(framePath(meta.id, fid), framePath(meta.id, nid));
        meta.counter++;
        meta.frames.splice(i + 1, 0, normalizeFrame({ ...src, id: nid, bytes: srcBytes }));
        await saveProject(meta);
        broadcast(meta.id);
    });
}

// Frame timing may be given exactly one way: fps, delayMs, or delayNum/delayDen.
// Combining modes (e.g. delayMs with delayDen, or fps with delayNum) used to be
// applied field-by-field and silently produced hybrid delays, so a mixed request
// is rejected here; the chosen mode resolves omitted parts against `base`.
function resolveTiming(props, base) {
    const hasFps = props.fps != null;
    const hasMs = props.delayMs != null;
    const hasFrac = props.delayNum != null || props.delayDen != null;
    if ([hasFps, hasMs, hasFrac].filter(Boolean).length > 1) {
        throw new CanvasError(
            "timing_conflict",
            "Set frame timing one way only: delayMs, or fps, or delayNum/delayDen — not a combination."
        );
    }
    if (hasFps) return { delayNum: 1, delayDen: clampInt(props.fps, 1, 65535, base?.delayDen ?? 1000) };
    if (hasMs) return { delayNum: clampInt(props.delayMs, 0, 65535, base?.delayNum ?? 120), delayDen: 1000 };
    if (hasFrac) {
        return {
            delayNum: props.delayNum != null ? clampInt(props.delayNum, 0, 65535, base?.delayNum ?? 120) : base?.delayNum ?? 120,
            delayDen: props.delayDen != null ? clampDen(props.delayDen) : base?.delayDen ?? 1000,
        };
    }
    return null;
}

// Apply a partial set of frame properties. Timing (if any) is resolved as a single
// mutually-exclusive mode; only provided fields change.
function applyFrameProps(f, props) {
    const t = resolveTiming(props, f);
    if (t) {
        f.delayNum = t.delayNum;
        f.delayDen = t.delayDen;
    }
    if (props.disposeOp != null) f.disposeOp = clampDispose(props.disposeOp, f.disposeOp);
    if (props.blendOp != null) f.blendOp = clampBlend(props.blendOp, f.blendOp);
}

async function setFrameProps(id, fid, props) {
    return withProjectLock(id, async () => {
        const meta = await loadProject(id);
        const f = meta.frames.find((x) => x.id === String(fid));
        if (!f) throw new CanvasError("frame_not_found", `No frame with id "${fid}".`);
        applyFrameProps(f, props || {});
        await saveProject(meta);
        broadcast(meta.id);
    });
}

async function setFramePropsAll(id, props) {
    return withProjectLock(id, async () => {
        const meta = await loadProject(id);
        for (const f of meta.frames) applyFrameProps(f, props || {});
        await saveProject(meta);
        broadcast(meta.id);
    });
}

async function clearFrames(id) {
    return withProjectLock(id, async () => {
        const meta = await loadProject(id);
        // Clear the in-memory list and persist it before deleting files, so a
        // concurrent reader never sees a frame id whose PNG is already gone.
        const ids = meta.frames.map((f) => f.id);
        meta.frames = [];
        await saveProject(meta);
        broadcast(meta.id);
        await Promise.all(ids.map((fid) => fs.rm(framePath(meta.id, fid), { force: true })));
    });
}

async function applySettings(id, { width, height, loops, name, hiddenFirst }) {
    return withProjectLock(id, async () => {
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
    });
}

// Assemble the APNG from a loaded project. Assumes the caller holds the project
// lock so frame files can't be deleted mid-read.
async function assembleFromMeta(meta) {
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

// Serialize assembly with mutations so a concurrent clear/delete can't remove a
// frame file while it is being read (which would otherwise 500 a preview,
// phone request, or export).
async function assemble(id) {
    return withProjectLock(id, async () => assembleFromMeta(await loadProject(id)));
}

async function exportApng(id, filename) {
    return withProjectLock(id, async () => {
        const meta = await loadProject(id);
        const bytes = await assembleFromMeta(meta);
        if (!bytes) throw new CanvasError("no_frames", "Nothing to export — add at least one frame first.");
        await ensureDir(EXPORTS_DIR);
        const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 23);
        // Generated names include milliseconds + a random suffix so two exports in
        // the same second don't collide and silently overwrite each other; an
        // explicit caller filename keeps its (intentional) overwrite behavior.
        const base = filename
            ? sanitizeName(filename.replace(/\.(a?png)$/i, ""))
            : `${sanitizeName(meta.name)}-${stamp}-${randomBytes(3).toString("hex")}`;
        const outPath = join(EXPORTS_DIR, `${base}.png`);
        await fs.writeFile(outPath, bytes);
        return { path: outPath, name: `${base}.png`, bytes: bytes.length };
    });
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
const servers = new Map(); // instanceId -> { instanceId, server, url, projectId, token, sse:Set<res> }

// Resolve which project an action targets: an explicit projectId wins, else the
// project bound to the invoking canvas instance, else the default project.
function resolveProjectId(ctx) {
    if (ctx?.input?.projectId) return sanitizeId(ctx.input.projectId);
    const entry = servers.get(ctx?.instanceId);
    if (entry) return entry.projectId;
    return DEFAULT_PROJECT;
}

// Constant-time compare for the per-server access token.
function tokenMatches(provided, expected) {
    if (typeof provided !== "string" || provided.length !== expected.length) return false;
    try {
        return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    } catch {
        return false;
    }
}

// Push a "changed" event to every open panel of a project (across instances).
function broadcast(projectId) {
    const pid = sanitizeId(projectId);
    for (const entry of servers.values()) {
        if (entry.projectId !== pid) continue;
        for (const res of entry.sse) {
            // Drop responses that have already ended/reset rather than writing
            // to a dead stream.
            if (res.writableEnded || res.destroyed) {
                entry.sse.delete(res);
                continue;
            }
            try {
                res.write(`data: changed\n\n`);
            } catch {
                entry.sse.delete(res);
            }
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

// Error carrying an explicit HTTP status (e.g. 400 bad JSON, 413 too large).
class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const MAX_JSON_BYTES = 1 << 20; // 1 MiB — mutation payloads are tiny
const MAX_UPLOAD_BYTES = 40 << 20; // 40 MiB — a single decoded frame PNG

function readBody(req, maxBytes) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let total = 0;
        let over = false;
        req.on("data", (c) => {
            if (over) return; // past the limit: drain without buffering
            total += c.length;
            if (total > maxBytes) {
                over = true;
                reject(new HttpError(413, "Request body too large."));
                return;
            }
            chunks.push(c);
        });
        req.on("end", () => {
            if (!over) resolve(Buffer.concat(chunks));
        });
        req.on("error", reject);
    });
}
async function readJson(req) {
    const buf = await readBody(req, MAX_JSON_BYTES);
    if (!buf.length) return {};
    try {
        return JSON.parse(buf.toString("utf8"));
    } catch {
        throw new HttpError(400, "Invalid JSON body.");
    }
}

async function handleRequest(entry, req, res) {
    const projectId = entry.projectId;
    const url = new URL(req.url, "http://localhost");
    const path = url.pathname;
    const method = req.method || "GET";

    try {
        // Static renderer assets are public (they carry no project data). The
        // iframe is loaded with the token in its URL; app.js then reads it and
        // attaches it to every data request below.
        if (method === "GET" && (path === "/" || path === "/index.html")) {
            return send(res, 200, CONTENT_TYPES[".html"], await fs.readFile(join(WEB_DIR, "index.html")));
        }
        if (method === "GET" && (path === "/app.js" || path === "/styles.css")) {
            const file = path.slice(1);
            return send(res, 200, CONTENT_TYPES[extname(file)] || "text/plain", await fs.readFile(join(WEB_DIR, file)));
        }
        if (path === "/favicon.ico") return send(res, 204, "text/plain", "");

        // Everything below reads or mutates project data. Require the per-server
        // token so another local process or a cross-origin page that guesses the
        // port cannot read state or drive mutations (e.g. /frames/clear).
        if (!tokenMatches(url.searchParams.get("k") || "", entry.token)) {
            return send(res, 403, "text/plain", "Forbidden");
        }

        // State.
        if (method === "GET" && path === "/state") {
            const meta = await loadProject(projectId);
            return send(res, 200, "application/json", JSON.stringify(publicState(meta)));
        }

        // Server-Sent Events. Track the client on this instance so its canvas
        // can end just its own streams on close without disturbing other panels.
        if (method === "GET" && path === "/events") {
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-store",
                Connection: "keep-alive",
            });
            res.write(": connected\n\n");
            entry.sse.add(res);
            const drop = () => entry.sse.delete(res);
            req.on("close", drop);
            res.on("close", drop);
            res.on("error", drop);
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
            const buf = await readBody(req, MAX_UPLOAD_BYTES);
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
            stopShare(projectId);
            return send(res, 200, "application/json", "{}");
        }
        if (method === "GET" && path === "/share/qr.png") {
            const s = shares.get(projectId);
            if (!s || Date.now() > s.expiresAt) {
                return send(res, 409, "text/plain", "no active share");
            }
            return send(res, 200, "image/png", Buffer.from(renderQrPng(shareUrlFor(projectId))));
        }

        return send(res, 404, "text/plain", "not found");
    } catch (err) {
        if (err instanceof HttpError) return send(res, err.status, "text/plain", err.message);
        // CanvasError is a user-facing validation error (bad frame, size
        // mismatch, nothing to export), not a server fault.
        if (err instanceof CanvasError) return send(res, 400, "text/plain", err.message);
        return send(res, 500, "text/plain", String(err && err.message ? err.message : err));
    }
}

async function startServer(entry) {
    entry.token = randomBytes(16).toString("hex");
    entry.sse = new Set();
    const server = createServer((req, res) => handleRequest(entry, req, res));
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            server.removeListener("error", reject);
            resolve();
        });
    });
    const { port } = server.address();
    entry.server = server;
    // The token travels in the iframe URL; app.js reads it and attaches it to
    // every data request so other local origins cannot reach project data.
    entry.url = `http://127.0.0.1:${port}/?k=${entry.token}`;
    return entry;
}

// ---- "Send to phone" share server ---------------------------------------
// A separate, read-only HTTP server bound to the LAN so a phone can fetch the
// live animation. It exposes ONLY a landing page and the preview image, gated
// by a short-lived random token, and it shuts itself down when the token
// expires. Mutation endpoints stay on the loopback server and are never
// reachable from the network.
const SHARE_TTL_MS = 10 * 60 * 1000;
let shareServer = null; // single LAN-bound HTTP server, created on demand
let shareServerStarting = null; // in-flight startup promise (dedupe concurrent starts)
let shareServerBindIp = null; // the private IPv4 the server is actually bound to
const shares = new Map(); // projectId -> { token, expiresAt, timer }

// Best-guess private (RFC1918) LAN IPv4 to bind the share server to, or null.
// Interfaces that are typically virtual (VPN/VM/container: utun, ipsec, tun/tap,
// bridge, vmnet, docker, veth, wg, awdl…) are skipped, and real NICs (en*, eth*,
// wl*) on common home/office ranges are preferred. This is a heuristic — on an
// unusual multi-homed host it can still pick the wrong interface.
function lanIPv4() {
    const isPrivate = (ip) =>
        /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
    const virtual = /^(utun|ipsec|ppp|tun|tap|awdl|llw|bridge|vmnet|vboxnet|docker|veth|wg|zt)/i;
    const physical = /^(en|eth|wl|wlan)/i;
    const cands = [];
    for (const [name, addrs] of Object.entries(networkInterfaces())) {
        for (const a of addrs || []) {
            if (a.family !== "IPv4" || a.internal) continue;
            if (!isPrivate(a.address)) continue;
            if (virtual.test(name)) continue;
            let score = 0;
            if (physical.test(name)) score -= 100;
            if (/^192\.168\./.test(a.address)) score -= 10;
            else if (/^10\./.test(a.address)) score -= 5; // 172.16/12 is often Docker; least preferred
            cands.push({ ip: a.address, score });
        }
    }
    cands.sort((a, b) => a.score - b.score);
    return cands.length ? cands[0].ip : null;
}

function shareUrlFor(projectId) {
    const s = shares.get(projectId);
    const { port } = shareServer.address();
    // Use the address the server is actually bound to, not a freshly resolved
    // one, so the link always points where the listener is really accepting.
    return `http://${shareServerBindIp}:${port}/s?t=${s.token}`;
}

// Resolve an active share from its token (constant-time compare), so tokens from
// one project's panel can never address another project's share.
function shareForToken(token) {
    if (typeof token !== "string" || !token) return null;
    const tokenBuf = Buffer.from(token);
    for (const [projectId, s] of shares) {
        if (s.token.length !== token.length) continue;
        let ok = false;
        try {
            ok = timingSafeEqual(tokenBuf, Buffer.from(s.token));
        } catch {
            ok = false;
        }
        if (ok) return { projectId, share: s };
    }
    return null;
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
        const match = shareForToken(token);
        if (!match) return send(res, 403, "text/plain", "Invalid or expired link.");
        if (Date.now() > match.share.expiresAt) {
            stopShare(match.projectId);
            return send(res, 410, "text/plain", "This link has expired.");
        }
        if (req.method === "GET" && (url.pathname === "/s" || url.pathname === "/s/")) {
            return send(res, 200, CONTENT_TYPES[".html"], shareLandingHtml(token));
        }
        if (req.method === "GET" && url.pathname === "/s/preview.png") {
            const bytes = await assemble(match.projectId);
            if (!bytes) return send(res, 204, "image/png", "");
            return send(res, 200, "image/png", Buffer.from(bytes));
        }
        return send(res, 404, "text/plain", "not found");
    } catch (err) {
        if (err instanceof HttpError) return send(res, err.status, "text/plain", err.message);
        return send(res, 500, "text/plain", String(err && err.message ? err.message : err));
    }
}

// Start (or reuse) the single LAN share server. Concurrent callers share one
// in-flight startup promise so two /share/start requests can't each bind a
// separate listener and leak one.
async function ensureShareServer(bindIp) {
    if (shareServer) {
        // Reuse the running server, unless the LAN address changed and nothing
        // is currently being shared — then rebind to the new private address.
        if (shareServerBindIp === bindIp || shares.size > 0) return shareServer;
        const old = shareServer;
        shareServer = null;
        shareServerStarting = null;
        shareServerBindIp = null;
        try {
            old.close();
        } catch {
            /* already closing */
        }
    }
    if (!shareServerStarting) {
        shareServerStarting = (async () => {
            const server = createServer(shareRequest);
            await new Promise((resolve, reject) => {
                server.once("error", reject);
                // Bind only to the private LAN address, not 0.0.0.0, so the
                // listener is never exposed on public/VPN interfaces.
                server.listen(0, bindIp, resolve);
            });
            shareServer = server;
            shareServerBindIp = bindIp;
            return server;
        })().catch((err) => {
            shareServerStarting = null;
            throw err;
        });
    }
    return shareServerStarting;
}

async function startShare(projectId) {
    const ip = lanIPv4();
    if (!ip) {
        throw new CanvasError(
            "no_network",
            "No local Wi-Fi/LAN address found. Connect to a local network to share to your phone."
        );
    }
    await ensureShareServer(ip);
    // The canvas may have closed while the server was binding. If no open panel
    // still references this project, don't leave a share (or an idle LAN server)
    // behind.
    const stillOpen = [...servers.values()].some((e) => e.projectId === sanitizeId(projectId));
    if (!stillOpen) {
        if (shares.size === 0 && shareServer) {
            const server = shareServer;
            shareServer = null;
            shareServerStarting = null;
            shareServerBindIp = null;
            try {
                server.close();
            } catch {
                /* already closing */
            }
        }
        throw new CanvasError("canvas_closed", "The canvas was closed before sharing started.");
    }
    const existing = shares.get(projectId);
    if (existing?.timer) clearTimeout(existing.timer);
    const token = randomBytes(16).toString("hex");
    const expiresAt = Date.now() + SHARE_TTL_MS;
    const timer = setTimeout(() => stopShare(projectId), SHARE_TTL_MS);
    timer.unref?.();
    shares.set(projectId, { token, expiresAt, timer });
    return { url: shareUrlFor(projectId), expiresAt, ttlMs: SHARE_TTL_MS };
}

function stopShare(projectId) {
    const s = shares.get(projectId);
    if (!s) return;
    if (s.timer) clearTimeout(s.timer);
    shares.delete(projectId);
    // Close the shared LAN server once nothing is being shared.
    if (shares.size === 0 && shareServer) {
        const server = shareServer;
        shareServer = null;
        shareServerStarting = null;
        shareServerBindIp = null;
        try {
            server.close();
        } catch {
            /* already closing */
        }
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
                        // hiddenFirst only takes effect with >=2 frames (matches the
                        // encoder in apng.mjs), so a lone frame still counts as animated.
                        const hidden = meta.hiddenFirst && meta.frames.length >= 2;
                        const animated = hidden ? meta.frames.slice(1) : meta.frames;
                        // Sum exact numerator/denominator fractions, then convert
                        // once, so the total matches the encoded timing rather than
                        // accumulating per-frame rounding.
                        const totalMs = Math.round(
                            animated.reduce((a, f) => a + f.delayNum / f.delayDen, 0) * 1000
                        );
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
                            delayMs: { type: "integer", minimum: 0, maximum: 65535, description: "Frame delay in ms. Use one timing mode only." },
                            delayNum: { type: "integer", minimum: 0, maximum: 65535, description: "Delay numerator; pair with delayDen. Use one timing mode only." },
                            delayDen: { type: "integer", minimum: 1, maximum: 65535, description: "Delay denominator (default 1000). Use one timing mode only." },
                            disposeOp: { type: "integer", minimum: 0, maximum: 2, description: "0=None, 1=Background, 2=Previous." },
                            blendOp: { type: "integer", minimum: 0, maximum: 1, description: "0=Source, 1=Over." },
                        },
                        required: ["color"],
                        additionalProperties: false,
                    },
                    handler: async (ctx) => {
                        const id = resolveProjectId(ctx);
                        const color = parseColor(ctx.input?.color);
                        const { color: _c, projectId: _p, ...opts } = ctx.input || {};
                        if (opts.delayMs == null && opts.delayNum == null && opts.delayDen == null && opts.fps == null) opts.delayMs = 120;
                        // Read dimensions, render, and append under one lock so a
                        // concurrent set_settings can't change the size between
                        // rendering the PNG and recording the frame.
                        return withProjectLock(id, async () => {
                            const meta = await loadProject(id);
                            const png = solidColorPng(meta.width, meta.height, color);
                            const fid = await addFrameToMeta(meta, png, opts);
                            await saveProject(meta);
                            broadcast(meta.id);
                            return { frameId: fid, frameCount: meta.frames.length };
                        });
                    },
                },
                {
                    name: "set_frame",
                    description:
                        "Change timing/compositing for one frame (by frameId) or every frame (all: true). Timing (choose exactly one mode): delayMs, or fps (exact frame rate), or delayNum/delayDen — combining modes is rejected. Compositing: disposeOp (0=None,1=Background,2=Previous), blendOp (0=Source,1=Over).",
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
                let meta = await loadProject(projectId);
                if (ctx.input?.name && typeof ctx.input.name === "string") {
                    // Route the rename through the locked mutation path so it
                    // can't race a concurrent save or skip the panel broadcast.
                    meta = await applySettings(projectId, { name: ctx.input.name });
                }
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = { instanceId: ctx.instanceId, projectId, sse: new Set() };
                    servers.set(ctx.instanceId, entry);
                    try {
                        await startServer(entry);
                    } catch (err) {
                        // Don't leave a half-open instance behind: a later open would
                        // skip startup and return an undefined URL, and onClose would
                        // dereference a missing server. Drop it so it can retry.
                        servers.delete(ctx.instanceId);
                        throw err;
                    }
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
                if (!entry) return;
                servers.delete(ctx.instanceId);
                // End this instance's SSE streams first, otherwise server.close()
                // waits on the open /events response and never resolves.
                for (const res of entry.sse) {
                    try {
                        res.end();
                    } catch {
                        /* already closed */
                    }
                }
                entry.sse.clear();
                // Only stop this project's LAN share when no other open panel
                // still references the project, so closing one of two panels
                // doesn't invalidate the other's phone link.
                const stillOpen = [...servers.values()].some((e) => e.projectId === entry.projectId);
                if (!stillOpen) stopShare(entry.projectId);
                if (entry.server) await new Promise((resolve) => entry.server.close(() => resolve()));
            },
        }),
    ],
});

await ensureDir(EXPORTS_DIR);
log("APNG Studio ready.");
