import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDeckStore, emptyDeck } from "./store.mjs";
import { createOptions } from "./provider.mjs";
import { startServer } from "./server.mjs";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

async function setup(t, options = {}) {
    const directory = await mkdtemp(join(tmpdir(), "slides-integration-"));
    const store = createDeckStore(directory);
    const server = await startServer({ store, deckId: "test", ...options });
    t.after(async () => { await server.close(); await rm(directory, { recursive: true, force: true }); });
    const send = (route, body, extra = {}) => fetch(`${server.origin}${route}?token=${server.token}`, {
        method: "POST", headers: { Origin: server.origin, "Content-Type": "application/json", ...extra }, body: JSON.stringify(body),
    });
    return { store, server, send, directory };
}
const sample = () => ({ ...emptyDeck("test"), slides: [
    { id: "first", title: "First", notes: "Notes", elements: [{ id: "text", type: "text", x: 40, y: 40, w: 600, h: 180, text: "Hello" }] },
    { id: "second", title: "Second", elements: [] },
] });

test("HTTP authorization, same-origin writes, revisions and persistence", async (t) => {
    const { send, server, store } = await setup(t);
    assert.equal((await fetch(`${server.origin}/state`)).status, 403);
    assert.equal((await send("/save", { expectedVersion: 0, deck: sample() }, { Origin: "https://example.com" })).status, 403);
    const result = await send("/save", { expectedVersion: 0, deck: sample() });
    assert.equal(result.status, 200);
    assert.equal((await result.json()).version, 1);
    assert.equal((await send("/save", { expectedVersion: 0, deck: sample() })).status, 409);
    assert.equal((await store.get("test")).slides[0].notes, "Notes");
    const invalid = sample(); invalid.slides[0].elements[0].type = "script";
    assert.equal((await send("/save", { expectedVersion: 1, deck: invalid })).status, 400);
    assert.equal((await store.get("test")).version, 1);
});

test("window readiness crosses HTTP clients, is launch-specific and does not change the deck", async (t) => {
    const { server, store } = await setup(t);
    const saved = await store.replace("test", 0, sample());
    const launchId = `window-${randomUUID()}`, otherId = `window-${randomUUID()}`;
    const status = async (id) => (await fetch(`${server.origin}/window-status/${id}?token=${server.token}`)).json();
    assert.equal((await fetch(`${server.origin}/window-status/${launchId}`)).status, 403);
    assert.equal((await fetch(`${server.origin}/window-status/invalid?token=${server.token}`)).status, 400);
    assert.equal((await status(launchId)).opened, false);
    const controller = new AbortController();
    const response = await fetch(`${server.origin}/events?token=${server.token}&launch=${launchId}`, { signal: controller.signal });
    try {
        assert.equal(response.status, 200);
        assert.equal((await status(launchId)).opened, true);
        assert.equal((await status(otherId)).opened, false);
        assert.deepEqual(await store.get("test"), saved);
    } finally { controller.abort(); }
    for (let attempt = 0; attempt < 20 && (await status(launchId)).opened; attempt++) await delay(25);
    assert.equal((await status(launchId)).opened, false, "Closed windows cannot confirm another launch");
});

test("partial actions preserve other slides and comments; reorder is an exact permutation", async (t) => {
    const { store } = await setup(t);
    await store.replace("test", 0, sample());
    const options = createOptions(store);
    const invoke = (name, input) => options.actions.find((a) => a.name === name).handler({ instanceId: "check", input: { deckId: "test", ...input } });
    const deck = await invoke("get_deck");
    const changed = await invoke("update_slides", { expectedVersion: 1, slides: [{ ...deck.slides[0], title: "Revised" }] });
    assert.deepEqual(changed.slides[1], deck.slides[1]);
    assert.equal(changed.slides[0].notes, "Notes");
    await assert.rejects(invoke("reorder_slides", { expectedVersion: 2, slideIds: ["first", "first"] }), { code: "invalid_deck" });
    const reordered = await invoke("reorder_slides", { expectedVersion: 2, slideIds: ["second", "first"] });
    assert.equal(reordered.slides[0].id, "second");
});

test("comments require an explicit request; duplicate delivery is rejected", async (t) => {
    const sent = [];
    const { store, send } = await setup(t, { sendPrompt: async (prompt) => sent.push(prompt) });
    const deck = sample();
    deck.comments = [{ id: "comment", slideId: "first", text: "Make the title clearer" }];
    await store.replace("test", 0, deck);
    assert.equal(sent.length, 0);
    const result = await send("/request", { expectedVersion: 1, commentId: "comment" });
    assert.equal(result.status, 200);
    const saved = await result.json();
    assert.equal(saved.comments[0].status, "sent");
    assert.equal(sent.length, 1);
    assert.match(sent[0], /Make the title clearer/);
    assert.equal((await send("/request", { expectedVersion: saved.version, commentId: "comment" })).status, 400);
    assert.equal(sent.length, 1);
});

test("unconfirmed delivery remains explicit and is not retried", async (t) => {
    const { store, send } = await setup(t, { sendPrompt: async () => { throw new Error("offline"); }, log: () => {} });
    const deck = sample(); deck.comments = [{ id: "comment", slideId: "first", text: "Request" }];
    await store.replace("test", 0, deck);
    const response = await send("/request", { expectedVersion: 1, commentId: "comment" });
    assert.equal((await response.json()).comments[0].status, "unknown");
});

test("invalid paths and corrupt persistence fail instead of appearing empty", async (t) => {
    const { store, directory } = await setup(t);
    await assert.rejects(store.get("../bad"), { code: "invalid_deck_id" });
    await assert.rejects(store.replace("test", 0, { ...sample(), schemaVersion: 999 }), { code: "invalid_deck" });
    await writeFile(join(directory, "test.json"), "{bad");
    await assert.rejects(store.get("test"), { code: "corrupt_deck" });
});

test("concurrent writers cannot both commit the same expected revision", async (t) => {
    const { store, directory } = await setup(t);
    const other = createDeckStore(directory);
    const results = await Promise.allSettled([store.replace("test", 0, sample()), other.replace("test", 0, sample())]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal((await store.get("test")).version, 1);
});

test("Canvas opens two views of the same durable deck and rehydrates after close", async (t) => {
    const { store } = await setup(t);
    const provider = createOptions(store);
    const open = (id) => provider.open({ instanceId: id, input: { deckId: "test" } });
    t.after(async () => { await provider.onClose({ instanceId: "one" }); await provider.onClose({ instanceId: "two" }); });
    const first = await open("one"), second = await open("two");
    assert.notEqual(first.url, second.url);
    assert.equal((await open("one")).url, first.url);
    await store.replace("test", 0, sample());
    await provider.onClose({ instanceId: "one" });
    const reopened = await open("one");
    const url = new URL(reopened.url);
    const result = await (await fetch(`${url.origin}/state?token=${url.hash.slice(1)}`)).json();
    assert.equal(result.version, 1);
});

test("Canvas input can force the UI language and the language modules are served", async (t) => {
    const { store } = await setup(t);
    const provider = createOptions(store);
    const ids = ["auto", "english", "japanese"];
    t.after(async () => { for (const id of ids) await provider.onClose({ instanceId: id }); });
    const open = (instanceId, locale) => provider.open({ instanceId, input: { deckId: "test", ...(locale && { locale }) } });
    const [auto, english, japanese] = [await open("auto", "auto"), await open("english", "en"), await open("japanese", "ja")];
    assert.equal(new URL(auto.url).search, "");
    assert.equal(new URL(english.url).search, "?lang=en");
    assert.equal(new URL(japanese.url).search, "?lang=ja");
    const url = new URL(japanese.url);
    assert.match(url.hash, /^#[0-9a-f]{48}$/);
    assert.equal(new URL((await open("auto", "ja")).url).origin, new URL(auto.url).origin);
    for (const path of ["/i18n.mjs", "/locale-ja.mjs"]) {
        const response = await fetch(`${url.origin}${path}`);
        assert.equal(response.status, 200);
        assert.match(response.headers.get("content-type"), /javascript/);
        assert.match(await response.text(), /export/);
    }
    assert.equal((await fetch(`${url.origin}/state`)).status, 403);
    assert.deepEqual(provider.inputSchema.properties.locale.enum, ["auto", "en", "ja"]);
    assert.ok(provider.actions.every((action) => !action.inputSchema.properties.locale));
});
