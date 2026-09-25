// Tests for label wrapping and arrow routes. Run `node --test` in the extension folder.
import assert from "node:assert/strict";
import test from "node:test";
import { arrowGeometry, fitStroke, simplifyStroke, wrapText } from "./geometry.mjs";
import { MAX_PEN_POINTS, normalizeElement } from "./model.mjs";

// One unit of width per character, so the expected lines are easy to read.
const chars = (s) => [...s].length;

test("labels wrap at spaces, long words are cut, and extra spaces are kept", () => {
  assert.deepEqual(wrapText("the quick brown fox jumps", 11, 14, 400, chars), ["the quick", "brown fox", "jumps"]);
  assert.deepEqual(wrapText("abcdefghij", 4, 14, 400, chars), ["abcd", "efgh", "ij"]);
  assert.deepEqual(wrapText("ab cdefghij k", 4, 14, 400, chars), ["ab", "cdef", "ghij", "k"]);
  assert.deepEqual(wrapText(" abcdefgh", 4, 14, 400, chars), ["abcd", "efgh"]);
  assert.deepEqual(wrapText("a  b\nc", 40, 14, 400, chars), ["a  b", "c"]);
  assert.deepEqual(wrapText("😀😀😀😀😀", 2, 14, 400, chars), ["😀😀", "😀😀", "😀"]);
});

test("a long label is wrapped without measuring each line over and over", () => {
  const repeat = (n, line) => Array.from({ length: n }, () => line);
  for (const [text, want] of [
    ["x".repeat(4000), [...repeat(13, "x".repeat(300)), "x".repeat(100)]],
    ["i ".repeat(2000), [...repeat(13, "i ".repeat(150).trimEnd()), "i ".repeat(50)]],
  ]) {
    let measured = 0;
    const lines = wrapText(text, 300, 14, 400, (s) => {
      measured += s.length;
      return chars(s);
    });
    assert.deepEqual(lines, want);
    // Adding one character (or word) at a time measures about 75 to 150 times the text here.
    assert.ok(measured < 10 * text.length, `measured ${measured} characters to wrap ${text.length}`);
  }
});

test("an arrow attached to nothing follows its elbow or curve route", () => {
  const free = (route, x2 = 200, y2 = 100) =>
    arrowGeometry(normalizeElement({ id: "a", type: "arrow", x1: 0, y1: 0, x2, y2, route }), new Map());
  assert.deepEqual(free("elbow").points.map((p) => [p.x, p.y]), [[0, 0], [100, 0], [100, 100], [200, 100]]);
  assert.match(free("curve").d, / C/);
  assert.equal(free("straight").points.length, 2);
  // Ends this close stay straight, as they do between shapes that nearly touch.
  assert.equal(free("elbow", 10, 8).points.length, 2);
});

test("a simplified stroke keeps its ends and corners and drops points on a straight line", () => {
  const line = Array.from({ length: 500 }, (_, i) => [i, 0]);
  assert.deepEqual(simplifyStroke(line, 0.5), [[0, 0], [499, 0]]);
  const corner = [...line.slice(0, 250), ...Array.from({ length: 250 }, (_, i) => [249, i + 1])];
  assert.deepEqual(simplifyStroke(corner, 0.5), [[0, 0], [249, 0], [249, 250]]);
  assert.deepEqual(simplifyStroke([[0, 0], [5, 5]], 0.5), [[0, 0], [5, 5]]);
  // A long stroke is done in pieces, and the points where they meet stay: one per 512 points.
  const long = Array.from({ length: 5000 }, (_, i) => [i, 0]);
  assert.deepEqual(simplifyStroke(long, 0.5).map((p) => p[0]), [0, 512, 1024, 1536, 2048, 2560, 3072, 3584, 4096, 4608, 4999]);
});

test("simplifying a long jagged stroke takes time in step with its length", () => {
  // A zigzag that gets wider as it goes makes plain RDP split one point off at a time, so it
  // would check about n * n / 2 distances: over a billion here.
  const zigzag = Array.from({ length: 50000 }, (_, i) => [i, i % 2 ? -i : i]);
  const start = performance.now();
  const out = simplifyStroke(zigzag, 0.5);
  assert.ok(performance.now() - start < 1500, `took ${Math.round(performance.now() - start)} ms`);
  // No point is on a line, so every one stays.
  assert.equal(out.length, zigzag.length);
});

test("a fitted stroke is short enough to keep and ends where the pointer did", () => {
  const zigzag = Array.from({ length: 30000 }, (_, i) => [i, i % 2 ? -i : i]);
  const out = fitStroke(zigzag, 0.5);
  assert.equal(out.length, MAX_PEN_POINTS);
  assert.deepEqual(out[0], zigzag[0]);
  assert.deepEqual(out.at(-1), zigzag.at(-1));
  assert.equal(normalizeElement({ type: "pen", points: out }).points.length, MAX_PEN_POINTS);
});
