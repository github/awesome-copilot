import assert from "node:assert/strict";
import { test } from "node:test";
import { isReusableExtensionRegistered } from "./validate-plugins.mjs";

test("accepts a reusable extension bundled only by a parent plugin", () => {
  assert.equal(
    isReusableExtensionRegistered(
      "daily-focus-board",
      new Set(["ember"]),
      new Set(["daily-focus-board"])
    ),
    true
  );
});

test("accepts a same-named standalone extension plugin", () => {
  assert.equal(
    isReusableExtensionRegistered(
      "daily-focus-board",
      new Set(["daily-focus-board"]),
      new Set()
    ),
    true
  );
});

test("rejects an orphaned reusable extension", () => {
  assert.equal(
    isReusableExtensionRegistered(
      "daily-focus-board",
      new Set(["ember"]),
      new Set()
    ),
    false
  );
});
