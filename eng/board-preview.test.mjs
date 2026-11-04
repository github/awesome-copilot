import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

async function createUI(boardName, request = async () => ({
    status: "submitted", body: "/approve", pending: true, message: "Queued",
})) {
    const nodes = new Map();
    function node() {
        const classes = new Set();
        return {
            content: "", value: "", dataset: {}, listeners: {}, attributes: {},
            classList: {
                add: (name) => classes.add(name),
                remove: (name) => classes.delete(name),
                contains: (name) => classes.has(name),
            },
            addEventListener(name, handler) { this.listeners[name] = handler; },
            setAttribute(name, value) { this.attributes[name] = value; },
            querySelectorAll: () => [],
            querySelector: () => null,
            contains(target) { return target === this || target.insideDrawer === true; },
            focus() { this.focused = true; },
        };
    }
    const listeners = new Map();
    const document = {
        querySelector: node,
        querySelectorAll: () => [],
        getElementById(id) {
            if (!nodes.has(id)) nodes.set(id, node());
            return nodes.get(id);
        },
        addEventListener(name, handler, capture) { listeners.set(name, { handler, capture }); },
    };
    const messages = [];
    const context = vm.createContext({
        document, setTimeout: () => 1, clearTimeout() {}, confirm: () => true,
    });
    const isPR = boardName === "open-pr-board";
    const source = await readFile(new URL(`../.github/extensions/${boardName}/public/app.js`, import.meta.url), "utf8");
    const end = isPR ? "const events = new EventSource" : "function connect()";
    vm.runInContext(source.slice(0, source.indexOf(end)), context);
    context.request = request;
    context.notify = (message) => messages.push(message);
    vm.runInContext(`
        board = { items: [1, 2].map(number => ({
            number, column: "approve", headRefOid: "first", reviewEligible: true,
            review: { suggestedComment: "Feedback" },
        })), columns: [] };
        renderBoard = renderDrawer = renderDrawerHeader = renderDrawerBody = () => {};
        api = request;
        toast = notify;
    `, context);
    const drawer = nodes.get("drawer");
    function select(number) {
        vm.runInContext(`${isPR ? "selectedNumber" : "selected"} = ${number}`, context);
        drawer.classList.add("open");
        drawer.setAttribute("aria-hidden", "false");
        drawer.inert = false;
        nodes.get("board").inert = isPR;
        if (isPR) {
            vm.runInContext(`drawerOriginNumber = ${number}`, context);
            vm.runInContext('el.toolbar.inert = true; previewHeadRefOid = "first"', context);
        }
        nodes.get("decision-comment").value = "Feedback";
    }
    select(1);
    async function decide(kind = "approve") {
        if (isPR) {
            const button = nodes.get("decision-approve") ?? node();
            await context.submitDecision(button, kind);
            return context.submitDecision(button, kind);
        }
        await context.decide(kind);
        return context.decide(kind);
    }
    return {
        context, nodes, drawer, listeners, messages, select, decide, source,
        selected: () => vm.runInContext(isPR ? "selectedNumber" : "selected", context),
    };
}

for (const outcome of ["success", "error"]) {
    test(`plugin detail reload ignores an older polling ${outcome} after the post-comment reload`, async () => {
        const requests = [];
        const ui = await createUI("external-plugin-review-board", () => new Promise((resolve, reject) => {
            requests.push({ resolve, reject });
        }));
        const polling = ui.context.loadDetail(1, { force: true });
        const posted = ui.context.loadDetail(1, { force: true });
        requests[1].resolve({ bodyHtml: "new", comments: [{ bodyHtml: "posted comment" }] });
        await posted;
        if (outcome === "success") requests[0].resolve({ bodyHtml: "old", comments: [] });
        else requests[0].reject(new Error("Old failure"));
        await polling;
        assert.equal(vm.runInContext("details.get(1).bodyHtml", ui.context), "new");
        assert.equal(vm.runInContext("details.get(1).comments.length", ui.context), 1);
        assert.equal(vm.runInContext("detailRequests.size", ui.context), 0);
    });
}

for (const kind of ["comment", "request-changes"]) {
    test(`PR drawer ${kind} includes the displayed SHA`, async () => {
        const calls = [];
        const ui = await createUI("open-pr-board", async (...args) => {
            calls.push(args);
            return { status: "submitted" };
        });
        await ui.decide(kind);
        assert.equal(calls[0][1].body.headRefOid, "first");
    });
}

test("PR workflow execution approval requires scoped confirmation and preserves the preview and feedback", async () => {
    const calls = [];
    const ui = await createUI("open-pr-board", async (...args) => {
        calls.push(args);
        return { status: "workflow-execution-approved" };
    });
    const workflow = { id: 10, attempt: 2, headRefOid: "first", name: "CI", url: "https://github.com/example/repo/actions/runs/10" };
    ui.context.workflow = workflow;
    vm.runInContext("board.items[0].workflowApprovals = [workflow]", ui.context);
    const item = vm.runInContext("board.items[0]", ui.context);
    const button = ui.nodes.get("refresh-button");
    const confirmations = [];
    ui.context.confirm = (message) => { confirmations.push(message); return false; };
    await ui.context.submitWorkflowApproval(button, item, workflow);
    assert.equal(calls.length, 0);
    ui.context.confirm = (message) => { confirmations.push(message); return true; };
    await ui.context.submitWorkflowApproval(button, item, workflow);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], "/api/workflow-approval");
    assert.deepEqual({ ...calls[0][1].body }, {
        number: 1, runId: 10, attempt: 2, headRefOid: "first", confirmed: true,
    });
    assert.match(confirmations[0], /run 10, attempt 2/);
    assert.match(confirmations[0], /does not submit a PR review/);
    assert.match(confirmations[0], /first/);
    assert.equal(ui.selected(), 1);
    assert.equal(ui.nodes.get("decision-comment").value, "Feedback");
});

test("PR workflow execution approval blocks stale and in-flight choices and surfaces failure", async () => {
    let calls = 0;
    const ui = await createUI("open-pr-board", async () => { calls++; throw new Error("Forbidden (403)"); });
    const workflow = { id: 10, attempt: 1, headRefOid: "first", name: "CI" };
    ui.context.workflow = workflow;
    vm.runInContext("board.items[0].workflowApprovals = [workflow]", ui.context);
    const item = vm.runInContext("board.items[0]", ui.context);
    const button = ui.nodes.get("refresh-button");
    await ui.context.submitWorkflowApproval(button, item, { ...workflow, headRefOid: "old" });
    vm.runInContext("decisionsInFlight.add(1)", ui.context);
    await ui.context.submitWorkflowApproval(button, item, workflow);
    assert.equal(calls, 0);
    vm.runInContext("decisionsInFlight.delete(1)", ui.context);
    await ui.context.submitWorkflowApproval(button, item, workflow);
    assert.equal(calls, 1);
    assert.match(ui.messages.at(-1), /403/);
    assert.equal(ui.selected(), 1);
    assert.equal(vm.runInContext("decisionsInFlight.size", ui.context), 0);
});

test("PR Checks renders workflow approval independently of check rollups and never offers it for ordinary checks", async () => {
    const ui = await createUI("open-pr-board");
    ui.context.element = (tag, attrs, ...children) => ({ tag, attrs, children: children.flat(Infinity).filter(Boolean) });
    vm.runInContext("h = element", ui.context);
    const flatten = (node) => [node, ...(node.children ?? []).flatMap(flatten)];
    const workflow = { id: 10, attempt: 1, headRefOid: "first", name: "CI", url: "https://github.com/example/repo/actions/runs/10" };
    const item = { number: 1, workflowApprovals: [workflow], checks: [] };
    const rendered = flatten(ui.context.checksTab(item));
    const button = rendered.find((node) => node.tag === "button");
    assert.equal(button.children[0], "Approve and run checks");
    assert.equal(typeof button.attrs.onclick, "function");
    assert.ok(rendered.some((node) => typeof node === "string" && /does not approve the PR/.test(node)));
    vm.runInContext("decisionsInFlight.add(1)", ui.context);
    assert.equal(flatten(ui.context.checksTab(item)).find((node) => node.tag === "button").attrs.disabled, true);
    for (const state of ["pending", "failure", "actionRequired"]) {
        const plain = flatten(ui.context.checksTab({ checks: [{ name: "CI", state }], checkCounts: { actionRequired: state === "actionRequired" ? 1 : 0 } }));
        assert.equal(plain.some((node) => node.tag === "button"), false);
    }
    const error = flatten(ui.context.checksTab({ checks: [], workflowApprovalError: "Actions read denied" }));
    assert.ok(error.includes("Actions read denied"));
    for (const extra of [{ workflowApprovals: [workflow] }, { workflowApprovalError: "Denied" }]) {
        const pills = ui.context.statusPills({ checksState: "success", checkCounts: { total: 1 }, ...extra });
        assert.equal(pills.some((node) => node.children.includes("checks pass")), false);
    }
});

for (const boardName of ["open-pr-board", "external-plugin-review-board"]) {
    test(`${boardName}: live refresh retains selection, drafts, tabs, and in-flight action guards`, async () => {
        const ui = await createUI(boardName);
        const isPR = boardName === "open-pr-board";
        vm.runInContext(`
            stagedComments.set(1, "Draft feedback");
            activeTab = "comments";
            bulkBusy = true;
            ${isPR ? "decisionsInFlight.add(1)" : "decisionBusy = true"};
        `, ui.context);
        ui.nodes.get("decision-comment").value = "Draft feedback";
        const snapshot = {
            items: [1, 2, 3].map((number) => ({ number, reviewEligible: true })),
            columns: [],
        };
        if (isPR) ui.context.applySnapshot(snapshot);
        else {
            const handlers = new Map();
            ui.context.EventSource = class {
                addEventListener(name, handler) { handlers.set(name, handler); }
            };
            const start = ui.source.indexOf("function connect()");
            vm.runInContext(ui.source.slice(start, ui.source.indexOf("\nconnect();", start)), ui.context);
            ui.context.connect();
            handlers.get("board")({ data: JSON.stringify(snapshot) });
        }
        assert.equal(ui.selected(), 1);
        assert.equal(ui.drawer.classList.contains("open"), true);
        assert.equal(ui.nodes.get("decision-comment").value, "Draft feedback");
        assert.equal(vm.runInContext("stagedComments.get(1)", ui.context), "Draft feedback");
        assert.equal(vm.runInContext("activeTab", ui.context), "comments");
        assert.equal(vm.runInContext("bulkBusy", ui.context), true);
        assert.equal(vm.runInContext(isPR ? "decisionsInFlight.has(1)" : "decisionBusy", ui.context), true);
        assert.equal(vm.runInContext("board.items.length", ui.context), 3);
    });

    test(`${boardName}: clicking inside retains the preview; clicking outside closes it`, async () => {
        const ui = await createUI(boardName);
        const { handler, capture } = ui.listeners.get("pointerdown");
        assert.equal(capture, true);
        handler({ target: { insideDrawer: true } });
        assert.equal(ui.selected(), 1);
        handler({ target: {} });
        assert.equal(ui.selected(), null);
        assert.equal(ui.drawer.classList.contains("open"), false);
        assert.equal(ui.drawer.attributes["aria-hidden"], "true");
        assert.equal(ui.nodes.get("board").inert, false);
        if (boardName === "open-pr-board") {
            assert.equal(ui.drawer.inert, true);
            assert.equal(ui.nodes.get("filter").focused, true);
            assert.equal(vm.runInContext("el.toolbar.inert", ui.context), false);
        }
        handler({ target: {} });
        assert.equal(ui.selected(), null);
    });

    const kinds = boardName === "open-pr-board"
        ? ["approve", "close", "request-changes", "comment"] : ["approve", "reject", "request-fixes"];
    for (const kind of kinds) {
        test(`${boardName}: successful ${kind} closes the preview`, async () => {
            const ui = await createUI(boardName);
            await ui.decide(kind);
            assert.equal(ui.selected(), null);
            assert.equal(ui.drawer.classList.contains("open"), false);
            assert.equal(ui.messages.length, 1);
        });
    }

    test("plugin polling invalidates cached details, reloads the selected tab, and rejects pre-refresh responses", async () => {
        const requests = [];
        const pending = new Map();
        const ui = await createUI("external-plugin-review-board", (...args) => {
            requests.push(args);
            return new Promise((resolve) => pending.set(args[1], resolve));
        });
        vm.runInContext(`
            board.lastRefreshedAt = "before";
            activeTab = "comments";
            details.set(1, { bodyHtml: "old", comments: [] });
            details.set(3, { bodyHtml: "old unselected", comments: [] });
            stagedComments.set(1, "Keep my feedback");
        `, ui.context);
        ui.nodes.get("decision-comment").value = "Keep my feedback";
        const stale = ui.context.loadDetail(2, { force: true });
        const handlers = new Map();
        ui.context.EventSource = class {
            addEventListener(name, handler) { handlers.set(name, handler); }
        };
        const start = ui.source.indexOf("function connect()");
        vm.runInContext(ui.source.slice(start, ui.source.indexOf("\nconnect();", start)), ui.context);
        ui.context.connect();
        const snapshot = { lastRefreshedAt: "after", items: [{ number: 1 }], columns: [] };
        handlers.get("board")({ data: JSON.stringify(snapshot) });
        assert.equal(vm.runInContext("details.size", ui.context), 0);
        assert.deepEqual(requests.map((args) => args.slice(0, 2)), [
            ["POST", "/api/issue/2"], ["POST", "/api/issue/1"],
        ]);
        pending.get("/api/issue/2")({ bodyHtml: "stale response", comments: [] });
        pending.get("/api/issue/1")({ bodyHtml: "new body", comments: [{ bodyHtml: "intake completed" }] });
        await stale;
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(vm.runInContext("details.has(2)", ui.context), false);
        assert.equal(vm.runInContext("details.get(1).bodyHtml", ui.context), "new body");
        assert.equal(ui.selected(), 1);
        assert.equal(ui.nodes.get("decision-comment").value, "Keep my feedback");
        assert.equal(vm.runInContext("stagedComments.get(1)", ui.context), "Keep my feedback");
        handlers.get("board")({ data: JSON.stringify(snapshot) });
        assert.equal(requests.length, 2, "Unchanged refresh timestamp does not reload details on local edits");
    });

    test(`${boardName}: a failed action leaves the preview open`, async () => {
        const ui = await createUI(boardName, async () => { throw new Error("Offline"); });
        await ui.decide();
        assert.equal(ui.selected(), 1);
        assert.equal(ui.drawer.classList.contains("open"), true);
        assert.equal(ui.messages[0], "Offline");
    });

    test(`${boardName}: completion does not close a different preview opened in flight`, async () => {
        let release;
        const ui = await createUI(boardName, () => new Promise(resolve => { release = resolve; }));
        const pending = ui.decide();
        await new Promise(resolve => setImmediate(resolve));
        ui.listeners.get("pointerdown").handler({ target: {} });
        ui.select(2);
        release({ status: "submitted", body: "/approve" });
        await pending;
        assert.equal(ui.selected(), 2);
        assert.equal(ui.drawer.classList.contains("open"), true);
    });

    test(`${boardName}: successful bucket moves close the preview`, async () => {
        const ui = await createUI(boardName);
        if (boardName === "open-pr-board") {
            await ui.nodes.get("drawer-column").listeners.change({ target: { value: "close" } });
        } else {
            await ui.context.moveItem(1, "straight-reject");
        }
        assert.equal(ui.selected(), null);
    });

    test(`${boardName}: successful re-review closes the preview`, async () => {
        const ui = await createUI(boardName);
        if (boardName === "open-pr-board") {
            await ui.nodes.get("rereview-start").listeners.click({ currentTarget: ui.nodes.get("rereview-start") });
        } else {
            await ui.nodes.get("rereview-panel").listeners.submit({ preventDefault() {} });
        }
        assert.equal(ui.selected(), null);
    });

    test(`${boardName}: failed bucket moves and re-reviews leave the preview open`, async () => {
        const ui = await createUI(boardName, async () => { throw new Error("Offline"); });
        if (boardName === "open-pr-board") {
            await ui.nodes.get("drawer-column").listeners.change({ target: { value: "close" } });
            await ui.nodes.get("rereview-start").listeners.click({ currentTarget: ui.nodes.get("rereview-start") });
        } else {
            await ui.context.moveItem(1, "straight-reject");
            await ui.nodes.get("rereview-panel").listeners.submit({ preventDefault() {} });
        }
        assert.equal(ui.selected(), 1);
        assert.equal(ui.drawer.classList.contains("open"), true);
        assert.deepEqual(ui.messages, ["Offline", "Offline"]);
    });

    test(`${boardName}: bulk decisions close a preview of a successfully actioned item`, async () => {
        const ui = await createUI(boardName);
        await ui.context.bulkAction("approve", "approve");
        assert.equal(ui.selected(), null);
    });
}

test("open-pr-board: partial approval success closes the preview and keeps the warning visible", async () => {
    const ui = await createUI("open-pr-board", async () => ({ warning: "Auto-merge could not be enabled" }));
    await ui.decide();
    assert.equal(ui.selected(), null);
    assert.equal(ui.messages[0], "Auto-merge could not be enabled");
});

test("external-plugin-review-board: Comment reuses the footer textarea, confirms, and refreshes the comments tab", async () => {
    const calls = [];
    const ui = await createUI("external-plugin-review-board", async (method, url, body) => {
        calls.push({ method, url, body });
        return url === "/api/comment" ? { number: 1, commentUrl: "https://example.test/c/1" } : { comments: [] };
    });
    const textarea = ui.nodes.get("decision-comment");

    textarea.value = "   ";
    await ui.context.decide("comment");
    textarea.value = "  /approve looks good";
    await ui.decide("comment");
    assert.equal(calls.length, 0);
    assert.equal(ui.messages.length, 3);
    assert.equal(ui.nodes.get("decision-comment-post").disabled, true);

    textarea.value = "  Could you document the required scopes?  ";
    await ui.context.decide("comment");
    assert.equal(calls.length, 0);
    assert.equal(ui.nodes.get("decision-comment-post").textContent, "Confirm comment");
    assert.match(ui.nodes.get("decision-preview").textContent, /Will post:\nCould you document the required scopes\?/);

    await ui.context.decide("comment");
    assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), {
        method: "POST", url: "/api/comment", body: { number: 1, body: "Could you document the required scopes?" },
    });
    assert.deepEqual(JSON.parse(JSON.stringify(calls[1])), { method: "POST", url: "/api/issue/1" });
    assert.equal(ui.selected(), 1);
    assert.equal(textarea.value, "");
    assert.equal(vm.runInContext("stagedComments.get(1)", ui.context), "");
    assert.equal(vm.runInContext("activeTab", ui.context), "comments");
    assert.equal(ui.messages.at(-1), "Posted comment on #1");
});

test("external-plugin-review-board: a failed comment keeps the draft and the preview open", async () => {
    const ui = await createUI("external-plugin-review-board", async () => { throw new Error("Offline"); });
    ui.nodes.get("decision-comment").value = "Question for the submitter";
    await ui.decide("comment");
    assert.equal(ui.messages.at(-1), "Offline");
    assert.equal(ui.nodes.get("decision-comment").value, "Question for the submitter");
    assert.equal(ui.selected(), 1);
});

test("external-plugin-review-board: Request fixes requires a reason and posts to the request-fixes route", async () => {
    const calls = [];
    const ui = await createUI("external-plugin-review-board", async (method, url, body) => {
        calls.push({ method, url, body });
        return { number: 1, commentUrl: "https://example.test/c/2", pending: false };
    });
    ui.nodes.get("decision-comment").value = "  /request-fixes  ";
    await ui.context.decide("request-fixes");
    assert.equal(calls.length, 0);
    assert.match(ui.messages.at(-1), /needs a description/);
    assert.equal(ui.nodes.get("decision-request-fixes").disabled, true);

    ui.nodes.get("decision-comment").value = "Pin the plugin to a commit SHA.";
    await ui.context.decide("request-fixes");
    assert.equal(ui.nodes.get("decision-request-fixes").textContent, "Confirm request fixes");
    assert.match(ui.nodes.get("decision-preview").textContent, /\/request-fixes Pin the plugin to a commit SHA\./);
    await ui.context.decide("request-fixes");
    assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
        method: "POST", url: "/api/request-fixes", body: { number: 1, comment: "Pin the plugin to a commit SHA." },
    }]);
    assert.equal(ui.messages.at(-1), "Requested fixes on #1");
    assert.equal(ui.selected(), null);
});

test("external-plugin-review-board: Request fixes is unavailable once the submission awaits fixes", async () => {
    const ui = await createUI("external-plugin-review-board");
    vm.runInContext(`board.items[0].labels = ["external-plugin", "requires-submitter-fixes"]`, ui.context);
    ui.context.resetConfirm();
    assert.equal(ui.nodes.get("decision-request-fixes").disabled, true);
    assert.equal(ui.nodes.get("decision-comment-post").disabled, false);
});

test("external-plugin-review-board: each command preview strips only its route's command", async () => {
    const ui = await createUI("external-plugin-review-board");
    const textarea = ui.nodes.get("decision-comment");

    textarea.value = "/reject Missing LICENSE";
    await ui.context.decide("request-fixes");
    assert.equal(ui.nodes.get("decision-preview").textContent,
        "Will post:\n/request-fixes /reject Missing LICENSE");

    ui.context.resetConfirm();
    textarea.value = "/request-fixes Add docs";
    await ui.context.decide("reject");
    assert.equal(ui.nodes.get("decision-preview").textContent,
        "Will post:\n/reject /request-fixes Add docs");
});

test("external-plugin-review-board: preview updates preserve item and bulk action guards", async () => {
    const ui = await createUI("external-plugin-review-board");
    const textarea = ui.nodes.get("decision-comment");
    const input = ui.nodes.get("decision-comment").listeners.input;
    const requestFixes = ui.nodes.get("decision-request-fixes");
    const reject = ui.nodes.get("decision-reject");
    const comment = ui.nodes.get("decision-comment-post");

    vm.runInContext(`board.items[0].labels = ["requires-submitter-fixes"]`, ui.context);
    textarea.value = "Try again";
    input();
    assert.equal(requestFixes.disabled, true);

    vm.runInContext(`board.items[0].pendingDecision = { kind: "reject" }`, ui.context);
    textarea.value = "Follow-up question";
    input();
    assert.equal(requestFixes.disabled, true);
    assert.equal(reject.disabled, true);
    assert.equal(comment.disabled, false);

    vm.runInContext("bulkBusy = true", ui.context);
    textarea.value = "Typing during column action";
    input();
    assert.equal(requestFixes.disabled, true);
    assert.equal(reject.disabled, true);
    assert.equal(comment.disabled, true);
});

test("external-plugin-review-board: Comment preserves a newer draft typed while posting", async () => {
    let release;
    let firstRequest = true;
    const ui = await createUI("external-plugin-review-board", () => {
        if (firstRequest) {
            firstRequest = false;
            return new Promise(resolve => { release = resolve; });
        }
        return Promise.resolve({ comments: [] });
    });
    const textarea = ui.nodes.get("decision-comment");
    textarea.value = "Submitted comment";
    ui.nodes.get("decision-comment").listeners.input();
    await ui.context.decide("comment");
    const pending = ui.context.decide("comment");
    await new Promise(resolve => setImmediate(resolve));

    textarea.value = "Newer unsent draft";
    ui.nodes.get("decision-comment").listeners.input();
    release({ commentUrl: "https://example.test/c/3" });
    await pending;

    assert.equal(textarea.value, "Newer unsent draft");
    assert.equal(vm.runInContext("stagedComments.get(1)", ui.context), "Newer unsent draft");
});

test("external-plugin-review-board: Request fixes preserves a newer draft when another drawer is opened", async () => {
    let release;
    const ui = await createUI("external-plugin-review-board", () =>
        new Promise(resolve => { release = resolve; }));
    const textarea = ui.nodes.get("decision-comment");
    textarea.value = "Submitted fixes";
    ui.nodes.get("decision-comment").listeners.input();
    await ui.context.decide("request-fixes");
    const pending = ui.context.decide("request-fixes");
    await new Promise(resolve => setImmediate(resolve));

    textarea.value = "Newer unsent draft";
    ui.nodes.get("decision-comment").listeners.input();
    ui.select(2);
    release({ commentUrl: "https://example.test/c/4", pending: false });
    await pending;

    assert.equal(ui.selected(), 2);
    assert.equal(vm.runInContext("stagedComments.get(1)", ui.context), "Newer unsent draft");
});
