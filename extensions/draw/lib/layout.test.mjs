// Tests for turning a { nodes, edges } spec into elements.
// Run `node --test` in the extension folder.
import assert from "node:assert/strict";
import test from "node:test";
import { boxesIntersect, elementBounds } from "./geometry.mjs";
import { buildFromSpec } from "./layout.mjs";
import { normalizeElement } from "./model.mjs";

const shape = (id, text, x) => normalizeElement({ id, type: "rect", x, y: 0, text });
const links = (elements) => elements.filter((e) => e.type === "arrow").map((a) => [a.from, a.to]);

test("edges can name nodes by id or by label, in any letter case", () => {
  const { elements, errors } = buildFromSpec({
    nodes: [{ id: "api", label: "API" }, { label: "Orders Database" }],
    edges: [{ from: "api", to: "orders database" }, { from: "ORDERS DATABASE", to: "API" }],
  });
  assert.deepEqual(errors, []);
  const db = elements.find((e) => e.text === "Orders Database");
  assert.deepEqual(links(elements), [["api", db.id], [db.id, "api"]]);
});

test("a label that several shapes share has to be referenced by id", () => {
  const existing = [shape("c1", "Cache", 0), shape("c2", "cache", 300)];
  const byLabel = buildFromSpec({ nodes: [{ id: "web", label: "Web" }], edges: [{ from: "web", to: "Cache" }] }, { existing });
  assert.equal(byLabel.errors.length, 1);
  assert.match(byLabel.errors[0], /no node with id or label "Cache"/);

  const byId = buildFromSpec({ nodes: [{ id: "web", label: "Web" }], edges: [{ from: "web", to: "c2" }] }, { existing });
  assert.deepEqual(byId.errors, []);
  assert.deepEqual(links(byId.elements), [["web", "c2"]]);
});

test("a blank reference never matches an unlabeled shape", () => {
  const existing = [shape("s1", "", 0)];
  const { errors } = buildFromSpec({ nodes: [{ id: "n", label: "New" }], edges: [{ from: "  ", to: "n" }] }, { existing });
  assert.equal(errors.length, 1);
});

test("new nodes are placed clear of everything already on the canvas", () => {
  const existing = [
    shape("a", "A", 0),
    shape("b", "B", 400),
    normalizeElement({ id: "ab", type: "arrow", from: "a", to: "b", text: "calls" }),
    normalizeElement({ id: "note", type: "text", x: 200, y: 100, text: "A note under the arrow" }),
  ];
  const { elements, errors } = buildFromSpec({
    nodes: [{ id: "c", label: "C" }, { id: "d", label: "D" }],
    edges: [{ from: "a", to: "c" }, { from: "c", to: "d" }],
  }, { existing });
  assert.deepEqual(errors, []);
  const byId = new Map([...existing, ...elements].map((e) => [e.id, e]));
  const taken = existing.map((e) => elementBounds(e, byId));
  for (const node of elements.filter((e) => e.type === "rect")) {
    for (const [i, box] of taken.entries()) {
      assert.ok(!boxesIntersect(node, box), `${node.id} overlaps ${existing[i].id}`);
    }
  }
});
