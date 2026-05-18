# US AI Compliance Landscape — Developer Reference

This reference covers US regulatory frameworks applicable to AI agent and LLM application development. The US does not have a single comprehensive federal AI law; compliance is a patchwork of federal frameworks, state laws, and sector-specific regulations. Always consult qualified legal counsel for binding compliance assessments.

Official sources:
- NIST AI RMF: https://www.nist.gov/artificial-intelligence/ai-risk-management-framework
- Colorado AI Act (SB24-205): https://leg.colorado.gov/bills/sb24-205
- NYC Local Law 144: https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page
- HIPAA: https://www.hhs.gov/hipaa/index.html

## NIST AI Risk Management Framework (AI RMF 1.0)

The NIST AI RMF is voluntary but increasingly the de facto standard for AI governance. Federal agencies require alignment for AI procurement (OMB M-24-10), and state laws like the Colorado AI Act reference NIST-aligned frameworks. Aligning with NIST AI RMF is the strongest foundation for US compliance.

### Govern function

Establish organisational AI governance. Developer actions:

| Sub-function | What to implement |
|---|---|
| GOV-1 | Define an AI governance policy covering accountability, roles, and escalation paths |
| GOV-1.1 | Assign individuals or teams responsible for AI risk management |
| GOV-1.2 | Document the organisation's risk tolerance for AI systems |
| GOV-2 | Establish accountability structures — who is responsible when the AI produces harmful output |
| GOV-3 | Define processes for workforce diversity and domain expertise in AI development |
| GOV-4 | Implement organisational processes for feedback, appeals, and override of AI decisions |
| GOV-5 | Establish processes for continuous improvement based on monitoring data |
| GOV-6 | Define policies for third-party AI components (model providers, APIs, data sources) |

### Map function

Identify and contextualise AI risks. Developer actions:

| Sub-function | What to implement |
|---|---|
| MAP-1.1 | Document the intended purpose and known limitations of the AI system |
| MAP-1.2 | Identify the interdependencies and downstream impacts of the system |
| MAP-1.5 | Document assumptions and constraints of the AI system |
| MAP-2.1 | Identify who is affected by the system (users, subjects of decisions, bystanders) |
| MAP-2.2 | Document potential benefits and harms for each stakeholder group |
| MAP-2.3 | Assess risks of the AI system in its real-world deployment context |
| MAP-3.1 | Identify risks from the AI supply chain (model provider, training data, third-party tools) |
| MAP-3.2 | Assess risks of bias, inaccuracy, or unreliability in data and models |
| MAP-5.1 | Document the system's fitness for its intended purpose through testing |

### Measure function

Quantify and test AI risks. Developer actions:

| Sub-function | What to implement |
|---|---|
| MEA-1.1 | Define and track performance metrics appropriate to the system's purpose |
| MEA-2.1 | Test for bias and fairness across demographic groups and use cases |
| MEA-2.2 | Evaluate the system's robustness under adversarial conditions |
| MEA-2.3 | Test for privacy risks — data leakage, PII exposure, membership inference |
| MEA-2.5 | Conduct red teaming and adversarial testing for safety and security |
| MEA-2.6 | Evaluate the AI system's environmental impact (compute, energy) |
| MEA-2.7 | Evaluate the AI system's security posture (prompt injection, data exfiltration) |
| MEA-3.1 | Track metrics over time to detect drift, degradation, and emerging risks |
| MEA-4.1 | Document measurement methodology and results |

### Manage function

Implement controls and mitigation. Developer actions:

| Sub-function | What to implement |
|---|---|
| MAN-1.1 | Implement risk treatment plans for identified risks |
| MAN-1.2 | Deploy technical controls: input validation, output filtering, guardrails |
| MAN-2.1 | Implement monitoring for deployed systems (drift, performance, incidents) |
| MAN-2.2 | Establish mechanisms for user feedback and incident reporting |
| MAN-3.1 | Define incident response procedures for AI-related incidents |
| MAN-3.2 | Implement escalation and notification workflows |
| MAN-4.1 | Implement decommissioning procedures for AI systems |
| MAN-4.2 | Document and apply lessons learned from incidents |

## Colorado AI Act (SB24-205)

### Scope
Applies to **developers and deployers** of "high-risk AI systems" — those making or substantially assisting **consequential decisions** in:
- Employment, promotion, termination
- Education admissions and opportunities
- Financial services (lending, credit, insurance)
- Healthcare services
- Housing
- Legal services
- Government services

### Developer obligations (effective 1 February 2026)

| Requirement | What to implement |
|---|---|
| Reasonable care | Exercise reasonable care to protect consumers from algorithmic discrimination |
| Impact assessment | Conduct and document annual impact assessments covering performance, bias, and discrimination risks |
| Risk management | Implement a risk management programme aligned with a recognised framework (NIST AI RMF, ISO 42001) |
| Documentation | Make available: a general description of the system, known limitations, the type of data used, how the system was evaluated, mitigation measures |
| Disclosure to deployers | Provide deployers with documentation needed for their own compliance |
| Discrimination prevention | Test for and mitigate algorithmic discrimination based on protected classes (race, colour, ethnicity, sex, religion, age, disability, sexual orientation, veteran status) |

### Safe harbour
Compliance with a recognised risk management framework (NIST AI RMF or ISO 42001) establishes a rebuttable presumption of reasonable care.

## NYC Local Law 144 — Automated Employment Decision Tools (AEDT)

### Scope
Applies to employers and employment agencies in New York City using AI for hiring, promotion, or other employment decisions.

### Requirements

| Requirement | What to implement |
|---|---|
| Annual bias audit | Conduct an independent bias audit before use and annually thereafter |
| Audit scope | Assess scoring rates and impact ratios for sex, race/ethnicity, and intersectional categories |
| Transparency | Publish a summary of the most recent bias audit on the employer's website |
| Notice to candidates | Notify candidates at least 10 business days before use; describe the job qualifications evaluated; allow alternatives |
| Data disclosure | Disclose what data is collected and its retention period |

### Audit methodology
- Calculate selection/scoring rates for each demographic category
- Calculate impact ratios (selection rate of each group vs the most-selected group)
- Flag categories with impact ratios below 0.8 (four-fifths rule) for further analysis

## HIPAA for AI applications

Applies if your AI application processes Protected Health Information (PHI). This includes clinical data, diagnostic information, treatment records, or any data linkable to a specific patient.

### When HIPAA applies to AI
- AI system processes, stores, or transmits PHI
- AI system is used by or on behalf of a covered entity (healthcare provider, health plan, healthcare clearinghouse)
- AI system is provided by a business associate of a covered entity

### Requirements

| Requirement | What to implement |
|---|---|
| Business Associate Agreement (BAA) | Execute BAAs with every vendor that touches PHI (LLM provider, cloud, observability) |
| No training on PHI | Verify LLM providers do not use your data for model training — get written confirmation |
| Minimum necessary | Limit PHI in prompts and context to what is strictly necessary for the task |
| Access controls | Implement role-based access control (RBAC) or attribute-based access control (ABAC) for PHI |
| Audit logs | Maintain immutable audit logs of all PHI access: who, what, when, why |
| Encryption | Encrypt PHI in transit (TLS 1.2+) and at rest (AES-256) |
| De-identification | Use Safe Harbor or Expert Determination methods to de-identify data where possible |
| Breach notification | Notify affected individuals within 60 days; notify HHS; notify media if 500+ individuals affected |

### PHI in traces and spans
If using Arize tracing in a healthcare context:
- Ensure PHI is redacted from `input.value` and `output.value` span attributes before export
- Verify Arize's BAA covers trace data storage
- Implement PII/PHI detection filters on span data before it leaves the application
- Configure trace retention to meet HIPAA's 6-year retention requirement for audit logs

## State privacy laws intersection

Several state privacy laws impose additional obligations when AI processes personal data:

| Law | Scope | Key AI provisions |
|---|---|---|
| CCPA/CPRA (California) | Businesses serving CA residents | Right to opt out of automated decision-making; right to access information about the logic involved |
| Virginia CDPA | Businesses serving VA residents | Right to opt out of profiling in furtherance of automated decisions; data protection assessments required |
| Connecticut Data Privacy Act | Businesses serving CT residents | Right to opt out of profiling; data protection assessments for targeted advertising and profiling |
| Texas Data Privacy Act | Businesses serving TX residents | Data protection assessments for processing that presents a heightened risk of harm |
| Oregon Consumer Privacy Act | Businesses serving OR residents | Right to opt out of profiling; children's data protections |

Common obligations across state privacy laws:
- Data protection assessments for AI-driven profiling
- Opt-out mechanisms for automated decision-making
- Transparency about automated processing
- Data minimisation in AI contexts

## Developer action summary

| Compliance area | Framework | Concrete developer action |
|---|---|---|
| Governance policy | NIST GOV-1 | Document AI governance policy, roles, accountability |
| Risk identification | NIST MAP-1–3, Colorado | Document intended purpose, limitations, stakeholder impact, supply chain risks |
| Bias testing | NIST MEA-2.1, Colorado, NYC LL144 | Test output fairness across demographic groups; compute impact ratios |
| Adversarial testing | NIST MEA-2.5, MEA-2.7 | Red team for prompt injection, jailbreak, goal hijacking, data exfiltration |
| Input/output validation | NIST MAN-1.2 | Implement guardrails, content filtering, DLP |
| Monitoring | NIST MAN-2.1, MEA-3.1 | Deploy Arize tracing with drift detection and alerting |
| Incident response | NIST MAN-3.1 | Define and document AI incident response procedures |
| Documentation | Colorado, NIST MAP-1 | Maintain model card, system docs, impact assessments |
| Transparency | Colorado, state privacy laws | Disclose AI use to users; provide opt-out for profiling |
| PHI protection | HIPAA | BAAs, PII/PHI redaction, audit logs, encryption, minimum necessary |
| Privacy assessments | State privacy laws | Conduct DPAs for AI processing involving personal data |
