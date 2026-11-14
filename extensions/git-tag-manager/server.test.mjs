import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./test-fixture.mjs";
import { startServer, stopServer } from "./server.mjs";
import { git } from "./git.mjs";
import http from "node:http";

test("HTTP transport rejects cross-origin/unauthorized writes and confirms prepared operations", async t => {
    const { manager, repository } = await fixture(t);
    const entry = await startServer(manager);
    t.after(() => stopServer(entry));
    const html = await (await fetch(entry.url)).text();
    const token = html.match(/name="canvas-token" content="([^"]+)"/)[1];
    const post = (route, body, headers = {}) => fetch(`${entry.url}/api/${route}`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-Canvas-Token": token, ...headers },
        body: JSON.stringify(body),
    });
    assert.equal((await post("prepare", { operation: "create", name: "ui-tag" }, { "X-Canvas-Token": "" })).status, 403);
    assert.equal((await post("prepare", { operation: "create", name: "ui-tag" }, { Origin: "https://evil.invalid" })).status, 403);
    const reboundStatus = await new Promise((resolve, reject) => {
        const request = http.get(`${entry.url}/api/state`, { headers: { Host: "evil.invalid" } }, response => {
            response.resume();
            resolve(response.statusCode);
        });
        request.on("error", reject);
    });
    assert.equal(reboundStatus, 403);
    const navigatedStatus = await new Promise((resolve, reject) => {
        const request = http.get(entry.url, { headers: { "Sec-Fetch-Site": "cross-site", "Sec-Fetch-Mode": "navigate" } }, response => {
            response.resume();
            resolve(response.statusCode);
        });
        request.on("error", reject);
    });
    assert.equal(navigatedStatus, 200);
    assert.equal((await fetch(`${entry.url}/api/state`, { headers: { "Sec-Fetch-Site": "cross-site" } })).status, 403);
    assert.equal((await post("prepare", { operation: "create", name: "ui-tag", unexpected: true })).status, 400);
    assert.equal((await post("prepare", { operation: "create", name: "ui-tag" })).status, 200);
    let state = await (await fetch(`${entry.url}/api/state`)).json();
    assert.equal(state.pending.name, "ui-tag");
    assert.equal(await git(repository, ["tag"]), "");
    assert.equal((await post("execute", { id: state.pending.id, confirmation: "wrong" })).status, 400);
    assert.equal((await post("execute", { id: state.pending.id, confirmation: "ui-tag" })).status, 200);
    state = await (await fetch(`${entry.url}/api/state`)).json();
    assert.equal(state.pending, null);
    assert.equal(state.snapshot.tags[0].name, "ui-tag");
    assert.equal(state.result.ok, true);
    assert.equal(await git(repository, ["tag"]), "ui-tag");
});
