# Skeleton: incremental-comparison.html

> **⛔ Self-contained HTML — ALL CSS inline. No CDN links. Follow this exact 8-section structure.**

---

The HTML report has exactly 8 sections in this order. Each section MUST be present.

## Section 1: Header + Comparison Cards
```html
<div class="header">
  <div class="report-badge">INCREMENTAL THREAT MODEL COMPARISON</div>
  <h1>[FILL: repo name]</h1>
</div>
<div class="comparison-cards">
  <div class="compare-card baseline">
    <div class="card-label">BASELINE</div>
    <div class="card-hash">[FILL: baseline SHA]</div>
    <div class="card-date">[FILL: baseline commit date from git log]</div>
    <div class="risk-badge [FILL: old-class]">[FILL: old rating]</div>
  </div>
  <div class="compare-arrow">→</div>
  <div class="compare-card target">
    <div class="card-label">TARGET</div>
    <div class="card-hash">[FILL: target SHA]</div>
    <div class="card-date">[FILL: target commit date from git log]</div>
    <div class="risk-badge [FILL: new-class]">[FILL: new rating]</div>
  </div>
  <div class="compare-card trend">
    <div class="card-label">TREND</div>
    <div class="trend-direction [FILL: color]">[FILL: Improving / Worsening / Stable]</div>
    <div class="trend-duration">[FILL: N months]</div>
  </div>
</div>
```
<!-- SKELETON INSTRUCTION: Section 2 (Risk Shift) is merged into Section 1 above. The old separate risk-shift div is removed. The comparison-cards div replaces both the old subtitle + risk-shift + time-between box. -->

## Section 2: Metrics Bar (5 boxes)
```html
<div class="metrics-bar">
  [FILL: Components: old → new (±N)]
  [FILL: Trust Boundaries: old → new (±N)]
  [FILL: Threats: old → new (±N)]
  [FILL: Findings: old → new (±N)]
  [FILL: Code Changes: N commits, M PRs — use git rev-list --count and git log --oneline --merges --grep="Merged PR"]
</div>
```
**MUST include Trust Boundaries as one of the 5 metrics. 5th box is Code Changes (NOT Time Between).**

## Section 3: Status Summary Cards (colored)
```html
<div class="status-cards">
  <!-- Green card --> Fixed: [FILL: count] [FILL: 1-sentence summary, NO IDs]
  <!-- Red card --> New: [FILL: count] [FILL: 1-sentence summary, NO IDs]
  <!-- Amber card --> Previously Unidentified: [FILL: count] [FILL: 1-sentence summary, NO IDs]
  <!-- Gray card --> Still Present: [FILL: count] [FILL: 1-sentence summary, NO IDs]
</div>
```
<!-- SKELETON INSTRUCTION: Status cards show COUNT + a short human-readable sentence ONLY.
  DO NOT include threat IDs (T06.S, T02.E), finding IDs (FIND-14), or component names.
  Good: "1 credential handling vulnerability remediated"
  Good: "4 new components with 21 new threats identified"
  Good: "No new threats or findings introduced"
  Bad: "T06.S: DefaultAzureCredential → ManagedIdentityCredential"
  Bad: "ConfigurationOrchestrator — 5 threats (T16.*), LLMService — 6 threats (T17.*)"
  The detailed item-by-item breakdown with IDs belongs in Section 5 (Threat/Finding Status Breakdown). -->
**Status info appears ONLY here — NOT also in the metrics bar.**

## Section 4: Component Status Grid
```html
<table class="component-grid">
  <tr><th>Component</th><th>Type</th><th>Status</th><th>Source Files</th></tr>
  [REPEAT: one row per component with color-coded status badge]
  <tr><td>[FILL]</td><td>[FILL]</td><td><span class="badge-[FILL: status]">[FILL]</span></td><td>[FILL]</td></tr>
  [END-REPEAT]
</table>
```

## Section 5: Threat/Finding Status Breakdown
```html
<div class="status-breakdown">
  [FILL: Grouped by status — Fixed items, New items, etc.]
  [REPEAT: Each item: ID | Title | Component | Status]
  [END-REPEAT]
</div>
```

## Section 6: STRIDE Heatmap with Deltas
```html
<table class="stride-heatmap">
  <thead>
    <tr>
      <th>Component</th>
      <th>S</th><th>T</th><th>R</th><th>I</th><th>D</th><th>E</th><th>A</th>
      <th>Total</th>
      <th class="divider"></th>
      <th>T1</th><th>T2</th><th>T3</th>
    </tr>
  </thead>
  <tbody>
    [REPEAT: one row per component]
    <tr>
      <td>[FILL: component]</td>
      <td>[FILL: S value] [FILL: delta indicator ▲/▼]</td>
      ... [same for T, R, I, D, E, A, Total] ...
      <td class="divider"></td>
      <td>[FILL: T1]</td><td>[FILL: T2]</td><td>[FILL: T3]</td>
    </tr>
    [END-REPEAT]
  </tbody>
</table>
```
**MUST have 13 columns: Component + S + T + R + I + D + E + A + Total + divider + T1 + T2 + T3**

## Section 7: Needs Verification
```html
<div class="needs-verification">
  [REPEAT: items where analysis disagrees with old report]
  [FILL: item description]
  [END-REPEAT]
</div>
```

## Section 8: Footer
```html
<div class="footer">
  Model: [FILL] | Duration: [FILL]
  Baseline: [FILL: folder] at [FILL: SHA]
  Generated: [FILL: timestamp]
</div>
```

---

**Fixed CSS variables (use in `<style>` block):**
```css
--red: #dc3545;    /* new vulnerability */
--green: #28a745;  /* fixed/improved */
--amber: #fd7e14;  /* previously unidentified */
--gray: #6c757d;   /* still present */
--accent: #2171b5; /* modified/info */
```

**Fixed rules:**
- ALL CSS in inline `<style>` block — no external stylesheets
- Include `@media print` styles
- Heatmap MUST have T1/T2/T3 columns after divider
- Metrics bar MUST include Trust Boundaries
- Status data in cards ONLY — not duplicated in metrics bar
- HTML threat/finding totals MUST match markdown STRIDE summary totals
