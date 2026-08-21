import assert from "node:assert/strict";
import test from "node:test";
import { formatShellCommand, quoteShellArg } from "./shell-quote.mjs";

test("plain arguments are left unquoted", () => {
  assert.equal(quoteShellArg("main"), "main");
  assert.equal(quoteShellArg("feature/x-1.2"), "feature/x-1.2");
  assert.equal(quoteShellArg("C:/repos/app"), "C:/repos/app");
});

test("shell metacharacters are neutralized with single quotes", () => {
  assert.equal(quoteShellArg("$(rm -rf ~)"), "'$(rm -rf ~)'");
  assert.equal(quoteShellArg("`id`"), "'`id`'");
  assert.equal(quoteShellArg('a"b'), "'a\"b'");
  assert.equal(quoteShellArg("C:\\repos\\my app"), "'C:\\repos\\my app'");
  assert.equal(quoteShellArg(""), "''");
});

test("embedded single quotes are escaped", () => {
  assert.equal(quoteShellArg("it's"), "'it'\\''s'");
});

test("commands are assembled from individually quoted parts", () => {
  assert.equal(
    formatShellCommand(["git", "-C", "/tmp/$(whoami)", "status"]),
    "git -C '/tmp/$(whoami)' status",
  );
  assert.equal(
    formatShellCommand(["git", "log", "--oneline", "-50", "--end-of-options", "-evil", "--"]),
    "git log --oneline -50 --end-of-options -evil --",
  );
});
