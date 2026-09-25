// Tests for the element model: cleaning up loose input and picking readable text colors.
// Run `node --test` in the extension folder.
import assert from "node:assert/strict";
import test from "node:test";
import { COLORS, DARK_PALETTE, LIGHT_PALETTE, MAX_PEN_POINTS, diffOps, luminance, mergeOps, normalizeElement, normalizeElements, sameJson, staticPaint } from "./model.mjs";

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test("text on every solid color is readable in both themes", () => {
  for (const [theme, palette] of [["light", LIGHT_PALETTE], ["dark", DARK_PALETTE]]) {
    const paint = staticPaint(palette);
    for (const color of COLORS) {
      const ratio = contrast(paint(color, "onSolid"), paint(color, "solid"));
      assert.ok(ratio >= 4.5, `${theme} ${color} is only ${ratio.toFixed(2)}:1`);
    }
  }
});

test("loose input is cleaned up, and arrows to missing shapes are dropped", () => {
  const out = normalizeElements([
    { id: "a", type: "rect" },
    { id: "a", type: "circle", x: 200 },
    { type: "arrow", from: "a", to: "missing" },
    { type: "spaceship" },
    null,
    "rect",
  ]);
  assert.deepEqual(out.map((e) => e.type), ["rect", "ellipse"]);
  assert.equal(out[0].id, "a");
  assert.notEqual(out[1].id, "a");
});

test("the ops from diffOps turn one list into the other", () => {
  // A small random generator (MINSTD), so a failure can be run again.
  let seed = 7;
  const rand = (n) => {
    seed = (seed * 48271) % 2147483647;
    return seed % n;
  };
  const shape = (id) => normalizeElement({ id, type: "rect", x: rand(5) * 10, text: rand(2) ? "a" : "" });
  for (let round = 0; round < 500; round++) {
    const before = Array.from({ length: rand(8) }, (_, i) => shape(`e${i}`));
    let after = before.filter(() => rand(4)).map((e) => (rand(3) ? e : shape(e.id)));
    after.push(...Array.from({ length: rand(3) }, (_, i) => shape(`n${i}`)));
    if (rand(2)) after = after.sort(() => rand(3) - 1);
    const ops = diffOps(new Map(before.map((e) => [e.id, e])), after);
    if (!ops) {
      assert.deepEqual(after, before);
      continue;
    }
    assert.deepEqual(mergeOps(before, ops), after);
    // Only elements that changed are sent.
    for (const el of ops.upserts) assert.ok(!sameJson(el, before.find((e) => e.id === el.id)));
  }
});

test("sameJson compares data, not key order", () => {
  assert.ok(sameJson({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 }));
  assert.ok(!sameJson({ a: 1 }, { a: 1, b: 2 }));
  assert.ok(!sameJson({ a: 1, c: 2 }, { a: 1, b: 2 }));
  assert.ok(!sameJson([1, 2], { 0: 1, 1: 2 }));
  assert.ok(!sameJson([[1, 2]], [[1, 3]]));
  assert.ok(!sameJson(null, {}));
});

test("a stroke with too many points keeps both its ends", () => {
  const points = Array.from({ length: 3 * MAX_PEN_POINTS }, (_, i) => [i, i % 7]);
  const pen = normalizeElement({ type: "pen", points });
  assert.equal(pen.points.length, MAX_PEN_POINTS);
  assert.deepEqual(pen.points[0], points[0]);
  assert.deepEqual(pen.points.at(-1), points.at(-1));
  // Spread evenly, and in order.
  assert.ok(pen.points.every((p, i) => i === 0 || p[0] > pen.points[i - 1][0]));
  assert.equal(normalizeElement({ type: "pen", points: points.slice(0, 10) }).points.length, 10);
});
