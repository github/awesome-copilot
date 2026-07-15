# Output Formats — Report File Templates

⛔ **SELF-CORRECT DIRECTIVE:** After writing ANY file using templates from this document, immediately run the Self-Check section at the bottom. Your response to the orchestrator MUST include the filled checklist with ✅/❌ for each item. If ANY item is ❌, fix the file before proceeding to the next step.

This file defines the structure and content of every output file produced by the Threat Model Analyst. Each section is self-contained with templates, rules, and validation checklists.

**Diagram conventions** are in a separate file: [diagram-conventions.md](./diagram-conventions.md)
**Analysis methodology** is in a separate file: [analysis-principles.md](./analysis-principles.md)

---

## Output Folder

Create a timestamped folder at the start of analysis:
- Format: `threat-model-YYYYMMDD-HHmmss` (UTC time)
- Example: `threat-model-20260130-073845`
- Write ALL output files to this folder

---

## File Content Formatting — CRITICAL RULE

**NEVER wrap `.md` file content in code fences.** When using `create_file` or `edit_file`:
- The tool writes raw content to disk. If you include ` ```markdown ` at the start, it becomes literal text in the file.
- **WRONG**: Content starts with ` ```markdown ` — the file will contain the fence as literal text
- **CORRECT**: Content starts directly with `# Heading` on line 1
- This applies to ALL `.md` files: `0.1-architecture.md`, `0-assessment.md`, `1-threatmodel.md`, `2-stride-analysis.md`, `3-findings.md`

**NEVER wrap `.mmd` file content in code fences.** The `.mmd` file is raw Mermaid source:
- **WRONG**: Content starts with ` ```plaintext ` or ` ```mermaid `
- **CORRECT**: Content starts with `%%{init:` on line 1, followed by `flowchart` or `graph` on line 2

**Self-check before every file write:** Look at the first characters of your content. If they are ` ``` ` — STOP and remove the fence.

---

## File List

| File | Description | Always? |
|------|-------------|---------|
| `0-assessment.md` | Executive summary, risk rating, action plan, metadata | Yes |
| `0.1-architecture.md` | Architecture overview, components, scenarios, tech stack | Yes |
| `1-threatmodel.md` | Threat model DFD diagram + element/flow/boundary tables | Yes |
| `1.1-threatmodel.mmd` | Pure Mermaid DFD (source of truth for detailed diagram) | Yes |
| `1.2-threatmodel-summary.mmd` | Summary DFD (only if >15 elements or >4 boundaries) | Conditional |
| `2-stride-analysis.md` | Full STRIDE-A analysis for all components | Yes |
| `3-findings.md` | Prioritized security findings with remediation | Yes |
| `threat-inventory.json` | Structured JSON inventory for comparison matching | Yes |
| `incremental-comparison.html` | Visual HTML comparison report (incremental mode only) | Conditional |

---

## 0.1-architecture.md

**Purpose:** High-level architecture overview — generated FIRST, before threat modeling begins.

**When to generate:** Every run. Not conditional.

**Diagrams:** All inline Mermaid in the markdown. NO separate `.mmd` files for 0.1-architecture.md.

### Content Structure

```markdown
# Architecture Overview

## System Purpose
<!-- 2-4 sentences: What is this system? What problem does it solve? Who are the users? -->

## Key Components
| Component | Type | Description |
|-----------|------|-------------|
| [Name] | [Process / Data Store / External Service / External Interactor] | [One-line role description] |

## Component Diagram
<!-- Architecture diagram using service/external/datastore classDef (NOT DFD circles). See diagram-conventions.md for styles. -->

## Top Scenarios
<!-- 3-5 most important workflows. First 3 MUST include sequence diagrams. -->

### Scenario 1: [Name]
[2-3 sentence description]
<!-- Mermaid sequenceDiagram here -->

### Scenario 2: [Name]
### Scenario 3: [Name]

## Technology Stack
| Layer | Technologies |
|-------|--------------|
| Languages | ... |
| Frameworks | ... |
| Data Stores | ... |
| Infrastructure | ... |
| Security | ... |

## Deployment Model
<!-- How deployed? On-prem, cloud, hybrid? Containers, VMs? -->

## Security Infrastructure Inventory
| Component | Security Role | Configuration | Notes |
|-----------|---------------|---------------|-------|
| [e.g., MISE Sidecar] | [e.g., Authentication proxy] | [e.g., Entra ID OIDC] | [e.g., All API pods] |

## Repository Structure
| Directory | Purpose |
|-----------|---------|
| [path/] | [Contents] |
```

### Processing Rules

1. Generate **before** creating the threat model diagram
2. Derive all content from code analysis — do not speculate
3. If a section cannot be determined, state that explicitly
4. Target: **150-250 lines** minimum. Previous iterations produced only 100-150 lines which is too thin. Include detailed component descriptions, port/protocol info, and substantial scenario narratives.
5. Key Components table should align with threat model diagram elements
6. Use **architecture** diagram styles (not DFD) — see `diagram-conventions.md`
7. After writing, verify each Mermaid block has valid syntax
8. **Top Scenarios**: The first 3 scenarios MUST include Mermaid `sequenceDiagram` blocks showing the interaction flow. Each sequence diagram should show actual participants, messages with protocol details, and alt/opt blocks for error paths.
9. **Component alignment**: Every component listed in Key Components MUST later appear as a section in `2-stride-analysis.md`
10. **Deployment Model**: Must include specific details: ports, protocols, bind addresses, network exposure, and deployment topology (single machine / cluster / multi-tier)
11. **Security Infrastructure Inventory**: Populate with EVERY security-relevant component found in code (auth, encryption, access control, logging, secrets management)

---

## 1-threatmodel.md + 1.1-threatmodel.mmd

**Purpose:** System threat model as a Data Flow Diagram (DFD).

### Generation Steps

**Step 1:** Create `1.1-threatmodel.mmd` (source of truth)
- Pure Mermaid code, no markdown wrapper
- Use DFD shapes and styles from `diagram-conventions.md`

**Step 2:** Run the POST-DFD GATE from `orchestrator.md` Step 4 to evaluate and create `1.2-threatmodel-summary.mmd` if threshold is met. See `skeletons/skeleton-summary-dfd.md` for the template.

**Step 3:** Create `1-threatmodel.md` (include Summary View section if summary was generated)

### 1-threatmodel.md Content

```markdown
# Threat Model

## Data Flow Diagram
<!-- Copy EXACT diagram from 1.1-threatmodel.mmd wrapped in ```mermaid fence -->

## Element Table
| Element | Type | TMT Category | Description | Trust Boundary |
|---------|------|--------------|-------------|----------------|

- **Type** = high-level DFD category: `Process`, `External Interactor`, or `Data Store`
- **TMT Category** = specific TMT ID from tmt-element-taxonomy.md §1 (e.g. `SE.P.TMCore.WebSvc`, `SE.EI.TMCore.Browser`, `SE.DS.TMCore.SQL`)
- For Kubernetes-based applications where pods run sidecars, add an optional **Co-located Sidecars** column (e.g. `MISE, Dapr` or `—`)

## Data Flow Table
| ID | Source | Target | Protocol | Description |
|----|--------|--------|----------|-------------|

## Trust Boundary Table
| Boundary | Description | Contains |
|----------|-------------|----------|

## Summary View (only if summary diagram generated)
<!-- Copy from 1.2-threatmodel-summary.mmd -->

## Summary to Detailed Mapping
| Summary Element | Contains | Summary Flows | Maps to Detailed Flows |
```

**Key rules:**
- Diagram in `.mmd` and `.md` must be IDENTICAL (copy, don't regenerate)
- Use `DF01`, `DF02` for detailed flows; `SDF01`, `SDF02` for summary flows

---

## 2-stride-analysis.md

**Purpose:** Full STRIDE + Abuse Cases threat analysis for every component.

### Structure Requirements

1. Each component's threats **MUST be split into Tier 1, Tier 2, Tier 3 sub-sections** with separate tables
2. Summary table **MUST include T1, T2, T3 columns**
3. All three tier sub-sections appear for every component (even if empty — use "*No Tier N threats identified*")

### Anchor-Safe Headings (CRITICAL)

Component `## ` headings become link targets from `3-findings.md`.
- Use **only** letters, numbers, spaces, and hyphens
- **FORBIDDEN in headings:** `&`, `/`, `(`, `)`, `.`, `:`, `'`, `"`, `+`, `@`, `!`
- Replace: `&` → `and`, `/` → `-`, parentheses → remove

**Anchor rule:** heading → lowercase, spaces → hyphens, strip non-alphanumeric except hyphens.

### Template

> **⛔ CRITICAL: The `## Summary` table MUST appear at the TOP of the file, immediately after `## Exploitability Tiers` and BEFORE any individual `## Component` sections. It is a navigation aid — readers need it first. The model consistently moves it to the BOTTOM — that is WRONG. Follow this exact order: `# STRIDE + Abuse Cases — Threat Analysis` → `## Exploitability Tiers` → `## Summary` → `---` → `## Component 1` → `## Component 2` → ...**

> **⛔ RIGID TIER DEFINITIONS — Apply these EXACTLY. Do NOT use subjective judgment.** This is a skill directive — do NOT copy this line into the output. The tier table below is what goes into the report, WITHOUT this directive line.

> **⛔ LEAKED DIRECTIVE CHECK:** The output file MUST NOT contain the text "RIGID TIER DEFINITIONS", "Do NOT use subjective judgment", or any line starting with `⛔`. These are skill instructions, not report content. If you see them in your output, remove them before finalizing.

```markdown
# STRIDE + Abuse Cases — Threat Analysis

## Exploitability Tiers

Threats are classified into three exploitability tiers based on the prerequisites an attacker needs:

| Tier | Label | Prerequisites | Assignment Rule |
|------|-------|---------------|----------------|
| **Tier 1** | Direct Exposure | `None` | Exploitable by unauthenticated external attacker with NO prior access. The prerequisite field MUST say `None`. |
| **Tier 2** | Conditional Risk | Single prerequisite: `Authenticated User`, `Privileged User`, `Internal Network`, or single `{Boundary} Access` | Requires exactly ONE form of access. The prerequisite field has ONE item. |
| **Tier 3** | Defense-in-Depth | `Host/OS Access`, `Admin Credentials`, `{Component} Compromise`, `Physical Access`, or MULTIPLE prerequisites joined with `+` | Requires significant prior breach, infrastructure access, or multiple combined prerequisites. |
```

> **⛔ COPY THE TIERS TABLE VERBATIM.** The 4th column must be `Assignment Rule` (NOT `Example`, `Description`, `Criteria`, or any other name). The cell values must be the exact text above — do NOT replace them with deployment-specific examples. Do NOT add a "Deployment context affecting tier assignment" paragraph after the table — deployment context belongs in the individual component sections, not in the tier definitions.

> **⛔ STRIDE-A CATEGORY LABELS (MANDATORY — the “A” is “Abuse”, NEVER “Authorization”):**
> The 7 STRIDE-A categories used in ALL tables (Summary, per-component Tier tables, threat-inventory.json) are:
> **S**poofing | **T**ampering | **R**epudiation | **I**nformation Disclosure | **D**enial of Service | **E**levation of Privilege | **A**buse
> “Abuse” covers: business logic abuse, workflow manipulation, feature misuse, unintended use of legitimate features.
> The model frequently generates “Authorization” for the A column — this is WRONG. If you see “Authorization” anywhere as a STRIDE category label, replace it with “Abuse”. The Category column in threat rows MUST say “Abuse” (not “Authorization”). N/A entries must also say “Abuse — N/A” (not “Authorization — N/A”).

## Summary
| Component | Link | S | T | R | I | D | E | A | Total | T1 | T2 | T3 | Risk |
|-----------|------|---|---|---|---|---|---|---|-------|----|----|----|------|

---

## Component Name

**Trust Boundary:** [boundary name]
**Role:** [brief description]
**Data Flows:** [list of DF IDs]
**Pod Co-location:** [sidecars if K8s — see diagram-conventions.md]

### STRIDE-A Analysis

> **⛔ CATEGORY NAMING: The 7 STRIDE-A categories are: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege, Abuse. The "A" category is ALWAYS "Abuse" — NEVER "Authorization". Authorization issues belong under Elevation of Privilege (E). This applies to N/A justification labels, threat table Category columns, and all prose.**

#### Tier 1 — Direct Exposure (No Prerequisites)
| ID | Category | Threat | Prerequisites | Affected Flow | Mitigation | Status |
|----|----------|--------|---------------|---------------|------------|--------|

#### Tier 2 — Conditional Risk
| ID | Category | Threat | Prerequisites | Affected Flow | Mitigation | Status |

#### Tier 3 — Defense-in-Depth
| ID | Category | Threat | Prerequisites | Affected Flow | Mitigation | Status |
```

**⛔ STRIDE Status Column — Valid Values (must match Coverage table):**
The `Status` column in each threat row MUST use exactly one of these values:
- `Open` — Threat is not mitigated; MUST map to a finding (`✅ Covered` in Coverage table). The finding documents the vulnerability and remediation guidance.
- `Mitigated` — Threat is mitigated by the engineering team's own code, configuration, or design decisions in THIS repository. Maps to `✅ Mitigated (FIND-XX)` in Coverage table. A finding MUST be created that documents WHAT the team did, WHERE in the code, and HOW it mitigates the threat. This gives credit to the engineering team for security work they've already done.
- `Platform` — Threat is mitigated by an EXTERNAL platform that is NOT part of the analyzed codebase. See strict definition below. Maps to `🔄 Mitigated by Platform` in Coverage table. NO finding is created — the mitigation is outside this team's control.

**How to distinguish Mitigated vs Platform:**
| Question | If YES → | If NO → |
|----------|----------|---------|
| Is the mitigation implemented in code within THIS repository? | `Mitigated` | Check next |
| Is the mitigation in deployment config controlled by THIS team? | `Mitigated` | Check next |
| Is the mitigation provided by a completely external system? | `Platform` | `Open` (no mitigation exists) |

**Examples of `Mitigated` (team's own work — create finding to document it):**
- Auth middleware validating JWT tokens — the team wrote this code
- TLS certificate generation and configuration — the team implemented this
- File permissions set to 0600 in the code — the team chose secure defaults
- Input validation or sanitization functions — the team built defenses
- Rate limiting middleware — the team added throttling
- Localhost-only binding — the team made an architectural security decision

**The finding for a `Mitigated` threat documents the existing control:**
- Title: descriptive of what IS in place (e.g., "JWT Authentication Middleware on API Endpoints")
- Severity: Low (existing control) or Moderate (if control has gaps)
- Mitigation Type: `Existing Control`
- Remediation section: describes what's already implemented + any hardening recommendations
- This ensures the Coverage table shows the team's security work, not just gaps

**⛔ STRICT DEFINITION OF "PLATFORM" (MANDATORY):**
`Platform` status is ONLY valid when ALL of these conditions are true:
1. The mitigation is provided by a system **completely outside** the analyzed repository's code
2. The mitigation is **managed by a different team/organization** (e.g., Azure AD is managed by Microsoft Identity team, not by this repo's team)
3. The mitigation **cannot be disabled or weakened** by modifying code in this repository

**Examples of LEGITIMATE Platform mitigations:**
- Azure AD token signing (managed by Microsoft Identity, not this code)
- K8s RBAC (managed by K8s control plane, not this operator)
- Azure Arc tunnel encryption (managed by Arc team, not this agent)
- TPM hardware security (hardware, not software)

**Examples of things that are NOT "Platform" — they are `Mitigated` (team's work):**
- ✅ "Auth middleware on endpoints" → `Mitigated` — team wrote the auth code. Create finding documenting it.
- ✅ "TLS on localhost" → `Mitigated` — team implemented TLS. Create finding documenting the implementation.
- ✅ "File permissions 0600" → `Mitigated` — team set secure defaults. Create finding documenting the choice.
- ✅ "Localhost binding" → `Mitigated` — team made architectural security decision. Create finding.
- ✅ "Input validation" → `Mitigated` — team built defense. Create finding documenting what's validated.
- ✅ "Operation state machine" → `Mitigated` — team's logic prevents abuse. Create finding.

**⛔ MAXIMUM PLATFORM RATIO:** If more than 20% of threats are classified as "🔄 Mitigated by Platform", re-examine each. Many should be `Mitigated` (team's code) not `Platform` (external). In a typical application, 5-15% are genuinely platform-mitigated, 20-40% are mitigated by the team's own code, and the rest are `Open` (needing remediation).

**⛔ NEVER use these values:**
- ❌ `Partial` — ambiguous. If partially mitigated, it's `Open` (the remaining gap is the finding)
- ❌ `N/A` — every threat is applicable if it's in the table
- ❌ `Accepted` — the tool does not accept risks
- ❌ `Needs Review` — every threat must be either Covered, Mitigated, or Platform

**Consistency rule:** The STRIDE `Status` column and the Findings Coverage table `Status` MUST agree:
| STRIDE Status | Coverage Table Status | Meaning |
|---|---|---|
| `Open` | `✅ Covered (FIND-XX)` | Finding documents a vulnerability needing remediation |
| `Mitigated` | `✅ Mitigated (FIND-XX)` | Finding documents an existing control the team built — gives credit for security work |
| `Platform` | `🔄 Mitigated by Platform` | External platform handles it — no finding needed |

**⛔ "Accepted Risk" and "Needs Review" are FORBIDDEN.** The tool does NOT have authority to accept risks or defer threats. Every threat maps to either a finding (Covered or Mitigated) or a genuine external platform mitigation. There is no middle ground.

### Arithmetic Verification (MANDATORY)

After writing ALL component tables:
1. Count actual threat rows per component per category (S,T,R,I,D,E,A) — compare with summary table
2. Verify Total = S+T+R+I+D+E+A for each row
3. Verify T1+T2+T3 = Total for each row
4. Verify Totals row = column-wise sum
5. Row count cross-check: threat rows in detail = Total in summary

---

## 3-findings.md

**Purpose:** Prioritized security findings with evidence and remediation.

> **⛔ IMPORTANT: Before writing this file, read [skeleton-findings.md](./skeletons/skeleton-findings.md) and copy the skeleton VERBATIM for each finding. Fill in the `[FILL]` placeholders. This prevents template drift.**

### Structure Requirements

Organized by **Exploitability Tier** (NOT by severity):
1. `## Tier 1 — Direct Exposure (No Prerequisites)`
2. `## Tier 2 — Conditional Risk (Authenticated / Single Prerequisite)`
3. `## Tier 3 — Defense-in-Depth (Prior Compromise / Host Access)`

**DO NOT** use `## Critical Findings`, `## Important Findings`, etc.
Sort by severity **within** each tier, then by CVSS descending.

**Tier Assignment for Findings:**
- A finding's tier is determined by its `Exploitation Prerequisites` value, using the same rules as STRIDE-A tier assignment (see [analysis-principles.md](./analysis-principles.md))
- If a finding covers threats from multiple tiers (via Related Threats), assign it to the **highest-priority tier** (lowest tier number) among its related threats

**Ordering within each tier:** Sort findings by:
1. **SDL Bugbar Severity** descending: Critical → Important → Moderate → Low
2. **Within each severity band**, sort by CVSS 4.0 score descending (highest first)

**After writing all findings**, verify the sort order:
- List all findings with their severity, CVSS score, and tier
- Confirm no finding with higher CVSS appears after a lower CVSS finding within the same severity band and tier
- If misordered, renumber and reorder before finalizing

**Finding ID Numbering — MUST be sequential:**
- Use `FIND-01`, `FIND-02`, `FIND-03`, ... only. `F-01`, `F01`, or `Finding 1` formats are NOT allowed.
- IDs MUST appear in order in the document: FIND-01 before FIND-02 before FIND-03, etc.
- ❌ NEVER have FIND-06 appear before FIND-04 in the document. If reordering findings, renumber ALL IDs to maintain sequential order.
- After final sort, scan the document top-to-bottom: the first finding heading must be FIND-01, the next FIND-02, etc. No gaps, no out-of-order.

### Finding Attributes (ALL MANDATORY)

| Attribute | Description |
|-----------|-------------|
| SDL Bugbar Severity | Critical / Important / Moderate / Low |
| CVSS 4.0 | Score AND full vector string (e.g., `9.3 (CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N)`) — BOTH are mandatory |
| CWE | ID, name, AND hyperlink (e.g., `[CWE-306](https://cwe.mitre.org/data/definitions/306.html): Missing Authentication for Critical Function`) |
| OWASP | Top 10:2025 mapping (A01:2025 format — never :2021) |
| Exploitation Prerequisites | From tier definitions |
| Exploitability Tier | Tier 1 / Tier 2 / Tier 3 |
| Remediation Effort | Low / Medium / High |
| Mitigation Type | Redesign / Standard Mitigation / Custom Mitigation / Existing Control / Accept Risk / Transfer Risk |
| Component | Affected component |
| Related Threats | Individual links to `2-stride-analysis.md#component-anchor` |

### Full Finding Example

```markdown
### FIND-01: Missing Authentication on API

| Attribute | Value |
|-----------|-------|
| SDL Bugbar Severity | Critical |
| CVSS 4.0 | 9.3 (CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N) |
| CWE | [CWE-306](https://cwe.mitre.org/data/definitions/306.html): Missing Authentication for Critical Function |
| OWASP | A07:2025 – Authentication Failures |
| Exploitation Prerequisites | None (external attacker) |
| Exploitability Tier | Tier 1 — Direct Exposure |
| Remediation Effort | Medium |
| Mitigation Type | Standard Mitigation |
| Component | API Gateway |
| Related Threats | [T01.S](2-stride-analysis.md#api-gateway), [T01.R](2-stride-analysis.md#api-gateway) |

#### Description

The API endpoint /api/v1/resources accepts requests without any authentication check...

#### Evidence

`src/Controllers/ResourceController.cs` line 45 — no `[Authorize]` attribute on controller.

#### Remediation

Add `[Authorize]` attribute to the controller class and configure JWT bearer authentication in `Program.cs`.

#### Verification

Send an unauthenticated GET request to `/api/v1/resources` — should return 401 Unauthorized.
```

### Related Threats Link Format

> **⛔ CRITICAL: Related Threats MUST be hyperlinks, NOT plain text. The model consistently outputs plain text like `T-02, T-17` — this is WRONG. Each threat ID must link to the specific component section in stride analysis.**

- Individual links per threat ID: `[T01.S](2-stride-analysis.md#component-name)`
- **WRONG**: `T-02, T-17, T-23` (plain text, no links)
- **WRONG**: `[T08.S, T08.T](2-stride-analysis.md)` (grouped, no anchor)
- **CORRECT**: `[T08.S](2-stride-analysis.md#redis-state-store), [T08.T](2-stride-analysis.md#redis-state-store)`
- Every `| **Related Threats** |` cell must contain ONLY `[Txx.Y](2-stride-analysis.md#anchor)` format links separated by commas

### Post-Write Checks

1. **Anchor spot-check**: Verify 3+ Related Threats links resolve to real `##` headings
2. **Threat coverage check**: Every threat ID in `2-stride-analysis.md` must be referenced by at least one finding
3. **Sort order check**: Within each tier, no higher-CVSS finding appears after a lower-CVSS finding in the same severity band
4. **CVSS-to-Tier consistency**: Scan every finding — if CVSS has `AV:L` or `PR:H`, finding MUST NOT be in Tier 1. Fix by downgrading the tier, not by changing the CVSS.
5. **Threat Coverage Verification table**: At the end of `3-findings.md`, include:

```markdown
## Threat Coverage Verification

| Threat ID | Finding ID | Status |
|-----------|------------|--------|
| T01.S | FIND-01 | ✅ Covered |
| T01.T | FIND-05 | ✅ Mitigated (team implemented TLS) |
| T02.I | — | 🔄 Mitigated by Platform (Azure AD) |
```

Every threat from `2-stride-analysis.md` must appear in this table. Status is one of:
- `✅ Covered (FIND-XX)` — finding documents a vulnerability that needs remediation
- `✅ Mitigated (FIND-XX)` — finding documents an existing control the team built (gives credit for security work done)
- `🔄 Mitigated by Platform` — external system handles it (only for genuinely external platforms)

**⛔ THIS TABLE IS A FEEDBACK LOOP, NOT DOCUMENTATION:**
The purpose of this table is to force you to check your work. After filling it out:
1. If ANY threat has a `—` dash in the Finding ID column with status other than `🔄 Mitigated by Platform` → **you missed a finding. Go back and create one.**
2. If Platform count > 20% of total threats → **you are overusing Platform as an escape hatch. Re-examine.**
3. If any threat is listed as `⚠️ Accepted Risk` or `⚠️ Needs Review` → **VIOLATION. Create a finding or verify it's genuinely Platform.**

The table should drive you to 100% coverage: every threat maps to either a finding (`✅ Covered`) or a legitimate external platform mitigation (`🔄 Mitigated by Platform`). There is no third option.

**⛔ FINDING GENERATION RULE:**
If a threat in `2-stride-analysis.md` has a non-empty `Mitigation` column, it MUST become a finding. The mitigation text provides the remediation — use it. The only exception is threats genuinely mitigated by an EXTERNAL platform (Azure AD, K8s RBAC, TPM hardware) that this code cannot disable.

---

## 0-assessment.md

**Purpose:** Executive summary, risk rating, action plan, and metadata. The "front page" of the report.

> **⛔ IMPORTANT: Before writing this file, read [skeleton-assessment.md](./skeletons/skeleton-assessment.md) and copy the skeleton VERBATIM. Fill in the `[FILL]` placeholders. This prevents template drift.**

### Section Order (MANDATORY — ALL 7 sections REQUIRED, do NOT skip any)

1. **Report Files** (REQUIRED) — Links to all report deliverables
2. **Executive Summary** (REQUIRED) — Risk rating + coverage. NO separate "Key Recommendations" subsection
3. **Action Summary** (REQUIRED) — Tier-based prioritized action plan with `### Quick Wins` subsection
4. **Analysis Context & Assumptions** (REQUIRED) — Scope, infrastructure context, `### Needs Verification` table, finding overrides
5. **References Consulted** (REQUIRED) — Security standards + component documentation
6. **Report Metadata** (REQUIRED) — Model, timestamps, duration, git info
7. **Classification Reference** (REQUIRED) — MUST be the last section. Static table copied from skeleton.

⚠️ **Enforcement:** If a section has no data, include it with empty tables or "N/A" notes — NEVER omit the section entirely. The agent in previous iterations skipped sections 1, 4, 5, and 6 entirely. ALL SEVEN must be present.

### Report Files Template

The Report Files table MUST list `0-assessment.md` (this file) as the FIRST row, followed by the other files:

```markdown
## Report Files

| File | Description |
|------|-------------|
| [0-assessment.md](0-assessment.md) | This document — executive summary, risk rating, action plan, metadata |
| [0.1-architecture.md](0.1-architecture.md) | Architecture overview, components, scenarios, tech stack |
| [1-threatmodel.md](1-threatmodel.md) | Threat model DFD diagram with element, flow, and boundary tables |
| [1.1-threatmodel.mmd](1.1-threatmodel.mmd) | Pure Mermaid DFD source file |
| [1.2-threatmodel-summary.mmd](1.2-threatmodel-summary.mmd) | Summary DFD (only if generated) |
| [2-stride-analysis.md](2-stride-analysis.md) | Full STRIDE-A analysis for all components |
| [3-findings.md](3-findings.md) | Prioritized security findings with remediation |
```

⚠️ **`0-assessment.md` MUST be the first row.** The model consistently lists `0.1-architecture.md` first — that is WRONG. This file IS the front page of the report and lists itself first.

### Risk Rating

The heading must be plain text with NO emojis: `### Risk Rating: Elevated`, NOT `### Risk Rating: 🟠 Elevated`

### Threat Count Context Paragraph

Include at end of Executive Summary:

```markdown
> **Note on threat counts:** This analysis identified [N] threats across [M] components. This count reflects comprehensive STRIDE-A coverage, not systemic insecurity. Of these, **[T1 count] are directly exploitable** without prerequisites (Tier 1). The remaining [T2+T3 count] represent conditional risks and defense-in-depth considerations.
```

### Action Summary Template

> **⛔ FIXED PRIORITY MAPPING — The Priority column values are DETERMINISTIC, not judgment-based:**
> | Tier | Priority | Always |
> |------|----------|--------|
> | Tier 1 | 🔴 Critical Risk | ALWAYS — regardless of threat/finding count |
> | Tier 2 | 🟠 Elevated Risk | ALWAYS — regardless of threat/finding count |
> | Tier 3 | 🟡 Moderate Risk | ALWAYS — regardless of threat/finding count |
>
> **NEVER change the priority based on how many threats or findings exist in that tier.** Even if Tier 1 has 0 threats and 0 findings, the priority is still 🔴 Critical Risk — because IF a Tier 1 threat existed, it would be critical. The priority reflects the tier's inherent severity, not the count. A report with Tier 1 = "🟢 Low Risk" is WRONG and must be fixed.

```markdown
## Action Summary

| Tier | Description | Threats | Findings | Priority |
|------|-------------|---------|----------|----------|
| Tier 1 | Directly exploitable | 5 | 3 | 🔴 Critical Risk |
| Tier 2 | Requires authenticated access | 8 | 4 | 🟠 Elevated Risk |
| Tier 3 | Requires prior compromise | 12 | 5 | 🟡 Moderate Risk |
| **Total** | | **25** | **12** | |
```

> **⛔ EXACTLY 4 ROWS: The Action Summary table MUST have exactly 4 data rows: Tier 1, Tier 2, Tier 3, and Total. Do NOT add rows for "Mitigated", "Platform", "Fixed", "Accepted", or any other status. Mitigated threats are distributed across their respective tiers — they are NOT a separate tier. If you find yourself adding a "Mitigated" row, STOP and remove it.**

```markdown

### Quick Wins
<!-- Tier 1 findings with Low remediation effort — high impact, quick fixes -->
| Finding | Title | Why Quick |
|---------|-------|-----------|
| FIND-XX | [title] | [reason] |
```

⚠️ **Quick Wins is a REQUIRED subsection.** The `### Quick Wins` heading and table MUST appear after the tier summary table inside Action Summary. If no low-effort findings exist, write: `### Quick Wins\n\nNo low-effort findings identified. All findings require Medium or High effort.`

**Processing Rules for Action Summary:**
1. Populate the tier table with actual counts from `3-findings.md` (findings per tier) and `2-stride-analysis.md` (threats per tier from T1/T2/T3 columns in summary table)
2. Quick Wins lists only Tier 1 findings with `Remediation Effort: Low` — highest-impact, lowest-effort items
3. If no Tier 1 Low-effort findings exist, show Tier 2 Low-effort findings instead, with a note: "No Tier 1 quick wins identified. These Tier 2 items offer the best effort-to-impact ratio:"
4. If no Low-effort findings exist at all, keep `### Quick Wins` heading and add: `No low-effort findings identified. All findings require Medium or High effort.`
5. Verify: Findings column sums must equal total findings count in `3-findings.md`
6. Verify: Threats column sums must equal total threats count in `2-stride-analysis.md` summary table

### ⛔ PROHIBITED Content in Action Summary and All Output Files

**NEVER generate ANY of the following:**
- `### Priority Remediation by Phase` or any phase-based remediation roadmap
- Sprint references (`Sprint 1-2`, `Sprint 3-4`, etc.)
- Time-based phases (`Phase 1 — Immediate`, `Phase 2 — Short-term`, `Phase 3 — Medium-term`, `Phase 4 — Long-term`, `Backlog`)
- Time-to-fix estimates (`~1 hour`, `~2 hours`, `~4 hours`, `1-2 days`, etc.)
- Timeline or scheduling language (`immediately`, `next quarter`, `within 30 days`, `addressed within`)
- Effort duration labels (`(hours)`, `(days)`, `(weeks)`) after Low/Medium/High effort levels

**The report identifies WHAT to fix and WHY (tier + severity + effort level). It does NOT prescribe WHEN to fix it.** Scheduling is the team's responsibility. Only use `Low`, `Medium`, `High` for remediation effort — never attach time durations.

### Analysis Context & Assumptions Template

⚠️ **This ENTIRE section is REQUIRED.** Previous iterations skipped it entirely. Include ALL sub-sections below, even if tables are empty.

```markdown
## Analysis Context & Assumptions

### Analysis Scope
| Constraint | Description |
|------------|-------------|
| Scope | [Full repo or specific area] |
| Excluded | [What was excluded] |
| Focus Areas | [Special focus if any] |

### Infrastructure Context
| Category | Discovered from Codebase | Findings Affected |
|----------|--------------------------|-------------------|

**Every entry in "Discovered from Codebase" MUST include a relative link to the source file or document from which the information was inferred.** Example:

```
| Deployment Model | Air-gapped, single-admin workstation ([daemon.json](src/Container/Moby/daemon.json), [InstallAzureEdgeDiagnosticTool.ps1](src/Setup/InstallArtifacts/InstallAzureEdgeDiagnosticTool.ps1)) | All findings — no Tier 1 |
| Network Exposure | All services bind to localhost:80 only ([KustoContainerHelper.psm1](src/Container/Kusto/KustoContainerHelper.psm1)) | FIND-01, FIND-03 |
```

### Needs Verification
| Item | Question | What to Check | Why Uncertain |
|------|----------|---------------|---------------|

### Finding Overrides
| Finding ID | Original Severity | Override | Justification | New Status |
|------------|-------------------|----------|---------------|------------|
| — | — | — | No overrides applied. Update this section after review. | — |

### Additional Notes
<!-- Any other context from the user's prompt -->

[Freeform notes provided by user]
```

### References Consulted Template

> **⛔ CRITICAL: This section MUST have TWO subsections with THREE-column tables including full URLs. Do NOT flatten into a simple 2-column `| Reference | Usage |` table. The model ALWAYS tries to simplify this — do NOT simplify it.**

```markdown
## References Consulted

### Security Standards
| Standard | URL | How Used |
|----------|-----|----------|
| Microsoft SDL Bug Bar | https://www.microsoft.com/en-us/msrc/sdlbugbar | Severity classification |
| OWASP Top 10:2025 | https://owasp.org/Top10/2025/ | Threat categorization |
| CVSS 4.0 | https://www.first.org/cvss/v4.0/specification-document | Risk scoring |
| CWE | https://cwe.mitre.org/ | Weakness classification |
| STRIDE | https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats | Threat enumeration methodology |
| NIST SP 800-53 Rev. 5 | https://csrc.nist.gov/pubs/sp/800-53/r5/upd1/final | Control mapping |

### Component Documentation
| Component | Documentation URL | Relevant Section |
|-----------|------------------|------------------|
| [e.g., Dapr] | [e.g., https://docs.dapr.io/operations/security/] | [e.g., mTLS configuration] |
| [e.g., Redis] | [e.g., https://redis.io/docs/management/security/] | [e.g., Authentication] |
```

**Processing Rules:**
1. Always include the Security Standards table — populate with actual standards consulted
2. Every row MUST have a full URL (https://...) — never omit the URL column
3. Populate Component Documentation with technologies actually consulted during analysis
4. Do not add documentation that was not used

### Report Metadata Template

> **⛔ CRITICAL: ALL fields below are MANDATORY. Do NOT skip Model, Analysis Started, Analysis Completed, or Duration. The previous run omitted these — that is a critical failure. Run `Get-Date` at start and end to compute Duration.**

```markdown
## Report Metadata

| Field | Value |
|-------|-------|
| Source Location | `[Full path]` |
| Git Repository | `[Remote URL or "Unavailable"]` |
| Git Branch | `[Branch name or "Unavailable"]` |
| Git Commit | `[Short SHA]` (`[YYYY-MM-DD]` — run `git log -1 --format="%cs" [SHA]` to get commit date) |
| Model | `[Model name — ask the system or state the model you are running as]` |
| Machine Name | `[hostname]` |
| Analysis Started | `[UTC timestamp from command]` |
| Analysis Completed | `[UTC timestamp from command]` |
| Duration | `[Computed difference between started and completed]` |
| Output Folder | `[folder name]` |
| Prompt | `[The user's prompt text that triggered this analysis]` |
```

**Gathering rules:**
- START_TIME: Run `Get-Date -Format "yyyy-MM-dd HH:mm:ss" -AsUTC` at workflow Step 1
- END_TIME: Run again before writing 0-assessment.md
- Git fields: `git remote get-url origin`, `git branch --show-current`, `git rev-parse --short HEAD`
- If any command fails → "Unavailable"
- **NEVER estimate timestamps** from folder names
- Model: State the model you are currently running as (e.g., `Claude Opus 4.6`, `GPT-5.3 Codex`, `Gemini 3 Pro`)
- Machine: run `hostname`

### Coverage Counts Consistency

Before writing 0-assessment.md:
- Count elements from `1-threatmodel.md` Element Table
- Count findings from `3-findings.md`
- Count threats from `2-stride-analysis.md` summary table
- Use these exact numbers in Executive Summary and Action Summary

### Formatting Rules

1. `---` horizontal rules between every `##` section
2. Report Metadata values all wrapped in backticks
3. Finding Overrides always uses table format (even when empty)
4. Report Files section always first
5. `0.1-architecture.md` always listed in Report Files table

---

## Common Mistakes Checklist

These are the most observed deviations. Check after writing each file:

1. ❌ Organizing by severity → ✅ Organize by **Exploitability Tier**
2. ❌ Flat STRIDE tables → ✅ Split into Tier 1/2/3 sub-sections per component
3. ❌ Missing `Exploitability Tier` and `Remediation Effort` → ✅ MANDATORY on every finding
4. ❌ STRIDE summary missing T1/T2/T3 columns → ✅ Include T1|T2|T3 columns
5. ❌ Wrapping `.md` in ` ```markdown ` code fences → ✅ Start with `# Heading` on line 1. The `create_file` tool writes raw content — fences become literal text in the file.
6. ❌ Wrapping `.mmd` in ` ```plaintext ` or ` ```mermaid ` → ✅ Start with `%%{init:` on line 1. The `.mmd` file is raw Mermaid source.
7. ❌ Missing Action Summary → ✅ Section MUST be titled exactly `## Action Summary`. MUST include `### Quick Wins` subsection with table of Tier 1 low-effort findings.
8. ❌ Missing threat count context paragraph → ✅ Include `> **Note on threat counts:**` blockquote in Executive Summary
9. ❌ Omitting empty tier sections → ✅ Always include all three tiers per component
10. ❌ Adding separate `### Key Recommendations` or `### Top Recommendations` or `### Priority Remediation Roadmap` → ✅ Action Summary IS the recommendations — no other name.
11. ❌ Drawing sidecars as separate nodes → ✅ See `diagram-conventions.md` Rule 1
12. ❌ Missing CVSS 4.0 vector string → ✅ Every finding MUST have both score AND full vector (e.g., `CVSS:4.0/AV:N/AC:L/...`)
13. ❌ Missing CWE or OWASP on findings → ✅ MANDATORY on every finding
14. ❌ Using OWASP `:2021` suffix → ✅ ALWAYS use `:2025` (e.g., `A01:2025 – Broken Access Control`). The 2025 edition is current.
15. ❌ Missing Threat Coverage Verification table → ✅ Required at end of `3-findings.md`
16. ❌ Architecture component not in STRIDE analysis → ✅ Every component in 0.1-architecture.md must have a STRIDE section
17. ❌ Missing sequence diagrams for top scenarios → ✅ First 3 scenarios in 0.1-architecture.md MUST have Mermaid sequence diagrams
18. ❌ Missing Needs Verification section in 0-assessment.md → ✅ Include under Analysis Context & Assumptions
19. ❌ Missing `## Analysis Context & Assumptions` section entirely → ✅ REQUIRED. Previous iterations skipped this section. Must include Scope, Needs Verification, and Finding Overrides sub-tables.
20. ❌ Missing `### Quick Wins` subsection → ✅ REQUIRED under Action Summary. List Tier 1 low-effort findings; if none, include heading with note.
21. ❌ Skipping `## Report Files`, `## References Consulted`, or `## Report Metadata` → ✅ ALL 7 sections in 0-assessment.md are MANDATORY. Never omit any.
22. ❌ Finding IDs out of order (FIND-06 before FIND-04) → ✅ Finding IDs MUST be sequential top-to-bottom: FIND-01, FIND-02, FIND-03, ... Renumber after sorting.
23. ❌ CWE without hyperlink → ✅ CWE MUST include hyperlink: `[CWE-306](https://cwe.mitre.org/data/definitions/306.html): Missing Authentication for Critical Function`
24. ❌ Time estimates or scheduling in output → ✅ NEVER generate `~1 hour`, `Sprint 1-2`, `Phase 1 — Immediate`, `(hours)`, or any timeline/duration in ANY output file. The report says WHAT to fix, not WHEN.

---

## threat-inventory.json

**Purpose:** Structured JSON inventory of all components, data flows, boundaries, threats, and findings.
This file enables automated comparison between two threat model runs.

**When to generate:** Every run (Step 8b). Generated AFTER all markdown files are written.

**NOT linked in `0-assessment.md`** — this is a machine-readable artifact, not a human-readable report file.

### Schema

```json
{
  "schema_version": "1.0",
  "commit": "abc1234",
  "commit_date": "2025-08-15",
  "branch": "main",
  "analysis_timestamp": "2025-08-15T14:30:00Z",
  "repository": "https://github.com/org/repo",
  "report_folder": "threat-model-20250815-143000",

  "components": [
    {
      "id": "RedisStateStore",
      "display": "Redis State Store",
      "aliases": ["Redis", "StateStoreRedis"],
      "type": "data_store",
      "tmt_type": "SE.DS.TMCore.NoSQL",
      "boundary": "DataLayer",
      "boundary_kind": "ClusterBoundary",
      "source_files": ["helmchart/myapp/templates/redis-statefulset.yaml"],
      "fingerprint": {
        "component_type": "data_store",
        "boundary_kind": "ClusterBoundary",
        "source_files": ["helmchart/myapp/templates/redis-statefulset.yaml"],
        "source_directories": ["helmchart/myapp/templates/"],
        "class_names": [],
        "namespace": "",
        "api_routes": [],
        "config_keys": ["REDIS_HOST", "REDIS_PORT"],
        "dependencies": [],
        "inbound_from": ["InferencingFlow"],
        "outbound_to": [],
        "protocols": ["TCP"]
      },
      "sidecars": []
    }
  ],

  "boundaries": [
    {
      "id": "DataLayer",
      "display": "Data Layer",
      "aliases": ["Data Boundary", "Persistence Layer"],
      "kind": "ClusterBoundary",
      "contains": ["RedisStateStore", "VectorDB"],
      "contains_fingerprint": "RedisStateStore|VectorDB"
    }
  ],

  "flows": [
    {
      "id": "DF_InferencingFlow_to_Redis",
      "display": "DF25: InferencingFlow → Redis",
      "from": "InferencingFlow",
      "to": "RedisStateStore",
      "protocol": "TCP",
      "label": "State store operations",
      "bidirectional": true,
      "security": {
        "encryption": "none",
        "authentication": "none"
      }
    }
  ],

  "threats": [
    {
      "id": "T05.I",
      "identity_key": {
        "component_id": "RedisStateStore",
        "stride_category": "I",
        "attack_surface": "helmchart/values.yaml:redis.tls.enabled",
        "data_flow_id": "DF_InferencingFlow_to_Redis"
      },
      "title": "Information Disclosure — Redis unencrypted traffic",
      "description": "Redis state store transmits data without TLS...",
      "tier": 1,
      "prerequisites": "None",
      "affected_flow": "DF25",
      "mitigation": "Enable TLS on Redis connections",
      "status": "Open"
    }
  ],

  "findings": [
    {
      "id": "FIND-01",
      "identity_key": {
        "component_id": "RedisStateStore",
        "vulnerability": "CWE-306",
        "attack_surface": "helmchart/values.yaml:redis.auth"
      },
      "title": "Redis state store has no authentication",
      "severity": "Critical",
      "cvss_score": 9.4,
      "cvss_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N",
      "cwe": "CWE-306",
      "owasp": "A07:2025",
      "tier": 1,
      "effort": "Low",
      "related_threats": ["T05.I", "T05.T"],
      "evidence_files": ["helmchart/myapp/values.yaml"],
      "component": "Redis State Store"
    }
  ],

  "metrics": {
    "total_components": 15,
    "total_flows": 30,
    "total_boundaries": 7,
    "total_threats": 97,
    "total_findings": 18,
    "threats_by_tier": { "T1": 12, "T2": 53, "T3": 32 },
    "findings_by_tier": { "T1": 7, "T2": 7, "T3": 4 },
    "findings_by_severity": { "Critical": 4, "Important": 8, "Moderate": 6 },
    "threats_by_stride": { "S": 14, "T": 19, "R": 8, "I": 20, "D": 15, "E": 14, "A": 7 }
  }
}
```

> **⛔ stride_category MUST be a SINGLE LETTER:** `S`, `T`, `R`, `I`, `D`, `E`, or `A`. NEVER use full names like `"Spoofing"` or `"Denial of Service"`. The heatmap computation and comparison matching depend on single-letter codes. If you write `"stride_category": "Denial of Service"` instead of `"stride_category": "D"`, the heatmap will show all zeros for STRIDE columns while tier columns have correct values — this is a critical data integrity bug.

### Incremental Analysis Extensions

When generating `threat-inventory.json` for an **incremental analysis** (see `incremental-orchestrator.md`), add these fields:

**Top-level fields:**
- `"incremental": true` — marks this as an incremental report
- `"baseline_report": "threat-model-20260309-174425"` — path to baseline report folder
- `"baseline_commit": "2dd84ab"` — the commit SHA of the baseline report
- `"target_commit": "abc1234"` — the commit being analyzed
- `"schema_version": "1.1"` — incremental reports use schema version 1.1

**Per-component:** `"change_status"` — one of:
- `"unchanged"` — source files identical or cosmetic-only changes
- `"modified"` — security-relevant source file changes
- `"restructured"` — files moved/renamed, same logical component
- `"removed"` — source files deleted
- `"new"` — component didn't exist at baseline
- `"merged_into:{id}"` — merged into another component
- `"split_into:{id1},{id2}"` — split into multiple components

**Per-threat:** `"change_status"` — one of:
- `"still_present"` — threat exists in current code, same as before
- `"fixed"` — vulnerability was remediated (must cite code change)
- `"mitigated"` — partial remediation applied
- `"modified"` — threat still exists but details changed
- `"new_code"` — threat from a genuinely new component
- `"new_in_modified"` — threat introduced by code changes in existing component
- `"previously_unidentified"` — threat existed in baseline code but wasn't in old report
- `"removed_with_component"` — component was removed

**Per-finding:** `"change_status"` — same values as per-threat, plus:
- `"partially_mitigated"` — code changed partially, vulnerability partially remains

**metrics.status_summary** — counts per `change_status` for components, threats, and findings. See `incremental-orchestrator.md` §4f for the full schema.

### Canonical Naming Rules

**Component IDs** — Derived from actual class/file names, PascalCase:
- `SupportabilityAgent.cs` → `SupportabilityAgent`
- `PowerShellCommandExecutor.cs` → `PowerShellCommandExecutor`
- "Redis State Store" → `RedisStateStore`
- "Ingress-NGINX" → `IngressNginx`

**Flow IDs** — Deterministic from endpoints:
- Format: `DF_{Source}_to_{Target}`
- `DF_Operator_to_TerminalUI`
- `DF_InferencingFlow_to_RedisStateStore`

**Identity Keys** — Each threat and finding gets a canonical identity key:
- Threats: `component_id` + `stride_category` + `attack_surface` + `data_flow_id`
- Findings: `component_id` + `vulnerability` (CWE) + `attack_surface`
- These keys are independent of LLM-generated prose — they anchor to code artifacts

### Deterministic Identity Rules (MANDATORY)

Use these rules so repeated runs on unchanged code produce comparable inventories.

1. **Canonical ID vs display name**
  - `id` is stable identity; `display` is presentation text
  - Never derive identity from prose wording in findings or diagram labels

2. **Alias capture**
  - Every component and boundary must include an `aliases` array
  - Include discovered synonyms from architecture/DFD/STRIDE/findings (deduplicated, sorted)
  - Keep canonical `id` stable even if display wording changes across runs

3. **Boundary kind taxonomy (TMT-aligned)**
  - Use `boundary_kind`/`kind` from this set — describes the NATURE of the trust transition, not what's inside:
    - `MachineBoundary` — between different hosts/VMs (e.g., host ↔ guest, VM1 ↔ VM2)
    - `NetworkBoundary` — between network zones (e.g., corporate LAN ↔ internet, DMZ ↔ internal)
    - `ClusterBoundary` — between K8s/container cluster and outside (e.g., cluster ↔ external services)
    - `ProcessBoundary` — between OS processes or containers on same host (e.g., sidecar ↔ main container)
    - `PrivilegeBoundary` — between different privilege levels (e.g., user mode ↔ kernel, unprivileged ↔ admin)
    - `SandboxBoundary` — between sandboxed and unsandboxed execution (e.g., browser sandbox, WASM)
  - Each value answers: "what changes when you cross this line?" (different machine, network, cluster, process, privilege, sandbox)
  - Do NOT use component-grouping labels (DataStorage, ApplicationCore, AgentExecution) as boundary kinds — those describe WHAT's inside, not the nature of the trust transition

3b. **Boundary ID derivation** (MANDATORY — apply the same deterministic naming as components)
  - Derive boundary IDs from deployment/infrastructure names, NOT abstract concepts:
    - Docker host → `Docker` (never `DockerEnvironment` or `ContainerRuntime`)
    - Kubernetes cluster → `K8sCluster` (never `KubernetesEnvironment`)
    - Operator's machine → `OperatorWorkstation` (never `HostOS` or `LocalMachine`)
    - External cloud services → `ExternalServices` (never `CloudBoundary`)
    - Data storage grouped → `DataStorage` (never `DataLayer` or `PersistenceLayer`)
    - Backend application services → `BackendServices` (never `AppBoundary` or `ApplicationCore`)
    - ML/AI inference models → `MLModels` (never `InferenceModels` or `ModelBoundary`)
    - DMZ/public zone → `PublicZone` (never `DMZBoundary` or `IngressZone`)
    - Agent execution → `AgentExecution` (keep this exact ID)
    - Tool execution → `ToolExecution` (keep this exact ID)
  - Once a boundary ID is chosen in Step 1, use it EVERYWHERE (DFD, tables, JSON)
  - Never restructure containment between runs on the same code (same component → same boundary)

4. **Component fingerprint**
  - `fingerprint` must be built from stable evidence:
    - sorted `source_files` — full file paths to primary source files
    - sorted `source_directories` — parent directory paths of source files (more stable than filenames across refactors)
    - sorted `class_names` — primary class, struct, or interface names defined in the component's source files (e.g., `["HealthServer", "IHealthService"]`). For non-code components (datastores, external services), leave empty.
    - `namespace` — the primary namespace/package (e.g., `"MCP.Core.Servers.Health"` for C#, `"ragapp.src.ingestflow"` for Python). Empty for non-code components.
    - sorted `api_routes` — HTTP API endpoint patterns exposed by this component (e.g., `["/api/health", "/api/v1/chat"]`). Empty if not an HTTP service.
    - sorted `config_keys` — environment variables and configuration keys consumed by this component (e.g., `["AZURE_OPENAI_ENDPOINT", "REDIS_HOST"]`). Extract from appsettings.json, .env files, Helm values, or code that reads env vars.
    - sorted `dependencies` — external package/library dependencies specific to this component (e.g., `["Microsoft.SemanticKernel", "Azure.AI.OpenAI"]` for NuGet, `["pymilvus", "fastapi"]` for pip). Only include packages that are characteristic of this component, not framework-wide dependencies.
    - sorted `inbound_from` and `outbound_to` component IDs
    - sorted `protocols`
    - `component_type` and `boundary_kind`
  - Do not include mutable prose in the fingerprint
  - **Deterministic matching priority:** `source_directories` > `class_names` > `namespace` > `api_routes` > `config_keys` are all highly stable signals that survive component renames. Two components sharing any of these are almost certainly the same real component.

  **Fingerprint Field → Comparison Matching Signal Map:**
  | Fingerprint Field | Comparison Signal | Max Points | Stability |
  |---|---|---|---|
  | `source_files` | Signal 2 — Source file/directory overlap | +30 | High (files rarely move) |
  | `source_directories` | Signal 2 — Source file/directory overlap | +25 | Very High (directories almost never change) |
  | `class_names` | Signal 3 — Class/Namespace match | +25 | Very High (classes rarely rename) |
  | `namespace` | Signal 3 — Class/Namespace match | +20 | Very High (namespaces are structural) |
  | `api_routes` | Signal 4 — API route / Config key overlap | +15 | High (API contracts are versioned) |
  | `config_keys` | Signal 4 — API route / Config key overlap | +10 | High (config keys are stable) |
  | `dependencies` | Signal 4 — API route / Config key overlap | +5 | Medium (packages change with upgrades) |
  | `inbound_from` / `outbound_to` | Signal 5 — Topology overlap | +15 | Low (uses component IDs which may drift) |
  | `component_type` + `boundary_kind` | Signal 6 — Type + boundary kind | +10 | Medium (boundary naming may vary) |
  | `protocols` | (Not directly scored — used as tiebreaker) | — | Medium |

  **Every field in this table MUST be populated during analysis (Step 8b).** Empty arrays `[]` are acceptable when the field genuinely doesn't apply (e.g., `api_routes` for a datastore). But `source_directories` and `class_names` must NEVER be empty for process-type components — these are the primary matching anchors.

5. **Boundary containment fingerprint**
  - `contains_fingerprint` = sorted `contains` joined with `|`
  - Use this for boundary rename detection during comparison

6. **Deterministic ordering**
  - Sort all arrays and nested list fields before writing JSON
  - This makes diffs stable and prevents accidental churn

### Processing Rules

1. Generate AFTER all markdown files are written (Step 8b)
2. Populate from the same analysis data used to write the markdown files
3. Ensure component IDs use PascalCase derived from actual class/file names
4. Ensure flow IDs use the canonical `DF_{Source}_to_{Target}` format
5. All threat and finding identity keys must reference actual code artifacts (file paths, config keys)
6. Include git metadata from Step 1 (commit, branch, date)
7. The `metrics` object must match the counts in the markdown reports
8. This file is NOT listed in the Report Files table of `0-assessment.md`
9. Populate `aliases`, `boundary_kind`/`kind`, `fingerprint`, and `contains_fingerprint` for deterministic matching
10. If a component has multiple observed names in the same run, keep one canonical `id` and store all alternates in `aliases`

> **⚠️ CRITICAL — Array completeness:**
> The `threats` array MUST contain one entry for every threat listed in `2-stride-analysis.md`.
> The `findings` array MUST contain one entry for every finding in `3-findings.md`.
> The `components` array MUST contain one entry for every component in the Element Table.
> **Verify:** `threats.length == metrics.total_threats`, `findings.length == metrics.total_findings`,
> `components.length == metrics.total_components`. If mismatched, the JSON is incomplete — go back
> and add the missing entries. Do NOT truncate arrays to save space.

---

## Self-Check — Run After Writing Each File

⛔ **MANDATORY:** After writing each file, verify these checks and report results. Fix any ❌ before proceeding.

### After `2-stride-analysis.md`:
- [ ] Summary table appears BEFORE individual component sections
- [ ] 3 tier sub-sections per component (Tier 1, Tier 2, Tier 3)
- [ ] Status column uses only: `Open`, `Mitigated`, `Platform` (no `Accepted Risk`, no `Needs Review`)
- [ ] Platform ratio within limit (≤20% standalone, ≤35% K8s operator)
- [ ] Every threat has single-letter STRIDE category (S/T/R/I/D/E/A)

### After `3-findings.md`:
- [ ] 3 tier headings: `## Tier 1`, `## Tier 2`, `## Tier 3` (all present)
- [ ] Zero occurrences of "Accepted Risk" anywhere in the file
- [ ] Every finding has CVSS 4.0 vector string
- [ ] Action Summary: T1=Critical, T2=Elevated, T3=Moderate priorities
- [ ] 4th column header is "Assignment Rule" (not "Example")

### After `threat-inventory.json`:
- [ ] `threats.length == metrics.total_threats` (zero tolerance)
- [ ] `findings.length == metrics.total_findings` (zero tolerance)
- [ ] If threats > 50, used sub-agent/Python/chunked — NOT single `create_file`
- [ ] Every component has non-empty `fingerprint.source_directories`
- [ ] Arrays sorted by canonical key
- [ ] **Field names match schema exactly:** components use `display` (NOT `display_name`), threats use `stride_category` (NOT `category`), threat→component link is inside `identity_key.component_id` (NOT top-level `component_id`), threats have BOTH `title` (short name) AND `description` (longer prose) — NOT just `description` alone

### After `0-assessment.md`:
- [ ] Exactly 7 sections: Report Files, Executive Summary, Action Summary, Analysis Context & Assumptions, References Consulted, Report Metadata, Classification Reference
- [ ] `---` horizontal rule between every pair of `##` sections

---

## Enumeration Reference

All reports MUST use these exact values. Do NOT abbreviate, substitute, or invent alternatives.

**Component Types:** `process` | `data_store` | `external_service` | `external_interactor`

**Boundary Kinds (TMT-aligned):** `MachineBoundary` | `NetworkBoundary` | `ClusterBoundary` | `ProcessBoundary` | `PrivilegeBoundary` | `SandboxBoundary`

**Exploitability Tiers:** `Tier 1` (Direct Exposure — no prerequisites) | `Tier 2` (Conditional Risk — single prerequisite) | `Tier 3` (Defense-in-Depth — multiple prerequisites)

**STRIDE + Abuse Categories:** `S` Spoofing | `T` Tampering | `R` Repudiation | `I` Information Disclosure | `D` Denial of Service | `E` Elevation of Privilege | `A` Abuse

**SDL Bugbar Severity:** `Critical` | `Important` | `Moderate` | `Low`

**Remediation Effort:** `Low` | `Medium` | `High`

**Mitigation Type (OWASP-aligned):** `Redesign` | `Standard Mitigation` | `Custom Mitigation` | `Existing Control` | `Accept Risk` | `Transfer Risk`

**Threat Status:** `Open` | `Mitigated` | `Platform`

**Finding Change Status (incremental):** `Still Present` | `Fixed` | `New` | `New (Code)` | `New (Previously Unidentified)` | `Removed`

**OWASP Top 10:2025 suffix:** Always `:2025` (e.g., `A01:2025 – Broken Access Control`)
- [ ] Quick Wins, Needs Verification, Finding Overrides subsections present
- [ ] Deployment pattern documented (K8s operator vs standalone)
- [ ] All metadata values in backticks

**Also verify (applies to ALL files):** No leaked directives (⛔, RIGID, NON-NEGOTIABLE in output), no time estimates, no nested output folders. See `verification-checklist.md` Phase 0 for the full common deviation list.
