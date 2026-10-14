import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

for (const boardName of ["open-pr-board", "external-plugin-review-board"]) {
    test(`${boardName}: columns render oldest to newest without changing board state`, async () => {
        const source = await readFile(
            new URL(`../.github/extensions/${boardName}/public/app.js`, import.meta.url), "utf8",
        );
        const items = [
            { number: 50, column: "approve", createdAt: "2026-10-14T00:00:00Z", updatedAt: "2026-10-14T00:00:00Z" },
            { number: 30, column: "approve", createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-14T01:00:00Z" },
            { number: 10, column: "close", createdAt: "2026-09-01T00:00:00Z" },
            { number: 20, column: "approve", createdAt: "2026-10-01T00:00:00Z" },
            { number: 5, column: "approve", createdAt: "2026-08-01T00:00:00Z", hidden: true },
            { number: 40, column: "close", createdAt: "2026-10-10T00:00:00Z" },
        ];
        const original = structuredClone(items);
        const rendered = [];
        const node = { querySelectorAll: () => [], replaceChildren() {} };
        const ui = {
            board: node, title: {}, summary: {}, meta: {}, review: {},
        };
        const context = vm.createContext({
            board: { items, columns: [{ id: "approve" }, { id: "close" }, { id: "empty" }] },
            el: ui, ui, filter: "",
            matchesFilter: (item) => !item.hidden,
            renderCard: (item) => { rendered.push(item.number); return {}; },
            h: () => ({}),
            relativeTime: () => "now",
            pendingReviewCount: () => 0,
            COLUMN_HINTS: {},
        });
        vm.runInContext(source.slice(source.indexOf("function renderBoard()"), source.indexOf("function columnItems(")), context);
        context.renderBoard();
        assert.deepEqual(rendered, [20, 30, 50, 10, 40]);
        assert.deepEqual(items, original);

        items[0].column = "close";
        rendered.length = 0;
        context.renderBoard();
        assert.deepEqual(rendered, [20, 30, 10, 40, 50]);
    });
}
