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
const testBrowser = process.env.LAYOUT_AUDIT_BROWSER;

function runAudit(fixture, outDir, additionalArgs = [], target = path.join(fixtures, fixture)) {
  assert.ok(playwrightRoot, "PLAYWRIGHT_ROOT must point to a directory that can resolve Playwright");
  const result = spawnSync(process.execPath, [
    auditScript,
    "--target", target,
    "--out-dir", outDir,
    "--playwright-root", playwrightRoot,
    ...(testBrowser ? ["--browser", testBrowser] : []),
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

  assert.equal(report.browser, testBrowser || "chromium");
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

test("documents Chromium as the default browser", () => {
  const result = spawnSync(process.execPath, [auditScript, "--help"], {encoding: "utf8", timeout: 10000});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Browser channel \(default: chromium\)/);
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

test("handles clipping, rendered visibility, unique selectors, offscreen controls and RTL", t => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "layout-audit-regression-"));
  const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), "layout-audit-source-"));
  t.after(() => fs.rmSync(outDir, {recursive: true, force: true}));
  t.after(() => fs.rmSync(sourceDir, {recursive: true, force: true}));
  const target = path.join(sourceDir, "regression.html");
  fs.writeFileSync(target, `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 8px; }
    #clamped { width: 140px; display: -webkit-box; -webkit-box-orient: vertical;
      -webkit-line-clamp: 2; overflow: hidden; line-height: 20px; }
    #unclipped { width: 60px; white-space: nowrap; overflow: visible; }
    #rtl { direction: rtl; width: 250px; overflow-x: auto; }
    #rtl > div { width: 700px; display: flex; justify-content: space-between; }
    .below { margin-top: 1200px; position: relative; height: 80px; }
    .cover { position: absolute; inset: 0; z-index: 2; }
  </style></head><body>
    <p id="clamped">${"Several words wrap onto many lines. ".repeat(12)}</p>
    <p id="unclipped">Visible overflowing text without clipping</p>
    <div aria-hidden="true"><button id="rendered">Rendered control</button></div>
    <button data-testid="duplicate">First</button><button data-testid="duplicate">Second</button>
    <div id="rtl" aria-label="${"long-label-".repeat(50)}"><div><span>Start</span><span class="end">End</span></div></div>
    <div class="below"><button id="below">Covered below fold</button><div class="cover"></div></div>
  </body></html>`, "utf8");
  const report = runAudit("", outDir, ["--check-hit-testing", "--scroll-selector", "#rtl", "--edge-selector", ".end", "--viewports", "1392x900,390x844"], target);
  assert.equal(report.viewports.length, 2);
  for (const viewport of report.viewports) {
  assert.ok(viewport.issues.some(issue => issue.type === "text-clipping-candidate" && issue.selector === "#clamped"));
  assert.ok(!viewport.issues.some(issue => issue.type === "text-clipping-candidate" && issue.selector === "#unclipped"));
  assert.ok(viewport.elements.some(element => element.selector === "#rendered"));
  const selectors = viewport.elements.map(element => element.selector);
  assert.equal(new Set(selectors).size, selectors.length);
  assert.ok(viewport.issues.some(issue => issue.type === "hit-test-obstruction-candidate" && issue.selector === "#below"));
  assert.equal(viewport.scrollRegions[0].endReached, true);
  assert.equal(viewport.scrollRegions[0].edgeVisible, true);
  assert.ok(viewport.scrollRegions[0].screenshot.length < 130);
  }
});