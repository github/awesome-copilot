import assert from "node:assert/strict";
import { test } from "node:test";
import { readRequestBody, startInstanceServer } from "./http-server.mjs";

test("readRequestBody decodes UTF-8 after collecting every chunk", async () => {
    const body = Buffer.from(JSON.stringify({ answer: "I can explain \ud83e\udde0 and \u6f22\u5b57." }));
    const emojiStart = body.indexOf(Buffer.from("\ud83e\udde0"));

    async function* chunks() {
        yield body.subarray(0, emojiStart + 2);
        yield body.subarray(emojiStart + 2);
    }

    assert.equal(await readRequestBody(chunks()), body.toString("utf8"));
});

test("readRequestBody rejects payloads over the byte limit", async () => {
    async function* chunks() {
        yield Buffer.alloc(3);
        yield Buffer.alloc(2);
    }

    assert.equal(await readRequestBody(chunks(), 4), null);
});

test("readRequestBody accepts an 8,000-character UTF-8 answer", async () => {
    const body = JSON.stringify({ type: "submit-answer", answer: "漢".repeat(8000) });

    async function* chunks() {
        yield Buffer.from(body);
    }

    assert.equal(await readRequestBody(chunks()), body);
});

test("instance APIs require their capability token", async (t) => {
    const events = [];
    const server = await startInstanceServer("test-instance", () => ({ view: "domains" }), (event) => {
        events.push(event);
        return { ok: true };
    });
    t.after(() => server.close());

    const stateUrl = new URL(server.url);
    stateUrl.pathname = "/state";
    const unauthorizedStateUrl = new URL(stateUrl);
    unauthorizedStateUrl.search = "";
    assert.equal((await fetch(unauthorizedStateUrl)).status, 403);
    assert.deepEqual(await (await fetch(stateUrl)).json(), { view: "domains" });

    const eventsUrl = new URL(server.url);
    eventsUrl.pathname = "/events";
    eventsUrl.search = "";
    assert.equal((await fetch(eventsUrl)).status, 403);

    const eventUrl = new URL(server.url);
    eventUrl.pathname = "/event";
    const unauthorizedEventUrl = new URL(eventUrl);
    unauthorizedEventUrl.search = "";
    assert.equal(
        (await fetch(unauthorizedEventUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "compile-report" }),
        })).status,
        403,
    );
    assert.equal(
        (await fetch(eventUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "compile-report" }),
        })).status,
        202,
    );
    assert.deepEqual(events, [{ type: "compile-report" }]);
});
