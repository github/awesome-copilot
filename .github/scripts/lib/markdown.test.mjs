import assert from "node:assert/strict";
import { test } from "node:test";
import { inlineCode } from "./markdown.mjs";

test("inlineCode wraps plain values in a single-backtick code span", () => {
  assert.equal(inlineCode("plain value"), "`plain value`");
});

test("inlineCode uses a fence longer than the longest backtick run", () => {
  assert.equal(inlineCode("a `` b"), "```a `` b```");
});

test("inlineCode pads values starting or ending with a backtick", () => {
  assert.equal(inlineCode("`leading"), "`` `leading ``");
  assert.equal(inlineCode("trailing`"), "`` trailing` ``");
});

test("inlineCode collapses whitespace and pads empty values", () => {
  assert.equal(inlineCode("a\n\t b"), "`a b`");
  assert.equal(inlineCode(" \n\t "), "`  `");
});

test("inlineCode truncates values to 80 characters", () => {
  assert.equal(inlineCode("x".repeat(81)), `\`${"x".repeat(77)}...\``);
});
