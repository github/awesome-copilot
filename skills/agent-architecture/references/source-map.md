# Skill Foundations and Transfer Boundaries

## Addition: work discovery and architecture handoff

Reviewed [kotlyar/agent-architecture-builder](https://github.com/kotlyar/agent-architecture-builder/tree/d3e5570cef4f01adc142aa478f3967b7bf165fec), snapshot `d3e5570cef4f01adc142aa478f3967b7bf165fec` (MIT). Basis: SKILL.md and references/discovery-interview.md, architecture-decisions.md, control-interface-and-storage.md, delivery-package.md under skills/hermes-agent-builder. This is an idea source, not evidence of interview effectiveness or a particular runtime's readiness.

Adapted: moving from desired change to real episodes/functions; one substantive question; visible progress and sufficiency conditions; separate selection of method/tool/temporary worker/persistent boundary; independent justification of control interface/storage; verifiable implementation handoff. These are developed in discovery-protocol.md, architecture-selection.md, and result-delivery.md.

Not transferred: mandatory Hermes package/installer/ZIP, fixed frontend stack, prohibition of useful early designs before a complete interview, or universal profile/orchestrator admission formulas. This skill designs different agent classes, including stateless agents and simple workflows; an external service may own state. Decision factors, not platform restrictions, were adopted. New wording was synthesized; upstream code/templates were not copied.

Additional grounds are observations from a Jira/Pipeline role test: overloaded compound questions, implicit operator interface, missing brief owner page, consequences of proposed limits, and unverified pilot feasibility. They define regression scenarios, but one synthetic test does not prove universal quality.

## Source

“Инженерия AI-агентов и ремесло разработчика” (“AI Agent Engineering and the Developer's Craft”), 2026, a textbook based on Dmitry Bereznitsky's channel. Supplied file: `Учебник-AI-агенты-и-ремесло-разработчика_1.pdf` (“Textbook—AI Agents and the Developer's Craft”), 287 PDF pages. SHA-256: `441f1c37a6b42bcae2bf10ce4c130a6f34271f930e67f6b90338437a4256fe73`.

In this version, printed page n corresponds to PDF page n+1. The textbook is an editorial reworking of 32 videos with automatically obtained transcripts, not a normative standard or API reference (printed pp. 10–12; PDF 11–13). Video map: printed pp. 284–286; PDF 285–287. Do not assume the edition or specific figures current without verification.

The skill is self-contained: the following preserves synthesized principles and provenance, not a book copy. If original verification is needed, locate the supplied PDF; its absence does not prevent using the procedure but prevents confirming new quotations.

## Origins of decisions

| Textbook basis | Printed / PDF pages | Use |
|---|---|---|
| Ch. 1–4: LLMs, context, knowledge, model selection | 15–40 / 16–41 | Context as a limited resource; model/knowledge-access selection by task and measurement |
| Ch. 5: anatomy, pattern ladder, loop, tools | 43–50 / 44–51 | Start simple; separate workflow from dynamic model choice; explicit loop limits and pre-effect checks |
| Ch. 6: memory lifecycle and knowledge provenance | 51–58 / 52–59 | Separate memory types, source, and derived summary; account for conflicts, staleness, concurrency, poisoning |
| Ch. 7: constrain, inform, verify, correct; seven harness layers | 59–66 / 60–67 | Runtime, tools, context, lifecycle, observability, verification, governance as coverage map; constraints outside prompts |
| Ch. 8–9: tools, MCP, multiple agents | 67–79 / 68–80 | Domain tool contracts; justify protocol/coordination rather than mandatory multi-agent systems |
| Ch. 10: safety, failure, observability | 80–92 / 81–93 | Action policy, idempotency, operation-specific degradation, action outcomes, cost per task |
| Ch. 11–13: research, design, AI-work verification | 95–116 / 96–117 | Separate facts, architecture, implementation; architectural views “what / how / why / how to verify” |
| Ch. 14–18: architecture and domain | 119–151 / 120–152 | Responsibility/ownership boundaries, invariants, proportionate distribution/abstraction |
| Ch. 19–21: SOLID and code quality | 153–171 / 154–172 | Changeability/clarity as context; do not turn the skill into a style linter |
| Ch. 22–23: security and MCP | 174–188 / 175–189 | Untrusted tool descriptions/data, least privilege, observed real effects |
| Appendix B.1, B.3, B.5 | 266–269, 272–274, 277–279 / 267–270, 273–275, 278–280 | Architecture, domain, operations, security coverage checks |

Career, burnout, job-interview, and post-quantum migration chapters are not mandatory agent checks: they are outside the two declared modes. The adaptive interview gathers product needs, not the interlocutor's competency assessment.

## What is this skill's original synthesis

Design/audit modes, interview sequence, provenance-bearing requirements register, R→D→E links, finding format, “defect / unknown / inapplicable” distinction, stopping criteria, and readiness statuses were developed for the user's request. The textbook supplies technical foundations but not a ready complete customer-needs discovery process.

Parameter/expiry-bound approval detail, design-readiness versus production-readiness, revoked ACL checks in indexes/caches, and post-crash behavior are engineering operationalizations, not the textbook author's verbatim requirements.

## Caveats and corrections

1. **Example numbers are not standards.** 40–50% of the window, ten steps, tool counts, mandatory 20→3–5 reranking results, latency, and prices depend on model/task. Use as testable hypotheses if relevant at all. Numerical architectural limits need status and grounds.
2. **No universal subsystem set exists.** Four memory types are a taxonomy, not a requirement for four stores. RAG, reranker, graph, model router, ensemble guards, semantic-loop detector, MCP, and separate services need justification. Existing runtime or owning API may enforce controls.
3. **Memory and canon.** “Wiki is only a cache,” append-only, and a single writer are shared-memory architecture options. Do not apply automatically to every wiki, transactional database, or authored document. Version control prevents lost updates but does not resolve semantic conflicts itself. Recording a business effect and background recording of an optional memory are different operations.
4. **Invariants.** Define within domain/policy-version boundaries. A check may depend on authoritative state, time, and explicit exceptions without becoming probabilistic. Do not literally import “anything changeable or having exceptions must not live in code.”
5. **Security.** Printed p. 90 (PDF 91) incorrectly says Excessive Agency is outside OWASP Top 10. In the 2025 edition it is LLM06. A classifier does not prevent every injection or replace permission checks. A local/open-source MCP server does not prove safety.
6. **Scores and cases.** Book incident stories, attack rates, savings, and comparative percentages are not evidence of a specific implementation's quality/risk. Audits rely on reachable paths and project requirements.

## Verified primary materials

Read on 2026-09-08; recheck changing APIs, versions, and policies for concrete designs. These refine principles without adding a mandatory stack.

- [Anthropic — Building effective agents](https://www.anthropic.com/engineering/building-effective-agents): predefined workflow versus model-selected next steps, simple solutions, feedback, stopping conditions. The article itself notes changing tooling; its product list is not adopted as current skill recommendations.
- [OWASP — LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/): confirms the classification correction; authority controls belong outside LLM decisions and may live in the owning system/tool.
- [AWS Builders’ Library — Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/): client intent identifier, server retry-processing guarantee, parameter binding, key retention. A client-side key alone does not remove effect ambiguity.

## Addition: capability structure and Harness_ru

Analyzed on 2026-09-09: [Harness_ru, revision 91750c0337f449bad1764d0e2b813ce9f8d8f2b1](https://github.com/justxor/Harness_ru/tree/91750c0337f449bad1764d0e2b813ce9f8d8f2b1). This course mainly concerns coding agents; it is supplementary material, not a universal standard. Modules 4–5, 8–11, 13–14 contributed addressable instructions, continuation from external state, result confirmation, and feedback. Scripts/templates are not included in the skill.

Capability specifications, the “without new domain design” criterion, and sketch/package distinction are original synthesis for the user's request. Detail does not require more agents, services, or files. Primary materials read on 2026-09-09:

- [Anthropic — Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills): packaging procedural expertise and loading material on demand.
- [Agent Skills — Specification](https://agentskills.io/specification): package structure as a possible implementation format, not a separate-package requirement for every capability.
- [Anthropic — Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents): context selection, on-demand loading, preserving material state.
- [Anthropic — Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents): cross-session artifacts/verifiable progress; adapt software-development examples to domain.
- [Anthropic — Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents): outcome/interaction checks, combined programmatic/model/human evaluation; successful scenarios remain regressions.

Not transferred: universal numerical thresholds, repository as the only possible source of truth, mandatory graphs/separate LLM evaluators, or static checks equated with agent quality. Independent evaluation is useful according to risk but gives no guarantee. Executing JSON commands through eval is not a recommended trust boundary. Do not remove permission checks or known critical regressions merely because a small sample passes without them.

## Addition: diagnosis and review

The README's “How to fix an agent: diagnostic protocol” section and Harness_ru modules 1–2 were rechecked on 2026-09-09 at the same revision. Layered investigation, cold-start context-loading checks, check sensitivity, and component comparisons were adapted into [diagnostic-review.md](diagnostic-review.md). Case cards, competing hypotheses, failure-condition preservation, cause/consequence separation, and fix review operationalize them for this skill.

Not accepted as rules: “one symptom—one layer,” two repeats as cause proof, mandatory file-based fixes, human evaluation as no checking, a single E2E as sufficient proof, or the model as an almost impossible cause. Module 2 already calls zero deterioration after disabling ambiguous; that more precise caveat is preserved. Repair durations and “model always last” are not normative. Source diagnostic scripts are neither run nor transferred; negative controls must check the actual project gate, not just a separate tool.

## Addition: general architecture and measurement

Research on 2026-09-09/10 covered 21 repositories and 34 primary materials. Principles were transferred, not popularity rankings, a ready stack, or library settings. Sources below directly support changes A1–A10; card schemas/applicability boundaries are original synthesis. A pinned snapshot evidences that version's behavior; recheck current APIs and product defaults during design.

| Addition | Primary basis | Transfer and limitation |
|---|---|---|
| A1: topology selection | [Scaling Agent Systems](https://arxiv.org/abs/2512.08296), [12-Factor Agents](https://github.com/humanlayer/12-factor-agents/blob/d20c728368bf9c189d6d7aab704744decb6ec0cc/README.md) | Task properties and aggregate-budget comparison; external benefit thresholds are not normative |
| A2: evaluation axes/gates | [tau2 evaluation](https://github.com/sierra-research/tau2-bench/blob/672227c6b6676edc20d57ea53b7000262aae77b9/docs/evaluation.md), [AgentDojo task contracts](https://github.com/ethz-spylab/agentdojo/blob/089ed468cf3ed0322acc66b0211f26d9d90dbf60/src/agentdojo/base_tasks.py) | Separate outcomes/actions/constraints; AgentDojo security=True means attack success, so verify metric direction |
| A3: measurement reliability | [Inspect scoring policy](https://inspect.aisi.org.uk/scoring-policy.html), [tau2 grading changes](https://github.com/sierra-research/tau2-bench/blob/672227c6b6676edc20d57ea53b7000262aae77b9/README.md), [Anthropic evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Omissions, denominator, versions, repeatability; reducer/NaN semantics are tool-specific |
| A4: tools as a selection interface | [Writing effective tools](https://www.anthropic.com/engineering/writing-tools-for-agents) | Domain semantics, distinguishability, completeness/output volume; no mandatory wrapper per endpoint |
| A5: exact execution guarantees | [Agents SDK guardrails](https://github.com/openai/openai-agents-python/blob/83c737fd0b8d9a53bd39fa2a0856070417bb0bd3/docs/guardrails.md), [LangGraph checkpointers](https://docs.langchain.com/oss/python/langgraph/checkpointers), [mini-swe-agent DefaultAgent](https://github.com/SWE-agent/mini-swe-agent/blob/04d809ceab9df28f9adaed044884180159172930/src/minisweagent/agents/default.py) | Control scope/timing, durability/replay, budget overshoot from started calls; SDK defaults are not norms |
| A6: delegation | [MAST v3](https://arxiv.org/abs/2503.13657v3), [Multiagent patterns](https://www.anthropic.com/research/multiagent-systems) | Handoff/integration contract; a failure taxonomy does not prove a specific failure's cause |
| A7: procedure evolution | [Hermes](https://github.com/NousResearch/hermes-agent/blob/474143da81de5661424475a2e9e4ba60dfefa467/README.md), [Letta Code](https://github.com/letta-ai/letta-code/blob/d043d4626f244e1804d5304ed4d5fee891aa7fa4/README.md) | Separate experience recording from behavior admission; runtime self-change capability does not prove improvement |
| A8: isolation | [smolagents secure execution](https://huggingface.co/docs/smolagents/tutorials/secure_code_execution) | Code/tool/process isolation boundary; virtual filesystems/filters are not a full security boundary |
| A9: interaction | [Pydantic deferred tools](https://github.com/pydantic/pydantic-ai/blob/0ec8a5dcc9c30e82e91d63af20e5d92f1456fac5/docs/deferred-tools.md) | Conversation/task/run, pause/continue; cancellation/correction/streaming contracts synthesized from product needs |
| A10: controlled improvement | [GEPA adapter](https://github.com/gepa-ai/gepa/blob/0632cdb5dcc052e690eab439e1b4a7e3e9cfe407/src/gepa/core/adapter.py), [GEPA paper](https://arxiv.org/abs/2507.19457) | Component-targeted feedback, protected evaluation/comparison; no mandatory optimizer or authority to change criteria |

Do not transfer code, universal bash, mandatory multiple agents, or publication of new procedures without authority. Library examples illustrate mechanisms; applicability, configuration, and quality need separate evidence.

## Addition: AI-Disrupt PDLC—validation and continuation

User-supplied documents studied on 2026-09-10: `whitepaper_full_ru.pdf` (175 pages; SHA-256 `5e1aeccece8567d2f0db14b5f6f2f6626086ccc86f8f1f0e159fdd039237d3ba`) and `whitepaper_short_ru.pdf` (44 pages; SHA-256 `374ae1fbc5875ba107d6fd4574ad90120608b5914257896045e5aa42653bc87d`). The short version presents the same AI-Disrupt PDLC concept, not independent confirmation of the full one. Numbers below are PDF pages; full-version printed numbers are four lower. Key short-version tables were visually checked because Cyrillic extraction was incorrect.

| Source section | PDF pages | Transfer |
|---|---|---|
| Outcome hypothesis and human decision map | full 36–44; short 14 | Value card, substantive human participation, execution/effect distinction |
| Validation loop and Evidence Bundle | full 52–54 | Seven functions, evidence linkage, verifiable completion contract in validation-loop.md |
| Compaction, checkpoint, handoff, long sessions | full 48–53, 84; short 21 | execution-continuity.md and transition matrix; storage format selected by environment |
| 4.2 “Environment matters more than model”: environment functions, isolation, long tasks, capacity | full 80–87 (printed 76–83) | Four functions and integration/enforcement separation; hot/warm/cold, supervisor/RTO/RPO, task/session/horizon, breaker, asynchronous decisions, scheduler. Migration, fairness, fencing, window-boundary, and test contracts are adaptations, not verbatim source guarantees |
| Contextual authority, ADLC, Guardian | full 96–105, 135; short 24, 31–32 | Concrete-operation admission, controller verification, composite version, retirement |
| Validation pace and measurement distortion | full 53–55, 133–135 | Review queue, human labor, score comparability; no fixed investment ratio |

This is an enterprise software-development concept, not a universal agent standard. Contract schemas, adaptation to noncoding tasks, version-bound evidence, snapshot consistency, and late-event checks are this skill's engineering synthesis. Seven functions do not mean seven services; four handoff functions do not mandate init.sh/progress.md/feature-list.json on every OS.

Do not transfer section 4.2's harness code share, zero side effects, fixed RTO/RPO, three physical storage tiers, mandatory Kubernetes/Redis/explanation LLM, or unconditional interactive priority as guarantees. Environment design does not exclude model errors; accepted policy defines priority, and real paths establish recovery/safety. Moving to cold storage does not automatically satisfy applicable retention rules.

Not accepted as norms: arithmetic R0–R5 ladder; mandatory multiple agents/LLM reviewer; native APIs always more reliable than MCP; fixed evaluation-pass/compaction percentages and time budgets; automatic fine-tuning on drift; security guarantees from a hook/sandbox; legal retention/residency periods without applicability checks. Whitepaper business forecasts, risk probabilities, and relative improvements do not prove a particular agent's outcome.
