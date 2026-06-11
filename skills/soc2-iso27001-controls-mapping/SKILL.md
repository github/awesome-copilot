---
name: soc2-iso27001-controls-mapping
description: |
  Map SOC 2 Trust Services Criteria and ISO 27001 Annex A controls to a real cloud stack — identifying the technical implementation, evidence source, and audit artifact for every control in scope.
  Use this skill when:
  - Preparing for a SOC 2 Type II or ISO 27001 audit ("we have a SOC 2 audit in Q3 — are we ready?")
  - Designing controls for a new service so it lands in audit scope cleanly
  - Running a gap analysis of existing controls against either framework
  - Producing audit evidence for a specific criterion ("auditor wants evidence for CC6.1")
  - Scoping the compliance impact of an architectural change
  - Deduplicating evidence across both frameworks
  Includes a worked Azure evidence reference (Entra ID, Defender for Cloud, Log Analytics KQL, Terraform state).
---

# SOC 2 / ISO 27001 Controls Mapping

## When to use

Trigger this skill when the question touches compliance for a cloud estate: producing audit evidence, designing a control for a new system so it lands in scope, gap-analyzing existing controls against SOC 2 / ISO 27001, or scoping the compliance impact of an architectural change. Common triggers: "we have a SOC 2 audit in Q3 — are we ready," "what's the audit story for this new service," "map our existing controls to ISO 27001 Annex A," "auditor wants evidence for CC6.1."

Do **not** use this skill for: general security architecture design (compliance mapping assumes the security controls exist; designing them is a separate task), code-level security review of a PR, or threat modeling — those deserve their own focused sessions.

## The critical decision rule — controls without evidence are aspirations

A control that exists only as policy text is not a control; it's a wish. SOC 2 and ISO 27001 assessments demand *evidence* that the control is implemented, operating, and producing observable artifacts. For every control in scope, three things must exist:

1. **A technical implementation** (RBAC rule, encryption setting, logging configuration, code path)
2. **An evidence source** (identity-provider sign-in logs, cloud activity logs, CSPM findings, IaC commit history)
3. **An audit artifact** the assessor can read (report, query result, screenshot, attestation)

If any of the three is missing, the control is failing — even if the *intent* is correct. Most audit failures come from #2 and #3, not #1.

## The framework selector

The two frameworks overlap heavily. Pick the lead framework for evidence collection; the other follows.

| Question | Lead framework | Reference |
|---|---|---|
| US enterprise customer demands SOC 2 Type II report | **SOC 2** | `references/soc2-trust-services-criteria.md` |
| European / global customer demands ISO 27001 certification | **ISO 27001** | `references/iso27001-annex-a.md` |
| Want both, want to deduplicate evidence | Pick SOC 2 first (more prescriptive); map ISO 27001 controls to the same evidence | Both references |
| Auditor asks where the evidence lives (Azure estate) | n/a | `references/evidence-sources-azure.md` |

For control-by-control mapping with implementation hooks, see the references.

## The evidence-source taxonomy

Audit evidence in a cloud estate comes from six source types. Knowing which source backs which control speeds preparation dramatically. The third column gives the Azure instance of each source; AWS and GCP have direct equivalents.

| Source type | What it gives you | Azure example |
|---|---|---|
| **Identity-provider sign-in & audit logs** | Authentication events, admin actions, MFA enforcement | Entra ID sign-in / audit logs |
| **Cloud control-plane activity log** | Subscription/account-level admin, IAM, and resource changes | Azure Activity Log |
| **Log platform / observability store** | Application logs, alert history, query-able audit data | Azure Monitor / Log Analytics |
| **CSPM (cloud security posture management)** | Security posture score, regulatory compliance dashboard, vulnerability findings | Microsoft Defender for Cloud |
| **SIEM** (if in use) | Correlated events, incident records, response timelines | Microsoft Sentinel |
| **IaC state + git history** | Configuration over time: timestamped, authored, code-reviewed | Terraform state + git log |

Retention matters as much as existence: a Type II audit covers a period (typically 12 months), so sources with 30–90 day default retention must be exported to a longer-lived store. For Azure-specific evidence pulls, KQL queries, and retention configuration, see `references/evidence-sources-azure.md`.

## Control-mapping logic

1. **Establish the audit boundary.** Which services, which environments (typically production only), which data classifications are in scope? Write this down before mapping. Out-of-scope systems don't need controls evidence.

2. **Pick the lead framework.** SOC 2 if US-customer-driven; ISO 27001 if EU/global. The mapping between the two is dense enough that evidence collected for one largely satisfies the other; documenting it under the lead framework first prevents duplication.

3. **For each in-scope service, walk the controls.** Use the per-framework references:
   - SOC 2: walk Common Criteria (CC1–CC9) and any additional categories you're claiming (A — Availability; C — Confidentiality; PI — Processing Integrity; P — Privacy). See `references/soc2-trust-services-criteria.md`.
   - ISO 27001: walk Annex A controls (themed A.5–A.8 in ISO 27001:2022, with 2013 cross-references where relevant). See `references/iso27001-annex-a.md`.

4. **For each control, fill three fields:** implementation (what does it), evidence source (where it logs / records), audit artifact (what the assessor reads).

5. **Identify gaps.** A gap is a control claimed in policy with no evidence chain. The remediation is either (a) implement the missing piece, (b) revise the policy to match reality, or (c) accept the risk with documented rationale. Gaps without one of those three outcomes fail the audit.

6. **Produce the audit-evidence pack.** A single document (or directory) per control, with the implementation summary, the evidence query / artifact, and the auditor-readable result. The first audit will demand this; later audits use the same pack with updated queries.

## Worked example — mapping an existing payment service for a SOC 2 Type II readiness review

Setup: existing `payment-service` running on Azure Container Apps in `rg-payment-prod`. SOC 2 Type II readiness review in 6 weeks. Service handles PCI-adjacent data (no card numbers; just transaction metadata) but is in audit scope due to revenue role. Need: control-map, evidence sources, remediation list. (The same walk applies on AWS or GCP with the equivalent sources substituted.)

Decision walk:

1. **Audit boundary.** In scope: `payment-service` production environment, including its Postgres database, Service Bus topics, Key Vault. Out of scope: developer laptops, non-prod environments.
2. **Lead framework: SOC 2.** US enterprise customers are driving the assessment. ISO 27001 mapping done as a side-deliverable.
3. **Walk Common Criteria.** Sample mapping:
   - **CC6.1 — Logical access controls.** Implementation: Entra ID auth at the API gateway; per-endpoint authorization in the application framework. Evidence: Entra ID sign-in logs (exported to Log Analytics, 1-year retention); Defender for Cloud regulatory compliance dashboard. Artifact: KQL query showing sign-ins per identity for the audit period; Defender export per quarter. See `references/soc2-trust-services-criteria.md` for the CC6.1 detail.
   - **CC6.6 — Encryption at rest.** Implementation: Postgres Flexible Server with encryption enabled by default; Storage accounts with platform-managed keys (or customer-managed keys if PII). Evidence: Defender for Cloud encryption posture; Terraform state showing encryption flags. Artifact: Defender compliance dashboard export; `terraform show` output filtered for encryption attributes.
   - **CC7.2 — System monitoring & alerting.** Implementation: Application Insights / Log Analytics with alert rules committed to IaC. Evidence: alert configuration in Terraform; alert history in Log Analytics. Artifact: list of active alerts + history of fires + response times.
4. **Identify gaps.** Two found:
   - **CC8.1 — Change management.** All changes go through PR review (good); but the audit trail "who approved this PR" lives only in GitHub, not in a tracked audit-evidence store. Risk: GitHub data isn't part of the standard evidence collection. *Remediation:* export PR approval data quarterly to a storage container; reference it as the evidence artifact for CC8.1.
   - **CC7.4 — Vulnerability management.** CSPM is enabled (good), dependency scanning runs in CI (good), but there's no documented process for triaging findings. *Remediation:* add a runbook section: "critical findings → on-call ticket within 24h; high findings → review within 7 days; medium → quarterly review." Track remediation timelines.
5. **Produce the evidence pack.** Directory `compliance/payment-service-soc2/` with one file per Common Criterion in scope: `cc6.1-logical-access.md`, `cc6.6-encryption-at-rest.md`, etc. Each file: control text → implementation summary → evidence query (KQL or pointer) → sample artifact (sanitized).
6. **Cross-reference ISO 27001.** Same evidence packs satisfy the corresponding ISO 27001 access-control, cryptography, and operations controls. See the SOC 2 ↔ ISO 27001 mapping table in `references/iso27001-annex-a.md`.

## Anti-pattern — policy without implementation

**Bad:** the team writes an "Information Security Policy" document declaring "All access is least-privilege, all data is encrypted, all changes are reviewed, all incidents are tracked." None of these have a corresponding implementation, evidence source, or artifact. The policy exists for compliance paperwork.

**Why it fails:** auditors ask "show me." Policy text without evidence chain produces audit findings ("control claimed; no evidence of operation"). The team scrambles to retrofit evidence during the audit, often with reduced quality and credibility. Type II audits look at *operating effectiveness* over a period — retroactive evidence doesn't satisfy that.

**Detection signal:** the policy exists; the team can't immediately answer "where does this control's evidence live?" for any given clause. Or: the policy document is 30 pages long but the CSPM posture score is poor.

**Fix:** invert the work. Start from what the stack *actually* enforces (CSPM posture, identity-provider logs, activity logs, IaC-enforced configuration), map those to SOC 2 / ISO 27001 controls, and *then* write the policy text to match. The policy describes the implemented reality; the evidence is the standing proof.

## Verification questions

Before calling the mapping done:

1. For every in-scope service: is there an audit-evidence document per Common Criterion (SOC 2) or per Annex A control (ISO 27001)?
2. For every control: are all three of (implementation, evidence source, audit artifact) filled in?
3. For evidence sources: do they have sufficient retention for a Type II audit period (12 months typical)?
4. If a CSPM regulatory-compliance dashboard is available: is the SOC 2 / ISO 27001 standard enabled, and is the posture score trended over the audit period?
5. Are gaps (controls without evidence) explicitly tracked with remediation owners and dates?
6. Is the policy text consistent with the implementation, or does it claim controls the implementation doesn't deliver?

## References

- `references/soc2-trust-services-criteria.md` — per-criterion implementation hooks and evidence sources (CC1–CC9 plus Availability, Confidentiality, Processing Integrity, Privacy)
- `references/iso27001-annex-a.md` — per-control mapping for ISO 27001:2022, the SOC 2 ↔ ISO 27001 equivalence table, Statement of Applicability template, and 2013 → 2022 transition notes
- `references/evidence-sources-azure.md` — worked Azure evidence reference: KQL queries per control, Defender for Cloud dashboard pulls, Terraform state queries, retention configuration, and the audit-evidence pack directory structure

> Compliance scoping note: this skill helps engineers build the evidence chain. It does not replace a qualified auditor, and control interpretations vary by assessor — confirm scope and evidence expectations with your audit firm.
