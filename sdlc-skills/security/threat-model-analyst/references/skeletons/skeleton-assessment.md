# Skeleton: 0-assessment.md

> **⛔ Copy the template content below VERBATIM (excluding the outer code fence). Replace `[FILL]` placeholders. Do NOT add/rename/reorder sections.**
> `[FILL]` = single value | `[FILL-PROSE]` = paragraphs | `[REPEAT]...[END-REPEAT]` = N copies | `[CONDITIONAL]...[END-CONDITIONAL]` = include if condition met

---

```markdown
# Security Assessment

---

## Report Files

| File | Description |
|------|-------------|
| [0-assessment.md](0-assessment.md) | This document — executive summary, risk rating, action plan, metadata |
| [0.1-architecture.md](0.1-architecture.md) | Architecture overview, components, scenarios, tech stack |
| [1-threatmodel.md](1-threatmodel.md) | Threat model DFD diagram with element, flow, and boundary tables |
| [1.1-threatmodel.mmd](1.1-threatmodel.mmd) | Pure Mermaid DFD source file |
| [2-stride-analysis.md](2-stride-analysis.md) | Full STRIDE-A analysis for all components |
| [3-findings.md](3-findings.md) | Prioritized security findings with remediation |
[CONDITIONAL: Include if 1.2-threatmodel-summary.mmd was generated]
| [1.2-threatmodel-summary.mmd](1.2-threatmodel-summary.mmd) | Summary DFD for large systems |
[END-CONDITIONAL]
[CONDITIONAL: Include for incremental analysis]
| [incremental-comparison.html](incremental-comparison.html) | Visual comparison report |
[END-CONDITIONAL]

<!-- ⛔ POST-TABLE CHECK: Verify Report Files:
  1. `0-assessment.md` is the FIRST row (not 0.1-architecture.md)
  2. All generated files are listed
  3. Conditional rows (1.2-threatmodel-summary.mmd, incremental-comparison.html) only if those files exist
  If ANY check fails → FIX NOW. -->

---

## Executive Summary

[FILL-PROSE: 2-3 paragraph summary of the system and its security posture]

[FILL: "The analysis covers [N] system elements across [M] trust boundaries."]

### Risk Rating: [FILL: Critical / Elevated / Moderate / Low]

[FILL-PROSE: risk rating justification paragraph]

> **Note on threat counts:** This analysis identified [FILL: N] threats across [FILL: M] components. This count reflects comprehensive STRIDE-A coverage, not systemic insecurity. Of these, **[FILL: T1 count] are directly exploitable** without prerequisites (Tier 1). The remaining [FILL: T2+T3 count] represent conditional risks and defense-in-depth considerations.

<!-- ⛔ POST-SECTION CHECK: Verify Executive Summary:
  1. Risk Rating heading has NO emojis: `### Risk Rating: Elevated` not `### Risk Rating: 🟠 Elevated`
  2. Note on threat counts blockquote is present
  3. Element count and boundary count match actual counts from 1-threatmodel.md
  If ANY check fails → FIX NOW. -->

---

## Action Summary

| Tier | Description | Threats | Findings | Priority |
|------|-------------|---------|----------|----------|
| [Tier 1](3-findings.md#tier-1--direct-exposure-no-prerequisites) | Directly exploitable | [FILL] | [FILL] | 🔴 Critical Risk |
| [Tier 2](3-findings.md#tier-2--conditional-risk-authenticated--single-prerequisite) | Requires authenticated access | [FILL] | [FILL] | 🟠 Elevated Risk |
| [Tier 3](3-findings.md#tier-3--defense-in-depth-prior-compromise--host-access) | Requires prior compromise | [FILL] | [FILL] | 🟡 Moderate Risk |
| **Total** | | **[FILL]** | **[FILL]** | |

<!-- ⛔ POST-TABLE CHECK: Verify Action Summary:
  1. EXACTLY 4 data rows: Tier 1, Tier 2, Tier 3, Total — NO 'Mitigated', 'Platform', or 'Fixed' rows
  2. Priority column is FIXED: Tier 1=🔴 Critical Risk, Tier 2=🟠 Elevated Risk, Tier 3=🟡 Moderate Risk — never changed based on counts
  3. Threats column sums match 2-stride-analysis.md Totals row
  4. Findings column sums match 3-findings.md FIND- heading count
  5. Tier 1/2/3 cells are hyperlinks to 3-findings.md tier headings — verify anchors resolve
  If ANY check fails → FIX NOW before continuing. -->

### Priority by Tier and CVSS Score (Top 10)

| Finding | Tier | CVSS Score | SDL Severity | Title |
|---------|------|------------|-------------|-------|
[REPEAT: top 10 findings only, sorted by Tier (T1 first, then T2, then T3), then by CVSS score descending within each tier]
| [FIND-XX](3-findings.md#find-xx-title-slug) | T[FILL] | [FILL] | [FILL] | [FILL] |
[END-REPEAT]

<!-- ⛔ POST-TABLE CHECK: Verify Priority by Tier and CVSS Score:
  1. Maximum 10 rows (top 10 findings only, not all findings)
  2. Sort order: ALL Tier 1 findings first (by CVSS desc), then Tier 2 (by CVSS desc), then Tier 3 (by CVSS desc)
  3. Every Finding cell is a hyperlink: [FIND-XX](3-findings.md#find-xx-title-slug)
  4. Verify each hyperlink anchor resolves: compute the anchor from the ACTUAL heading text in 3-findings.md (lowercase, spaces→hyphens, strip special chars). The link must match whatever the heading is.
  5. CVSS scores match the actual finding's CVSS value in 3-findings.md
  If ANY check fails → FIX NOW. -->

### Quick Wins

<!-- Quick Wins Finding column: each Finding cell MUST be a hyperlink to 3-findings.md, same format as Priority table:
  [FIND-XX](3-findings.md#find-xx-title-slug)
  Compute the anchor from the ACTUAL heading text in 3-findings.md. -->

| Finding | Title | Why Quick |
|---------|-------|-----------|
[REPEAT]
| [FIND-XX](3-findings.md#find-xx-title-slug) | [FILL] | [FILL] |
[END-REPEAT]

---

[CONDITIONAL: Include ONLY for incremental analysis]

## Change Summary

### Component Changes
| Status | Count | Components |
|--------|-------|------------|
| Unchanged | [FILL] | [FILL] |
| Modified | [FILL] | [FILL] |
| New | [FILL] | [FILL] |
| Removed | [FILL] | [FILL] |

### Threat Status
| Status | Count |
|--------|-------|
| Existing | [FILL] |
| Fixed | [FILL] |
| New | [FILL] |
| Removed | [FILL] |

### Finding Status
| Status | Count |
|--------|-------|
| Existing | [FILL] |
| Fixed | [FILL] |
| Partial | [FILL] |
| New | [FILL] |
| Removed | [FILL] |

### Risk Direction

[FILL: Improving / Worsening / Stable] — [FILL-PROSE: 1-2 sentence justification]

---

## Previously Unidentified Issues

[FILL-PROSE: or "No previously unidentified issues found."]

| Finding | Title | Component | Evidence |
|---------|-------|-----------|----------|
[REPEAT]
| [FILL] | [FILL] | [FILL] | [FILL] |
[END-REPEAT]

[END-CONDITIONAL]

---

## Analysis Context & Assumptions

### Analysis Scope
| Constraint | Description |
|------------|-------------|
| Scope | [FILL] |
| Excluded | [FILL] |
| Focus Areas | [FILL] |

### Infrastructure Context
| Category | Discovered from Codebase | Findings Affected |
|----------|--------------------------|-------------------|
[REPEAT]
| [FILL] | [FILL: include relative file links] | [FILL] |
[END-REPEAT]

### Needs Verification
| Item | Question | What to Check | Why Uncertain |
|------|----------|---------------|---------------|
[REPEAT]
| [FILL] | [FILL] | [FILL] | [FILL] |
[END-REPEAT]

### Finding Overrides
| Finding ID | Original Severity | Override | Justification | New Status |
|------------|-------------------|----------|---------------|------------|
| — | — | — | No overrides applied. Update this section after review. | — |

### Additional Notes

[FILL-PROSE: or "No additional notes."]

---

## References Consulted

### Security Standards
| Standard | URL | How Used |
|----------|-----|----------|
| Microsoft SDL Bug Bar | https://www.microsoft.com/en-us/msrc/sdlbugbar | Severity classification |
| OWASP Top 10:2025 | https://owasp.org/Top10/2025/ | Threat categorization |
| CVSS 4.0 | https://www.first.org/cvss/v4.0/specification-document | Risk scoring |
| CWE | https://cwe.mitre.org/ | Weakness classification |
| STRIDE | https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats | Threat enumeration |
[REPEAT: additional standards if used]
| [FILL] | [FILL] | [FILL] |
[END-REPEAT]

### Component Documentation
| Component | Documentation URL | Relevant Section |
|-----------|------------------|------------------|
[REPEAT]
| [FILL] | [FILL] | [FILL] |
[END-REPEAT]

---

## Report Metadata

| Field | Value |
|-------|-------|
| Source Location | `[FILL]` |
| Git Repository | `[FILL]` |
| Git Branch | `[FILL]` |
| Git Commit | `[FILL: SHA from git rev-parse --short HEAD]` (`[FILL: date from git log -1 --format="%ai" — NOT today's date]`) |
| Model | `[FILL]` |
| Machine Name | `[FILL]` |
| Analysis Started | `[FILL]` |
| Analysis Completed | `[FILL]` |
| Duration | `[FILL]` |
| Output Folder | `[FILL]` |
| Prompt | `[FILL: the user's prompt text that triggered this analysis]` |
[CONDITIONAL: incremental]
| Baseline Report | `[FILL]` |
| Baseline Commit | `[FILL: SHA]` (`[FILL: commit date]`) |
| Target Commit | `[FILL: SHA]` (`[FILL: commit date]`) |
| Baseline Worktree | `[FILL]` |
| Analysis Mode | `Incremental` |
[END-CONDITIONAL]

<!-- ⛔ POST-TABLE CHECK: Verify Report Metadata:
  1. ALL values wrapped in backticks: `value`
  2. Git Commit, Baseline Commit, Target Commit each include date in parentheses
  3. Duration field is present (not missing)
  4. Model field states the actual model name
  5. Analysis Started and Analysis Completed are real timestamps (not estimated from folder name)
  If ANY check fails → FIX NOW. -->

---

## Classification Reference

<!-- SKELETON INSTRUCTION: Copy the table below verbatim. Do NOT modify values. Do NOT copy this HTML comment into the output. -->

| Classification | Values |
|---------------|--------|
| **Exploitability Tiers** | **T1** Direct Exposure (no prerequisites) · **T2** Conditional Risk (single prerequisite) · **T3** Defense-in-Depth (multiple prerequisites or infrastructure access) |
| **STRIDE + Abuse** | **S** Spoofing · **T** Tampering · **R** Repudiation · **I** Information Disclosure · **D** Denial of Service · **E** Elevation of Privilege · **A** Abuse (feature misuse) |
| **SDL Severity** | `Critical` · `Important` · `Moderate` · `Low` |
| **Remediation Effort** | `Low` · `Medium` · `High` |
| **Mitigation Type** | `Redesign` · `Standard Mitigation` · `Custom Mitigation` · `Existing Control` · `Accept Risk` · `Transfer Risk` |
| **Threat Status** | `Open` · `Mitigated` · `Platform` |
| **Incremental Tags** | `[Existing]` · `[Fixed]` · `[Partial]` · `[New]` · `[Removed]` (incremental reports only) |
| **CVSS** | CVSS 4.0 vector with `CVSS:4.0/` prefix |
| **CWE** | Hyperlinked CWE ID (e.g., [CWE-306](https://cwe.mitre.org/data/definitions/306.html)) |
| **OWASP** | OWASP Top 10:2025 mapping (e.g., A01:2025 – Broken Access Control) |
```

**Critical format rules baked into this skeleton:**
- `0-assessment.md` is the FIRST row in Report Files (not `0.1-architecture.md`)
- `## Analysis Context & Assumptions` uses `&` (never word "and")
- `---` horizontal rules between EVERY pair of `## ` sections (minimum 6)
- `### Quick Wins` always present (with fallback note if no low-effort findings)
- `### Needs Verification` and `### Finding Overrides` always present (even if empty with `—`)
- References has TWO subsections with THREE-column tables (never flat 2-column)
- ALL metadata values wrapped in backticks
- ALL metadata fields present (Model, Analysis Started, Analysis Completed, Duration)
- Risk Rating heading has NO emojis
- Action Summary has EXACTLY 4 data rows: Tier 1, Tier 2, Tier 3, Total — NO "Mitigated" or "Platform" rows
- Git Commit rows include commit date in parentheses: `SHA` (`date`)
