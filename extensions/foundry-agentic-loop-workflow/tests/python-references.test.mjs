import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const refs = resolve(dirname(fileURLToPath(import.meta.url)), "../../../skills/foundry-agentic-loop/references");
const rbac = join(refs, "check_rbac_preflight.py");
const python = spawnSync("python3", ["--version"]).status === 0 ? "python3" : null;
const skip = python ? false : "python3 not available";

function run(args) {
  const r = spawnSync(python, ["-B", rbac, ...args], { encoding: "utf8", env: { ...process.env, AZURE_SUBSCRIPTION_ID: "" } });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

function withFixture(content, fn) {
  const dir = mkdtempSync(join(tmpdir(), "rbac-"));
  try {
    const file = join(dir, "observed.json");
    writeFileSync(file, content);
    return fn(file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const owner = { scope: "/subscriptions/s", roleDefinitionName: "Owner" };
const contributor = { scope: "/subscriptions/s", roleDefinitionId: "/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c" };

test("rbac: owner passes", { skip }, () => withFixture(JSON.stringify({ principal: { id: "p1" }, assignments: [owner] }), (f) => {
  const r = run(["--from-file", f, "--subscription", "s"]);
  assert.equal(r.code, 0);
  assert.match(r.out, /^RBAC pre-flight: PASS/);
}));

test("rbac: contributor alone is blocked with a concrete remediation", { skip }, () => withFixture(JSON.stringify({ principal: { id: "p1", display: "me" }, assignments: [contributor] }), (f) => {
  const r = run(["--from-file", f, "--subscription", "s"]);
  assert.equal(r.code, 2);
  assert.match(r.out, /BLOCKED -- 1 required/);
  assert.match(r.out, /--assignee "p1" --role "f58310d9-a9f6-439a-9e8d-f62e7b41a168"/);
  assert.doesNotMatch(r.out, /unknown/);
}));

test("rbac: raw list needs --assignee", { skip }, () => withFixture(JSON.stringify([owner]), (f) => {
  const missing = run(["--from-file", f, "--subscription", "s"]);
  assert.equal(missing.code, 1);
  assert.match(missing.err, /^RBAC pre-flight: ERROR -- .*--assignee/);
  assert.equal(run(["--from-file", f, "--subscription", "s", "--assignee", "p9"]).code, 0);
}));

for (const [name, content] of [
  ["invalid JSON", "{bad"],
  ["scalar payload", '"text"'],
  ["wrong field types", '{"principal":"x","assignments":{}}'],
]) {
  test(`rbac: ${name} is a one-line ERROR, never a PASS`, { skip }, () => withFixture(content, (f) => {
    const r = run(["--from-file", f, "--subscription", "s", "--assignee", "p1"]);
    assert.equal(r.code, 1);
    assert.equal(r.out, "");
    assert.match(r.err, /^RBAC pre-flight: ERROR -- [^\n]+\n$/);
  }));
}

test("rbac: missing subscription is an ERROR", { skip }, () => withFixture(JSON.stringify({ principal: { id: "p1" }, assignments: [owner] }), (f) => {
  const r = run(["--from-file", f]);
  assert.equal(r.code, 1);
  assert.match(r.err, /No subscription/);
}));

test("python references parse", { skip }, () => {
  for (const file of ["check_rbac_preflight.py", "copilot-sdk-with-toolbox.py"]) {
    const r = spawnSync(python, ["-c", "import ast,sys; ast.parse(open(sys.argv[1]).read())", join(refs, file)], { encoding: "utf8" });
    assert.equal(r.status, 0, `${file}: ${r.stderr}`);
  }
});
