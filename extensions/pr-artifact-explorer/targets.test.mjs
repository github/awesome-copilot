import assert from "node:assert/strict";
import test from "node:test";
import { TargetError, canonicalUrl, decodeView, describeShare, encodeView, parseTarget, routeFor } from "./targets.mjs";

const R = "github/awesome-copilot";

test("GitHub URLs resolve to pull, issue, artifact and repository targets", () => {
  assert.deepEqual(parseTarget(`https://github.com/${R}/pull/12/files`), { kind: "pull", repository: R, number: 12 });
  assert.deepEqual(parseTarget(`https://github.com/${R}/issues/7`), { kind: "issue", repository: R, number: 7 });
  assert.deepEqual(parseTarget(`https://github.com/${R}/actions/artifacts/99`), { kind: "artifact", repository: R, artifactId: 99 });
  assert.deepEqual(parseTarget(`https://github.com/${R}`), { kind: "repository", repository: R });
});

test("shorthand, repo plus artifact and explorer routes resolve", () => {
  assert.equal(parseTarget(`${R}#5`).number, 5);
  assert.equal(parseTarget(R).kind, "repository");
  assert.equal(parseTarget(`${R} artifact 42`).artifactId, 42);
  assert.deepEqual(parseTarget("#/artifact/github%2Fawesome-copilot/0/8"), { kind: "artifact", repository: R, artifactId: 8 });
  assert.equal(parseTarget("#/cache").kind, "cache");
  assert.equal(parseTarget("#/docs").kind, "docs");
});

test("natural language uses the current repository context", () => {
  assert.deepEqual(parseTarget("open PR 33", { defaultRepository: R }), { kind: "pull", repository: R, number: 33 });
  assert.equal(parseTarget(`show artifact #77 in ${R}`).artifactId, 77);
  assert.equal(parseTarget("show me the docs").kind, "docs");
  assert.equal(parseTarget("go to the cache").kind, "cache");
  assert.throws(() => parseTarget("open issue 4"), TargetError);
});

test("localhost and HTTP(S) URLs are previewable, other schemes are rejected", () => {
  assert.equal(parseTarget("localhost:5173/app").url, "http://localhost:5173/app");
  assert.equal(parseTarget("https://example.com/a?b=1").kind, "url");
  assert.throws(() => parseTarget("javascript:alert(1)"), TargetError);
  assert.throws(() => parseTarget("file:///etc/passwd"), TargetError);
  assert.throws(() => parseTarget("https://user:pw@example.com/"), /credentials/);
});

test("dot segments and garbage are rejected", () => {
  for (const bad of [
    "#/pull/o%2/5",
    "#/pull/%E0%A4%A/5",
    "#/pull/nope/5",
    "#/pull/o%2Fr/0",
    "#/pull/o%2Fr/9007199254740993",
    "#/issue/o%2Fr/0",
    "#/artifact/o%2Fr/0/0",
    "#/artifact/%zz/1/2",
    "#/pull/.%2Frepo/5",
    "#/pull/..%2Frepo/5",
    "#/pull/owner%2F./5",
    "#/pull/owner%2F../5",
    "#/issue/.%2F../5",
    "#/artifact/..%2Frepo/0/5",
    "#/artifact/owner%2F../0/5",
    "./repo#5",
    "../repo#5",
    "owner/.#5",
    "owner/.. artifact 5",
    "../repo artifact 5",
  ]) {
    assert.throws(() => parseTarget(bad), TargetError, bad);
  }
  for (const text of ["show pr 5 in ./repo", "open ../repo", "owner/.. issue 4"]) {
    let target = null;
    try {
      target = parseTarget(text, { defaultRepository: "github/awesome-copilot" });
    } catch (error) {
      assert.ok(error instanceof TargetError, text);
    }
    assert.ok(!target?.repository || !target.repository.split("/").some((s) => s === "." || s === ".."), text);
  }
  assert.equal(parseTarget("#/pull/my.org%2F.repo/5").repository, "my.org/.repo");
  assert.equal(parseTarget("#/pull/o%2Fr/5").number, 5);
  assert.throws(() => parseTarget("../x"), TargetError);
  assert.throws(() => parseTarget("hello there"), TargetError);
  assert.throws(() => parseTarget(""), TargetError);
});

test("canonical URLs, routes and share views contain no secrets or ports", () => {
  const target = { kind: "pull", repository: R, number: 1 };
  assert.equal(canonicalUrl(target), `https://github.com/${R}/pull/1`);
  assert.equal(routeFor(target), "#/pull/github%2Fawesome-copilot/1");
  const encoded = encodeView({ url: "https://example.com/", preset: "mobile", zoom: 0.5, orientation: undefined });
  assert.deepEqual(decodeView(encoded), { url: "https://example.com/", preset: "mobile", width: undefined, height: undefined, zoom: 0.5, orientation: undefined });
  assert.equal(decodeView("garbage"), null);
  assert.equal(decodeView(Buffer.from(JSON.stringify({ v: 1, url: "javascript:1" })).toString("base64url")).url, undefined);
  assert.ok(describeShare(target).text.startsWith("https://github.com/"));
});

test("real artifact permalinks and generated shares round-trip", () => {
  const permalink = "https://github.com/github/awesome-copilot/actions/runs/123/artifacts/456";
  const artifact = parseTarget(permalink);
  assert.deepEqual(artifact, { kind: "artifact", repository: "github/awesome-copilot", artifactId: 456, runId: 123 });
  assert.equal(canonicalUrl(artifact), permalink);

  const withFile = { kind: "artifact", repository: "github/awesome-copilot", pullNumber: 7, artifactId: 456, file: "index.html" };
  const route = routeFor(withFile);
  assert.equal(route, "#/artifact/github%2Fawesome-copilot/7/456?file=index.html");
  assert.deepEqual(parseTarget(route), withFile);
  assert.deepEqual(parseTarget("#/artifact/github%2Fawesome-copilot/0/456?file=index.html"), { kind: "artifact", repository: "github/awesome-copilot", artifactId: 456, file: "index.html" });

  for (const target of [parseTarget("github/awesome-copilot#12"), artifact, withFile]) {
    const share = describeShare(target, { preset: "mobile", zoom: 1.5 });
    assert.deepEqual(parseTarget(share.route).view, { url: undefined, preset: "mobile", width: undefined, height: undefined, zoom: 1.5, orientation: undefined });
    assert.match(share.route, /v=/);
    assert.doesNotMatch(share.text, /127\.0\.0\.1|:\d{4,5}\b/);
  }
});

test("browser shares round-trip through the browser route", () => {
  const view = { url: "http://localhost:3000/", preset: "custom", width: 500, height: 700, zoom: 0.5, orientation: "landscape" };
  const target = parseTarget(`#/browser?v=${encodeView(view)}`);
  assert.equal(target.kind, "url");
  assert.deepEqual(target.view, { ...view });
  assert.deepEqual(parseTarget(routeFor(target)), target);
  const share = describeShare(target, { preset: "tablet" });
  assert.equal(parseTarget(share.route).view.preset, "tablet");
});

test("bounded natural-language browser commands", () => {
  assert.deepEqual(parseTarget("go back"), { kind: "command", command: "back" });
  assert.deepEqual(parseTarget("Forward"), { kind: "command", command: "forward" });
  assert.deepEqual(parseTarget("reload the page"), { kind: "command", command: "refresh" });
  assert.deepEqual(parseTarget("zoom 150%"), { kind: "command", command: "zoom", zoom: 1.5 });
  assert.deepEqual(parseTarget("zoom out"), { kind: "command", command: "zoom", step: -1 });
  assert.deepEqual(parseTarget("tablet"), { kind: "command", command: "viewport", preset: "tablet" });
  assert.deepEqual(parseTarget("800x600"), { kind: "command", command: "viewport", preset: "custom", width: 800, height: 600 });
  assert.deepEqual(parseTarget("take a screenshot"), { kind: "command", command: "screenshot" });
  const shown = parseTarget("show localhost:3000 on mobile");
  assert.equal(shown.kind, "url");
  assert.match(shown.url, /^http:\/\/localhost:3000\//);
  assert.deepEqual(shown.view, { preset: "mobile" });
  assert.equal(parseTarget("open http://localhost:5173 on 1024x768 at 50% zoom").view.zoom, 0.5);
  assert.throws(() => parseTarget("zoom 9000%"), TargetError);
  assert.throws(() => parseTarget("100x100"), TargetError);
});
test("Raw preview mode round-trips through parse, route and share", () => {
  const r = "#/artifact/example%2Fproject/0/999997?file=compact.json&view=raw";
  const target = parseTarget(r);
  assert.equal(target.mode, "raw");
  assert.equal(target.file, "compact.json");
  assert.equal(routeFor(target), r);
  const share = describeShare(target);
  assert.ok(share.route.includes("view=raw"));
  assert.equal(parseTarget(share.route).mode, "raw");
  assert.equal(parseTarget(r.replace("&view=raw", "")).mode, undefined);
  assert.equal(parseTarget("#/artifact/example%2Fproject/0/999997?view=raw").mode, undefined);
  assert.equal(parseTarget(r.replace("raw", "bogus")).mode, undefined);
});

test("Actions runs lists and single runs resolve from GitHub links", () => {
  assert.deepEqual(parseTarget(`https://github.com/${R}/actions`), { kind: "runs", repository: R });
  assert.deepEqual(parseTarget(`https://github.com/${R}/actions?query=event%3Aschedule+branch%3Amain+is%3Afailure`), {
    kind: "runs",
    repository: R,
    event: "schedule",
    branch: "main",
    status: "failure",
  });
  assert.deepEqual(parseTarget(`https://github.com/${R}/actions/workflows/nightly.yml`), { kind: "runs", repository: R, workflow: "nightly.yml" });
  assert.deepEqual(parseTarget(`https://github.com/${R}/actions/runs/55/job/9`), { kind: "run", repository: R, runId: 55 });
  assert.deepEqual(parseTarget(`https://github.com/${R}/actions/runs/55`), { kind: "run", repository: R, runId: 55 });
  assert.equal(parseTarget(`https://github.com/${R}/actions/runs/55/artifacts/7`).kind, "artifact");
});

test("runs and run targets round-trip through routes and shares", () => {
  const runs = parseTarget("#/runs/github%2Fawesome-copilot?event=schedule&status=failure&nopr=1&page=2&branch=release%2F1");
  assert.deepEqual(runs, {
    kind: "runs",
    repository: R,
    event: "schedule",
    status: "failure",
    branch: "release/1",
    excludePullRequests: true,
    page: 2,
  });
  assert.deepEqual(parseTarget(routeFor(runs)), runs);
  assert.equal(describeShare({ kind: "runs", repository: R, event: "schedule" }).url, `https://github.com/${R}/actions?query=event%3Aschedule`);
  assert.equal(routeFor({ kind: "runs", repository: R }), "#/runs/github%2Fawesome-copilot");
  const run = parseTarget("#/run/github%2Fawesome-copilot/55");
  assert.deepEqual(run, { kind: "run", repository: R, runId: 55 });
  assert.equal(routeFor(run), "#/run/github%2Fawesome-copilot/55");
  assert.equal(describeShare(run).url, `https://github.com/${R}/actions/runs/55`);
  assert.throws(() => parseTarget("#/run/github%2Fawesome-copilot/0"), TargetError);
  assert.throws(() => parseTarget("#/runs/not-a-repo"), TargetError);
  assert.deepEqual(parseTarget("#/runs/github%2Fawesome-copilot?event=a%26b&status=bogus"), { kind: "runs", repository: R });
});

test("artifacts opened from a run keep the run in their route", () => {
  const route = "#/artifact/github%2Fawesome-copilot/0/8?file=a%2Fb.txt&view=raw&run=55";
  const target = parseTarget(route);
  assert.deepEqual(target, { kind: "artifact", repository: R, artifactId: 8, runId: 55, file: "a/b.txt", mode: "raw" });
  assert.equal(routeFor(target), route);
  assert.equal(routeFor({ kind: "artifact", repository: R, artifactId: 8, runId: 55 }), "#/artifact/github%2Fawesome-copilot/0/8?run=55");
  assert.equal(parseTarget(`https://github.com/${R}/actions/runs/55/artifacts/8`).runId, 55);
  assert.equal(routeFor(parseTarget(`https://github.com/${R}/actions/runs/55/artifacts/8`)), "#/artifact/github%2Fawesome-copilot/0/8?run=55");
  assert.throws(() => parseTarget("#/artifact/github%2Fawesome-copilot/0/8?run=0"), TargetError);
});

test("natural language reaches scheduled and non-PR runs", () => {
  assert.deepEqual(parseTarget(`${R} actions`), { kind: "runs", repository: R });
  assert.deepEqual(parseTarget(`${R} run 12`), { kind: "run", repository: R, runId: 12 });
  assert.deepEqual(parseTarget("show scheduled runs", { defaultRepository: R }), { kind: "runs", repository: R, event: "schedule" });
  assert.deepEqual(parseTarget(`list failed nightly runs in ${R}`), { kind: "runs", repository: R, event: "schedule", status: "failure" });
  assert.deepEqual(parseTarget(`show workflow runs not from PRs in ${R}`), { kind: "runs", repository: R, excludePullRequests: true });
  assert.deepEqual(parseTarget("open run 99", { defaultRepository: R }), { kind: "run", repository: R, runId: 99 });
  assert.throws(() => parseTarget("show scheduled runs"), TargetError);
  assert.throws(() => parseTarget("dotnet runs fine"), TargetError);
});
test("hide-PR and has-artifacts toggles are on by default and only explicit values round-trip", () => {
  assert.equal(parseTarget(`${R} actions`).excludePullRequests, undefined);
  assert.equal(routeFor({ kind: "runs", repository: R }), "#/runs/github%2Fawesome-copilot");
  const off = parseTarget("#/runs/github%2Fawesome-copilot?nopr=0&artifacts=0");
  assert.deepEqual(off, { kind: "runs", repository: R, excludePullRequests: false, hasArtifacts: false });
  assert.equal(routeFor(off), "#/runs/github%2Fawesome-copilot?nopr=0&artifacts=0");
  assert.deepEqual(parseTarget("#/runs/github%2Fawesome-copilot?nopr=1&artifacts=1"), { kind: "runs", repository: R, excludePullRequests: true, hasArtifacts: true });
  assert.deepEqual(parseTarget("#/runs/github%2Fawesome-copilot?nopr=maybe"), { kind: "runs", repository: R });
  assert.deepEqual(parseTarget("show all runs", { defaultRepository: R }), { kind: "runs", repository: R, excludePullRequests: false, hasArtifacts: false });
  assert.deepEqual(parseTarget(`show scheduled runs with artifacts in ${R}`), { kind: "runs", repository: R, event: "schedule", hasArtifacts: true });
  assert.deepEqual(parseTarget(`show runs including pull requests in ${R}`), { kind: "runs", repository: R, excludePullRequests: false });
});