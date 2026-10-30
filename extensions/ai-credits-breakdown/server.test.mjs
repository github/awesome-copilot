import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { startServer, stopServer } from "./server.mjs";

const ledger = { meta: { total: 1 }, facts: [] };

function request(base, pathname, { method = "GET", headers = {} } = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(pathname, base);
        const req = http.request(url, { method, headers }, (res) => {
            let body = "";
            res.setEncoding("utf8");
            res.on("data", (chunk) => { body += chunk; });
            res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
        });
        req.on("error", reject);
        req.end();
    });
}

async function withServer(options, run) {
    const entry = await startServer({ ports: [], ...options });
    try {
        await run(entry);
    } finally {
        await stopServer(entry);
    }
}

test("serves the page, script, styles and the ledger only under the secret prefix", async () => {
    await withServer({ getLedger: async () => ledger }, async ({ url, origin, prefix }) => {
        assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
        assert.ok(prefix.length > 20);

        const page = await request(url, url);
        assert.equal(page.status, 200);
        assert.match(page.body, /AI credits/);
        assert.match(page.headers["content-security-policy"], /default-src 'none'/);
        assert.match(page.headers["content-security-policy"], /connect-src 'self'/);
        assert.equal(page.headers["cache-control"], "no-store");

        for (const [name, type] of [["app.js", /javascript/], ["styles.css", /css/]]) {
            const asset = await request(url, `${prefix}${name}`);
            assert.equal(asset.status, 200, name);
            assert.match(asset.headers["content-type"], type);
        }

        const data = await request(url, `${prefix}data.json`);
        assert.equal(data.status, 200);
        assert.deepEqual(JSON.parse(data.body), ledger);

        assert.equal((await request(url, `${prefix}nope`)).status, 404);
        assert.equal((await request(url, `${prefix}__proto__`)).status, 404);
    });
});

test("rejects requests without the prefix, with another host or origin, or that are not GET", async () => {
    await withServer({ getLedger: async () => ledger }, async ({ url, prefix, origin }) => {
        assert.equal((await request(url, "/")).status, 403);
        assert.equal((await request(url, "/wrong-token/data.json")).status, 403);
        assert.equal((await request(url, `${prefix}data.json`, { headers: { Host: "evil.example" } })).status, 403);
        assert.equal((await request(url, `${prefix}data.json`, { headers: { Origin: "https://evil.example" } })).status, 403);
        assert.equal((await request(url, `${prefix}data.json`, { method: "POST" })).status, 403);
        assert.equal((await request(url, `${prefix}data.json`, { headers: { Origin: origin } })).status, 200);
    });
});

test("reports a failed build as JSON without crashing", async () => {
    const seen = [];
    await withServer({ getLedger: async () => { throw new Error("database is locked"); }, onError: (e) => seen.push(e.message) },
        async ({ url, prefix }) => {
            const res = await request(url, `${prefix}data.json`);
            assert.equal(res.status, 500);
            assert.deepEqual(JSON.parse(res.body), { error: "database is locked" });
            assert.deepEqual(seen, ["database is locked"]);
        });
});

test("each server gets its own secret prefix", async () => {
    await withServer({ getLedger: async () => ledger }, async (a) => {
        await withServer({ getLedger: async () => ledger }, async (b) => {
            assert.notEqual(a.prefix, b.prefix);
            assert.notEqual(a.origin, b.origin);
        });
    });
});
