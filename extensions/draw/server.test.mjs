// Tests for the loopback server: who may talk to it, which files it serves, and its JSON API.
// Run `node --test` in the extension folder.
import assert from "node:assert/strict";
import http from "node:http";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createDrawServer } from "./server.mjs";
import { Settings } from "./settings.mjs";
import { DrawingStore } from "./store.mjs";

const PANEL = "panel";
const rect = (id, x = 0) => ({ id, type: "rect", x, y: 0, w: 100, h: 60 });

// A server on a temp folder. When the test ends, it stops and the folder is removed.
async function setup(t) {
    const dir = await mkdtemp(path.join(os.tmpdir(), "draw-server-test-"));
    const store = new DrawingStore(path.join(dir, "drawings"));
    await store.ready;
    const settings = new Settings(path.join(dir, "settings", "settings.json"));
    const ctx = { dir, store, settings, session: null };
    ctx.server = createDrawServer({ store, settings, getSession: () => ctx.session });
    await ctx.server.start();
    ctx.doc = ctx.server.ensureDrawing(PANEL);
    t.after(async () => {
        ctx.server.close();
        await store.flush().catch(() => {});
        await rm(dir, { recursive: true, force: true, maxRetries: 3 });
    });
    return ctx;
}

// One request on its own connection, so no socket outlives the test.
function request(port, { method = "GET", url = "/", headers = {}, body } = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request({ host: "127.0.0.1", port, method, path: url, headers, agent: false }, (res) => {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => {
                const text = Buffer.concat(chunks).toString("utf8");
                let json = null;
                try {
                    json = JSON.parse(text);
                } catch {
                    // Not JSON, for example the page itself.
                }
                resolve({ status: res.statusCode, headers: res.headers, text, json });
            });
        });
        req.setTimeout(5000, () => req.destroy(new Error(`${method} ${url} timed out`)));
        req.on("error", reject);
        req.end(body);
    });
}

const apiPath = (server, route, { instance = PANEL, token = server.token } = {}) =>
    `${route}?${new URLSearchParams({ i: instance, t: token })}`;
const get = (server, url, headers) => request(server.port, { url, headers });
// The canvas sends its JSON as text/plain, so the tests do too.
const post = (server, route, body) =>
    request(server.port, {
        method: "POST",
        url: apiPath(server, route),
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: typeof body === "string" ? body : JSON.stringify(body),
    });

// Opens a panel's live event stream. next(type) resolves with the next event of that type.
async function listen(t, server, clientId = "listener") {
    const queue = [];
    let wake = null;
    const req = http.get({ host: "127.0.0.1", port: server.port, path: `${apiPath(server, "/api/events")}&c=${clientId}`, agent: false });
    t.after(() => req.destroy());
    const res = await new Promise((resolve, reject) => {
        req.on("response", resolve);
        req.on("error", reject);
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.headers["content-type"], /^text\/event-stream/);
    let buffer = "";
    res.setEncoding("utf8");
    res.on("error", () => {});
    res.on("data", (chunk) => {
        buffer += chunk;
        let end;
        while ((end = buffer.indexOf("\n\n")) >= 0) {
            const block = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            const type = /^event: (.*)$/m.exec(block)?.[1];
            if (type) queue.push({ type, data: JSON.parse(/^data: (.*)$/m.exec(block)[1]) });
        }
        wake?.();
    });
    return {
        async next(type, timeoutMs = 5000) {
            const deadline = Date.now() + timeoutMs;
            for (;;) {
                const i = queue.findIndex((e) => e.type === type);
                if (i >= 0) return queue.splice(i, 1)[0].data;
                const left = deadline - Date.now();
                if (left <= 0) throw new Error(`No "${type}" event arrived.`);
                await new Promise((resolve) => {
                    const timer = setTimeout(resolve, left);
                    wake = () => {
                        clearTimeout(timer);
                        resolve();
                    };
                });
            }
        },
    };
}

test("requests for any other host are refused", async (t) => {
    const { server } = await setup(t);
    const hosts = ["evil.example", `evil.example:${server.port}`, `127.0.0.1:${server.port + 1}`, `localhost.evil.example:${server.port}`];
    for (const host of hosts) {
        assert.equal((await get(server, "/", { Host: host })).status, 403, host);
        assert.equal((await get(server, apiPath(server, "/api/state"), { Host: host })).status, 403, host);
    }
    assert.equal((await get(server, "/", { Host: `localhost:${server.port}` })).status, 200);
    assert.equal((await get(server, "/")).status, 200);
});

test("the API needs the server's token and a panel id", async (t) => {
    const { server } = await setup(t);
    const noToken = await get(server, `/api/state?i=${PANEL}`);
    assert.equal(noToken.status, 401);
    assert.equal(noToken.json.error, "Missing or wrong token.");
    assert.equal((await get(server, apiPath(server, "/api/state", { token: "x".repeat(server.token.length) }))).status, 401);
    assert.equal((await get(server, apiPath(server, "/api/state", { token: server.token.slice(1) }))).status, 401);
    assert.equal((await get(server, `/api/events?i=${PANEL}`)).status, 401);
    assert.equal((await request(server.port, { method: "POST", url: `/api/ops?i=${PANEL}`, body: "{}" })).status, 401);
    assert.equal((await get(server, `/api/state?t=${server.token}`)).status, 400);
    assert.equal((await get(server, apiPath(server, "/api/state"))).status, 200);
});

test("the page is sent with a content security policy and the saved theme", async (t) => {
    const { server, settings } = await setup(t);
    await settings.update({ theme: "dark" });
    const page = await get(server, `/?i=${PANEL}&t=${server.token}`);
    assert.equal(page.status, 200);
    assert.match(page.headers["content-type"], /^text\/html/);
    assert.equal(page.headers["x-content-type-options"], "nosniff");
    const csp = page.headers["content-security-policy"];
    for (const rule of ["default-src 'self'", "script-src 'self'", "connect-src 'self'", "base-uri 'none'", "form-action 'none'"]) {
        assert.ok(csp.includes(rule), rule);
    }
    assert.ok(page.text.includes('data-theme-mode="dark"'));
});

test("only the canvas's own files are served", async (t) => {
    const { server } = await setup(t);
    for (const url of ["/app.js", "/styles.css", "/lib/model.mjs"]) {
        assert.equal((await get(server, url)).status, 200, url);
    }
    const hidden = ["/server.mjs", "/store.mjs", "/lib/../server.mjs", "/%2e%2e/server.mjs", "/lib/..%2fserver.mjs", "/public/app.js", "/lib/model.test.mjs", "/.state.json"];
    for (const url of hidden) {
        assert.equal((await get(server, url)).status, 404, url);
    }
    const head = await request(server.port, { method: "HEAD", url: "/" });
    assert.equal(head.status, 200);
    assert.equal(head.text, "");
    assert.equal((await request(server.port, { method: "POST", url: "/" })).status, 405);
});

test("state returns the panel's drawing, the drawing list and the settings", async (t) => {
    const { server, store, doc } = await setup(t);
    const { status, json } = await get(server, apiPath(server, "/api/state"));
    assert.equal(status, 200);
    assert.equal(json.instanceId, PANEL);
    assert.equal(json.drawing.id, doc.id);
    assert.equal(json.drawing.saveError, null);
    assert.deepEqual(json.drawings.map((d) => d.id), [doc.id]);
    assert.equal(json.folder, store.dir);
    assert.deepEqual(json.settings, { theme: "app" });
});

test("ops change the drawing, and a client that is behind gets the whole drawing back", async (t) => {
    const { server, store, doc } = await setup(t);
    const first = await post(server, "/api/ops", { drawingId: doc.id, baseRev: 0, ops: { upserts: [rect("a")] } });
    assert.equal(first.status, 200);
    assert.deepEqual(first.json, { rev: 1 });
    const behind = await post(server, "/api/ops", { drawingId: doc.id, baseRev: 0, ops: { upserts: [rect("b", 200)] } });
    assert.equal(behind.json.rev, 2);
    assert.deepEqual(behind.json.drawing.elements.map((e) => e.id), ["a", "b"]);
    assert.equal(store.get(doc.id).elements.length, 2);
    assert.equal((await post(server, "/api/ops", { drawingId: "missing", ops: {} })).status, 404);
});

test("ops that would go past 5,000 elements are refused and change nothing", async (t) => {
    const { server, store, doc } = await setup(t);
    const upserts = Array.from({ length: 5001 }, (_, i) => rect(`r${i}`, i * 10));
    const res = await post(server, "/api/ops", { drawingId: doc.id, ops: { upserts } });
    assert.equal(res.status, 400);
    assert.match(res.json.error, /up to 5,000 elements/);
    assert.equal(store.get(doc.id).rev, 0);
    assert.equal(store.get(doc.id).elements.length, 0);
});

test("bad requests get a clear error", async (t) => {
    const { server } = await setup(t);
    for (const body of ["not json", "[1, 2]", "null"]) {
        const res = await post(server, "/api/ops", body);
        assert.equal(res.status, 400, body);
        assert.equal(res.json.error, "Request body must be a JSON object.");
    }
    assert.equal((await post(server, "/api/unknown", {})).status, 404);
    assert.equal((await get(server, apiPath(server, "/api/ops"))).status, 404);
});

test("settings only take known themes, and a failed write keeps the old theme", async (t) => {
    const { server, settings } = await setup(t);
    assert.equal((await post(server, "/api/settings", { theme: "neon" })).status, 400);
    const saved = await post(server, "/api/settings", { theme: "light" });
    assert.equal(saved.status, 200);
    assert.deepEqual(saved.json.settings, { theme: "light" });
    assert.equal(JSON.parse(await readFile(settings.file, "utf8")).theme, "light");

    // A file where the settings folder should be makes the next write fail.
    await rm(path.dirname(settings.file), { recursive: true });
    await writeFile(path.dirname(settings.file), "");
    assert.equal((await post(server, "/api/settings", { theme: "dark" })).status, 500);
    assert.deepEqual(await settings.read(), { theme: "light" });
});

test("drawings can be made, renamed, copied and deleted", async (t) => {
    const { server, store, doc } = await setup(t);
    store.replace(doc.id, [rect("a")], "test");
    const drawings = (body) => post(server, "/api/drawings", body);

    const made = await drawings({ action: "new", name: "Plan" });
    assert.equal(made.status, 200);
    assert.equal(made.json.drawing.name, "Plan");
    assert.equal(store.drawingForInstance(PANEL).id, made.json.drawing.id);

    assert.equal((await drawings({ action: "rename", id: doc.id, name: "   " })).status, 400);
    assert.equal((await drawings({ action: "rename", id: doc.id, name: "Architecture" })).json.drawing.name, "Architecture");

    const copy = await drawings({ action: "duplicate", id: doc.id });
    assert.equal(copy.json.drawing.name, "Architecture copy");
    assert.deepEqual(store.get(copy.json.drawing.id).elements, store.get(doc.id).elements);

    const deleted = await drawings({ action: "delete", id: doc.id });
    assert.equal(deleted.status, 200);
    assert.equal(store.get(doc.id), null);
    assert.ok(!deleted.json.drawings.some((d) => d.id === doc.id));

    assert.equal((await drawings({ action: "open", id: doc.id })).status, 404);
    assert.equal((await drawings({ action: "delete", id: doc.id })).status, 404);
    assert.equal((await drawings({ action: "explode" })).status, 400);
});

test("exports are written to the drawings folder", async (t) => {
    const { server, store, doc } = await setup(t);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"/>';
    const res = await post(server, "/api/export", { drawingId: doc.id, format: "svg", data: svg });
    assert.equal(res.status, 200);
    assert.equal(path.dirname(res.json.path), store.exportsDir);
    assert.equal(await readFile(res.json.path, "utf8"), svg);
    assert.equal((await post(server, "/api/export", { drawingId: doc.id, format: "png", data: "" })).status, 400);
    assert.equal((await post(server, "/api/export", { drawingId: "missing", format: "svg", data: svg })).status, 404);
});

test("reveal refuses paths outside the drawings folder", async (t) => {
    const { server, store, dir } = await setup(t);
    for (const target of [dir, store.dir, path.join(store.dir, "..", "settings"), os.homedir(), ""]) {
        assert.equal((await post(server, "/api/reveal", { path: target })).status, 400, target);
    }
});

test("ask needs a question and a connected session, then sends the drawing to Copilot", async (t) => {
    const ctx = await setup(t);
    const { server, doc } = ctx;
    assert.equal((await post(server, "/api/ask", { drawingId: doc.id, text: "  " })).status, 400);
    assert.equal((await post(server, "/api/ask", { drawingId: doc.id, text: "Explain this" })).status, 503);

    const sent = [];
    ctx.session = { send: async (message) => sent.push(message) };
    const res = await post(server, "/api/ask", { drawingId: doc.id, text: "Explain this", png: "iVBORw0KGgo=" });
    assert.equal(res.status, 200);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].displayPrompt, "Explain this");
    assert.ok(sent[0].prompt.startsWith("Explain this"));
    assert.ok(sent[0].prompt.includes(`instanceId "${PANEL}"`));
    assert.deepEqual(sent[0].attachments.map((a) => a.mimeType), ["image/png"]);

    ctx.session = {
        send: async () => {
            throw new Error("offline");
        },
    };
    const failed = await post(server, "/api/ask", { drawingId: doc.id, text: "Explain this" });
    assert.equal(failed.status, 502);
    assert.match(failed.json.error, /offline/);
});

test("live updates reach the other panels, not the one that made the change", async (t) => {
    const { server, doc } = await setup(t);
    const events = await listen(t, server, "me");
    await post(server, "/api/ops", { clientId: "me", drawingId: doc.id, ops: { upserts: [rect("a")] } });
    await post(server, "/api/ops", { clientId: "someone-else", drawingId: doc.id, ops: { upserts: [rect("b", 200)] } });
    const update = await events.next("doc");
    assert.equal(update.drawing.rev, 2);
    assert.equal(update.origin, "someone-else");
});

test("a drawing that cannot be saved is reported to its panel until a save works", async (t) => {
    const { server, store, doc } = await setup(t);
    await store.flush();
    const events = await listen(t, server);
    // A folder where the drawing's file should be makes every write fail.
    const file = store.filePath(doc.id);
    await rm(file, { force: true });
    await mkdir(file);
    await writeFile(path.join(file, "keep"), "");

    store.replace(doc.id, [rect("a")], "test");
    await assert.rejects(store.flush(), { code: "save_failed" });
    const failed = await events.next("save");
    assert.equal(failed.drawingId, doc.id);
    assert.ok(failed.error);
    assert.equal((await get(server, apiPath(server, "/api/state"))).json.drawing.saveError, failed.error);

    await rm(file, { recursive: true, force: true });
    await store.flush();
    assert.deepEqual(await events.next("save"), { drawingId: doc.id, error: null });
    assert.equal((await get(server, apiPath(server, "/api/state"))).json.drawing.saveError, null);
    assert.deepEqual(JSON.parse(await readFile(file, "utf8")).elements.map((e) => e.id), ["a"]);
});
