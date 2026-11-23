---
name: eval-plan
description: "Write the evaluation plan for an AI feature before building it. Use when an AI feature is proposed or scoped and no one can say how quality will be judged. Derives eval criteria from failure modes, designs offline and online evaluation, sets a north-star metric with guardrails, and ends with pass/fail launch gates. Decides quality before code, so eval-driven development and agent evaluation have a plan to implement."
---

# Eval Plan for AI Features

## What this skill does

Most AI features ship with a demo and a dashboard, but no written answer to the question that matters first: how will we know if this is good enough to launch, and how will we know if it gets worse?

This skill writes that answer before building starts. It turns a feature idea into an evaluation plan: the failure modes that define quality, the offline cases that test them, the launch bar set in advance, the online checks that follow, and the pass/fail gates that decide whether the feature ships, stays, or rolls back.

It is a planning skill, not an implementation skill. It produces a decision document. Other skills build the harness and run the evals against that document.

## When to use it

- An AI feature, agent, or copilot is proposed or scoped, and no one can state how quality will be judged.
- A team is about to build prompts, retrieval, or an agent workflow without agreed success criteria.
- A shipped AI feature is being judged only by usage or vibes, and the team needs a quality bar it can defend.
- A launch review, gate, or go/no-go decision needs written criteria instead of opinions.

## When not to use it

- The eval plan already exists and the work is now building the harness, writing evaluators, or running tests. Use `eval-driven-dev` to implement the pipeline.
- The work is improving a single agent output through self-critique or refinement loops. Use `agentic-eval` for evaluation patterns on outputs.
- The feature is deterministic software with no model output to judge. Standard tests and acceptance criteria are enough; an eval plan adds nothing.
- The pain behind the feature is not yet proven. Prove the pain first, then plan the evals. A well-measured feature nobody needed is still a miss.

## How this differs from the existing eval skills

This skill does not duplicate the repo's existing strengths. It sits upstream of them, and the plan it produces is what they implement:

- `eval-driven-dev` builds an evaluation pipeline for a Python application: it instruments code, builds golden datasets, and runs tests with pixie, deriving criteria from the application's failure modes. It works once an application exists. This skill plans before an application exists: it writes the criteria, the dataset design, and the launch bar that pipeline should test against, and defines the launch and online gates. If the criteria, the dataset design, and the launch bar already exist, this skill has nothing to add; go straight to `eval-driven-dev`.
- `agentic-eval` covers patterns for evaluating and refining agent outputs: reflection, evaluator-optimizer loops, and rubric-based judging. It improves outputs after they exist. This skill decides, before building, which outputs matter, which failures are unacceptable, and what score is good enough to ship.
- `prd` writes product requirements documents, including an evaluation strategy bullet for AI-powered features. A PRD states what will be built. This skill is the full evaluation plan behind that bullet: cases, thresholds, guardrails, and gates.

Use this skill first to decide quality. Use `eval-driven-dev` and `agentic-eval` afterwards to build and run against the plan.

## The rule

No launch bar may be set after seeing results.

The thresholds, the guardrails, and the kill criteria are written before the first eval run, derived from the cost of being wrong and the quality of what the user has today. A bar moved after the numbers come in is not a bar.

## Workflow

Work the steps in order. Do not skip to dataset building before the failure modes are named, and do not set thresholds after results are known.

### Step 1. Name the failure modes

Ask: what does wrong look like for this feature, in the user's world?

List 4 to 8 failure modes, each stated as a concrete user-visible outcome, not a model property. "Hallucination" is a category. "The draft reply quotes a refund amount the policy does not allow" is a failure mode.

Cover at least these angles where they apply:

- Wrongness: false, invented, or unsupported content presented as fact.
- Retrieval: for retrieval-based features, the right source never reached the model, or the answer ignored the source it received.
- Scope: an agent takes an action beyond what the user asked for or approved.
- Tone and trust: output that is technically correct but erodes confidence, or that the user cannot check, correct, or undo.
- Cost and latency: output that is good but too slow or too expensive to serve at the volume expected.

Output: a numbered list of failure modes, each with one sentence on what the user experiences and one on what it costs if acted on.

### Step 2. Derive criteria from the failure modes

Turn each failure mode into one or two measurable criteria. A criterion names what is judged, how it is judged, and what counts as passing for a single case.

For each criterion, record:

- The failure mode it covers.
- The judge: human rubric, exact check, retrieval metric, or LLM-as-judge with a rubric. LLM-as-judge is a judge that must itself be validated in Step 5, not ground truth by default.
- The unit: per case, per session, or per user, stated explicitly.

Output: a criteria table with one row per criterion. Every failure mode from Step 1 must map to at least one criterion. Any criterion with no failure mode behind it is cut.

### Step 3. Design the offline set before building

Bootstrap 20 to 50 cases by hand, before the feature is built. The set is the contract: a release that drops the offline score does not ship.

Include, in every set:

- Realistic cases drawn from real user inputs, anonymized where needed.
- Adversarial cases: the edge cases the team already fears, ambiguous inputs, and inputs designed to trigger each failure mode from Step 1.
- The cases that must never fail: safety, money, legal, or trust-critical cases, marked as blocking. One blocking failure fails the run, whatever the average score.

Label each case with the expected behaviour or rubric, not just the input. Record the source of each case and the date it was written, so staleness can be checked later.

Output: the case list with labels, the blocking cases marked, and the count by category.

### Step 4. Set the launch bar before building

Write the thresholds now, while they are still honest.

- The overall bar: a threshold on the offline set, for example a minimum pass rate on the labelled cases.
- The per-criterion bar: a floor for each criterion that matters on its own, so a strong average cannot hide a failing safety or accuracy criterion.
- The guardrails: the metrics that must not get worse even if the main metric improves. Typical guardrails are cost per task, latency, escalation rate, and user correction rate.
- The comparison: the bar is derived from the cost of being wrong and the quality of the alternative the user has today, not from a round number. State that derivation in one sentence per threshold.

Output: the thresholds, the guardrails, and the one-sentence derivation for each, written as the launch bar section of the plan.

### Step 5. Design online evaluation and judge validation

Offline scores do not prove the feature works for real users. Plan the online half now.

- Online checks: what will be measured in production, on which slice of traffic, and how often it will be reviewed. Include at least one product-outcome measure and at least one model-quality measure, so the two can be compared.
- Silent degradation alarm: the condition that fires when the product outcome and the model-quality metric diverge, for example usage rising while quality falls. Write the alarm condition, not just the metrics.
- Judge validation: if LLM-as-judge is used anywhere, validate it against human labels on a sample of the offline set before trusting it. Record the agreement rate and the cases where judge and human disagree. A judge that has not been validated is reported as unvalidated wherever its scores appear.

Output: the online measurement plan, the alarm condition, and the judge validation step with its sample size.

### Step 6. Write the pass/fail launch gates

End with gates, not a recommendation. Each gate is a binary check against the bar from Step 4, plus the autonomy decision.

- Gate 1, offline: the offline set passes at or above the bar, with zero blocking failures.
- Gate 2, guardrails: no guardrail is breached on the beta or shadow slice.
- Gate 3, online readiness: the online checks, the alarm, and the rollback plan are in place and tested. A feature without a tested rollback does not pass this gate.
- Autonomy rung: the starting rung is stated explicitly: suggest, draft, or act. Irreversible actions start at suggest or draft with explicit confirmation, and earn a higher rung only on gate evidence.
- Kill criteria: the numbers that stop the rollout, written in advance, including one condition under which the feature is killed outright rather than fixed.

If any gate fails, the decision is NO-GO for that scope: narrow the slice, fix the failure, or drop the feature. Record which gate failed and what evidence would change the decision. A gate with no evidence is NOT EVALUATED, not PASS and not FAIL. A plan with any gate NOT EVALUATED is NO-GO until the evidence exists.

## Output template

```markdown
## Eval Plan: [feature]

**Feature and user:** ...
**What the user has today:** ...

### Failure modes
1. [User-visible outcome]. Cost if acted on: ...
2. ...

### Criteria
| Criterion | Covers failure mode | Judge | Unit | Pass per case |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

### Offline set
- Cases: [count], [count] realistic, [count] adversarial
- Blocking cases: ...
- Source and date: ...

### Launch bar
- Overall threshold: ...
- Per-criterion floors: ...
- Guardrails: ...
- Derivation: ...

### Online evaluation
- Product outcome: ...
- Model quality: ...
- Silent degradation alarm: ...
- Judge validation: [judge], [sample size], agreement: ...

### Launch gates
- Gate 1 offline: PASS / FAIL / NOT EVALUATED
- Gate 2 guardrails: PASS / FAIL / NOT EVALUATED
- Gate 3 online readiness: PASS / FAIL / NOT EVALUATED
- Autonomy rung: suggest / draft / act
- Kill criteria: ...
- Decision: GO / NO-GO (NO-GO while any gate is NOT EVALUATED)
- If NO-GO, gate that failed and evidence needed: ...
```

## Worked example

Feature: AI draft replies for support tickets.

Failure modes: the draft quotes a refund the policy does not allow; the draft cites a policy page that does not support the answer; the draft sends a refund action without confirmation; the draft is polite but omits the one fact the customer asked for.

Criteria: refund amounts match policy exactly (exact check, blocking); every factual claim cites a retrieved page that supports it (human rubric on a sample, plus citation check); no irreversible action without confirmation (exact check, blocking); the draft answers the customer's question (human rubric).

Offline set: 30 cases, 18 realistic tickets, 12 adversarial, including 5 blocking refund cases. Launch bar: 90 percent pass on the offline set, 100 percent on blocking cases, escalation rate no higher than the current human baseline, cost per ticket within budget. Gates: the feature starts at draft, with the agent sending nothing without a human approving it.

Derivation, cost limit, alarm, and kill criteria (all illustrative): the 90 percent bar sits below perfection because a human checks each draft before sending, so one imperfect draft costs minutes, not money; the 100 percent blocking bar follows from the cost of a wrong refund, which is money out the door. Cost limit: cost per ticket at or below the current human-handled cost per ticket; that cap is what 'within budget' means. Alarm: escalation rate rising for three consecutive review periods while draft acceptance stays flat fires the silent-degradation alarm, because usage is holding while quality slips. Kill criteria: two blocking failures in the shadow slice, or the alarm firing twice, kills the rollout outright; one blocking failure returns the feature to human-only drafting until the failing cases are fixed and the offline set passes again.

## What good looks like

- Every failure mode maps to at least one criterion, and every criterion maps to a failure mode.
- The offline set exists before building, with adversarial and blocking cases included.
- Thresholds are written before results, with a derivation from the cost of being wrong.
- The plan names a guardrail, an alarm for silent degradation, and kill criteria.
- The decision is a gate result, not an opinion, and a failed gate names the evidence that would change it.

## Common mistakes

- Setting the bar after seeing the first results, then calling the result a pass.
- Judging only the average, so one failing safety criterion hides inside a good overall score.
- Building the offline set from easy cases the team already knows the model handles.
- Using LLM-as-judge scores as ground truth without validating the judge against human labels.
- Launching on usage alone, with no quality measure to catch silent degradation.
- Writing criteria with no failure mode behind them, which measures what is easy instead of what matters.
