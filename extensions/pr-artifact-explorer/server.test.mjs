import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { after, before, test } from "node:test";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The server persists limits and jobs under COPILOT_HOME, so point it at a throwaway directory before it loads.
const sharedHome = await mkdtemp(join(tmpdir(), "pae-server-test-"));
process.env.COPILOT_HOME = sharedHome;
const { startInstance, stopInstance } = await import("./server.mjs");
const { limitPolicy } = await import("./limits.mjs");
const { jobRegistry } = await import("./cache.mjs");

const ID = "server-test";
let entry;
let target;
let origin;

before(async () => {
  target = createServer((req, res) => {
    if (req.url === "/blocked") res.setHeader("x-frame-options", "DENY");
    res.end("ok");
  });
  await new Promise((resolve) => target.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${target.address().port}`;
  entry = await startInstance(ID, null, () => {});
});

after(async () => {
  await stopInstance(ID);
  await new Promise((resolve) => target.close(resolve));
  await limitPolicy.flush();
  await jobRegistry.flush();
  await rm(sharedHome, { recursive: true, force: true });
});

const call = (path, { method = "GET", body, token = entry.token } = {}) =>
  fetch(`${entry.origin}${path}`, {
    method,
    headers: { ...(token ? { "x-pr-artifact-explorer-token": token } : {}), "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

test("API requires the capability token", async () => {
  const response = await call("/api/jobs", { token: null });
  assert.ok(response.status === 401 || response.status === 403);
  assert.equal((await call("/api/jobs")).status, 200);
});

test("targets/parse and share agree on routes", async () => {
  const parsed = await (await call("/api/targets/parse", { method: "POST", body: { input: "github/awesome-copilot#1" } })).json();
  assert.ok(parsed.route.startsWith("#/"));
  const share = await (await call("/api/share", { method: "POST", body: { input: "github/awesome-copilot#1" } })).json();
  assert.equal(share.share.route, parsed.route);
  const bad = await call("/api/targets/parse", { method: "POST", body: { input: "" } });
  assert.equal(bad.status, 400);
});

test("run endpoints require the capability token and validate input", async () => {
  for (const path of ["/api/runs?repo=o/r", "/api/runs/5?repo=o/r", "/api/workflows?repo=o/r", "/api/branches?repo=o/r", "/api/runs/artifact-counts?repo=o/r&ids=1"]) {
    const response = await call(path, { token: null });
    assert.ok(response.status === 401 || response.status === 403, path);
  }
  const badIds = await call("/api/runs/artifact-counts?repo=o/r&ids=abc");
  assert.equal(badIds.status, 400);
  const tooMany = await call(`/api/runs/artifact-counts?repo=o/r&ids=${Array.from({ length: 31 }, (_, i) => i + 1).join(",")}`);
  assert.equal(tooMany.status, 400);
});

test("probe reports embedding barriers and unreachable hosts", async () => {
  const ok = await (await call("/api/probe", { method: "POST", body: { url: origin } })).json();
  assert.equal(ok.embeddable, true);
  const blocked = await (await call("/api/probe", { method: "POST", body: { url: `${origin}/blocked` } })).json();
  assert.equal(blocked.embeddable, false);
  assert.match(blocked.reason, /X-Frame-Options/);
  const invalid = await call("/api/probe", { method: "POST", body: { url: "file:///etc/passwd" } });
  assert.equal(invalid.status, 400);
});

test("capture rejects invalid input before launching a browser", async () => {
  const badUrl = await call("/api/capture", { method: "POST", body: { url: "ftp://x" } });
  assert.equal(badUrl.status, 400);
  const badSize = await call("/api/capture", { method: "POST", body: { url: origin, preset: "custom", width: 1, height: 1 } });
  assert.equal(badSize.status, 400);
});

test("limits PUT validates kind and applies values", async () => {
  const ok = await call("/api/limits", { method: "PUT", body: { kind: "zipEntries", value: 5000 } });
  assert.equal(ok.status, 200);
  const bad = await call("/api/limits", { method: "PUT", body: { kind: "nope", value: 5 } });
  assert.ok(bad.status >= 400 && bad.status < 500);
});

test("restart keeps port and token", async () => {
  const before = { origin: entry.origin, token: entry.token };
  const response = await call("/api/restart", { method: "POST", body: {} });
  assert.equal((await response.json()).restarted, true);
  await new Promise((resolve) => setTimeout(resolve, 800));
  const after = await fetch(`${before.origin}/api/jobs`, { headers: { "x-pr-artifact-explorer-token": before.token } });
  assert.equal(after.status, 200);
});

test("targets/parse returns commands without a route and parses real artifact permalinks", async () => {
  const command = await (await call("/api/targets/parse", { method: "POST", body: { input: "go back" } })).json();
  assert.equal(command.target.kind, "command");
  assert.equal(command.route, null);
  const nl = await (await call("/api/targets/parse", { method: "POST", body: { input: "show localhost:3000 on mobile" } })).json();
  assert.equal(nl.target.kind, "url");
  assert.equal(nl.target.view.preset, "mobile");
  const link = await (await call("/api/targets/parse", { method: "POST", body: { input: "https://github.com/github/awesome-copilot/actions/runs/123/artifacts/456" } })).json();
  assert.equal(link.target.kind, "artifact");
  assert.equal(link.target.artifactId, 456);
});

test("controlled routes require the token and validate input before launching Chromium", async () => {
  const noToken = await call("/api/controlled/navigate", { method: "POST", body: { url: origin }, token: null });
  assert.ok(noToken.status === 401 || noToken.status === 403);
  const badUrl = await call("/api/controlled/navigate", { method: "POST", body: { url: "file:///x" } });
  assert.equal(badUrl.status, 400);
  const notStarted = await call("/api/controlled/history", { method: "POST", body: { direction: "back" } });
  assert.equal(notStarted.status, 400);
});

test("docs image route only serves strictly named image files", async () => {
  for (const path of ["/assets/docs/missing-shot.png", "/assets/docs/..%2Fserver.png", "/assets/docs/a.mjs", "/assets/docs/UPPER.png", "/assets/docs/x/y.png"]) {
    const res = await call(path);
    assert.equal(res.status, 404, path);
  }
});

test("global Escape handler treats absent filter panels as closed", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("./assets/app.js", import.meta.url), "utf8");
  for (const id of ["pull-author-panel", "pull-state-panel"]) {
    assert.ok(source.includes(`getElementById("${id}")?.hidden === false`), id);
    assert.ok(!source.includes(`getElementById("${id}")?.hidden)`), id);
  }
});
