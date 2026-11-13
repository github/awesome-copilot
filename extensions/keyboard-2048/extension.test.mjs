import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { startGameServer } from "./server.mjs";

let fixtureId = 0;
async function loadCanvas(t, dependencies) {
    const key = `__keyboard2048Test${++fixtureId}`;
    const fixture = globalThis[key] = { ...dependencies };
    const stub = source => `data:text/javascript,${encodeURIComponent(source)}`;
    const sdk = stub(`
        export const createCanvas = options => options;
        export class CanvasError extends Error {}
        export async function joinSession(options) {
            globalThis.${key}.canvas = options.canvases[0];
            return { workspacePath: "test-workspace" };
        }
    `);
    const server = stub(`
        export const { createGameStore, startGameServer } = globalThis.${key};
    `);
    const entry = new URL("./extension.mjs", import.meta.url);
    entry.searchParams.set("test", key);
    const hooks = registerHooks({
        resolve(specifier, context, next) {
            if (context.parentURL === entry.href) {
                if (specifier === "@github/copilot-sdk/extension") return { url: sdk, shortCircuit: true };
                if (specifier === "./server.mjs") return { url: server, shortCircuit: true };
            }
            return next(specifier, context);
        },
    });
    t.after(() => { hooks.deregister(); delete globalThis[key]; });
    await import(entry.href);
    return fixture.canvas;
}

test("overlapping opens share initialization and one server, which close releases", async t => {
    const ready = Promise.withResolvers();
    const initializing = Promise.withResolvers();
    let stores = 0;
    let servers = 0;
    let subscriptions = 0;
    const canvas = await loadCanvas(t, {
        createGameStore() {
            stores++;
            initializing.resolve();
            return ready.promise;
        },
        startGameServer(store) {
            servers++;
            return startGameServer(store);
        },
    });
    const ctx = { instanceId: "shared" };
    t.after(() => canvas.onClose(ctx));
    const first = canvas.open(ctx);
    const second = canvas.open(ctx);
    await initializing.promise;
    assert.equal(stores, 1);
    assert.equal(servers, 0);
    ready.resolve({
        snapshot: () => ({}),
        subscribe() {
            subscriptions++;
            return () => { subscriptions--; };
        },
    });
    const [a, b] = await Promise.all([first, second]);
    assert.equal(a.url, b.url);
    assert.equal(servers, 1);
    assert.equal(subscriptions, 1);
    assert.equal((await fetch(a.url)).status, 200);
    await canvas.onClose(ctx);
    assert.equal(subscriptions, 0);
    await assert.rejects(fetch(a.url));
});

test("failed store initialization rejects overlapping opens and permits retry", async t => {
    const ready = Promise.withResolvers();
    let stores = 0;
    let servers = 0;
    let closed = 0;
    const canvas = await loadCanvas(t, {
        createGameStore() { return ++stores === 1 ? ready.promise : Promise.resolve({}); },
        async startGameServer() {
            servers++;
            return { url: "http://127.0.0.1/retry", async close() { closed++; } };
        },
    });
    const ctx = { instanceId: "retry" };
    const first = assert.rejects(canvas.open(ctx), /save unavailable/);
    const second = assert.rejects(canvas.open(ctx), /save unavailable/);
    ready.reject(new Error("save unavailable"));
    await Promise.all([first, second]);
    const result = await canvas.open(ctx);
    assert.equal(result.url, "http://127.0.0.1/retry");
    assert.equal(stores, 2);
    assert.equal(servers, 1);
    await canvas.onClose(ctx);
    assert.equal(closed, 1);
});

test("close during initialization releases the pending server", async t => {
    const ready = Promise.withResolvers();
    let closed = 0;
    const canvas = await loadCanvas(t, {
        createGameStore: () => ready.promise,
        startGameServer: async () => ({
            url: "http://127.0.0.1/pending",
            async close() { closed++; },
        }),
    });
    const ctx = { instanceId: "pending" };
    const opening = canvas.open(ctx);
    const closing = canvas.onClose(ctx);
    assert.equal(closed, 0);
    ready.resolve({});
    await Promise.all([opening, closing]);
    assert.equal(closed, 1);
    await canvas.onClose(ctx);
    assert.equal(closed, 1);
});

test("a failed closed startup cannot evict a replacement panel", async t => {
    const ready = Promise.withResolvers();
    const starting = Promise.withResolvers();
    let servers = 0;
    let closed = 0;
    const canvas = await loadCanvas(t, {
        createGameStore: async () => ({}),
        startGameServer() {
            if (++servers === 1) {
                starting.resolve();
                return ready.promise;
            }
            return Promise.resolve({
                url: "http://127.0.0.1/replacement",
                async close() { closed++; },
            });
        },
    });
    const ctx = { instanceId: "replacement" };
    const opening = assert.rejects(canvas.open(ctx), /listen failed/);
    await starting.promise;
    const closing = assert.rejects(canvas.onClose(ctx), /listen failed/);
    const replacement = await canvas.open(ctx);
    ready.reject(new Error("listen failed"));
    await Promise.all([opening, closing]);
    assert.equal((await canvas.open(ctx)).url, replacement.url);
    assert.equal(servers, 2);
    await canvas.onClose(ctx);
    assert.equal(closed, 1);
});
