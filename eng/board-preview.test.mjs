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
            vm.runInContext("el.toolbar.inert = true", context);
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
        context, nodes, drawer, listeners, messages, select, decide,
        selected: () => vm.runInContext(isPR ? "selectedNumber" : "selected", context),
    };
}

for (const boardName of ["open-pr-board", "external-plugin-review-board"]) {
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
        ? ["approve", "close", "request-changes", "comment"] : ["approve", "reject"];
    for (const kind of kinds) {
        test(`${boardName}: successful ${kind} closes the preview`, async () => {
            const ui = await createUI(boardName);
            await ui.decide(kind);
            assert.equal(ui.selected(), null);
            assert.equal(ui.drawer.classList.contains("open"), false);
            assert.equal(ui.messages.length, 1);
        });
    }

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
