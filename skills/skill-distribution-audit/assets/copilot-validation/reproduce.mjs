import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const evidence = path.dirname(fileURLToPath(import.meta.url));
const skill = path.resolve(evidence, "../..");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "copilot-distribution-replay-"));
fs.mkdirSync(path.join(root, "outputs"));
fs.cpSync(path.join(evidence, "inputs"), path.join(root, "inputs"), { recursive: true });
fs.cpSync(skill, path.join(root, ".github/skills/skill-distribution-audit"), { recursive: true });
for (const script of ["derive-audit-inputs.mjs", "run-comparisons.mjs", "annotate-findings.mjs"]) {
  fs.copyFileSync(path.join(evidence, "outputs", script), path.join(root, "outputs", script));
  execFileSync(process.execPath, [path.join(root, "outputs", script)], { cwd: root, stdio: "inherit", windowsHide: true });
}
for (const stage of ["before", "after"]) {
  for (const layer of ["manifest", "discovery"]) {
    const name = `${stage}-${layer}-comparison`;
    const captured = JSON.parse(fs.readFileSync(path.join(evidence, "outputs", `${name}.json`), "utf8"));
    const actual = JSON.parse(fs.readFileSync(path.join(root, "outputs", `${name}.json`), "utf8"));
    assert.deepEqual(actual, captured, `${name}: replay differs from captured Copilot result`);
    const exitCode = fs.readFileSync(path.join(root, "outputs", `${name}.exitcode.txt`), "utf8").trim();
    assert.equal(exitCode, fs.readFileSync(path.join(evidence, "outputs", `${name}.exitcode.txt`), "utf8").trim());
    console.log(`${name}: exit ${exitCode}; missing ${actual.missing.length}; unexpected ${actual.unexpected.length}`);
  }
}
console.log(`Reproduced all four captured helper results in ${root}`);
