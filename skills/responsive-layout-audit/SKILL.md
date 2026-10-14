---
name: responsive-layout-audit
description: 'Use this skill to audit responsive rendering for a web page or local HTML with Playwright. It checks page-level horizontal overflow, region-level horizontal scrolling, clipping candidates, and hit-test obstruction candidates, then outputs PNG and JSON evidence.'
argument-hint: "[target URL or HTML path] [viewports] [scroll selectors] [output directory]"
---

# Responsive Layout Audit

## Purpose

Render the page at multiple viewport sizes and separate page-level overflow from intentional in-region horizontal scrolling (for example, data tables).

This skill reports candidates for review. It does not make final defect decisions and does not replace product acceptance.

## Inputs

- Target URL (`http`, `https`, `file`) or local HTML path.
- Viewports. Default: `1920x1080`, `1392x900`, `950x900`, `696x900`, `390x844`.
- Optional CSS selectors for horizontally scrollable regions.
- Optional edge selector inside each region (for example `thead th:last-child`).
- Output directory (use an empty run-specific directory).
- Optional ready selector when SPA content appears late.

If your project has its own viewport policy, use that policy and record the selected sizes.

## Workflow

1. Confirm target scope and avoid pages with sensitive production data.
2. Fix the viewport set, optional scroll selectors, optional edge selector, and output directory.
3. Reuse an existing Playwright installation when possible.
4. Run [scripts/layout-audit.mjs](scripts/layout-audit.mjs) from the skill directory and inspect `layout-report.json` plus screenshots.

```powershell
node .\scripts\layout-audit.mjs `
  --target .\path\to\page.html `
  --out-dir .\run\layout-audit\screen-id\ `
  --playwright-root .\run\playwright-runtime `
  --scroll-selector ".table-viewport" `
  --edge-selector "thead th:last-child" `
  --check-hit-testing
```

You can pass `--scroll-selector` multiple times. `--edge-selector` is evaluated inside each region. Use `--ready-selector` for late-loading UI. `--wait-ms` is extra settling time, not readiness proof.

If Playwright is not available, install it in a dedicated local runtime directory.

```powershell
npm install --prefix .\run\playwright-runtime playwright
node .\run\playwright-runtime\node_modules\playwright\cli.js install chromium
```

Chromium is the default. Its browser binary must be installed separately with the command above. Reuse an existing compatible runtime where available; obtain permission before installing dependencies or browsers. Use `--browser msedge` only when Microsoft Edge is installed on the host.

Record target, viewport set, selectors, Playwright/browser version, output paths, candidate dispositions, and remaining unknowns.

## Verification

Run [tests/layout-audit.test.mjs](tests/layout-audit.test.mjs) with `PLAYWRIGHT_ROOT` set to the directory containing `node_modules/playwright` and managed Chromium installed:

```powershell
$env:PLAYWRIGHT_ROOT = (Resolve-Path .\run\playwright-runtime).Path
node --test tests/layout-audit.test.mjs
```

The suite uses synthetic fixtures, including [intentional scrolling](tests/fixtures/intentional-scroll.html) and [page overflow](tests/fixtures/page-overflow.html), plus a generated regression page. Tests cover the default Chromium launch, clipping, rendered visibility, selector uniqueness, below-fold obstruction, RTL scrolling, bounded filenames, and URL query redaction.

For a separate opt-in Edge run, set `LAYOUT_AUDIT_BROWSER=msedge` before running the suite. This does not replace managed-Chromium coverage; report the browser actually tested.

## How to read results

- `page.horizontalOverflow`: compares document width and viewport width.
- `scrollRegions`: tracks region width, max scroll-left, and optional edge visibility.
- `text-clipping-candidate`: horizontal clipping or vertical line-clamp overflow based on rendered CSS and geometry.
- `action-outside-viewport-candidate`: interactive elements outside viewport bounds.
- `hit-test-obstruction-candidate`: sampled-point obstruction candidates.
- `pageErrors`: uncaught JavaScript errors in the page context.
- `LAYOUT_AUDIT_DONE`: execution and evidence generation completed.

## Gotchas

- Keep style policy (colors/borders/visual language) separate from this mechanical audit.
- Do not treat page-level width and container-level horizontal scroll as the same signal.
- Do not treat `scrollWidth` mismatch alone as a defect.
- Hit-test scrolls rendered buttons and links into view before sampling and restores the original scroll offsets afterward. Scrolling can trigger lazy loading or page event handlers. This is not a full interaction test and does not cover frames or shadow roots.
- `endReached` checks the scroll offset, including negative RTL offsets. `edgeVisible` checks geometry only; neither proves that text is readable or unobstructed. Inspect the PNGs as well.
- The script redacts secret-like query values but is not a full anonymization layer.
- Screenshots may include sensitive information. Use safe test data and controlled sharing.