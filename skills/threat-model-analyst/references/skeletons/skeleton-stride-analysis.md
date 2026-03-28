# Skeleton: 2-stride-analysis.md

> **⛔ Copy the template content below VERBATIM (excluding the outer code fence). Replace `[FILL]` placeholders. The "A" in STRIDE-A is ALWAYS "Abuse" — NEVER "Authorization".**
> **⛔ Exploitability Tiers table MUST have EXACTLY 4 columns: `Tier | Label | Prerequisites | Assignment Rule`. DO NOT merge into 3 columns. DO NOT rename `Assignment Rule` to `Description`.**
> **⛔ Summary table MUST include a `Link` column: `Component | Link | S | T | R | I | D | E | A | Total | T1 | T2 | T3 | Risk`**
> **⛔ N/A Categories MUST use a table (`| Category | Justification |`), NOT prose/bullet points.**

---

```markdown
# STRIDE + Abuse Cases — Threat Analysis

> This analysis uses the standard **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) extended with **Abuse Cases** (business logic abuse, workflow manipulation, feature misuse). The "A" column in tables below represents Abuse — a supplementary category covering threats where legitimate features are misused for unintended purposes. This is distinct from Elevation of Privilege (E), which covers authorization bypass.

## Exploitability Tiers

Threats are classified into three exploitability tiers based on the prerequisites an attacker needs:

| Tier | Label | Prerequisites | Assignment Rule |
|------|-------|---------------|----------------|
| **Tier 1** | Direct Exposure | `None` | Exploitable by unauthenticated external attacker with NO prior access. The prerequisite field MUST say `None`. |
| **Tier 2** | Conditional Risk | Single prerequisite: `Authenticated User`, `Privileged User`, `Internal Network`, or single `{Boundary} Access` | Requires exactly ONE form of access. The prerequisite field has ONE item. |
| **Tier 3** | Defense-in-Depth | `Host/OS Access`, `Admin Credentials`, `{Component} Compromise`, `Physical Access`, or MULTIPLE prerequisites joined with `+` | Requires significant prior breach, infrastructure access, or multiple combined prerequisites. |

<!-- ⛔ POST-TABLE CHECK: Verify this table has EXACTLY 4 columns (Tier|Label|Prerequisites|Assignment Rule). If you wrote 3 columns or named the 4th column 'Description' or 'Example' → FIX NOW before continuing. -->

## Summary

| Component | Link | S | T | R | I | D | E | A | Total | T1 | T2 | T3 | Risk |
|-----------|------|---|---|---|---|---|---|---|-------|----|----|----|------|
[REPEAT: one row per component — numeric STRIDE counts, 0 is valid with N/A justification]
| [FILL: ComponentName] | [Link](#[FILL: anchor]) | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [FILL: sum] | [FILL] | [FILL] | [FILL] | [FILL: Low/Medium/High/Critical] |
[END-REPEAT]
| **Totals** | | **[FILL]** | **[FILL]** | **[FILL]** | **[FILL]** | **[FILL]** | **[FILL]** | **[FILL]** | **[FILL]** | **[FILL]** | **[FILL]** | **[FILL]** | |

<!-- ⛔ POST-TABLE CHECK: Verify this Summary table:
  1. Has 14 columns: Component | Link | S | T | R | I | D | E | A | Total | T1 | T2 | T3 | Risk
  2. The 2nd column is a SEPARATE 'Link' column with `[Link](#anchor)` values — do NOT embed links inside the Component column
  3. S+T+R+I+D+E+A = Total for every row
  4. T1+T2+T3 = Total for every row
  5. No row has ALL 1s in every STRIDE column (if so, the analysis is too shallow)
  6. The 'A' column header represents 'Abuse' not 'Authorization'
  If ANY check fails → FIX NOW before writing component sections. -->

---

[REPEAT: one section per component — do NOT include sections for external actors (Operator, EndUser)]

## [FILL: ComponentName]

**Trust Boundary:** [FILL: boundary name]
**Role:** [FILL: brief description]
**Data Flows:** [FILL: DF##, DF##, ...]
**Pod Co-location:** [FILL: sidecars if K8s, or "N/A" if not K8s]

### STRIDE-A Analysis

#### Tier 1 — Direct Exposure (No Prerequisites)

| ID | Category | Threat | Prerequisites | Affected Flow | Mitigation | Status |
|----|----------|--------|---------------|---------------|------------|--------|
[REPEAT: threat rows or "*No Tier 1 threats identified.*"]
| [FILL: T##.X] | [FILL: Spoofing/Tampering/Repudiation/Information Disclosure/Denial of Service/Elevation of Privilege/Abuse] | [FILL] | [FILL] | [FILL: DF##] | [FILL] | [FILL: Open/Mitigated/Platform] |
[END-REPEAT]

#### Tier 2 — Conditional Risk

| ID | Category | Threat | Prerequisites | Affected Flow | Mitigation | Status |
|----|----------|--------|---------------|---------------|------------|--------|
[REPEAT: threat rows or "*No Tier 2 threats identified.*"]
| [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] |
[END-REPEAT]

#### Tier 3 — Defense-in-Depth

| ID | Category | Threat | Prerequisites | Affected Flow | Mitigation | Status |
|----|----------|--------|---------------|---------------|------------|--------|
[REPEAT: threat rows or "*No Tier 3 threats identified.*"]
| [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] |
[END-REPEAT]

#### Categories Not Applicable

| Category | Justification |
|----------|---------------|
[REPEAT: one row per N/A STRIDE category — use "Abuse" not "Authorization" for the A category]
| [FILL: Spoofing/Tampering/Repudiation/Information Disclosure/Denial of Service/Elevation of Privilege/Abuse] | [FILL: 1-sentence justification] |
[END-REPEAT]

<!-- ⛔ POST-COMPONENT CHECK: Verify this component:
  1. Category column uses full names (not abbreviations like 'S', 'T', 'DoS')
  2. 'A' category is 'Abuse' (NEVER 'Authorization')
  3. Status column uses ONLY: Open, Mitigated, Platform
  4. All 3 tier sub-sections present (even if empty with '*No Tier N threats*')
  5. N/A table present for any STRIDE categories without threats
  If ANY check fails → FIX NOW before moving to next component. -->

[END-REPEAT]
```

**STRIDE + Abuse Cases — the 7 categories are EXACTLY:**
Spoofing | Tampering | Repudiation | Information Disclosure | Denial of Service | Elevation of Privilege | Abuse

**Note:** The first 6 are standard STRIDE. "Abuse" is a supplementary category for business logic misuse (workflow manipulation, feature exploitation, API abuse). It is NOT "Authorization" — authorization issues belong under Elevation of Privilege (E).

**Valid Status values:** `Open` | `Mitigated` | `Platform` — NO other values permitted.
