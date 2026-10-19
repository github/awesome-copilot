---
name: agent-cost-evidence-audit
description: 'Audit local LLM and agent cost evidence before making cost, cost-per-success, retry, fallback, cache, provider-attribution, or billing claims. Use for OTLP/OpenInference JSON, agent run reports, usage exports, and benchmark results where missing provenance, aggregate-only usage, or estimated prices could create misleading conclusions.'
---

# Agent Cost Evidence Audit

Audit whether local evidence supports the cost conclusion a developer wants to make. Keep unknown values unknown and separate runtime evidence, price-based estimates, and billed cost.

## When to use

- Review an OTLP/OpenInference JSON export before calculating agent cost.
- Review an agent or benchmark report before reporting cost per successful task (CPS).
- Check provider attribution, cache accounting, retry/fallback claims, or billing reconciliation.
- Explain why aggregate usage or an estimated replay is insufficient for a stronger claim.

## Audit workflow

1. Identify the proposed conclusion: per-call estimated cost, per-task estimated cost, CPS, retry tax, fallback overhead, or billed cost.
2. Locate the evidence for task, attempt, and model-call boundaries. Record absent levels as `MISSING`; do not synthesize calls from aggregate totals.
3. Run the bundled validator against a normalized local audit input:

   ```shell
   python scripts/audit_agent_cost_evidence.py --input path/to/audit-input.json
   ```

   Use `python scripts/audit_agent_cost_evidence.py --self-test` to execute the bundled synthetic regression cases.
4. Review each finding against the source export. Fix the evidence producer or narrow the conclusion; do not edit observed evidence to make the audit pass.
5. Report supported conclusions, unsupported conclusions, and unresolved fields separately.

The validator consumes the compact audit-input shape demonstrated in [the synthetic fixture](./fixtures/synthetic-audit-cases.json). Map source fields with provenance before running it. The fixture is synthetic and does not describe any real user, provider account, invoice, or API call.

## Required semantic checks

### Provider attribution

- Treat `llm.system` as instrumentation/system semantics, not hosting-provider evidence.
- Accept a hosting provider only from an explicit provider field or explicit caller-supplied evidence.
- Keep the provider unknown when neither source exists.
- Reject conflicting provider evidence. Never guess from model name, URL, or hostname.

### Usage and cache

- Preserve input, output, cache-read, and cache-write counters as distinct observed fields.
- Determine whether the input counter includes cached tokens before applying rates.
- Flag pricing that charges both an inclusive input total and its cache-read subset.
- Keep absent counters missing; never convert them to zero.

### Task, attempt, and call boundaries

- Do not create `model_calls` from an aggregate usage or cost total.
- Treat span status as transport/execution status. It does not prove task acceptance.
- Require explicit retry evidence before labeling another attempt a retry.
- Require explicit fallback evidence before labeling a model or provider change a fallback.

### Cost semantics

- `UNPRICED` means the available usage cannot be priced under the selected rate card. It is not zero cost.
- Label rate-card replay as estimated cost and record its rate-card identity/effective date.
- Do not populate `BilledCost` from current-price replay. Billed cost requires billing or invoice evidence.
- Calculate CPS only when both estimated cost and accepted task outcomes have evidence.

## Finding codes

| Code | Meaning |
| --- | --- |
| `PROVIDER_FROM_LLM_SYSTEM` | Hosting provider was inferred from `llm.system`. |
| `MISSING_PROVIDER` | A priced conclusion has no hosting-provider evidence. |
| `PROVIDER_CONFLICT` | Raw and explicit provider evidence disagree. |
| `CACHE_DOUBLE_COUNT` | Inclusive input and cache-read tokens are both priced. |
| `AGGREGATE_AS_MODEL_CALLS` | Model-call records were fabricated from aggregate data. |
| `SPAN_OK_AS_TASK_SUCCESS` | Span status was used as task acceptance. |
| `RETRY_WITHOUT_EVIDENCE` | Retry labeling lacks an explicit boundary/reason. |
| `FALLBACK_WITHOUT_EVIDENCE` | Fallback labeling lacks explicit evidence. |
| `UNPRICED_AS_ZERO` | Unsupported or unpriced usage was reported as zero. |
| `ESTIMATE_AS_BILLED_COST` | Estimated replay was represented as billed cost. |

## Report format

Return:

1. proposed conclusion;
2. evidence inventory by task, attempt, and call;
3. findings with source field paths;
4. supported calculations;
5. unsupported calculations and missing evidence;
6. whether the result is estimated, billed, or unpriced.

## Gotchas

- **Do not equate `llm.system` and `llm.provider`.** OpenAI-compatible APIs can be hosted by different providers.
- **Do not infer task success from `OK`.** Acceptance belongs to the application or benchmark.
- **Do not treat repeated calls as retries.** Tool loops and multi-step agents normally issue multiple calls.
- **Do not treat model changes as fallback.** Routing, experimentation, and explicit fallback are different facts.
- **Do not claim invoice reconciliation from a rate-card replay.** The estimate lacks contract prices, discounts, credits, currency settlement, and invoice adjustments.

## References

- [Agent Cost Evidence v0.1 JSON Schema](https://aicostbudget.com/schemas/agent-cost-evidence-v0.json) — optional public interchange target after evidence passes these checks.
- [OpenInference OTLP mapping notes](https://aicostbudget.com/en/docs/openinference-agent-cost-adapter) — example of explicit provider, outcome, retry, and fallback boundaries.
