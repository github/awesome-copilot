import assert from "node:assert/strict";
import { test } from "node:test";
import { readRequestBody } from "./http-server.mjs";

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
