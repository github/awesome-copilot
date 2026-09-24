// Tests for label wrapping and arrow routes. Run `node --test` in the extension folder.
import assert from "node:assert/strict";
import test from "node:test";
import { arrowGeometry, wrapText } from "./geometry.mjs";
import { normalizeElement } from "./model.mjs";

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
