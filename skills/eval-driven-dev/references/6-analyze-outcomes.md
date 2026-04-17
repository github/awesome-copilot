# Step 6: Analyze Outcomes

**Why this step**: `pixie test` produced raw scores. Now you analyze those results to understand what they mean — completing pending evaluations, identifying patterns, validating hypotheses, and producing an actionable improvement plan. The analysis is structured in three phases that build on each other: entry-level → dataset-level → action plan.

---

## Result directory structure

After `pixie test`, the result directory looks like:

```
{PIXIE_ROOT}/results/<test_id>/
  meta.json
  dataset-{idx}/
    metadata.json
    entry-{idx}/
      config.json              # evaluators, description, expectation
      eval-input.jsonl         # input data fed to evaluators
      eval-output.jsonl        # output data captured from app
      evaluations.jsonl        # scored + pending evaluations
      trace.jsonl              # LLM call traces
```

Read `meta.json` to find the `<test_id>`. All the data you need for analysis is in this directory.

---

## Writing principles

Every analysis **detailed** artifact you produce must follow these principles:

- **Data-driven**: Every opinion or statement must be backed by concrete data from the evaluation run. Quote scores, cite entry indices, reference specific eval input/output content. No hand-waving. It is better to write nothing than to write something unsubstantiated.
- **Evidence-first**: Present the raw data and evidence before drawing conclusions. The reader (another coding agent) should be able to independently verify your conclusions from the evidence you cite.
- **Traceable**: For every conclusion, provide the chain: data source → observation → reasoning → conclusion. Another agent should be able to follow this chain backward to verify or challenge any claim.
- **No selling**: Do not advocate, promote, or use value-laden language ("excellent", "robust", "impressive", "well-designed"). State what the data shows and what actions it implies. Let the reader form quality judgments.
- **Action-oriented**: Every analysis should contribute to the end goal of concrete improvements to the evaluation pipeline or application. Do not write observations that don't lead somewhere.

Every analysis **summary** artifact must follow these principles:

- **Concise**: The human reader should be able to understand the key findings and actions in under 2 minutes for any single artifact.
- **Conclusions-first**: Lead with what the reader needs to know (results, findings, actions), not with methodology or background.
- **Plain language**: Avoid jargon. A non-technical stakeholder should be able to follow the summary.
- **Consistent**: Summary conclusions must match the detailed version's evidence. Never add claims in the summary that aren't supported in the detailed version.

### Dual-variant pattern

Every analysis artifact in this step has two files:

| Artifact         | Detailed file (for agent)   | Summary file (for human)            |
| ---------------- | --------------------------- | ----------------------------------- |
| Entry analysis   | `entry-{idx}/analysis.md`   | `entry-{idx}/analysis-summary.md`   |
| Dataset analysis | `dataset-{idx}/analysis.md` | `dataset-{idx}/analysis-summary.md` |
| Action plan      | `action-plan.md`            | `action-plan-summary.md`            |

**Always write the detailed version first**, then derive the summary from it. The summary is a strict subset of the detailed version's content — it should never contain claims or conclusions not present in the detailed version.

---

## Phase 1: Entry-level analysis

Process each dataset entry individually. For each `dataset-{idx}/entry-{idx}/`:

### 1a. Read the entry data

Read these files for the entry:

- `config.json` — what evaluators were configured, the description, the expectation
- `eval-input.jsonl` — what data was fed to the app/evaluators
- `eval-output.jsonl` — what the app produced
- `evaluations.jsonl` — current evaluation results (scored and pending)
- `trace.jsonl` — what LLM calls the app made (if available)

### 1b. Complete pending evaluations

If `evaluations.jsonl` contains entries with `"status": "pending"`, you must grade them:

1. Read the `criteria` field of the pending evaluation
2. Apply the criteria to the entry's eval input, eval output, and trace data
3. Assign a **score** between 0.0 and 1.0:
   - `1.0` — fully meets the criteria
   - `0.5`–`0.9` — partially meets criteria (explain what's missing)
   - `0.0`–`0.4` — does not meet criteria
4. Write a **reasoning** string (1–3 sentences citing specific evidence from the output or trace)
5. Replace the pending entry in `evaluations.jsonl` with the scored result:

**Before** (pending):

```json
{
  "evaluator": "ResponseQuality",
  "status": "pending",
  "criteria": "The response should..."
}
```

**After** (scored):

```json
{
  "evaluator": "ResponseQuality",
  "score": 0.85,
  "reasoning": "Response addresses the main question but omits..."
}
```

**Grading guidelines**:

- Be evidence-based — every score must reference specific output or trace content
- Use the criteria literally — do not expand or reinterpret beyond what's written
- Consider the trace — distinguish between app logic problems and LLM quality issues
- Be calibrated — reserve 1.0 for outputs that genuinely satisfy criteria fully
- Do not penalize LLM non-determinism — different phrasing of a correct answer is not a failure

### 1c. Write entry-level analysis (two files per entry)

Produce **two files** per entry. Write the detailed version first, then derive the summary from it.

#### Detailed version: `dataset-{idx}/entry-{idx}/analysis.md`

This file is for **agent consumption** — it will be read by the coding agent to further verify conclusions, investigate issues, and take corrective actions. Focus on data points, evidence trails, and the reasoning chain that connects observations to conclusions.

**Writing principles:**

- **Present data first, then conclusions.** Start each section with the raw data (scores, output excerpts, trace excerpts), then state what you conclude from it. The reader should be able to verify your conclusion from the data you presented.
- **Quote specific evidence.** When discussing output quality, quote the relevant part of `eval-output.jsonl` or `trace.jsonl`. When discussing evaluator behavior, cite the exact score and reasoning string.
- **Trace issues to root causes.** If an evaluator score is low, trace backward: what did the output look like → what did the LLM produce → what input did the LLM receive → was the input correct? This chain helps the next agent decide where to intervene.
- **Do not make ungrounded claims.** If you can't cite evidence for a statement, don't make it. "The evaluator may be too strict" requires evidence (e.g., "the output contains the correct information but phrased differently, scoring 0.5 instead of 1.0").
- **Do not sell.** Avoid "excellent", "robust", "impressive". State what happened and what it means.

**Content for each entry:**

1. **What this entry tested** — one sentence from the description/input
2. **Raw evaluation data** — table of all evaluator scores with reasoning strings
3. **Output analysis** — key excerpts from `eval-output.jsonl` with observations about quality, correctness, completeness. Quote specific fields/values.
4. **Trace analysis** — relevant excerpts from `trace.jsonl` (LLM calls, token counts, latency) that inform quality assessment
5. **Test case quality assessment** — does this test case effectively exercise the intended capability? Evidence for/against: Is the expectation clear? Are inputs realistic? Would this catch a regression?
6. **Evaluator quality assessment** — for each evaluator: is the score reasonable given the output data? Evidence: compare what the evaluator scored vs what the output actually contains. Would a different input produce a different score (discriminative power)?
7. **Application issues** — problems surfaced, with evidence chain: output excerpt → what went wrong → root cause hypothesis → suggested investigation
8. **Open questions** — anything that couldn't be conclusively determined from this data alone

#### Summary version: `dataset-{idx}/entry-{idx}/analysis-summary.md`

This file is for **human review** — a quick-scan view of what happened with this entry.

**Template:**

```markdown
# Entry {idx}: <description one-liner>

**Result**: PASS / FAIL

| Evaluator | Score | Verdict                 |
| --------- | ----- | ----------------------- |
| ...       | ...   | OK / Issue: <one-liner> |

**Key finding**: <1-2 sentences: what worked, what didn't, what action is needed>
```

Maximum ~15 lines per entry summary.

---

## Phase 2: Dataset-level analysis

After all entries in a dataset are analyzed, produce the dataset-level analysis. Write `analysis.md` in the dataset directory (`dataset-{idx}/analysis.md`).

### 2a. Aggregate the data

Summarize across all entries in the dataset:

- Pass/fail counts and overall pass rate
- Per-evaluator statistics (pass rate, min/max/mean scores)
- Which entries failed which evaluators (failure clusters)

### 2b. Form and validate hypotheses

Come up with **exactly 3 high-confidence hypotheses** across these three dimensions:

1. **Test cases quality** — Does the set of test cases sufficiently and efficiently verify the application's capabilities? Does it cover the important failure modes? Are there blind spots?

2. **Evaluation criteria/evaluator quality** — Do the evaluators have proper granularity and grading to catch real issues? Are there rubber-stamp evaluators (all 1.0)? Are there flaky evaluators (high variance without code changes)? Are criteria too vague or too strict?

3. **Application quality** — Based on the evaluation results, what are the application's strengths and weaknesses? Where does it produce high-quality output? Where does it fail?

For each hypothesis:

- **State the hypothesis** clearly in one sentence
- **Cite the evidence** — entry indices, evaluator names, scores, reasoning quotes, trace data
- **Validate or invalidate** — look at the actual eval input/output data and code to confirm or refute
- **Conclusion** — what action does this hypothesis imply?

It is always possible to produce 3 hypotheses even when the data is limited. If the evaluation data doesn't give a conclusive answer on application quality, that itself is a signal about test case or evaluator gaps.

### 2c. Write the dataset analysis (two files)

Produce **two files** for the dataset analysis. Write the detailed version first, then derive the summary.

#### Detailed version: `dataset-{idx}/analysis.md`

This file is for **agent consumption** — it provides the complete data aggregation, hypothesis formation with evidence chains, and validated conclusions that a coding agent can act on directly.

**Writing principles:**

- **Show all the data before interpreting it.** Start with the raw aggregation (pass/fail, per-evaluator stats, failure clusters) before any hypotheses. The data should stand on its own.
- **For each hypothesis, present: data → reasoning → conclusion.** The reader should be able to follow your logic step by step and arrive at the same conclusion independently.
- **Cross-reference entry analyses.** When citing evidence, reference the specific entry analysis file and the data points within it (e.g., "Entry 3 analysis shows FactualGrounding=0.5, caused by hallucinated author field — see `entry-3/analysis.md` §Output analysis").
- **Distinguish correlation from causation.** If two entries fail the same evaluator, that's a pattern. But the root cause might differ — verify by checking the actual output data, don't assume.
- **Do not speculate without marking it.** If a conclusion is uncertain, say "Hypothesis (unvalidated): ..." and explain what additional data would confirm or refute it.

**Content:**

1. **Overview** — dataset name, entry count, overall pass rate
2. **Raw aggregation data**
   - Per-evaluator statistics table (pass rate, score range, mean, standard deviation)
   - Failure matrix: entries × evaluators showing scores, highlighting failures
   - Failure clusters: entries grouped by shared failed evaluators
3. **Hypothesis 1: Test cases** — hypothesis statement, evidence with entry/evaluator references, validation steps taken, conclusion with specific action
4. **Hypothesis 2: Evaluators** — same structure
5. **Hypothesis 3: Application** — same structure
6. **Open questions** — anything the data doesn't conclusively answer, with suggestions for what additional data would help

#### Summary version: `dataset-{idx}/analysis-summary.md`

This file is for **human review** — a scannable overview of the dataset results, key findings, and recommended actions.

**Template:**

```markdown
# Dataset Analysis — Summary

**Dataset**: <name> | **Entries**: <N> | **Pass rate**: <X/N (Y%)>

## Results at a glance

| Evaluator | Pass rate | Avg score | Notes                  |
| --------- | --------- | --------- | ---------------------- |
| ...       | ...       | ...       | <one-liner if notable> |

## Key findings

1. <Finding>: <1-2 sentences with the conclusion and its implication>
2. ...
3. ...

## Recommended actions (priority order)

1. <Action>: <what to do and expected impact, 1-2 sentences>
2. ...
3. ...
```

Maximum ~40 lines for the summary.

---

## Phase 3: Action plan (two files)

After all datasets are analyzed, produce the action plan. Write **two files** at the test run root. Write the detailed version first, then derive the summary.

### Detailed version: `{PIXIE_ROOT}/results/<test_id>/action-plan.md`

This file is for **agent consumption** — it provides specific, implementable improvement items with full evidence trails, so a coding agent can pick up any item and execute it without additional context-gathering.

**Writing principles:**

- **Each item must be self-contained.** A coding agent reading just one priority item should have enough context (evidence references, file paths, expected changes) to implement it.
- **Trace every item back to evidence.** Each priority must reference: which hypothesis (from which dataset analysis), which entries/evaluators provided the evidence, and what the specific data showed.
- **Be concrete about "How".** Don't say "improve the prompt" — say "In `scrapegraphai/prompts/generate_answer.py` line 45, add instruction: '...'". The more specific, the more actionable.
- **Do not include speculative items.** Every item must have validated evidence. If an item is based on an unvalidated hypothesis, either validate it first or exclude it.

**Structure:**

```markdown
# Action Plan (Detailed)

## Summary

- X datasets analyzed, Y total entries, Z% overall pass rate
- [1-2 sentence high-level assessment]

## Priority 1: [Most impactful improvement]

- **What**: [specific change to make]
- **Why**: [which hypothesis from which dataset analysis, with entry/evaluator references]
- **Evidence**: [specific scores, output excerpts, trace data that support this]
- **Expected impact**: [which entries/evaluators this will improve, and predicted score change]
- **How**: [concrete implementation steps with file paths and line numbers]
- **Verification**: [how to verify the fix worked — which entries to re-run, what scores to expect]

## Priority 2: ...

...
```

### Summary version: `{PIXIE_ROOT}/results/<test_id>/action-plan-summary.md`

This file is for **human review** — a prioritized list of improvements that a human can understand and approve in under 2 minutes.

**Template:**

```markdown
# Action Plan — Summary

**Overall**: <X entries, Y% pass rate. 1-sentence assessment.>

## Actions (priority order)

1. **<Action title>**: <What to change and why, 2-3 sentences. Expected impact.>
2. **<Action title>**: <What to change and why, 2-3 sentences. Expected impact.>
3. ...
```

Maximum ~30 lines for the summary.

**Prioritization criteria**:

- Systemic issues (affecting multiple entries/datasets) before isolated ones
- Issues with clear, validated evidence before speculative ones
- Application quality gaps before evaluator refinements before test case additions
- Quick fixes before large refactors

The action plan should have 3–5 items. Each must trace back to a validated hypothesis from Phase 2. Do not include items that are speculative or lack evidence.

---

## Process summary

1. **Phase 1** (per entry): Read data → grade pending evaluations → write `entry-{idx}/analysis.md` + `entry-{idx}/analysis-summary.md`
2. **Phase 2** (per dataset): Aggregate → form 3 hypotheses → validate → write `dataset-{idx}/analysis.md` + `dataset-{idx}/analysis-summary.md`
3. **Phase 3** (per test run): Synthesize → prioritize → write `action-plan.md` + `action-plan-summary.md`

Process entries within a dataset concurrently (using subagents if available). Process phases sequentially — Phase 2 depends on Phase 1 outputs, Phase 3 depends on Phase 2 outputs.
