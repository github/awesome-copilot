---
name: arize-compliance-audit
description: "INVOKE THIS SKILL when auditing an AI agent or LLM app for regulatory compliance. Covers EU AI Act, GPAI Code of Practice, GDPR, NIST AI RMF, Colorado AI Act, HIPAA, and ISO 42001. Scans the codebase for compliance gaps, cross-references Arize instrumentation for audit trail coverage, and produces an actionable remediation checklist tailored to the selected frameworks."
---

# Arize Compliance Audit Skill

Use this skill when the user wants to **audit their AI agent or LLM application for regulatory compliance**. The skill scans the codebase for compliance gaps, cross-references Arize instrumentation for audit trail coverage, and produces a tailored checklist with optional remediation.

**Triggers:** "audit my app for compliance", "EU AI Act requirements", "NIST AI RMF checklist", "GDPR for AI", "is my AI app compliant", "compliance checklist", "regulatory audit", "ISO 42001", "AI management system", "AIMS certification".

## Disclaimer

**Before doing anything else, present this disclaimer verbatim to the user:**

---

> ⚠️ **Legal disclaimer**
>
> This audit is for **guidance only** and does **not** constitute legal advice or a complete compliance assessment. It identifies common technical patterns and gaps based on publicly available regulatory frameworks, but cannot assess your organisation's specific legal obligations, contractual commitments, data processing agreements, or operational processes.
>
> **Do not rely on this output as a substitute for qualified legal counsel.** Regulatory compliance is a complex, jurisdiction-specific, and fact-dependent determination. Always engage a qualified attorney or compliance specialist for binding assessments.

---

## Core principles

- **Prefer inspection over mutation** — understand the codebase before suggesting changes.
- **Be practical, not legal** — produce developer-actionable items, not legal opinions.
- **Tailor to jurisdiction and use case** — a chatbot has different obligations than a hiring tool. Do not dump the entire regulatory framework.
- **Cross-reference instrumentation** — compliance requires audit trails; check whether Arize tracing captures what regulators expect.
- **Offer remediation, always confirm** — after presenting the checklist, offer to implement specific fixes, but never modify code without explicit user confirmation.
- **Keep output concise and production-focused** — do not generate extra documentation or summary files unless requested.
- **Never embed literal credential values** — always reference environment variables.

## Phase 0: Framework selection and use case

Before scanning code, determine which compliance frameworks apply.

### Step 1 — Framework selection

Use the `AskUserQuestion` tool to ask the user which frameworks apply. **Do not infer or auto-select** — always ask explicitly.

Ask:

```
Which compliance frameworks should this audit cover?
Select all that apply (reply with numbers, e.g. "1, 3"):

1. EU frameworks — EU AI Act, GPAI Code of Practice, GDPR
   (choose if end-users or data subjects are located in the EU)

2. US frameworks — NIST AI RMF, state laws (Colorado AI Act, NYC LL144),
   HIPAA (if processing health data)
   (choose if operating in the United States)

3. ISO 42001 — International AI Management System standard
   (choose if pursuing ISO 42001 certification, operating globally,
   or wanting an internationally recognised baseline)

You can select any combination. If unsure, select all that seem relevant
and we can narrow down during the audit.
```

Based on the selection:
- **1 selected** — EU AI Act, GPAI Code of Practice, GDPR apply. See references/eu-ai-act-gpai.md.
- **2 selected** — NIST AI RMF, Colorado AI Act, NYC LL144, HIPAA may apply. See references/us-ai-compliance.md.
- **3 selected** — ISO 42001 AIMS controls apply. See references/iso-42001.md. Note: ISO 42001 is an organisational management system — the audit will cover technically-auditable controls only; purely organisational clauses (leadership review, internal audits) are flagged separately.
- **Multiple selected** — all selected frameworks apply; the audit covers the union of requirements, with cross-references where frameworks overlap.

### Step 2 — Determine use case category

Use the `AskUserQuestion` tool to ask: **What does your AI application do?**

- **General chatbot / assistant** — Limited risk (EU), general obligations (US)
- **Hiring / HR** — High risk (EU Art. 6, Annex III); Colorado AI Act applies; NYC LL144 applies if NYC
- **Healthcare** — High risk (EU); HIPAA applies if processing PHI
- **Credit / financial** — High risk (EU); Colorado AI Act applies
- **Education** — High risk (EU)
- **Content generation** — Limited risk (EU Art. 50 transparency); general obligations (US)
- **GPAI model provider** — GPAI Code of Practice applies (EU)

### Step 3 — Determine risk tier

Based on the use case and selected frameworks:
- **EU selected**: Classify as Unacceptable / High / Limited / Minimal per references/eu-ai-act-gpai.md
- **US selected**: Classify as High-risk (consequential decisions per Colorado AI Act) or General
- **ISO 42001 selected**: Risk tier is not a formal classification in ISO 42001, but note whether the system is high-stakes (which elevates the priority of impact assessment and bias controls)

### Phase 0 output

Present a brief summary:

```
Frameworks selected: {EU / US / ISO 42001 / combination}
Use case:            {category}
Risk tier:           {EU tier if applicable} / {US tier if applicable}
Applicable:          {list of specific regulations and standards}
ISO 42001 note:      {if selected} Audit covers technically-auditable controls only;
                     organisational clauses will be flagged but not code-audited.
```

Then proceed directly to Phase 1.

## Phase 1: Codebase audit (read-only)

**Do not write any code or create any files during this phase.**

Systematically scan the codebase for evidence of compliance and gaps across seven domains. For each domain, run the listed searches and record findings.

### A. Transparency and disclosure

**What to look for:**
- User-facing strings disclosing AI involvement: search for terms like `AI`, `artificial intelligence`, `automated`, `bot`, `machine learning`, `generated by`, `powered by` in UI templates, API responses, and user-facing code
- Content labelling: markers on AI-generated output (text, images, audio)
- Terms of service, privacy policy references in the codebase

**Signals of concern:** Absence of any AI disclosure in user-facing code, especially if the application generates content or makes recommendations.

### B. Data protection and privacy

**What to look for:**
- PII field names in code: `email`, `phone`, `ssn`, `social_security`, `date_of_birth`, `address`, `name` in prompts, context, or retrieved documents
- PII in trace span attributes: check if `input.value` or `output.value` could contain personal data sent to Arize without redaction
- Consent mechanisms: `consent`, `opt-in`, `opt-out`, `gdpr`, `ccpa` references
- DPIA or privacy assessment references
- Data retention and deletion handlers
- Data subject rights: `right_to_access`, `right_to_erasure`, `data_subject_request`, `data_protection_officer`

### C. Security

**What to look for:**
- Prompt injection defences: input validation, guardrail libraries (`guardrails-ai`, `nemo-guardrails`, `rebuff`, `lakera`), content filtering, system prompt protection
- Data loss prevention: output scanning before returning to users, sensitive data detection
- Tool/function calling controls: permission boundaries, allowlists, sandboxing for tool execution
- Rate limiting and authentication on AI endpoints
- Hardcoded secrets: `api_key`, `secret`, `password`, `token` literals in source files (not env var references)

### D. Testing and evaluation

**What to look for:**
- Bias and fairness testing: references to demographic parity, impact ratios, fairness metrics
- Red teaming or adversarial test suites: prompt injection tests, jailbreak tests
- Evaluation frameworks: Arize evaluators, custom eval scripts, `pytest`-based evals, experiment infrastructure
- A/B testing or model comparison infrastructure

### E. Documentation

**What to look for:**
- Model cards: `MODEL_CARD.md`, `model_card.json`, `model_card.yaml`, or similar
- System architecture documentation
- Change logs or version tracking for prompts and model updates
- Incident response documentation

### F. Monitoring and observability

**What to look for:**
- Arize tracing setup: `arize-otel`, `register()`, `TracerProvider`, `opentelemetry`, `openinference` imports
- If tracing exists, check coverage:
  - All LLM calls traced (not just some)
  - Session IDs for conversation continuity
  - User IDs for data subject request support
  - Error tracking and exception spans
- Alerting and drift detection configuration
- Trace retention configuration

### G. Vendor management

**What to look for:**
- Third-party AI API usage: OpenAI, Anthropic, Google, Azure, Bedrock, Cohere imports or client instantiation
- Model versioning: are specific model versions pinned (e.g., `gpt-4-0613`) or using `latest` / unversioned identifiers
- Fallback and failover logic between providers

### Phase 1 output

Present a two-part report:

**Part 1 — Summary table**

| Domain | Evidence found | Gaps identified | Rating |
|---|---|---|---|
| A. Transparency | {findings} | {gaps} | Compliant / Partial / Non-compliant / N/A |
| B. Data protection | {findings} | {gaps} | ... |
| C. Security | {findings} | {gaps} | ... |
| D. Testing | {findings} | {gaps} | ... |
| E. Documentation | {findings} | {gaps} | ... |
| F. Monitoring | {findings} | {gaps} | ... |
| G. Vendor management | {findings} | {gaps} | ... |

**Part 2 — Gap detail (required for every Non-compliant or Partial rating)**

For each domain rated Non-compliant or Partial, write a dedicated subsection that includes:

1. **The exact code path** — file path(s), line number(s), and the relevant code snippet showing where the gap exists. Do not paraphrase; quote the actual code.
2. **Why it matters in this specific app** — explain the concrete risk in the context of this codebase (e.g. which tools could be abused, which data flows are exposed, what an attacker or regulator would find).
3. **What is missing** — a precise description of the control or code that should exist but does not (e.g. "a span attribute processor that hashes `user_email` before the OTLP exporter fires", not just "add PII redaction").

Minimum one subsection per Non-compliant/Partial domain. Do not omit this section — it is the primary value of the audit for engineering teams.

Then proceed directly to Phase 2.

## Phase 2: Compliance checklist

Using the Phase 1 findings and the template in references/compliance-checklist-template.md, generate a **tailored compliance checklist**.

### Rules for checklist generation

1. **Only include relevant sections.** If the user is US-only, skip GDPR-specific items. If not healthcare, skip HIPAA. If not hiring in NYC, skip LL144.
2. **Mark items from Phase 1.** Items where evidence was found: mark as `Compliant`. Items with gaps: mark as `Non-compliant` with a concrete remediation suggestion.
3. **Prioritise correctly.** Critical = enforcement risk or system prohibition. High = required by regulation. Medium = recommended by framework. Low = best practice.
4. **Be specific in remediation.** Instead of "implement input validation", say "add a guardrail library like `guardrails-ai` to validate LLM inputs and outputs against your content policy".
5. **Include the instrumentation cross-reference table** from the template. If Arize tracing is not set up, flag this as a Critical gap — audit trails are required by EU Art. 12 and NIST MAN-2.1.

### Final report

Present a single consolidated report with four sections:

**Section 1 — Audit scope (Phase 0 summary)**
- Frameworks selected, use case, risk tier, applicable regulations

**Section 2 — Codebase findings (Phase 1 summary table)**
- The domain table (A–G) with evidence, gaps, and ratings

**Section 3 — Gap detail (Phase 1 expanded)**
- One subsection per Non-compliant or Partial domain, each containing: exact file paths and line numbers, quoted code snippets, app-specific risk explanation, and a precise description of what is missing. This section is mandatory — never omit it.

**Section 4 — Compliance checklist (Phase 2)**
- The tailored checklist with status and remediation suggestions, instrumentation cross-reference table, priority summary, and recommended next steps

When the user asks for a report file, write a single markdown file to `/tmp/<app-name>-compliance-audit-<YYYY-MM-DD>.md` containing all four sections.

After presenting the report, offer Phase 3 remediation.

## Phase 3: Remediation (optional)

After presenting the checklist, offer to implement specific fixes. **Always use the `AskUserQuestion` tool to confirm before making any changes.**

### Remediation categories

**Add dependencies** — offer to install:
- Guardrail libraries for input/output validation (e.g., `guardrails-ai`, `nemo-guardrails`)
- PII detection/redaction packages (e.g., `presidio-analyzer`, `scrubadub`)
- Content safety classifiers

**Insert code** — offer to add:
- AI disclosure strings in user-facing output (templates, API responses)
- PII redaction filters on span attributes before export to Arize
- Input validation/sanitisation on AI endpoints
- User ID attributes on trace spans for data subject request support

**Create documentation templates** — offer to scaffold:
- Model card template (markdown file with standard sections)
- Incident response plan template
- Data processing record template

**Configure monitoring** — offer to set up via related skills:
- Arize evaluators for bias detection and content safety (via `arize-evaluator` skill)
- Tracing for audit trail coverage (via `arize-instrumentation` skill)

### Remediation rules

- Present each remediation as a **discrete, confirmable action**. Never batch-apply changes.
- Show exactly what will change (file, code diff concept) then use the `AskUserQuestion` tool to get confirmation before applying.
- Follow existing code style and project conventions.
- Never embed credentials — always use environment variables.
- Test that the application still builds after changes.

## Skill orchestration

When gaps identified in Phase 1 or 2 require capabilities from other Arize skills, offer to invoke them. **Always use the `AskUserQuestion` tool to ask before invoking another skill** and explain why it is relevant to the compliance gap.

| Gap | Skill to invoke | Why |
|---|---|---|
| No tracing / incomplete audit trail | `arize-instrumentation` | EU Art. 12 and NIST MAN-2.1 require event logging; Arize tracing provides this |
| No bias or safety evaluation | `arize-evaluator` | Create LLM-as-judge evaluators for fairness, content safety, or quality monitoring |
| Need trace export for compliance evidence | `arize-trace` | Export spans for regulatory documentation or incident investigation |
| Need human review for high-risk decisions | `arize-annotation` | Set up annotation queues for human oversight per EU Art. 14 |
| Need deep link to share compliance evidence | `arize-link` | Generate URLs to specific traces, spans, or evaluations for stakeholder review |

## Instrumentation cross-reference

If Arize tracing is already set up, verify it meets compliance requirements:

| Compliance need | Required trace data | What to check |
|---|---|---|
| Audit trail for AI decisions | All LLM spans with input/output | Verify all LLM client calls are instrumented, not just some |
| Data subject access requests | User ID attribute on spans | Check for `user.id` or custom user identifier attribute |
| PII in traces | Sensitive data in `input.value`/`output.value` | Check if PII passes through unredacted — flag if so |
| Incident investigation | Error spans with full context | Check for exception tracking and error status on spans |
| Retention requirements | Trace data retained for required period | EU: appropriate period (min 6 months for high-risk); HIPAA: 6 years |
| Bias monitoring | Demographic or group attributes | Check for metadata attributes that enable fairness analysis |

If Arize tracing is **not** set up, this is a significant compliance gap. Offer: "Shall I run the `arize-instrumentation` skill to set up audit-trail tracing? Regulatory frameworks (EU AI Act Art. 12, NIST AI RMF MAN-2.1) require event logging for AI systems."

## Reference links

| Resource | URL |
|---|---|
| EU AI Act full text | https://eur-lex.europa.eu/eli/reg/2024/1689/oj |
| GPAI Code of Practice | https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai |
| Code of Practice portal | https://code-of-practice.ai/ |
| NIST AI RMF | https://www.nist.gov/artificial-intelligence/ai-risk-management-framework |
| Colorado AI Act (SB24-205) | https://leg.colorado.gov/bills/sb24-205 |
| NYC Local Law 144 | https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page |
| HIPAA | https://www.hhs.gov/hipaa/index.html |
| ISO/IEC 42001:2023 | https://www.iso.org/standard/42001.html |
| Arize AX Docs | https://arize.com/docs/ax |

## Reference files

- references/eu-ai-act-gpai.md — EU AI Act and GPAI Code of Practice developer guide
- references/us-ai-compliance.md — US compliance landscape (NIST AI RMF, Colorado, NYC LL144, HIPAA)
- references/iso-42001.md — ISO/IEC 42001:2023 AI Management Systems developer guide (technically-auditable controls only)
- references/compliance-checklist-template.md — Reusable checklist template for Phase 2 output
