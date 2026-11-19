import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { BoardStore } from "../../../../extensions/external-plugin-rereview-board/lib/state.mjs";
import { parseReport, digest, issueUrl } from "../../../../extensions/external-plugin-rereview-board/lib/report.mjs";
import { createGitHub } from "../../../../extensions/external-plugin-rereview-board/lib/github.mjs";
import { Publisher } from "../../../../extensions/external-plugin-rereview-board/lib/publish.mjs";
import { buildReviewPrompt } from "../../../../extensions/external-plugin-rereview-board/lib/review.mjs";

const body = `<!-- external-plugin-rereview-report -->
## External plugin six-month re-review queue
| Plugin | Version | Source repo | Submission issue | Closed at | Days past threshold | Status |
|---|---|---|---:|---|---:|---|
| example | 2.0.0 | \`owner/example\` | #1728 | 2026-05-19 | 0 | Awaiting decision |
`;
const issue = { number: 6487, body, title: "Six-month report", html_url: issueUrl(6487), state: "open" };
const original = {
    number: 1728, html_url: issueUrl(1728), state: "closed", closed_at: "2026-05-19T12:00:00Z",
    title: "[External Plugin]: example",
    body: "### Plugin name\n\nexample\n\n### GitHub repository\n\nowner/example\n\n### Version\n\n1.0.0",
    labels: ["external-plugin", "approved", "re-review-due"].map((name) => ({ name })),
};
const plugin = { name: "example", version: "2.0.0", source: { repo: "owner/example", ref: "v2.0.0" } };
const evidence = {
    issue: { number: 1728, title: original.title, body: original.body, closedAt: original.closed_at, labels: original.labels.map((label) => label.name) },
    comments: [], plugin, reasons: [], hash: "initial-evidence",
};
const row = { ...parseReport(body)[0], evidence };
const loaded = () => structuredClone({ issue, items: [row] });
async function setup(t) {
    const directory = await mkdtemp(path.resolve(".rereview-test-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const store = await new BoardStore(path.join(directory, "board.json")).load();
    await store.import(loaded());
    const posted = [];
    const fake = {
        preflight: async () => ({ issue: structuredClone(issue), evidence: structuredClone(evidence) }),
        maintainer: async () => "maintainer",
        hasWritePermission: async () => true,
        post: async (id, command) => {
            const result = { id: 33, body: command, html_url: `${issueUrl(id)}#issuecomment-33`, user: { login: "maintainer" } };
            posted.push(result);
            return result;
        },
        comments: async () => posted,
    };
    const publisher = new Publisher(store, fake);
    return { store, fake, publisher, posted };
}
async function update(store, changes = {}) {
    const item = store.item(6487, 1728);
    return store.update(6487, 1728, {
        expectedRevision: item.revision, column: "keep", note: "PRIVATE-NOTE", reason: "STAGED-REASON", ...changes,
    });
}

test("parses actual queue shape and rejects ambiguous or malformed identities without guessing", () => {
    assert.equal(parseReport(body)[0].id, 1728);
    assert.equal(parseReport(body.replaceAll("\n", "\r\n"))[0].repo, "owner/example");
    for (const invalid of [
        body.replace("#1728", "[#1728](https://evil.test)"),
        body.replace("2026-05-19", "yesterday"), body.replace("`owner/example`", "`../bad`"),
        body + body, body.replace("<!-- external-plugin-rereview-report -->", ""),
        body + "| example | 2.0.0 | `owner/example` | #1728 | 2026-05-19 | 0 | Awaiting decision |\n",
    ]) assert.throws(() => parseReport(invalid));
});

test("GitHub loader uses main catalog, paginates comments, validates original identity, and excludes due submissions from report discovery", async () => {
    const calls = [];
    let source = structuredClone(original);
    let upstreamVersion = "2.1.0";
    const gh = createGitHub(async (args) => {
        calls.push(args);
        const target = args[1];
        if (args[0] === "issue") return JSON.stringify([
            { ...issue, url: issue.html_url }, { ...source, body: "A submission is not a report" },
        ]);
        if (target.includes("contents/plugins/external.json")) return JSON.stringify([plugin]);
        if (target.endsWith("issues/6487")) return JSON.stringify({ ...issue, labels: [{ name: "re-review-due" }] });
        if (target.endsWith("/comments?per_page=100")) return JSON.stringify([[{ id: 1, body: "First" }], [{ id: 2, body: "Second" }]]);
        if (target.endsWith("issues/1728")) return JSON.stringify(source);
        if (target === "repos/owner/example") return JSON.stringify({ default_branch: "main" });
        if (target.endsWith("/releases/latest")) throw new Error("gh: Not Found (HTTP 404)");
        if (target.endsWith("/commits/refs%2Fheads%2Fmain")) return JSON.stringify({ sha: "a".repeat(40) });
        if (target.includes("repos/owner/example/contents/plugin.json")) return JSON.stringify({ name: "example", version: upstreamVersion });
        if (target.includes("repos/owner/example/compare/")) return JSON.stringify({ status: "ahead", ahead_by: 1, behind_by: 0, files: [] });
        throw new Error(`Unexpected gh call: ${args}`);
    });
    assert.equal((await gh.list()).length, 1);
    const result = await gh.load(6487);
    assert.equal(result.items[0].evidence.plugin.version, "2.0.0");
    assert.equal(result.items[0].evidence.comments.length, 2);
    assert.deepEqual(result.items[0].evidence.reasons, []);
    assert.equal(result.items[0].evidence.upstream.head.manifest.version, "2.1.0");
    upstreamVersion = "2.2.0";
    assert.notEqual((await gh.load(6487)).items[0].evidence.hash, result.items[0].evidence.hash, "upstream manifest changes invalidate review evidence");
    assert.ok(calls.some((args) => args[1].includes("?ref=main")));
    assert.ok(calls.some((args) => args.includes("--paginate") && args.includes("--slurp")));
    source.body += "\n\n### Plugin path inside the repository\n\n.github/plugin/plugin.json";
    assert.deepEqual((await gh.load(6487)).items[0].evidence.reasons, [], "historical source paths may have been corrected in the current listing");
    source.body = source.body.replace("owner/example", "attacker/example");
    assert.match((await gh.load(6487)).items[0].evidence.reasons.join(), /identity/);
    source = { ...original, closed_at: "2026-11-19T12:00:00Z", labels: [] };
    const reasons = (await gh.load(6487)).items[0].evidence.reasons.join();
    assert.match(reasons, /no longer due/);
    assert.match(reasons, /date changed/);
    await assert.rejects(gh.load(-1), /positive issue number/);
});

test("refresh preserves drafts and unchanged reviews, resets changed evidence, and retains removed recovery rows", async (t) => {
    const { store } = await setup(t);
    await update(store);
    const queued = await store.queue(6487, 1728);
    await store.finish(6487, 1728, queued.queueId, { recommendation: "remove", rationale: "Evidence citation" });
    assert.equal(store.item(6487, 1728).column, "keep");
    const refresh = loaded();
    refresh.items[0].days = 2;
    await store.import(refresh);
    assert.ok(store.item(6487, 1728).review);
    assert.equal(store.item(6487, 1728).column, "keep");
    refresh.items[0].evidence.hash = "changed";
    await store.import(refresh);
    assert.equal(store.item(6487, 1728).column, "unreviewed");
    assert.equal(store.item(6487, 1728).review, null);
    assert.equal(store.item(6487, 1728).note, "PRIVATE-NOTE");
    assert.equal(store.item(6487, 1728).reason, "STAGED-REASON");
    await store.import({ issue, items: [] });
    assert.equal(store.item(6487, 1728).removed, true);
    const restored = await new BoardStore(store.file).load();
    assert.deepEqual(restored.snapshot(), store.snapshot());
});

test("stale edits/results cannot overwrite newer triage, and agent views/prompts omit private drafts", async (t) => {
    const { store } = await setup(t);
    const revision = store.item(6487, 1728).revision;
    await update(store);
    await assert.rejects(update(store, { expectedRevision: revision }), /changed/);
    const queued = await store.queue(6487, 1728);
    const prompt = buildReviewPrompt({ number: 6487, item: queued, instanceId: "panel", guidance: "Focus compatibility" });
    assert.ok(!prompt.includes("PRIVATE-NOTE") && !prompt.includes("STAGED-REASON"));
    assert.ok(!JSON.stringify(store.snapshot({ agent: true })).includes("PRIVATE-NOTE"));
    assert.ok(!JSON.stringify(store.snapshot({ agent: true })).includes("STAGED-REASON"));
    await store.cancel(6487, 1728);
    await assert.rejects(store.finish(6487, 1728, queued.queueId, { recommendation: "keep", rationale: "Late" }), /Stale/);
    await assert.rejects(update(store, { reason: "Fine\n /re-review-remove" }), /slash-command/);
});

test("In review is a transient display column, never a saved decision or AI recommendation", async (t) => {
    const { store } = await setup(t);
    await update(store);
    await assert.rejects(update(store, { column: "in-review" }), /valid decision/);
    const queued = await store.queue(6487, 1728);
    assert.equal(store.snapshot().items[0].column, "keep");
    await assert.rejects(store.finish(6487, 1728, queued.queueId, {
        recommendation: "in-review", rationale: "Still reviewing",
    }), /recommendation/);
    await store.finish(6487, 1728, queued.queueId, { recommendation: "remove", rationale: "Evidence" });
    assert.equal(store.snapshot().items[0].column, "keep");
    assert.equal(store.snapshot().items[0].queueId, null);
});

test("publication previews exact commands for original submission, persists intent first, and never posts private notes", async (t) => {
    const { store, publisher, fake, posted } = await setup(t);
    await update(store);
    const preview = publisher.preview(6487, 1728);
    assert.equal(preview.target, issueUrl(1728));
    assert.match(preview.body, /^\/re-review-keep\n\nSTAGED-REASON/);
    assert.ok(!preview.body.includes("PRIVATE-NOTE"));
    const originalPost = fake.post;
    fake.post = async (...args) => {
        const saved = await new BoardStore(store.file).load();
        assert.equal(saved.item(6487, 1728).publication.status, "unconfirmed");
        return originalPost(...args);
    };
    await publisher.publish(preview.token);
    assert.equal(store.item(6487, 1728).publication.status, "posted");
    assert.equal(posted.length, 1);
    await assert.rejects(publisher.publish(preview.token), /expired or already used/);
    const second = loaded();
    second.issue.number = 9999;
    await store.import(second);
    assert.throws(() => publisher.preview(9999, 1728), /posted\/unconfirmed/);
    assert.equal(store.snapshot().items[0].publication.status, "posted");
});

test("changed live evidence, stale revisions, expiry, blocked identities, and queued reviews prevent writes", async (t) => {
    const { store, publisher, fake, posted } = await setup(t);
    await update(store);
    let preview = publisher.preview(6487, 1728);
    fake.preflight = async () => ({ issue, evidence: { ...evidence, hash: "changed" } });
    await assert.rejects(publisher.publish(preview.token), /changed on GitHub/);
    fake.preflight = async () => ({ issue, evidence });
    preview = publisher.preview(6487, 1728);
    await update(store, { column: "remove", reason: "Reason" });
    await assert.rejects(publisher.publish(preview.token), /Local triage changed/);
    preview = publisher.preview(6487, 1728);
    publisher.previews.get(preview.token).expires = Date.now() - 1;
    await assert.rejects(publisher.publish(preview.token), /expired/);
    await store.queue(6487, 1728);
    assert.throws(() => publisher.preview(6487, 1728), /pending review/);
    await store.cancel(6487, 1728);
    await update(store, { column: "remove", reason: "" });
    assert.throws(() => publisher.preview(6487, 1728), /public reason/);
    const changed = loaded();
    changed.items[0].evidence.reasons = ["Missing approval"];
    changed.items[0].evidence.hash = "blocked";
    await store.import(changed);
    await update(store);
    assert.throws(() => publisher.preview(6487, 1728), /eligibility block/);
    assert.equal(posted.length, 0);
});

test("ambiguous post outcomes stay locked across refresh/restart and reconcile exact maintainer-authored comments without retries", async (t) => {
    const { store, publisher, fake, posted } = await setup(t);
    await update(store);
    const originalPost = fake.post;
    fake.post = async (...args) => { await originalPost(...args); throw new Error("Lost response"); };
    const preview = publisher.preview(6487, 1728);
    await assert.rejects(publisher.publish(preview.token), /not confirmed/);
    await store.import(loaded());
    const restarted = await new BoardStore(store.file).load();
    const recovery = new Publisher(restarted, fake);
    assert.throws(() => recovery.preview(6487, 1728), /posted\/unconfirmed/);
    const author = posted[0].user.login;
    posted[0].user.login = "copied-marker-attacker";
    await assert.rejects(recovery.reconcile(6487, 1728), /Found 0/);
    posted[0].user.login = author;
    await recovery.reconcile(6487, 1728);
    assert.equal(restarted.item(6487, 1728).publication.status, "posted");
    assert.equal(posted.length, 1);
});

test("follow-up requires a posted needs-changes command and refreshed follow-up label; renewed cycles are not locked by old receipts", async (t) => {
    const { store, publisher, fake } = await setup(t);
    await update(store, { column: "needs-changes" });
    await publisher.publish(publisher.preview(6487, 1728).token);
    await assert.rejects(publisher.followup(6487, 1728), /follow-up/);
    fake.preflight = async () => ({
        issue, evidence: { ...evidence, issue: { ...evidence.issue, labels: [...evidence.issue.labels, "re-review-follow-up"] } },
    });
    await publisher.followup(6487, 1728);
    assert.equal(store.item(6487, 1728).publication, null);
    assert.equal(store.item(6487, 1728).history.length, 1);
    await update(store);
    fake.preflight = async () => ({ issue, evidence: store.item(6487, 1728).evidence });
    await publisher.publish(publisher.preview(6487, 1728).token);
    const renewed = loaded();
    renewed.issue.number = 9999;
    renewed.items[0].closedDate = "2026-11-19";
    renewed.items[0].evidence.issue.closedAt = "2026-11-19T12:00:00Z";
    renewed.items[0].evidence.hash = digest(renewed.items[0].evidence);
    await store.import(renewed);
    assert.doesNotThrow(() => store.editable(store.item(9999, 1728)));
});
