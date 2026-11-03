import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { compareDiscovery } from "./compare-discovery.mjs";

test("an exact match is independent of input order and accepts empty sets", () => {
  assert.equal(compareDiscovery(["b", "a"], ["a", "b"]).match, true);
  assert.equal(compareDiscovery([], []).match, true);
});

test("equal totals still expose an omission and a leaked template", () => {
  const result = compareDiscovery(["active-a", "active-b"], ["active-a", "template"]);
  assert.equal(result.match, false);
  assert.equal(result.counts.expected, result.counts.observed);
  assert.deepEqual(result.missing, ["active-b"]);
  assert.deepEqual(result.unexpected, ["template"]);
});

test("duplicates on either side invalidate otherwise equal sets", () => {
  const result = compareDiscovery(["a", "a", "b"], ["b", "b", "a"]);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.unexpected, []);
  assert.equal(result.match, false);
  assert.deepEqual(result.duplicates, {
    expected: [{ id: "a", count: 2 }], observed: [{ id: "b", count: 2 }],
  });
});

test("identities remain exact and input arrays remain unchanged", () => {
  const expected = Object.freeze(["A", "group/a"]);
  const observed = Object.freeze(["a", "group\\a"]);
  const result = compareDiscovery(expected, observed);
  assert.deepEqual(result.missing, ["A", "group/a"]);
  assert.deepEqual(result.unexpected, ["a", "group\\a"]);
});

test("malformed identity collections are rejected instead of coerced", () => {
  for (const value of [null, {}, "a", [""], [" a"], ["a "], [42], [null]]) {
    assert.throws(() => compareDiscovery(value, []), TypeError);
    assert.throws(() => compareDiscovery([], value), TypeError);
  }
});

test("CLI reports exit codes, preserves inputs, and handles invalid JSON and missing files", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-discovery-test-"));
  // Remove only this test's newly created temporary directory.
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("skill-discovery-test-"));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const script = fileURLToPath(new URL("./compare-discovery.mjs", import.meta.url));
  const expected = path.join(root, "expected.json");
  const observed = path.join(root, "observed.json");
  fs.writeFileSync(expected, '["active-a","active-b"]\n');
  const original = fs.readFileSync(expected);
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8", windowsHide: true });
  for (const [input, status] of [
    ['["active-b","active-a"]', 0],
    ['["active-a","template"]', 1],
    ['["active-a","active-b","active-b"]', 1],
    ['{"a":true}', 2],
    ["invalid JSON", 2],
  ]) {
    fs.writeFileSync(observed, input);
    const result = run(expected, observed);
    assert.equal(result.status, status, result.stderr);
    assert.deepEqual(fs.readFileSync(expected), original);
    assert.equal(fs.readFileSync(observed, "utf8"), input);
    if (status < 2) assert.equal(JSON.parse(result.stdout).match, status === 0);
    else assert.ok(result.stderr.length > 0);
  }
  assert.equal(run(expected, path.join(root, "missing.json")).status, 2);
  assert.equal(run(expected).status, 2);
  assert.deepEqual(fs.readdirSync(root).sort(), ["expected.json", "observed.json"]);
});

test("CLI works through a linked installation directory", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-discovery-test-"));
  const installed = path.join(root, "installed");
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("skill-discovery-test-"));
    if (fs.existsSync(installed)) {
      assert.ok(fs.lstatSync(installed).isSymbolicLink());
      fs.unlinkSync(installed);
    }
    fs.rmSync(root, { recursive: true, force: true });
  });
  const source = path.dirname(fileURLToPath(import.meta.url));
  try {
    fs.symlinkSync(source, installed, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (!["EPERM", "EACCES", "ENOSYS"].includes(error.code)) throw error;
    t.skip(`Links unavailable: ${error.code}`);
    return;
  }
  const expected = path.join(root, "expected.json");
  const observed = path.join(root, "observed.json");
  fs.writeFileSync(expected, '["active"]');
  const script = path.join(installed, "compare-discovery.mjs");
  for (const [input, status] of [['["active"]', 0], ['["template"]', 1]]) {
    fs.writeFileSync(observed, input);
    const result = spawnSync(process.execPath, [script, expected, observed], { encoding: "utf8", windowsHide: true });
    assert.equal(result.status, status, result.stderr);
    assert.equal(JSON.parse(result.stdout).match, status === 0);
  }
  assert.equal(spawnSync(process.execPath, [script, expected, path.join(root, "absent.json")], { windowsHide: true }).status, 2);
});
