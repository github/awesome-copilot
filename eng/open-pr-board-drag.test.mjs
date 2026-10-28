import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

const source = await readFile(
    new URL("../.github/extensions/open-pr-board/public/app.js", import.meta.url), "utf8",
);

class Node {
    constructor() {
        this.attributes = {};
        this.dataset = {};
        this.listeners = {};
        const classes = new Set();
        this.classList = {
            add: (name) => classes.add(name),
            remove: (name) => classes.delete(name),
            contains: (name) => classes.has(name),
        };
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    append() {}
    get draggable() { return this.attributes.draggable === "true"; }
}

function createContext() {
    const context = vm.createContext({
        Node,
        document: { createElement: () => new Node(), createTextNode: () => new Node() },
        selectedNumber: null,
        relativeTime: () => "now",
        statusPills: () => [],
    });
    for (const [start, end] of [
        ["function h(", "/**"],
        ["function renderCard(", "function renderBoard("],
    ]) {
        vm.runInContext(source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start))), context);
    }
    return context;
}

test("PR cards explicitly enable native dragging; actioned cards explicitly disable it", () => {
    const context = createContext();
    const item = { number: 42, title: "Example", author: "contributor" };
    const card = context.renderCard(item);
    assert.equal(card.attributes.draggable, "true");
    assert.equal(card.draggable, true);
    const actioned = context.renderCard({ ...item, decision: { kind: "approve" } });
    assert.equal(actioned.attributes.draggable, "false");
    assert.equal(actioned.draggable, false);
});

test("dragging transfers the PR number for moving and clears its visual state on completion", () => {
    const context = createContext();
    const card = context.renderCard({ number: 42, title: "Example", author: "contributor", headRefOid: "displayed" });
    const values = new Map();
    const dataTransfer = { setData: (type, value) => values.set(type, value) };
    card.listeners.dragstart({ dataTransfer });
    assert.equal(values.get("text/plain"), "42");
    assert.equal(values.get("application/x-pr-head"), "displayed");
    assert.equal(dataTransfer.effectAllowed, "move");
    assert.equal(card.classList.contains("dragging"), true);
    card.listeners.dragend();
    assert.equal(card.classList.contains("dragging"), false);
});
