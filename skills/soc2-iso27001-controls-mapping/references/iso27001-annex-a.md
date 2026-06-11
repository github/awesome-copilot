# ISO 27001 Annex A — Implementation Hooks for the Azure Stack

ISO 27001 Annex A defines the control catalog. The 2022 revision restructured 114 controls (2013 version) into 93 controls grouped under 4 themes: Organizational (A.5), People (A.6), Physical (A.7), Technological (A.8). This reference maps each themed control area to the Azure-stack implementation, evidence source, and audit artifact.

**Note on versions:** ISO/IEC 27001:2022 is the current standard; the 2013-version transition deadline (October 2025) has passed. Verify the current expectation with your certification body. The mapping below uses 2022 terminology with 2013 control numbers cross-referenced where relevant.

## How to use this document

For each in-scope control:

1. Identify the implementation in this stack
2. Identify the evidence source (Azure, Entra ID, IaC, runbooks)
3. Produce the audit artifact

Where SOC 2 already covers the same ground, point at the SOC 2 evidence pack rather than duplicating.

## A.5 — Organizational controls (37 controls in 2022)

The largest section. Policies, roles, third-party management, threat intelligence, asset management, classification, access policy, identity, authentication, cryptography.

| Control (2022) | Implementation | Evidence | Artifact |
|---|---|---|---|
| A.5.1 — Information security policies | Documented policy set | Policy docs in git | Current policy doc set |
| A.5.2 — Information security roles | RACI per system | Documented RACI | Owner list per service |
| A.5.7 — Threat intelligence | Subscribe to relevant CTI feeds; Defender for Cloud Threat Intelligence | Defender posture; CTI subscriptions | Sample finding triage |
| A.5.8 — Information security in project management | Threat-model-per-project requirement | Threat-model docs | Threat models inventory |
| A.5.9 — Inventory of information and other associated assets | Azure Resource Graph queries; resource tags | Tagged resource inventory | `az graph query` output for the audit period |
| A.5.10 — Acceptable use of information and other associated assets | Acceptable use policy | Policy doc | Current AUP |
| A.5.11 — Return of assets | Offboarding checklist (Entra ID access removal, hardware return) | HR-IT integration record | Sample offboarding audit |
| A.5.12 — Classification of information | Data classification policy + resource tags (`classification = pii | pci | confidential | public`) | Tag inventory | Tag query result |
| A.5.13 — Labelling of information | Tag-based labeling | Tag inventory | Tag-based queries |
| A.5.14 — Information transfer | Encrypted transfer (TLS) + documented channels for external transfer | TLS posture; data transfer agreements | Sample DPAs |
| A.5.15 — Access control | Entra ID + RBAC + Conditional Access | Entra ID logs; RBAC export | KQL sign-in query; role assignment export |
| A.5.16 — Identity management | Entra ID as IdP for all access | Entra ID directory | User inventory |
| A.5.17 — Authentication information | Password policy; MFA enforcement via CA | Entra ID password policy; CA policy | Policy exports |
| A.5.18 — Access rights | RBAC scoping; quarterly access reviews | Entra ID Access Reviews; PIM (if used) | Access review report |
| A.5.19–5.23 — Supplier relationships | Subprocessor list; vendor security reviews; contracts | Vendor management records | Subprocessor inventory; sample security questionnaire |
| A.5.24 — Information security incident management planning | Incident response runbook | Runbook docs | Current incident-response procedure |
| A.5.25 — Assessment and decision on information security events | Triage runbook for Defender / Sentinel findings | Triage records | Sample triage decisions |
| A.5.26 — Response to information security incidents | On-call rotation; PIR (post-incident review) requirement | Incident records | Sample incident with PIR doc |
| A.5.27 — Learning from information security incidents | PIR action items tracked to closure | PIR action backlog | Sample closed PIR action |
| A.5.28 — Collection of evidence | Forensic readiness documented | Forensic procedure | Procedure doc |
| A.5.29 — Information security during disruption | Business continuity plan; backup strategy | BCP doc; backup retention | Current BCP |
| A.5.30 — ICT readiness for business continuity | DR runbook; restore-test schedule | Restore-test reports | Sample quarterly restore test |
| A.5.31 — Legal, statutory, regulatory and contractual requirements | Compliance scoping per system | Compliance scope docs | Per-system compliance scope |
| A.5.32 — Intellectual property rights | License management; SBOM | License inventory; SBOMs via dependency scanners | License export per service |
| A.5.33 — Protection of records | Retention policies; immutable storage where required | Retention policy; storage account configuration | Retention policy export |
| A.5.34 — Privacy and protection of PII | Data inventory; DSAR procedure | Privacy register; DSAR log | DSAR sample |
| A.5.35 — Independent review of information security | Internal audit; external SOC 2 audit | Audit reports | Recent audit report |
| A.5.36 — Compliance with policies, rules and standards for information security | Policy compliance monitoring | Policy exception register | Exception register |
| A.5.37 — Documented operating procedures | Runbooks; ADRs | `docs/runbook.md` per service; ADR repo | Runbook directory |

## A.6 — People controls (8 controls in 2022)

Security education, awareness, training, screening.

| Control | Implementation | Evidence | Artifact |
|---|---|---|---|
| A.6.1 — Screening | Background checks per hiring process | HR records | HR-attested record |
| A.6.2 — Terms and conditions of employment | Employment agreements include security obligations | Agreements | Sample agreement |
| A.6.3 — Information security awareness, education and training | Quarterly training; phishing simulations | LMS records; simulation results | Training completion report |
| A.6.4 — Disciplinary process | Documented disciplinary procedure | HR procedure | Procedure doc |
| A.6.5 — Responsibilities after termination or change of employment | Offboarding procedure | HR-IT records | Sample offboarding |
| A.6.6 — Confidentiality or non-disclosure agreements | NDAs with staff, contractors, vendors | Signed NDAs | Sample NDAs |
| A.6.7 — Remote working | Remote-work policy; Entra ID Conditional Access requires compliant devices | CA policy export | CA configuration |
| A.6.8 — Information security event reporting | Internal reporting channel (Slack, email alias) | Reporting records | Sample report |

## A.7 — Physical controls (14 controls in 2022)

Datacenter physical security. For a personal / cloud-only stack, **most of these are inherited from Azure** — Microsoft's SOC 2 / ISO 27001 attestations cover the datacenter physical controls. The audit artifact for A.7.1–A.7.14 is typically Microsoft's Azure attestations referenced in your own report.

| Control | Implementation | Evidence | Artifact |
|---|---|---|---|
| A.7.1 — Physical security perimeters | Inherited from Azure | Azure compliance attestations | Microsoft Service Trust Portal export |
| A.7.2 — Physical entry | Inherited | Same | Same |
| A.7.3 — Securing offices, rooms, facilities | Office security if you have offices; otherwise N/A | Office security policy | Policy doc |
| A.7.4 — Physical security monitoring | Inherited for Azure; office surveillance if applicable | Inherited / surveillance footage | Inherited evidence reference |
| A.7.5 — Protecting against physical and environmental threats | Inherited | Inherited | Same |
| A.7.6 — Working in secure areas | Inherited / office procedure | Inherited / policy | Same |
| A.7.7 — Clear desk and clear screen | Office policy; device auto-lock | Policy; device policy | Policy + device config |
| A.7.8–7.14 — Equipment, cabling, maintenance, off-site, disposal, unattended | Mostly inherited from Azure; some endpoint controls (laptop encryption, remote-wipe) | Intune / device management | Device compliance report |

Practical note: a SOC 2 / ISO 27001 auditor for a cloud-only company typically accepts a single statement referencing Azure's attestations for A.7 controls, with the team's responsibilities (clear-desk policy, office security if applicable, endpoint management) called out separately.

## A.8 — Technological controls (34 controls in 2022)

The most directly Azure-mapped section.

| Control | Implementation | Evidence | Artifact |
|---|---|---|---|
| A.8.1 — User end-point devices | Intune / device management; conditional access requires compliant device | CA policy; Intune compliance | CA + Intune report |
| A.8.2 — Privileged access rights | PIM for elevated roles; PIM activation logs | PIM logs | PIM activation report |
| A.8.3 — Information access restriction | RBAC; per-tool authorization | Role assignment + app authz | Role + app authz export |
| A.8.4 — Access to source code | GitHub repo access via Entra ID OIDC; branch protection | GitHub access logs; branch protection settings | GitHub access export |
| A.8.5 — Secure authentication | MFA; Conditional Access; OAuth 2.1 with Entra ID | CA policy; sign-in logs | CA + sign-in report |
| A.8.6 — Capacity management | KEDA autoscaling; capacity reviews | Scaling history; cost reviews | Scaling reports; quarterly capacity review |
| A.8.7 — Protection against malware | Defender for Cloud; container image scanning; endpoint Defender on dev machines | Defender findings | Defender report |
| A.8.8 — Management of technical vulnerabilities | Defender for Cloud + Defender for Containers + dependency scanning (govulncheck / dependency-check) in CI | Defender; CI run logs | Vulnerability inventory; remediation timestamps |
| A.8.9 — Configuration management | IaC (Terraform); Defender for Cloud recommendations enforced | Terraform state; Defender posture | `terraform show`; Defender Secure Score |
| A.8.10 — Information deletion | Soft-delete + hard-delete procedures; end-of-life data purge | Retention policy; deletion logs | Sample purge audit |
| A.8.11 — Data masking | Row-level security; column-level masking in Postgres / Azure SQL | DB role definitions | RLS / mask policy export |
| A.8.12 — Data leakage prevention | Defender for Cloud DLP; output redaction in services | Defender DLP findings; code-review evidence | DLP report sample |
| A.8.13 — Information backup | Automated backups; cross-region replication for critical data | Backup retention policy; restore test logs | Backup config + restore test |
| A.8.14 — Redundancy of information processing facilities | Multi-zone Container Apps; cross-region failover for critical workloads | Resource configuration | Resource Graph query showing zonal redundancy |
| A.8.15 — Logging | Application Insights; Log Analytics; Defender logs; Entra ID logs | Logging configuration; retention | Diagnostic settings export; retention proof |
| A.8.16 — Monitoring activities | Alert configuration; Defender monitoring | Alert config in IaC | Active alert inventory |
| A.8.17 — Clock synchronization | NTP via Azure-host NTP (inherited) | Inherited | Inherited evidence reference |
| A.8.18 — Use of privileged utility programs | Restricted; documented authorized utilities | Approved-software list | Inventory of admin tooling |
| A.8.19 — Installation of software on operational systems | Container Apps revisions only; no manual install on production | Deployment history | Container Apps revision history |
| A.8.20 — Networks controls | NSGs; private endpoints; firewall rules | Network configuration | Network Watcher export; NSG rules |
| A.8.21 — Security of network services | TLS 1.2+; mTLS internal; encrypted Service Bus | TLS posture in IaC | TLS configuration export |
| A.8.22 — Segregation of networks | Subnets per concern (app / data / management); private endpoints | Network topology | Subnet diagram + Resource Graph query |
| A.8.23 — Web filtering | Firewall rules; Defender for Cloud network mapping | Firewall config | Firewall rule export |
| A.8.24 — Use of cryptography | TLS for in-transit; TDE / SSE for at-rest; CMK for sensitive | Cryptography posture | Defender encryption posture |
| A.8.25–8.27 — Secure development lifecycle, secure coding | Mandatory code review; CI security gates per service | Code-review records; CI logs | Quarterly PR merge + review export |
| A.8.28 — Secure coding | Same as above + language-specific anti-patterns | Same | Same |
| A.8.29 — Security testing in development and acceptance | Security tests in CI, driven by each system's threat model | Test suites in CI | Security test inventory |
| A.8.30 — Outsourced development | Vendor contracts include security requirements | Contracts | Sample contract |
| A.8.31 — Separation of development, test and production environments | Per-environment subscriptions / resource groups; OIDC scoped per environment | Resource Graph query | Subscription / RG inventory |
| A.8.32 — Change management | PR review; CI / CD via GitHub Actions OIDC | PR records; deploy history | Quarterly PR export |
| A.8.33 — Test information | Test data sanitized; no production data in non-prod | Test data policy; review process | Sanitization process doc |
| A.8.34 — Protection of information systems during audit testing | Audit testing limited to non-prod where possible; production audit access tightly scoped | Audit testing procedure | Procedure doc |

## SOC 2 ↔ ISO 27001 mapping table

Frequently-asked equivalences:

| ISO 27001 (2022) | SOC 2 Common Criterion |
|---|---|
| A.5.15 (Access control) | CC6.1, CC6.5 |
| A.5.17 (Authentication information) | CC6.2 |
| A.5.24–A.5.27 (Incident response cluster) | CC7.3, CC7.4, CC7.5 |
| A.5.29, A.5.30 (Continuity / DR) | A1 (Availability) |
| A.5.34 (Privacy / PII protection) | P (Privacy) |
| A.8.7 (Malware protection) | CC6.8 |
| A.8.8 (Vulnerability management) | CC6.8 |
| A.8.13 (Backup) | A1.3 |
| A.8.15, A.8.16 (Logging and monitoring) | CC7.2 |
| A.8.20–A.8.23 (Network security) | CC6.4 |
| A.8.24 (Cryptography) | CC6.6, CC6.7 |
| A.8.32 (Change management) | CC8.1 |

Use this mapping to deduplicate evidence collection — a single artifact often satisfies the corresponding control in both frameworks.

## Statement of Applicability (SoA)

ISO 27001 requires a Statement of Applicability that lists each Annex A control with: applicable / not applicable, implementation summary, reasoning if NA. This is the most concrete deliverable in the audit-evidence pack.

Template structure (one file: `compliance/iso27001-soa.md`):

```markdown
| Control | Applicability | Implementation | Justification (if NA) | Evidence pointer |
|---|---|---|---|---|
| A.5.1 | Applicable | Policy set in `compliance/policies/` | — | `compliance/policies/information-security-policy.md` |
| A.7.3 — Securing offices | Not applicable | — | No physical offices in audit scope | — |
| A.8.11 — Data masking | Applicable | Postgres RLS for tenant isolation | — | `compliance/payment-service/cc6-1-logical-access.md` |
| ... (one row per Annex A control) |
```

The SoA is the auditor's index into the evidence pack. Keep it current; update when controls are added or scope changes.

## 2013 → 2022 transition notes

If your prior audit was under ISO 27001:2013, mapping to 2022 requires:

- The 114 controls in 2013 condense to 93 in 2022 (some merged, some removed)
- New 2022-only controls to address explicitly: A.5.7 (Threat intelligence), A.5.23 (Cloud services security), A.5.30 (ICT readiness for BC), A.7.4 (Physical security monitoring), A.8.9 (Configuration management as a separate control), A.8.10 (Information deletion), A.8.11 (Data masking), A.8.12 (DLP), A.8.16 (Monitoring activities), A.8.23 (Web filtering), A.8.28 (Secure coding as a separate control)

The transition was supposed to complete by October 2025. Re-verify the current expectation with the certifying body before relying on this date.
