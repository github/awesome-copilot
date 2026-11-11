import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const quotes = JSON.parse(html.match(/<script id="quotes" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

export function today(now = new Date()) {
    return {
        day: now.getDate(),
        month: months[now.getMonth()],
        quote: quotes[now.getMonth()][now.getDate() - 1],
    };
}

export async function startCalendarServer() {
    const server = createServer((req, res) => {
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Content-Security-Policy",
            "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:");
        if (req.method !== "GET") {
            res.writeHead(405, { Allow: "GET" });
            res.end("Method not allowed");
        } else if (req.url === "/" || req.url?.startsWith("/?")) {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(html);
        } else if (req.url === "/today") {
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify(today()));
        } else {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Not found");
        }
    });
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            server.off("error", reject);
            resolve();
        });
    });
    return {
        url: `http://127.0.0.1:${server.address().port}/`,
        close: () => new Promise((resolve, reject) => {
            server.close(error => error ? reject(error) : resolve());
            server.closeIdleConnections();
        }),
    };
}
