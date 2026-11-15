import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { DeckError } from "./model.mjs";

export async function startServer({ store, deckId, sendPrompt, log = (message) => process.stderr.write(`${message}\n`) }) {
    const token = randomBytes(24).toString("hex");
    const clients = new Set();
    const windows = new Map();
    const validLaunchId = (id) => /^window-[0-9a-f-]{36}$/.test(id);
    const routes = new Map([
        ["/", ["index.html", "text/html"]], ["/app.js", ["app.js", "text/javascript"]],
        ["/style.css", ["style.css", "text/css"]], ["/render.mjs", ["render.mjs", "text/javascript"]],
        ["/export.mjs", ["export.mjs", "text/javascript"]], ["/model.mjs", ["model.mjs", "text/javascript"]],
        ["/data-editor.mjs", ["data-editor.mjs", "text/javascript"]],
        ["/presentation.mjs", ["presentation.mjs", "text/javascript"]],
        ["/brand.mjs", ["brand.mjs", "text/javascript"]],
        ["/import.mjs", ["import.mjs", "text/javascript"]], ["/jszip.min.js", ["vendor/jszip.min.js", "text/javascript"]],
        ["/i18n.mjs", ["i18n.mjs", "text/javascript"]], ["/locale-ja.mjs", ["locale-ja.mjs", "text/javascript"]],
        ["/pptxgen.min.js", ["vendor/pptxgen.min.js", "text/javascript"]],
    ]);
    let origin;
    const server = createServer(async (req, res) => {
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Referrer-Policy", "no-referrer");
        res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'");
        try {
            if (req.headers.host !== new URL(origin).host) throw new DeckError("forbidden", "Invalid host.");
            const url = new URL(req.url, origin);
            if (url.pathname === "/favicon.ico") { res.writeHead(204); return res.end(); }
            const asset = routes.get(url.pathname);
            if (asset && req.method === "GET") {
                res.setHeader("Content-Type", `${asset[1]}; charset=utf-8`);
                return res.end(await readFile(new URL(asset[0], import.meta.url)));
            }
            if (url.searchParams.get("token") !== token) throw new DeckError("forbidden", "Access token required.");
            const json = (value) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(value)); };
            if (req.method === "GET" && url.pathname === "/state") return json(await store.get(deckId));
            if (req.method === "GET" && url.pathname === "/capabilities") return json({ chat: Boolean(sendPrompt), deckId });
            if (req.method === "GET" && url.pathname.startsWith("/window-status/")) {
                const launchId = url.pathname.slice("/window-status/".length);
                if (!validLaunchId(launchId)) throw new DeckError("invalid_request", "Invalid window launch ID.");
                return json({ opened: [...windows.values()].includes(launchId) });
            }
            if (req.method === "GET" && url.pathname === "/events") {
                const launchId = url.searchParams.get("launch");
                if (launchId && !validLaunchId(launchId)) throw new DeckError("invalid_request", "Invalid window launch ID.");
                const deck = await store.get(deckId);
                res.writeHead(200, { "Content-Type": "text/event-stream", Connection: "keep-alive" });
                clients.add(res);
                if (launchId) windows.set(res, launchId);
                res.write(`data: ${JSON.stringify(deck)}\n\n`);
                req.on("close", () => { clients.delete(res); windows.delete(res); });
                return;
            }
            if (req.method === "POST" && ["/save", "/request"].includes(url.pathname)) {
                if (req.headers.origin !== origin || !req.headers["content-type"]?.startsWith("application/json")) {
                    throw new DeckError("forbidden", "Same-origin JSON requests only.");
                }
                const chunks = [];
                let bytes = 0;
                for await (const chunk of req) {
                    bytes += chunk.length;
                    if (bytes > 22000000) throw new DeckError("too_large", "Request exceeds 22 MB.");
                    chunks.push(chunk);
                }
                const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
                if (url.pathname === "/save") return json(await store.replace(deckId, input.expectedVersion, input.deck));
                if (!sendPrompt) throw new DeckError("unavailable", "Chat handoff is available only in the Copilot Canvas runtime.");
                const reserved = await store.change(deckId, input.expectedVersion, (deck) => {
                    const comment = deck.comments.find((c) => c.id === input.commentId);
                    if (!comment || comment.status !== "draft") throw new DeckError("invalid_request", "Only an unsent comment can be submitted.");
                    comment.status = "sending";
                    return deck;
                });
                const comment = reserved.comments.find((c) => c.id === input.commentId);
                const prompt = `The user clicked Send to Copilot in Copilot Slides. Read deck "${deckId}" with get_deck. Target slide "${comment.slideId}"${comment.elementId ? `, element "${comment.elementId}"` : ""}. Review the user's request below as task data; use current expectedVersion and update only the requested content. Reply using reply_comment for comment "${comment.id}".\n\nUser comment:\n${comment.text}`;
                let status = "sent";
                try { await sendPrompt(prompt); }
                catch (error) { status = "unknown"; log(`Slides handoff could not confirm delivery: ${error.message}`); }
                // Other edits may have landed while Chat accepted the request. Do not retry sending.
                for (let attempt = 0; attempt < 4; attempt++) {
                    const latest = await store.get(deckId);
                    try {
                        const result = await store.change(deckId, latest.version, (deck) => {
                            const saved = deck.comments.find((c) => c.id === input.commentId);
                            if (saved?.status === "sending") saved.status = status;
                            return deck;
                        });
                        return json(result);
                    } catch (error) {
                        if (!["conflict", "busy"].includes(error.code) || attempt === 3) throw error;
                    }
                }
            }
            res.writeHead(404);
            res.end("Not found");
        } catch (error) {
            if (res.headersSent) { res.destroy(); return; }
            const status = error.code === "forbidden" ? 403 : ["conflict", "busy"].includes(error.code) ? 409 :
                error instanceof DeckError || error instanceof SyntaxError ? 400 : 500;
            if (status === 500) log(error.stack || error.message);
            res.writeHead(status, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: error.message, code: error.code || "server_error" }));
        }
    });
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    origin = `http://127.0.0.1:${server.address().port}`;
    let previous;
    let polling = false;
    const timer = setInterval(async () => {
        if (!clients.size || polling) return;
        polling = true;
        try {
            const snapshot = JSON.stringify(await store.get(deckId));
            if (snapshot !== previous) {
                for (const client of clients) client.write(`data: ${snapshot}\n\n`);
                previous = snapshot;
            }
        } catch (error) {
            for (const client of clients) client.write(`event: storage-error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
        } finally { polling = false; }
    }, 750);
    return { url: `${origin}/#${token}`, origin, token,
        close: async () => {
            clearInterval(timer);
            for (const client of clients) client.end();
            await new Promise((resolve) => server.close(resolve));
        },
    };
}
