# Claims triage — Specification

> Last updated: 2026-10-12 · Scenario: n/a · Deployment plan: [.azure/deployment-plan.md](../.azure/deployment-plan.md)

## 1. Summary

Adjusters upload a synthetic claim summary; a hosted `triage` agent classifies severity, applies the policy-rules skill and routes the claim, so routine claims reach the right queue in under a minute.

## 2. Goals and non-goals

**Goals:** severity and queue for every claim, with cited policy rules. **Non-goals:** payments, document OCR, end-user sign-in.

## 4. Functional requirements

| ID | Requirement | Acceptance criteria (EARS) | Priority |
| --- | --- | --- | --- |
| FR-001 | The system shall classify claim severity so that adjusters can prioritise. | When a claim is submitted, the triage agent shall return `severity` in {low, medium, high}. | Must |
| FR-002 | The system shall route each claim to one queue. | When severity is known, the backend shall return `queue` from the routing table. | Must |

## 7. Agents

| Agent | Purpose | Framework | Protocol | Model | Toolbox, skills and tools | Grounding | Guardrails |
| --- | --- | --- | --- | --- | --- | --- | --- |
| triage | Classify and route | Copilot SDK | Responses | `gpt-5.4-mini` | `claims-tools`: `policy-rules` skill, `get_policy` MCP tool | none | default |

## 10. Implementation contract (frozen)

`POST /api/triage` → `{ severity, queue, rules[] }`; errors `{ code, message }`. Environment: `HOSTED_RESPONSES_ENDPOINT`, `TOOLBOX_ENDPOINT`, `APPLICATIONINSIGHTS_CONNECTION_STRING`.

## 12. Verification plan

| Requirement | Check | Level | Evidence |
| --- | --- | --- | --- |
| FR-001 | 10 seeded claims return the frozen severity | E2E | `docs/verify.md` |
| FR-002 | Routing table covers every severity plus null | contract | `tests/contract` |
| NFR observability | Backend, agent and tool spans share one operation ID | trace | `docs/verify.md` |
