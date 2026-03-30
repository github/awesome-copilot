# Eval Tests: Evaluator Selection and Test Writing

This reference covers Step 5 of the eval-driven-dev process: choosing evaluators, writing the test file, and running `pixie test`.

**Before writing any test code, re-read `references/pixie-api.md`** (Eval Runner API and Evaluator catalog sections) for exact parameter names and current evaluator signatures — these change when the package is updated.

---

## Evaluator selection

Choose evaluators based on the **output type** and your eval criteria from Step 1, not the app type.

### Decision table

| Output type                                                 | Evaluator category                                                      | Examples                                  |
| ----------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------- |
| Deterministic (classification labels, yes/no, fixed-format) | Heuristic: `ExactMatchEval`, `JSONDiffEval`, `ValidJSONEval`            | Label classification, JSON extraction     |
| Open-ended text with a reference answer                     | LLM-as-judge: `FactualityEval`, `ClosedQAEval`, `AnswerCorrectnessEval` | Chatbot responses, QA, summaries          |
| Text with expected context/grounding                        | RAG evaluators: `FaithfulnessEval`, `ContextRelevancyEval`              | RAG pipelines, context-grounded responses |
| Text with style/format requirements                         | Custom LLM-as-judge via `create_llm_evaluator`                          | Voice-friendly responses, tone checks     |
| Multi-aspect quality                                        | Multiple evaluators combined                                            | Factuality + relevance + tone             |

### Critical rules

- For open-ended LLM text, **never** use `ExactMatchEval`. LLM outputs are non-deterministic — exact match will either always fail or always pass (if comparing against the same output). Use LLM-as-judge evaluators instead.
- `AnswerRelevancyEval` is **RAG-only** — it requires a `context` value in the trace. Returns 0.0 without it. For general relevance without RAG, use `create_llm_evaluator` with a custom prompt.
- Do NOT use comparison evaluators (`FactualityEval`, `ClosedQAEval`, `ExactMatchEval`) on items without `expected_output` — they produce meaningless scores.

### When `expected_output` IS available

Use comparison-based evaluators:

| Evaluator               | Use when                                                   |
| ----------------------- | ---------------------------------------------------------- |
| `FactualityEval`        | Output is factually correct compared to reference          |
| `ClosedQAEval`          | Output matches the expected answer                         |
| `ExactMatchEval`        | Exact string match (structured/deterministic outputs only) |
| `AnswerCorrectnessEval` | Answer is correct vs reference                             |

### When `expected_output` is NOT available

Use standalone evaluators that judge quality without a reference:

| Evaluator              | Use when                              | Note                                                             |
| ---------------------- | ------------------------------------- | ---------------------------------------------------------------- |
| `FaithfulnessEval`     | Response faithful to provided context | RAG pipelines                                                    |
| `ContextRelevancyEval` | Retrieved context relevant to query   | RAG pipelines                                                    |
| `AnswerRelevancyEval`  | Answer addresses the question         | **RAG only** — needs `context` in trace. Returns 0.0 without it. |
| `PossibleEval`         | Output is plausible / feasible        | General purpose                                                  |
| `ModerationEval`       | Output is safe and appropriate        | Content safety                                                   |
| `SecurityEval`         | No security vulnerabilities           | Security check                                                   |

For non-RAG apps needing response relevance, write a `create_llm_evaluator` instead.

---

## Custom evaluators

### `create_llm_evaluator` factory

Use when the quality dimension is domain-specific and no built-in evaluator fits:

```python
from pixie import create_llm_evaluator

concise_voice_style = create_llm_evaluator(
    name="ConciseVoiceStyle",
    prompt_template="""
    You are evaluating whether this response is concise and phone-friendly.

    Input: {eval_input}
    Response: {eval_output}

    Score 1.0 if the response is concise (under 3 sentences), directly addresses
    the question, and uses conversational language suitable for a phone call.
    Score 0.0 if it's verbose, off-topic, or uses written-style formatting.
    """,
)
```

**How template variables work**: `{eval_input}`, `{eval_output}`, `{expected_output}` are the only placeholders. Each is replaced with a string representation of the corresponding `Evaluable` field — if the field is a dict or list, it becomes a JSON string. The LLM judge sees the full serialized value.

**Rules**:

- **Only `{eval_input}`, `{eval_output}`, `{expected_output}`** — no nested access like `{eval_input[key]}` (this will crash with a `TypeError`)
- **Keep templates short and direct** — the system prompt already tells the LLM to return `Score: X.X`. Your template just needs to present the data and define the scoring criteria.
- **Don't instruct the LLM to "parse" or "extract" data** — just present the values and state the criteria. The LLM can read JSON naturally.

**Non-RAG response relevance** (instead of `AnswerRelevancyEval`):

```python
response_relevance = create_llm_evaluator(
    name="ResponseRelevance",
    prompt_template="""
    You are evaluating whether a customer support response is relevant and helpful.

    Input: {eval_input}
    Response: {eval_output}
    Expected: {expected_output}

    Score 1.0 if the response directly addresses the question and meets expectations.
    Score 0.5 if partially relevant but misses important aspects.
    Score 0.0 if off-topic, ignores the question, or contradicts expectations.
    """,
)
```

### Manual custom evaluator

```python
from pixie import Evaluation, Evaluable

async def my_evaluator(evaluable: Evaluable, *, trace=None) -> Evaluation:
    # evaluable.eval_input  — what was passed to the observed function
    # evaluable.eval_output — what the function returned
    # evaluable.expected_output — reference answer (UNSET if not provided)
    score = 1.0 if "expected pattern" in str(evaluable.eval_output) else 0.0
    return Evaluation(score=score, reasoning="...")
```

---

## Writing the test file

Create `pixie_qa/tests/test_<feature>.py`. The pattern: a `runnable` adapter that calls the app's production function, plus `async` test functions that `await` `assert_dataset_pass`.

**Before writing any test code, re-read the `assert_dataset_pass` API reference below.** The exact parameter names matter — using `dataset=` instead of `dataset_name=`, or omitting `await`, will cause failures that are hard to debug. Do not rely on memory from earlier in the conversation.

### Test file template

```python
from pixie import enable_storage, assert_dataset_pass, FactualityEval, ScoreThreshold, last_llm_call

from myapp import answer_question


def runnable(eval_input):
    """Replays one dataset item through the app.

    Calls the same function the production app uses.
    enable_storage() here ensures traces are captured during eval runs.
    """
    enable_storage()
    answer_question(**eval_input)


async def test_answer_quality():
    await assert_dataset_pass(
        runnable=runnable,
        dataset_name="qa-golden-set",
        evaluators=[FactualityEval()],
        pass_criteria=ScoreThreshold(threshold=0.7, pct=0.8),
        from_trace=last_llm_call,
    )
```

### `assert_dataset_pass` API — exact parameter names

```python
await assert_dataset_pass(
    runnable=runnable,              # callable that takes eval_input dict
    dataset_name="my-dataset",      # NOT dataset_path — name of dataset created in Step 4
    evaluators=[...],               # list of evaluator instances
    pass_criteria=ScoreThreshold(   # NOT thresholds — ScoreThreshold object
        threshold=0.7,              # minimum score to count as passing
        pct=0.8,                    # fraction of items that must pass
    ),
    from_trace=last_llm_call,       # which span to extract eval data from
)
```

### Common mistakes that break tests

| Mistake                  | Symptom                                                             | Fix                                           |
| ------------------------ | ------------------------------------------------------------------- | --------------------------------------------- |
| `def test_...():` (sync) | RuntimeWarning "coroutine was never awaited", test passes vacuously | Use `async def test_...():`                   |
| No `await`               | Same: "coroutine was never awaited"                                 | Add `await` before `assert_dataset_pass(...)` |
| `dataset_path="..."`     | TypeError: unexpected keyword argument                              | Use `dataset_name="..."`                      |
| `thresholds={...}`       | TypeError: unexpected keyword argument                              | Use `pass_criteria=ScoreThreshold(...)`       |
| Omitting `from_trace`    | Evaluator may not find the right span                               | Add `from_trace=last_llm_call`                |

**If `pixie test` shows "No assert_pass / assert_dataset_pass calls recorded"**, the test passed vacuously because `assert_dataset_pass` was never awaited. Fix the async signature and await immediately.

### Multiple test functions

Split into separate test functions when you have different evaluator sets:

```python
async def test_factual_answers():
    """Test items that have deterministic expected outputs."""
    await assert_dataset_pass(
        runnable=runnable,
        dataset_name="qa-deterministic",
        evaluators=[FactualityEval()],
        pass_criteria=ScoreThreshold(threshold=0.7, pct=0.8),
        from_trace=last_llm_call,
    )

async def test_response_style():
    """Test open-ended quality criteria."""
    await assert_dataset_pass(
        runnable=runnable,
        dataset_name="qa-open-ended",
        evaluators=[concise_voice_style],
        pass_criteria=ScoreThreshold(threshold=0.6, pct=0.8),
        from_trace=last_llm_call,
    )
```

### Key points

- `enable_storage()` belongs inside the `runnable`, not at module level — it needs to fire on each invocation so the trace is captured for that specific run.
- The `runnable` imports and calls the **same function** that production uses — the app's entry point, going through the utility function from Step 3.
- If the `runnable` calls a different function than what the utility function calls, something is wrong.
- The `eval_input` dict should contain **only the semantic arguments** the function needs (e.g., `question`, `messages`, `context`). The `@observe` decorator automatically strips `self` and `cls`.
- **Choose evaluators that match your data.** If dataset items have `expected_output`, use comparison evaluators. If not, use standalone evaluators.

---

## Running tests

The test runner is `pixie test` (not `pytest`):

```bash
uv run pixie test                           # run all test_*.py in current directory
uv run pixie test pixie_qa/tests/           # specify path
uv run pixie test -k factuality             # filter by name
uv run pixie test -v                        # verbose: shows per-case scores and reasoning
```

`pixie test` automatically loads the `.env` file before running tests, so API keys do not need to be exported in the shell. No `sys.path` hacks are needed in test files.

The `-v` flag is important: it shows per-case scores and evaluator reasoning, which makes it much easier to see what's passing and what isn't.

### After running, verify the scorecard

1. Shows "N/M tests passed" with real numbers
2. Does NOT say "No assert_pass / assert_dataset_pass calls recorded" (that means missing `await`)
3. Per-evaluator scores appear with real values

A test that passes with no recorded evaluations is worse than a failing test — it gives false confidence. Debug until real scores appear.
