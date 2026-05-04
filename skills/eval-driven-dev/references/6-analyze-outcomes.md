# Step 6: Analyze Outcomes

**Why this step**: `pixie test` produced raw scores. Now you analyze those results to understand what they mean — completing pending evaluations, identifying patterns, validating hypotheses, and producing an actionable improvement plan. The analysis is structured in three phases that build on each other: entry-level → dataset-level → action plan.

---

## Result directory structure

After `pixie test`, the result directory looks like:

```text
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

## Hard completion gate

You are the grader for Step 6. **Pending evaluations are not a handoff to the user, and the web UI is not a substitute for grading.** You may use the web UI to browse traces and outputs, but completion happens by writing files on disk.

Step 6 is incomplete until all of the following are true:

- Every `"status": "pending"` entry in every `evaluations.jsonl` has been replaced with a scored entry that contains both `score` and `reasoning`.
- Every dataset directory contains `analysis.md` and `analysis-summary.md`.
- The test run root contains `action-plan.md` and `action-plan-summary.md`.
- The verifier script in this skill's `resources/` directory passes for the target results directory.

**Forbidden shortcuts**:

- Leaving any `"status": "pending"` entries in place
- Telling the user to review pending evaluations in the web UI
- Writing a single top-level substitute file such as `pixie_qa/06-analysis.md`
- Writing phrases like "likely passes" or "probably fails" without scoring the evaluation and updating `evaluations.jsonl`

If you do any of the above, Step 6 is not done.

## Iteration rule

If you are iterating across multiple fix/test cycles, every successful `pixie test` run creates a new `pixie_qa/results/<test_id>` directory and a new Step 6 obligation. The moment that directory exists, it becomes the analysis target for the current cycle.

Before you edit application code, prompts, datasets, evaluators, or rerun `pixie test`, complete Step 6 for that exact results directory. Do not skip earlier cycles and analyze only the last run.

**Additional forbidden shortcut**:

- Do not create a newer `pixie_qa/results/<test_id>` and leave an older one from the same task without Step 6 artifacts.

---

## Writing principles

Every analysis **detailed** artifact you produce must follow these principles:

- **Data-driven**: Every opinion or statement must be backed by concrete data from the evaluation run. Quote scores, cite entry indices, reference specific eval input/output content. No hand-waving. It is better to write nothing than to write something unsubstantiated.
- **Evidence-first**: Present the raw data and evidence before drawing conclusions. The reader (another coding agent) should be able to independently verify your conclusions from the evidence you cite.
- **Traceable**: For every conclusion, provide the chain: data source → observation → reasoning → conclusion. Another agent should be able to follow this chain backward to verify or challenge any claim.
- **No selling**: Do not advocate, promote, or use value-laden language ("excellent", "robust", "impressive", "well-designed"). State what the data shows and what actions it implies. Let the reader form quality judgments.
- **Action-oriented**: Every analysis should contribute to the end goal of concrete improvements to the evaluation pipeline or application. Do not write observations that don't lead somewhere.

Every persisted analysis **summary** artifact must follow these principles:

- **Concise**: The human reader should be able to understand the key findings and actions in under 2 minutes for any single artifact.
- **Conclusions-first**: Lead with what the reader needs to know (results, findings, actions), not with methodology or background.
- **Plain language**: Avoid jargon. A non-technical stakeholder should be able to follow the summary.
- **Consistent**: Summary conclusions must match the detailed version's evidence. Never add claims in the summary that aren't supported in the detailed version.

### Dual-variant pattern

Every persisted analysis artifact in this step has two files:

| Artifact         | Detailed file (for agent)   | Summary file (for human)            |
| ---------------- | --------------------------- | ----------------------------------- |
| Dataset analysis | `dataset-{idx}/analysis.md` | `dataset-{idx}/analysis-summary.md` |
| Action plan      | `action-plan.md`            | `action-plan-summary.md`            |

**Always write the detailed version first**, then derive the summary from it. The summary is a strict subset of the detailed version's content — it should never contain claims or conclusions not present in the detailed version.

---

## Phase 1: Entry-level grading pass

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
5. Replace the pending entry in `evaluations.jsonl` with the scored result. **Do not append a second row and leave the pending row in place. Overwrite the pending row itself.**

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
- Do not defer to the user — if the evidence is sufficient to write "likely passes", it is sufficient to assign a score and update `evaluations.jsonl`

### 1c. Do not persist entry-level analysis files

In this trimmed workflow, **do not write `entry-{idx}/analysis.md` or `entry-{idx}/analysis-summary.md`**. Phase 1 is only for reading evidence and converting every pending evaluation into a scored row in `evaluations.jsonl`.

You may take temporary scratch notes while reasoning, but they are not deliverables. Persist only:

- updated `evaluations.jsonl` in each entry directory
- dataset-level analysis files in Phase 2
- run-level action plan files in Phase 3

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
- **Cross-reference raw entry evidence directly.** When citing evidence, reference the specific entry index and the underlying files/data points (for example: `entry-3/evaluations.jsonl`, `entry-3/eval-output.jsonl`, or `entry-3/trace.jsonl`).
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

1. **Phase 1** (per entry): Read data → grade pending evaluations → update `evaluations.jsonl`
2. **Phase 2** (per dataset): Aggregate → form 3 hypotheses → validate → write `dataset-{idx}/analysis.md` + `dataset-{idx}/analysis-summary.md`
3. **Phase 3** (per test run): Synthesize → prioritize → write `action-plan.md` + `action-plan-summary.md`

Process entries within a dataset concurrently (using subagents if available). Process phases sequentially — Phase 2 depends on Phase 1 outputs, Phase 3 depends on Phase 2 outputs.

---

## Final verification

Before you end your turn, run the Step 6 verifier script that ships beside `setup.sh` in this skill's `resources/` directory against the exact test run directory you analyzed.

Example shape:

```bash
python /path/to/eval-driven-dev/resources/verify_step6_completion.py pixie_qa/results/<test_id>
```

If the verifier reports any error, keep working. Step 6 is not complete until the verifier passes.
