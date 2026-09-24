// Loopback HTTP server for the Draw canvas iframe: static files, live updates (SSE) and a small JSON API.
import http from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { outlinePage } from "./lib/layout.mjs";
import { MAX_ELEMENTS } from "./lib/model.mjs";
import { Settings, THEMES } from "./settings.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
};
const MAX_BODY = 40 * 1024 * 1024;
// About how much outline goes into an Ask prompt. Copilot can read the rest with get_drawing.
const ASK_OUTLINE_BUDGET = 16000;
// How many pages the server remembers the last change number of (see lastSeq).
const SEQ_MEMORY = 500;
const CSP = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
].join("; ");

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function staticPath(pathname) {
    if (pathname === "/" || pathname === "/index.html") return path.join(ROOT, "public", "index.html");
    let m = /^\/lib\/([a-z0-9-]+\.mjs)$/.exec(pathname);
    if (m) return path.join(ROOT, "lib", m[1]);
    m = /^\/([a-z0-9-]+\.(?:js|css|svg))$/.exec(pathname);
    if (m) return path.join(ROOT, "public", m[1]);
    return null;
}

function sendJson(res, status, body) {
    const data = JSON.stringify(body);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Length": Buffer.byteLength(data),
    });
    res.end(data);
}

async function readJson(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BODY) throw new HttpError(413, "Request is too large.");
        chunks.push(chunk);
    }
    try {
        const value = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
        return value;
    } catch {
        throw new HttpError(400, "Request body must be a JSON object.");
    }
}

function sameToken(a, b) {
    const x = Buffer.from(String(a || ""));
    const y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
}

function isInside(dir, file) {
    const rel = path.relative(dir, file);
    return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

// Whether two JSON values hold the same data, whatever order their keys are in.
function sameJson(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((k) => Object.hasOwn(b, k) && sameJson(a[k], b[k]));
}

// Whether saving a page's ops stored something other than what the page has, because the model
// tidied it up: a size past the limit, say, or an arrow whose shape is gone.
function tidiedOnSave(before, ops, after) {
    const saved = new Map(after.map((e) => [e.id, e]));
    const ids = new Set(before.map((e) => e.id));
    for (const id of Array.isArray(ops.deletes) ? ops.deletes : []) ids.delete(id);
    for (const el of Array.isArray(ops.upserts) ? ops.upserts : []) {
        if (!sameJson(el, saved.get(el?.id))) return true;
        ids.add(el.id);
    }
    return ids.size !== after.length;
}

function revealInFolder(file) {
    const opts = { detached: true, stdio: "ignore" };
    let child;
    if (process.platform === "win32") {
        child = spawn("explorer.exe", [`/select,"${file}"`], { ...opts, windowsVerbatimArguments: true });
    } else if (process.platform === "darwin") {
        child = spawn("open", ["-R", file], opts);
    } else {
        child = spawn("xdg-open", [path.dirname(file)], opts);
    }
    child.on("error", () => {});
    child.unref();
}

export function publicDoc(doc, saveError = null) {
    return { id: doc.id, name: doc.name, rev: doc.rev, updatedAt: doc.updatedAt, elements: doc.elements, saveError };
}

export function createDrawServer({ store, settings = new Settings(), getSession, log = () => {} }) {
    const token = randomBytes(18).toString("base64url");
    const clients = new Set();
    const selections = new Map();
    const pendingExports = new Map();
    // The number of the newest change each page has had applied. A page sends one change at a
    // time, except when it closes: its last change can then overtake one still on the way, and
    // that older one must not undo it.
    const lastSeq = new Map();
    let port = 0;

    const send = (client, event, data) => {
        try {
            client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch {
            clients.delete(client);
        }
    };
    const clientsFor = (instanceId) => [...clients].filter((c) => c.instanceId === instanceId);
    const pub = (doc) => publicDoc(doc, store.saveError(doc.id));

    // Makes sure an instance points at a real drawing, creating "Drawing 1" when there are none.
    function ensureDrawing(instanceId) {
        let doc = store.drawingForInstance(instanceId);
        if (!doc) {
            const recent = store.list()[0];
            doc = store.lastOpened || (recent && store.get(recent.id)) || store.create();
            store.bindInstance(instanceId, doc.id);
        }
        return doc;
    }

    function showDrawing(instanceId, doc) {
        store.bindInstance(instanceId, doc.id);
        selections.delete(instanceId);
        for (const c of clientsFor(instanceId)) send(c, "switch", { drawing: pub(doc) });
    }

    // Settings apply to every panel, so every client hears about a change.
    async function updateSettings(patch, origin = "agent") {
        const values = await settings.update(patch);
        for (const c of clients) send(c, "settings", { settings: values, origin });
        return values;
    }

    store.on("change", (doc, origin) => {
        for (const c of clients) {
            if (c.clientId === origin) continue;
            if (store.state.instances[c.instanceId] === doc.id) send(c, "doc", { drawing: pub(doc), origin });
        }
    });
    store.on("save", (id, error) => {
        for (const c of clients) {
            if (store.state.instances[c.instanceId] === id) send(c, "save", { drawingId: id, error });
        }
    });
    store.on("list", () => {
        const drawings = store.list();
        for (const c of clients) send(c, "list", { drawings });
    });

    const heartbeat = setInterval(() => {
        for (const c of clients) {
            try {
                c.res.write(": ping\n\n");
            } catch {
                clients.delete(c);
            }
        }
    }, 25000);
    heartbeat.unref();

    async function api(req, res, url, instanceId) {
        const route = url.pathname;
        if (req.method === "GET" && route === "/api/state") {
            const doc = ensureDrawing(instanceId);
            return sendJson(res, 200, {
                instanceId,
                drawing: pub(doc),
                drawings: store.list(),
                folder: store.dir,
                settings: await settings.read(),
            });
        }
        if (req.method === "GET" && route === "/api/events") {
            res.writeHead(200, {
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-store",
                Connection: "keep-alive",
            });
            res.write("retry: 1500\n\n");
            const client = { res, instanceId, clientId: url.searchParams.get("c") || "" };
            clients.add(client);
            req.on("close", () => clients.delete(client));
            return;
        }
        if (req.method !== "POST") throw new HttpError(404, "Not found.");
        const body = await readJson(req);
        const clientId = typeof body.clientId === "string" ? body.clientId.slice(0, 64) : "user";

        if (route === "/api/ops") {
            const current = store.get(body.drawingId);
            if (!current) throw new HttpError(404, "That drawing no longer exists.");
            const seq = Number.isSafeInteger(body.seq) ? body.seq : null;
            if (seq !== null && lastSeq.has(clientId) && seq <= lastSeq.get(clientId)) {
                return sendJson(res, 200, { rev: current.rev, drawing: pub(current), ignored: true });
            }
            const ops = body.ops && typeof body.ops === "object" ? body.ops : {};
            const before = current.elements;
            const doc = store.applyOps(body.drawingId, ops, clientId);
            // Only changes that were applied count, so a refused one cannot hide an older one.
            if (seq !== null) {
                lastSeq.delete(clientId);
                lastSeq.set(clientId, seq);
                if (lastSeq.size > SEQ_MEMORY) lastSeq.delete(lastSeq.keys().next().value);
            }
            // If someone else changed the drawing since the client's last known rev, send the full doc back.
            const stale = Number.isInteger(body.baseRev) && doc.rev !== body.baseRev + 1;
            // Also when the drawing was saved tidier than the page sent it, so the page shows what was saved.
            const cleaned = !stale && tidiedOnSave(before, ops, doc.elements);
            if (cleaned) return sendJson(res, 200, { rev: doc.rev, drawing: pub(doc), cleaned: true });
            return sendJson(res, 200, stale ? { rev: doc.rev, drawing: pub(doc) } : { rev: doc.rev });
        }
        if (route === "/api/selection") {
            const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === "string").slice(0, MAX_ELEMENTS) : [];
            selections.set(instanceId, { drawingId: body.drawingId, ids });
            return sendJson(res, 200, { ok: true });
        }
        if (route === "/api/drawings") {
            return sendJson(res, 200, await drawingsAction(instanceId, body));
        }
        if (route === "/api/export") {
            return sendJson(res, 200, await exportUpload(body));
        }
        if (route === "/api/ask") {
            return sendJson(res, 200, await ask(instanceId, body));
        }
        if (route === "/api/reveal") {
            const file = path.resolve(String(body.path || ""));
            if (!isInside(store.dir, file)) throw new HttpError(400, "Can only reveal files saved by the Draw canvas.");
            revealInFolder(file);
            return sendJson(res, 200, { ok: true });
        }
        if (route === "/api/settings") {
            if (!THEMES.includes(body.theme)) throw new HttpError(400, `Theme must be one of: ${THEMES.join(", ")}.`);
            return sendJson(res, 200, { settings: await updateSettings({ theme: body.theme }, clientId) });
        }
        throw new HttpError(404, "Not found.");
    }

    async function drawingsAction(instanceId, body) {
        const action = body.action;
        let doc;
        if (action === "new") {
            doc = store.create(body.name);
        } else if (action === "open") {
            doc = store.get(body.id);
            if (!doc) throw new HttpError(404, "That drawing no longer exists.");
        } else if (action === "rename") {
            try {
                doc = store.rename(body.id, body.name);
            } catch (err) {
                throw new HttpError(400, err.message);
            }
            return { drawing: pub(doc), drawings: store.list() };
        } else if (action === "duplicate") {
            const source = store.get(body.id);
            if (!source) throw new HttpError(404, "That drawing no longer exists.");
            doc = store.create(`${source.name} copy`);
            store.replace(doc.id, source.elements, clientIdOf(body));
        } else if (action === "delete") {
            if (!store.get(body.id)) throw new HttpError(404, "That drawing no longer exists.");
            await store.remove(body.id);
            const recent = store.list()[0];
            doc = (recent && store.get(recent.id)) || store.create();
            for (const c of clients) {
                if (c.instanceId !== instanceId && !store.drawingForInstance(c.instanceId)) showDrawing(c.instanceId, doc);
            }
        } else {
            throw new HttpError(400, "Unknown drawings action.");
        }
        store.bindInstance(instanceId, doc.id);
        selections.delete(instanceId);
        return { drawing: pub(doc), drawings: store.list() };
    }

    const clientIdOf = (body) => (typeof body.clientId === "string" ? body.clientId.slice(0, 64) : "user");

    async function exportUpload(body) {
        const format = body.format === "svg" ? "svg" : "png";
        if (body.requestId) {
            const pending = pendingExports.get(body.requestId);
            if (!pending) return { ok: false };
            pendingExports.delete(body.requestId);
            clearTimeout(pending.timer);
            // The panel says which drawing it drew, and a picture of another one must not be
            // saved under this one's name.
            if (body.drawingId !== pending.drawingId) {
                pending.reject(new Error("The canvas switched to another drawing before it drew this one, so nothing was saved. Call export_image again to save the drawing it shows now."));
            } else if (body.error) pending.reject(new Error(String(body.error)));
            else pending.resolve({ format, data: String(body.data || "") });
            return { ok: true };
        }
        const doc = store.get(body.drawingId);
        if (!doc) throw new HttpError(404, "That drawing no longer exists.");
        const data = format === "png" ? Buffer.from(String(body.data || ""), "base64") : String(body.data || "");
        if (!data.length) throw new HttpError(400, "The export was empty.");
        const file = await store.writeExport(doc.id, format, data);
        return { path: file };
    }

    async function ask(instanceId, body) {
        const text = typeof body.text === "string" ? body.text.trim().slice(0, 8000) : "";
        if (!text) throw new HttpError(400, "Type a question first.");
        const doc = store.get(body.drawingId);
        if (!doc) throw new HttpError(404, "That drawing no longer exists.");
        // The context tells Copilot to use this panel, so it must still show the drawing asked about.
        if (store.drawingForInstance(instanceId)?.id !== doc.id) {
            throw new HttpError(409, "Another drawing opened, so your question was not sent. It is still in Ask, so you can send it about this one.");
        }
        const session = getSession();
        if (!session) throw new HttpError(503, "Copilot is not connected yet. Try again in a moment.");
        const png = typeof body.png === "string" ? body.png : "";
        const part = outlinePage(doc, { budget: ASK_OUTLINE_BUDGET });
        const context = [
            `[Context from the Draw canvas: drawing "${doc.name}" (id ${doc.id}), canvas instance "${instanceId}".` +
                (png ? " The attached image shows the drawing exactly as the user sees it." : ""),
            part.text,
            part.next === null ? null : `The outline stops after ${part.shown.length} of ${part.total} elements. Call get_drawing with start ${part.next} to read the rest.`,
            `To change this drawing, call the Draw canvas actions with instanceId "${instanceId}" and drawingId "${doc.id}" (get_drawing, add_elements, update_elements, delete_elements, set_diagram, layout). With drawingId, an action changes nothing if the user has opened another drawing since. Element ids are listed above.]`,
        ].filter(Boolean).join("\n");
        const attachments = png ? [{ type: "blob", data: png, mimeType: "image/png", displayName: `${doc.name}.png` }] : [];
        try {
            await session.send({ prompt: `${text}\n\n${context}`, displayPrompt: text, attachments });
        } catch (err) {
            throw new HttpError(502, `Could not send to Copilot: ${err.message}`);
        }
        return { ok: true };
    }

    async function handle(req, res) {
        const host = req.headers.host || "";
        if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
            res.writeHead(403).end("Forbidden");
            return;
        }
        const url = new URL(req.url, `http://${host}`);
        if (url.pathname.startsWith("/api/")) {
            if (!sameToken(url.searchParams.get("t"), token)) throw new HttpError(401, "Missing or wrong token.");
            const instanceId = url.searchParams.get("i") || "";
            if (!instanceId) throw new HttpError(400, "Missing canvas instance id.");
            return api(req, res, url, instanceId);
        }
        if (req.method !== "GET" && req.method !== "HEAD") throw new HttpError(405, "Method not allowed.");
        const file = staticPath(url.pathname);
        if (!file) throw new HttpError(404, "Not found.");
        let data;
        try {
            data = await fs.readFile(file);
        } catch {
            throw new HttpError(404, "Not found.");
        }
        // The page needs the theme before its first paint, so it is written into the HTML.
        if (file.endsWith("index.html")) {
            const { theme } = await settings.read();
            data = Buffer.from(String(data).replace('data-theme-mode="app"', `data-theme-mode="${theme}"`));
        }
        const headers = {
            "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Length": data.length,
        };
        if (file.endsWith(".html")) headers["Content-Security-Policy"] = CSP;
        res.writeHead(200, headers);
        res.end(req.method === "HEAD" ? undefined : data);
    }

    const server = http.createServer((req, res) => {
        handle(req, res).catch((err) => {
            // HttpError and StoreError carry their own status.
            const status = Number.isInteger(err.status) ? err.status : 500;
            if (status === 500) log(`Draw server error: ${err.stack || err.message}`);
            if (!res.headersSent) sendJson(res, status, { error: err.message });
            else res.end();
        });
    });

    return {
        token,
        get port() {
            return port;
        },
        start() {
            return new Promise((resolve, reject) => {
                server.once("error", reject);
                server.listen(0, "127.0.0.1", () => {
                    port = server.address().port;
                    server.off("error", reject);
                    resolve(port);
                });
            });
        },
        urlFor(instanceId) {
            return `http://127.0.0.1:${port}/?i=${encodeURIComponent(instanceId)}&t=${token}`;
        },
        ensureDrawing,
        showDrawing,
        readSettings: () => settings.read(),
        updateSettings,
        hasClient: (instanceId) => clientsFor(instanceId).length > 0,
        selection(instanceId, drawingId) {
            const sel = selections.get(instanceId);
            return sel && sel.drawingId === drawingId ? sel.ids : [];
        },
        select(instanceId, drawingId, ids) {
            selections.set(instanceId, { drawingId, ids });
            for (const c of clientsFor(instanceId)) send(c, "select", { drawingId, ids });
        },
        // Asks the open iframe to render a drawing (it has the real fonts and theme). The request
        // names the drawing, so a panel that has moved on to another one cannot answer for it.
        requestExport(instanceId, drawingId, format, timeoutMs = 15000) {
            const target = clientsFor(instanceId).pop();
            if (!target) return null;
            const requestId = randomBytes(8).toString("hex");
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    pendingExports.delete(requestId);
                    reject(new Error("The Draw canvas did not answer the export request in time."));
                }, timeoutMs);
                pendingExports.set(requestId, { resolve, reject, timer, drawingId });
                send(target, "export", { requestId, drawingId, format });
            });
        },
        close() {
            clearInterval(heartbeat);
            for (const c of clients) c.res.end();
            // Saves and list updates can still fire on timers, and they must not write to ended streams.
            clients.clear();
            server.close();
        },
    };
}
