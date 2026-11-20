import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

const source = await readFile(new URL("../../../../extensions/external-plugin-rereview-board/public/app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../../../../extensions/external-plugin-rereview-board/public/index.html", import.meta.url), "utf8");
const item = (id, changes = {}) => ({
    id, name: `plugin-${id}`, repo: `owner/plugin-${id}`, version: "1.0.0", closedDate: "2026-05-19", days: 0,
    url: `https://github.com/github/awesome-copilot/issues/${id}`, revision: `revision-${id}`,
    column: "unreviewed", note: "", reason: "", review: null, queueId: null, publication: null,
    evidence: { reasons: [], plugin: { name: `plugin-${id}`, version: "1.0.0" }, comments: [], issue: { title: "Submission", body: "Original text" } },
    ...changes,
});
const snapshot = () => ({
    repo: "github/awesome-copilot", selected: 6487, snapshotSequence: 1,
    reports: [{ number: 6487, title: "Queue" }],
    columns: [
        { id: "unreviewed", label: "Unreviewed" },
        { id: "in-review", label: "In review", readOnly: true }, { id: "keep", label: "Keep" },
        { id: "needs-changes", label: "Needs changes" }, { id: "remove", label: "Remove" },
    ],
    items: [item(1), item(2)],
});

function createUI(board = snapshot()) {
    let document;
    class Node {
        constructor(tag) {
            this.tagName = tag.toUpperCase();
            this.children = [];
            this.dataset = {};
            this.attributes = {};
            this.listeners = {};
            this.value = "";
            this.hidden = false;
            this.disabled = false;
            this.open = false;
            this.isConnected = true;
            this.scrollTop = 0;
            const classes = new Set();
            this.classList = {
                add: (value) => classes.add(value), remove: (value) => classes.delete(value),
                contains: (value) => classes.has(value),
                toggle(value, enabled) { if (enabled ?? !classes.has(value)) classes.add(value); else classes.delete(value); },
            };
            Object.defineProperty(this, "className", { set(value) { classes.clear(); value.split(" ").forEach((value) => classes.add(value)); }, get: () => [...classes].join(" ") });
        }
        set textContent(value) { this.text = value; this.children = []; }
        get textContent() { return this.children.length ? this.children.map((node) => node.textContent).join("") : this.text ?? ""; }
        append(...nodes) { this.children.push(...nodes); }
        replaceChildren(...nodes) { this.text = ""; this.children = nodes; }
        setAttribute(name, value) { this.attributes[name] = String(value); }
        removeAttribute(name) { delete this.attributes[name]; if (name === "href") delete this.href; }
        toggleAttribute(name, enabled) { if (enabled) this.attributes[name] = ""; else delete this.attributes[name]; }
        addEventListener(name, handler) { (this.listeners[name] ??= []).push(handler); }
        async fire(name, event = {}) {
            for (const listener of this.listeners[name] ?? []) await listener({ target: this, currentTarget: this, preventDefault() {}, ...event });
        }
        querySelectorAll(selector) {
            const children = this.children.flatMap((node) => [node, ...node.querySelectorAll(selector)]);
            return children.filter((node) => selector === "[data-focus]" ? node.dataset.focus : node.classList.contains(selector.slice(1)));
        }
        focus() { document.activeElement = this; }
        showModal() { this.open = true; }
        close() { this.open = false; return this.fire("close"); }
    }
    const nodes = new Map([...html.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"[^>]*>/g)].map(([tag, name, id]) => {
        const node = new Node(name);
        node.hidden = /\bhidden\b/.test(tag);
        return [id, node];
    }));
    const tabs = ["review", "plugin", "issue", "comments", "notes", "activity"].map((name) => {
        const tab = nodes.get(`tab-${name}`);
        tab.dataset.tab = name;
        tab.className = "tab";
        return tab;
    });
    document = {
        activeElement: nodes.get("search"),
        createElement: (tag) => new Node(tag),
        getElementById(id) { assert.ok(nodes.has(id), `HTML contains #${id}`); return nodes.get(id); },
        querySelector: () => ({ content: "token" }),
        querySelectorAll: (selector) => selector === ".tab" ? tabs :
            [...nodes.values()].flatMap((node) => node.querySelectorAll(selector)),
    };
    const context = vm.createContext({ document, setTimeout() {} });
    vm.runInContext(source.slice(0, source.indexOf("const events = new EventSource")), context);
    context.adopt(structuredClone(board));
    return { context, nodes, tabs, document };
}

test("cards use board patterns and keyboard activation opens the right-side detail workflow", async () => {
    const { context, nodes } = createUI();
    const cards = nodes.get("board").querySelectorAll(".card");
    assert.equal(cards.length, 2);
    assert.equal(cards[0].attributes.role, "button");
    assert.match(cards[0].textContent, /#1.*plugin-1/);
    await cards[0].fire("keydown", { key: "Enter" });
    assert.equal(nodes.get("detail").open, true);
    assert.equal(nodes.get("detail-title").textContent, "plugin-1");
    assert.equal(nodes.get("preview").disabled, true, "unreviewed cards cannot preview commands");
    nodes.get("search").value = "not-a-plugin";
    context.render();
    assert.equal(nodes.get("board").querySelectorAll(".card").length, 0);
    assert.match(nodes.get("board").textContent, /No matching plugins/);
});

test("tabs provide roving keyboard focus and correctly labelled, exclusive panels", async () => {
    const { context, nodes, tabs, document } = createUI();
    context.show(snapshot().items[0]);
    await tabs[0].fire("keydown", { key: "ArrowRight" });
    assert.equal(nodes.get("panel-review").hidden, true);
    assert.equal(nodes.get("panel-plugin").hidden, false);
    assert.equal(tabs[1].attributes["aria-selected"], "true");
    assert.equal(tabs[1].tabIndex, 0);
    assert.equal(document.activeElement, tabs[1]);
    await tabs[1].fire("keydown", { key: "End" });
    assert.equal(nodes.get("panel-activity").hidden, false);
    assert.equal(tabs.filter((tab) => tab.tabIndex === 0).length, 1);
    await tabs.at(-1).fire("keydown", { key: "Home" });
    assert.equal(nodes.get("panel-review").hidden, false);
});

test("In review automatically groups queued cards without changing saved decisions or accepting manual moves", async () => {
    const board = snapshot();
    board.items[0].column = "keep";
    board.items[0].queueId = "queued";
    const { context, nodes } = createUI(board);
    const columnCards = (id) => nodes.get("board").children.find((node) => node.dataset.column === id).querySelectorAll(".card");
    assert.equal(columnCards("in-review").length, 1);
    assert.equal(columnCards("keep").length, 0);
    context.show(board.items[0]);
    assert.equal(nodes.get("decision").value, "keep");
    assert.ok(!nodes.get("decision").children.some((option) => option.value === "in-review"));
    let requests = 0;
    context.api = async () => { requests++; throw new Error("Unexpected manual move"); };
    const list = nodes.get("board").children.find((node) => node.dataset.column === "in-review").querySelectorAll(".column-cards")[0];
    await list.fire("drop", { dataTransfer: { getData: () => "2" } });
    assert.equal(requests, 0);
    for (const result of [
        { review: { recommendation: "remove", rationale: "Evidence" } },
        { review: null, reviewError: "Dispatch failed" },
        { review: null, reviewError: "Cancelled locally" },
    ]) {
        board.snapshotSequence++;
        Object.assign(board.items[0], result, { queueId: null });
        context.adopt(structuredClone(board));
        assert.equal(columnCards("in-review").length, 0);
        assert.equal(columnCards("keep").length, 1);
        board.snapshotSequence++;
        board.items[0].queueId = "queued-again";
        context.adopt(structuredClone(board));
    }
});

test("completed recommendations group undecided cards, preserve saved decisions, and cannot authorize publication", async () => {
    const board = snapshot();
    board.items = [
        item(1, { review: { recommendation: "keep", rationale: "Keep evidence" } }),
        item(2, { review: { recommendation: "needs-changes", rationale: "Change evidence" } }),
        item(3, { review: { recommendation: "remove", rationale: "Remove evidence" } }),
        item(4, { reviewError: "Recording failed" }),
        item(5, { column: "keep", review: { recommendation: "remove", rationale: "Disagrees" } }),
    ];
    const { context, nodes } = createUI(board);
    const cards = (id) => nodes.get("board").children.find((node) => node.dataset.column === id).querySelectorAll(".card");
    assert.deepEqual(cards("keep").map((card) => card.dataset.id), [1, 5]);
    assert.deepEqual(cards("needs-changes").map((card) => card.dataset.id), [2]);
    assert.deepEqual(cards("remove").map((card) => card.dataset.id), [3]);
    assert.deepEqual(cards("unreviewed").map((card) => card.dataset.id), [4]);
    context.show(board.items[0]);
    assert.equal(nodes.get("decision").value, "unreviewed");
    assert.equal(nodes.get("preview").disabled, true);
    assert.match(nodes.get("draft-status").textContent, /AI suggests Keep.*save a decision/);
    board.snapshotSequence++;
    board.items[0].queueId = "retry";
    context.adopt(structuredClone(board));
    assert.deepEqual(cards("in-review").map((card) => card.dataset.id), [1]);
    board.snapshotSequence++;
    board.items[0].queueId = null;
    board.items[0].review = { recommendation: "remove", rationale: "New evidence" };
    context.adopt(structuredClone(board));
    assert.deepEqual(cards("remove").map((card) => card.dataset.id), [1, 3]);
});

test("Plugin details distinguish stable releases, HEAD manifests, and incomplete upstream evidence as inert text", () => {
    const board = snapshot();
    board.items[0].evidence.upstream = {
        status: "partial", errors: ["Comparison: API rate limit exceeded"],
        release: { tag: "repo-v2", publishedAt: "2026-11-19", notes: "<script>not executable</script>", notesTruncated: true, url: "javascript:alert(1)" },
        stable: { manifest: { name: "plugin-1", version: "1.1.0", matchesPlugin: true, path: "plugins/one/plugin.json" } },
        head: { manifest: { name: "different-plugin", version: "2.0.0", matchesPlugin: false, path: "plugins/one/plugin.json" } },
        comparisons: [{ label: "Default branch", status: "ahead", aheadBy: 3, behindBy: 0, files: [], filesTruncated: true }],
    };
    const { context, nodes } = createUI(board);
    context.show(board.items[0]);
    const summary = nodes.get("upstream-summary");
    assert.match(summary.textContent, /Latest stable release.*repo-v2/);
    assert.match(summary.textContent, /Release manifest.*plugin-1 v1.1.0/);
    assert.match(summary.textContent, /Default branch.*different-plugin v2.0.0.*identity mismatch/);
    assert.match(summary.textContent, /File list is incomplete/);
    assert.match(summary.textContent, /API rate limit exceeded/);
    assert.match(summary.textContent, /<script>not executable<\/script>/);
    const releaseLink = summary.children[0].children[3].children[0];
    assert.equal(releaseLink.href, undefined, "untrusted upstream links cannot execute scripts");
    assert.match(nodes.get("drawer-labels").textContent, /Upstream check incomplete.*Upstream version differs/);
    context.show(board.items[1]);
    assert.match(summary.textContent, /Not inspected yet/);
});

test("upstream request drafts target the verified source repo with public metadata, never private content or automatic writes", async () => {
    const board = snapshot();
    const target = board.items[0];
    target.evidence.plugin.source = { repo: target.repo, ref: "v1.0.0", sha: "c".repeat(40), path: "plugins/one" };
    target.note = "PRIVATE-NOTE";
    target.reason = "STAGED-REASON";
    target.review = { recommendation: "keep", rationale: "AI-RATIONALE" };
    target.evidence.upstream = {
        release: { tag: "repo/v1.1.0" },
        stable: { sha: "b".repeat(40), manifest: { name: target.name, version: "1.1.0", path: "plugins/one/plugin.json", matchesPlugin: true } },
        head: { sha: "a".repeat(40), manifest: { name: target.name, version: "1.2.0-beta.1", path: "plugins/one/plugin.json", matchesPlugin: true } },
        errors: ["SENSITIVE-RAW-API-ERROR"],
    };
    const { context, nodes } = createUI(board);
    context.api = () => { throw new Error("Opening a GitHub draft must not write through the board API"); };
    context.show(target);
    nodes.get("guidance").value = "PRIVATE-GUIDANCE";
    const request = nodes.get("upstream-request");
    const url = new URL(request.href);
    assert.equal(url.origin, "https://github.com");
    assert.equal(url.pathname, "/owner/plugin-1/issues/new");
    assert.match(url.searchParams.get("title"), /Awesome Copilot.*plugin-1/);
    const body = url.searchParams.get("body");
    assert.match(body, /submit a pull request.*latest suitable supported plugin version/);
    assert.match(body, /Version: 1.0.0/);
    assert.match(body, /Source pin: c{40}/);
    assert.match(body, /releases\/tag\/repo%2Fv1.1.0/);
    assert.match(body, /HEAD \(may be unreleased\).*1.2.0-beta.1.*blob\/a{40}\/plugins\/one\/plugin.json/);
    assert.match(body, /#updating-listed-external-plugins-via-pr/);
    assert.match(body, /inspection was incomplete/);
    assert.doesNotMatch(body, /PRIVATE-|STAGED-|AI-RATIONALE|SENSITIVE-RAW-API-ERROR/);
    assert.equal(new URL(nodes.get("upstream-requests").href).searchParams.get("q"), 'is:issue "Awesome Copilot"');
    await request.fire("click");
    assert.equal(target.column, "unreviewed");
    assert.equal(nodes.get("confirmation").open, false);
    assert.match(nodes.get("upstream-request-hint").textContent, /nothing is posted/);
    const changed = structuredClone(board);
    changed.snapshotSequence++;
    changed.items[0].revision = "changed";
    context.adopt(changed);
    assert.equal(request.hidden, true);
    assert.equal(request.href, undefined);
    assert.match(nodes.get("upstream-request-hint").textContent, /Reload the current card/);
});

test("upstream requests reject removed, blocked and mismatched sources without inventing evidence when upstream is unknown", () => {
    for (const change of [
        (target) => { target.removed = true; },
        (target) => { target.evidence.reasons = ["Identity mismatch"]; },
        (target) => { target.evidence.plugin.source.repo = "attacker/other"; },
        (target) => { target.evidence.plugin.source.repo = "https://evil.test/repo"; },
        (target) => { target.evidence.plugin = null; },
    ]) {
        const board = snapshot();
        const target = board.items[0];
        target.evidence.plugin.source = { repo: target.repo, ref: "v1.0.0" };
        change(target);
        const { context, nodes } = createUI(board);
        context.show(target);
        assert.equal(nodes.get("upstream-request").hidden, true);
        assert.equal(nodes.get("upstream-request").href, undefined);
    }
    const board = snapshot();
    const target = board.items[0];
    target.evidence.plugin.source = { repo: target.repo, ref: "v1.0.0" };
    const { context, nodes } = createUI(board);
    context.show(target);
    const body = new URL(nodes.get("upstream-request").href).searchParams.get("body");
    assert.match(body, /unknown or not published; please verify/);
    assert.match(body, /HEAD \(may be unreleased\): not available/);
    assert.doesNotMatch(body, /plugin-2/);
});

test("closing and reopening preserves unsaved drafts; changed evidence pauses saves until explicit reload", async () => {
    const { context, nodes } = createUI();
    context.show(snapshot().items[0]);
    nodes.get("note").value = "Unsaved private note";
    await nodes.get("note").fire("input");
    assert.equal(nodes.get("save").disabled, false);
    await nodes.get("close").fire("click");
    context.show(snapshot().items[1]);
    assert.equal(nodes.get("note").value, "");
    await nodes.get("close").fire("click");
    context.show(snapshot().items[0]);
    assert.equal(nodes.get("note").value, "Unsaved private note");
    const changed = snapshot();
    changed.snapshotSequence = 2;
    changed.items[0].revision = "new-evidence";
    changed.items[0].note = "Saved elsewhere";
    context.adopt(changed);
    assert.equal(nodes.get("conflict").hidden, false);
    assert.equal(nodes.get("save").disabled, true);
    await nodes.get("reload-card").fire("click");
    assert.equal(nodes.get("conflict").hidden, true);
    assert.equal(nodes.get("note").value, "Saved elsewhere");
    assert.equal(nodes.get("save").disabled, true);
});

test("guidance-only drafts do not restore obsolete triage after a card changes", async () => {
    const { context, nodes } = createUI();
    context.show(snapshot().items[0]);
    nodes.get("guidance").value = "Check compatibility";
    await nodes.get("guidance").fire("input");
    await nodes.get("close").fire("click");
    const changed = snapshot();
    changed.snapshotSequence = 2;
    changed.items[0].revision = "new-evidence";
    changed.items[0].column = "keep";
    changed.items[0].reason = "Saved elsewhere";
    context.adopt(changed);
    context.show(changed.items[0]);
    assert.equal(nodes.get("guidance").value, "Check compatibility");
    assert.equal(nodes.get("decision").value, "keep");
    assert.equal(nodes.get("reason").value, "Saved elsewhere");
    assert.equal(nodes.get("conflict").hidden, true);
});

test("Review pending includes filtered eligible cards, excludes reviewed/blocked/queued/actioned cards, and reports individual failures", async () => {
    const board = snapshot();
    board.items = [
        item(1), item(2, { review: { recommendation: "keep", rationale: "Done" } }),
        item(3, { evidence: { ...item(3).evidence, reasons: ["Not due"] } }),
        item(4), item(5, { queueId: "queued" }), item(6, { publication: { status: "posted" } }),
    ];
    const { context, nodes } = createUI(board);
    nodes.get("search").value = "hide-everything";
    const requests = [];
    context.api = async (name, body) => {
        requests.push({ name, body });
        if (name === "review" && body.id === 4) throw new Error("Dispatch failed");
        return name === "board" ? board : {};
    };
    await nodes.get("review-pending").fire("click");
    assert.deepEqual(requests.filter(({ name }) => name === "review").map(({ body }) => body.id), [1, 4]);
    assert.match(nodes.get("message").textContent, /1 background reviews queued.*#4: Dispatch failed/);
    assert.equal(nodes.get("message").attributes["data-agent-error"], "");
    assert.ok(!requests.some(({ name }) => name === "publish"));
});

test("footer saves before preview, preserves private-note separation, and requires a distinct publication confirmation", async () => {
    const board = snapshot();
    const { context, nodes } = createUI(board);
    context.show(board.items[0]);
    nodes.get("decision").value = "keep";
    nodes.get("note").value = "PRIVATE-NOTE";
    nodes.get("reason").value = "Public reason";
    await nodes.get("note").fire("input");
    assert.equal(nodes.get("preview").disabled, true);
    const requests = [];
    context.api = async (name, body) => {
        requests.push({ name, body });
        if (name === "update") {
            Object.assign(board.items[0], body, { revision: "saved" });
            board.snapshotSequence++;
            return structuredClone(board);
        }
        if (name === "preview") return { token: "preview", target: board.items[0].url, body: "/re-review-keep\n\nPublic reason" };
        throw new Error(`Unexpected request: ${name}`);
    };
    await nodes.get("save").fire("click");
    assert.equal(nodes.get("preview").disabled, false);
    await nodes.get("preview").fire("click");
    assert.equal(nodes.get("confirmation").open, true);
    assert.doesNotMatch(nodes.get("payload").textContent, /PRIVATE-NOTE/);
    assert.equal(requests.filter(({ name }) => name === "publish").length, 0);
    await nodes.get("dismiss").fire("click");
    assert.equal(nodes.get("confirmation").open, false);
});
