# Step 3: Define Evaluators

**Why this step**: With the app instrumented (Step 2), you now map each eval criterion to a concrete evaluator — implementing custom ones where needed — so the dataset (Step 4) can reference them by name.

---

## 3a. Map criteria to evaluators

**Every eval criterion from Step 1c — including any dimensions specified by the user in the prompt — must have a corresponding evaluator.** If the user asked for "factuality, completeness, and bias," you need three evaluators (or a multi-criteria evaluator that covers all three). Do not silently drop any requested dimension. Prioritize evaluators that measure the **hard problems / failure modes** identified in `pixie_qa/00-project-analysis.md` — these are more valuable than generic quality evaluators.

For each eval criterion, choose an evaluator using this decision order:

1. **Built-in evaluator** — if a standard evaluator fits the criterion (factual correctness → `Factuality`, exact match → `ExactMatch`, RAG faithfulness → `Faithfulness`). See `evaluators.md` for the full catalog.
2. **Agent evaluator** (`create_agent_evaluator`) — **the default for all semantic, qualitative, and app-specific criteria**. Agent evaluators are graded by you (the coding agent) in Step 6, where you review each entry's trace and output holistically. This is far more effective than automated scoring for criteria like "Did the extraction accurately capture the source content?", "Are there hallucinated values?", or "Did the app handle noisy input gracefully?"
3. **Manual custom evaluator** — ONLY for **mechanical, deterministic checks** where a programmatic function is definitively correct: field existence, regex pattern matching, JSON schema validation, numeric thresholds, type checking. **Never use manual custom evaluators for semantic quality** — if the check requires _judgment_ about whether content is correct, relevant, or complete, use an agent evaluator instead.

**Distinguish structural from semantic criteria**: For each criterion, ask: "Can this be checked with a simple programmatic rule that always gives the right answer?" If yes → manual custom evaluator. If no → agent evaluator. Most app-specific quality criteria are semantic, not structural.

For open-ended LLM text, **never** use `ExactMatch` — LLM outputs are non-deterministic.

`AnswerRelevancy` is **RAG-only** — it requires a `context` value in the trace. Returns 0.0 without it. For general relevance, use an agent evaluator with clear criteria.

## 3b. Implement custom evaluators

If any criterion requires a custom evaluator, implement it now. Place custom evaluators in `pixie_qa/evaluators.py` (or a sub-module if there are many).

### Agent evaluators (`create_agent_evaluator`) — the default

Use agent evaluators for **all semantic, qualitative, and judgment-based criteria**. These are graded by you (the coding agent) in Step 5d, where you review each entry's trace and output with full context — far more effective than any automated approach for quality dimensions like accuracy, completeness, hallucination detection, or error handling.

```python
from pixie import create_agent_evaluator

extraction_accuracy = create_agent_evaluator(
    name="ExtractionAccuracy",
    criteria="The extracted data accurately reflects the source content. All fields "
             "contain correct values from the source — no hallucinated, fabricated, or "
             "placeholder values. Compare the final_answer against the fetched_content "
             "and parsed_content to verify every claimed fact.",
)

noise_handling = create_agent_evaluator(
    name="NoiseHandling",
    criteria="The app correctly ignored navigation chrome, boilerplate, ads, and other "
             "non-content elements from the source. The extracted data contains only "
             "information relevant to the user's prompt, not noise from the page structure.",
)

schema_compliance = create_agent_evaluator(
    name="SchemaCompliance",
    criteria="The output contains all fields requested in the prompt with appropriate "
             "types and non-trivial values. Missing fields, null values for required data, "
             "or fields with generic placeholder text indicate failure.",
)
```

Reference agent evaluators in the dataset via `filepath:callable_name` (e.g., `"pixie_qa/evaluators.py:extraction_accuracy"`).

During `pixie test`, agent evaluators show as `⏳` in the console. They are graded in Step 5d.

**Writing effective criteria**: The `criteria` string is the grading rubric you'll follow in Step 5d. Make it specific and actionable:

- **Bad**: "Check if the output is good" — too vague to grade consistently
- **Bad**: "The response should be accurate" — doesn't say what to compare against
- **Good**: "Compare the extracted fields against the source HTML/document. Each field must have a corresponding passage in the source. Flag any field whose value cannot be traced back to the source content."
- **Good**: "The app should preserve the structural hierarchy of the source document. If the source has sections/subsections, the extraction should reflect that nesting, not flatten everything into a single level."

### Manual custom evaluator — for mechanical checks only

Use manual custom evaluators **only** for deterministic, programmatic checks where a simple function definitively gives the right answer. Examples: field existence, regex matching, JSON schema validation, numeric range checks, type verification.

**Do NOT use manual custom evaluators for semantic quality.** If the check requires _judgment_ about whether content is correct, relevant, complete, or well-written, use an agent evaluator instead. The litmus test: "Could a regex, string match, or comparison operator implement this check perfectly?" If not, it's semantic — use an agent evaluator.

Custom evaluators can be **sync or async functions**. Assign them to module-level variables in `pixie_qa/evaluators.py`:

```python
from pixie import Evaluation, Evaluable

def my_evaluator(evaluable: Evaluable, *, trace=None) -> Evaluation:
    score = 1.0 if "expected pattern" in str(evaluable.eval_output) else 0.0
    return Evaluation(score=score, reasoning="...")
```

Reference by `filepath:callable_name` in the dataset: `"pixie_qa/evaluators.py:my_evaluator"`.

**Accessing `eval_metadata` and captured data**: Custom evaluators access per-entry metadata and `wrap()` outputs via the `Evaluable` fields:

- `evaluable.eval_metadata` — dict from the entry's `eval_metadata` field (e.g., `{"expected_tool": "endCall"}`)
- `evaluable.eval_output` — `list[NamedData]` containing ALL `wrap(purpose="output")` and `wrap(purpose="state")` values. Each item has `.name` (str) and `.value` (JsonValue). Use the helper below to look up by name.

```python
def _get_output(evaluable: Evaluable, name: str) -> Any:
    """Look up a wrap value by name from eval_output."""
    for item in evaluable.eval_output:
        if item.name == name:
            return item.value
    return None

def call_ended_check(evaluable: Evaluable, *, trace=None) -> Evaluation:
    expected = evaluable.eval_metadata.get("expected_call_ended") if evaluable.eval_metadata else None
    actual = _get_output(evaluable, "call_ended")
    if expected is None:
        return Evaluation(score=1.0, reasoning="No expected_call_ended in eval_metadata")
    match = bool(actual) == bool(expected)
    return Evaluation(
        score=1.0 if match else 0.0,
        reasoning=f"Expected call_ended={expected}, got {actual}",
    )
```

### ValidJSON and string expectations conflict

`ValidJSON` treats the dataset entry's `expectation` field as a JSON Schema when present. If your entries use **string** expectations (e.g., for `Factuality`), adding `ValidJSON` as a dataset-level default evaluator will cause failures — it cannot validate a plain string as a JSON Schema. Either apply `ValidJSON` only to entries with object/boolean expectations, or omit it when the dataset relies on string expectations.

## 3c. Produce the evaluator mapping artifact

Write the criterion-to-evaluator mapping to `pixie_qa/03-evaluator-mapping.md`. This artifact bridges between the eval criteria (Step 1c) and the dataset (Step 4).

**CRITICAL**: Use the exact evaluator names as they appear in the `evaluators.md` reference — built-in evaluators use their short name (e.g., `Factuality`, `ClosedQA`), and custom evaluators use `filepath:callable_name` format (e.g., `pixie_qa/evaluators.py:ConciseVoiceStyle`).

### Template

```markdown
# Evaluator Mapping

## Built-in evaluators used

| Evaluator name | Criterion it covers | Applies to                 |
| -------------- | ------------------- | -------------------------- |
| Factuality     | Factual accuracy    | All items                  |
| ClosedQA       | Answer correctness  | Items with expected_output |

## Agent evaluators

| Evaluator name                             | Criterion it covers          | Applies to | Source file            |
| ------------------------------------------ | ---------------------------- | ---------- | ---------------------- |
| pixie_qa/evaluators.py:extraction_accuracy | Content accuracy vs source   | All items  | pixie_qa/evaluators.py |
| pixie_qa/evaluators.py:noise_handling      | Navigation/boilerplate noise | All items  | pixie_qa/evaluators.py |

## Manual custom evaluators (mechanical checks only)

| Evaluator name                                 | Criterion it covers  | Applies to | Source file            |
| ---------------------------------------------- | -------------------- | ---------- | ---------------------- |
| pixie_qa/evaluators.py:required_fields_present | Required field check | All items  | pixie_qa/evaluators.py |

## Applicability summary

- **Dataset-level defaults** (apply to all items): Factuality, pixie_qa/evaluators.py:extraction_accuracy
- **Item-specific** (apply to subset): ClosedQA (only items with expected_output)
```

## Output

- Custom evaluator implementations in `pixie_qa/evaluators.py` (if any custom evaluators needed)
- `pixie_qa/03-evaluator-mapping.md` — the criterion-to-evaluator mapping

---

> **Evaluator selection guide**: See `evaluators.md` for the full built-in evaluator catalog and `create_agent_evaluator` reference.
>
> **If you hit an unexpected error** when implementing evaluators (import failures, API mismatch), read `evaluators.md` for the authoritative evaluator reference and `wrap-api.md` for API details before guessing at a fix.
