# Compliance Checklist Template

Use this template to generate the Phase 2 compliance checklist. Fill in the status and notes columns based on Phase 1 audit findings. Only include sections relevant to the user's jurisdiction and use case — do not dump the entire template.

## Header

| Field | Value |
|---|---|
| Application name | {app_name} |
| Frameworks selected | {EU / US / ISO 42001 / combination} |
| Risk classification | {Unacceptable / High / Limited / Minimal (EU) or High-risk / General (US)} |
| Use case category | {General chatbot / Hiring / Healthcare / Credit / Education / Other} |
| Applicable regulations | {EU AI Act, GPAI CoP, GDPR, NIST AI RMF, Colorado AI Act, NYC LL144, HIPAA, ISO 42001} |
| Audit date | {date} |

## Priority legend

| Priority | Meaning |
|---|---|
| Critical | Blocking — non-compliance carries enforcement risk or system prohibition |
| High | Required by applicable regulation; remediate before production |
| Medium | Recommended by frameworks; strengthens compliance posture |
| Low | Best practice; implement when resources allow |

---

## 1. Governance and documentation

| # | Item | Regulation | Priority | Status | Remediation |
|---|---|---|---|---|---|
| 1.1 | AI governance policy documented | NIST GOV-1, ISO 42001 cl.5.2 | Medium | | |
| 1.2 | Accountable individuals assigned for AI risk | NIST GOV-1.1, Colorado, ISO 42001 A.6.1 | High | | |
| 1.3 | Model card or technical documentation exists | EU Art. 11, Colorado, ISO 42001 A.6.2 | High | | |
| 1.4 | Intended purpose and limitations documented | EU Art. 13, NIST MAP-1.1, ISO 42001 A.8 | High | | |
| 1.5 | Change log for model/prompt updates maintained | EU Art. 11, NIST GOV-5, ISO 42001 cl.8.4 | Medium | | |
| 1.6 | Documentation retained for required period (10yr EU, 6yr HIPAA) | EU Art. 11, HIPAA | High | | |
| 1.7 | AI impact assessment conducted and documented | ISO 42001 cl.8.3, A.5.2 | High | | *ISO 42001 only.* Create an impact assessment document covering intended use, potential harms, and affected stakeholders. May be combined with a GDPR DPIA. |
| 1.8 | AI risk assessment process documented | ISO 42001 cl.6.1.2 | High | | *ISO 42001 only.* Document the process for identifying and assessing AI-specific risks (bias, safety, privacy, security). |
| 1.9 | Supplier AI policy documented (third-party AI providers) | ISO 42001 A.10 | Medium | | *ISO 42001 only.* Document all third-party AI APIs used and confirm vendor obligations (no training on your data, data residency, etc.). |
| 1.10 | Organisational clauses (leadership, internal audit, management review) | ISO 42001 cl.5.1, 9.2, 9.3 | — | *Organisational — not code-auditable* | These clauses require evidence from outside the codebase. Flag for the compliance team. |

## 2. Data protection and privacy

| # | Item | Regulation | Priority | Status | Remediation |
|---|---|---|---|---|---|
| 2.1 | Lawful basis for processing documented | GDPR Art. 6 | Critical | | |
| 2.2 | Data Protection Impact Assessment conducted | GDPR Art. 35, ISO 42001 cl.8.3 | High | | |
| 2.3 | Data Processing Agreements with all AI vendors | GDPR Art. 28 | Critical | | |
| 2.4 | PII redacted from traces and span attributes | GDPR Art. 5(1)(c) | High | | |
| 2.5 | Data subject rights handlers implemented (access, deletion, portability) | GDPR Art. 15-22 | High | | |
| 2.6 | User ID on spans to support data subject lookups | GDPR Art. 15 | Medium | | |
| 2.7 | Consent or opt-out mechanism for AI processing | State privacy laws | High | | |
| 2.8 | International data transfer safeguards (SCCs/DPF) | GDPR Art. 44-49 | Critical | | |
| 2.9 | Breach detection and 72-hour notification workflow | GDPR Art. 33 | High | | |
| 2.10 | PHI handling compliant (BAAs, min. necessary, encryption) | HIPAA | Critical | | |

## 3. Security

| # | Item | Regulation | Priority | Status | Remediation |
|---|---|---|---|---|---|
| 3.1 | Prompt injection defences implemented | EU Art. 15, NIST MEA-2.7, ISO 42001 A.4.2 | High | | |
| 3.2 | Output filtering / guardrails in place | NIST MAN-1.2, ISO 42001 A.4.2 | High | | |
| 3.3 | Data loss prevention for sensitive output | NIST MAN-1.2, HIPAA, ISO 42001 A.7.4 | High | | |
| 3.4 | Tool/function access controls (least privilege) | NIST MAN-1.2 | High | | |
| 3.5 | Rate limiting on AI endpoints | NIST MAN-1.2 | Medium | | |
| 3.6 | Authentication on AI endpoints | NIST MAN-1.2 | High | | |
| 3.7 | No hardcoded secrets in source | General security | Critical | | |
| 3.8 | Incident response plan documented | NIST MAN-3.1 | Medium | | |

## 4. Testing and evaluation

| # | Item | Regulation | Priority | Status | Remediation |
|---|---|---|---|---|---|
| 4.1 | Bias and fairness testing across demographic groups | NIST MEA-2.1, Colorado, NYC LL144, ISO 42001 A.4.2 | High | | |
| 4.2 | Adversarial / red team testing conducted | NIST MEA-2.5, GPAI CoP | High | | |
| 4.3 | Evaluation pipeline for accuracy and quality | NIST MEA-1.1, ISO 42001 cl.9.1 | Medium | | |
| 4.4 | Regression test suite for AI behaviour | EU Art. 15 | Medium | | |
| 4.5 | Impact assessment (annual for Colorado) | Colorado AI Act | High | | |
| 4.6 | Independent bias audit (annual for NYC LL144) | NYC LL144 | Critical | | |

## 5. Transparency and user communication

| # | Item | Regulation | Priority | Status | Remediation |
|---|---|---|---|---|---|
| 5.1 | Users informed they are interacting with AI | EU Art. 50, Colorado, ISO 42001 A.8 | Critical | | |
| 5.2 | AI-generated content labelled | EU Art. 50(2) | High | | |
| 5.3 | Explanation provided for AI-driven decisions | EU Art. 13-14, GDPR Art. 22 | High | | |
| 5.4 | Opt-out mechanism for automated profiling | State privacy laws | High | | |
| 5.5 | Capabilities and limitations communicated to users | EU Art. 13, Colorado, ISO 42001 A.9 | Medium | | |

## 6. Monitoring and continuous compliance

| # | Item | Regulation | Priority | Status | Remediation |
|---|---|---|---|---|---|
| 6.1 | Arize tracing captures all LLM calls | EU Art. 12, NIST MAN-2.1, ISO 42001 cl.8.6 | High | | |
| 6.2 | Error and exception tracking on spans | NIST MAN-2.1, ISO 42001 cl.9.1 | Medium | | |
| 6.3 | Drift detection and alerting configured | NIST MEA-3.1, ISO 42001 cl.9.1 | Medium | | |
| 6.4 | Trace retention meets regulatory requirements | EU Art. 12, HIPAA | High | | |
| 6.5 | Periodic re-audit schedule defined | NIST GOV-5, Colorado, ISO 42001 cl.9.2 | Medium | | |

## 7. Vendor management

| # | Item | Regulation | Priority | Status | Remediation |
|---|---|---|---|---|---|
| 7.1 | All third-party AI APIs documented | NIST MAP-3.1, GOV-6, ISO 42001 A.10 | Medium | | |
| 7.2 | Model versions pinned (not using "latest") | NIST MAP-3.2, ISO 42001 cl.8.4 | Medium | | |
| 7.3 | Data Processing Agreements with all processors | GDPR Art. 28 | Critical | | |
| 7.4 | Vendor does not train on your data (confirmed in writing) | HIPAA, GDPR, ISO 42001 A.10 | High | | |
| 7.5 | Fallback and failover logic implemented | NIST MAN-1.1 | Low | | |

---

## Instrumentation cross-reference

| Compliance need | Required trace data | Status |
|---|---|---|
| Audit trail for AI decisions | All LLM spans with input/output | |
| Data subject access requests | User ID attribute on spans | |
| PII exposure prevention | PII redaction on span attributes | |
| Incident investigation | Error spans with full context | |
| Retention requirements | Trace retention configured for required period | |
| Bias monitoring | Demographic or group attributes on spans | |

## Next steps

1. Address all **Critical** items immediately
2. Remediate **High** items before production deployment
3. Schedule **Medium** items for the next development cycle
4. Track **Low** items in backlog
5. Schedule next compliance audit for: {date + 3 months or per regulatory requirement}
6. Consult qualified legal counsel for binding compliance assessment
