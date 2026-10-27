import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../.github/extensions/duplicate-review-board/public/app.js", import.meta.url), "utf8");

class FakeElement {
    constructor(tag = "div", document) {
        this.tagName = tag.toUpperCase();
        this.document = document;
        this.children = [];
        this.listeners = new Map();
        this.dataset = {};
        this.attributes = {};
        this.className = "";
        this.classList = {
            toggle: (name, force) => { this[name] = force; },
            add: (name) => { this[name] = true; },
        };
        this.hidden = false;
        this.disabled = false;
        this.checked = false;
        this.value = "";
        this.textContent = "";
        this.open = false;
    }

    get isConnected() {
        for (let node = this; node; node = node.parentNode) if (node === this.document.body) return true;
        return false;
    }

    set id(value) {
        this._id = value;
        this.document.ids.set(value, this);
    }
    get id() { return this._id; }

    append(...nodes) {
        for (const node of nodes) {
            if (node.parentNode) node.parentNode.children = node.parentNode.children.filter((child) => child !== node);
            node.parentNode = this;
            this.children.push(node);
        }
    }

    replaceChildren(...nodes) {
        for (const child of this.children) child.parentNode = null;
        this.children = [];
        this.append(...nodes);
    }

    addEventListener(name, callback) {
        const listeners = this.listeners.get(name) || [];
        listeners.push(callback);
        this.listeners.set(name, listeners);
    }

    dispatch(name, event = {}) {
        for (const callback of this.listeners.get(name) || []) callback({ type: name, preventDefault() {}, ...event });
    }
    click() { this.dispatch("click"); }

    setAttribute(name, value) { this.attributes[name] = value; }
    getAttribute(name) { return this.attributes[name]; }
    removeAttribute(name) { delete this.attributes[name]; }
    focus() { this.document.activeElement = this; }
    showModal() { this.open = true; }
    close() {
        this.open = false;
        this.dispatch("close");
    }
    querySelectorAll(selector) {
        const found = [];
        const visit = (node) => {
            for (const child of node.children) {
                if (selector === "[data-focus-role]" && child.dataset.focusRole) found.push(child);
                if (selector === '[data-focus-role="title"]' && child.dataset.focusRole === "title") found.push(child);
                visit(child);
            }
        };
        visit(this);
        return found;
    }
}

function sampleItem(id, revision, overrides = {}) {
    return {
        id, revision, number: id === "a" ? 1 : 2, title: `Group ${id}`, reason: "Why",
        resources: [{ path: `agents/${id}.agent.md`, description: "Agent" }],
        column: "unreviewed", note: `note ${id}`, draft: { title: `Draft ${id}`, body: `Body ${id}` },
        publication: null, ...overrides,
    };
}

function snapshot(items, snapshotSequence = 0) {
    return {
        selected: 1, repo: "github/awesome-copilot",
        reports: [{ number: 1, title: "Report", state: "open", url: "https://github.com/github/awesome-copilot/issues/1" }],
        columns: [{ id: "unreviewed", label: "Unreviewed" }, { id: "separate", label: "Separate" }, { id: "consolidate", label: "Consolidate" }],
        items, snapshotSequence,
    };
}

function response(value, ok = true) {
    return { ok, status: ok ? 200 : 409, json: async () => value };
}

async function harness(fetchOverride = async () => response({})) {
    const document = {
        ids: new Map(),
        body: null,
        activeElement: null,
        createElement(tag) { return new FakeElement(tag, document); },
        createTextNode(text) { const node = new FakeElement("#text", document); node.textContent = text; return node; },
        getElementById(id) { return document.ids.get(id); },
        querySelector(selector) {
            return selector.startsWith("meta") ? { content: "test-token" } : null;
        },
        querySelectorAll(selector) { return document.body.querySelectorAll(selector); },
    };
    document.body = new FakeElement("body", document);
    document.activeElement = document.body;
    const ids = ["discover", "reports", "import", "search", "hide-published", "message", "board", "detail",
        "editor", "editor-suspended", "resume-report", "detail-title", "close", "source", "flags", "resources", "viewer-tabs", "viewer-panes",
        "side-by-side", "reason", "review-result", "guidance", "review", "cancel-review", "column", "note",
        "draft-title", "draft-body", "draft", "edit-conflict", "reload-latest", "keep-mine", "conflict-message",
        "receipt", "save", "preview", "detail-message", "confirmation", "target", "publish-title", "publish-body",
        "back", "confirm", "publish-message", "reconcile"];
    const nodes = Object.fromEntries(ids.map((id) => {
        const node = new FakeElement(id === "column" || id === "reports" ? "select" : "div", document);
        node.id = id;
        document.body.append(node);
        return [id, node];
    }));
    let initial = snapshot([sampleItem("a", "r1"), sampleItem("b", "b1")]);
    const fetch = (url, options) => fetchOverride(url, options, initial);
    class EventSource {
        addEventListener() {}
    }
    const context = vm.createContext({
        document, fetch, EventSource, URL, JSON, Map, Promise, encodeURIComponent,
        window: { confirm: () => true }, console,
    });
    vm.runInContext(source, context);
    await new Promise((resolve) => setImmediate(resolve));
    return { context, document, nodes, setInitial: (next) => { initial = next; } };
}

function boardButtons(harness) {
    return harness.document.querySelectorAll('[data-focus-role="title"]');
}

test("review cancellation remains visible without an error handoff marker", async () => {
    const h = await harness();
    const cancelled = "Review cancelled locally. Late results will be rejected.";
    h.context.refreshReview(sampleItem("a", "r1", { reviewError: cancelled }));
    assert.equal(h.nodes["review-result"].textContent, cancelled);
    assert.equal(h.nodes["review-result"].getAttribute("data-agent-error"), undefined);
    h.context.refreshReview(sampleItem("a", "r1", { reviewError: "Background task failed." }));
    assert.equal(h.nodes["review-result"].getAttribute("data-agent-error"), "");
    h.context.refreshReview(sampleItem("a", "r1", { reviewError: cancelled }));
    assert.equal(h.nodes["review-result"].getAttribute("data-agent-error"), undefined);
});

test("guidance and reconnect styling do not authorize repair handoffs", async () => {
    const h = await harness();
    h.context.message("Connection interrupted. Reconnecting...", true, "message", false);
    assert.equal(h.nodes.message.error, true);
    assert.equal(h.nodes.message.getAttribute("data-agent-error"), undefined);
    const guidance = Object.assign(new Error("Find and select a report first."), { handoff: false });
    await h.context.run(h.nodes.import, async () => { throw guidance; });
    assert.equal(h.nodes.message.textContent, guidance.message);
    assert.equal(h.nodes.message.getAttribute("data-agent-error"), undefined);
    await h.context.run(h.nodes.import, async () => { throw new Error("Request failed."); });
    assert.equal(h.nodes.message.getAttribute("data-agent-error"), "");
    h.context.message("Connected.");
    assert.equal(h.nodes.message.getAttribute("data-agent-error"), undefined);
});

test("API expected-notice classification survives the renderer catch", async () => {
    const h = await harness(async () => response({ error: "Local triage changed.", handoff: false }, false));
    await h.context.run(h.nodes.import, () => h.context.api("update", {}));
    assert.equal(h.nodes.message.textContent, "Local triage changed.");
    assert.equal(h.nodes.message.error, true);
    assert.equal(h.nodes.message.getAttribute("data-agent-error"), undefined);
});

test("hide published keeps unconfirmed publication intents visible and snapshot rerender restores group focus", async () => {
    const h = await harness();
    const items = [
        sampleItem("a", "r1", { publication: { status: "published", kind: "accept" } }),
        sampleItem("b", "b1", { publication: { status: "unconfirmed", kind: "accept" } }),
    ];
    h.context.receive(snapshot(items));
    h.nodes["hide-published"].checked = true;
    h.context.render();
    const visibleButtons = boardButtons(h);
    assert.deepEqual(visibleButtons.map((button) => button.dataset.itemId), ["b"]);

    const before = visibleButtons[0];
    before.focus();
    h.context.receive(snapshot(items.map((item) => ({ ...item }))));
    assert.notEqual(h.document.activeElement, before);
    assert.equal(h.document.activeElement.dataset.itemId, "b");
    assert.equal(h.document.activeElement.dataset.focusRole, "title");
});

test("clean editor refreshes from snapshots; dirty editor requires explicit conflict resolution", async () => {
    const h = await harness();
    h.context.receive(snapshot([sampleItem("a", "r1"), sampleItem("b", "b1")]));
    h.context.show("a");
    h.context.receive(snapshot([sampleItem("a", "r2", {
        note: "fresh note", title: "Updated title", reason: "Updated reason",
        resources: [{ path: "agents/updated.agent.md", description: "Updated resource" }],
    }), sampleItem("b", "b1")]));
    assert.equal(h.nodes.note.value, "fresh note");
    assert.equal(h.nodes["detail-title"].textContent, "Group 1: Updated title");
    assert.equal(h.nodes.reason.textContent, "Updated reason");
    assert.equal(h.nodes.resources.children[0].children[0].textContent, "agents/updated.agent.md");
    assert.equal(vm.runInContext("opened.revision", h.context), "r2");

    h.nodes.note.value = "my unsaved note";
    h.nodes.editor.dispatch("input", { target: h.nodes.note });
    h.context.receive(snapshot([sampleItem("a", "r3", { note: "new remote note" }), sampleItem("b", "b1")]));
    assert.equal(h.nodes.note.value, "my unsaved note");
    assert.equal(h.nodes["edit-conflict"].hidden, false);
    assert.equal(h.nodes.save.disabled, true);

    h.nodes["keep-mine"].dispatch("click");
    assert.equal(h.nodes.save.disabled, false);
    assert.equal(vm.runInContext("opened.revision", h.context), "r3");
    assert.equal(vm.runInContext("dirty", h.context), true);
});

test("changed evidence refreshes during conflicts and async save completion keeps conflict saving disabled", async () => {
    let resolveUpdate;
    const latest = snapshot([sampleItem("a", "r2", {
        title: "Current title", reason: "Current rationale", accepted: true, changed: true,
        resources: [{ path: "agents/current.agent.md", description: "Current resource" }],
    }), sampleItem("b", "b1")]);
    const h = await harness(async (url, options, initial) => {
        if (url === "/api/board") return response(latest);
        if (url === "/api/update") return new Promise((resolve) => { resolveUpdate = resolve; });
        return response(initial);
    });
    h.context.receive(snapshot([sampleItem("a", "r1"), sampleItem("b", "b1")]));
    h.context.show("a");
    h.nodes.note.value = "unsaved note";
    h.nodes.editor.dispatch("input", { target: h.nodes.note });

    const pending = h.context.run(h.nodes.save, () => h.context.save(), "detail-message");
    await new Promise((resolve) => setImmediate(resolve));
    h.context.receive(latest);
    assert.equal(h.nodes["detail-title"].textContent, "Group 1: Current title");
    assert.equal(h.nodes.flags.textContent.includes("Already accepted"), true);
    assert.equal(h.nodes.flags.textContent.includes("Source evidence changed"), true);
    assert.equal(h.nodes.reason.textContent, "Current rationale");
    assert.equal(h.nodes.resources.children[0].children[0].textContent, "agents/current.agent.md");
    assert.equal(h.nodes.note.value, "unsaved note");
    assert.equal(h.nodes.save.disabled, true);

    resolveUpdate(response({ error: "Revision conflict" }, false));
    await pending;
    assert.equal(h.nodes["edit-conflict"].hidden, false);
    assert.equal(h.nodes.save.disabled, true);

    h.nodes["reload-latest"].dispatch("click");
    assert.equal(h.nodes.note.value, "note a");
    assert.equal(h.nodes["detail-title"].textContent, "Group 1: Current title");
    assert.equal(h.nodes.reason.textContent, "Current rationale");
    assert.equal(h.nodes.resources.children[0].children[0].textContent, "agents/current.agent.md");
});

test("card moves also send the revision and rejected stale saves preserve drafts until resolved", async () => {
    let updateBody;
    let updateCount = 0;
    let latest = snapshot([sampleItem("a", "r2", { note: "remote" }), sampleItem("b", "b1")]);
    const h = await harness(async (url, options, initial) => {
        if (url === "/api/board") return response(latest);
        if (url === "/api/update") {
            updateBody = JSON.parse(options.body);
            updateCount++;
            if (updateCount === 1) return response(snapshot([sampleItem("a", "r2"), sampleItem("b", "b1")]));
            return response({ error: "Revision conflict" }, false);
        }
        return response(initial);
    });
    h.context.receive(snapshot([sampleItem("a", "r1"), sampleItem("b", "b1")]));
    const item = vm.runInContext("board.items[0]", h.context);
    await h.context.move(item, "separate");
    assert.equal(updateBody.expectedRevision, "r1");

    h.context.receive(snapshot([sampleItem("a", "r1"), sampleItem("b", "b1")]));
    h.context.show("a");
    h.nodes.note.value = "my preserved draft";
    h.nodes.editor.dispatch("input", { target: h.nodes.note });
    await assert.rejects(h.context.save(), /Revision conflict/);
    assert.equal(h.nodes.note.value, "my preserved draft");
    assert.equal(h.nodes["edit-conflict"].hidden, false);
    assert.equal(h.nodes.save.disabled, true);
    assert.equal(vm.runInContext("opened.revision", h.context), "r1");
});

test("dropping a queued card in its current column does not clear its queue or revision", async () => {
    const calls = [];
    const h = await harness(async (url) => {
        calls.push(url);
        return response({});
    });
    const queued = sampleItem("a", "r1", { column: "separate", queueId: "review-queue" });
    h.context.receive(snapshot([queued], 4));
    const column = h.nodes.board.children.find((node) =>
        node.className === "column" && node.children[0].textContent.startsWith("Separate"));
    column.dispatch("drop", { dataTransfer: { getData: () => "a" } });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls.includes("/api/update"), false);
    assert.equal(vm.runInContext("board.items[0].queueId", h.context), "review-queue");
    assert.equal(vm.runInContext("board.items[0].revision", h.context), "r1");
});

test("save sends its submitted snapshot revision and preserves typing made while the request is pending", async () => {
    let resolveUpdate;
    let updateBody;
    const h = await harness(async (url, options, initial) => {
        if (url === "/api/board") return response(initial);
        if (url === "/api/update") {
            updateBody = JSON.parse(options.body);
            return new Promise((resolve) => { resolveUpdate = resolve; });
        }
        return response({});
    });
    h.context.receive(snapshot([sampleItem("a", "r1"), sampleItem("b", "b1")]));
    h.context.show("a");
    h.nodes.note.value = "submitted note";
    h.nodes.editor.dispatch("input", { target: h.nodes.note });
    const pendingSave = h.context.save();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(updateBody.expectedRevision, "r1");

    h.nodes.note.value = "typed during save";
    h.nodes.editor.dispatch("input", { target: h.nodes.note });
    resolveUpdate(response(snapshot([sampleItem("a", "r2", { note: "submitted note" }), sampleItem("b", "b1")])));
    await pendingSave;
    assert.equal(h.nodes.note.value, "typed during save");
    assert.equal(vm.runInContext("dirty", h.context), true);
    assert.equal(vm.runInContext("opened.revision", h.context), "r2");
});

test("ordered SSE keeps cross-report changes while save reconciliation preserves the editor", async () => {
    let resolveUpdate;
    const h = await harness(async (url, options, initial) => {
        if (url === "/api/board") return response(initial);
        if (url === "/api/update") return new Promise((resolve) => { resolveUpdate = resolve; });
        return response({});
    });
    h.context.receive(snapshot([sampleItem("a", "r1"), sampleItem("b", "b1")], 3));
    h.context.show("a");
    h.nodes.note.value = "saved a";
    h.nodes.editor.dispatch("input", { target: h.nodes.note });
    const pending = h.context.save();
    await new Promise((resolve) => setImmediate(resolve));

    h.context.receive(snapshot([
        sampleItem("a", "r2", { note: "saved a" }),
        sampleItem("b", "b2", { note: "newer b" }),
    ], 6));
    resolveUpdate(response(snapshot([
        sampleItem("a", "r2", { note: "saved a" }),
        sampleItem("b", "b1"),
    ], 5)));
    await pending;

    assert.equal(vm.runInContext("board.items.find((item) => item.id === 'a').revision", h.context), "r2");
    assert.equal(vm.runInContext("board.items.find((item) => item.id === 'b').revision", h.context), "b2");
    assert.equal(vm.runInContext("opened.revision", h.context), "r2");
    assert.equal(h.nodes.note.value, "saved a");
    assert.equal(vm.runInContext("dirty", h.context), false);
});

test("late save completion does not clear the dirty state of a different open editor", async () => {
    let resolveUpdate;
    const h = await harness(async (url, options, initial) => {
        if (url === "/api/board") return response(initial);
        if (url === "/api/update") return new Promise((resolve) => { resolveUpdate = resolve; });
        return response({});
    });
    h.context.receive(snapshot([sampleItem("a", "r1"), sampleItem("b", "b1")]));
    h.context.show("a");
    h.nodes.note.value = "saved a";
    h.nodes.editor.dispatch("input", { target: h.nodes.note });
    const pendingSave = h.context.save();
    await new Promise((resolve) => setImmediate(resolve));

    h.context.show("b");
    h.nodes.note.value = "unsaved b";
    h.nodes.editor.dispatch("input", { target: h.nodes.note });
    resolveUpdate(response(snapshot([sampleItem("a", "r2", { note: "saved a" }), sampleItem("b", "b1")])));
    await pendingSave;

    assert.equal(vm.runInContext("opened.id", h.context), "b");
    assert.equal(h.nodes.note.value, "unsaved b");
    assert.equal(vm.runInContext("dirty", h.context), true);
});

test("closing a dialog restores its opener or a visible fallback", async () => {
    const h = await harness();
    h.context.receive(snapshot([sampleItem("a", "r1"), sampleItem("b", "b1")]));
    const opener = boardButtons(h)[0];
    opener.focus();
    h.context.show("a");
    h.nodes["hide-published"].checked = true;
    h.nodes.search.value = "other";
    h.context.render();
    h.context.closeDetail();
    assert.equal(h.document.activeElement.id, "search");
});

test("viewer failures preserve expected-notice eligibility", async () => {
    for (const handoff of [false, true]) {
        const h = await harness(async url => url === "/api/resource"
            ? response({ error: "Group not found. Refresh the report.", handoff }, false)
            : response({}));
        h.context.receive(snapshot([sampleItem("a", "r1")]));
        h.context.show("a");
        await new Promise(resolve => setImmediate(resolve));
        const warning = h.nodes["viewer-panes"].children[0].children[1];
        assert.match(warning.textContent, /Group not found/);
        assert.equal(warning.getAttribute("data-agent-error"), handoff ? "" : undefined);
    }
});

test("resource requests deduplicate only while pending, then refresh after success or failure", async () => {
    let requests = 0;
    let settle;
    const h = await harness(async (url) => {
        if (url === "/api/resource") {
            requests++;
            return new Promise((resolve) => { settle = resolve; });
        }
        return response({});
    });
    h.context.receive(snapshot([sampleItem("a", "r1")]));
    const item = sampleItem("a", "r1");
    const first = h.context.loadResource(item, "agents/a.agent.md");
    assert.equal(h.context.loadResource(item, "agents/a.agent.md"), first);
    settle(response({ content: "first" }));
    assert.equal((await first).content, "first");
    const failed = h.context.loadResource(item, "agents/a.agent.md");
    assert.equal(requests, 2);
    assert.equal(h.context.loadResource(item, "agents/a.agent.md"), failed);
    settle(response({ error: "Unavailable" }, false));
    await assert.rejects(failed, /Unavailable/);
    const fresh = h.context.loadResource(item, "agents/a.agent.md");
    assert.equal(requests, 3);
    settle(response({ content: "fresh" }));
    assert.equal((await fresh).content, "fresh");
    h.context.show("a");
    assert.equal(requests, 4);
    settle(response({ content: "after refresh" }));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(h.nodes["viewer-panes"].children[0].children[1].textContent, "after refresh");
});

test("resource tabs reference existing panels, load lazily, and navigate accessibly", async () => {
    let resourceRequests = 0;
    const h = await harness(async (url) => {
        if (url === "/api/resource") {
            resourceRequests++;
            return response({ content: "Resource contents", truncated: false });
        }
        return response({});
    });
    h.context.receive(snapshot([sampleItem("a", "r1", {
        resources: [{ path: "agents/a.agent.md" }, { path: "agents/b.agent.md" }],
    })]));
    h.context.show("a");
    let tabs = h.nodes["viewer-tabs"].children;
    let panels = h.nodes["viewer-panes"].children;
    assert.equal(panels.length, tabs.length);
    assert.equal(tabs[0].getAttribute("role"), "tab");
    for (const [index, tab] of tabs.entries()) {
        const panel = panels.find((candidate) => candidate.id === tab.getAttribute("aria-controls"));
        assert.ok(panel, `tab ${index} controls an existing panel`);
        assert.equal(panel.getAttribute("role"), "tabpanel");
        assert.equal(panel.getAttribute("aria-labelledby"), tab.id);
        assert.equal(panel.hidden, index !== 0);
    }
    assert.equal(panels[0].getAttribute("role"), "tabpanel");
    assert.equal(panels[0].getAttribute("aria-labelledby"), tabs[0].id);
    assert.equal(tabs[0].tabIndex, 0);
    assert.equal(tabs[1].tabIndex, -1);
    assert.equal(resourceRequests, 1);

    tabs[0].dispatch("keydown", { key: "ArrowRight" });
    tabs = h.nodes["viewer-tabs"].children;
    panels = h.nodes["viewer-panes"].children;
    assert.equal(h.document.activeElement, tabs[1]);
    assert.equal(tabs[1].getAttribute("aria-selected"), "true");
    assert.equal(tabs[1].tabIndex, 0);
    assert.equal(panels[0].hidden, true);
    assert.equal(panels[1].hidden, false);
    assert.equal(resourceRequests, 2);

    tabs[1].dispatch("keydown", { key: "Home" });
    tabs = h.nodes["viewer-tabs"].children;
    assert.equal(tabs[0].getAttribute("aria-selected"), "true");
    tabs[0].dispatch("keydown", { key: "End" });
    tabs = h.nodes["viewer-tabs"].children;
    assert.equal(tabs[1].getAttribute("aria-selected"), "true");
    tabs[1].dispatch("keydown", { key: "ArrowLeft" });
    tabs = h.nodes["viewer-tabs"].children;
    panels = h.nodes["viewer-panes"].children;
    assert.equal(tabs[0].getAttribute("aria-selected"), "true");
    assert.equal(tabs[0].getAttribute("aria-controls"), panels[0].id);

    h.nodes["side-by-side"].checked = true;
    h.nodes["side-by-side"].dispatch("change");
    panels = h.nodes["viewer-panes"].children;
    assert.equal(h.nodes["viewer-tabs"].hidden, true);
    for (const panel of panels) {
        const headingId = panel.getAttribute("aria-labelledby");
        const heading = h.document.ids.get(headingId);
        assert.equal(panel.getAttribute("role"), "region");
        assert.ok(heading && panel.children.includes(heading));
        assert.notEqual(headingId, tabs[panels.indexOf(panel)].id);
        assert.equal(panel.hidden, false);
    }
    assert.ok(resourceRequests >= 2);

    h.nodes["side-by-side"].checked = false;
    h.nodes["side-by-side"].dispatch("change");
    tabs = h.nodes["viewer-tabs"].children;
    panels = h.nodes["viewer-panes"].children;
    for (const [index, panel] of panels.entries()) {
        assert.equal(panel.getAttribute("role"), "tabpanel");
        assert.equal(panel.getAttribute("aria-labelledby"), tabs[index].id);
    }
});

test("receive rejects missing, invalid, and older snapshot sequences", async () => {
    const h = await harness();
    const current = snapshot([sampleItem("a", "r2", { note: "current" })], 8);
    h.context.receive(current);
    h.context.receive({ ...snapshot([sampleItem("a", "r1", { note: "missing sequence" })]), snapshotSequence: undefined });
    h.context.receive({ ...snapshot([sampleItem("a", "r1", { note: "invalid sequence" })]), snapshotSequence: "9" });
    h.context.receive(snapshot([sampleItem("a", "r1", { note: "older" })], 7));
    assert.equal(vm.runInContext("board.snapshotSequence", h.context), 8);
    assert.equal(vm.runInContext("board.items[0].revision", h.context), "r2");
    assert.equal(vm.runInContext("board.items[0].note", h.context), "current");
});

function otherReport(items) {
    const result = snapshot(items);
    return { ...result, selected: 2, reports: [...result.reports, {
        number: 2, title: "Other report", state: "open",
        url: "https://github.com/github/awesome-copilot/issues/2",
    }] };
}

for (const succeeds of [true, false]) {
    test(`report switch suspends same-ID editor during ${succeeds ? "successful" : "rejected"} saves`, async () => {
        let settle;
        const other = otherReport([sampleItem("a", "b9", { note: "other report note" })]);
        const h = await harness(async (url, options, initial) => {
            if (url === "/api/update") return new Promise((resolve) => { settle = resolve; });
            if (url === "/api/board") return response(other);
            return response(initial);
        });
        h.context.receive(snapshot([sampleItem("a", "r1")]));
        h.context.show("a");
        h.nodes.note.value = "my report A note";
        h.nodes["draft-body"].value = "my report A draft";
        h.nodes.editor.dispatch("input", { target: h.nodes.note });
        const pending = h.context.run(h.nodes.save, () => h.context.save(), "detail-message");
        h.context.receive(other);
        assert.equal(h.nodes["editor-suspended"].hidden, false);
        for (const id of ["save", "review", "cancel-review", "preview", "reconcile", "reload-latest", "keep-mine"]) {
            assert.equal(h.nodes[id].disabled, true, id);
        }
        h.nodes["reload-latest"].dispatch("click");
        h.nodes["keep-mine"].dispatch("click");
        assert.equal(h.nodes.note.value, "my report A note");
        assert.equal(h.nodes["draft-body"].value, "my report A draft");
        assert.equal(vm.runInContext("opened.revision", h.context), "r1");
        settle(succeeds ? response(other) : response({ error: "Revision conflict" }, false));
        await pending;
        assert.equal(vm.runInContext("opened.revision", h.context), "r1");
        assert.equal(vm.runInContext("dirty", h.context), true);
        assert.equal(h.nodes.save.disabled, true);
        assert.equal(h.nodes["edit-conflict"].hidden, true);
        await assert.rejects(h.context.save(), /paused/);
        h.context.receive(snapshot([sampleItem("a", "r2", { note: "latest A" })]));
        assert.equal(h.nodes["editor-suspended"].hidden, true);
        assert.equal(h.nodes["edit-conflict"].hidden, false);
        assert.equal(h.nodes.note.value, "my report A note");
        h.nodes["keep-mine"].dispatch("click");
        assert.equal(vm.runInContext("opened.revision", h.context), "r2");
        assert.equal(h.nodes["draft-body"].value, "my report A draft");
        assert.equal(h.nodes.save.disabled, false);
    });
}

test("late report A response cannot replace a newer selected report B", async () => {
    let settle;
    const h = await harness(async (url) => {
        if (url === "/api/update") return new Promise((resolve) => { settle = resolve; });
        return response({});
    });
    h.context.receive(snapshot([sampleItem("a", "r1")], 3));
    h.context.show("a");
    h.nodes.note.value = "submitted";
    h.nodes.editor.dispatch("input", { target: h.nodes.note });
    const pending = h.context.save();
    h.context.receive({ ...otherReport([sampleItem("a", "b1")]), snapshotSequence: 5 });
    settle(response(snapshot([sampleItem("a", "r2", { note: "submitted" })], 4)));
    await pending;
    assert.equal(vm.runInContext("board.selected", h.context), 2);
    assert.equal(vm.runInContext("opened.revision", h.context), "r1");
    assert.equal(h.nodes.save.disabled, true);
    assert.equal(h.nodes.note.value, "submitted");
});

test("a save response selecting another report suspends edits even without a prior event", async () => {
    const other = otherReport([sampleItem("a", "b1")]);
    const h = await harness(async (url) => response(url === "/api/update" ? other : {}));
    h.context.receive(snapshot([sampleItem("a", "r1")]));
    h.context.show("a");
    h.nodes.note.value = "submitted A";
    h.nodes.editor.dispatch("input", { target: h.nodes.note });
    await h.context.save();
    assert.equal(vm.runInContext("board.selected", h.context), 2);
    assert.equal(vm.runInContext("opened.revision", h.context), "r1");
    assert.equal(vm.runInContext("dirty", h.context), true);
    assert.equal(h.nodes.note.value, "submitted A");
    assert.equal(h.nodes.save.disabled, true);
});

test("a mismatched save snapshot cannot overwrite a newer board event", async () => {
    let settle;
    const h = await harness(async (url) => {
        if (url === "/api/update") return new Promise((resolve) => { settle = resolve; });
        return response({});
    });
    h.context.receive(snapshot([sampleItem("a", "r1")], 3));
    h.context.show("a");
    const pending = h.context.save();
    h.context.receive({ ...otherReport([sampleItem("a", "b9", { note: "newer B" })]), snapshotSequence: 6 });
    settle(response({ ...otherReport([sampleItem("a", "b1", { note: "stale B" })]), snapshotSequence: 5 }));
    await pending;
    assert.equal(vm.runInContext("board.items[0].revision", h.context), "b9");
    assert.equal(vm.runInContext("board.items[0].note", h.context), "newer B");
});

test("existing conflict controls cannot load or adopt another report's same-ID group", async () => {
    const h = await harness();
    h.context.receive(snapshot([sampleItem("a", "r1")]));
    h.context.show("a");
    h.nodes.note.value = "private A";
    h.nodes["draft-title"].value = "draft A";
    h.nodes.editor.dispatch("input", { target: h.nodes.note });
    const latestA = snapshot([sampleItem("a", "r2", { note: "remote A" })]);
    h.context.receive(latestA);
    assert.equal(h.nodes["edit-conflict"].hidden, false);
    h.context.receive(otherReport([sampleItem("a", "b1", { note: "remote B" })]));
    h.nodes["reload-latest"].dispatch("click");
    h.nodes["keep-mine"].dispatch("click");
    assert.equal(h.nodes.note.value, "private A");
    assert.equal(h.nodes["draft-title"].value, "draft A");
    assert.equal(vm.runInContext("opened.revision", h.context), "r1");
    assert.equal(vm.runInContext("opened.conflict", h.context), true);
    h.context.receive(latestA);
    h.nodes["reload-latest"].dispatch("click");
    assert.equal(h.nodes.note.value, "remote A");
    assert.equal(vm.runInContext("opened.revision", h.context), "r2");
});

test("display-only checkbox does not dirty edits, block actions or cancel queued review", async () => {
    const calls = [];
    const h = await harness(async (url) => {
        calls.push(url);
        return response({ target: "issue", title: "Preview", body: "Body" });
    });
    h.context.receive(snapshot([sampleItem("a", "r1", { queueId: "queued" })]));
    h.context.show("a");
    h.nodes["side-by-side"].checked = true;
    h.nodes.editor.dispatch("input", { target: h.nodes["side-by-side"] });
    h.nodes["side-by-side"].dispatch("change");
    assert.equal(vm.runInContext("dirty", h.context), false);
    h.nodes.preview.dispatch("click");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls.includes("/api/preview"), true);
    assert.equal(calls.includes("/api/update"), false);
    assert.equal(calls.includes("/api/cancel"), false);
    assert.equal(vm.runInContext("board.items[0].queueId", h.context), "queued");
    h.context.receive(snapshot([sampleItem("a", "r1")]));
    h.nodes.review.dispatch("click");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls.includes("/api/review"), true);
    h.context.window.confirm = () => { throw new Error("Unexpected discard warning"); };
    h.context.closeDetail();
    assert.equal(h.nodes.detail.open, false);
});

test("paused modal resumes its source report without discarding drafts or adopting another report revision", async () => {
    let selected;
    const latestA = snapshot([sampleItem("a", "r2", { note: "latest A" })]);
    const h = await harness(async (url, options) => {
        if (url === "/api/select") {
            selected = JSON.parse(options.body).number;
            return response(latestA);
        }
        return response({});
    });
    h.context.receive(snapshot([sampleItem("a", "r1")]));
    h.context.show("a");
    h.nodes.note.value = "unsaved A note";
    h.nodes["draft-body"].value = "unsaved A draft";
    h.nodes.editor.dispatch("input", { target: h.nodes.note });
    const staleTab = h.nodes["viewer-tabs"].children[0];
    h.context.receive(otherReport([sampleItem("a", "b9")]));
    h.nodes["resume-report"].focus();
    staleTab.dispatch("click");
    assert.equal(h.document.activeElement, h.nodes["resume-report"]);
    assert.equal(vm.runInContext("opened.revision", h.context), "r1");
    h.nodes["resume-report"].dispatch("click");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(selected, 1);
    assert.equal(h.nodes.detail.open, true);
    assert.equal(h.nodes["editor-suspended"].hidden, true);
    assert.equal(h.nodes.note.value, "unsaved A note");
    assert.equal(h.nodes["draft-body"].value, "unsaved A draft");
    assert.equal(h.nodes["edit-conflict"].hidden, false);
    assert.equal(vm.runInContext("opened.revision", h.context), "r1");
    h.nodes["keep-mine"].dispatch("click");
    assert.equal(vm.runInContext("opened.revision", h.context), "r2");
    assert.equal(h.nodes["draft-body"].value, "unsaved A draft");
});

test("failed modal resume displays the error and preserves suspended drafts", async () => {
    const h = await harness(async (url) => response(url === "/api/select" ? { error: "Select failed" } : {}, url !== "/api/select"));
    h.context.receive(snapshot([sampleItem("a", "r1")]));
    h.context.show("a");
    h.nodes.note.value = "private A";
    h.nodes.editor.dispatch("input", { target: h.nodes.note });
    h.context.receive(otherReport([sampleItem("a", "b9")]));
    h.nodes["resume-report"].dispatch("click");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(h.nodes["detail-message"].textContent, "Select failed");
    assert.equal(h.nodes["editor-suspended"].hidden, false);
    assert.equal(h.nodes["resume-report"].disabled, false);
    assert.equal(h.nodes.note.value, "private A");
    assert.equal(vm.runInContext("opened.revision", h.context), "r1");
});
