---
name: impediment-prioritization
description: 'Ranks any list of impediments and their countermeasures using a value-stream scoring model (ROI, Cost to Implement, Ease of Deployment, Risk Factor) and a fixed prioritization formula. Use when someone asks to prioritize, rank, sequence, or triage impediments, countermeasures, remediation items, risks, findings, gaps, action items, or backlog entries; or mentions value-stream prioritization, A3 / lean countermeasure ranking, ROI vs. effort scoring, or building a remediation / improvement backlog. Works with GHQR findings, audit results, retrospective action items, risk registers, architecture review gaps, or any free-form `{impediment, countermeasure}` list.'
license: MIT
metadata:
  author: ajenns
  version: "2.0.0"
  created: "2026-04-19"
  updated: "2026-04-21"
  framework: value-stream-prioritization
  domain: general
---

# Impediment Prioritization Skill

A domain-agnostic skill for ranking impediments and their countermeasures. Works with any `{impediment, countermeasure}` list — GHQR findings, audit results, retro action items, risk registers, architecture review gaps, etc.

## When to Activate

Activate when the user:
- Asks to prioritize, rank, sequence, or triage impediments, gaps, risks, findings, or remediation items
- Provides a list of impediments with proposed countermeasures (or asks you to propose countermeasures for a list of problems)
- Asks "what should we fix first" on any improvement / remediation backlog
- Mentions value-stream prioritization, A3 countermeasures, ROI-vs-effort, or lean impediment ranking

## Inputs

Accepted input: a list of `{impediment, countermeasure}` pairs. Sources include (non-exhaustive):

| Source | Maps to Impediment | Maps to Countermeasure |
|--------|---------------------|-------------------------|
| GHQR / health-check findings | Finding or gap (Status ≠ Expected) | Recommendation / expected value |
| Audit results | Non-conformance | Remediation action |
| Retrospective | "What went wrong" item | Agreed improvement |
| Risk register | Risk | Mitigation |
| Architecture review | Gap vs. target state | Proposed change |
| User free-form list | Problem statement | Proposed fix |

**Rules:**
- One countermeasure per impediment. If the input suggests multiple remediation paths, select the primary one and note alternatives in the rationale — do not emit multiple rows for the same impediment.
- Collapse duplicates before scoring.
- If a source link / citation is available, attach it to the countermeasure.
- If a confidence level is available on the source, surface it as an optional `Confidence` column.

## Scoring Rubric (1–10 scales)

Score each impediment's countermeasure against all four criteria. See [references/scoring-rubric.md](./references/scoring-rubric.md) for anchoring examples at the 1 / 5 / 10 levels across multiple domains (platform engineering, security, SRE, application development, governance).

| Criterion | Scale | Definition |
|-----------|-------|------------|
| **Return on Investment (ROI)** | 1 = low, 10 = high | Efficiency gain delivered by the countermeasure to this step AND to the overall value stream. Not purely financial — weight throughput, cycle-time reduction, defect removal, user / developer experience, and compliance lift. |
| **Cost to Implement** | 1 = inexpensive, 10 = very expensive | Human capital (salary + time of people needed) plus any purchases, licenses, or infrastructure required to implement the countermeasure. |
| **Ease of Deployment** | 1 = extremely hard, 10 = very easy | Remediation effort required to actually deploy the countermeasure end-to-end. Reflects technical complexity, change-management burden, and rollback risk. |
| **Risk Factor** | 1 = low risk, 10 = very high risk | Risk weighted on impact to the overall value stream if the countermeasure goes wrong, stalls, or is deferred. |

Every score must be accompanied by a one-line rationale. When a score is an estimate rather than drawn from explicit data, mark the rationale with `(estimated)`.

## Formula

```
Priority = ((ROI * (10 / Cost)) + (Ease * (10 / Risk))) / 2
```

- Theoretical range: **0.5 → 100**. Practical range on typical backlogs: ~1 → 100.
- The scale minimum of `1` guarantees Cost and Risk are never zero (no divide-by-zero).
- Higher Priority = do first.
- Boundary checks:
  - ROI=10, Cost=1, Ease=10, Risk=1 → `((10*10)+(10*10))/2 = 100`
  - ROI=1, Cost=10, Ease=1, Risk=10 → `((1*1)+(1*1))/2 = 1`

Use the formula verbatim. Do not reweight, normalize, or substitute.

## Method (agent procedure)

1. **Ingest** the impediment list. Confirm 1:1 impediment-to-countermeasure mapping; collapse duplicates.
2. **Confirm the countermeasure** for each impediment. Prefer documented best practice for the domain. Cite a public / authoritative link when one is available.
3. **Score** all four criteria using the rubric. Write a one-line rationale per criterion.
4. **Compute** Priority using the formula. Round to one decimal place.
5. **Sort** rows by Priority descending. Assign Rank starting at 1.
6. **Render** the output table (see below).
7. **Call out** the top 3 impediments with a short "why act first" paragraph.
8. **Optional tags**: if the workflow requires ownership flags (e.g., `[CSA Action Required]` vs. `[Customer Self-Service]` for GHQR/PAK, or `[Owner: Team X]` / `[Self-Service]` for internal backlogs), include them on the top-ranked items. Skip if not requested.

## Output Template

```markdown
## Prioritized Impediments

**Scoring:** ROI (1 low → 10 high), Cost (1 cheap → 10 expensive), Ease (1 hard → 10 easy), Risk (1 low → 10 high).
**Formula:** `Priority = ((ROI * (10/Cost)) + (Ease * (10/Risk))) / 2`

| Rank | Impediment | Countermeasure | ROI | Cost | Ease | Risk | Priority | Rationale |
|------|------------|----------------|-----|------|------|------|----------|-----------|
| 1 | [gap] | [action + link] | [n] | [n] | [n] | [n] | [n.n] | ROI: …<br>Cost: …<br>Ease: …<br>Risk: … |

### Top 3 — Act First
1. **[Impediment]** — [why it wins on the formula + optional ownership tag]
2. …
3. …
```

**Worked example (GitHub Enterprise adoption):**

| Rank | Impediment | Countermeasure | ROI | Cost | Ease | Risk | Priority | Rationale |
|------|------------|----------------|-----|------|------|------|----------|-----------|
| 1 | 2FA not enforced at org level | Enforce org-wide 2FA ([docs](https://docs.github.com/en/organizations/keeping-your-organization-secure/setting-up-two-factor-authentication/requiring-two-factor-authentication-in-your-organization)) | 9 | 2 | 8 | 2 | 42.5 | ROI: removes broad credential-compromise class<br>Cost: admin toggle + member comms<br>Ease: single org setting, members re-enroll<br>Risk: low — can stage with grace period |
| 2 | Secret scanning disabled | Enable secret scanning + push protection org-wide ([docs](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)) | 8 | 3 | 7 | 3 | 25.0 | ROI: catches leaked creds pre-merge<br>Cost: GHAS seats if not bundled (estimated)<br>Ease: org-level default<br>Risk: push-protection may block legitimate commits; stage per repo |
| 3 | No CODEOWNERS on critical repos | Add CODEOWNERS to top-20 repos ([docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)) | 6 | 4 | 6 | 4 | 15.0 | ROI: targeted review coverage<br>Cost: team time to define owners (estimated)<br>Ease: file-level change, but requires owner buy-in<br>Risk: review bottlenecks if owners undersized |

**Worked example (generic retrospective action items):**

| Rank | Impediment | Countermeasure | ROI | Cost | Ease | Risk | Priority |
|------|------------|----------------|-----|------|------|------|----------|
| 1 | Flaky test suite blocks deploys daily | Quarantine top-10 flaky tests + add retry policy | 9 | 2 | 8 | 2 | 42.5 |
| 2 | No on-call runbook for payment service | Draft runbook from last 3 incidents | 7 | 3 | 8 | 2 | 31.7 |
| 3 | Manual release notes take 2h/release | Generate from Conventional Commits via CI | 6 | 4 | 5 | 3 | 15.8 |

## Assumptions & Guardrails

- Scores are estimates informed by the rubric and any available source / citation. Mark estimated rationales explicitly with `(estimated)`.
- Never fabricate context (team size, budget, tool inventory, organizational constraints). If required, ask the user or mark the score as estimated.
- Final ranking is a recommendation — it should be reviewed with the accountable team / owner before it's committed to an execution plan.
- Read-only by default — this skill does not execute remediations; it produces a ranked list consumed downstream.

## Cross-References (optional, workflow-specific)

These references apply when the skill is used inside the GitHub Enterprise / GHQR / PAK workflow. They are not required for general use:

- **Upstream input:** `ghqr-analysis` skill (if present) — findings and recommendations become impediments and countermeasures.
- **Downstream consumer:** `pak-report-formatting` skill (if present) — the ranked table is inserted as the "Prioritized Impediments" section of the standard health check report.
- **Template integration:** Platform Health Check Guide findings template includes a Prioritized Impediments block.

For other workflows, the ranked table is the deliverable — wire it into whatever downstream artifact (Jira epic, ADR, OKR backlog, incident review, etc.) the user needs.
## When to Activate

Activate when the user:
- Asks to prioritize, rank, sequence, or triage impediments, gaps, or remediation items
- Provides a list of impediments with proposed countermeasures
- Pipes GHQR findings and wants a ranked remediation backlog
- Mentions value-stream prioritization, A3 countermeasures, or lean impediment ranking
- Asks "what should we fix first" in the context of a health check or adoption review

## Inputs

Primary input: **GHQR findings** (from the [ghqr-analysis](../ghqr-analysis/SKILL.md) skill) mapped 1:1 to impediments, each paired with a single countermeasure.

Also accepted: a free-form list of `{impediment, countermeasure}` pairs supplied by the user.

**GHQR → impediment mapping:**

| GHQR Element | Maps To |
|--------------|---------|
| Finding / gap (Status ≠ Expected) | Impediment |
| Recommendation / expected value | Countermeasure |
| Source link | Citation on the countermeasure |
| Confidence | Confidence column on the ranked output |

One countermeasure per impediment. If the source data suggests multiple remediation paths, select the primary one and note alternatives in the rationale — do not emit multiple rows for the same impediment.

## Scoring Rubric (1–10 scales)

Score each impediment's countermeasure against all four criteria. See [references/scoring-rubric.md](./references/scoring-rubric.md) for GitHub-specific anchoring examples at the 1 / 5 / 10 levels.

| Criterion | Scale | Definition |
|-----------|-------|------------|
| **Return on Investment (ROI)** | 1 = low, 10 = high | Efficiency gain delivered by the countermeasure to this step AND to the overall value stream. Not purely financial — weight throughput, cycle-time reduction, defect removal, developer experience, and compliance lift. |
| **Cost to Implement** | 1 = inexpensive, 10 = very expensive | Human capital (salary + time of people needed) plus any purchases required to implement the countermeasure. |
| **Ease of Deployment** | 1 = extremely hard, 10 = very easy | Remediation effort required to actually deploy the countermeasure end-to-end. Reflects technical complexity, change-management burden, and rollback risk. |
| **Risk Factor** | 1 = low risk, 10 = very high risk | Risk weighted on impact to the overall value stream if the countermeasure goes wrong, stalls, or is deferred. |

Every score must be accompanied by a one-line rationale. When a score is an estimate rather than drawn from explicit scan/user data, mark the rationale with `(estimated)`.

## Formula

```
Priority = ((ROI * (10 / Cost)) + (Ease * (10 / Risk))) / 2
```

- Theoretical range: **0.5 → 100**. Practical range on GHQR findings: ~1 → 100.
- The scale minimum of `1` guarantees Cost and Risk are never zero (no divide-by-zero).
- Higher Priority = do first.
- Boundary checks:
  - ROI=10, Cost=1, Ease=10, Risk=1 → `((10*10)+(10*10))/2 = 100`
  - ROI=1, Cost=10, Ease=1, Risk=10 → `((1*1)+(1*1))/2 = 1`

Use the formula verbatim. Do not reweight, normalize, or substitute.

## Method (agent procedure)

1. **Ingest** the impediment list (GHQR findings or user-provided pairs). Confirm 1:1 impediment-to-countermeasure mapping; collapse duplicates.
2. **Confirm the countermeasure** for each impediment. Prefer GitHub's documented best practice. Cite the public docs link.
3. **Score** all four criteria using the rubric and anchoring examples. Write a one-line rationale per criterion.
4. **Compute** Priority using the formula. Round to one decimal place.
5. **Sort** rows by Priority descending. Assign Rank starting at 1.
6. **Render** the output table (see below).
7. **Call out** the top 3 impediments with a short "why act first" paragraph. If any top-ranked item is `[CSA Action Required]` vs. `[Customer Self-Service]`, flag it explicitly per PAK universal rules.

## Output Template

```markdown
## Prioritized Impediments

**Scoring:** ROI (1 low → 10 high), Cost (1 cheap → 10 expensive), Ease (1 hard → 10 easy), Risk (1 low → 10 high).
**Formula:** `Priority = ((ROI * (10/Cost)) + (Ease * (10/Risk))) / 2`

| Rank | Impediment | Countermeasure | ROI | Cost | Ease | Risk | Priority | Rationale |
|------|------------|----------------|-----|------|------|------|----------|-----------|
| 1 | [gap] | [action + docs link] | [n] | [n] | [n] | [n] | [n.n] | ROI: …<br>Cost: …<br>Ease: …<br>Risk: … |

### Top 3 — Act First
1. **[Impediment]** — [why it wins on the formula + CSA vs. self-serve flag]
2. …
3. …
```

**Worked example:**

| Rank | Impediment | Countermeasure | ROI | Cost | Ease | Risk | Priority | Rationale |
|------|------------|----------------|-----|------|------|------|----------|-----------|
| 1 | 2FA not enforced at org level | Enforce org-wide 2FA ([docs](https://docs.github.com/en/organizations/keeping-your-organization-secure/setting-up-two-factor-authentication/requiring-two-factor-authentication-in-your-organization)) | 9 | 2 | 8 | 2 | 42.5 | ROI: removes broad credential-compromise class<br>Cost: admin toggle + member comms<br>Ease: single org setting, members re-enroll<br>Risk: low — can stage with grace period |
| 2 | Secret scanning disabled | Enable secret scanning + push protection org-wide ([docs](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)) | 8 | 3 | 7 | 3 | 25.0 | ROI: catches leaked creds pre-merge<br>Cost: GHAS seats if not bundled (estimated)<br>Ease: org-level default<br>Risk: push-protection may block legitimate commits; stage per repo |
| 3 | No CODEOWNERS on critical repos | Add CODEOWNERS to top-20 repos ([docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)) | 6 | 4 | 6 | 4 | 15.0 | ROI: targeted review coverage<br>Cost: team time to define owners (estimated)<br>Ease: file-level change, but requires owner buy-in<br>Risk: review bottlenecks if owners undersized |

## Assumptions & Guardrails

- Scores are estimates informed by the rubric and the cited GitHub documentation. Mark estimated rationales explicitly.
- Never fabricate customer-specific context (team size, budget, tool inventory). If required, ask the user or mark the score as estimated.
- Final ranking requires CSA confirmation before it is committed to a remediation plan or customer-facing report.
- Flag each top-ranked countermeasure as `[CSA Action Required]` or `[Customer Self-Service]` per PAK universal rules.
- Read-only by default — this skill does not execute remediations; it produces a ranked list consumed downstream.

## Cross-References

- **Upstream input:** [ghqr-analysis](../ghqr-analysis/SKILL.md) — findings and recommendations become impediments and countermeasures.
- **Downstream consumer:** [pak-report-formatting](../pak-report-formatting/SKILL.md) — the ranked table is inserted as the "Prioritized Impediments" section of the standard health check report, and feeds the "Prioritized Remediation Plan" execution view.
- **Template integration:** [Platform-Health-Check-Guide_v1.0.md](../../../kits/platform-health-check-kit/Platform-Health-Check-Guide_v1.0.md) — findings template includes a Prioritized Impediments block.
