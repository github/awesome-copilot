import { createServer } from "node:http";
import { readFile, mkdir, rename, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { DIRECTIONS, move, newGame, slide, undo, validateSave, viewState } from "./game.mjs";

const assets = new Map([
    ["/", ["index.html", "text/html; charset=utf-8"]],
    ["/app.mjs", ["app.mjs", "text/javascript; charset=utf-8"]],
    ["/style.css", ["style.css", "text/css; charset=utf-8"]],
]);
const root = dirname(fileURLToPath(import.meta.url));

export async function createGameStore(savePath) {
    let state;
    try {
        state = validateSave(JSON.parse(await readFile(savePath, "utf8")));
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
        state = newGame();
    }
    let queue = Promise.resolve();
    const stream = randomUUID();
    let update = { stream, revision: 0, motion: null };
    const snapshot = () => ({ ...viewState(state), update });
    const listeners = new Set();
    async function persist(next) {
        await mkdir(dirname(savePath), { recursive: true });
        const temporary = `${savePath}.${randomUUID()}.tmp`;
        try {
            await writeFile(temporary, JSON.stringify(next), { flag: "wx" });
            await rename(temporary, savePath);
        } finally {
            await rm(temporary, { force: true });
        }
    }
    await persist(state);
    return {
        snapshot,
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        execute(action, direction) {
            const result = queue.then(async () => {
                let next;
                if (action === "move" && DIRECTIONS.includes(direction)) next = move(state, direction);
                else if (action === "undo") next = undo(state);
                else if (action === "new") next = newGame(state.best);
                else throw new Error("Invalid command.");
                if (next !== state) {
                    const motion = action === "move" ? slide(state.board, direction) : null;
                    await persist(next);
                    update = {
                        stream,
                        revision: update.revision + 1,
                        motion: motion ? {
                            from: state.board,
                            movements: motion.movements,
                            merges: motion.merges,
                        } : null,
                    };
                    state = next;
                    for (const listener of listeners) listener(snapshot());
                }
                return snapshot();
            });
            // A failed write is returned to its caller, without poisoning the command queue.
            queue = result.then(() => undefined, () => undefined);
            return result;
        },
    };
}

export async function startGameServer(store) {
    const token = randomUUID();
    const clients = new Set();
    const unsubscribe = store.subscribe(state => {
        for (const client of clients) client.write(`data: ${JSON.stringify(state)}\n\n`);
    });
    let origin;
    function json(response, status, value) {
        response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify(value));
    }
    const server = createServer(async (request, response) => {
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("Referrer-Policy", "no-referrer");
        if (request.headers.host !== new URL(origin).host) {
            json(response, 403, { error: "Host not allowed." });
            return;
        }
        const url = new URL(request.url, origin);
        if (url.searchParams.get("token") !== token) {
            json(response, 403, { error: "Unauthorized access." });
            return;
        }
        try {
            if (request.method === "GET" && assets.has(url.pathname)) {
                const [file, type] = assets.get(url.pathname);
                const body = await readFile(join(root, file));
                response.writeHead(200, { "Content-Type": type });
                response.end(body);
            } else if (request.method === "GET" && url.pathname === "/state") {
                json(response, 200, store.snapshot());
            } else if (request.method === "GET" && url.pathname === "/events") {
                response.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    Connection: "keep-alive",
                });
                response.write(`data: ${JSON.stringify(store.snapshot())}\n\n`);
                clients.add(response);
                request.on("close", () => clients.delete(response));
            } else if (request.method === "POST" && url.pathname === "/command") {
                if ((request.headers.origin && request.headers.origin !== origin)
                    || request.headers["content-type"] !== "application/json") {
                    json(response, 403, { error: "Origin or content type not allowed." });
                    return;
                }
                let body = "";
                for await (const chunk of request) {
                    body += chunk;
                    if (body.length > 1024) {
                        json(response, 413, { error: "Request too large." });
                        return;
                    }
                }
                let command;
                try { command = JSON.parse(body); }
                catch { json(response, 400, { error: "Invalid JSON." }); return; }
                if (!command || !["move", "undo", "new"].includes(command.action)
                    || (command.action === "move" && !DIRECTIONS.includes(command.direction))) {
                    json(response, 400, { error: "Invalid command." });
                    return;
                }
                json(response, 200, await store.execute(command.action, command.direction));
            } else {
                json(response, 404, { error: "Resource not found." });
            }
        } catch (error) {
            process.stderr.write(`[2048] ${error.stack ?? error}\n`);
            if (!response.headersSent) json(response, 500, { error: "Game or save error. Please try again." });
            else response.end();
        }
    });
    try {
        await new Promise((resolve, reject) => {
            server.once("error", reject);
            server.listen(0, "127.0.0.1", resolve);
        });
    } catch (error) {
        unsubscribe();
        throw error;
    }
    origin = `http://127.0.0.1:${server.address().port}`;
    return {
        url: `${origin}/?token=${token}`,
        async close() {
            unsubscribe();
            for (const client of clients) client.end();
            clients.clear();
            const closed = new Promise((resolve, reject) =>
                server.close(error => error ? reject(error) : resolve()));
            server.closeAllConnections();
            await closed;
        },
    };
}
