import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseReport, acceptGroup, digest } from "../.github/extensions/duplicate-review-board/lib/report.mjs";
import { BoardStore } from "../.github/extensions/duplicate-review-board/lib/state.mjs";
import { Publisher } from "../.github/extensions/duplicate-review-board/lib/publish.mjs";
import { createGitHub } from "../.github/extensions/duplicate-review-board/lib/github.mjs";
import { buildReviewPrompt } from "../.github/extensions/duplicate-review-board/lib/review.mjs";
import { startBoardServer } from "../.github/extensions/open-pr-board/lib/server.mjs";

const directory = fileURLToPath(new URL("../.github/extensions/duplicate-review-board/", import.meta.url));
function group(number = 1, name = "Testing", checked = " ", skill = "skills/testing/SKILL.md") {
    return `#### Group ${number}: ${name}\n\n- [${checked}] Reviewed - these are intentionally separate\n\n| Resource | Type | Description |\n|----------|------|-------------|\n| \`agents/testing.agent.md\` | Agent | Test agent |\n| \`${skill}\` | Skill | Test skill |\n\n**Why flagged:** Same test scope.\n\n---\n`;
}
const body = `### Summary\n\n### Potential Duplicates\n\n${group()}\n${group(2, "Other", "x", "skills/other")}\n<!-- report footer -->`;
const issue = { number: 12, title: "Duplicate Resource Review", html_url: "https://github.com/github/awesome-copilot/issues/12", state: "open", body };

async function fixture(t) {
    const root = await mkdtemp(path.resolve(".duplicate-review-board-test-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const file = path.join(root, "board.json");
    const store = await new BoardStore(file).load();
    await store.import(issue);
    return { root, file, store, id: store.snapshot().items[0].id };
}
async function decide(store, id, column = "separate") {
    const item = store.item(12, id);
    return store.update(12, id, { column, note: "Maintainer-only note", draft: item.draft, expectedRevision: item.revision });
}
function fakeGitHub() {
    let current = structuredClone(issue);
    const writes = [];
    const created = [];
    return {
        writes, created,
        setBody(value) { current.body = value; },
        setState(value) { current.state = value; },
        get: async () => structuredClone(current),
        patch: async (number, text) => {
            writes.push({ number, body: text });
            current.body = text;
            return structuredClone(current);
        },
        create: async (title, text) => {
            const value = { title, body: text, html_url: "https://github.com/github/awesome-copilot/issues/99" };
            created.push(value);
            writes.push(value);
            return value;
        },
        find: async (marker) => created.filter((entry) => entry.body.includes(marker)),
    };
}

test("report parser handles CRLF, details, checked boxes, and safe skill-folder paths", () => {
    const parsed = parseReport(`<details>\n<summary>Groups</summary>\n\n${body}\n</details>`.replaceAll("\n", "\r\n"));
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].reason, "Same test scope.");
    assert.equal(parsed[1].accepted, true);
    assert.equal(parsed[1].resources[1].path, "skills/other/SKILL.md");
    assert.equal(parseReport(group(1, "Testing", " ", "skills/testing"))[0].id, parsed[0].id);
    assert.equal(parseReport(group(8))[0].id, parseReport(group())[0].id);
    assert.equal(parseReport(group(8))[0].fingerprint, parseReport(group())[0].fingerprint);
});

test("table descriptions retain escaped pipes so all source evidence affects freshness", () => {
    const first = parseReport(group().replace("Test skill |", "Test skill \\| extra evidence |"))[0];
    const changed = parseReport(group().replace("Test skill |", "Test skill \\| changed evidence |"))[0];
    assert.equal(first.resources[1].description, "Test skill \\| extra evidence");
    assert.notEqual(first.fingerprint, changed.fingerprint);
});

test("acceptance changes exactly one checkbox byte and preserves all unrelated Markdown", () => {
    const first = parseReport(body)[0];
    const patched = acceptGroup(body, first.id);
    assert.equal(patched.length, body.length);
    const differences = [...body].flatMap((char, index) => char !== patched[index] ? [index] : []);
    assert.deepEqual(differences, [first.checkboxOffset]);
    assert.equal(parseReport(patched)[0].accepted, true);
});

test("malformed reports, duplicate groups, and path traversal fail explicitly", () => {
    for (const text of ["No groups", group().replace("- [ ] Reviewed", "Reviewed"), group() + group(2),
        group().replace("agents/testing.agent.md", "agents/../../secret.agent.md")]) {
        assert.throws(() => parseReport(text));
    }
});

test("local triage persists across reloads; group renumbering preserves decisions and queue IDs", async (t) => {
    const { file, store, id } = await fixture(t);
    await decide(store, id, "consolidate");
    const queued = await store.queue(12, id);
    await store.attachAgent(12, id, queued.queueId, "agent-123");
    await store.import({ ...issue, body: body.replace("Group 1:", "Group 10:") });
    const loaded = await new BoardStore(file).load();
    assert.equal(loaded.item(12, id).column, "consolidate");
    assert.equal(loaded.item(12, id).note, "Maintainer-only note");
    assert.equal(loaded.item(12, id).queueId, queued.queueId);
    assert.equal(loaded.item(12, id).agentId, "agent-123");
    assert.equal(loaded.item(12, id).number, 10);
    const other = await new BoardStore(path.join(path.dirname(file), "other.json")).load();
    assert.equal(other.snapshot().items.length, 0);
});

test("changed evidence resets the decision/review, preserves notes, and rejects old results", async (t) => {
    const { store, id } = await fixture(t);
    await decide(store, id);
    const queued = await store.queue(12, id);
    await store.import({ ...issue, body: body.replace("Same test scope.", "Different evidence.") });
    assert.equal(store.item(12, id).column, "unreviewed");
    assert.equal(store.item(12, id).changed, true);
    assert.equal(store.item(12, id).note, "Maintainer-only note");
    await assert.rejects(store.finish(12, id, queued.queueId, { recommendation: "separate", rationale: "late" }), /Stale/);
});

test("reviews never overwrite the maintainer decision; cancellation rejects late responses", async (t) => {
    const { store, id } = await fixture(t);
    await decide(store, id, "deferred");
    const first = await store.queue(12, id);
    await store.finish(12, id, first.queueId, { recommendation: "consolidate", rationale: "Cited overlap" });
    assert.equal(store.item(12, id).column, "deferred");
    assert.equal(store.item(12, id).review.rationale, "Cited overlap");
    const second = await store.queue(12, id);
    await store.cancel(12, id);
    await assert.rejects(store.finish(12, id, second.queueId, { error: "late" }), /Stale/);
    await assert.rejects(store.select("__proto__"), /Invalid report/);
});

test("corrupt persistence is surfaced and a failed mutation does not poison later writes", async (t) => {
    const { store, file, id } = await fixture(t);
    await assert.rejects(decide(store, id, "bad"), /Unknown/);
    await decide(store, id);
    assert.equal(JSON.parse(await readFile(file, "utf8")).reports[12].items[0].column, "separate");
    await writeFile(file, "not json", "utf8");
    await assert.rejects(new BoardStore(file).load(), /JSON/);
});

test("preview does not write; confirmed acceptance writes only its checkbox and records receipt", async (t) => {
    const { store, id } = await fixture(t);
    await decide(store, id);
    const gh = fakeGitHub();
    const publisher = new Publisher(store, gh);
    const preview = publisher.preview(12, id);
    assert.equal(gh.writes.length, 0);
    assert.equal(preview.body, acceptGroup(body, id));
    await publisher.publish(preview.token);
    assert.equal(gh.writes.length, 1);
    assert.equal(store.item(12, id).publication.status, "published");
    await assert.rejects(publisher.publish(preview.token), /expired/);
    assert.equal(gh.writes.length, 1);
});

test("source changes, closed reports, local edits, and cancelled previews prevent writes", async (t) => {
    const { store, id } = await fixture(t);
    await decide(store, id);
    const gh = fakeGitHub();
    const publisher = new Publisher(store, gh);
    let preview = publisher.preview(12, id);
    gh.setBody(body + "\nremote edit");
    await assert.rejects(publisher.publish(preview.token), /changed on GitHub/);
    gh.setBody(body);
    preview = publisher.preview(12, id);
    gh.setState("closed");
    await assert.rejects(publisher.publish(preview.token), /closed/);
    gh.setState("open");
    preview = publisher.preview(12, id);
    await decide(store, id, "consolidate");
    await assert.rejects(publisher.publish(preview.token), /Local triage changed/);
    assert.equal(gh.writes.length, 0);
    assert.equal(store.item(12, id).publication, null);
});

test("consolidation publishes the exact draft with a stable cross-report marker; notes stay private", async (t) => {
    const { store, id } = await fixture(t);
    await decide(store, id, "consolidate");
    const gh = fakeGitHub();
    const publisher = new Publisher(store, gh);
    const preview = publisher.preview(12, id);
    await publisher.publish(preview.token);
    assert.equal(gh.created[0].body, preview.body);
    assert.ok(gh.created[0].body.includes(`<!-- duplicate-review-board:${id} -->`));
    assert.ok(!gh.created[0].body.includes("Maintainer-only note"));
    await store.import({ ...issue, number: 13 });
    const item = store.item(13, id);
    await store.update(13, id, { ...item, column: "consolidate", expectedRevision: item.revision });
    assert.throws(() => publisher.preview(13, id), /publication exists.*Reconcile/);
    await publisher.reconcile(13, id);
    assert.equal(store.item(13, id).publication.url, gh.created[0].html_url);
    assert.equal(gh.created.length, 1);
});

test("unconfirmed GitHub write survives reload, blocks retries, and can be reconciled read-only", async (t) => {
    const { store, file, id } = await fixture(t);
    await decide(store, id, "consolidate");
    const gh = fakeGitHub();
    const create = gh.create;
    gh.create = async (...args) => { await create(...args); throw new Error("connection lost"); };
    const publisher = new Publisher(store, gh);
    await assert.rejects(publisher.publish(publisher.preview(12, id).token), /not confirmed/);
    const reloaded = await new BoardStore(file).load();
    const recovered = new Publisher(reloaded, gh);
    assert.equal(reloaded.item(12, id).publication.status, "unconfirmed");
    assert.throws(() => recovered.preview(12, id), /pending/);
    await recovered.reconcile(12, id);
    assert.equal(reloaded.item(12, id).publication.status, "published");
    assert.equal(gh.writes.length, 1);
});

test("success-shaped incomplete GitHub responses are never marked as published", async (t) => {
    const { store, id } = await fixture(t);
    await decide(store, id);
    const gh = fakeGitHub();
    gh.patch = async () => ({});
    const publisher = new Publisher(store, gh);
    await assert.rejects(publisher.publish(publisher.preview(12, id).token), /not confirmed/);
    assert.equal(store.item(12, id).publication.status, "unconfirmed");
});
test("concurrent confirmations cannot create duplicate tracking issues", async (t) => {
    const { store, id } = await fixture(t);
    await decide(store, id, "consolidate");
    const gh = fakeGitHub();
    const publisher = new Publisher(store, gh);
    const a = publisher.preview(12, id), b = publisher.preview(12, id);
    const results = await Promise.allSettled([publisher.publish(a.token), publisher.publish(b.token)]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(gh.created.length, 1);
});

test("updates require the current revision atomically and reject stale evidence and checkbox edits", async (t) => {
    const { store, id } = await fixture(t);
    const initial = structuredClone(store.item(12, id));
    const changes = { column: "consolidate", note: "Current note", draft: initial.draft, expectedRevision: initial.revision };
    await assert.rejects(store.update(12, id, { ...changes, expectedRevision: undefined }), /Local triage changed/);
    const saves = await Promise.allSettled([store.update(12, id, changes), store.update(12, id, { ...changes, note: "Stale note" })]);
    assert.deepEqual(saves.map((result) => result.status), ["fulfilled", "rejected"]);
    assert.equal(store.item(12, id).note, "Current note");
    const saved = structuredClone(store.item(12, id));
    await store.import({ ...issue, body: body.replace("Same test scope.", "New evidence.") });
    await assert.rejects(store.update(12, id, { ...changes, expectedRevision: saved.revision }), /Local triage changed/);
    assert.equal(store.item(12, id).column, "unreviewed");
    const changed = structuredClone(store.item(12, id));
    await store.import({ ...issue, body: acceptGroup(store.report(12).body, id) });
    await assert.rejects(store.update(12, id, { ...changes, expectedRevision: changed.revision }), /Local triage changed/);
    assert.equal(store.item(12, id).accepted, true);
});

test("removed publication recovery entries survive reload and keep locks when the group reappears", async (t) => {
    const { store, file, id } = await fixture(t);
    await decide(store, id, "consolidate");
    const gh = fakeGitHub();
    gh.create = async () => { throw new Error("lost response"); };
    const publisher = new Publisher(store, gh);
    await assert.rejects(publisher.publish(publisher.preview(12, id).token), /not confirmed/);
    const intent = structuredClone(store.item(12, id).publication);
    await store.import({ ...issue, body: group(2, "Other", "x", "skills/other") });
    const loaded = await new BoardStore(file).load();
    assert.equal(loaded.snapshot().items.find((item) => item.id === id).removed, true);
    assert.deepEqual(loaded.item(12, id).publication, intent);
    assert.throws(() => new Publisher(loaded, gh).preview(12, id), /removed/);
    await assert.rejects(loaded.queue(12, id), /removed/);
    await assert.rejects(new Publisher(loaded, gh).reconcile(12, id), /Found 0/);
    assert.deepEqual(loaded.item(12, id).publication, intent);
    gh.find = async () => [{ html_url: "https://github.com/github/awesome-copilot/issues/99" }];
    await new Publisher(loaded, gh).reconcile(12, id);
    assert.equal(loaded.item(12, id).publication.status, "published");
    const published = await new BoardStore(file).load();
    assert.equal(published.item(12, id).removed, true);
    assert.equal(published.item(12, id).publication.status, "published");
    await published.import(issue);
    assert.equal(published.item(12, id).removed, false);
    assert.equal(published.item(12, id).publication.status, "published");
    assert.throws(() => new Publisher(published, gh).preview(12, id), /pending/);
});

test("lost consolidation responses lock the stable group across reports even when search finds nothing", async (t) => {
    const { store, file, id } = await fixture(t);
    await decide(store, id, "consolidate");
    const gh = fakeGitHub();
    const create = gh.create;
    gh.create = async (...args) => { await create(...args); throw new Error("lost response"); };
    gh.find = async () => [];
    const publisher = new Publisher(store, gh);
    await assert.rejects(publisher.publish(publisher.preview(12, id).token), /not confirmed/);
    await store.import({ ...issue, number: 13 });
    const item = store.item(13, id);
    await store.update(13, id, { ...item, column: "consolidate", expectedRevision: item.revision });
    const loaded = await new BoardStore(file).load();
    const recovered = new Publisher(loaded, gh);
    assert.throws(() => recovered.preview(13, id), /publication exists.*Reconcile/);
    await assert.rejects(recovered.reconcile(13, id), /Found 0/);
    assert.throws(() => recovered.preview(13, id), /publication exists.*Reconcile/);
    assert.equal(gh.created.length, 1);
});

test("cross-report intents are checked atomically even with previews and publishers created before either write", async (t) => {
    const { store, id } = await fixture(t);
    await decide(store, id, "consolidate");
    await store.import({ ...issue, number: 13 });
    const item = store.item(13, id);
    await store.update(13, id, { ...item, column: "consolidate", expectedRevision: item.revision });
    const gh = fakeGitHub();
    let searches = 0, release;
    const bothSearched = new Promise((resolve) => { release = resolve; });
    gh.find = async () => {
        if (++searches === 2) release();
        await bothSearched;
        return [];
    };
    const a = new Publisher(store, gh), b = new Publisher(store, gh);
    const first = a.preview(12, id), second = b.preview(13, id);
    const results = await Promise.allSettled([a.publish(first.token), b.publish(second.token)]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.match(results.find((result) => result.status === "rejected").reason.message, /publication exists.*Reconcile/);
    assert.equal(gh.created.length, 1);
});

test("two acceptances publish sequentially without reimporting and adopt verified source state", async (t) => {
    const { store, file, id } = await fixture(t);
    const unchecked = body.replace("- [x] Reviewed", "- [ ] Reviewed");
    await store.import({ ...issue, body: unchecked });
    const gh = fakeGitHub();
    gh.setBody(unchecked);
    const publisher = new Publisher(store, gh);
    await decide(store, id);
    await publisher.publish(publisher.preview(12, id).token);
    assert.equal(store.item(12, id).accepted, true);
    assert.equal(store.report(12).sourceHash, digest(gh.writes[0].body));
    const second = store.snapshot().items[1];
    await decide(store, second.id);
    await publisher.publish(publisher.preview(12, second.id).token);
    const loaded = await new BoardStore(file).load();
    assert.equal(gh.writes.length, 2);
    assert.equal(loaded.report(12).body, gh.writes[1].body);
    assert.equal(loaded.report(12).sourceHash, digest(gh.writes[1].body));
    assert.ok(loaded.snapshot().items.every((item) => item.accepted && item.publication.status === "published"));
});

test("reconciliation does not adopt a checkbox when other active group evidence changed", async (t) => {
    const { store, id } = await fixture(t);
    const uncheckedBody = body.replace("- [x] Reviewed", "- [ ] Reviewed");
    await store.import({ ...issue, body: uncheckedBody });
    const second = store.snapshot().items[1];
    await decide(store, id);
    await decide(store, second.id, "consolidate");
    const originalHash = store.report(12).sourceHash;
    const gh = fakeGitHub();
    const otherGroup = group(2, "Other", " ", "skills/other");
    const changedBody = acceptGroup(uncheckedBody.replace(
        otherGroup,
        otherGroup.replace("Same test scope.", "Changed evidence."),
    ), id);
    gh.setBody(changedBody);

    await new Publisher(store, gh).reconcile(12, id);

    assert.equal(store.item(12, id).publication.status, "published");
    assert.equal(store.item(12, id).accepted, false);
    assert.equal(store.item(12, id).column, "separate");
    assert.equal(store.item(12, second.id).column, "consolidate");
    assert.equal(store.report(12).body, uncheckedBody);
    assert.equal(store.report(12).sourceHash, originalHash);

    const publisher = new Publisher(store, gh);
    await assert.rejects(publisher.publish(publisher.preview(12, second.id).token), /report changed on GitHub/);
    assert.equal(gh.created.length, 0);

    await store.import({ ...issue, body: changedBody });
    assert.equal(store.item(12, second.id).column, "unreviewed");
    assert.equal(store.item(12, second.id).changed, true);
});

test("reconciliation does not adopt a checkbox when active groups were added or removed", async (t) => {
    for (const [change, sourceBody] of [
        ["added", body.replace("<!-- report footer -->", `${group(3, "Added", " ", "skills/added")}\n<!-- report footer -->`)],
        ["removed", `### Summary\n\n### Potential Duplicates\n\n${group()}\n<!-- report footer -->`],
    ]) {
        const { store, id } = await fixture(t);
        await decide(store, id);
        const originalHash = store.report(12).sourceHash;
        const gh = fakeGitHub();
        const remoteBody = acceptGroup(sourceBody, id);
        gh.setBody(remoteBody);

        await new Publisher(store, gh).reconcile(12, id);

        assert.equal(store.item(12, id).publication.status, "published", change);
        assert.equal(store.report(12).body, body, change);
        assert.equal(store.report(12).sourceHash, originalHash, change);
        await store.import({ ...issue, body: remoteBody });
        assert.equal(store.snapshot().items.length, change === "added" ? 3 : 1, change);
        assert.deepEqual(
            store.snapshot().items.map((item) => item.id).sort(),
            parseReport(remoteBody).map((group) => group.id).sort(),
            change,
        );
    }
});

test("acceptance receipt does not overwrite a newer import while the GitHub write is in flight", async (t) => {
    const { store, id } = await fixture(t);
    await decide(store, id);
    const gh = fakeGitHub();
    let started, finish;
    const writing = new Promise((resolve) => { started = resolve; });
    const response = new Promise((resolve) => { finish = resolve; });
    gh.patch = async (_number, text) => { started(text); return response; };
    const publisher = new Publisher(store, gh);
    const publication = publisher.publish(publisher.preview(12, id).token);
    const publishedBody = await writing;
    const newerBody = body.replace("Same test scope.", "Newer evidence.");
    await store.import({ ...issue, body: newerBody });
    const newerRevision = store.item(12, id).revision;
    finish({ ...issue, body: publishedBody });
    await publication;
    assert.equal(store.report(12).body, newerBody);
    assert.equal(store.report(12).sourceHash, digest(newerBody));
    assert.equal(store.item(12, id).accepted, false);
    assert.equal(store.item(12, id).column, "unreviewed");
    assert.equal(store.item(12, id).publication.status, "published");
    assert.notEqual(store.item(12, id).revision, newerRevision);
});

test("reconciliation without an intent rejects edits and imports made during its remote read", async (t) => {
    for (const [kind, change] of [["separate", "edit"], ["separate", "import"], ["consolidate", "edit"], ["consolidate", "import"]]) {
        const { store, id } = await fixture(t);
        await decide(store, id, kind);
        const gh = fakeGitHub();
        let started, finish;
        const reading = new Promise((resolve) => { started = resolve; });
        const response = new Promise((resolve) => { finish = resolve; });
        gh[kind === "separate" ? "get" : "find"] = async () => { started(); return response; };
        const reconciliation = new Publisher(store, gh).reconcile(12, id);
        await reading;
        const changedColumn = kind === "separate" ? "consolidate" : "separate";
        if (change === "edit") await decide(store, id, changedColumn);
        else await store.import({ ...issue, body: body.replace("Same test scope.", "Changed evidence.") });
        finish(kind === "separate" ? { ...issue, body: acceptGroup(body, id) } : [{ html_url: issue.html_url }]);
        await assert.rejects(reconciliation, /changed.*Reconcile again/);
        assert.equal(store.item(12, id).publication, null);
        assert.equal(store.item(12, id).column, change === "edit" ? changedColumn : "unreviewed");
    }
});

test("GitHub adapter uses fixed-repository REST writes and rejects non-report imports", async () => {
    const calls = [];
    const gh = createGitHub(async (args, input) => {
        calls.push({ args, input });
        return JSON.stringify({ ...issue, labels: [{ name: "duplicate-review" }] });
    });
    await gh.get(12);
    await gh.patch(12, "exact body");
    assert.deepEqual(calls[1].args, ["api", "repos/github/awesome-copilot/issues/12", "--method", "PATCH", "--input", "-"]);
    assert.equal(JSON.parse(calls[1].input).body, "exact body");
    const invalid = createGitHub(async () => JSON.stringify({ ...issue, labels: [] }));
    await assert.rejects(invalid.get(12), /labelled duplicate-review/);
    await assert.rejects(gh.get("../other"), /Invalid/);
    await gh.content("skills/foo/SKILL.md");
    assert.deepEqual(calls.at(-1).args, ["api", "repos/github/awesome-copilot/contents/skills/foo/SKILL.md?ref=main", "-H", "Accept: application/vnd.github.raw"]);
});

test("resource viewer reads only files listed in the opened group", async (t) => {
    const { act } = await loadExtension(t);
    await act("import_report", { number: 12 });
    const item = (await act("get_board")).items[0];
    const file = item.resources[0].path;
    const result = await act("read_resource", { number: 12, id: item.id, path: file });
    assert.deepEqual({ ...result }, { path: file, ref: "main", content: `contents of ${file}`, truncated: false });
    await assert.rejects(act("read_resource", { number: 12, id: item.id, path: "agents/../../secret.md" }), /not part of this duplicate group/);
});

test("local decision updates are UI-only and reject stale saves", async (t) => {
    const { canvas, act } = await loadExtension(t);
    assert.ok(!canvas.actions.some((action) => ["update_group", "cancel_review"].includes(action.name)));
    await act("import_report", { number: 12 });
    const opened = await canvas.open({ instanceId: "test-duplicate-board", input: {} });
    const html = await (await fetch(opened.url)).text();
    const token = /name="board-token" content="([^"]+)"/.exec(html)[1];
    const uiBoard = () => fetch(opened.url + "api/board", { headers: { "x-board-token": token } }).then((response) => response.json());
    const item = (await uiBoard()).items[0];
    const update = (changes) => fetch(opened.url + "api/update", {
        method: "POST",
        headers: { "x-board-token": token, "Content-Type": "application/json" },
        body: JSON.stringify(changes),
    });
    const changes = { number: 12, id: item.id, column: "consolidate", note: "Saved", draft: item.draft };
    assert.equal((await update(changes)).status, 400);
    assert.equal((await update({ ...changes, expectedRevision: item.revision })).status, 200);
    assert.equal((await update({ ...changes, note: "Stale", expectedRevision: item.revision })).status, 400);
    assert.equal((await uiBoard()).items[0].note, "Saved");
    assert.equal((await act("get_board")).items[0].note, undefined);
});

async function loadExtension(t, { supported = true } = {}) {
    const { root } = await fixture(t);
    let canvas;
    const starts = [];
    const sdk = {
        createCanvas: (definition) => definition,
        CanvasError: class extends Error { constructor(code, message) { super(message); this.code = code; } },
        joinSession: async (options) => {
            [canvas] = options.canvases;
            return {
                workspacePath: root, log() {},
                send: () => { throw new Error("Foreground send is forbidden"); },
                rpc: { tasks: supported ? { startAgent: async (request) => { starts.push(request); return { agentId: "background-42" }; } } : {} },
            };
        },
    };
    const context = vm.createContext();
    const filename = path.join(directory, "extension.mjs");
    const module = new vm.SourceTextModule(await readFile(filename, "utf8"), {
        context, initializeImportMeta(meta) { meta.url = pathToFileURL(filename).href; },
    });
    await module.link(async (specifier) => {
        const exports = specifier === "@github/copilot-sdk/extension" ? sdk :
            specifier === "./lib/github.mjs" ? { createGitHub: () => ({ get: async () => structuredClone(issue), content: async (file) => `contents of ${file}` }) } :
            await import(specifier.startsWith(".") ? pathToFileURL(path.resolve(directory, specifier)).href : specifier);
        return new vm.SyntheticModule(Object.keys(exports), function () {
            for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
        }, { context });
    });
    await module.evaluate();
    const act = (name, input = {}) => canvas.actions.find((action) => action.name === name).handler({ instanceId: "test-duplicate-board", input });
    t.after(() => canvas.onClose({ instanceId: "test-duplicate-board" }));
    return { canvas, act, starts };
}

test("canvas opens and actions dispatch directly to a background task, never foreground send", async (t) => {
    const { canvas, act, starts } = await loadExtension(t);
    await act("import_report", { number: 12 });
    const first = (await act("get_board")).items[0];
    const opened = await canvas.open({ instanceId: "test-duplicate-board", input: {} });
    assert.match(opened.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
    assert.equal((await fetch(opened.url)).status, 200);
    const result = await act("start_review", { number: 12, id: first.id });
    assert.equal(result.agentId, "background-42");
    assert.equal(starts.length, 1);
    assert.equal(starts[0].agentType, "general-purpose");
    assert.match(starts[0].prompt, /Read-only/);
    assert.match(starts[0].prompt, /untrusted evidence/);
    await act("record_review", { number: 12, id: first.id, queueId: result.queueId, recommendation: "separate", rationale: "Concrete comparison" });
    assert.equal((await act("get_board")).items[0].review.rationale, "Concrete comparison");
    assert.ok(!canvas.actions.some((action) => action.name === "publish"));
});

test("background API absence fails explicitly without foreground fallback or a stuck queue", async (t) => {
    const { act } = await loadExtension(t, { supported: false });
    await act("import_report", { number: 12 });
    const item = (await act("get_board")).items[0];
    await assert.rejects(act("start_review", { number: 12, id: item.id }), /foreground fallback is disabled/);
    const after = (await act("get_board")).items[0];
    assert.equal(after.queueId, null);
    assert.match(after.reviewError, /Could not dispatch background review/);
});

test("HTTP canvas requires a board token for API access and serves escaped client-rendered content", async (t) => {
    const server = await startBoardServer({
        publicDir: path.join(directory, "public"),
        api: { snapshot: () => ({ items: [] }), subscribe: () => () => {}, routes: { "GET /api/board": () => ({ items: [] }) } },
    });
    t.after(() => server.close());
    const response = await fetch(server.url);
    const html = await response.text();
    const token = /name="board-token" content="([^"]+)"/.exec(html)[1];
    assert.equal((await fetch(server.url + "api/board")).status, 403);
    assert.equal((await fetch(server.url + "api/board", { headers: { "x-board-token": token } })).status, 200);
    const script = await (await fetch(server.url + "app.js")).text();
    assert.ok(!script.includes(".innerHTML"));
    assert.match(response.headers.get("content-security-policy"), /script-src 'self'/);
});

test("background brief is bounded, read-only, and carries its exact stale-result token", () => {
    const item = { ...parseReport(body)[0], queueId: "exact-token" };
    const prompt = buildReviewPrompt({ number: 12, item, instanceId: "panel-1" });
    assert.match(prompt, /do not launch more agents/);
    assert.match(prompt, /"queueId":"exact-token"/);
    assert.match(prompt, /Do not edit files/);
});
