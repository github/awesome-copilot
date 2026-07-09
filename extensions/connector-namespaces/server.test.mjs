// Guards for the cross-site request gate on the loopback API server.
//
// Run: node --test .github/extensions/connector-namespaces/server.test.mjs
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

import { isCrossSiteRequest } from "./server.mjs";

// Minimal request stub: only headers matter to the gate.
function req(headers) {
    return { headers };
}

test("same-origin Origin (our own loopback UI) is allowed", () => {
    const r = req({ host: "127.0.0.1:54321", origin: "http://127.0.0.1:54321" });
    assert.equal(isCrossSiteRequest(r), false);
});

test("no headers at all (test harness / non-browser client) is allowed", () => {
    assert.equal(isCrossSiteRequest(req({})), false);
});

test("non-web-scheme Origin (host webview) is allowed", () => {
    // Some app webviews send Origin like "vscode-webview://..." or "app://..."
    // custom schemes. Those aren't a browsable web page driving a CSRF, so we
    // don't block them; only http(s) foreign origins and opaque `null` origins
    // are treated as hostile.
    const r = req({ host: "127.0.0.1:54321", origin: "app://obsidian.md" });
    assert.equal(isCrossSiteRequest(r), false);
});

test("opaque null Origin (sandboxed iframe / data: URI) is blocked", () => {
    // Browsers send the literal string "null" as Origin from sandboxed iframes
    // (<iframe sandbox="allow-scripts">), data:/blob: documents, and some
    // cross-origin redirect chains. That's exactly the opaque context a CSRF
    // attacker scripts from, and never our real top-level http panel (which
    // sends Origin: http://<host>), so we treat it as hostile.
    const r = req({ host: "127.0.0.1:54321", origin: "null" });
    assert.equal(isCrossSiteRequest(r), true);
});

test("foreign https Origin (a real web page) is blocked", () => {
    const r = req({ host: "127.0.0.1:54321", origin: "https://evil.example.com" });
    assert.equal(isCrossSiteRequest(r), true);
});

test("foreign http Origin on a different loopback port is blocked", () => {
    // A different local app on another 127.0.0.1 port is still cross-origin to us.
    const r = req({ host: "127.0.0.1:54321", origin: "http://127.0.0.1:9999" });
    assert.equal(isCrossSiteRequest(r), true);
});

test("Sec-Fetch-Site: cross-site (no Origin) is blocked", () => {
    const r = req({ host: "127.0.0.1:54321", "sec-fetch-site": "cross-site" });
    assert.equal(isCrossSiteRequest(r), true);
});

test("Sec-Fetch-Site: same-site (no Origin) is blocked", () => {
    // Our legit UI is same-ORIGIN (Sec-Fetch-Site: same-origin). A same-site but
    // not same-origin request would be another local app on a sibling port —
    // exactly what we want to keep out.
    const r = req({ host: "127.0.0.1:54321", "sec-fetch-site": "same-site" });
    assert.equal(isCrossSiteRequest(r), true);
});

test("Sec-Fetch-Site: same-origin (no Origin) is allowed", () => {
    const r = req({ host: "127.0.0.1:54321", "sec-fetch-site": "same-origin" });
    assert.equal(isCrossSiteRequest(r), false);
});
