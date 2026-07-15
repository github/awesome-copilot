# Incremental Orchestrator — Threat Model Update Workflow

This file contains the complete orchestration logic for performing an **incremental threat model analysis** — generating a new threat model report that builds on an existing baseline report. It is invoked when the user requests an updated analysis and a prior `threat-model-*` folder exists.

**Key difference from single analysis (`orchestrator.md`):** Instead of discovering components from scratch, this workflow inherits the old report's component inventory, IDs, and conventions. It then verifies each item against the current code and discovers new items.

## ⚡ Context Budget — Read Files Selectively

**Phase 1 (setup + change detection):** Read this file (`incremental-orchestrator.md`) only. The old `threat-inventory.json` provides the structural skeleton — no need to read other skill files yet.
**Phase 2 (report generation):** Read `orchestrator.md` (for mandatory rules 1–34), `output-formats.md`, `diagram-conventions.md` — plus the relevant skeleton from `skeletons/` before writing each file. See the incremental-specific rules below.
**Phase 3 (verification):** Delegate to a sub-agent with `verification-checklist.md` (all 9 phases, including Phase 8 for comparison HTML).

---

## When to Use This Workflow

Use incremental analysis when ALL of these conditions are met:
1. The user's request involves updating, re-running, or refreshing a threat model
2. A prior `threat-model-*` folder exists in the repository with a valid `threat-inventory.json`
3. The user provides or implies both: a baseline report folder AND a target commit (defaults to HEAD)

**Trigger examples:**
- "Update the threat model using threat-model-20260309-174425 as the baseline"
- "Run an incremental threat model analysis against the previous report"
- "What changed security-wise since the last threat model?"
- "Refresh the threat model for the latest commit"

**NOT this workflow:**
- First-time analysis (no baseline) → use `orchestrator.md`
- "Analyze the security of this repo" with no mention of a prior report → use `orchestrator.md`

---

## Inputs

| Input | Source | Required? |
|-------|--------|-----------|
| Baseline report folder | Path to `threat-model-*` directory | Yes |
| Baseline `threat-inventory.json` | `{baseline_folder}/threat-inventory.json` | Yes |
| Baseline commit SHA | From `{baseline_folder}/0-assessment.md` Report Metadata | Yes |
| Target commit | User-provided SHA or defaults to HEAD | Yes (default: HEAD) |

---

**⛔ Sub-Agent Governance applies to ALL phases.** See `orchestrator.md` Sub-Agent Governance section. Sub-agents are READ-ONLY helpers — they NEVER call `create_file` for report files.

## Phase 0: Setup & Validation

1. **Record start time:**
   ```
   Get-Date -Format "yyyy-MM-dd HH:mm:ss" -AsUTC
   ```
   Store as `START_TIME`.

2. **Gather git info:**
   ```
   git remote get-url origin
   git branch --show-current
   git rev-parse --short HEAD
   hostname
   ```

3. **Validate inputs:**
   - Confirm baseline folder exists: `Test-Path {baseline_folder}/threat-inventory.json`
   - Read baseline commit SHA from `0-assessment.md`: search for `| Git Commit |` row
   - Confirm target commit is resolvable: `git rev-parse {target_sha}`
   - **Get commit dates:** `git log -1 --format="%ai" {baseline_sha}` and `git log -1 --format="%ai" {target_sha}` — NOT today's date
   - **Get code change counts** (for HTML metrics bar):
     ```
     git rev-list --count {baseline_sha}..{target_sha}
     git log --oneline --merges --grep="Merged PR" {baseline_sha}..{target_sha} | wc -l
     ```
     Store as `COMMIT_COUNT` and `PR_COUNT`.

4. **Baseline code access — reuse or create worktree:**
   ```
   # Check for existing worktree
   git worktree list
   
   # If a worktree for baseline_sha exists → reuse it
   # Verify: git -C {worktree_path} rev-parse HEAD
   
   # If not → create one:
   git worktree add ../baseline-{baseline_sha_short} {baseline_sha}
   ```
   Store the worktree path as `BASELINE_WORKTREE` for old-code verification in later phases.

5. **Create output folder:**
   ```
   threat-model-{YYYYMMDD-HHmmss}/
   ```

---

## Phase 1: Load Old Report Skeleton

Read the baseline `threat-inventory.json` and extract the structural skeleton:

```
From threat-inventory.json, load:
  - components[]  → all component IDs, types, boundaries, source_files, fingerprints
  - flows[]       → all flow IDs, from/to, protocols
  - boundaries[]  → all boundary IDs, contains lists
  - threats[]     → all threat IDs, component mappings, stride categories, tiers
  - findings[]    → all finding IDs, titles, severities, CWEs, component mappings
  - metrics       → totals for validation

Store as the "inherited inventory" — the structural foundation.
```

**Do NOT read the full prose** from the old report's markdown files yet. Only load structured data. Read old report prose on-demand when:
- Verifying if a specific code pattern was previously analyzed
- Resolving ambiguity about a component's role or classification
- Historical context needed for a finding status decision

---

## Phase 2: Per-Component Change Detection

For each component in the inherited inventory, determine its change status:

```
For EACH component in inherited inventory:

  1. Check source_files existence at target commit:
     git ls-tree {target_sha} -- {each source_file}
  
  2. If ALL source files missing:
     → change_status = "removed"
     → Mark all linked threats as "removed_with_component"
     → Mark all linked findings as "removed_with_component"
  
  3. If source files exist, check for changes:
     git diff --stat {baseline_sha} {target_sha} -- {source_files}
     
     If NO changes → change_status = "unchanged"
     
     If changes exist, check if security-relevant:
       Read the diff: git diff {baseline_sha} {target_sha} -- {source_files}
       Look for changes in:
       - Auth/credential patterns (tokens, passwords, certificates)
       - Network/API surface (new endpoints, changed listeners, port bindings)
       - Input validation (sanitization, parsing, deserialization)
       - Command execution patterns (shell exec, process spawn)
       - Config values (TLS settings, CORS, security headers)
       - Dependencies (new packages, version changes)
       
       If security-relevant → change_status = "modified"
       If cosmetic only (whitespace, comments, logging, docs) → change_status = "unchanged"
  
  4. If files moved or renamed:
     git log --follow --diff-filter=R {baseline_sha}..{target_sha} -- {source_files}
     → change_status = "restructured"
     → Update source_file references to new paths
```

**Record the classification for every component** — this drives all downstream decisions.

---

## Phase 3: Scan for New Components

```
1. Enumerate source directories/files at {target_sha} that are NOT referenced
   by any existing component's source_files or source_directories.
   Focus on: new top-level directories, new *Service.cs/*Agent.cs/*Server.cs classes,
   new Helm deployments, new API controllers.

2. Apply the same component discovery rules from orchestrator.md:
   - Class-anchored naming (PascalCase from actual class names)
   - Component eligibility criteria (crosses trust boundary or handles security data)
   - Same naming procedure (primary class → script → config → directory → technology)

3. For each candidate new component:
   - Verify it didn't exist at baseline: git ls-tree {baseline_sha} -- {path}
   - If it existed at baseline → this is a "missed component" from the old analysis
     → Add to Needs Verification section with note: "Component existed at baseline
       but was not in the previous analysis. May indicate an analysis gap."
   - If genuinely new (files didn't exist at baseline):
     → change_status = "new"
     → Assign a new component ID following the same PascalCase naming rules
     → Full STRIDE analysis will be performed in Phase 4
```

---

## Phase 4: Generate Report Files

Now generate all report files. **Read the relevant skill files before starting:**
- `orchestrator.md` — mandatory rules 1–34 apply to all report files
- `output-formats.md` — templates and format rules
- `diagram-conventions.md` — diagram colors and styles
- **Before writing EACH file, read the corresponding skeleton from `skeletons/skeleton-*.md`** — copy VERBATIM and fill `[FILL]` placeholders

**⛔ SUB-AGENT GOVERNANCE (MANDATORY — prevents the dual-folder bug):** The parent agent owns ALL file creation. Sub-agents are READ-ONLY helpers that search code, gather context, and run verification — they NEVER call `create_file` for report files. See the full Sub-Agent Governance rules in `orchestrator.md`. The ONLY exception is `threat-inventory.json` delegation for large repos — and even then, the sub-agent prompt must include the exact output file path and explicit instruction to write ONLY that one file.

**⛔ CRITICAL: The incremental report is a STANDALONE report.** Someone reading it without the old report must understand the complete security posture. Status annotations ([STILL PRESENT], [FIXED], [NEW CODE], etc.) are additions on top of complete content — not replacements for it.

### 4a. 0.1-architecture.md

- **Read `skeletons/skeleton-architecture.md` first** — use as structural template
- Copy the old report's component structure as your starting template
- **Unchanged components:** Regenerate description using the current code (not copy-paste from old report). Same ID, same conventions.
- **Modified components:** Update description to reflect code changes. Add annotation: `[MODIFIED — security-relevant changes detected]`
- **New components:** Add with annotation: `[NEW]`
- **Removed components:** Add with annotation: `[REMOVED]` and brief note
- Tech stack, deployment model: update if changed, otherwise carry forward

  ⛔ **DEPLOYMENT CLASSIFICATION IS MANDATORY (even in incremental mode):**
  The `0.1-architecture.md` MUST contain:
  1. `**Deployment Classification:** \`[VALUE]\`` line (e.g., `K8S_SERVICE`, `LOCALHOST_DESKTOP`)
  2. `### Component Exposure Table` with columns: Component, Listens On, Auth Required, Reachability, Min Prerequisite, Derived Tier
  If the baseline had these, carry them forward and update for new/modified components.
  If the baseline did NOT have these, **derive them from code NOW** — they are required for all subsequent steps.
  **DO NOT proceed to Step 4b without these two elements in place.**

- Scenarios: keep old scenarios, add new ones for new functionality
- All standard `0.1-architecture.md` rules from `output-formats.md` apply

### 4b. 1.1-threatmodel.mmd (DFD)

- **Read `skeletons/skeleton-dfd.md` and `skeletons/skeleton-summary-dfd.md` first**
- Start from the old DFD's logical layout
- **Same node IDs** for carried-forward components (critical for ID stability)
- **New components:** Add with distinctive styling — use `classDef newComponent fill:#d4edda,stroke:#28a745,stroke-width:3px`
- **Removed components:** Show as dashed with gray fill — use `classDef removedComponent fill:#e9ecef,stroke:#6c757d,stroke-width:1px,stroke-dasharray:5`
- **Same flow IDs** for unchanged flows
- **New flows:** New IDs continuing the sequence
- All standard DFD rules from `diagram-conventions.md` apply (flowchart LR, color palette, etc.)

  ⛔ **POST-DFD GATE:** After creating `1.1-threatmodel.mmd`, count elements and boundaries. If elements > 15 OR boundaries > 4 → create `1.2-threatmodel-summary.mmd` using `skeleton-summary-dfd.md` NOW. Do NOT proceed to Step 4c until the decision is made.

### 4c. 1-threatmodel.md

- **Read `skeletons/skeleton-threatmodel.md` first** — use table structure
- Element table: all old elements + new elements, with an added `Status` column
  - Values: `Unchanged`, `Modified`, `New`, `Removed`, `Restructured`
- Flow table: all old flows + new flows, with `Status` column
- Boundary table: inherited boundaries + any new ones
- If `1.2-threatmodel-summary.mmd` was generated, include `## Summary View` section with the summary diagram and mapping table
- All standard table rules from `output-formats.md` apply

### 4d. 2-stride-analysis.md

- **Read `skeletons/skeleton-stride-analysis.md` first** — use Summary table and per-component structure

**⛔ CRITICAL REMINDERS FOR INCREMENTAL STRIDE (these rules from `orchestrator.md` apply identically here):**
1. **The "A" in STRIDE-A is ALWAYS "Abuse"** (business logic abuse, workflow manipulation, feature misuse). NEVER use "Authorization" as the STRIDE-A category name. This applies to threat ID suffixes (T01.A), N/A justification labels, and all prose. Authorization issues fall under Elevation of Privilege (E), not the A category.
2. **The `## Summary` table MUST appear at the TOP of the file**, immediately after `## Exploitability Tiers`, BEFORE any individual component sections. Use this EXACT structure at the top:

```markdown
# STRIDE-A Threat Analysis

## Exploitability Tiers
| Tier | Label | Prerequisites | Assignment Rule |
|------|-------|---------------|----------------|
| **Tier 1** | Direct Exposure | `None` | Exploitable by unauthenticated external attacker with NO prior access. |
| **Tier 2** | Conditional Risk | Single prerequisite | Requires exactly ONE form of access. |
| **Tier 3** | Defense-in-Depth | Multiple prerequisites or infrastructure access | Requires significant prior breach or multiple combined prerequisites. |

## Summary
| Component | Link | S | T | R | I | D | E | A | Total | T1 | T2 | T3 | Risk |
|-----------|------|---|---|---|---|---|---|---|-------|----|----|----|------|
<!-- one row per component with numeric counts, then Totals row -->

---
## [First Component Name]
```

3. **STRIDE categories may produce 0, 1, 2, 3+ threats** per component. Do NOT cap at 1 threat per category. Components with rich security surfaces should typically have 2-4 threats per relevant category. If every STRIDE cell in the Summary table is 0 or 1, the analysis is too shallow — go back and identify additional threat vectors. The Summary table columns reflect actual threat counts.
4. **⛔ PREREQUISITE FLOOR CHECK (per threat):** Before assigning a prerequisite to any threat, look up the component's `Min Prerequisite` and `Derived Tier` in the Component Exposure Table (`0.1-architecture.md`). The threat's prerequisite MUST be ≥ the component's floor. The threat's tier MUST be ≥ the component's derived tier. Use the canonical prerequisite→tier mapping from `analysis-principles.md`. Prerequisites MUST use only canonical values: `None`, `Authenticated User`, `Privileged User`, `Internal Network`, `Local Process Access`, `Host/OS Access`, `Admin Credentials`, `Physical Access`, `{Component} Compromise`. ⛔ `Application Access` and `Host Access` are FORBIDDEN.

**⛔ HEADING ANCHOR RULE (applies to ALL output files):** ALL `##` and `###` headings in every output file must be PLAIN text — NO status tags (`[Existing]`, `[Fixed]`, `[Partial]`, `[New]`, `[Removed]`, or any old-style tags) in heading text. Tags break markdown anchor links and pollute table-of-contents. Place status annotations on the FIRST LINE of the section/finding body instead:
- ✅ `## KmsPluginProvider` with first line `> **[New]** Component added in this release.`
- ✅ `### FIND-01: Missing Auth Check` with first line `> **[Existing]**`
- ❌ `## KmsPluginProvider [New]` (breaks `#kmspluginprovider` anchor)
- ❌ `### FIND-01: Missing Auth Check [Existing]` (pollutes heading)

This rule applies to: `0.1-architecture.md`, `2-stride-analysis.md`, `3-findings.md`, `1-threatmodel.md`.

For each component, the STRIDE analysis approach depends on its change status:

| Component Status | STRIDE Approach |
|-----------------|-----------------|
| **Unchanged** | Carry forward all threat entries from old report with `[STILL PRESENT]` annotation. Re-verify each threat's mitigation status against current code. |
| **Modified** | Re-analyze the component with access to the diff. For each old threat: determine if `still_present`, `fixed`, `mitigated`, or `modified`. Discover new threats from the code changes → classify as `new_in_modified`. |
| **New** | Full fresh STRIDE-A analysis (same as single-analysis mode). All threats classified as `new_code`. |
| **Removed** | Section header with note: "Component removed — all threats resolved with `removed_with_component` status." |

**Threat ID continuity:**
- Old threats keep their original IDs (e.g., T01.S, T02.T)
- New threats continue the sequence from the old report's highest threat number
- NEVER reassign or reuse an old threat ID

**N/A categories (from §3.7 of PRD):**
- Each component gets all 7 STRIDE-A categories addressed
- Non-applicable categories: `N/A — {1-sentence justification}`
- N/A entries do NOT count toward threat totals

**Status annotation format in STRIDE tables:**
Add a `Change` column to each threat table row with one of:
- `Existing` — threat exists in current code, same as before (includes threats with minor detail changes)
- `Fixed` — vulnerability was remediated (cite the specific code change)
- `New` — threat from a new component, code change, or previously unidentified
- `Removed` — component was removed

<!-- SIMPLIFIED DISPLAY TAGS: Only 5 tags for display in markdown body text.
  [Existing] = still_present, modified, mitigated (threat still exists)
  [Fixed] = fixed (fully remediated)
  [Partial] = partially_mitigated (code changed but vulnerability remains in reduced form)
  [New] = new_code, new_in_modified, previously_unidentified (new to this report)
  [Removed] = removed_with_component (component deleted)
  JSON change_status keeps the detailed values for programmatic use. -->

⛔ POST-STEP CHECK: After writing the Change column for ALL threats, verify:
  1. Every threat row has exactly one of: Existing, Fixed, New, Removed
  2. No old-style tags: Still Present, New (Code), New (Modified), Previously Unidentified
  3. Fixed threats cite the specific code change

### 4e. 3-findings.md

⛔ **BEFORE WRITING ANY FINDING — Re-read `skeletons/skeleton-findings.md` NOW.**
The skeleton defines the EXACT structure for each finding block, including the mandatory `**Prerequisite basis:**` line in the `#### Evidence` section. Every finding — whether [Existing], [New], [Fixed], or [Partial] — MUST follow this skeleton structure.

⛔ **DEPLOYMENT CONTEXT GATE (FAIL-CLOSED) — applies to ALL findings (new and carried-forward):**
Read `0.1-architecture.md` Deployment Classification and Component Exposure Table.
If classification is `LOCALHOST_DESKTOP` or `LOCALHOST_SERVICE`:
- ZERO findings may have `Exploitation Prerequisites` = `None` → fix to `Local Process Access` or `Host/OS Access`
- ZERO findings may be in `## Tier 1` → downgrade to T2/T3
- ZERO CVSS vectors may use `AV:N` unless component has `Reachability = External`
For ALL classifications:
- Each finding's prerequisite MUST be ≥ its component's `Min Prerequisite` from the exposure table
- Each finding's tier MUST be ≥ its component's `Derived Tier`
- **EVERY finding's `#### Evidence` section MUST start with a `**Prerequisite basis:**` line** citing the specific code/config that determines the prerequisite (e.g., "ClusterIP service, no Ingress — Internal Only per Exposure Table"). This applies to [Existing] findings too — re-derive from current code.
- Prerequisites MUST use only canonical values. ⛔ `Application Access` and `Host Access` are FORBIDDEN.

For each old finding, verify against the current code:

| Situation | change_status | Action |
|-----------|---------------|--------|
| Code unchanged, vulnerability intact | `still_present` | Carry forward with `> **[Existing]**` on first line of body |
| Code changed to fix the vulnerability | `fixed` | Mark with `> **[Fixed]**`, cite the specific code change |
| Code changed partially | `partially_mitigated` | Mark with `> **[Partial]**`, explain what changed and what remains |
| Component removed entirely | `removed_with_component` | Mark with `> **[Removed]**` |

For new findings:

| Situation | change_status | Label |
|-----------|---------------|-------|
| New component, new vulnerability | `new_code` | `> **[New]**` |
| Existing component, vulnerability introduced by code change | `new_in_modified` | `> **[New]**` — cite the specific change |
| Existing component, vulnerability was in old code but missed | `previously_unidentified` | `> **[New]**` — verify against baseline worktree |

<!-- ⛔ POST-STEP CHECK: After writing all finding annotations:
  1. Every finding body starts with one of: [Existing], [Fixed], [Partial], [New], [Removed]
  2. Tags are in body text as blockquote (> **[Tag]**), NOT in the ### heading
  3. No old-style tags: [STILL PRESENT], [NEW CODE], [NEW IN MODIFIED], [PREVIOUSLY UNIDENTIFIED], [PARTIALLY MITIGATED], [REMOVED WITH COMPONENT]
  4. JSON change_status uses the detailed values (still_present, new_code, etc.) for programmatic comparison -->

**Finding ID continuity:**
- Old findings keep their original IDs (FIND-01 through FIND-N)
- New findings continue the sequence: FIND-N+1, FIND-N+2, ...
- No gaps, no duplicates
- Fixed findings are retained but annotated — they are NOT removed from the report
- **Document order**: Findings are sorted by Tier (1→2→3), then by severity (Critical→Important→Moderate→Low), then by CVSS descending — same as standalone analysis. Because old IDs are preserved, the ID numbers may NOT be numerically ascending in the document. This is acceptable in incremental mode — ID stability for cross-report tracing takes precedence over sequential ordering. The `### FIND-XX:` headings will appear in tier/severity order, not ID order.

**Previously-unidentified verification procedure:**
1. Identify the finding's component and evidence files
2. Read the same files at the baseline commit: `cat {BASELINE_WORKTREE}/{file_path}`
3. If the vulnerability pattern exists in the old code → `previously_unidentified`
4. If the vulnerability pattern does NOT exist in the old code → `new_in_modified`

### 4f. threat-inventory.json

- **Read `skeletons/skeleton-inventory.md` first** — use exact field names and schema structure

Same schema as single analysis, with additional fields:

```json
{
  "schema_version": "1.1",
  "incremental": true,
  "baseline_report": "threat-model-20260309-174425",
  "baseline_commit": "2dd84ab",
  "target_commit": "abc1234",
  
  "components": [
    {
      "id": "McpHost",
      "change_status": "unchanged",
      ...existing fields...
    }
  ],
  
  "threats": [
    {
      "id": "T01.S",
      "change_status": "still_present",
      ...existing fields...
    }
  ],
  
  "findings": [
    {
      "id": "FIND-01",
      "change_status": "still_present",
      ...existing fields...
    }
  ],
  
  "metrics": {
    ...existing fields...,
    "status_summary": {
      "components": {
        "unchanged": 15,
        "modified": 2,
        "new": 1,
        "removed": 1,
        "restructured": 0
      },
      "threats": {
        "still_present": 80,
        "fixed": 5,
        "mitigated": 3,
        "new_code": 10,
        "new_in_modified": 4,
        "previously_unidentified": 2,
        "removed_with_component": 8
      },
      "findings": {
        "still_present": 12,
        "fixed": 2,
        "partially_mitigated": 1,
        "new_code": 3,
        "new_in_modified": 2,
        "previously_unidentified": 1,
        "removed_with_component": 1
      }
    }
  }
}
```

### 4g. 0-assessment.md

- **Read `skeletons/skeleton-assessment.md` first** — use section order and table structures

Standard assessment sections (all 7 mandatory) plus incremental-specific sections:

**Standard sections (same as single analysis):**
1. Report Files
2. Executive Summary (with `> **Note on threat counts:**` blockquote)
3. Action Summary (with `### Quick Wins`)
4. Analysis Context & Assumptions (with `### Needs Verification` and `### Finding Overrides`)
5. References Consulted
6. Report Metadata
7. Classification Reference (static table copied from skeleton)

**Additional incremental sections (insert between Action Summary and Analysis Context):**

```markdown
## Change Summary

### Component Changes
| Status | Count | Components |
|--------|-------|------------|
| Unchanged | X | ComponentA, ComponentB, ... |
| Modified | Y | ComponentC, ... |
| New | Z | ComponentD, ... |
| Removed | W | ComponentE, ... |

### Threat Status
| Status | Count |
|--------|-------|
| Still Present | X |
| Fixed | Y |
| New (Code) | Z |
| New (Modified) | M |
| Previously Unidentified | W |
| Removed with Component | V |

### Finding Status
| Status | Count |
|--------|-------|
| Still Present | X |
| Fixed | Y |
| Partially Mitigated | P |
| New (Code) | Z |
| New (Modified) | M |
| Previously Unidentified | W |
| Removed with Component | V |

### Risk Direction
[Improving / Worsening / Stable] — [1-2 sentence justification based on status distribution]

---

## Previously Unidentified Issues

These vulnerabilities were present in the baseline code at commit `{baseline_sha}` but were not identified in the prior analysis:

| Finding | Title | Component | Evidence |
|---------|-------|-----------|----------|
| FIND-XX | [title] | [component] | Baseline code at `{file}:{line}` |
```

**Report Metadata additions:**
```markdown
| Baseline Report | `{baseline_folder}` |
| Baseline Commit | `{baseline_sha}` (`{baseline_commit_date}` — run `git log -1 --format="%cs" {baseline_sha}`) |
| Target Commit | `{target_sha}` (`{target_commit_date}` — run `git log -1 --format="%cs" {target_sha}`) |
| Baseline Worktree | `{worktree_path}` |
| Analysis Mode | `Incremental` |
```

### 4h. incremental-comparison.html

- **Read `skeletons/skeleton-incremental-html.md` first** — use 8-section structure and CSS variables

Generate a self-contained HTML file that visualizes the comparison. All data comes from the `change_status` fields already computed in `threat-inventory.json`.

**Structure:**

```html
<!-- Section 1: Header + Comparison Cards -->
<div class="header">
  <div class="report-badge">INCREMENTAL THREAT MODEL COMPARISON</div>
  <h1>{{repo_name}}</h1>
</div>
<div class="comparison-cards">
  <div class="compare-card baseline">
    <div class="card-label">BASELINE</div>
    <div class="card-hash">{{baseline_sha}}</div>
    <div class="card-date">{{baseline_commit_date from git log}}</div>
    <div class="risk-badge">{{old_risk_rating}}</div>
  </div>
  <div class="compare-arrow">→</div>
  <div class="compare-card target">
    <div class="card-label">TARGET</div>
    <div class="card-hash">{{target_sha}}</div>
    <div class="card-date">{{target_commit_date from git log}}</div>
    <div class="risk-badge">{{new_risk_rating}}</div>
  </div>
  <div class="compare-card trend">
    <div class="card-label">TREND</div>
    <div class="trend-direction">{{Improving|Worsening|Stable}}</div>
    <div class="trend-duration">{{N months}}</div>
  </div>
</div>

<!-- Section 2: Metrics Bar (5 boxes — NO Time Between, use Code Changes) -->
<div class="metrics-bar">
  Components: {{old_count}} → {{new_count}} (±N)
  Trust Boundaries: {{old_boundaries}} → {{new_boundaries}} (±N)
  Threats: {{old_count}} → {{new_count}} (±N)  
  Findings: {{old_count}} → {{new_count}} (±N)
  Code Changes: {{COMMIT_COUNT}} commits, {{PR_COUNT}} PRs
</div>

<!-- Section 3: Status Summary Cards (colored cards — primary visualization) -->
<div class="status-cards">
  <!-- Green card: Fixed (count + list of fixed items) -->
  <!-- Red card: New (code + modified) (count + list of new items) -->
  <!-- Amber card: Previously Unidentified (count + list) -->
  <!-- Gray card: Still Present (count) -->
</div>

<!-- Section 4: Component Status Grid -->
<table class="component-grid">
  <!-- Row per component: ID | Type | Status (color-coded) | Source Files -->
</table>

<!-- Section 5: Threat/Finding Status Breakdown -->
<div class="status-breakdown">
  <!-- Grouped by status: Fixed items, New items, etc. -->
  <!-- Each item: ID | Title | Component | Status -->
</div>

<!-- Section 6: STRIDE Heatmap with Deltas -->
<!-- ⛔ MANDATORY: Heatmap MUST have 13 columns including T1/T2/T3 after a divider -->
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
    <!-- Row per component. Each STRIDE cell: value (▲+N or ▼-N delta from baseline) -->
    <!-- The divider column is a thin visual separator between STRIDE totals and tier breakdown -->
  </tbody>
</table>

<!-- Section 7: Needs Verification -->
<div class="needs-verification">
  <!-- Items where analysis disagrees with old report -->
</div>

<!-- Section 8: Footer -->
<div class="footer">
  Model: {{model}} | Duration: {{duration}}
  Baseline: {{baseline_folder}} at {{baseline_sha}}
  Generated: {{timestamp}}
</div>
```

**Styling rules:**
- Self-contained: ALL CSS in inline `<style>` block. No CDN links.
- Color conventions: green (#28a745) = fixed, red (#dc3545) = new vulnerability, amber (#fd7e14) = previously unidentified, gray (#6c757d) = still present, blue (#2171b5) = modified
- Print-friendly: include `@media print` styles
- Use the same CSS color conventions defined above for visual consistency

---

## Phase 5: Verification

### 5a. Standard Verification

Run the standard `verification-checklist.md` (Phases 0–9) against the new report. The incremental report must pass ALL standard quality checks since it is a standalone report. Delegate to a sub-agent with the **output folder absolute path** so it can read the report files.

### 5b. Incremental Verification

After standard verification passes, run the incremental-specific checks from `experiment-history/mode-c-verification-suite.md` (Phases 1–9, 33 checks). These verify:
- Structural continuity (every old item accounted for)
- Code-verified status accuracy (e.g., "fixed" actually verified against code diff)
- Previously-unidentified classification (verified against baseline worktree)
- DFD consistency (old nodes present, new nodes distinguished)
- Standalone quality (no dangling references to old report)
- Comparison summary accuracy (counts match inventory)
- Needs Verification completeness
- Edge cases (merges, splits, rewrites)
- Metrics/JSON integrity

### 5c. Correction Workflow

1. Collect all PASS/FAIL results
2. For each FAIL → apply the check's "Fail remediation" action
3. Re-run failed checks to confirm they pass
4. After 2 correction attempts, escalate remaining failures to Needs Verification
5. Record end time and generate execution summary

---

## ⛔ Rules Specific to Incremental Analysis

These rules supplement (not replace) the 34 mandatory rules from `orchestrator.md`:

### Rule I1: Old Report Assessment Judgments Are Preserved

When the new analysis would assign a different TMT category, component type, tier, or threat relevance than the old report → preserve the old report's value. Log the disagreement in Needs Verification with:
- Old value
- New analysis's proposed value
- 1-2 sentence reasoning
- What the user should check

**Exception:** Factual corrections (file paths, git metadata, arithmetic) are corrected silently and noted in Report Metadata.

### Rule I2: No Silent Overrides

The report body uses the OLD value for assessment judgments. Disagreements go to Needs Verification. The user must explicitly confirm any reclassification.

### Rule I3: Previously-Unidentified Must Be Verified

Every `previously_unidentified` classification MUST include evidence from the baseline worktree. The analyst must actually read the old code at the cited file/line and confirm the vulnerability pattern existed. No guessing based on "it's probably been there."

### Rule I4: Fixed Must Be Code-Verified

Every `fixed` classification MUST cite the specific code change that addressed the vulnerability. Generic statements like "the team fixed this" are not acceptable — show the diff.

### Rule I5: new_in_modified Requires Change Attribution

Every `new_in_modified` finding MUST identify the specific code change that introduced the vulnerability. Cite the diff hunk, new function, new config value, or new dependency that created the issue.

### Rule I6: Do Not Delete Baseline Worktree

The baseline worktree may be reused by future incremental analyses. Do NOT run `git worktree remove` on it. The worktree path is recorded in Report Metadata for reference.

### Rule I7: Change Status Consistency

A component's `change_status` must be consistent with its threats' and findings' statuses:
- `unchanged` component → its threats should be `still_present` (or `previously_unidentified` for newly discovered threats in unchanged code)
- `removed` component → ALL its threats/findings must be `removed_with_component`
- `modified` component → at least one threat should be `modified`, `fixed`, or `new_in_modified`
- `new` component → ALL its threats must be `new_code`

### Rule I8: Carry Forward, Don't Copy

"Carry forward" means regenerating a threat/finding entry that says the same thing — NOT literally copy-pasting old report text. The regenerated entry should:
- Use the same ID
- Reference current file paths (even if unchanged)
- Be phrased in present tense about the current code
- Include the `[STILL PRESENT]` annotation

---

## Summary: Phase-by-Phase Checklist

| Phase | Action | Success Criteria |
|-------|--------|-----------------|
| 0 | Setup, validate inputs, worktree | All inputs exist, worktree accessible |
| 1 | Load old inventory skeleton | All arrays populated, metrics match |
| 2 | Per-component change detection | Every component has a `change_status` |
| 3 | Scan for new components | New components identified, missed components flagged |
| 4 | Generate all report files | 8-9 files written to output folder |
| 5 | Verification (standard + incremental) | All checks pass or escalated to Needs Verification |
