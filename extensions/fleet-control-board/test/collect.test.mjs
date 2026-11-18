import test from "node:test";
import assert from "node:assert/strict";
import { attributeTrack, buildState, isValidRepo, lockExpiry, matchSession, parseLockLine, parseLocks, prGate, UNTRACKED } from "../lib/collect.mjs";
import { demoBoard, demoRaw } from "../lib/demo.mjs";

const tracks = [
    { label: "milestone: alpha", titlePattern: "" },
    { label: "milestone: beta", titlePattern: "" },
    { label: "area: docs", titlePattern: "^docs:" },
];

test("attributeTrack prefers the PR's own labels", () => {
    const pr = { title: "x", labels: ["milestone: beta"], refs: [{ title: "i", labels: ["milestone: alpha"], parent: null }] };
    assert.equal(attributeTrack(pr, tracks), "milestone: beta");
});

test("attributeTrack falls back to referenced issue labels", () => {
    const pr = { title: "x", labels: ["bug"], refs: [{ title: "i", labels: ["milestone: alpha"], parent: { title: "e", labels: ["milestone: beta"] } }] };
    assert.equal(attributeTrack(pr, tracks), "milestone: alpha");
});

test("attributeTrack falls back to the parent epic's labels", () => {
    const pr = { title: "x", labels: [], refs: [{ title: "i", labels: [], parent: { title: "e", labels: ["milestone: beta"] } }] };
    assert.equal(attributeTrack(pr, tracks), "milestone: beta");
});

test("attributeTrack uses title patterns only after labels, and reports untracked otherwise", () => {
    assert.equal(attributeTrack({ title: "docs: guide", labels: [], refs: [] }, tracks), "area: docs");
    assert.equal(attributeTrack({ title: "docs: guide", labels: ["milestone: alpha"], refs: [] }, tracks), "milestone: alpha");
    assert.equal(attributeTrack({ title: "chore", labels: ["bug"], refs: [] }, tracks), UNTRACKED);
});

test("attributeTrack resolves several matching labels by configured order", () => {
    assert.equal(attributeTrack({ title: "x", labels: ["area: docs", "milestone: beta"], refs: [] }, tracks), "milestone: beta");
});

const prefixes = { lock: "merge lock:", reserve: "merge reserve:", release: "merge lock release:" };

test("parseLockLine reads the longest matching prefix first", () => {
    assert.deepEqual(parseLockLine("merge lock release: #12", prefixes), { kind: "release", pr: 12, text: "merge lock release: #12" });
    assert.equal(parseLockLine("**Merge Lock:** #7 until 10:30Z", prefixes)?.kind, "lock");
    assert.equal(parseLockLine("merge reserve: #8", prefixes)?.pr, 8);
    assert.equal(parseLockLine("merge lock: no number", prefixes), null);
    assert.equal(parseLockLine("unrelated #5", prefixes), null);
});

test("lockExpiry reads ISO times and HH:MM with an offset", () => {
    assert.equal(lockExpiry("merge lock: #1 until 2026-01-02T03:04:00Z", "2026-01-02T02:00:00Z"), "2026-01-02T03:04:00.000Z");
    assert.equal(lockExpiry("merge lock: #1 until 03:30Z", "2026-01-02T02:00:00Z"), "2026-01-02T03:30:00.000Z");
    assert.equal(lockExpiry("merge lock: #1 until 12:00+09:00", "2026-01-02T02:00:00Z"), "2026-01-02T03:00:00.000Z");
    // An expiry earlier in the day than the comment means the next day.
    assert.equal(lockExpiry("merge lock: #1 until 01:00Z", "2026-01-02T23:00:00Z"), "2026-01-03T01:00:00.000Z");
    assert.equal(lockExpiry("merge lock: #1", "2026-01-02T02:00:00Z"), null);
});

test("parseLocks tracks holder, release, reservations and expiry", () => {
    const now = Date.parse("2026-01-02T05:00:00Z");
    const comments = [
        { createdAt: "2026-01-02T01:00:00Z", url: "", line: "merge lock: #10 until 02:00Z" },
        { createdAt: "2026-01-02T01:10:00Z", url: "", line: "merge reserve: #11" },
        { createdAt: "2026-01-02T01:20:00Z", url: "", line: "merge reserve: #12" },
        { createdAt: "2026-01-02T01:30:00Z", url: "", line: "merge lock release: #10" },
        { createdAt: "2026-01-02T01:40:00Z", url: "", line: "merge lock: #11 until 03:00Z" },
    ];
    const lock = parseLocks(comments, prefixes, new Set([10, 11, 12]), now);
    assert.equal(lock.holder.pr, 11);
    assert.equal(lock.holder.expired, true);
    assert.deepEqual(lock.reservations.map((r) => r.pr), [12]);
    assert.equal(lock.events.length, 5);
    assert.equal(parseLocks(comments, prefixes, new Set([12]), now).holder, null, "a closed PR cannot hold the lock");
});

test("prGate reports the first unmet merge gate", () => {
    const ok = { isDraft: false, mergeable: "MERGEABLE", ci: "passed", reviewDecision: "APPROVED", unresolvedThreads: 0, headReviewed: true };
    assert.equal(prGate(ok), "mergeable");
    assert.equal(prGate({ ...ok, isDraft: true, mergeable: "CONFLICTING" }), "draft");
    assert.equal(prGate({ ...ok, mergeable: "CONFLICTING", ci: "failed" }), "conflict");
    assert.equal(prGate({ ...ok, ci: "failed" }), "ci-failed");
    assert.equal(prGate({ ...ok, ci: "running" }), "ci-running");
    assert.equal(prGate({ ...ok, reviewDecision: "CHANGES_REQUESTED", unresolvedThreads: 1 }), "changes-requested");
    assert.equal(prGate({ ...ok, unresolvedThreads: 2 }), "unresolved-threads");
    assert.equal(prGate({ ...ok, reviewDecision: "REVIEW_REQUIRED" }), "review-required");
    assert.equal(prGate({ ...ok, headReviewed: false }), "no-head-review");
    assert.equal(prGate({ ...ok, ci: "none", reviewDecision: null }), "mergeable");
});

test("matchSession checks explicit PRs, then branches, then titles", () => {
    const sessions = [
        { id: "a", prs: [], branchPatterns: ["^api/"], titlePatterns: [] },
        { id: "b", prs: [7], branchPatterns: [], titlePatterns: ["^docs:"] },
        { id: "c", prs: [], branchPatterns: ["(invalid"], titlePatterns: [] },
    ];
    assert.equal(matchSession({ number: 7, headRefName: "api/x", title: "" }, sessions), "b");
    assert.equal(matchSession({ number: 1, headRefName: "API/x", title: "docs: y" }, sessions), "a");
    assert.equal(matchSession({ number: 2, headRefName: "web/x", title: "docs: y" }, sessions), "b");
    assert.equal(matchSession({ number: 3, headRefName: "web/x", title: "feat" }, sessions), null);
});

test("isValidRepo accepts owner/name slugs only", () => {
    assert.equal(isValidRepo("octo-org/my.repo_1"), true);
    assert.equal(isValidRepo("octo/.."), false);
    assert.equal(isValidRepo("../etc"), false);
    assert.equal(isValidRepo("a/b/c"), false);
    assert.equal(isValidRepo("-bad/x"), false);
});

test("buildState on demo data fills every panel", () => {
    const now = Date.parse("2026-03-04T12:00:00Z");
    const state = buildState(demoRaw(now), { ...demoBoard(), lockPrefixes: prefixes, answers: { "beta-scope": { answer: "Keep in Beta", at: "2026-03-04T11:00:00Z", seen: true } } }, now);
    assert.equal(state.hours.length, 24);
    assert.equal(state.days.length, 7);
    assert.ok(state.mergedWeek.length > state.merged24.length);
    assert.ok(state.mergedWeek.every((pr) => pr.track !== undefined));
    assert.equal(state.lock.holder.pr, 141);
    assert.deepEqual(state.decisions.map((d) => d.id), ["cache-strategy", "gh-150"], "seen answers leave the queue");
    assert.ok(state.sessions.some((s) => s.id === null), "unmatched PRs get an Unassigned card");
    assert.ok(state.warnings.some((w) => w.code === "ci_failed"));
});
