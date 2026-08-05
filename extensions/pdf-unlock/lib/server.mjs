// Local HTTP surface for the pdf-unlock canvas. One loopback server per canvas
// instance; every /api/* call must present the instance's random token, which
// only ever reaches the renderer through the inlined HTML.

import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    capabilities,
    collectPdfs,
    inspect,
    pickFilesNatively,
    resolveDroppedFile,
    unlockAndReplace,
} from "./pdf.mjs";
import { getInstance, removeFiles, setOptions, snapshot, touch, upsertFile } from "./store.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UI_FILE = path.resolve(HERE, "..", "ui", "index.html");

async function readBody(req) {
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
        total += chunk.length;
        if (total > 2_000_000) throw new Error("Request body too large.");
        chunks.push(chunk);
    }
    if (chunks.length === 0) return {};
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
}

async function addPaths(instance, rawPaths, { recursive, password }) {
    const discovered = [];
    for (const raw of rawPaths) {
        const found = await collectPdfs(raw, { recursive });
        if (found.length === 0) discovered.push(raw);
        else discovered.push(...found);
    }

    const added = [];
    for (const file of [...new Set(discovered)]) {
        const entry = await inspect(file, password ?? "");
        added.push(upsertFile(instance, { ...entry, result: null }));
    }
    return added;
}

const routes = {
    async capabilities() {
        return capabilities();
    },

    async state(instance) {
        return snapshot(instance);
    },

    async options(instance, body) {
        setOptions(instance, body.options ?? {});
        return snapshot(instance);
    },

    async add(instance, body) {
        const paths = (body.paths ?? []).filter(Boolean);
        const added = await addPaths(instance, paths, {
            recursive: body.recursive ?? instance.options.recursive,
            password: body.password,
        });
        return { added, state: snapshot(instance) };
    },

    async browse(instance, body) {
        const picked = await pickFilesNatively();
        if (!picked.ok) return { ok: false, error: picked.error, state: snapshot(instance) };
        await addPaths(instance, picked.paths, {
            recursive: instance.options.recursive,
            password: body.password,
        });
        return { ok: true, cancelled: picked.cancelled ?? false, state: snapshot(instance) };
    },

    async resolveDrop(instance, body) {
        const unresolved = [];
        const paths = [];
        for (const item of body.files ?? []) {
            if (item.path) {
                paths.push(item.path);
                continue;
            }
            const matches = await resolveDroppedFile(item);
            if (matches.length === 1) paths.push(matches[0]);
            else unresolved.push({ ...item, candidates: matches });
        }
        if (paths.length > 0) {
            await addPaths(instance, paths, {
                recursive: instance.options.recursive,
                password: body.password,
            });
        }
        return { resolved: paths, unresolved, state: snapshot(instance) };
    },

    async refresh(instance, body) {
        for (const file of [...instance.files.keys()]) {
            const entry = await inspect(file, body.password ?? "");
            upsertFile(instance, { ...entry, result: null });
        }
        return snapshot(instance);
    },

    async remove(instance, body) {
        removeFiles(instance, body.paths ?? []);
        return snapshot(instance);
    },

    async clear(instance) {
        instance.files.clear();
        instance.lastRun = null;
        touch(instance);
        return snapshot(instance);
    },

    async unlock(instance, body) {
        const target = body.path;
        if (!target || !instance.files.has(target)) {
            return { ok: false, error: "That file is not in the queue." };
        }
        instance.busy = true;
        touch(instance);
        try {
            const result = await unlockAndReplace(target, {
                password: body.password ?? "",
                method: body.method ?? instance.options.method,
                backup: body.backup ?? instance.options.backup,
                dryRun: body.dryRun ?? instance.options.dryRun,
            });
            const refreshed = result.ok
                ? await inspect(result.path, "")
                : instance.files.get(target);
            const entry = upsertFile(instance, {
                ...refreshed,
                path: target,
                result,
            });
            instance.lastRun = new Date().toISOString();
            return { ok: result.ok, result, entry };
        } finally {
            instance.busy = false;
            touch(instance);
        }
    },

    async reveal(instance, body) {
        const { reveal } = await import("./platform.mjs");
        if (!body.path) return { ok: false, error: "No path supplied." };
        return reveal(body.path);
    },
};

export async function startServer(instanceId) {
    const instance = getInstance(instanceId);
    const token = randomUUID();
    const template = await fs.readFile(UI_FILE, "utf8");

    const server = createServer(async (req, res) => {
        try {
            const url = new URL(req.url ?? "/", "http://127.0.0.1");

            if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
                const html = template
                    .replace("__PDF_UNLOCK_TOKEN__", token)
                    .replace("__PDF_UNLOCK_INSTANCE__", instanceId);
                res.writeHead(200, {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "no-store",
                });
                res.end(html);
                return;
            }

            if (req.method === "GET" && url.pathname === "/favicon.ico") {
                res.writeHead(204).end();
                return;
            }

            if (req.method === "POST" && url.pathname.startsWith("/api/")) {
                if (req.headers["x-pdf-unlock-token"] !== token) {
                    send(res, 403, { error: "Forbidden" });
                    return;
                }
                const name = url.pathname.slice("/api/".length);
                const route = routes[name];
                if (!route) {
                    send(res, 404, { error: `Unknown endpoint ${name}` });
                    return;
                }
                const body = await readBody(req);
                send(res, 200, await route(instance, body));
                return;
            }

            send(res, 404, { error: "Not found" });
        } catch (error) {
            send(res, 500, { error: error?.message ?? String(error) });
        }
    });

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            server.removeListener("error", reject);
            resolve();
        });
    });

    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, instance, url: `http://127.0.0.1:${port}/` };
}
