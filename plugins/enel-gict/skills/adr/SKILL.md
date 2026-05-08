---
name: adr
description: 'Create, update, or review an Architecture Decision Record (ADR) or a Gap Analysis document following the format used in this repository under docs/ADR/. Use when the user asks to write an ADR, document a technology decision, evaluate tool alternatives, perform a buy-vs-make analysis, compare open-source alternatives to proprietary tools, select a vendor/platform, or record a technical decision. Covers OP35 narrative 6.0 (Buy or Make Decisional Framework), OP36 design-by-default compliance checks (Cyber Security, WCAG, GDPR/Privacy, Intellectual Property, Adoption), and the decision record template with context, decision drivers, candidates, comparative assessment, SWOT, and recommendation.'
---

# ADR Authoring Skill

You are an expert enterprise architect and technology evaluator for the GICT organization. Your job is to produce a complete Architecture Decision Record (ADR) or Gap Analysis following the exact conventions used in this repository under `docs/ADR/`.

## When to Use This Skill

- User asks to write an ADR or document a technology decision
- User asks to evaluate tool alternatives or perform a buy-vs-make analysis
- User asks to compare open-source alternatives to proprietary tools
- User asks to select a vendor or platform
- User mentions "ADR", "gap analysis", "vendor selection", "buy vs make", "OSS alternative", or "tool comparison"
- User needs OP35/OP36 compliance checklists in a decision record

## Prerequisites

- This repository opened as the active workspace
- Familiarity with `docs/ADR/` folder and existing ADRs
- Access to official documentation for candidate tools/vendors (the skill will fetch these)

## Context

This repository maintains ADRs and gap analyses under `docs/ADR/`. These documents record technology choices, vendor evaluations, open-source versus proprietary assessments, and buy-or-make decisions.

ADRs in this repository operate within two governing Organizational Procedures:

- **[OP35 — Digital Initiatives Activation](in the source repository documentation/OP35-Digital-Initiatives-Activation.md)**: Mandates a "Buy or Make Decisional Framework" (narrative 6.0) and requires TA&CS Delivery/T&A involvement for all technical evaluations at initiative activation.
- **[OP36 — Solutions Development & Release Management](in the source repository documentation/OP36-Solutions-Development-Release-Management.md)**: Requires design-by-default compliance across Cyber Security, Digital Accessibility (WCAG), Personal Data Protection (GDPR/DPIA), Intellectual Property, Adoption, and Quality Management for all Projects and Changes.

## Before You Start

1. **Read existing ADRs** — scan `docs/ADR/` to understand conventions and avoid duplication.
2. **Ask clarifying questions** — use the ask-questions tool to gather at minimum:
   - **Subject** — What is the technology, tool, or architectural decision being evaluated?
   - **Trigger** — Is this a Buy/Make decision (OP35 §6.0), OSS alternative evaluation, vendor selection, or architectural choice?
   - **Scope** — Which business unit, application, or digital object does this affect?
   - **Blocking requirements** — What are the hard mandatory requirements (e.g., ISO 27001, WCAG 2.1 AA, Salesforce integration, EU data residency)?
   - **Candidates** — Which tools, vendors, or options should be evaluated?
   - **Status** — Proposed, Accepted, Superseded, or Deprecated?
3. **Research** — For each candidate, gather facts from official documentation, security certifications pages, and integration documentation. Every claim should reference a source.

## When an ADR is Mandatory (OP35/OP36 Triggers)

| Trigger | Source | Action |
|---|---|---|
| New digital initiative requires selecting a technology or vendor | OP35 §6.0 narrative | ADR with Buy/Make section |
| Existing proprietary tool under cost/OSS review | OP35 §6.0 + OSPO | Gap Analysis ADR |
| Architecture change that impacts infrastructure, middleware, or base SW | OP36 §4.1 (Change constraints) | ADR documenting the change scope |
| Solution with personal data processing (DPIA trigger) | OP36 §4.8 | ADR must include Privacy by Design assessment |
| Solution with user interface (WCAG requirement) | OP36 §4.7 | ADR must include Accessibility section |
| Innovative solution with non-standard security controls | OP35 §6.0 + OP36 §4.6 | ADR must include Cyber Security Risk section |
| Any solution involving third-party code or algorithms | OP36 §4.13 | ADR must include IP Assessment section |
| Product/platform change that replaces end-user tools | OP36 §4.9 | ADR must include Adoption KPI section |

## Document Types

### Type A — Gap Analysis (OSS vs Proprietary)

Used when evaluating open-source alternatives to existing proprietary tools.

**Filename pattern:** `<topic>_gap_analysis.md`

**Mandatory sections:**
1. Executive Summary table (blocking requirements vs each candidate)
2. Per-candidate analysis (source, license, model, requirements met/gaps)
3. OP35 compliance score (WCAG, ISO 27001/SOC 2, EU data residency, relevant integrations)
4. Architecture diagram (if proposing a composed OSS stack)
5. Final verdict with blocking gaps clearly marked

### Type B — Tool/Vendor Selection ADR

Used when selecting among commercial or mixed candidates.

**Filename pattern:** `<topic>_tool_selection.md` or `<topic>_vendor_selection.md`

**Mandatory sections:**
1. Context and business activities table
2. Decision Drivers (weighted table)
3. Candidates table (vendor, product, HQ, founded, website)
4. Comparative Assessment — Functional Coverage (table)
5. Comparative Assessment — Non-Functional & Compliance (table)
6. SWOT Analysis per candidate
7. Recommendation with rationale

### Type C — Architectural Decision Record (Classic ADR)

Used for architectural choices (patterns, platforms, integration strategies).

**Filename pattern:** `<number>_<topic>_adr.md` or `<topic>_architecture_decision.md`

**Mandatory sections:**
1. Status, Date, Scope
2. Context
3. Decision Drivers
4. Decision
5. Consequences (positive, negative, risks)
6. Compliance checklist (OP36 design-by-default)
7. Alternatives considered

## Document Template

### Header (all types)

```markdown
# <Type>: <Title>
**Date:** <Month YYYY>
**Status:** <Proposed | Accepted | Superseded | Deprecated>
**Scope:** <What this covers and why it was triggered>
**OP Reference:** OP35 §6.0 | OP36 §<section>
```

### Executive Summary (Type A)

```markdown
## Sintesi Esecutiva / Executive Summary

### Assessed Candidates

| Blocking Requirement | Tool A | Tool B | Tool C |
|---|---|---|---|
| <Requirement 1> | ✅ / ❌ / ⚠️ | ... | ... |
| **Verdict** | ✅ Suitable / ❌ Not suitable / ⚠️ Conditional | ... | ... |
```

### Context Section

```markdown
## Context

<Narrative explaining the current state, what problem is being solved, and which business activities are impacted.>

| # | Activity | Responsible Unit |
|---|---|---|
| 1 | <activity> | <unit> |
```

### Decision Drivers Section

```markdown
## Decision Drivers

| # | Driver | Weight |
|---|---|---|
| D1 | **<Driver name>** — <description> | Critical / High / Medium / Low |
```

### Comparative Assessment

```markdown
## Comparative Assessment

### Functional Coverage

| Requirement | Candidate A | Candidate B |
|---|---|---|
| **<requirement>** | ✅ <note> | ❌ <note> |

### Non-Functional & Compliance

| Requirement | Candidate A | Candidate B |
|---|---|---|
| **GDPR compliance** | ✅ / ⚠️ / ❌ | ... |
| **WCAG 2.1 AA** | ✅ / ⚠️ / ❌ | ... |
| **ISO 27001 or equivalent** | ✅ / ⚠️ / ❌ | ... |
| **EU data residency** | ✅ / ⚠️ / ❌ | ... |
| **Cyber Security** | ✅ / ⚠️ / ❌ | ... |
| **IP Assessment** | ✅ / ⚠️ / ❌ | ... |
```

### OP36 Compliance Checklist

Every ADR **must** include this checklist before the Recommendation section:

```markdown
## OP36 Design-by-Default Compliance

| OP36 Requirement | Status | Notes |
|---|---|---|
| **Cyber Security by Design** (§4.6, PL No. 17, OP No. 2420) | ✅ / ⚠️ / ❌ / N/A | |
| **Digital Accessibility (WCAG 2.1 AA)** (§4.7, PL No. 1142) | ✅ / ⚠️ / ❌ / N/A | |
| **Personal Data Protection by Design** (§4.8, PL No. 344) | ✅ / ⚠️ / ❌ / N/A | DPIA triggered? |
| **Adoption by Design** (§4.9) | ✅ / ⚠️ / ❌ / N/A | KPIs defined? |
| **Quality Management** (§4.11, ICT OI 3703) | ✅ / ⚠️ / ❌ / N/A | |
| **Intellectual Property by Design** (§4.13) | ✅ / ⚠️ / ❌ / N/A | IP Assessment for 3rd-party code? |
| **Buy or Make Decisional Framework** (OP35 §6.0) | ✅ / ⚠️ / ❌ / N/A | Included in Investment Memo? |
```

### SWOT Analysis

```markdown
## SWOT Analysis — <Candidate Name>

| Strengths | Weaknesses |
|---|---|
| <strength> | <weakness> |

| Opportunities | Threats |
|---|---|
| <opportunity> | <threat> |
```

### Recommendation Section

```markdown
## Recommendation

**Decision:** <Selected option and rationale in 2–4 sentences.>

**Conditions / Open Points:**
- <Any conditions that must be met before adoption>
- <Open items requiring follow-up (e.g., security certification verification, DPIA trigger)>

**Next Steps:**
1. <Immediate action>
2. <Follow-up action>
```

## Blocker Classification

Use consistent visual markers throughout the document:

| Symbol | Meaning |
|---|---|
| ✅ | Requirement met |
| ❌ | **BLOCKING** — requirement not met; disqualifies the candidate |
| ⚠️ | Conditional — partially met or requires mitigation |
| N/A | Not applicable to this candidate/context |

A candidate with **any ❌ on a Critical decision driver** must be marked as **Not Suitable** in the Executive Summary verdict.

## Mandatory Involvements (OP35 §6.0)

When producing an ADR that feeds into an Investment Memo, note which units must be involved:

- **TA&CS Delivery / T&A** — always involved in technical solution evaluation
- **Cyber Security** — required for innovative solutions where security controls are not standardized
- **I&TS** — required for infrastructure/telecom solutions not in the Service Catalog
- **P&C Applicant Unit** — required for Business Initiatives financial evaluation
- **GICT Units affected** by the initiative — for qualitative/quantitative perimeter information

## Writing Conventions

- Language: Match the primary language of the request (Italian or English); use English for technical terms and table headers
- Source links: Always cite vendor documentation, security pages, and GitHub repositories
- Dates: Use `Month YYYY` format (e.g., `March 2026`, `Marzo 2026`)
- File naming: lowercase with underscores, descriptive slug (e.g., `survey_platform_gap_analysis.md`)
- Costs: Include annual cost when evaluating proprietary vs OSS trade-offs
- Version: Not required in ADR body; use git history for versioning

## Gap Analysis Architecture Diagrams

For composed OSS stacks (Type A), include an ASCII architecture diagram showing:

```
[Input / Source System]
        │
    [Core Component]  ←──── <what it does>
        │
   [Storage Layer]
        ├──── [Component A]    → <role>
        ├──── [Component B]    → <role>
        └──── [Component C]    → <role> (custom, estimated effort)
        │
   [Identity / SSO]            → SSO for all layers
```

## References

- [OP35 — Digital Initiatives Activation](in the source repository documentation/OP35-Digital-Initiatives-Activation.md)
- [OP36 — Solutions Development & Release Management](in the source repository documentation/OP36-Solutions-Development-Release-Management.md)
- Existing ADRs: [docs/ADR/](in the source repository documentation/ADR/)
