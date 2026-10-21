import assert from "node:assert/strict";
import test from "node:test";
import { closeBrowserBounded } from "./capture.mjs";

test("closeBrowserBounded returns false quickly when close never settles", async () => {
  const started = Date.now();
  const clean = await closeBrowserBounded({ close: () => new Promise(() => {}) }, 150);
  assert.equal(clean, false);
  assert.ok(Date.now() - started < 2_000);
});

test("closeBrowserBounded reports clean close, rejection and missing browser", async () => {
  assert.equal(await closeBrowserBounded({ close: async () => {} }, 150), true);
  assert.equal(await closeBrowserBounded({ close: async () => { throw new Error("gone"); } }, 150), true);
  assert.equal(await closeBrowserBounded(null, 150), true);
});
