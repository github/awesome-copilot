# EU AI Act and GPAI Code of Practice — Developer Reference

This reference covers the EU AI Act (Regulation 2024/1689) and the Code of Practice for General-Purpose AI (GPAI). It is written for developers building AI agents and LLM applications, not for legal professionals. Always consult qualified legal counsel for binding compliance assessments.

Official sources:
- EU AI Act full text: https://eur-lex.europa.eu/eli/reg/2024/1689/oj
- GPAI Code of Practice: https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai
- Code of Practice portal: https://code-of-practice.ai/

## Risk classification

The EU AI Act classifies AI systems into four risk tiers. Your obligations depend on which tier your application falls into.

### Unacceptable risk (prohibited — Art. 5)

These AI uses are banned outright:
- Social scoring by public authorities
- Real-time remote biometric identification in public spaces (with narrow exceptions)
- Exploitation of vulnerabilities of specific groups (age, disability)
- Subliminal manipulation causing harm
- Emotion recognition in workplaces and educational institutions (with exceptions)
- Untargeted scraping of facial images for facial recognition databases

### High risk (Art. 6–7, Annex III)

Subject to the strictest requirements. Includes AI used for:
- **Employment**: recruitment, CV screening, interview evaluation, promotion decisions, task allocation
- **Credit scoring and loan decisions**
- **Education**: student assessment, admissions, exam proctoring
- **Healthcare**: diagnostic assistance, treatment recommendations, triage
- **Law enforcement**: risk assessment, evidence evaluation
- **Migration and border control**: document authentication, risk assessment
- **Critical infrastructure**: energy, water, transport management

### Limited risk (Art. 50 — transparency obligations)

AI systems that interact with people or generate content must:
- Disclose to users that they are interacting with AI
- Label AI-generated content (text, audio, image, video) as such
- Label deepfakes clearly

This tier covers most chatbots, virtual assistants, and content-generation tools.

### Minimal risk

No specific obligations. Includes spam filters, AI-enhanced video games, inventory management systems.

## High-risk system requirements (Art. 8–15)

If your application is classified as high-risk, you must implement:

### Risk management system (Art. 9)
- Continuous, iterative risk identification and mitigation throughout the AI system lifecycle
- Testing with metrics appropriate to the intended purpose
- Evaluation of risks from foreseeable misuse
- Risk mitigation measures that cannot be fully eliminated must be communicated to deployers

### Data governance (Art. 10)
- Training, validation, and testing datasets must be relevant, sufficiently representative, and as error-free as possible
- Statistical properties including biases must be examined
- Data must be appropriate for the geographic, contextual, and functional setting

### Technical documentation (Art. 11)
- General description of the AI system and its intended purpose
- Design specifications, development methodology, and development choices
- Monitoring, functioning, and control of the system
- Risk management documentation
- Description of changes made throughout the lifecycle
- Must be drawn up before the system is placed on the market and kept up to date

### Record-keeping (Art. 12)
- Automatic logging of events ("logs") throughout the system's lifecycle
- Logs must enable tracing of the system's operation to identify risks
- Logging must be appropriate to the intended purpose
- **Retention**: Logs must be kept for a period appropriate to the intended purpose, at least 6 months unless provided otherwise by law

### Transparency and information to deployers (Art. 13)
- Clear, adequate information to deployers about the system's capabilities and limitations
- Intended purpose, level of accuracy, robustness, and cybersecurity
- Known or foreseeable circumstances that may lead to risks
- Performance metrics including for specific persons or groups
- Technical capabilities and limitations (input data specifications, output interpretation guidance)

### Human oversight (Art. 14)
- Designed to allow effective oversight by natural persons during use
- Deployers must assign human oversight to competent individuals
- Individuals must be able to: understand the system, detect anomalies, decide not to use the system, intervene or stop the system

### Accuracy, robustness, cybersecurity (Art. 15)
- Appropriate level of accuracy declared in documentation
- Resilience to errors, faults, and inconsistencies
- Resilience against manipulation by unauthorised third parties
- Technical redundancy solutions where appropriate

## GPAI Code of Practice obligations

The GPAI Code of Practice applies to providers of general-purpose AI models. If you are building on top of a GPAI model (e.g., using OpenAI, Anthropic, or open-source LLMs), these obligations primarily fall on the model provider, but you should understand them for your own documentation and risk management.

### Transparency (Commitments 1–7)
- Prepare and maintain a **Model Documentation Form** covering model capabilities, limitations, training data summaries, and contact information
- Publish a sufficiently detailed summary of training data content
- Provide documentation to downstream providers and deployers
- **Retention**: Documentation must be maintained for a minimum of 10 years after the model is placed on the market

### Copyright (Commitments 8–11)
- Establish a copyright compliance policy aligned with EU copyright law (Directive 2019/790)
- Implement measures to mitigate risk of copyright-infringing outputs
- Implement a complaints-handling process for rights holders
- Document how training data was sourced and validated for copyright compliance

### Safety and security (Commitments 12–22, for systemic risk models)
- Implement a Safety and Security Framework (SSF) covering governance, risk assessment, and technical mitigations
- Identify and evaluate systemic risks before major deployment decisions
- Conduct model evaluations (capability, safety, societal risk)
- Implement safeguards for identified risks
- Conduct adversarial testing (red teaming)
- Report serious incidents to the AI Office within prescribed timelines
- Track and document model capabilities over time

## GDPR intersection

If your AI application processes personal data of EU residents, GDPR applies regardless of where you are based.

### When AI processing triggers GDPR
- Prompts or context containing personal data (names, emails, health info)
- User conversation logs stored for fine-tuning or evaluation
- Retrieval-augmented generation (RAG) over documents containing personal data
- Trace data sent to observability platforms containing PII in span attributes

### Key GDPR requirements for AI developers
- **Lawful basis** (Art. 6): Consent, contract, legitimate interest, or other lawful basis for processing
- **Data Protection Impact Assessment** (Art. 35): Required for high-risk processing, including systematic profiling and large-scale processing of sensitive data
- **Data Processing Agreements** (Art. 28): Required with every processor (LLM providers, cloud infrastructure, observability platforms)
- **Data subject rights** (Art. 15–22): Right to access, rectification, erasure, restriction, portability, and to object. For automated decision-making: right to human intervention and explanation
- **Data minimisation** (Art. 5(1)(c)): Only process data that is adequate, relevant, and limited to what is necessary
- **Breach notification** (Art. 33–34): Notify supervisory authority within 72 hours; notify affected individuals without undue delay if high risk
- **International transfers** (Art. 44–49): Standard Contractual Clauses or Data Privacy Framework for transfers outside EEA

## Developer action mapping

| Requirement | Article | Developer action |
|---|---|---|
| AI disclosure | Art. 50 | Add UI/API indicators that content is AI-generated or user is interacting with AI |
| Content labelling | Art. 50(2) | Label AI-generated text, images, audio, video with machine-readable markers |
| Technical documentation | Art. 11 | Maintain model card and system architecture docs |
| Record-keeping | Art. 12 | Implement trace logging (Arize tracing covers this) with appropriate retention |
| Transparency to deployers | Art. 13 | Document capabilities, limitations, accuracy metrics, known risks |
| Human oversight | Art. 14 | Implement human-in-the-loop for high-risk decisions; build override/stop mechanisms |
| Accuracy and robustness | Art. 15 | Implement evaluation pipelines, adversarial testing, error handling |
| Risk management | Art. 9 | Continuous risk identification, testing, mitigation documentation |
| Data governance | Art. 10 | Audit training/RAG data for bias, representativeness, errors |
| GDPR — lawful basis | Art. 6 | Document and implement consent or legitimate interest for data processing |
| GDPR — DPIA | Art. 35 | Conduct impact assessment for high-risk AI processing |
| GDPR — DPA | Art. 28 | Execute data processing agreements with all AI vendors |
| GDPR — data subject rights | Art. 15–22 | Implement access, deletion, portability handlers; user ID on traces for lookup |
| GDPR — PII minimisation | Art. 5(1)(c) | Redact PII in prompts, traces, and logs where not strictly necessary |
| GDPR — breach notification | Art. 33 | Implement breach detection and 72-hour notification workflow |

## Penalties

| Violation | Maximum fine |
|---|---|
| Prohibited AI practices (Art. 5) | EUR 35 million or 7% of global annual turnover |
| High-risk non-compliance (Art. 8–15) | EUR 15 million or 3% of global annual turnover |
| Incorrect information to authorities | EUR 7.5 million or 1.5% of global annual turnover |
| GDPR violations | EUR 20 million or 4% of global annual turnover |

## Timeline

| Date | Milestone |
|---|---|
| 1 August 2024 | EU AI Act entered into force |
| 2 February 2025 | Prohibited practices apply |
| 2 August 2025 | GPAI obligations apply to new models |
| 2 August 2026 | Full enforcement begins — high-risk requirements, Commission can request info, model access, and order recalls |
| 2 August 2027 | Existing GPAI models (released before Aug 2025) must comply |
