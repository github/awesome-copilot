import test from "node:test";
import assert from "node:assert/strict";
import { attributeTrack, buildState, checklist, decisionRev, isValidRepo, referencedNumbers, lockExpiry, matchSession, mergeWindows, parseLockLine, parseLocks, prGate, UNTRACKED } from "../lib/collect.mjs";
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
    // The calendar date comes from the written offset: 01:00Z on Jan 2 is still Jan 1 at -07:00.
    assert.equal(lockExpiry("merge lock: #1 until 20:00-07:00", "2026-01-02T01:00:00Z"), "2026-01-02T03:00:00.000Z");
});

test("parseLocks tracks holder, release, reservations and expiry", () => {
    const now = Date.parse("2026-01-02T05:00:00Z");
    const c = (createdAt, line) => ({ createdAt, url: "", author: "dev", writeAccess: true, line });
    const comments = [
        c("2026-01-02T01:00:00Z", "merge lock: #10 until 02:00Z"),
        c("2026-01-02T01:10:00Z", "merge reserve: #11"),
        c("2026-01-02T01:20:00Z", "merge reserve: #12"),
        c("2026-01-02T01:30:00Z", "merge lock release: #10"),
        c("2026-01-02T01:40:00Z", "merge lock: #11 until 03:00Z"),
    ];
    const lock = parseLocks(comments, prefixes, new Set([10, 11, 12]), now);
    assert.equal(lock.holder.pr, 11);
    assert.equal(lock.holder.expired, true);
    assert.deepEqual(lock.reservations.map((r) => r.pr), [12]);
    assert.equal(lock.events.length, 5);
    assert.equal(parseLocks(comments, prefixes, new Set([12]), now).holder, null, "a closed PR cannot hold the lock");
    assert.equal(parseLocks(comments, prefixes, null, now).holder.pr, 11, "an incomplete open list drops nothing as closed");
});

test("parseLocks ignores lock lines from authors without verified write access", () => {
    const comments = [
        { createdAt: "2026-01-02T01:00:00Z", url: "", author: "dev", writeAccess: true, line: "merge lock: #10" },
        { createdAt: "2026-01-02T01:05:00Z", url: "", author: "drive-by", writeAccess: false, line: "merge lock release: #10" },
        { createdAt: "2026-01-02T01:06:00Z", url: "", author: "drive-by", line: "merge reserve: #11" },
    ];
    const lock = parseLocks(comments, prefixes, new Set([10, 11]), Date.parse("2026-01-02T02:00:00Z"));
    assert.equal(lock.holder.pr, 10);
    assert.deepEqual(lock.reservations, []);
    assert.equal(lock.ignored, 2);
    const allow = parseLocks(comments, prefixes, new Set([10, 11]), Date.parse("2026-01-02T02:00:00Z"), ["Drive-By"]);
    assert.equal(allow.holder, null, "an explicit allowlist replaces the association rule");
    assert.deepEqual(allow.reservations.map((r) => r.pr), [11]);
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
    assert.equal(prGate({ ...ok, mergeable: "UNKNOWN" }), "mergeability-unknown", "unknown mergeability is never green");
    assert.equal(prGate({ ...ok, mergeStateStatus: "BEHIND" }), "behind", "conflict-free is not enough when the branch must be up to date");
    assert.equal(prGate({ ...ok, mergeStateStatus: "BLOCKED" }), "blocked");
    assert.equal(prGate({ ...ok, mergeStateStatus: "UNKNOWN" }), "mergeability-unknown");
    assert.equal(prGate({ ...ok, mergeStateStatus: "CLEAN" }), "mergeable");
    assert.equal(prGate({ ...ok, threadsComplete: false }), "threads-unknown");
    assert.equal(prGate({ ...ok, threadsComplete: false, unresolvedThreads: 1 }), "unresolved-threads");
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
    // A pattern that could backtrack catastrophically never runs against contributor titles.
    const risky = [{ id: "r", prs: [], branchPatterns: [], titlePatterns: ["(a+)+$"] }];
    const started = Date.now();
    assert.equal(matchSession({ number: 4, headRefName: "", title: `${"a".repeat(40)}!` }, risky), null);
    assert.ok(Date.now() - started < 100);
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
    const betaRev = decisionRev(demoBoard().decisions.find((d) => d.id === "beta-scope"));
    const state = buildState(demoRaw(now), { ...demoBoard(), lockPrefixes: prefixes, answers: { "beta-scope": { answer: "Keep in Beta", rev: betaRev, at: "2026-03-04T11:00:00Z", seen: true } } }, now);
    assert.equal(state.hours.length, 24);
    assert.equal(state.days.length, 7);
    assert.ok(state.mergedWeek.length > state.merged24.length);
    assert.ok(state.mergedWeek.every((pr) => pr.track !== undefined));
    assert.equal(state.lock.holder.pr, 141);
    assert.deepEqual(state.decisions.map((d) => d.id), ["cache-strategy", "gh-150"], "seen answers leave the queue");
    assert.ok(state.sessions.some((s) => s.id === null), "unmatched PRs get an Unassigned card");
    assert.ok(state.warnings.some((w) => w.code === "ci_failed"));
});

test("checklist counts boxes per line and stays fast on whitespace-heavy bodies", () => {
    assert.deepEqual(checklist("- [x] a\n  - [ ] b\n\t* [X] c\ntext - [ ] d"), { total: 3, done: 2 });
    const started = Date.now();
    checklist(`${" \n".repeat(200000)}x`);
    assert.ok(Date.now() - started < 1000);
});

test("merge totals cover exactly the charted buckets", () => {
    const now = new Date(2026, 2, 4, 12, 30).getTime();
    const windows = mergeWindows(now);
    assert.equal(windows.hourSince, new Date(2026, 2, 3, 13, 0).getTime());
    assert.equal(windows.daySince, new Date(2026, 1, 26, 0, 0).getTime());
    const merged = [
        new Date(2026, 2, 3, 12, 45), // before the first hourly bar: in the 7-day total only
        new Date(2026, 2, 3, 13, 5),
        new Date(2026, 1, 26, 0, 10), // first minutes of the oldest day
        new Date(2026, 1, 25, 23, 50), // outside both windows
    ].map((d, i) => ({ number: i + 1, title: "t", url: "", mergedAt: d.toISOString(), labels: [], refs: [] }));
    const state = buildState({ repo: "o/r", openPrs: [], merged }, { sessions: [], tracks: [], answers: {} }, now);
    const sum = (buckets) => buckets.reduce((a, b) => a + Object.values(b.counts).reduce((x, y) => x + y, 0), 0);
    assert.equal(state.merged24.length, 1);
    assert.equal(sum(state.hours), state.merged24.length);
    assert.equal(state.mergedWeek.length, 3);
    assert.equal(sum(state.days), state.mergedWeek.length);
});

test("buildState only attaches answers the board actually stored", () => {
    const board = { sessions: [], tracks: [], answers: {}, decisions: [{ id: "constructor", title: "Q", options: [] }] };
    const state = buildState({ repo: "o/r", openPrs: [], merged: [] }, board, Date.now());
    assert.equal(state.decisions[0].answer, null);
});

test("incomplete collection is reported and never yields a ready track", () => {
    const raw = {
        repo: "o/r", openPrs: [], openPrTotal: 600, merged: [],
        trackIssues: { a: [{ number: 1, title: "x", url: "", state: "CLOSED", body: "" }] },
        incomplete: { openPrs: true, merged: true, tracks: ["a"], decisions: true },
    };
    const state = buildState(raw, { sessions: [], tracks: [{ label: "a" }], answers: {} }, Date.now());
    assert.equal(state.tracks[0].ready, false);
    const codes = state.warnings.map((w) => w.code);
    for (const code of ["open_prs_incomplete", "merges_incomplete", "track_incomplete", "decisions_incomplete"]) assert.ok(codes.includes(code), code);
});

test("the repeated hour at the end of daylight saving time keeps two separate bars", () => {
    const previous = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
        // 01:00-02:00 local happens twice on 2026-11-01 (05:00-06:00Z as EDT, 06:00-07:00Z as EST).
        const now = Date.parse("2026-11-01T07:30:00Z");
        const merged = ["2026-11-01T05:30:00Z", "2026-11-01T06:30:00Z"].map((mergedAt, i) => ({ number: i + 1, title: "t", url: "", mergedAt, labels: [], refs: [] }));
        const state = buildState({ repo: "o/r", openPrs: [], merged }, { sessions: [], tracks: [], answers: {} }, now);
        const totals = state.hours.map((h) => Object.values(h.counts).reduce((a, x) => a + x, 0));
        assert.equal(totals.reduce((a, x) => a + x, 0), 2);
        assert.equal(Math.max(...totals), 1);
    } finally {
        if (previous === undefined) delete process.env.TZ;
        else process.env.TZ = previous;
    }
});

test("decisionRev changes when a question is replaced under the same id", () => {
    const a = { id: "q", title: "Ship it?", detail: "", options: ["yes", "no"] };
    assert.equal(decisionRev(a), decisionRev({ ...a }));
    assert.notEqual(decisionRev(a), decisionRev({ ...a, title: "Ship the other thing?" }));
    assert.notEqual(decisionRev(a), decisionRev({ ...a, options: ["yes"] }));
    const state = buildState({ repo: "o/r", openPrs: [], merged: [] }, { sessions: [], tracks: [], answers: {}, decisions: [a] }, Date.now());
    assert.equal(state.decisions[0].rev, decisionRev(a));
});

test("answers attach to and hide only the question revision they were given for", () => {
    const q = { id: "q", title: "Ship it?", detail: "", options: ["yes", "no"], url: "" };
    const rev = decisionRev(q);
    const answers = { q: { answer: "yes", rev, at: "2026-01-01T00:00:00Z", seen: false }, "gh-7": { answer: "ok", rev: "000000000000", at: "2026-01-01T00:00:00Z", seen: true } };
    const raw = { repo: "o/r", openPrs: [], merged: [], decisionIssues: [{ number: 7, title: "Retitled question", url: "" }] };
    const same = buildState(raw, { sessions: [], tracks: [], answers, decisions: [q] }, Date.now());
    assert.equal(same.decisions.find((d) => d.id === "q").answer.answer, "yes");
    assert.ok(same.decisions.some((d) => d.id === "gh-7" && d.answer === null), "a seen answer to an older revision does not hide the revised question");
    const revised = buildState(raw, { sessions: [], tracks: [], answers, decisions: [{ ...q, options: ["yes", "no", "later"] }] }, Date.now());
    assert.equal(revised.decisions.find((d) => d.id === "q").answer, null);
});

test("the hourly window keeps the current offset during the repeated hour", () => {
    const previous = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
        const now = Date.parse("2026-11-01T06:30:00Z"); // 01:30 EST, the second 01:00 hour
        assert.equal(new Date(mergeWindows(now).hourSince).toISOString(), "2026-10-31T07:00:00.000Z");
        const merged = [{ number: 1, title: "t", url: "", mergedAt: "2026-11-01T06:15:00Z", labels: [], refs: [] }];
        const state = buildState({ repo: "o/r", openPrs: [], merged }, { sessions: [], tracks: [], answers: {} }, now);
        const charted = state.hours.reduce((a, h) => a + Object.values(h.counts).reduce((x, y) => x + y, 0), 0);
        assert.equal(state.merged24.length, 1);
        assert.equal(charted, 1);
    } finally {
        if (previous === undefined) delete process.env.TZ;
        else process.env.TZ = previous;
    }
});

test("unverified lock authors and partial attribution are reported", () => {
    const comments = [{ createdAt: "2026-01-02T01:00:00Z", url: "", author: "someone", writeAccess: null, line: "merge lock: #10" }];
    const lock = parseLocks(comments, prefixes, new Set([10]), Date.parse("2026-01-02T02:00:00Z"));
    assert.equal(lock.holder, null);
    assert.equal(lock.unverified, 1);
    const state = buildState(
        { repo: "o/r", openPrs: [], merged: [], lockComments: comments, incomplete: { attribution: { truncatedLabels: 2, skippedRefs: 3 } } },
        { sessions: [], tracks: [], answers: {}, coordinationIssue: 1, lockPrefixes: prefixes }, Date.parse("2026-01-02T02:00:00Z"));
    const codes = state.warnings.map((w) => w.code);
    assert.ok(codes.includes("lock_unverified"));
    assert.ok(codes.includes("attribution_incomplete"));
});

test("referencedNumbers keeps every reference for the global budget to account for", () => {
    const body = Array.from({ length: 20 }, (_, i) => `see #${i + 100}`).join("\n");
    assert.equal(referencedNumbers({ number: 1, title: "", body }).length, 20);
});

test("track labels that look like object keys keep exact counts", () => {
    const tracks = [{ label: "constructor" }, { label: "__proto__" }];
    const now = Date.now();
    const merged = ["constructor", "__proto__", "__proto__"].map((label, i) => ({ number: i + 1, title: "t", url: "", mergedAt: new Date(now - 60000).toISOString(), labels: [label], refs: [] }));
    const state = buildState({ repo: "o/r", openPrs: [], merged, trackIssues: {} }, { sessions: [], tracks, answers: {} }, now);
    const bucket = state.hours[state.hours.length - 1].counts;
    assert.equal(bucket.constructor, 1);
    assert.equal(Object.getOwnPropertyDescriptor(bucket, "__proto__").value, 2);
    assert.deepEqual(state.tracks.map((t) => t.merged24), [1, 2]);
});

test("a label-raised question's body is part of its revision but is not sent to the page", () => {
    const issue = { number: 7, title: "Pick one", url: "", body: "- option A\n- option B" };
    const one = buildState({ repo: "o/r", openPrs: [], merged: [], decisionIssues: [issue] }, { sessions: [], tracks: [], answers: {} }, Date.now()).decisions[0];
    const two = buildState({ repo: "o/r", openPrs: [], merged: [], decisionIssues: [{ ...issue, body: "- option C" }] }, { sessions: [], tracks: [], answers: {} }, Date.now()).decisions[0];
    assert.notEqual(one.rev, two.rev);
    assert.equal(one.body, undefined);
});
