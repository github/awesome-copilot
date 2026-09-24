// Tests for turning a { nodes, edges } spec into elements, for the layout's crossing count, and
// for the outline the agent reads.
// Run `node --test` in the extension folder.
import assert from "node:assert/strict";
import test from "node:test";
import { boxesIntersect, elementBounds } from "./geometry.mjs";
import { buildFromSpec, countCrossings, outlinePage } from "./layout.mjs";
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

test("crossings are counted the same as by comparing every pair of edges", () => {
  // a-d and b-c cross. a-c and b-c only share an end, which is not a crossing.
  assert.equal(countCrossings(["a", "b"], { a: ["d", "c"], b: ["c"] }, { c: 0, d: 1 }, 2), 1);

  let seed = 1;
  const rand = (n) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % n;
  };
  const shuffled = (list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  for (let round = 0; round < 300; round++) {
    // Upper vertices are 0 to upperSize - 1 and lower ones come after, each layer in a shuffled
    // order. Every upper vertex links to a random set of lower ones, listed in any order.
    const upperSize = 1 + rand(10);
    const lowerSize = 1 + rand(10);
    const upper = shuffled([...Array(upperSize).keys()]);
    const lower = shuffled(Array.from({ length: lowerSize }, (_, i) => upperSize + i));
    const pos = {};
    lower.forEach((v, i) => { pos[v] = i; });
    const down = {};
    for (const u of upper) down[u] = shuffled(lower).slice(0, rand(lowerSize + 1));

    const edges = upper.flatMap((u, i) => down[u].map((v) => [i, pos[v]]));
    let expected = 0;
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        if ((edges[i][0] - edges[j][0]) * (edges[i][1] - edges[j][1]) < 0) expected++;
      }
    }
    assert.equal(countCrossings(upper, down, pos, lowerSize), expected, JSON.stringify({ upper, down, pos }));
  }
});

test("a long outline comes in parts that stay in budget and list each element once", () => {
  const long = "word ".repeat(800);
  const elements = [
    ...Array.from({ length: 300 }, (_, i) => shape(`s${i}`, i % 3 ? `Step ${i}` : long, i * 200)),
    ...Array.from({ length: 299 }, (_, i) => normalizeElement({ id: `a${i}`, type: "arrow", from: `s${i}`, to: `s${i + 1}` })),
    normalizeElement({ id: "note", type: "text", x: 0, y: -40, text: long }),
  ];
  const doc = { name: "Big", elements };
  const seen = [];
  for (let start = 0; start !== null; ) {
    const part = outlinePage(doc, { start, budget: 5000 });
    assert.ok(part.text.length <= 5000, `a part has ${part.text.length} characters`);
    assert.ok(part.text.startsWith('Drawing "Big": 300 shapes, 299 arrows, 1 text, 0 pen strokes.\n'));
    seen.push(...part.shown.map((e) => e.id));
    start = part.next;
  }
  assert.deepEqual(seen, elements.map((e) => e.id));

  const first = outlinePage(doc).text;
  assert.ok(!first.includes(long.trim()));
  assert.ok(first.includes(`- s0 (rect) "${long.slice(0, 300)}..." (cut from 4000 characters) at 0,0 size`));
  assert.ok(first.includes('- a0: s0 -> s1\n'));

  const some = outlinePage(doc, { only: new Set(["note", "s5"]) });
  assert.deepEqual(some.shown.map((e) => e.id), ["s5", "note"]);
  assert.equal(some.total, 2);
  assert.equal(some.next, null);

  // What a caller sends along counts too, but a part never comes back empty.
  const heavy = outlinePage(doc, { budget: 100, cost: () => 10000 });
  assert.deepEqual(heavy.shown.map((e) => e.id), ["s0"]);
  assert.equal(heavy.next, 1);
});
