# Verification Checklist — Post-Analysis Quality Gates

This file is the **single source of truth** for all verification rules that must pass before a threat model report is finalized. It is designed to be handed to a verification sub-agent along with the output folder path.

> **Authority hierarchy:** This file contains CHECKING rules (pass/fail criteria for quality gates). The AUTHORING rules that produce the content being checked are in `orchestrator.md`. Some rules appear in both files for visibility — if they ever conflict: `orchestrator.md` takes precedence for authoring decisions (how to write), this file takes precedence for pass/fail criteria (what constitutes a valid output). Do NOT remove rules from either file to "deduplicate" — the overlap is intentional for visibility.

**When to use:** After ALL output files are written (0.1-architecture.md through 0-assessment.md), run every check in this file. If any check fails, fix the issue before finalizing.

**Sub-agent delegation:** The orchestrator can delegate this entire file to a verification sub-agent with the prompt:
> "Read [verification-checklist.md](./verification-checklist.md). For each check, inspect the named output file(s) and report PASS/FAIL with evidence. Fix any failures."

---

## Inline Quick-Checks (Run Immediately After Each File Write)

> **Purpose:** These are lightweight self-checks the WRITING agent runs immediately after creating each file — NOT deferred to Step 10. Since the agent just wrote the file, the content is still in active context, making these checks highly effective.
>
> **How to use:** Before writing each file, read the corresponding skeleton from `skeletons/skeleton-*.md`. After each `create_file` call, scan the content you just wrote for these patterns. If any check fails, fix the file immediately before proceeding to the next step.
>
> **Skeleton compliance rule:** Every output file MUST follow its skeleton's section order, table column headers, and heading names. Do NOT add sections/tables not in the skeleton. Do NOT rename skeleton headings.

### After writing `3-findings.md`:
- [ ] First finding heading starts with `### FIND-01:` (not `F01`, `F-01`, or `Finding 1`)
- [ ] Every finding has these exact row labels: `SDL Bugbar Severity`, `Remediation Effort`, `Mitigation Type`, `Exploitability Tier`, `Exploitation Prerequisites`, `Component`
- [ ] Every CVSS value contains `CVSS:4.0/` prefix
- [ ] Every `Related Threats` cell contains `](2-stride-analysis.md#` (hyperlink, not plain text)
- [ ] Every finding has `#### Description`, `#### Evidence`, `#### Remediation`, and `#### Verification` sub-headings (not `Recommendation`, not `Impact`, not `Mitigation`, not bold `**Description:**` paragraphs) — exactly 4 sub-headings, no extras
- [ ] Every `#### Description` section has at least 2 sentences of technical detail (not single-sentence stubs)
- [ ] Every `#### Evidence` section cites specific file paths, line numbers, or config keys (not generic statements like "found in codebase")
- [ ] Every finding has ALL 10 mandatory attribute rows: `SDL Bugbar Severity`, `CVSS 4.0`, `CWE`, `OWASP`, `Exploitation Prerequisites`, `Exploitability Tier`, `Remediation Effort`, `Mitigation Type`, `Component`, `Related Threats`
- [ ] Every CWE value is a hyperlink: contains `](https://cwe.mitre.org/` (not plain text like `CWE-79`)
- [ ] Every OWASP value uses `:2025` suffix (not `:2021`)
- [ ] Findings organized by TIER (Tier 1/2/3 headings), NOT by severity (no `## Critical Findings`)
- [ ] **Tier-Prerequisite consistency (inline)**: For each finding, use canonical mapping: `None`→T1; `Authenticated User`/`Privileged User`/`Internal Network`/`Local Process Access`→T2; `Host/OS Access`/`Admin Credentials`/`Physical Access`/`{Component} Compromise`/combos→T3. ⛔ `Application Access` and `Host Access` are FORBIDDEN.
- [ ] Count finding headings — they must be sequential: FIND-01, FIND-02, FIND-03...
- [ ] No time estimates: search for `~`, `Sprint`, `Phase`, `hour`, `day`, `week` — must not appear
- [ ] **Threat Coverage Verification table** present at end of file with columns `Threat ID | Finding ID | Status`
- [ ] **Coverage table status values** use emoji prefixes: `✅ Covered (FIND-XX)`, `✅ Mitigated (FIND-XX)`, `🔄 Mitigated by Platform` — NOT plain text like "Finding", "Mitigated", "Covered"
- [ ] **Coverage table column names** are exactly `Threat ID | Finding ID | Status` — NOT `Threat | Finding | Status`

### After writing `0-assessment.md`:
- [ ] First `## ` heading is `## Report Files`
- [ ] Count `## ` headings — exactly 7 with these exact names: Report Files, Executive Summary, Action Summary, Analysis Context & Assumptions, References Consulted, Report Metadata, Classification Reference
- [ ] Heading contains `&` not `and`: search for `Analysis Context & Assumptions`
- [ ] Count `---` separator lines — at least 5
- [ ] `### Quick Wins` heading exists
- [ ] `### Priority by Tier and CVSS Score` heading exists under Action Summary, BEFORE Quick Wins
- [ ] **Priority table has max 10 rows**: Count data rows in Priority by Tier and CVSS Score table — must be ≤ 10
- [ ] **Priority table sort order**: All Tier 1 findings come first, then Tier 2, then Tier 3. Within each tier, higher CVSS scores come first. ❌ T2 finding appearing before a T1 finding → FAIL
- [ ] **Priority table Finding hyperlinks**: Every Finding cell is a hyperlink `[FIND-XX](3-findings.md#find-xx-title-slug)`. Search for `](3-findings.md#` in every row — must be present. ❌ Plain text `FIND-XX` without link → FAIL
- [ ] **Priority table anchor resolution**: For each hyperlink, verify the anchor slug matches the actual `### FIND-XX:` heading in 3-findings.md AS WRITTEN. Compute the anchor from the heading text (lowercase, spaces to hyphens, strip special chars). ❌ If any heading contains status tags like `[STILL PRESENT]` or `[NEW]`, that is a FAIL — status tags must NOT appear in headings (see Phase 2 check). Anchors should be computed from clean, tag-free heading text.
- [ ] **Action Summary tier hyperlinks**: Tier 1, Tier 2, Tier 3 cells in the Action Summary table are hyperlinks to `3-findings.md#tier-N` anchors
- [ ] `### Needs Verification` heading exists
- [ ] `### Finding Overrides` heading exists
- [ ] **Action Summary has exactly 4 data rows**: Tier 1, Tier 2, Tier 3, Total. Search for `| Mitigated |` or `| Platform |` or `| Fixed |` in the Action Summary table — FAIL if found. These are NOT separate tiers.
- [ ] **Git Commit includes date**: The `| Git Commit |` row must contain both the SHA and the commit date (e.g., `f49298ff` (`2026-03-04`)). If only the hash is shown without date → FAIL.
- [ ] **Baseline/Target Commits include dates** (incremental mode): `| Baseline Commit |` and `| Target Commit |` rows must each include a date alongside the SHA.
- [ ] `### Security Standards` and `### Component Documentation` headings exist (two Reference subsections)
- [ ] `| Model |` row exists in Report Metadata table
- [ ] `| Analysis Started |` row exists in Report Metadata table
- [ ] `| Analysis Completed |` row exists in Report Metadata table
- [ ] `| Duration |` row exists in Report Metadata table
- [ ] Metadata values wrapped in backticks: check for `` ` `` in metadata value cells
- [ ] **Report Files table first row**: `0-assessment.md` is the FIRST data row (not `0.1-architecture.md`)
- [ ] **Report Files completeness**: Every generated `.md` and `.mmd` file in the output folder has a corresponding row in the Report Files table (`threat-inventory.json` is intentionally excluded)
- [ ] **Report Files conditional rows**: `1.2-threatmodel-summary.mmd` and `incremental-comparison.html` rows present ONLY if those files were actually generated
- [ ] **Note on threat counts blockquote**: Executive Summary contains `> **Note on threat counts:**` paragraph
- [ ] **Boundary count**: Boundary count in Executive Summary matches actual Trust Boundary Table row count in `1-threatmodel.md`
- [ ] **Action Summary tier priorities**: Tier 1 = 🔴 Critical Risk, Tier 2 = 🟠 Elevated Risk, Tier 3 = 🟡 Moderate Risk. These are FIXED — never modified based on counts.
- [ ] **Risk Rating heading** has NO emojis: `### Risk Rating: Elevated` not `### Risk Rating: 🟠 Elevated`

### After writing `0.1-architecture.md`:
- [ ] Count `sequenceDiagram` occurrences — at least 3
- [ ] First 3 sequence diagrams have `participant` lines and `->>` message arrows (not empty diagram blocks)
- [ ] Key Components table row count matches Component Diagram node count
- [ ] Every Key Components table row uses PascalCase name (not kebab-case `my-component` or snake_case `my_component`)
- [ ] Every Key Components Type cell is one of: `Process`, `Data Store`, `External Service`, `External Interactor` — no ad-hoc types like `Role`, `Function`
- [ ] Technology Stack table has all 5 rows filled: Languages, Frameworks, Data Stores, Infrastructure, Security
- [ ] `## Security Infrastructure Inventory` section exists (not missing)
- [ ] `## Repository Structure` section exists (not missing)

### After writing `1.1-threatmodel.mmd`:
- [ ] Line 1 starts with `%%{init:`
- [ ] Contains `classDef process`, `classDef external`, `classDef datastore`
- [ ] No Chakra UI colors (`#4299E1`, `#48BB78`, `#E53E3E`)
- [ ] `linkStyle default stroke:#666666,stroke-width:2px` present
- [ ] DFD uses `flowchart LR` (NOT `flowchart TB`) — search for `flowchart` and verify direction is `LR`
- [ ] **Incremental DFD styling (incremental mode only)**: If new components exist, verify `classDef newComponent fill:#d4edda,stroke:#28a745` is present AND new component nodes use `:::newComponent` (NOT `:::process`). If removed components exist, verify `classDef removedComponent` with gray dashed styling. ❌ `newComponent fill:#6baed6` (same blue as process) → FAIL (visually invisible).

### After writing `2-stride-analysis.md`:
- [ ] `## Summary` appears BEFORE any `## ComponentName` section (check line numbers)
- [ ] Summary table has columns: `| Component | Link | S | T | R | I | D | E | A | Total | T1 | T2 | T3 | Risk |` — search for `| S | T | R | I | D | E | A |` to verify
- [ ] Summary table S/T/R/I/D/E/A columns contain numeric values (0, 1, 2, 3...), NOT all identical 1s for every component
- [ ] Every component has `#### Tier 1`, `#### Tier 2`, `#### Tier 3` sub-headings
- [ ] No `&`, `/`, `(`, `)`, `:` in `## ` headings
- [ ] **No status tags in headings (ANY file)**: Search ALL `.md` files for `^##.+\[Existing\]`, `^##.+\[Fixed\]`, `^##.+\[Partial\]`, `^##.+\[New\]`, `^##.+\[Removed\]`, and same for `###` headings. Also check old-style: `^##.+\[STILL`, `^##.+\[NEW`, `^###.+\[STILL`, `^###.+\[NEW CODE`. ❌ Tags in headings break anchor links and pollute ToC. Status must be on first line of section body as a blockquote (`> **[Tag]**`), not in the heading.
- [ ] **CRITICAL — A = Abuse, NEVER Authorization**: Search for `| Authorization |` in the file. If ANY match is a STRIDE category label (not inside a threat description sentence) → FIX IMMEDIATELY by replacing with `| Abuse |`. The "A" in STRIDE-A stands for "Abuse" (business logic abuse, workflow manipulation, feature misuse). This is the single most common error observed.
- [ ] **N/A entries not counted**: If any component has `N/A — {justification}` for a STRIDE category, verify that category shows `0` (not `1`) in the Summary table
- [ ] **STRIDE Status values**: Every threat row's Status column uses exactly one of: `Open`, `Mitigated`, `Platform`. No `Partial`, `N/A`, `Accepted`, or ad-hoc values.
- [ ] **Platform ratio**: Count threats with `Platform` status vs total threats. If >20% (standalone) or >35% (K8s operator) → re-examine each Platform entry.
- [ ] **STRIDE column arithmetic**: For every Summary table row, verify S+T+R+I+D+E+A = Total AND T1+T2+T3 = Total
- [ ] **Full category names in threat tables**: Category column uses full names (`Spoofing`, `Tampering`, `Information Disclosure`, `Denial of Service`, `Elevation of Privilege`, `Abuse`) — NOT abbreviations (`S`, `T`, `DoS`, `EoP`)
- [ ] **N/A table present**: Every component section has a `| Category | Justification |` table listing STRIDE categories with no threats — NOT prose/bullet-point format
- [ ] **Link column is separate**: Summary table 2nd column is `Link` with `[Link](#anchor)` values — component names do NOT contain embedded hyperlinks
- [ ] **Exploitability Tiers 4th column**: The tier definition table must have 4th column named `Assignment Rule` (NOT `Example`, `Description`, `Criteria`)

### After writing `incremental-comparison.html` (incremental mode only):
- [ ] HTML contains `Trust Boundaries` or `Boundaries` in the metrics bar — search for the text "Boundaries"
- [ ] STRIDE heatmap has 13 columns: Component, S, T, R, I, D, E, A, Total, divider, T1, T2, T3 — search for `T1` and `T2` and `T3` in the HTML
- [ ] Fixed/New/Previously Unidentified status information appears ONLY in colored status cards, NOT also as small inline badges in the metrics bar
- [ ] No `| Authorization |` as a STRIDE category label in the heatmap — search for "Authorization" in heatmap rows
- [ ] **HTML counts match markdown counts**: The Total threats in the HTML heatmap must equal the Totals row from `2-stride-analysis.md`. If they differ, regenerate the HTML heatmap from the STRIDE summary data. T1+T2+T3 totals in HTML must also match.
- [ ] **Comparison cards present**: HTML contains `comparison-cards` div with 3 cards: baseline (hash + date + rating), target (hash + date + rating), trend (direction + duration)
- [ ] **Commit dates from git log**: Baseline and target dates in comparison cards must match actual commit dates (NOT today's date, NOT analysis run date)
- [ ] **Code Changes box**: 5th metrics box shows commit count and PR count (NOT "Time Between")
- [ ] **No Time Between box**: Search for "Time Between" — must NOT appear in metrics bar
- [ ] **Status cards are concise**: Each status card's `card-items` div must contain only a short summary sentence. ❌ Threat IDs (T06.S, T02.E), finding IDs (FIND-14), or component names listed in cards → FAIL. Search for `T\d+\.` and `FIND-\d+` inside `card-items` divs. Detailed item breakdowns belong in the Threat/Finding Status Breakdown section, not in the summary cards.

### After writing any incremental report file (incremental mode — inline check):
- [ ] **Simplified display tags only**: Search ALL `.md` files for old-style tags: `[STILL PRESENT]`, `[NEW CODE]`, `[NEW IN MODIFIED]`, `[PREVIOUSLY UNIDENTIFIED]`, `[PARTIALLY MITIGATED]`, `[REMOVED WITH COMPONENT]`, `[MODIFIED]`. ❌ Any match → FAIL. Replace with simplified tags: `[Existing]`, `[Fixed]`, `[Partial]`, `[New]`, `[Removed]`.
- [ ] **Valid display tags**: Every finding/threat annotation uses exactly one of the 5 simplified tags: `[Existing]`, `[Fixed]`, `[Partial]`, `[New]`, `[Removed]`. Tags must appear as blockquote on first line of body: `> **[Tag]**`.
- [ ] **Component status simplified**: Component status column uses only: `Unchanged`, `Modified`, `New`, `Removed`. ❌ `Restructured` → FAIL (use `Modified` instead).
- [ ] **Change Summary tables use simplified tags**: Threat Status table has 4 rows (Existing/Fixed/New/Removed). Finding Status table has 5 rows (Existing/Fixed/Partial/New/Removed). ❌ Old-style rows like `Still Present`, `New (Code)`, `Partially Mitigated` → FAIL.

### After writing `threat-inventory.json` (inline check):
- [ ] **JSON threat count matches STRIDE file**: Count unique threat IDs in `2-stride-analysis.md` (grep `^\| T\d+\.`). This count MUST equal `threats` array length in the JSON. If STRIDE has MORE threats than JSON → threats were dropped during serialization. Rebuild the JSON.
- [ ] **JSON metrics internally consistent**: `metrics.total_threats` must equal `threats` array length. `metrics.total_findings` must equal `findings` array length.

### After writing `0-assessment.md` (count validation):
- [ ] Element count in Executive Summary matches actual Element Table row count (re-read `1-threatmodel.md` if needed)
- [ ] Finding count matches actual `### FIND-` heading count in `3-findings.md`
- [ ] Threat count matches Total from summary table in `2-stride-analysis.md`

---

## Phase 0 — Common Deviation Scan

These are the most frequently observed deviations across all previous runs. After output is generated, scan every output file for these specific patterns. Each check has a **WRONG** pattern to search for and a **CORRECT** expected pattern.

**How to use:** For each check, grep/scan the output files for the WRONG pattern. If found → FAIL. Then verify the CORRECT pattern is present. This phase catches recurring mistakes that the generating model tends to make despite instructions.

### 0.1 Structural Deviations

- [ ] **Findings organized by severity instead of tier** — Search for `## Critical Findings`, `## Important Findings`, `## High Findings`. These must NOT exist. ❌ `## Critical Findings` → ✅ `## Tier 1 — Direct Exposure (No Prerequisites)`
- [ ] **Flat STRIDE tables (no tier sub-sections)** — Each component in `2-stride-analysis.md` must have `#### Tier 1`, `#### Tier 2`, `#### Tier 3` sub-headings. ❌ Single flat table per component → ✅ Three separate tier sub-sections
- [ ] **Missing Exploitability Tier or Remediation Effort on findings** — Every `### FIND-` block in `3-findings.md` must contain both `Exploitability Tier` and `Remediation Effort` rows. ❌ Missing either field → ✅ Both MANDATORY
- [ ] **STRIDE summary missing tier columns** — Summary table in `2-stride-analysis.md` must include `T1`, `T2`, `T3` columns. ❌ Only S/T/R/I/D/E/A/Total → ✅ Must also have T1/T2/T3/Risk columns
- [ ] **STRIDE Summary at bottom** — Search for the line number of `## Summary` vs first `## Component`. ❌ Summary after components → ✅ Summary BEFORE all component sections, immediately after `## Exploitability Tiers`
- [ ] **Exploitability Tiers table columns** — The tier definition table in `2-stride-analysis.md` must have exactly these 4 columns: `Tier | Label | Prerequisites | Assignment Rule`. ❌ `Example`, `Description`, `Criteria` as 4th column → ✅ `Assignment Rule` only. The Assignment Rule cells must contain the rigid rule text, NOT deployment-specific examples.

### 0.2 File Format Deviations

- [ ] **`.md` wrapped in code fences** — Check if any `.md` file starts with ` ```markdown ` or ` ````markdown `. ❌ ` ```markdown\n# Title` → ✅ `# Title` on line 1
- [ ] **`.mmd` wrapped in code fences** — Check if `.mmd` file starts with ` ```plaintext ` or ` ```mermaid `. ❌ ` ```mermaid\n%%{init:` → ✅ `%%{init:` on line 1
- [ ] **Leaked skill directives in output** — Search ALL `.md` files for `⛔`, `RIGID TIER`, `Do NOT use subjective`, `MANDATORY`, `CRITICAL —`, `decision procedure`. These are internal skill instructions that must NOT appear in report output. ❌ Any match → ✅ Zero matches. Remove any leaked directive lines.
- [ ] **Nested duplicate output folder** — Check if the output folder contains a subfolder with the same name (e.g., `threat-model-20260307-081613/threat-model-20260307-081613/`). ❌ Subfolder exists → ✅ Delete the nested duplicate. The output folder should contain only files, no subfolders.
- [ ] **STRIDE-A "Authorization" instead of "Abuse"** — Search `2-stride-analysis.md` for `| Authorization |` or `**Authorization**` used as a STRIDE category name. The A in STRIDE-A is ALWAYS "Abuse", never "Authorization". ❌ Any match where Authorization is used as a STRIDE category → ✅ Replace with "Abuse". Note: do NOT replace "Authorization" when it appears inside threat descriptions (e.g., "Authorization header", "lacks authorization checks").

### 0.3 Assessment Section Deviations

- [ ] **Wrong section name for Action Summary** — Search for `Priority Remediation Roadmap`, `Top Recommendations`, `Key Recommendations`, `Risk Profile`. ❌ Any of those names → ✅ `## Action Summary` only
- [ ] **Separate recommendations section** — Search for `### Key Recommendations` or `### Top Recommendations` as standalone sections. ❌ Separate section → ✅ Action Summary IS the recommendations
- [ ] **Missing Quick Wins subsection** — Search for `### Quick Wins` under Action Summary. ❌ Missing → ✅ Present (with note if no low-effort T1 findings)
- [ ] **Missing threat count context** — Search for `> **Note on threat counts:**` blockquote in Executive Summary. ❌ Missing → ✅ Present
- [ ] **Missing Analysis Context & Assumptions** — Search for `## Analysis Context & Assumptions`. ❌ Missing → ✅ Present with `### Needs Verification` and `### Finding Overrides` sub-sections
- [ ] **Missing mandatory assessment sections** — Verify ALL 7 exist: Report Files, Executive Summary, Action Summary, Analysis Context & Assumptions, References Consulted, Report Metadata, Classification Reference. ❌ Any missing → ✅ All 7 present

### 0.4 References & Metadata Deviations

- [ ] **References Consulted as flat table** — Search for `| Reference | Usage |` pattern. ❌ Two-column flat table → ✅ Two subsections: `### Security Standards` with `| Standard | URL | How Used |` and `### Component Documentation` with `| Component | Documentation URL | Relevant Section |`
- [ ] **References missing URLs** — Every row in References Consulted tables must have a full `https://` URL. ❌ Missing URL column or empty URLs → ✅ Full URLs in every row
- [ ] **Report Metadata missing Model** — Search for `| **Model** |` or `| Model |` row. ❌ Missing → ✅ Present with actual model name
- [ ] **Report Metadata missing timestamps** — Search for `Analysis Started`, `Analysis Completed`, `Duration` rows. ❌ Any missing → ✅ All three present with computed values

### 0.5 Finding Quality Deviations

- [ ] **CVSS score without vector or missing prefix** — Grep each finding's CVSS field. The value MUST match pattern: `\d+\.\d+ \(CVSS:4\.0/AV:`. Specifically check for the `CVSS:4.0/` prefix — the most common deviation is outputting the vector without this prefix (bare `AV:N/AC:L/...`). ❌ `9.3` (score only) → ❌ `9.3 (AV:N/AC:L/...)` (no prefix) → ✅ `9.3 (CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N)`
- [ ] **CWE without hyperlink** — Grep for `CWE-\d+` without preceding `[`. ❌ `CWE-78: OS Command Injection` → ✅ `[CWE-78](https://cwe.mitre.org/data/definitions/78.html): OS Command Injection`
- [ ] **OWASP `:2021` suffix** — Grep for `:2021`. ❌ `A01:2021` → ✅ `A01:2025`
- [ ] **Related Threats as plain text** — Grep `Related Threats` rows for pattern without `](`. ❌ `T-02, T-17, T-23` → ✅ `[T02.S](2-stride-analysis.md#component-name), [T17.I](2-stride-analysis.md#other-component)`
- [ ] **Finding IDs out of order** — Check that FIND-NN IDs are sequential: FIND-01, FIND-02, FIND-03... ❌ `FIND-06` appearing before `FIND-04` → ✅ Sequential numbering top-to-bottom
- [ ] **CVSS AV:L or PR:H with Tier 1** — Grep every Tier 1 finding's CVSS vector for `AV:L` or `PR:H`. ❌ Tier 1 with local-only access → ✅ Downgrade to T2/T3
- [ ] **Localhost-only or admin-only finding in Tier 1** — Check deployment context: air-gapped, localhost, single-admin services should NOT be Tier 1. ❌ Tier 1 for admin-only → ✅ T2/T3
- [ ] **Time estimates in output** — Grep for `~1 hour`, `Sprint`, `Phase 1`, `(hours)`, `(days)`, `(weeks)`, `Immediate`. ❌ Any scheduling language → ✅ Only `Low`/`Medium`/`High` effort labels
- [ ] **"Accepted Risk" in Coverage table** — Grep `3-findings.md` for `Accepted Risk`. ❌ Any match → FAIL. The tool does NOT have authority to accept risks. Every `Open` threat MUST have a finding. Replace all `⚠️ Accepted Risk` with `✅ Covered` and create corresponding findings.

### 0.6 Diagram Deviations

- [ ] **Wrong color palette** — Grep all `#[0-9a-fA-F]{6}` in `.mmd` files and Mermaid blocks. ❌ `#4299E1`, `#48BB78`, `#E53E3E`, `#2B6CB0`, `#2D3748`, `#2F855A`, `#C53030` (Chakra UI) → ✅ Only allowed: `#6baed6`, `#2171b5`, `#fdae61`, `#d94701`, `#74c476`, `#238b45`, `#e31a1c`, `#666666`, `#ffffff`, `#000000`
- [ ] **Custom themeVariables colors** — Search init blocks for `secondaryColor`, `tertiaryColor`, or `primaryTextColor`. ❌ `"primaryColor": "#2D3748", "secondaryColor": "#4299E1"` → ✅ Only `'background': '#ffffff', 'primaryColor': '#ffffff', 'lineColor': '#666666'` in themeVariables
- [ ] **Missing summary MMD** — Count nodes and subgraphs in `1.1-threatmodel.mmd`. If elements > 15 OR subgraphs > 4, `1.2-threatmodel-summary.mmd` MUST exist. ❌ Threshold met but file missing → ✅ File created with summary diagram
- [ ] **Standalone sidecar nodes (K8s only)** — Search diagrams for nodes named `MISE`, `Dapr`, `Envoy`, `Istio`, `Sidecar` as separate entries. ❌ `MISE(("MISE Sidecar"))` → ✅ `InferencingFlow(("Inferencing Flow<br/>+ MISE"))`
- [ ] **Intra-pod localhost flows (K8s only)** — Search for `-->|"localhost"|` arrows between co-located containers. ❌ Present → ✅ Absent (implicit)
- [ ] **Missing sequence diagrams** — First 3 scenarios in `0.1-architecture.md` must each have a `sequenceDiagram` block. ❌ Fewer than 3 → ✅ At least 3
- [ ] **Technology-specific gaps** — For every technology in the repo (Redis, PostgreSQL, Docker, K8s, ML/LLM, NFS, etc.), verify at least one finding or documented mitigation exists. ❌ Technology present but no coverage → ✅ Each technology addressed

### 0.7 Canonical Pattern Checks

- [ ] **Finding heading pattern** — All finding headings match `^### FIND-\d{2}: ` (never `F01`, `F-01`, `Finding 1`)
- [ ] **CVSS prefix pattern** — All CVSS fields match `\d+\.\d+ \(CVSS:4\.0/AV:` (never bare `AV:N/AC:L/...`)
- [ ] **Related Threats link pattern** — Every Related Threat token matches `\[T\d{2}\.[STRIDEA]\]\(2-stride-analysis\.md#[a-z0-9-]+\)`
- [ ] **Assessment section headings exact set** — Exactly these `##` headings in `0-assessment.md`: Report Files, Executive Summary, Action Summary, Analysis Context & Assumptions, References Consulted, Report Metadata, Classification Reference
- [ ] **Forbidden headings absent** — No `##` or `###` headings containing: Severity Distribution, Architecture Risk Areas, Methodology Notes, Deliverables, Priority Remediation Roadmap, Key Recommendations, Top Recommendations

---

## Phase 1 — Per-File Structural Checks

These checks validate each file independently. They can run in parallel.

### 1.1 All `.md` Files

- [ ] **No code-fence wrapping**: No `.md` file starts with ` ```markdown ` or ` ````markdown `. Every `.md` file must begin with a `# Heading` as its very first line. If any file is wrapped in fences, strip the first and last lines immediately.
- [ ] **No `.mmd` code-fence wrapping**: The `.mmd` file must NOT start with ` ```plaintext ` or ` ```mermaid `. It must start with `%%{init:` as the very first characters. If wrapped, strip the fence lines.
- [ ] **No empty files**: Every file has substantive content beyond the heading.

### 1.2 `0.1-architecture.md`

- [ ] **Required sections present**: System Purpose, Key Components, Component Diagram, Top Scenarios, Technology Stack, Deployment Model, Repository Structure
- [ ] **Component Diagram exists** as a Mermaid `flowchart` inside a ` ```mermaid ` code fence
- [ ] **Architecture styles used** — NOT DFD circles `(("Name"))`. Must use `["Name"]` or `(["Name"])` with `service`/`external`/`datastore` classDef names
- [ ] **At least 3 scenarios** have Mermaid `sequenceDiagram` blocks
- [ ] **No separate `.mmd` files** were created for 0.1-architecture.md — all diagrams are inline
- [ ] **Component Diagram elements match Key Components table** — every row in the table has a corresponding node in the diagram, and vice versa. Count both and verify counts are equal.
- [ ] **Top Scenarios reflect actual code paths**, not hypothetical use cases
- [ ] **Deployment Model has network details** — must mention at least: port numbers OR bind addresses OR network topology

### 1.3 `1.1-threatmodel.mmd`

- [ ] **File exists** with pure Mermaid code (no markdown wrapper, no ` ```mermaid ` fence)
- [ ] **Starts with** `%%{init:` block
- [ ] **Contains** `classDef process`, `classDef external`, `classDef datastore`
- [ ] **Uses DFD shapes**: circles `(("Name"))` for processes, rectangles `["Name"]` for externals, cylinders `[("Name")]` for data stores

### 1.4 `1-threatmodel.md`

- [ ] **Diagram content identical** to `1.1-threatmodel.mmd` — byte-for-byte comparison of the Mermaid block content (excluding the ` ```mermaid ` fence wrapper)
- [ ] **Element Table** present with columns: Element, Type, TMT Category, Description, Trust Boundary
- [ ] **Data Flow Table** present with columns: ID, Source, Target, Protocol, Description
- [ ] **Trust Boundary Table** present with columns: Boundary, Description, Contains
- [ ] **TMT Category IDs used** — Element Table's TMT Category column uses specific TMT element IDs from `tmt-element-taxonomy.md` (e.g., `SE.P.TMCore.WebSvc`, `SE.EI.TMCore.Browser`). NOT generic labels like `Process`, `External`.
- [ ] **Flow IDs match DF\d{2} pattern** — Every flow ID in the Data Flow Table uses `DF01`, `DF02`, etc. format. NOT `F1`, `Flow-1`, `DataFlow1`.
- [ ] **If >15 elements or >4 boundaries**: `1.2-threatmodel-summary.mmd` MUST exist AND `1-threatmodel.md` MUST include a "Summary View" section with the summary diagram AND a "Summary to Detailed Mapping" table. **To verify:** count nodes (lines matching `[A-Z]\d+` with shape syntax) and subgraphs in `1.1-threatmodel.mmd`. If count exceeds thresholds but `1.2-threatmodel-summary.mmd` does not exist → **FAIL — create the summary diagram before proceeding**.

### 1.5 `2-stride-analysis.md`

- [ ] **Exploitability Tiers section** present at top with tier definition table
- [ ] **Summary table** appears BEFORE individual component sections (immediately after Exploitability Tiers, NOT at the bottom of the file)
- [ ] **Summary table** includes columns: Component, Link, S, T, R, I, D, E, A, Total, T1, T2, T3, Risk
- [ ] **Every component** has `## Component Name` heading followed by Tier 1, Tier 2, Tier 3 sub-sections (all three present even if empty)
- [ ] **Empty tiers** use "*No Tier N threats identified for this component.*"
- [ ] **Anchor-safe headings**: No `## ` heading in this file contains ANY of these characters: `&`, `/`, `(`, `)`, `.`, `:`, `'`, `"`, `+`, `@`, `!`. Replace: `&` → `and`, `/` → `-`, parentheses → omit, `:` → omit.
- [ ] **Pod Co-location line** present for K8s components listing co-located sidecars
- [ ] **STRIDE Status values** — Every threat row's Status column uses exactly one of: `Open`, `Mitigated`, `Platform`. No `Partial`, `N/A`, or other ad-hoc values.
- [ ] **A category labeled Abuse** — Search `2-stride-analysis.md` for `| Authorization |` as a STRIDE category label. FAIL if found. The "A" in STRIDE-A is always "Abuse" (business logic abuse, workflow manipulation, feature misuse), NEVER "Authorization". Also check N/A entries: `Authorization — N/A` is WRONG, must be `Abuse — N/A`.
- [ ] **STRIDE-Coverage Consistency** — For every threat ID, the STRIDE Status and Coverage table Status must agree:
  - STRIDE `Open` → Coverage `✅ Covered (FIND-XX)` (finding documents vulnerability needing remediation)
  - STRIDE `Mitigated` → Coverage `✅ Mitigated (FIND-XX)` (finding documents existing control the team built)
  - STRIDE `Platform` → Coverage `🔄 Mitigated by Platform`
  - If STRIDE says `Partial` but Coverage says `Mitigated by Platform` → **CONFLICT. Fix it.**
  - If STRIDE says `Open` but Coverage says `⚠️ Needs Review` → only valid if prerequisites ≠ `None`

### 1.6 `3-findings.md`

- [ ] **Organized by tier** using exactly: `## Tier 1 — Direct Exposure (No Prerequisites)`, `## Tier 2 — Conditional Risk (...)`, `## Tier 3 — Defense-in-Depth (...)`
- [ ] **NOT organized by severity** — no `## Critical Findings` or `## Important Findings` headings
- [ ] **Every finding** has ALL mandatory attributes: SDL Bugbar Severity, CVSS 4.0, CWE, OWASP (with `:2025` suffix), Exploitation Prerequisites, Exploitability Tier, Remediation Effort, Mitigation Type, Component, Related Threats
- [ ] **Mitigation Type valid values** — Every finding's `Mitigation Type` row is one of exactly: `Redesign`, `Standard Mitigation`, `Custom Mitigation`, `Existing Control`, `Accept Risk`, `Transfer Risk`. ❌ Abbreviated forms (`Custom`, `Accept`, `Standard`) or invented values → FAIL
- [ ] **SDL Severity valid values** — Every finding's severity is one of: `Critical`, `Important`, `Moderate`, `Low`. ❌ `High`, `Medium`, `Info` → FAIL
- [ ] **Remediation Effort valid values** — Every finding's effort is one of: `Low`, `Medium`, `High`. ❌ Time estimates, sprint labels → FAIL
- [ ] **CVSS 4.0 has full vector**: Every finding's CVSS value includes BOTH the numeric score AND the full vector string (e.g., `9.3 (CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N)`). Score-only is NOT acceptable.
- [ ] **CWE format**: Every CWE uses `CWE-NNN: Name` format (not just number)
- [ ] **OWASP format**: Every OWASP uses `A0N:2025` format (never `:2021`)
- [ ] **Related Threats** use individual links per threat ID: `[T01.S](2-stride-analysis.md#component-name)` — no grouped links like `[T01.S, T01.T](2-stride-analysis.md)`
- [ ] **Exploitation Prerequisites present** — Every `### FIND-` block has a row `| Exploitation Prerequisites |`
- [ ] **Component field present** — Every `### FIND-` block has a row `| Component |`
- [ ] **No Tier 1 with AV:L or PR:H** — For every Tier 1 finding, verify its CVSS vector does NOT contain `AV:L` or `PR:H`. If found → tier must be downgraded to T2/T3.
- [ ] **Tier-Prerequisite Consistency (MANDATORY)** — For EVERY finding and EVERY threat row, the tier MUST follow mechanically from the prerequisite using the canonical mapping:
  - `None` → T1 (only valid if component's Reachability = External AND Auth = No)
  - `Authenticated User`, `Privileged User`, `Internal Network`, `Local Process Access` → T2
  - `Host/OS Access`, `Admin Credentials`, `Physical Access`, `{Component} Compromise`, any `A + B` → T3
  - **⛔ FORBIDDEN values:** `Application Access`, `Host Access` → FAIL. Replace with `Local Process Access` (T2) or `Host/OS Access` (T3).
  - **Deployment context rule (Rule 20):** If Deployment Classification is `LOCALHOST_DESKTOP` or `LOCALHOST_SERVICE`, `None` is FORBIDDEN for all components. Fix prerequisite to `Local Process Access` or `Host/OS Access`, then derive tier.
  - **Exposure table cross-check:** For each finding, look up its Component in the Component Exposure Table. The finding's prerequisite MUST be ≥ the component's `Min Prerequisite`. The finding's tier MUST be ≥ the component's `Derived Tier`.
  - **Mismatch = FAIL.** Fix by adjusting prerequisites to match deployment evidence, then derive tier from prerequisite.
  - **Common violations:** `None` on a localhost-only component; `Application Access` (ambiguous); T1 with `Internal Network` prerequisite; T2 with `None` prerequisite.
- [ ] **Threat Coverage Verification table** present at end of file mapping every threat ID → finding ID with status
- [ ] **Coverage table valid statuses ONLY** — Every row in the Coverage table must use exactly one of these three statuses: `✅ Covered (FIND-XX)`, `✅ Mitigated (FIND-XX)`, or `🔄 Mitigated by Platform`. ❌ `⚠️ Accepted Risk` → FAIL (tool cannot accept risks). ❌ `⚠️ Needs Review` → FAIL (every threat must be resolved). ❌ `—` without a status → FAIL (unaccounted threat).
- [ ] **Mitigated vs Platform distinction** — For every `✅ Mitigated (FIND-XX)` entry: verify the finding documents an existing security control the engineering team built (auth middleware, TLS, input validation, file permissions). For every `🔄 Mitigated by Platform`: verify the mitigation is from a genuinely EXTERNAL system (Azure AD, K8s RBAC, TPM). If "Platform" describes THIS repo's code → reclassify as `✅ Mitigated` and create a finding.
- [ ] **Platform Mitigation Ratio Audit (MANDATORY)** — Count threats marked `🔄 Mitigated by Platform` vs total threats. If Platform > 20% → **WARNING: Likely overuse of Platform status.** For each Platform-mitigated threat, verify ALL three conditions: (1) mitigation is EXTERNAL to this repo's code, (2) managed by a different team, (3) cannot be disabled by modifying this code. Common violations: "auth middleware" (that's THIS code → should be `Mitigated`), "TLS on localhost" (THIS code → should be `Mitigated`), "file permissions" (THIS code → should be `Mitigated`).
- [ ] **Coverage Feedback Loop Verification** — After the Coverage table is written, verify: (1) every threat with STRIDE status `Open` has a corresponding finding in the table. (2) No `—` dashes without a status. (3) If gaps exist, new findings were created to fill them. The Coverage table is a FEEDBACK LOOP — its purpose is to catch missed findings and force their creation. If gaps remain after the table is written, the loop was not executed.
- [ ] **"Accepted Risk" in Coverage table** — Grep `3-findings.md` for `Accepted Risk`. ❌ Any match → FAIL. The tool does NOT have authority to accept risks. Every `Open` threat MUST have a finding. Every `Mitigated` threat MUST have a finding documenting the team's control.
- [ ] **"Needs Review" in Coverage table** — Grep `3-findings.md` for `Needs Review`. ❌ Any match → FAIL. "Needs Review" has been replaced: threats are either Covered (vulnerability), Mitigated (team built a control), or Platform (external system). There is no deferred category.

### 1.7 `0-assessment.md`

- [ ] **Section order**: Report Files → Executive Summary → Action Summary → Analysis Context & Assumptions → References Consulted → Report Metadata → Classification Reference (last)
- [ ] **Report Files section** is the very first section after the title
- [ ] **Risk Rating heading** has NO emojis: `### Risk Rating: Elevated` not `### Risk Rating: 🟠 Elevated`
- [ ] **Threat count context paragraph** present as blockquote at end of Executive Summary
- [ ] **No separate Recommendations section** — Action Summary IS the recommendations
- [ ] **Action Summary table** present with Tier, Description, Threats, Findings, Priority columns
- [ ] **Action Summary is the ONLY name**: No sections titled "Priority Remediation Roadmap", "Top Recommendations", "Key Recommendations", or "Risk Profile"
- [ ] **Quick Wins subsection** present (or explicitly omitted if no low-effort T1 findings)
- [ ] **Needs Verification section** present under Analysis Context & Assumptions
- [ ] **References Consulted** has two subsections: `### Security Standards` and `### Component Documentation`
- [ ] **References Consulted tables** use three columns with full URLs: `| Standard | URL | How Used |` and `| Component | Documentation URL | Relevant Section |` — NOT a flat `| Reference | Usage |` table
- [ ] **Finding Overrides** uses table format even when empty (never plain text)
- [ ] **Report Metadata** is the absolute last section before Classification Reference with all required fields
- [ ] **Metadata timestamps** came from actual command execution (not derived from folder names)
- [ ] **Model** field present — value matches the model being used (e.g., `Claude Opus 4.6`, `GPT-5.3 Codex`, `Gemini 3 Pro`)
- [ ] **Analysis Started** and **Analysis Completed** fields present with UTC timestamps from `Get-Date` commands
- [ ] **Duration** field present — computed from Analysis Started and Analysis Completed timestamps
- [ ] **Metadata values in backticks** — Every value cell in the Report Metadata table must be wrapped in backticks. Spot-check at least 5 rows.
- [ ] **Horizontal rules between sections** — Count lines matching `---` in the file. Must be ≥ 6 (one between each pair of the 7 `## ` sections).
- [ ] **Classification Reference is last section** — `## Classification Reference` present as the final `## ` heading. Contains a single 2-column table (`Classification | Values`) with rows for: Exploitability Tiers, STRIDE + Abuse, SDL Severity, Remediation Effort, Mitigation Type, Threat Status, CVSS, CWE, OWASP. ❌ Missing section or wrong format → FAIL.
- [ ] **Classification Reference is static** — Values in the table must match the skeleton EXACTLY (copied verbatim). No additional rows, no modified descriptions. Compare against `skeleton-assessment.md` Classification Reference section.
- [ ] **No forbidden section headings** — Search for: `Severity Distribution`, `Architecture Risk Areas`, `Methodology Notes`, `Deliverables`, `Priority Remediation Roadmap`, `Key Recommendations`, `Top Recommendations`. Must return 0 matches.
- [ ] **Action Summary tier priorities are FIXED** — In the Action Summary table of `0-assessment.md`, verify the Priority column: Tier 1 = `🔴 Critical Risk`, Tier 2 = `🟠 Elevated Risk`, Tier 3 = `🟡 Moderate Risk`. ❌ Tier 1 with Low/Moderate/Elevated → FAIL. ❌ Tier 2 with Critical/Low → FAIL. These are FIXED labels that never change regardless of threat/finding counts.
- [ ] **Action Summary has all 3 tiers** — The Action Summary table MUST have rows for Tier 1, Tier 2, AND Tier 3, even if a tier has 0 threats and 0 findings. Missing tiers → FAIL.

---

## Phase 2 — Diagram Rendering Checks

Run against ALL Mermaid blocks across all files. Can be delegated as a focused sub-task.

### 2.1 Init Blocks

- [ ] **Every flowchart** has `%%{init}%%` block with `'background': '#ffffff'` as the first line
- [ ] **Every sequence diagram** has the full `%%{init}%%` theme variables block with `'background': '#ffffff'`
- [ ] **NO custom color keys in themeVariables** — init block must NOT contain `primaryColor` (except `#ffffff`), `secondaryColor`, or `tertiaryColor`. All element colors come from classDef only.

### 2.2 Class Definitions & Color Palette

- [ ] **Every `classDef`** includes `color:#000000` (explicit black text)
- [ ] **DFD diagrams** use `process`/`external`/`datastore` class names
- [ ] **Architecture diagrams** use `service`/`external`/`datastore` class names
- [ ] **EXACT hex codes used** — grep all `#[0-9a-fA-F]{6}` values in `.mmd` files. The ONLY allowed fill colors are: `#6baed6`, `#fdae61`, `#74c476`, `#ffffff`, `#000000`. The ONLY allowed stroke colors are: `#2171b5`, `#d94701`, `#238b45`, `#e31a1c`, `#666666`. If ANY other hex color appears (e.g., `#4299E1`, `#48BB78`, `#E53E3E`, `#2B6CB0`), the diagram FAILS this check.

### 2.3 Styling

- [ ] **Every flowchart** has `linkStyle default stroke:#666666,stroke-width:2px`
- [ ] **Trust boundary styles** use `stroke:#e31a1c,stroke-width:3px` (NOT `#ff0000` or `stroke-width:2px`)
- [ ] **Architecture layer styles** use light fills with matching borders (not red dashed trust boundaries)

### 2.4 Syntax Validation

- [ ] **All labels quoted**: `["Name"]`, `(("Name"))`, `[("Name")]`, `-->|"Label"|`, `subgraph ID["Title"]`
- [ ] **Subgraph/end pairs matched**: Every `subgraph` has a closing `end`
- [ ] **No stray characters** or unclosed quotes in any Mermaid block

### 2.5 Kubernetes Sidecar Rules

Skip this section if the target system is NOT deployed on Kubernetes.

- [ ] **Every K8s service node** annotated with sidecars: `<br/>+ SidecarName` in the node label
- [ ] **Zero standalone sidecar nodes**: Search all diagrams for nodes named `MISE`, `Dapr`, `Envoy`, `Istio`, `Sidecar` — these must NOT exist as separate nodes
- [ ] **Zero intra-pod localhost flows**: No arrows between a container and its sidecars (no `-->|"localhost"` patterns)
- [ ] **Cross-boundary sidecar flows originate from host container**: All arrows to external targets (Azure AD, Redis, etc.) come from the host container node, not from a standalone sidecar node
- [ ] **Element Table**: No separate rows for sidecars — described in host container's description column

---

## Phase 3 — Cross-File Consistency Checks

These checks validate relationships between files. They require reading multiple files together.

### 3.1 Component Coverage (Architecture → STRIDE → Findings)

- [ ] **Every component** in `0.1-architecture.md` Key Components table has a corresponding `## Component` section in `2-stride-analysis.md`
- [ ] **Every element** in the `1-threatmodel.md` Element Table that is a Process has a corresponding `## Component` section in `2-stride-analysis.md`
- [ ] **No orphaned components** in `2-stride-analysis.md` that don't appear in the Element Table
- [ ] **Summary table component count** matches the number of `## Component` sections in the file
- [ ] **Component count exact match** — Count rows in `0.1-architecture.md` Key Components table (excluding header/separator). Count `## ` component sections in `2-stride-analysis.md` (excluding `## Exploitability Tiers`, `## Summary`). These counts MUST be equal.

### 3.2 Data Flow Coverage (STRIDE ↔ DFD)

- [ ] **Every Data Flow ID** (`DF01`, `DF02`, ...) from the `1-threatmodel.md` Data Flow Table appears in at least one "Affected Flow" cell in `2-stride-analysis.md`
- [ ] **No orphaned flow IDs** in STRIDE analysis that aren't defined in the Data Flow Table

### 3.3 Threat-to-Finding Traceability (STRIDE ↔ Findings)

This is the most critical cross-file check. It ensures no identified threat is silently dropped.

- [ ] **Every threat ID** in `2-stride-analysis.md` (e.g., T01.S, T01.T1, T02.I) is referenced by at least one finding in `3-findings.md` via its Related Threats field
- [ ] **Collect all threat IDs** from all tier tables in `2-stride-analysis.md`
- [ ] **Collect all threat IDs** referenced in Related Threats fields in `3-findings.md`
- [ ] **Coverage gap report**: List any threat ID present in STRIDE but missing from findings. If gaps exist → either add a finding or group the threat into an existing related finding

### 3.4 Finding-to-STRIDE Anchor Integrity (Findings → STRIDE)

- [ ] **Every Related Threats link** in `3-findings.md` uses format `[ThreatID](2-stride-analysis.md#component-anchor)`
- [ ] **Every `#component-anchor`** resolves to an actual `## Heading` in `2-stride-analysis.md`
- [ ] **Anchor construction verified**: heading → lowercase → spaces to hyphens → strip non-alphanumeric except hyphens
- [ ] **Spot-check at least 3 anchors** by following the link and confirming the threat ID exists under that heading

### 3.5 Count Consistency (Assessment ↔ All Files)

- [ ] **Element count** in Executive Summary matches actual Element Table row count in `1-threatmodel.md`
- [ ] **Finding count** in Executive Summary matches actual finding count in `3-findings.md`
- [ ] **Threat count** in Executive Summary matches Total from summary table in `2-stride-analysis.md`
- [ ] **Tier counts** in threat count context paragraph match actual T1/T2/T3 totals from `2-stride-analysis.md`
- [ ] **Action Summary tier table** counts match actual per-tier counts from `3-findings.md` (findings column) and `2-stride-analysis.md` (threats column)

**Verification methods for count checks:**
- Element count: count `|` rows in Element Table of `1-threatmodel.md`, subtract 2 (header + separator)
- Finding count: count `### FIND-` headings in `3-findings.md`
- Threat count: read the Totals row in `2-stride-analysis.md` Summary table, take the `Total` column value
- Tier counts: from same Totals row, take T1, T2, T3 column values

### 3.6 STRIDE Summary Table Arithmetic

- [ ] **Per-row**: S + T + R + I + D + E + A = Total for every component
- [ ] **Per-row**: T1 + T2 + T3 = Total for every component
- [ ] **Totals row**: Each column sum across all component rows equals the Totals row value
- [ ] **Row count cross-check**: Number of threat rows in each component's detail tables equals its Total in the summary table
- [ ] **No artificial all-1s pattern**: Check the Summary table for the pattern where every STRIDE column (S,T,R,I,D,E,A) is exactly 1 for every component. If ALL components have exactly 1 threat in every STRIDE category → FAIL (indicates formulaic "minimum 1 per category" inflation rather than genuine analysis). A valid analysis should have varying counts per category reflecting actual attack surface: some categories may be 0 (with N/A justification), others 2-3. Uniform 1s across all components is a strong signal of artificial padding.
- [ ] **N/A entries excluded from totals**: If any component has `N/A — {justification}` entries for STRIDE categories, verify those categories show 0 in the Summary table (not 1). N/A entries do NOT count as threats.

### 3.7 Sort Order (Findings)

- [ ] **Within each tier section**: Findings appear in order Critical → Important → Moderate → Low
- [ ] **Within each severity band**: Higher-CVSS findings appear before lower-CVSS findings
- [ ] **No misordering**: Scan sequentially and confirm no reversal

### 3.8 Report Files Table (Assessment ↔ Output Folder)

- [ ] **Every file listed** in the Report Files table of `0-assessment.md` exists in the output folder
- [ ] **`0.1-architecture.md` is listed** in the Report Files table
- [ ] **If `1.2-threatmodel-summary.mmd` was not generated**: it is omitted from the Report Files table (not listed with a "N/A" note)

---

## Phase 4 — Evidence Quality Checks

These checks validate the substance of findings, not just structure. Ideally run by a sub-agent with code access.

### 4.1 Finding Evidence

- [ ] **Every finding** has an Evidence section citing specific files/lines/configs
- [ ] **Evidence is concrete**: Shows actual code or config, not just "absence of config"
- [ ] **For "missing security" claims**: Evidence proves the platform default is insecure (not just that explicit config is absent)

### 4.2 Verify-Before-Flagging Compliance

- [ ] **Security infrastructure inventory** was performed before STRIDE analysis (check for platform security defaults verification in findings)
- [ ] **No false positive patterns**: No finding claims "missing mTLS" when Dapr Sentry is present, or "missing RBAC" on K8s ≥1.6, etc.
- [ ] **Finding classification applied**: Every documented finding is "Confirmed" (not "Needs Verification" — those belong in `0-assessment.md`)

### 4.3 Needs Verification Placement

- [ ] **All "Needs Verification" items** are in `0-assessment.md` under Analysis Context & Assumptions — NOT in `3-findings.md`
- [ ] **No ambiguous findings**: Findings in `3-findings.md` have positive evidence of a vulnerability

---

## Verification Summary Template

After running all checks, produce a summary.

Sub-agent output MUST include:
- Phase name
- Total checks, Passed, Failed
- For each failure: Check ID, file, evidence, exact fix instruction
- Re-run status after fixes

Do not return "looks good" without counts.

```markdown
## Verification Results

| Phase | Checks | Passed | Failed | Notes |
|-------|--------|--------|--------|-------|
| 0 — Common Deviation Scan | [N] | [N] | [N] | [pattern matches] |
| 1 — Per-File Structural | [N] | [N] | [N] | [files with issues] |
| 2 — Diagram Rendering | [N] | [N] | [N] | [specific failures] |
| 3 — Cross-File Consistency | [N] | [N] | [N] | [gaps found] |
| 4 — Evidence Quality | [N] | [N] | [N] | [false positive risks] |
| 5 — JSON Schema | [N] | [N] | [N] | [schema issues] |

### Failed Checks Detail
<!-- For each failed check, list: check ID, file(s), what's wrong, suggested fix -->
```

---

## Phase 5 — threat-inventory.json Schema Validation

These checks validate the JSON inventory file generated in Step 8b. This file is critical for comparison mode.

### 5.1 Schema Fields

- [ ] **`schema_version` field** — Present and equals `"1.0"` (standalone) or `"1.1"` (incremental). If the report contains `"incremental": true`, schema_version MUST be `"1.1"`. Otherwise `"1.0"`.
- [ ] **`commit` field** — Present (short SHA or `"Unknown"`)
- [ ] **`components` array** — Non-empty, has at least 1 entry
- [ ] **Component IDs** — Every component has `id` (PascalCase), `display`, `type`, `boundary`
- [ ] **Component field name compliance** — Components use `"display"` (NOT `"display_name"`). Grep: `"display_name"` must return 0 matches.
- [ ] **Threat field name compliance** — Threats use `"stride_category"` (NOT `"category"`). Threats have BOTH `"title"` AND `"description"` (NOT just `description` alone, NOT `"name"`). Threat→component link is inside `"identity_key"."component_id"` (NOT a top-level `"component_id"` on the threat object). Grep: top-level `"category":` outside identity_key must return 0 matches. Grep: every threat object must contain `"title":`.
- [ ] **`boundaries` array** — Present (can be empty for flat systems)
- [ ] **`flows` array** — Present, each flow has canonical ID format `DF_{Source}_to_{Target}`
- [ ] **`threats` array** — Non-empty
- [ ] **`findings` array** — Non-empty
- [ ] **`metrics` object** — Present with `total_components`, `total_threats`, `total_findings`

### 5.2 Metrics Consistency

- [ ] **`metrics.total_components == components.length`** — Array length matches count
- [ ] **`metrics.total_threats == threats.length`** — Array length matches count
- [ ] **`metrics.total_findings == findings.length`** — Array length matches count
- [ ] **Metrics match markdown reports** — `total_threats` equals Total from STRIDE summary table, `total_findings` equals `### FIND-` count in `3-findings.md`
- [ ] **Truncation recovery gate** — If ANY array length mismatch was detected above, verify that the file was regenerated (not patched). Check: file size > 10KB for repos with >40 threats; threats array has entries for EVERY component that appears in `2-stride-analysis.md`
- [ ] **Pre-write strategy compliance** — If `metrics.total_threats > 50`, verify that the JSON was written via sub-agent delegation, Python script, or chunked append — NOT a single `create_file` call. Evidence: check log for `agent` invocation or `_extract.py` script or multiple `replace_string_in_file` operations on the JSON file.

### 5.3 Deterministic Identity Stability (for comparison readiness)

- [ ] **Components include deterministic identity fields** — every component has `aliases` (array), `boundary_kind`, and `fingerprint`
- [ ] **`boundary_kind` valid values** — every component's `boundary_kind` is one of: `MachineBoundary`, `NetworkBoundary`, `ClusterBoundary`, `ProcessBoundary`, `PrivilegeBoundary`, `SandboxBoundary`. ❌ Any other value (e.g., `DataStorage`, `ApplicationCore`, `deployment`, `trust`) → FAIL
- [ ] **Boundaries include deterministic identity fields** — every boundary has `kind`, `aliases` (array), and `contains_fingerprint`
- [ ] **Boundary `kind` valid values** — every boundary's `kind` is one of the same 6 TMT-aligned values as `boundary_kind`. ❌ Any other value → FAIL
- [ ] **No duplicate canonical component IDs** — `components[].id` values are unique after normalization
- [ ] **Alias mapping is coherent** — no alias appears under two unrelated component IDs in the same inventory
- [ ] **Fingerprint evidence fields are stable-only** — `fingerprint` uses source files/topology/type/protocols, not freeform prose
- [ ] **Deterministic ordering applied** — arrays sorted by canonical key (`components.id`, `boundaries.id`, `flows.id`, `threats.id`, `findings.id`)

### 5.4 Comparison Drift Guardrails (when validating comparison outputs)

- [ ] **High-confidence rename candidates are not left as add/remove** — component pairs with strong alias/source-file/topology overlap are classified as `renamed`/`modified`
- [ ] **Boundary rename candidates use containment overlap** — same `kind` + high `contains` overlap are classified as boundary `renamed`, not `added` + `removed`
- [ ] **Split/merge boundary transitions recognized** — one-to-many and many-to-one containment transitions are mapped to `split`/`merged` categories

### 5.5 Comparison Integrity Checks (when validating comparison outputs)

- [ ] **Baseline ≠ Current commit** — `metadata.json` → `baseline.commit` must differ from `current.commit`. Same-commit comparisons are invalid (zero real code changes to compare).
- [ ] **Files changed > 0** — `metadata.json` → `git_diff_stats.files_changed` must be > 0. A comparison with 0 files changed has no code delta and is meaningless.
- [ ] **Duration > 0** — `metadata.json` → `duration` must NOT be `"0m 0s"` or any value under 2 minutes. A genuine comparison requires reading two inventories, performing multi-signal matching, computing heatmaps, and generating HTML — this takes real time.
- [ ] **No external folder references** — `metadata.json` and all output files must NOT contain references to `D:\One\tm` or any folder outside the repository being analyzed. Reports should only reference folders within the current repo.
- [ ] **Anti-reuse verification** — The comparison output must be freshly generated, not copied from a prior `threat-model-compare-*` folder. Verify by checking that `metadata.json` timestamps are from the current run.
- [ ] **Methodology drift ratio** — If `diff-result.json` → `metrics.methodology_drift_ratio` > 0.50, verify the HTML report contains a methodology drift warning banner. If ratio not computed but >50% of component renames share the same aliases/fingerprints, flag as validation failure.

---

## Phase 6 — Deterministic Identity & Naming Stability

These checks validate that component/boundary/flow naming follows deterministic rules, enabling reproducible outputs across independent runs of the same code.

### 6.1 Component ID Determinism

- [ ] **Component IDs derived from code artifacts** — Every component ID in `threat-inventory.json` must trace to an actual class name, file path, deployment manifest `metadata.name`, or config key. No abstract concepts (`ConfigurationStore`, `DataLayer`, `LocalFileSystem`). Grep component IDs against source file names and class names — at least 80% should have a direct match.
- [ ] **Component anchor verification** — Every process-type component in `threat-inventory.json` must have non-empty `fingerprint.source_files` or `fingerprint.source_directories`. If both are empty → FAIL (component has no code anchor).
- [ ] **Helm/K8s workload naming** — For K8s-deployed components, verify the component ID matches the `metadata.name` from the Deployment/StatefulSet YAML, not the Helm template filename or directory. Example: `DevPortal` (from deployment name), NOT `templates-knowledge-deployment` (from file path).
- [ ] **External service anchoring** — External services (no source code in repo) must anchor to their integration point: client class name, config key, or SDK dependency. Verify `fingerprint.config_keys` or `fingerprint.class_names` is populated.
- [ ] **Forbidden naming patterns absent** — No component ID is a generic label: grep for `ConfigurationStore`, `DataLayer`, `LocalFileSystem`, `SecurityModule`, `NetworkLayer`, `DatabaseAccess`. → Must return 0 matches.
- [ ] **Acronym consistency** — Well-known acronyms must be ALL-CAPS in PascalCase IDs: `API`, `NFS`, `LLM`, `SQL`, `DB`, `AD`, `UI`. Grep for `Api` (should be `API`), `Nfs` (should be `NFS`), `Llm` (should be `LLM`). → Must return 0 matches.
- [ ] **Common technology naming exactness** — Verify these exact IDs where applicable: `Redis` (not `RedisCache`), `Milvus` (not `MilvusDB`), `NginxIngress` (not `IngressNginx`), `AzureAD` (not `AzureAd`), `PostgreSQL` (not `Postgres`).

### 6.2 Boundary Naming Stability

- [ ] **Boundary IDs are PascalCase** — Every boundary ID in `threat-inventory.json` uses PascalCase derived from deployment topology (e.g., `K8sCluster`, `External`, `Application`). NOT code architecture layers (`PresentationLayer`, `BusinessLogic`).
- [ ] **No code-layer boundaries for single-process apps** — If the system is a single process (one .exe, one container), there should be exactly 1 `Application` boundary — NOT 4+ boundaries for Presentation/Business/Data layers. Count boundaries and verify proportion.
- [ ] **K8s multi-service sub-boundaries** — For K8s namespaces with multiple Deployments, verify sub-boundaries exist: `BackendServices`, `DataStorage`, `MLModels`, `Agentic` (as applicable).

### 6.3 Data Flow Completeness

- [ ] **Bidirectional flows for ingress/reverse proxy** — If an ingress component (Nginx, Traefik) routes to backends, verify BOTH directions exist: `DF_Ingress_to_Backend` AND `DF_Backend_to_Ingress`. Count forward flows through ingress and verify matching response flows.
- [ ] **Bidirectional flows for databases** — For every `DF_Service_to_Datastore` flow, verify a corresponding `DF_Datastore_to_Service` read flow exists. Datastores: Redis, Milvus, PostgreSQL, MongoDB, etc.
- [ ] **Flow count stability** — Count flows in `threat-inventory.json`. Two independent runs on same code should produce same count (±3 acceptable). If flow count differs by >5 between old and HEAD analyses for unchanged components, flag as naming drift.

### 6.4 Count Stability (Cross-Run Determinism)

- [ ] **Component count within tolerance** — If comparing two analyses of the same code, component count must be within ±1. Difference ≥3 = FAIL.
- [ ] **Boundary count within tolerance** — Same code → boundary count within ±1.
- [ ] **Fingerprint completeness for process components** — Every component with `type: "process"` must have non-empty `fingerprint.source_directories` and `fingerprint.class_names`. Empty arrays for process components → FAIL.
- [ ] **STRIDE category single-letter enforcement** — Every `threats[].stride_category` in JSON is exactly one letter: S, T, R, I, D, E, or A. Grep for full names (`"Spoofing"`, `"Tampering"`, `"Denial of Service"`) → Must return 0 matches. This prevents heatmap computation errors.

---

## Phase 7 — Evidence-Based Prerequisites & Coverage Completeness

These checks validate that prerequisites, tiers, and coverage follow deterministic evidence-based rules.

### 7.1 Prerequisite Determination Evidence

- [ ] **No prerequisite without deployment evidence** — For every finding with `Exploitation Prerequisites` ≠ `None`, verify the prerequisite reflects actual deployment config (Helm values, Dockerfile, service type, ingress rules). If prerequisite says `Internal Network` but no evidence of network restriction exists → FAIL.
- [ ] **Prerequisite consistency across same code** — If two analyses of the same code produce different prerequisites for the same vulnerability, the skill rules are insufficient. Flag for investigation.

### 7.1b Deployment Classification Gate (MANDATORY)

- [ ] **Deployment Classification present** — `0.1-architecture.md` must contain a `**Deployment Classification:**` line with one of: `LOCALHOST_DESKTOP`, `LOCALHOST_SERVICE`, `AIRGAPPED`, `K8S_SERVICE`, `NETWORK_SERVICE`. ❌ Missing → FAIL.
- [ ] **Component Exposure Table present** — `0.1-architecture.md` must contain a `### Component Exposure Table` with columns: Component, Listens On, Auth Required, Reachability, Min Prerequisite, Derived Tier. ❌ Missing → FAIL.
- [ ] **Exposure table completeness** — Every component in Key Components table has a corresponding row in the Component Exposure Table. ❌ Missing rows → FAIL.
- [ ] **Deployment classification enforced on T1** — If Deployment Classification is `LOCALHOST_DESKTOP` or `LOCALHOST_SERVICE`:
  - Count findings with `Exploitation Prerequisites` = `None`. ❌ Count > 0 → FAIL (must be `Local Process Access` or `Host/OS Access` minimum).
  - Count findings in `## Tier 1`. ❌ Count > 0 → FAIL (must be T2+ for localhost/desktop apps).
  - For each finding with `AV:N` in CVSS, check the component's `Reachability` column. ❌ `AV:N` with `Reachability ≠ External` → FAIL.
- [ ] **Prerequisite floor enforced** — For EVERY finding, look up the finding's `Component` in the exposure table. The finding's `Exploitation Prerequisites` must be ≥ the `Min Prerequisite` in the table. The finding's tier must be ≥ the `Derived Tier`. ❌ Finding has `None` but table says `Local Process Access` → FAIL.
- [ ] **Prerequisite basis in Evidence** — Every finding's `#### Evidence` section must contain a `**Prerequisite basis:**` line citing specific code/config that determines the prerequisite. ❌ Missing or generic ("found in codebase") → FAIL.

### 7.2 Coverage Completeness

- [ ] **Technology coverage check** — For each major technology in the repo (Redis, PostgreSQL, Docker, K8s, ML/LLM, NFS, etc.), verify at least one finding or documented mitigation addresses it. Scan `0.1-architecture.md` Technology Stack table → for each technology, grep `3-findings.md` for a matching finding.
- [ ] **Minimum finding threshold** — Small repo (<20 files): ≥8 findings; Medium (20-100): ≥12; Large (100+): ≥18. Count `### FIND-` headings and verify against repo size.
- [ ] **Platform ratio within context-aware limit** — Detect deployment pattern: if go.mod contains `controller-runtime`/`kubebuilder`/`operator-sdk` → K8s Operator (limit ≤35%); otherwise → Standalone App (limit ≤20%). Count Platform-status threats / total threats. If exceeds limit → FAIL. Document detected pattern in assessment.
- [ ] **DoS with None prerequisites = Finding** — Every DoS threat (`.D`) with `Prerequisites: None` must have a corresponding finding. Grep STRIDE analysis for `.D` threats with None prerequisites and verify each maps to a finding ID in Coverage table.

### 7.3 Security Infrastructure Awareness

- [ ] **Security infrastructure inventory mentioned** — Verify `0.1-architecture.md` or `2-stride-analysis.md` references security components (service mesh, cert management, auth middleware) if they exist in the codebase. If Dapr Sentry is deployed, mTLS cannot be flagged as "missing."
- [ ] **Burden of proof for missing-security claims** — Every finding that claims "missing X" must prove the platform default is insecure, not just that explicit config is absent. Spot-check the highest-severity "missing" finding.

---

## Phase 8 — Comparison HTML Report Structure (comparison outputs only)

These checks validate the HTML comparison report structure.

### 8.1 HTML Comparison Report Structure

- [ ] **Exactly 4 `<h2>` sections** — The HTML must have exactly these `<h2>` headings in order: "Executive Summary", "Threat Tier Distribution", "STRIDE-A Heatmap (with Delta Indicators)", "Comparison Basis — Component Mapping". ❌ Extra sections like "Overall Risk Shift", "Key Delta Metrics", "Metrics Overview", "Findings Diff" as `<h2>` → FAIL (these are either inline elements or removed). ❌ Missing any of the 4 → FAIL.
- [ ] **No Findings Diff section** — The HTML must NOT contain a "Findings Diff" `<h2>` section or any findings diff subsections (Fixed, Removed, Analysis Gaps, New, Changed, Unchanged). If present → FAIL.
- [ ] **No delta metric cards** — The HTML must NOT contain `.risk-delta` cards (Findings Fixed, New Findings, Net Change, Removed, Analysis Gaps, Code-Verified). If present → FAIL.
- [ ] **Risk shift and metrics bar as inline elements** — Risk shift and metrics bar (Components/Threats/Boundaries/Flows/Time) are inline card elements, NOT `<h2>` sections. If they appear as `<h2>` → FAIL.
- [ ] **Metrics bar includes trust boundaries** — The metrics bar MUST show trust boundary counts (e.g., `2 → 2`). If boundaries are missing from the metrics bar → FAIL. Components, Threats, Trust Boundaries, Findings, and Code Changes are the 5 required metric boxes.
- [ ] **Metrics bar 5th box is Code Changes** — The 5th metrics box MUST show commit count and PR count (e.g., `142 commits, 23 PRs`). ❌ "Time Between" → FAIL. The duration/dates are now in the comparison cards (Section 1), not the metrics bar.
- [ ] **Comparison cards structure** — Section 1 MUST contain a `comparison-cards` div with 3 sub-cards: Baseline (hash, date, rating), Target (hash, date, rating), Trend (direction, duration). ❌ Old-style `subtitle` div with `Baseline: SHA → Target: SHA` → FAIL. ❌ Separate `risk-shift` div → FAIL (merged into comparison cards).
- [ ] **No duplicate status indicators** — Status information (Fixed/New/Previously Unidentified counts) MUST appear in ONLY ONE place: the colored status summary cards. They MUST NOT also appear as small inline badges or text in the metrics bar. If the same counts appear in both the metrics bar AND colored cards → FAIL (remove from metrics bar, keep colored cards).
- [ ] **Tier labels match analysis reports** — The Threat Tier Distribution section in the HTML must use EXACTLY these labels: "Tier 1 — Direct Exposure", "Tier 2 — Conditional Risk", "Tier 3 — Defense-in-Depth". ❌ "Probable Exposure", "Theoretical", "High Risk", or any invented variant → FAIL.
- [ ] **Section title is "Comparison Basis" not "Architecture Changes"** — The component mapping section must be titled "Comparison Basis — Component Mapping", NOT "Architecture Changes".
- [ ] **Heatmap has 13 columns** — The STRIDE-A heatmap grid must have: Component | S | T | R | I | D | E | A | Total | divider | T1 | T2 | T3. If T1/T2/T3 columns are missing → FAIL. The heatmap title must include "(with Delta Indicators)".

### 8.2 Heatmap Accuracy (comparison outputs)

- [ ] **Heatmap not all zeros** — Sum all `baseline.Total` and `current.Total` in `stride_heatmap.components`. If either sum is 0 but corresponding inventory has threats → FAIL (heatmap computation bug).
- [ ] **No duplicate renamed component rows** — For every entry in `components_diff.renamed`, verify the heatmap has exactly ONE row for the renamed component (using current name), not TWO rows (one all-zero baseline, one all-zero current).
- [ ] **Heatmap anomaly detection executed** — For every heatmap row with `baseline.Total > 0, current.Total == 0` (disappeared) and every row with `baseline.Total == 0, current.Total > 0` (appeared): verify that fingerprint cross-checking was performed. If a disappeared-appeared pair shares source files, class names, or namespace → it's a missed rename and must be reclassified. The heatmap should NOT have matching all-zero/all-new pairs with shared source files.
- [ ] **Comparison confidence score present** — `diff-result.json` must contain `comparison_confidence` field ("high" or "low"). If more than 3 unresolved heatmap anomalies exist → confidence must be "low" with warning banner in HTML.
- [ ] **Per-component STRIDE arithmetic** — For each heatmap row: `S+T+R+I+D+E+A == Total` AND `T1+T2+T3 == Total` for both baseline and current. Any mismatch → FAIL.
- [ ] **Delta arrows match JSON data** — For each heatmap cell, `delta = current - baseline`. If delta == 0, no arrow. If delta > 0, ▲. If delta < 0, ▼. Spot-check at least 3 components.
- [ ] **Component removal source file verification** — For every component in `components_diff.removed`, verify its `source_files` are genuinely absent from the current commit. If source files still exist → reclassify as renamed or methodology gap.
