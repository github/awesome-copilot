// Guards for the cross-site request gate on the loopback API server.
//
// Run: node --test extensions/connector-namespaces/server.test.mjs
//
// The server binds an ephemeral 127.0.0.1 port and JSON-parses every POST body,
// so without a check any web page the user visits could script-drive their ARM
// operations (CSRF). isCrossSiteRequest is the gate: it blocks a POST /api/*
// only when the request carries an explicit foreign-origin signal, and lets the
// panel's own same-origin fetches — and header-less callers like this test
// harness — through untouched. Importing server.mjs has no side effects at eval;
// the HTTP server only starts when startServer() is called.

import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";

import {
    getServerConfig,
    hasCapabilityToken,
    isCanonicalHost,
    isCrossSiteRequest,
    listenOnLoopback,
    parseBody,
    requiresCapabilityToken,
    runIdempotentOperation,
    startServer,
    stopServer,
} from "./server.mjs";
import { isValidConfig } from "./state.mjs";

// Minimal request stub: only headers matter to the gate.
function req(headers) {
    return { headers };
}

test("same-origin Origin (our own loopback UI) is allowed", () => {
    const r = req({ host: "127.0.0.1:54321", origin: "http://127.0.0.1:54321" });
    assert.equal(isCrossSiteRequest(r, "http://127.0.0.1:54321"), false);
});

test("no headers at all (test harness / non-browser client) is allowed", () => {
    assert.equal(isCrossSiteRequest(req({}), "http://127.0.0.1:54321"), false);
});

test("non-web-scheme Origin (host webview) is allowed", () => {
    // Some app webviews send Origin like "vscode-webview://..." or "app://..."
    // custom schemes. Those aren't a browsable web page driving a CSRF, so we
    // don't block them; only http(s) foreign origins and opaque `null` origins
    // are treated as hostile.
    const r = req({ host: "127.0.0.1:54321", origin: "app://obsidian.md" });
    assert.equal(isCrossSiteRequest(r, "http://127.0.0.1:54321"), false);
});

test("opaque null Origin (sandboxed iframe / data: URI) is blocked", () => {
    // Browsers send the literal string "null" as Origin from sandboxed iframes
    // (<iframe sandbox="allow-scripts">), data:/blob: documents, and some
    // cross-origin redirect chains. That's exactly the opaque context a CSRF
    // attacker scripts from, and never our real top-level http panel (which
    // sends Origin: http://<host>), so we treat it as hostile.
    const r = req({ host: "127.0.0.1:54321", origin: "null" });
    assert.equal(isCrossSiteRequest(r, "http://127.0.0.1:54321"), true);
});

test("foreign https Origin (a real web page) is blocked", () => {
    const r = req({ host: "127.0.0.1:54321", origin: "https://evil.example.com" });
    assert.equal(isCrossSiteRequest(r, "http://127.0.0.1:54321"), true);
});

test("foreign http Origin on a different loopback port is blocked", () => {
    // A different local app on another 127.0.0.1 port is still cross-origin to us.
    const r = req({ host: "127.0.0.1:54321", origin: "http://127.0.0.1:9999" });
    assert.equal(isCrossSiteRequest(r, "http://127.0.0.1:54321"), true);
});

test("same-origin check does not trust a DNS-rebound Host header", () => {
    const r = req({ host: "attacker.example:54321", origin: "http://attacker.example:54321" });
    assert.equal(isCanonicalHost(r, "127.0.0.1:54321"), false);
    assert.equal(isCrossSiteRequest(r, "http://127.0.0.1:54321"), true);
});

test("Sec-Fetch-Site: cross-site (no Origin) is blocked", () => {
    const r = req({ host: "127.0.0.1:54321", "sec-fetch-site": "cross-site" });
    assert.equal(isCrossSiteRequest(r, "http://127.0.0.1:54321"), true);
});

test("Sec-Fetch-Site: same-site (no Origin) is blocked", () => {
    // Our legit UI is same-ORIGIN (Sec-Fetch-Site: same-origin). A same-site but
    // not same-origin request would be another local app on a sibling port —
    // exactly what we want to keep out.
    const r = req({ host: "127.0.0.1:54321", "sec-fetch-site": "same-site" });
    assert.equal(isCrossSiteRequest(r, "http://127.0.0.1:54321"), true);
});

test("Sec-Fetch-Site: same-origin (no Origin) is allowed", () => {
    const r = req({ host: "127.0.0.1:54321", "sec-fetch-site": "same-origin" });
    assert.equal(isCrossSiteRequest(r, "http://127.0.0.1:54321"), false);
});

test("state-changing and OAuth status routes require a capability token", () => {
    assert.equal(requiresCapabilityToken("/api/install"), true);
    assert.equal(requiresCapabilityToken("/oauth-status"), true);
    assert.equal(requiresCapabilityToken("/auth/callback/conn"), true);
    assert.equal(requiresCapabilityToken("/setup"), false);
});

test("capability token accepts the private header or OAuth callback query", () => {
    const token = "secret-token";
    assert.equal(
        hasCapabilityToken(req({ "x-connector-namespace-token": token }), new URL("http://127.0.0.1/api/state"), token),
        true,
    );
    assert.equal(
        hasCapabilityToken(req({}), new URL(`http://127.0.0.1/auth/callback/conn?cn_token=${token}`), token),
        true,
    );
    assert.equal(
        hasCapabilityToken(req({ "x-connector-namespace-token": "wrong" }), new URL("http://127.0.0.1/api/state"), token),
        false,
    );
    assert.equal(
        hasCapabilityToken(req({}), new URL(`http://127.0.0.1/api/state?cn_token=${token}`), token),
        false,
        "callback query tokens must not authorize API routes",
    );
    assert.equal(
        hasCapabilityToken(req({}), new URL(`http://127.0.0.1/oauth-status?cn_token=${token}`), token),
        false,
        "callback query tokens must not authorize OAuth polling",
    );
});

test("request bodies larger than 64 KiB are rejected", async () => {
    await assert.rejects(
        parseBody(Readable.from([Buffer.alloc(64 * 1024 + 1)])),
        (err) => err?.constructor?.name === "RequestBodyTooLargeError",
    );
});

test("saved namespace coordinates reject ARM path injection", () => {
    assert.equal(isValidConfig({
        subscriptionId: "f34b22a3-2202-4fb1-b040-1332bd928c84",
        resourceGroup: "jack-sandboxgroup-rg",
        gatewayName: "yeah-github-cli",
    }), true);
    assert.equal(isValidConfig({
        subscriptionId: "bad/value",
        resourceGroup: "rg",
        gatewayName: "gw",
    }), false);
});

test("idempotent mutations replay one in-flight result", async () => {
    const operations = new Map();
    let calls = 0;
    const start = async () => {
        calls++;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return { ok: true };
    };
    const [first, second] = await Promise.all([
        runIdempotentOperation(operations, "install:request", start),
        runIdempotentOperation(operations, "install:request", start),
    ]);
    assert.equal(calls, 1);
    assert.deepEqual(first, { ok: true });
    assert.deepEqual(second, { ok: true });
    assert.deepEqual(await runIdempotentOperation(operations, "install:request", start), { ok: true });
    assert.equal(calls, 1);
});

test("install rejects missing idempotency request ids before ARM work", async (t) => {
    const instanceId = `request-id-${Date.now()}`;
    t.after(() => stopServer(instanceId));
    const entry = await startServer(instanceId, {
        config: { subscriptionId: "sub", resourceGroup: "rg", gatewayName: "gw" },
    });
    const response = await fetch(`${entry.url}api/install`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-connector-namespace-token": entry.token,
        },
        body: JSON.stringify({ apiName: "test" }),
    });
    assert.deepEqual(await response.json(), { error: "invalid requestId" });
});

test("canvas servers keep independent active namespace configs", async (t) => {
    const a = `state-a-${Date.now()}`;
    const b = `state-b-${Date.now()}`;
    t.after(async () => Promise.all([stopServer(a), stopServer(b)]));

    const configA = { subscriptionId: "sub-a", resourceGroup: "rg-a", gatewayName: "gw-a" };
    const configB = { subscriptionId: "sub-b", resourceGroup: "rg-b", gatewayName: "gw-b" };
    await Promise.all([
        startServer(a, { config: configA }),
        startServer(b, { config: configB }),
    ]);

    assert.deepEqual(getServerConfig(a), configA);
    assert.deepEqual(getServerConfig(b), configB);

    // A rehydrate may carry a newer persisted default from panel B. Existing
    // panel A must retain its own active namespace.
    await startServer(a, { defaultConfig: configB });
    assert.deepEqual(getServerConfig(a), configA);
});

test("loopback listen rejects bind errors", async () => {
    const error = new Error("bind failed");
    const server = new EventEmitter();
    server.listen = () => queueMicrotask(() => server.emit("error", error));
    await assert.rejects(listenOnLoopback(server), error);
});
