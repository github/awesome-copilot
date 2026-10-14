---
name: responsive-layout-audit
description: "Use this skill to audit responsive rendering for a web page or local HTML with Playwright. It checks page-level horizontal overflow, region-level horizontal scrolling, clipping candidates, and hit-test obstruction candidates, then outputs PNG and JSON evidence."
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
4. Run the script and inspect `layout-report.json` plus screenshots.

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
```

Record target, viewport set, selectors, Playwright/browser version, output paths, candidate dispositions, and remaining unknowns.

## How to read results

- `page.horizontalOverflow`: compares document width and viewport width.
- `scrollRegions`: tracks region width, max scroll-left, and optional edge visibility.
- `text-clipping-candidate`: potential clipping based on CSS + width mismatch.
- `action-outside-viewport-candidate`: interactive elements outside viewport bounds.
- `hit-test-obstruction-candidate`: sampled-point obstruction candidates.
- `pageErrors`: uncaught JavaScript errors in the page context.
- `LAYOUT_AUDIT_DONE`: execution and evidence generation completed.

## Gotchas

- Keep style policy (colors/borders/visual language) separate from this mechanical audit.
- Do not treat page-level width and container-level horizontal scroll as the same signal.
- Do not treat `scrollWidth` mismatch alone as a defect.
- Hit-test checks samples only; this is not a full interaction test.
- The script redacts secret-like query values but is not a full anonymization layer.
- Screenshots may include sensitive information. Use safe test data and controlled sharing.