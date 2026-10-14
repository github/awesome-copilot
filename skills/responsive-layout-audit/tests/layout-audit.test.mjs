import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import test from "node:test";

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const auditScript = path.join(skillRoot, "scripts", "layout-audit.mjs");
const playwrightRoot = process.env.PLAYWRIGHT_ROOT;

function runAudit(fixture, outDir, additionalArgs = [], target = path.join(fixtures, fixture)) {
  assert.ok(playwrightRoot, "PLAYWRIGHT_ROOT must point to a directory that can resolve Playwright");
  const result = spawnSync(process.execPath, [
    auditScript,
    "--target", target,
    "--out-dir", outDir,
    "--playwright-root", playwrightRoot,
    "--browser", "msedge",
    "--viewports", "390x844",
    ...additionalArgs,
  ], {encoding: "utf8", timeout: 60000});
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return JSON.parse(fs.readFileSync(path.join(outDir, "layout-report.json"), "utf8"));
}

test("keeps intentional table scrolling separate and reports review candidates", t => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "layout-audit-scroll-"));
  t.after(() => fs.rmSync(outDir, {recursive: true, force: true}));
  const report = runAudit("intentional-scroll.html", outDir, [
    "--scroll-selector", ".table-viewport",
    "--edge-selector", "thead th:last-child",
    "--check-hit-testing",
  ]);
  const viewport = report.viewports[0];

  assert.equal(viewport.page.horizontalOverflow, false);
  assert.equal(viewport.scrollRegions[0].endReached, true);
  assert.equal(viewport.scrollRegions[0].edgeVisible, true);
  assert.ok(viewport.issues.some(issue => issue.type === "text-clipping-candidate" && issue.selector === "#clipped"));
  assert.ok(viewport.issues.some(issue => issue.type === "hit-test-obstruction-candidate" && issue.selector === "#covered"));
  assert.ok(!viewport.elements.some(element => element.selector === "#hidden"));
  assert.ok(fs.statSync(path.join(outDir, viewport.screenshot)).size > 0);
  assert.ok(fs.statSync(path.join(outDir, viewport.scrollRegions[0].screenshot)).size > 0);
});

test("reports page-level horizontal overflow", t => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "layout-audit-overflow-"));
  t.after(() => fs.rmSync(outDir, {recursive: true, force: true}));
  const report = runAudit("page-overflow.html", outDir);
  const viewport = report.viewports[0];

  assert.equal(viewport.page.horizontalOverflow, true);
  assert.ok(viewport.issues.some(issue => issue.type === "page-horizontal-overflow"));
});

test("redacts secret-like query values in the report target", t => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "layout-audit-redaction-"));
  t.after(() => fs.rmSync(outDir, {recursive: true, force: true}));
  const target = pathToFileURL(path.join(fixtures, "intentional-scroll.html"));
  target.searchParams.set("access_token", "secret-value");
  const report = runAudit("intentional-scroll.html", outDir, [], target.href);

  assert.match(report.target, /access_token=REDACTED/);
  assert.doesNotMatch(JSON.stringify(report), /secret-value/);
});