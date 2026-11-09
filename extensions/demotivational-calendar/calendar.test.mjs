import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { today, startCalendarServer } from "./server.mjs";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const quotes = JSON.parse(html.match(/<script id="quotes" type="application\/json">([\s\S]*?)<\/script>/)[1]);

test("all 366 dates have unique original English quotes", () => {
    assert.deepEqual(quotes.map(month => month.length), [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
    const all = quotes.flat();
    assert.equal(all.length, 366);
    assert.equal(new Set(all).size, 366);
    assert.ok(all.every(quote => typeof quote === "string" && quote.length > 15 && !/\b20\d{2}\b/.test(quote)));
});

test("same date has the same quote regardless of year", () => {
    for (let month = 0; month < 12; month++) {
        for (let day = 1; day <= quotes[month].length; day++) {
            const page = today(new Date(2024, month, day, 12));
            assert.equal(page.quote, quotes[month][day - 1]);
            assert.equal(page.day, day);
            assert.deepEqual(Object.keys(page), ["day", "month", "quote"]);
            if (month !== 1 || day !== 29) {
                assert.deepEqual(page, today(new Date(2031, month, day, 12)));
            }
        }
    }
});

test("self-contained renderer and local server routes work", async () => {
    const panel = await startCalendarServer();
    try {
        assert.match(panel.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
        const response = await fetch(panel.url);
        assert.equal(response.status, 200);
        assert.equal(await response.text(), html);
        assert.ok(response.headers.get("content-security-policy"));
        assert.equal((await fetch(`${panel.url}today`)).status, 200);
        assert.equal((await fetch(`${panel.url}missing`)).status, 404);
        assert.equal((await fetch(panel.url, { method: "POST" })).status, 405);
        assert.doesNotMatch(html, /(?:src|href)="https?:/);
    } finally {
        await panel.close();
    }
});
