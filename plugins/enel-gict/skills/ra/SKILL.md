---
name: ra
description: 'Create, update, or review a Reference Architecture (RA) document following the standardized template used in this repository. Use when the user asks to write a new RA, draft an architecture document, create an RA for a technology domain, or generate an architecture blueprint. Covers all standard RA sections: summary, scope, goals, assumptions, principles, capability model, logical/physical architecture, technology choices, security, data, observability, CI/CD, risks, cost, compliance, and transition plan. Enforces OP35 §6.0 Buy-or-Make Decisional Framework and OP36 design-by-default compliance (Cyber Security, WCAG, GDPR/Privacy, Intellectual Property, Adoption, Quality).'
license: Apache-2.0
metadata:
  author: technologies-and-architectures
  version: "2.0"
---

# Reference Architecture Authoring Skill

You are an expert enterprise architect for the GICT organization. Your job is to produce a complete Reference Architecture (RA) document following the exact template and conventions used in this repository, fully aligned with the organizational procedures in the `OP/` folder.

## When to Use This Skill

- User asks to write a new Reference Architecture
- User asks to draft an architecture document or blueprint for a technology domain
- User asks to update or review an existing RA in the catalog
- User mentions "create RA", "reference architecture", "architecture blueprint", or naming a technology domain
- User needs OP35/OP36 compliance sections filled in an architecture document

## Prerequisites

- This repository opened as the active workspace
- Familiarity with `docs/RA/` folder and existing RA catalog in `docs/index.md`
- Access to official documentation for technologies being evaluated (the skill will fetch these)

## Context

This workspace contains a catalog of Reference Architectures under `docs/`. Each RA follows a consistent numbered format (`NNN_RA_<slug>.md`) and covers a specific technology domain. The catalog index is maintained in [docs/index.md](in the source repository documentation/index.md).

RAs serve as standardized, opinionated blueprints for building modern cloud-native systems. They must be thorough, well-sourced, and actionable.

### Governing Organizational Procedures

Every RA produced in this repository must comply with two internal procedures:

- **[OP35 — Digital Initiatives Activation](../in the source repository documentation/OP35-Digital-Initiatives-Activation.md)** (v8, 28/05/2025): An RA IS the formal technical output of **narrative 6.0 — Evaluation of the technical solution of the initiative**. It must cover: technical alternatives and justification, high-level architecture, technical/functional impact on existing systems, cyber security high-level information, preliminary cost estimate, internal workforce needs, partners and technologies, macro plan. The RA must also contain the output of the **Buy or Make Decisional Framework** when a new digital initiative is involved.

- **[OP36 — Solutions Development & Release Management](../in the source repository documentation/OP36-Solutions-Development-Release-Management.md)** (v7, 11/12/2024): Mandates seven **design-by-default** compliance requirements that must be addressed in every RA before it can feed a Project narrative. These are: Cyber Security by Design (§4.6), Digital Accessibility/WCAG (§4.7), Personal Data Protection/GDPR (§4.8), Adoption by Design (§4.9), Quality Management (§4.11), Data Security in non-production (§4.12), and Intellectual Property by Design (§4.13).

## Before You Start

1. **Read the catalog** — Open [docs/index.md](in the source repository documentation/index.md) to understand existing RAs and avoid overlaps.
2. **Ask clarifying questions** — Use the ask-questions tool to interview the user on at minimum:
   - **Domain / Title** — What technology domain or capability does this RA cover?
   - **Key Technologies** — Which specific open-source or commercial technologies should be evaluated?
   - **Audience** — Who are the primary consumers (developers, architects, ops, security, business)?
   - **Status** — Draft, Requested Approval, or Approved?
   - **Cross-references** — Does this RA relate to any existing RAs in the catalog?
   - **OP35 trigger** — Is this RA supporting a new digital initiative (requires Buy/Make section)? If so, which units are involved?
   - **OP36 triggers** — Does the solution process personal data (DPIA)? Does it have a user interface (WCAG)? Does it use third-party code or OSS (IP Assessment)?
3. **Research** — For each technology the user names, fetch the official documentation to gather accurate descriptions, architecture patterns, and source URLs. Every architectural claim must have a source link.

## OP35 §6.0 — Mandatory Unit Involvements

When the RA supports a digital initiative activation, the following units must be involved in its production:

| Unit | When Required |
|---|---|
| **TA&CS Delivery / T&A** | Always — joint technical evaluation |
| **I&TS** | When the solution includes infrastructure or telecom elements not in the GICT Service Catalog |
| **Cyber Security** | When the solution is innovative and security controls are not standardized yet |
| **Other GICT units affected** | For qualitative/quantitative information about their perimeter |
| **P&C Applicant Unit** | For Business Initiatives — financial evaluation and benefits calculation |

Record which units were involved in **Section 21** of the RA.

## OP35 §6.0 — Buy or Make Decision

For every new digital initiative the RA must document the outcome of the **Buy or Make Decisional Framework**:

1. **Existing portfolio check**: Does a product in the Delivery Unit portfolio already address the same need? → Adopt existing.
2. **Buy evaluation**: Are there market solutions (Buy/Hybrid Solution) that fit the need? → Evaluate against blocking requirements.
3. **Make evaluation**: Must the solution be developed from scratch? → Justify with technical and economic rationale.

The result of this framework must also be included in the **Capex ICT — Investment Memo Template** (EGS Document Library). Reference this in Section 21.

## OP36 — Design-by-Default Compliance Map

Each of the seven OP36 design-by-default requirements maps to a specific RA section:

| OP36 Requirement | Policy Reference | Primary RA Section | Checklist Item |
|---|---|---|---|
| **Cyber Security by Design** | PL No. 17, OP No. 2420 | §10 Security Architecture | Cyber Risk Assessment (CRA) status |
| **Digital Accessibility (WCAG 2.1 AA)** | PL No. 1142 | §10 Security Architecture / §14 NFRs | Accessibility Statement or VPAT |
| **Personal Data Protection by Design** | PL No. 344 | §11 Data & State | DPIA triggered? Privacy by Design tool activated? |
| **Adoption by Design** | OP36 §4.9 | §20 Transition Plan | Adoption KPIs defined, Adoption Chapter involved |
| **Quality Management** | ICT OI No. 3703 | §14 NFRs / §13 CI/CD | SW Intelligence practices, test strategy |
| **Data Security in non-production** | OP36 §4.12 | §10 Security Architecture | Non-prod data controls, masking/pseudonymization |
| **Intellectual Property by Design** | OP No. 2059, OP No. 1785 | §9 Technology Choices | IP Assessment / FTO for OSS and third-party code |

## RA Document Template

Generate the RA using **exactly** these sections in this order. Adapt content to the domain but preserve the structure.

```markdown
# Reference Architecture: <Title>

**Version:** <1.0>
**Status:** <Draft | Requested Approval | Approved>
**Owner:** Technologies and Architectures
**Audience:** <comma-separated roles>
**Last Updated:** <YYYY-MM-DD>
**OP35 Initiative:** <Initiative name or "Not applicable">
**OP36 Triggers:** <List: WCAG / DPIA / IP Assessment / Adoption KPIs — or "None identified">

---

## 1. Summary

<2-4 paragraphs explaining what this RA proposes, the key architectural decisions, and how the components fit together. Use bullet points for each major component with source links in double-bracket format: [[label]](url). End with alignment notes to related RAs if applicable.>

---

## 2. Scope

**In scope**
- <bullet list of what this RA covers, with source links>

**Out of scope**
- <bullet list of exclusions>

---

## 3. Goals & Drivers

<Table or bullet list mapping business/technical goals to technology enablers. Include source links.>

---

## 4. Assumptions & Constraints

<Bullet list of deployment assumptions (e.g., Kubernetes-first), technology constraints, standards (CloudEvents, OTel), and organizational constraints (OP35/OP36 compliance). Include source links.>

---

## 5. Architecture Principles

<Bullet list of principles: event-driven first, cloud-native, secure-by-default, separation of concerns, standards-based, etc. Include source links.>

---

## 6. Capability Model

<Table with columns: Capability | Description | Technology. Each row maps an architectural capability to the technology implementing it, with source links.>

---

## 7. Logical Architecture

<Describe the high-level flow as numbered steps (1-N). Include an ASCII or Mermaid architecture diagram showing component relationships. Reference source links for each technology interaction.>

---

## 8. Physical / Deployment View (Kubernetes)

<Describe deployment topology: namespaces, pods, sidecars, networking. Use Kubernetes-first conventions. Include source links.>

---

## 9. Technology Choices (Evaluated Options)

### 9.1 Feature Comparison

<For each technology category, list evaluated options with descriptions, trade-offs, and source links. Use subsections per category.>

### 9.2 Notes

<Additional selection criteria, migration notes, deprecation warnings.>

---

## 10. Security Architecture

<Bullet list covering: service-to-service security (mTLS, capability-based), secrets management, identity/IAM integration, network policies. Include source links.>

---

## 11. Data & State

<Describe state management per component: workflow state, event stores, caches, databases. Include source links.>

---

## 12. Developer Experience & Tooling

<SDKs, CLIs, modeling tools, IDE extensions, local development patterns. Include source links.>

---

## 13. CI/CD Integration

<Helm/Kustomize, validation, testing, telemetry pipeline as code. Include source links.>

---

## 14. Non-Functional Requirements (targets)

<Scalability, resilience, observability targets per component. Include source links.>

---

## 15. Observability

<Instrumentation strategy: traces, metrics, logs across all components. Key metrics to track. Include source links.>

---

## 16. Eventing & Messaging

<Event backbone, routing, cross-stack interop patterns. Include source links.>

---

## 17. Risks & Mitigations

<Bullet list of risks with corresponding mitigations. Include source links.>

---

## 18. Cost Considerations

<Operational footprint, sizing guidance, cost optimization strategies.>

---

## 19. Decision & Rationale

<Formal decision statement and rationale explaining why this architecture was chosen over alternatives.>

---

## 20. Transition Plan

**Pilot (4-6 weeks)**
<Steps to bootstrap and validate the architecture.>

**Bootstrap assets**
<Templates, samples, manifests to provide.>

**Enablement**
<Workshops, runbooks, guardrails.>

**Rollout phases**
<Phase 1-3 progressive adoption.>

---

## 21. Compliance & Governance

### 21.1 OP35 — Digital Initiatives Activation Compliance

> Complete this section when this RA supports a digital initiative (OP35 narrative 6.0 output).

| OP35 Requirement | Status | Notes |
|---|---|---|
| **Buy or Make Decisional Framework** (OP35 §6.0) | ✅ / ⚠️ / ❌ / N/A | Decision: Buy / Make / Hybrid / Existing portfolio |
| **TA&CS Delivery/T&A involvement** (OP35 §6.0) | ✅ / ⚠️ / ❌ / N/A | Unit representative: |
| **I&TS involvement** (OP35 §6.0 — infra/telecom) | ✅ / ⚠️ / ❌ / N/A | Required if solution uses infra/telecom not in Service Catalog |
| **Cyber Security involvement** (OP35 §6.0 — innovative solutions) | ✅ / ⚠️ / ❌ / N/A | Required for non-standard security controls |
| **Investment Memo alignment** (OP246 via OP35 §9.0) | ✅ / ⚠️ / ❌ / N/A | IM reference: |
| **Capex ICT estimate included** (OP35 §6.0) | ✅ / ⚠️ / ❌ / N/A | See §18 Cost Considerations |
| **High-level architecture documented** (OP35 §6.0) | ✅ / ⚠️ / ❌ / N/A | See §7 Logical Architecture |
| **Technical/functional impact assessed** (OP35 §6.0) | ✅ / ⚠️ / ❌ / N/A | See §17 Risks |
| **Macro plan included** (OP35 §6.0) | ✅ / ⚠️ / ❌ / N/A | See §20 Transition Plan |

### 21.2 OP36 — Design-by-Default Compliance

| OP36 Requirement | Policy | Status | Notes |
|---|---|---|---|
| **Cyber Security by Design** (§4.6) | PL No. 17, OP No. 2420 | ✅ / ⚠️ / ❌ / N/A | CRA status; see §10 |
| **Digital Accessibility — WCAG 2.1 AA** (§4.7) | PL No. 1142 | ✅ / ⚠️ / ❌ / N/A | Accessibility Statement / VPAT; see §14 |
| **Personal Data Protection by Design — GDPR** (§4.8) | PL No. 344 | ✅ / ⚠️ / ❌ / N/A | DPIA triggered? Privacy by Design tool? |
| **Adoption by Design** (§4.9) | OP36 §4.9 | ✅ / ⚠️ / ❌ / N/A | Adoption KPIs; Adoption Chapter involved; see §20 |
| **Quality Management** (§4.11) | ICT OI No. 3703 | ✅ / ⚠️ / ❌ / N/A | SW Intelligence practices; test strategy; see §13 |
| **Data Security — non-production** (§4.12) | OP36 §4.12, PL No. 33 | ✅ / ⚠️ / ❌ / N/A | Data masking / pseudonymization strategy |
| **Intellectual Property by Design** (§4.13) | OP No. 2059, OP No. 1785 | ✅ / ⚠️ / ❌ / N/A | IP Assessment / FTO for OSS; see §9 |

### 21.3 General Governance

<Versioning, review processes, security controls, policy enforcement. Reference OP35/OP36 where applicable.>

---

## 22. Appendix (Quick Links)

<Bullet list of key documentation URLs for all technologies referenced.>

---

## Reference Implementation Snippets

<YAML, code, or configuration samples illustrating key integration points. Use fenced code blocks with language tags.>
```

## Writing Guidelines

1. **Source everything** — Every technology claim must include a `[[label]](url)` link to official documentation. Do not invent URLs; fetch and verify them.
2. **Use the existing style** — Study [docs/001_RA_workflow.md](in the source repository documentation/001_RA_workflow.md) for tone, density, and formatting conventions. Match the level of detail.
3. **Cross-reference related RAs** — Link to other RAs in the catalog where capabilities overlap (e.g., "See [001_RA_workflow.md](in the source repository documentation/001_RA_workflow.md) for orchestration patterns").
4. **ASCII diagrams** — Use ASCII box-and-arrow diagrams for architecture overviews (the existing RAs use this style). Mermaid is acceptable as a secondary option.
5. **Tables for comparisons** — Use Markdown tables for feature comparisons, capability models, and requirements matrices.
6. **Be opinionated** — RAs are not surveys. State clear decisions and rationale. Evaluated alternatives go in Section 9.
7. **OP35 §6.0 alignment** — When the RA supports an initiative, Section 7 (Logical Architecture) and Section 18 (Cost Considerations) directly feed the Investment Memo. Section 9 (Technology Choices) contains the Buy or Make framework output. These three sections must be complete before the RA can be submitted to the DE PC&CM.
8. **OP36 design-by-default** — Section 10 (Security Architecture) must address Cyber Security by Design (PL No. 17 / OP No. 2420), Digital Accessibility requirements (PL No. 1142), and data security in non-production environments (§4.12). Section 11 (Data & State) must address Personal Data Protection by Design (PL No. 344). Section 9 (Technology Choices) must flag any IP Assessment or FTO needs for OSS components (OP No. 2059 / OP No. 1785). Section 20 (Transition Plan) must include Adoption KPIs aligned with OP36 §4.9. Section 21 must contain the completed OP35 and OP36 compliance checklists.

## File Naming

The output file must follow: `docs/RA/NNN_RA_<slug>.md`

- `NNN` = next sequential number (check `docs/index.md` for the latest)
- `<slug>` = lowercase, underscores, short domain descriptor

---

## Documentation Site

This repository publishes the `docs/` folder as a static documentation site via **[Zensical](https://zensical.io)** (a MkDocs-based build tool) and **GitHub Pages**.

### Site Configuration — `zensical.toml`

The site is configured in `zensical.toml` at the repository root. Key conventions:

| Key | Value | Notes |
|-----|-------|-------|
| `docs_dir` | `"docs"` | Source folder — all RA, ADR, OP files live here |
| `site_dir` | `"public"` | Build output — uploaded as GitHub Pages artifact |
| `use_directory_urls` | `false` | Keeps `.md` links valid both locally and on the site |
| `nav` | explicit entries | Every new document **must** be added to the `nav` table |

When you create or update an RA, ADR, or OP file you **must** also update `zensical.toml` to add the new file to the appropriate `nav` group. Follow the existing pattern:

```toml
nav = [
  { "Home" = "index.md" },
  { "Reference Architectures" = [
    "RA/001_RA_workflow.md",
    "RA/001_RA_workflow_PoC-plan.md",
    "RA/002_RA_serverless_microservices.md",
    # ... add new entry here, in numerical order
  ]},
  { "ADR" = [
    "ADR/ai_sdlc_architecture_decision.md",
    # ...
  ]},
  { "Organizational Procedures" = [
    "OP/OP35-Digital-Initiatives-Activation.md",
    "OP/OP36-Solutions-Development-Release-Management.md",
  ]},
]
```

### GitHub Actions Workflow — `.github/workflows/pages.yml`

The workflow at `.github/workflows/pages.yml` builds and deploys the site automatically on every push to `main`. The pipeline:

1. **Checks out** the repository (`actions/checkout@v5`)
2. **Installs** `uv` and Zensical (`uv venv .venv && uv pip install zensical`)
3. **Builds** the site (`zensical build`) — outputs to `public/`
4. **Uploads** the `public/` folder as a Pages artifact (`actions/upload-pages-artifact@v4`)
5. **Deploys** to GitHub Pages (`actions/deploy-pages@v5`)

Required repository settings:
- **Pages source**: GitHub Actions (not `gh-pages` branch)
- **Permissions** in the workflow: `pages: write`, `id-token: write`

### Checklist When Adding a New RA

After generating `docs/RA/NNN_RA_<slug>.md`:

- [ ] Add the file path to the `nav` in `zensical.toml` (correct section, numerical order)
- [ ] Add a row to the **Reference Architecture Index** table in `docs/index.md` with the `RA/` prefix path
- [ ] Verify links use relative paths from `docs/` root (e.g., `RA/001_RA_workflow.md`), not absolute paths
- [ ] Confirm `use_directory_urls = false` is set so `.md` links resolve correctly on the published site

After creating the RA, update `docs/index.md` to add the new entry to the Reference Architecture Index table.

## Companion Documents

If the user requests it, also create a PoC plan following the pattern in `docs/001_RA_workflow_PoC-plan.md`: `docs/NNN_RA_<slug>_PoC-plan.md`.

## Quality Checklist

Before finalizing, verify:

**Structure**
- [ ] All 22 sections present (1-22 + Reference Implementation Snippets)
- [ ] Every technology has at least one source link
- [ ] ASCII architecture diagram in Section 7
- [ ] Capability model table in Section 6
- [ ] Technology comparison table in Section 9
- [ ] Risks and mitigations in Section 17
- [ ] Transition plan with concrete phases in Section 20
- [ ] File named correctly and index.md updated
- [ ] Cross-references to related RAs included

**OP35 — Digital Initiatives Activation (§6.0)**
- [ ] Buy or Make Decisional Framework outcome documented (Section 9 or Section 21)
- [ ] TA&CS Delivery/T&A involvement noted (Section 21)
- [ ] I&TS involvement noted if infra/telecom is in scope (Section 21)
- [ ] Cyber Security involvement noted for innovative solutions (Section 21)
- [ ] High-level architecture present (Section 7)
- [ ] Preliminary cost estimate present (Section 18)
- [ ] Macro plan / deliverables present (Section 20)
- [ ] Technical/functional impact on existing systems addressed (Sections 4 and 17)
- [ ] OP35 compliance table filled in Section 21.1

**OP36 — Design-by-Default Compliance**
- [ ] Cyber Security by Design addressed in Section 10 (PL No. 17, OP No. 2420)
- [ ] Digital Accessibility / WCAG 2.1 AA addressed in Sections 10 or 14 (PL No. 1142)
- [ ] Personal Data Protection by Design addressed in Section 11 (PL No. 344 — DPIA trigger assessed)
- [ ] Adoption KPIs defined in Section 20 (OP36 §4.9)
- [ ] Quality Management / SW Intelligence practices noted in Section 13 (ICT OI No. 3703)
- [ ] Data security in non-production environments addressed in Section 10 (OP36 §4.12)
- [ ] IP Assessment / FTO need identified for any OSS or third-party code in Section 9 (OP No. 2059 / OP No. 1785)
- [ ] OP36 compliance table filled in Section 21.2
