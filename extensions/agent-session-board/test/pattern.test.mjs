import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePatterns } from "../lib/pattern.mjs";

test("evaluatePatterns skips a pattern that runs past its deadline and still evaluates the rest", async () => {
    const slow = "\\d*\\d*\\d*\\d*\\d*x";
    const started = Date.now();
    const matcher = await evaluatePatterns(["^api/", slow, "^docs:"], ["api/x", "docs: y", "1".repeat(250)], 200);
    assert.deepEqual(matcher.skipped, [slow]);
    assert.equal(matcher.test("^api/", "api/x"), true);
    assert.equal(matcher.test("^docs:", "docs: y"), true);
    assert.equal(matcher.test("^docs:", "api/x"), false);
    assert.equal(matcher.test(slow, "1".repeat(250)), false);
    assert.ok(Date.now() - started < 3000);
});
