# SOC 2 Trust Services Criteria — Implementation Hooks for the Azure Stack

The Trust Services Criteria (TSC) are the SOC 2 control framework. Common Criteria (CC1–CC9) are required for every SOC 2 report. Additional categories (Availability, Confidentiality, Processing Integrity, Privacy) are claimed selectively based on customer needs. This reference maps each criterion to its Azure-stack implementation, evidence source, and audit artifact.

## How to use this document

For each control your audit scope covers:

1. Read the criterion's intent (one paragraph in the AICPA documentation; summarized here)
2. Match it to the implementation column for this stack
3. Verify the evidence source is producing the data
4. Produce the audit artifact (query, screenshot, or report)

Where multiple implementations could satisfy a control, prefer the simpler one. Where the stack has no native answer, document the gap honestly (not fudged).

## Common Criteria (CC1–CC9) — required for every SOC 2 report

### CC1 — Control Environment

CC1 is about governance: organizational structure, accountability, ethics, board oversight. This is policy-and-people territory, not infrastructure. The stack doesn't speak to CC1 directly; the audit artifact is the org chart, board minutes, and the policy document set.

| Sub-criterion | Implementation | Evidence | Artifact |
|---|---|---|---|
| CC1.1 — Integrity and ethical values | Code of Conduct policy; security awareness training | HR records; LMS completion records | Policy doc + training completion report |
| CC1.2 — Board independence and oversight | Board / advisory composition | Board meeting minutes | Quarterly board minute extracts |
| CC1.3 — Structures, reporting lines | Org chart; role definitions | HR system | Current org chart |
| CC1.4 — Competence | Hiring criteria; performance reviews | HR records | Sample hiring rubrics and review records |
| CC1.5 — Accountability | Role responsibility matrices | RACI documents | Documented owner lists for each system |

For a small-company scope, CC1 is a documentation exercise; the artifacts are written, not extracted.

### CC2 — Communication and Information

About information flow internally and externally — security policies communicated to staff, customer commitments disclosed.

| Sub-criterion | Implementation | Evidence | Artifact |
|---|---|---|---|
| CC2.1 — Information requirements | Service description in `README.md`; ADRs | Git history | Docs export per service |
| CC2.2 — Internal communication | Slack / Teams + documented escalation | Slack archives (where relevant) | Sample incident communication |
| CC2.3 — External communication | Customer-facing documentation; security page | Public docs | Snapshot of public security commitments |

### CC3 — Risk Assessment

About identifying and assessing risks to the organization's objectives.

| Sub-criterion | Implementation | Evidence | Artifact |
|---|---|---|---|
| CC3.1 — Objectives specified | Engineering / product objectives documented | OKRs / strategy docs | Quarterly objectives doc |
| CC3.2 — Risk identification | Threat model per system; risk register | Threat-model docs; risk-register spreadsheet | Per-system threat model docs |
| CC3.3 — Fraud risk | Specific to financial-data systems | Risk register | Documented fraud risk analysis |
| CC3.4 — Change risk | Each significant change carries a risk assessment | ADR / change records | Sample ADRs showing risk analysis |

For threat-model evidence, the artifact is the per-system threat model doc — one per externally-reachable service at minimum.

### CC4 — Monitoring Activities

About the organization monitoring its own controls — control health checks, internal audit.

| Sub-criterion | Implementation | Evidence | Artifact |
|---|---|---|---|
| CC4.1 — Ongoing monitoring | Quarterly control-health reviews on a documented cadence | Review logs (or commits) | Review completion record |
| CC4.2 — Deficiency communication | Identified deficiencies tracked and reported | Issue tracker queries | Sample deficiency tickets with resolution |

### CC5 — Control Activities

About selecting and developing controls — the policy framework.

| Sub-criterion | Implementation | Evidence | Artifact |
|---|---|---|---|
| CC5.1 — Control selection | Security policies (encryption, access, change management) | Policy docs | Current policy set |
| CC5.2 — General controls over technology | This skill's mapping; Terraform-enforced config | Terraform repos; IaC commit history | `terraform show` output for production |
| CC5.3 — Policies and procedures | Operational runbooks per service | `docs/runbook.md` per service | Runbook directory snapshot |

### CC6 — Logical and Physical Access

The heaviest CC category for cloud infrastructure. Most direct mapping to Azure controls.

| Sub-criterion | Implementation | Evidence source | Artifact |
|---|---|---|---|
| **CC6.1 — Logical access** (the big one) | Entra ID for all user / service access; Managed Identity for Azure resources; per-tool authorization; OAuth 2.1 for APIs | Entra ID sign-in logs; Entra ID audit logs; Conditional Access policies | KQL query: sign-ins per identity over audit period; CA policy export; sample of denied vs. granted accesses |
| CC6.2 — User authentication | MFA enforced via Conditional Access; password policies in Entra ID | Entra ID audit; CA policy state | CA policy export; MFA enrollment report |
| CC6.3 — User access termination | JML (joiner-mover-leaver) process; offboarding removes Entra ID access | HR-IT integration log; Entra ID audit | Sample offboarding audit trail |
| CC6.4 — Restricted access to assets | Network access scoped via NSGs, private endpoints; data tier private-only | Network Watcher; Azure Resource Graph queries on `public_network_access_enabled` | Resource Graph query result; sample NSG rules |
| CC6.5 — Restricted access to programs and data | RBAC at subscription / RG / resource level; least-privilege deploy identities | Azure Role Assignments; PIM activation logs (if used) | Role assignment export; PIM activity report |
| **CC6.6 — Encryption at rest** | All data resources: TDE for Postgres / Azure SQL; SSE for Storage; encryption-at-rest on Cosmos; Customer-Managed Keys (CMK) for sensitive workloads | Defender for Cloud encryption posture; Terraform state | Defender compliance dashboard export; `terraform show` filtered for encryption attributes |
| **CC6.7 — Encryption in transit** | TLS 1.2+ enforced on all endpoints; mTLS for service-to-service via Container Apps managed cert or App Gateway; Service Bus enforces TLS | TLS configuration in IaC; Defender posture | TLS version configuration export |
| CC6.8 — Vulnerability management | Defender for Cloud + Defender for Containers; `govulncheck` (Go) / `mvn dependency-check` (Java) in CI; image scan post-merge | Defender findings list; CI run logs | Defender finding inventory; CI run sample showing scans |

### CC7 — System Operations

About operational management of the systems.

| Sub-criterion | Implementation | Evidence | Artifact |
|---|---|---|---|
| CC7.1 — Capacity / availability | KEDA autoscaling rules; documented resource sizing | Container Apps scaling history; Azure Monitor metrics | Scaling history export; baseline-load graphs |
| **CC7.2 — System monitoring & alerting** | Application Insights / Log Analytics; alert rules committed to IaC; SLO tracking per service | Alert configuration in Terraform; alert history in Azure Monitor | Active-alert list; alert-fire history with response timelines |
| CC7.3 — Anomaly detection | Defender for Cloud anomaly detection; Sentinel correlation rules (if in use) | Defender / Sentinel alerts | Alert sample with disposition |
| CC7.4 — Vulnerability remediation | Triage runbook for Defender findings; CVE patching SLAs per severity | Issue tracker queries on security tickets | Sample remediation tickets with timestamps |
| CC7.5 — Incident response | Runbooks per `docs/runbook.md`; on-call rotation; post-incident reviews | Incident records; runbook executions | Sample incident timeline with response steps |

### CC8 — Change Management

About controlled changes to systems.

| Sub-criterion | Implementation | Evidence | Artifact |
|---|---|---|---|
| **CC8.1 — Change management process** | Every change via PR with required review; CI gates; environment-promoted via OIDC pipelines | GitHub PR data; CI run logs; deployment records | Quarterly export: PRs merged, approvers, CI status, deploy times |
| CC8.2 — Emergency changes | Hotfix process with same-day post-mortem requirement | Hotfix ADRs | Sample hotfix records |
| CC8.3 — Change testing | PR-gate tests + post-merge integration tests | CI artifacts | Test coverage and run history |

For CC8.1 evidence retention: GitHub keeps PR history; export the relevant data periodically (e.g., quarterly) to a Storage container with the standard audit retention.

### CC9 — Risk Mitigation

About controls over specific risk areas.

| Sub-criterion | Implementation | Evidence | Artifact |
|---|---|---|---|
| CC9.1 — Risk identification specific to objectives | Per-system risk register | Risk-register docs | Current risk register |
| CC9.2 — Vendor / business-partner risk | Subprocessor list; vendor security reviews | Vendor management records | Subprocessor list; sample vendor security questionnaire response |

## Additional categories (selectively claimed)

### Availability

| Control | Implementation | Evidence | Artifact |
|---|---|---|---|
| A1.1 — Availability requirements | SLO docs per service | SLO definitions | SLO inventory |
| A1.2 — Environmental protection / redundancy | Multi-zone deployment in Container Apps; backup config on data tier | Terraform state; backup history | Resource configuration export; backup retention proof |
| A1.3 — Backup and recovery | Daily backups; documented RPO / RTO; quarterly restore tests | Backup retention policy; restore-test logs | Sample restore-test report |

### Confidentiality

| Control | Implementation | Evidence | Artifact |
|---|---|---|---|
| C1.1 — Confidential information identification | Data classification (PCI / PII / PHI / public) | Data classification policy; resource tags | Tag query: `where classification != ''` |
| C1.2 — Confidential information disposal | Soft-delete + retention on data tier; documented deletion process for end-of-life data | Storage / DB retention policies | Retention policy export |

### Processing Integrity

| Control | Implementation | Evidence | Artifact |
|---|---|---|---|
| PI1.1 — Processing accuracy | Input validation; idempotency keys on mutating APIs; integration testing | Test coverage; idempotency-key usage in API code | Code-review evidence; coverage reports |
| PI1.2 — System inputs are validated | OpenAPI schema validation; service-layer validation | Code review evidence; API schema | Sample OpenAPI specs; sample validation code |

### Privacy

| Control | Implementation | Evidence | Artifact |
|---|---|---|---|
| P1 — Notice | Privacy notice published | Public privacy page | Snapshot |
| P2 — Choice / consent | Consent management platform (typically a frontend concern) | Consent records | Sample consent-event logs |
| P3 — Collection | Minimal data collection; documented purpose | Data inventory | Field-level inventory |
| P4 — Use, retention, disposal | Retention policy; soft-delete + hard-delete | Retention policy | Policy + sample purge logs |
| P5 — Access | Data subject access request (DSAR) procedure | Request log | Sample DSAR with response time |
| P6 — Disclosure | Sharing only via documented contracts | Subprocessor list | Sample data sharing agreement |
| P7 — Quality | Data correction procedure | Sample correction events | Audit trail of corrections |
| P8 — Monitoring and enforcement | Monitoring of privacy controls | Monitoring runbook | Quarterly privacy review |

## SOC 2 readiness checklist

Before kicking off a Type II audit:

1. **Scope confirmed.** Which services, environments, data classifications? Documented and signed off.
2. **Common Criteria + selected additional categories chosen.** Most teams: CC + Availability + Confidentiality. Add Processing Integrity if transaction-correctness matters; Privacy only if personal data is in scope.
3. **Per-control evidence chain.** Every control has implementation, source, artifact. Gaps documented.
4. **Evidence retention.** Source data is retained for the Type II audit period (typically 12 months). Log Analytics workspace retention is sufficient.
5. **Defender for Cloud regulatory compliance dashboard.** SOC 2 standard enabled, Secure Score trended.
6. **Audit-evidence pack.** Directory under `compliance/<service>-soc2/` per scoped service; one file per control.
7. **Auditor walkthrough rehearsal.** Internal dry-run before the auditor's first interview; identifies missing evidence cheaply.

## Common gaps in this stack

- **CC8.1 retention.** GitHub PR data isn't a permanent audit source by default. Export quarterly.
- **CC7.5 incident records.** Slack incident channels are not audit-grade. Use an issue tracker (GitHub Issues, Azure DevOps Boards) for incident records with timestamps.
- **A1.3 restore tests.** Many teams document the backup but never test the restore. Schedule quarterly.
- **CC6.5 PIM.** Privileged Identity Management is the right answer for elevated access in production; many teams use long-lived role assignments. Switching to PIM tightens this gap; document the activation history.

## Mapping to ISO 27001

SOC 2 controls map closely to ISO 27001 Annex A. Key mappings:

- CC6.1 ↔ A.9 (Access Control)
- CC6.6, CC6.7 ↔ A.10 (Cryptography)
- CC6.8 ↔ A.12.6 (Vulnerability Management)
- CC7.2, CC7.5 ↔ A.16 (Information Security Incident Management)
- CC8.1 ↔ A.14 (Change Management)
- CC3.2 ↔ A.6 (Information Security Organization, including risk assessment)

For the full mapping, see `iso27001-annex-a.md`.
