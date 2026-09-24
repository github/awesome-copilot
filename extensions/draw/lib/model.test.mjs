// Tests for the element model: cleaning up loose input and picking readable text colors.
// Run `node --test` in the extension folder.
import assert from "node:assert/strict";
import test from "node:test";
import { COLORS, DARK_PALETTE, LIGHT_PALETTE, luminance, normalizeElements, staticPaint } from "./model.mjs";

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
