---
name: eval-driven-dev
description: Instrument Python LLM apps, build golden datasets, write eval-based tests, run them, and root-cause failures — covering the full eval-driven development cycle. Make sure to use this skill whenever a user is developing, testing, QA-ing, evaluating, or benchmarking a Python project that calls an LLM, even if they don't say "evals" explicitly. Use for making sure an AI app works correctly, catching regressions after prompt changes, debugging why an agent started behaving differently, or validating output quality before shipping.
---

# Eval-Driven Development with pixie

This skill is about doing the work, not describing it. When a user asks you to set up evals for their app, you should be reading their code, editing their files, running commands, and producing a working test pipeline — not writing a plan for them to follow later.

**All pixie-generated files live in a single `pixie_qa` directory** at the project root:

```
pixie_qa/
  MEMORY.md              # your understanding and eval plan
  observations.db        # SQLite trace DB (auto-created by enable_storage)
  datasets/              # golden datasets (JSON files)
  tests/                 # eval test files (test_*.py)
  scripts/               # helper scripts (build_dataset.py, etc.)
```

---

## Setup vs. Iteration: when to stop

**This is critical.** What you do depends on what the user asked for.

### "Setup QA" / "set up evals" / "add tests" (setup intent)

The user wants a **working eval pipeline**. Your job is Stages 0–6: install, understand, instrument, write tests, build dataset, run tests. **Stop after the first test run**, regardless of whether tests pass or fail. Report:

1. What you set up (instrumentation, test file, dataset)
2. The test results (pass/fail, scores)
3. If tests failed: a **brief summary** of what failed and likely causes — but do NOT fix anything

Then ask: _"QA setup is complete. Tests show N/M passing. Want me to investigate the failures and start iterating?"_

Only proceed to Stage 7 (investigation and fixes) if the user confirms.

**Exception**: If the test run itself errors out (import failures, missing API keys, configuration bugs) — those are **setup problems**, not eval failures. Fix them and re-run until you get a clean test execution where pass/fail reflects actual app quality, not broken plumbing.

### "Fix" / "improve" / "debug" / "why is X failing" (iteration intent)

The user wants you to investigate and fix. Proceed through all stages including Stage 7 — investigate failures, root-cause them, apply fixes, rebuild dataset, re-run tests, iterate.

### Ambiguous requests

If the intent is unclear, default to **setup only** and ask before iterating. It's better to stop early and ask than to make unwanted changes to the user's application code.

---

## The eval boundary: what to evaluate

**Eval-driven development focuses on LLM-dependent behaviour.** The purpose is to catch quality regressions in the parts of the system that are non-deterministic and hard to test with traditional unit tests — namely, LLM calls and the decisions they drive.

### In scope (evaluate this)

- LLM response quality: factual accuracy, relevance, format compliance, safety
- Agent routing decisions: did the LLM choose the right tool/handoff/action?
- Prompt effectiveness: does the prompt produce the desired behaviour?
- Multi-turn coherence: does the agent maintain context across turns?

### Out of scope (do NOT evaluate this with evals)

- **Tool implementations** (database queries, API calls, keyword matching, business logic) — these are traditional software; test them with unit tests
- **Infrastructure** (authentication, rate limiting, caching, serialization)
- **Deterministic post-processing** (formatting, filtering, sorting results)

The boundary is: everything **downstream** of the LLM call (tools, databases, APIs) produces deterministic outputs that serve as **inputs** to the LLM-powered system. Eval tests should treat those as given facts and focus on what the LLM does with them.

**Example**: If an FAQ tool has a keyword-matching bug that returns wrong data, that's a traditional bug — fix it with a regular code change, not by adjusting eval thresholds. The eval tests exist to verify that _given correct tool outputs_, the LLM agent produces correct user-facing responses.

When building datasets and expected outputs, **use the actual tool/system outputs as ground truth**. The expected output for an eval case should reflect what a correct LLM response looks like _given the tool results the system actually produces_.

---

## Stage 0: Ensure pixie-qa is Installed and API Keys Are Set

Before doing anything else, check that the `pixie-qa` package is available:

```bash
python -c "import pixie" 2>/dev/null && echo "installed" || echo "not installed"
```

If it's not installed, install it:

```bash
pip install pixie-qa
```

This provides the `pixie` Python module, the `pixie` CLI, and the `pixie test` runner — all required for instrumentation and evals. Don't skip this step; everything else in this skill depends on it.

### Verify API keys

The application under test almost certainly needs an LLM provider API key (e.g. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`). LLM-as-judge evaluators like `FactualityEval` also need `OPENAI_API_KEY`. **Before running anything**, verify the key is set:

```bash
[ -n "$OPENAI_API_KEY" ] && echo "OPENAI_API_KEY set" || echo "OPENAI_API_KEY missing"
```

If not set, ask the user. Do not proceed with running the app or evals without it — you'll get silent failures or import-time errors.

---

## Stage 1: Understand the Application

Before touching any code, spend time actually reading the source. The code will tell you more than asking the user would, and it puts you in a much better position to make good decisions about what and how to evaluate.

### What to investigate

1. **How the software runs**: What is the entry point? How do you start it? Is it a CLI, a server, a library function? What are the required arguments, config files, or environment variables?

2. **All inputs to the LLM**: This is not limited to the user's message. Trace every piece of data that gets incorporated into any LLM prompt:
   - User input (queries, messages, uploaded files)
   - System prompts (hardcoded or templated)
   - Retrieved context (RAG chunks, search results, database records)
   - Tool definitions and function schemas
   - Conversation history / memory
   - Configuration or feature flags that change prompt behavior

3. **All intermediate steps and outputs**: Walk through the code path from input to final output and document each stage:
   - Retrieval / search results
   - Tool calls and their results
   - Agent routing / handoff decisions
   - Intermediate LLM calls (e.g., summarization before final answer)
   - Post-processing or formatting steps

4. **The final output**: What does the user see? What format is it in? What are the quality expectations?

5. **Use cases and expected behaviors**: What are the distinct things the app is supposed to handle? For each use case, what does a "good" response look like? What would constitute a failure?

### Write MEMORY.md

Write your findings down in `pixie_qa/MEMORY.md`. This is the primary working document for the eval effort. It should be human-readable and detailed enough that someone unfamiliar with the project can understand the application and the eval strategy.

**CRITICAL: MEMORY.md documents your understanding of the existing application code. It must NOT contain references to pixie commands, instrumentation code you plan to add, or scripts/functions that don't exist yet.** Those belong in later sections, only after they've been implemented.

The understanding section should include:

```markdown
# Eval Notes: <Project Name>

## How the application works

### Entry point and execution flow

<Describe how to start/run the app, what happens step by step>

### Inputs to LLM calls

<For each LLM call in the codebase, document:>

- Where it is in the code (file + function name)
- What system prompt it uses (quote it or summarize)
- What user/dynamic content feeds into it
- What tools/functions are available to it

### Intermediate processing

<Describe any steps between input and output:>
- Retrieval, routing, tool execution, etc.
- Include code pointers (file:line) for each step

### Final output

<What the user sees, what format, what the quality bar should be>

### Use cases

<List each distinct scenario the app handles, with examples of good/bad outputs>

## Evaluation plan

### What to evaluate and why

<Quality dimensions: factual accuracy, relevance, format compliance, safety, etc.>

### Evaluation granularity

<Which function/span boundary captures one "test case"? Why that boundary?>

### Evaluators and criteria

<For each eval test, specify: evaluator, dataset, threshold, reasoning>

### Data needed for evaluation

<What data points need to be captured, with code pointers to where they live>
```

If something is genuinely unclear from the code, ask the user — but most questions answer themselves once you've read the code carefully.

---

## Stage 2: Decide What to Evaluate

Now that you understand the app, you can make thoughtful choices about what to measure:

- **What quality dimension matters most?** Factual accuracy for QA apps, output format for structured extraction, relevance for RAG, safety for user-facing text.
- **Which span to evaluate:** the whole pipeline (`root`) or just the LLM call (`last_llm_call`)? If you're debugging retrieval, you might evaluate at a different point than if you're checking final answer quality.
- **Which evaluators fit:** see `references/pixie-api.md` → Evaluators. For factual QA: `FactualityEval`. For structured output: `ValidJSONEval` / `JSONDiffEval`. For RAG pipelines: `ContextRelevancyEval` / `FaithfulnessEval`.
- **Pass criteria:** `ScoreThreshold(threshold=0.7, pct=0.8)` means 80% of cases must score ≥ 0.7. Think about what "good enough" looks like for this app.
- **Expected outputs:** `FactualityEval` needs them. Format evaluators usually don't.

Update `pixie_qa/MEMORY.md` with the plan before writing any code.

---

## Stage 3: Instrument the Application

Add pixie instrumentation to the **existing production code**. The goal is to capture the inputs and outputs of functions that are already part of the application's normal execution path. Instrumentation must be on the **real code path** — the same code that runs when the app is used in production — so that traces are captured both during eval runs and real usage.

### Add `enable_storage()` at application startup

Call `enable_storage()` once at the beginning of the application's startup code — inside `main()`, or at the top of a server's initialization. **Never at module level** (top of a file outside any function), because that causes storage setup to trigger on import.

Good places:

- Inside `if __name__ == "__main__":` blocks
- In a FastAPI `lifespan` or `on_startup` handler
- At the top of `main()` / `run()` functions
- Inside the `runnable` function in test files

```python
# ✅ CORRECT — at application startup
async def main():
    enable_storage()
    ...

# ✅ CORRECT — in a runnable for tests
def runnable(eval_input):
    enable_storage()
    my_function(**eval_input)

# ❌ WRONG — at module level, runs on import
from pixie import enable_storage
enable_storage()  # this runs when any file imports this module!
```

### Wrap existing functions with `@observe` or `start_observation`

**CRITICAL: Instrument the production code path. Never create separate functions or alternate code paths for testing.**

The `@observe` decorator or `start_observation` context manager goes on the **existing function** that the app actually calls during normal operation. If the app's entry point is an interactive `main()` loop, instrument `main()` or the core function it calls per user turn — not a new helper function that duplicates logic.

```python
# ✅ CORRECT — decorating the existing production function
from pixie import observe

@observe(name="answer_question")
def answer_question(question: str, context: str) -> str:  # existing function
    ...  # existing code, unchanged
```

```python
# ✅ CORRECT — context manager inside an existing function
from pixie import start_observation

async def main():  # existing function
    ...
    with start_observation(input={"user_input": user_input}, name="handle_turn") as obs:
        result = await Runner.run(current_agent, input_items, context=context)
        # ... existing response handling ...
        obs.set_output(response_text)
    ...
```

```python
# ❌ WRONG — creating a new function that duplicates logic from main()
@observe(name="run_for_eval")
async def run_for_eval(user_messages: list[str]) -> str:
    # This duplicates what main() does, creating a separate code path
    # that diverges from production. Don't do this.
    ...
```

**Rules:**

- **Never add new wrapper functions** to the application code for eval purposes.
- **Never change the function's interface** (arguments, return type, behavior).
- **Never duplicate production logic** into a separate "testable" function.
- The instrumentation is purely additive — if you removed all pixie imports and decorators, the app would work identically.
- After instrumentation, call `flush()` at the end of runs to make sure all spans are written.
- For interactive apps (CLI loops, chat interfaces), instrument the **per-turn processing** function — the one that takes user input and produces a response. The eval `runnable` should call this same function.

**Important**: All pixie symbols are importable from the top-level `pixie` package. Never tell users to import from submodules (`pixie.instrumentation`, `pixie.evals`, `pixie.storage.evaluable`, etc.) — always use `from pixie import ...`.

---

## Stage 4: Write the Eval Test File

Write the test file before building the dataset. This might seem backwards, but it forces you to decide what you're actually measuring before you start collecting data — otherwise the data collection has no direction.

Create `pixie_qa/tests/test_<feature>.py`. The pattern is: a `runnable` adapter that calls the app's **existing production function**, plus an async test function that calls `assert_dataset_pass`:

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


async def test_factuality():
    await assert_dataset_pass(
        runnable=runnable,
        dataset_name="<dataset-name>",
        evaluators=[FactualityEval()],
        pass_criteria=ScoreThreshold(threshold=0.7, pct=0.8),
        from_trace=last_llm_call,
    )
```

Note that `enable_storage()` belongs inside the `runnable`, not at module level in the test file — it needs to fire on each invocation so the trace is captured for that specific run.

The `runnable` calls **the same function that production uses** — it does not create a new code path. The only addition is `enable_storage()` to capture traces during eval.

The test runner is `pixie test` (not `pytest`):

```bash
pixie test                           # run all test_*.py in current directory
pixie test pixie_qa/tests/           # specify path
pixie test -k factuality             # filter by name
pixie test -v                        # verbose: shows per-case scores and reasoning
```

`pixie test` automatically finds the project root (the directory containing `pyproject.toml`, `setup.py`, or `setup.cfg`) and adds it to `sys.path` — just like pytest. No `sys.path` hacks are needed in test files.

---

## Stage 5: Build the Dataset

Create the dataset first, then populate it by **actually running the app** with representative inputs. This is critical — dataset items should contain real app outputs and trace metadata, not fabricated data.

```bash
pixie dataset create <dataset-name>
pixie dataset list   # verify it exists
```

### Run the app and capture traces to the dataset

Write a simple script (`pixie_qa/scripts/build_dataset.py`) that calls the instrumented function for each input, flushes traces, then saves them to the dataset:

```python
import asyncio
from pixie import enable_storage, flush, DatasetStore, Evaluable

from myapp import answer_question

GOLDEN_CASES = [
    ("What is the capital of France?", "Paris"),
    ("What is the speed of light?", "299,792,458 meters per second"),
]

async def build_dataset():
    enable_storage()
    store = DatasetStore()
    try:
        store.create("qa-golden-set")
    except FileExistsError:
        pass

    for question, expected in GOLDEN_CASES:
        result = answer_question(question=question)
        flush()

        store.append("qa-golden-set", Evaluable(
            eval_input={"question": question},
            eval_output=result,
            expected_output=expected,
        ))

asyncio.run(build_dataset())
```

Alternatively, use the CLI for per-case capture:

```bash
# Run the app (enable_storage() must be active)
python -c "from myapp import main; main('What is the capital of France?')"

# Save the root span to the dataset
pixie dataset save <dataset-name>

# Or specifically save the last LLM call:
pixie dataset save <dataset-name> --select last_llm_call

# Add context:
pixie dataset save <dataset-name> --notes "basic geography question"

# Attach expected output for evaluators like FactualityEval:
echo '"Paris"' | pixie dataset save <dataset-name> --expected-output
```

**Key rules for dataset building:**

- **Always run the app** — never fabricate `eval_output` manually. The whole point is capturing what the app actually produces.
- **Include expected outputs** for comparison-based evaluators like `FactualityEval`. Expected outputs should reflect the **correct LLM response given what the tools/system actually return** — not an idealized answer predicated on fixing non-LLM bugs.
- **Cover the range** of inputs you care about: normal cases, edge cases, things the app might plausibly get wrong.
- When using `pixie dataset save`, the evaluable's `eval_metadata` will automatically include `trace_id` and `span_id` for later debugging.

---

## Stage 6: Run the Tests

```bash
pixie test pixie_qa/tests/ -v
```

The `-v` flag shows per-case scores and reasoning, which makes it much easier to see what's passing and what isn't. Check that the pass rates look reasonable given your `ScoreThreshold`.

**After this stage, if the user's intent was "setup" — STOP.** Report results and ask before proceeding. See "Setup vs. Iteration" above.

---

## Stage 7: Investigate Failures

**Only proceed here if the user asked for iteration/fixing, or explicitly confirmed after setup.**

When tests fail, the goal is to understand _why_, not to adjust thresholds until things pass. Investigation must be thorough and documented — the user needs to see the actual data, your reasoning, and your conclusion.

### Step 1: Get the detailed test output

```bash
pixie test pixie_qa/tests/ -v    # shows score and reasoning per case
```

Capture the full verbose output. For each failing case, note:

- The `eval_input` (what was sent)
- The `eval_output` (what the app produced)
- The `expected_output` (what was expected, if applicable)
- The evaluator score and reasoning

### Step 2: Inspect the trace data

For each failing case, look up the full trace to see what happened inside the app:

```python
from pixie import DatasetStore

store = DatasetStore()
ds = store.get("<dataset-name>")
for i, item in enumerate(ds.items):
    print(i, item.eval_metadata)   # trace_id is here
```

Then inspect the full span tree:

```python
import asyncio
from pixie import ObservationStore

async def inspect(trace_id: str):
    store = ObservationStore()
    roots = await store.get_trace(trace_id)
    for root in roots:
        print(root.to_text())   # full span tree: inputs, outputs, LLM messages

asyncio.run(inspect("the-trace-id-here"))
```

### Step 3: Root-cause analysis

Walk through the trace and identify exactly where the failure originates. Common patterns:

| Symptom | Likely cause |
| ------- | ------------ |

**LLM-related failures (fix with prompt/model/eval changes):**

| Symptom                                                | Likely cause                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| Output is factually wrong despite correct tool results | Prompt doesn't instruct the LLM to use tool output faithfully |
| Agent routes to wrong tool/handoff                     | Routing prompt or handoff descriptions are ambiguous          |
| Output format is wrong                                 | Missing format instructions in prompt                         |
| LLM hallucinated instead of using tool                 | Prompt doesn't enforce tool usage                             |

**Non-LLM failures (fix with traditional code changes, out of eval scope):**

| Symptom                                           | Likely cause                                            |
| ------------------------------------------------- | ------------------------------------------------------- |
| Tool returned wrong data                          | Bug in tool implementation — fix the tool, not the eval |
| Tool wasn't called at all due to keyword mismatch | Tool-selection logic is broken — fix the code           |
| Database returned stale/wrong records             | Data issue — fix independently                          |
| API call failed with error                        | Infrastructure issue                                    |

For non-LLM failures: note them in the investigation log and recommend the code fix, but **do not adjust eval expectations or thresholds to accommodate bugs in non-LLM code**. The eval test should measure LLM quality assuming the rest of the system works correctly.

### Step 4: Document findings in MEMORY.md

**Every failure investigation must be documented in `pixie_qa/MEMORY.md`** in a structured format:

```markdown
### Investigation: <test_name> failure — <date>

**Test**: `test_faq_factuality` in `pixie_qa/tests/test_customer_service.py`
**Result**: 3/5 cases passed (60%), threshold was 80% ≥ 0.7

#### Failing case 1: "What rows have extra legroom?"

- **eval_input**: `{"user_message": "What rows have extra legroom?"}`
- **eval_output**: "I'm sorry, I don't have the exact row numbers for extra legroom..."
- **expected_output**: "rows 5-8 Economy Plus with extra legroom"
- **Evaluator score**: 0.1 (FactualityEval)
- **Evaluator reasoning**: "The output claims not to know the answer while the reference clearly states rows 5-8..."

**Trace analysis**:
Inspected trace `abc123`. The span tree shows:

1. Triage Agent routed to FAQ Agent ✓
2. FAQ Agent called `faq_lookup_tool("What rows have extra legroom?")` ✓
3. `faq_lookup_tool` returned "I'm sorry, I don't know..." ← **root cause**

**Root cause**: `faq_lookup_tool` (customer_service.py:112) uses keyword matching.
The seat FAQ entry is triggered by keywords `["seat", "seats", "seating", "plane"]`.
The question "What rows have extra legroom?" contains none of these keywords, so it
falls through to the default "I don't know" response.

**Classification**: Non-LLM failure — the keyword-matching tool is broken.
The LLM agent correctly routed to the FAQ agent and used the tool; the tool
itself returned wrong data.

**Fix**: Add `"row"`, `"rows"`, `"legroom"` to the seating keyword list in
`faq_lookup_tool` (customer_service.py:130). This is a traditional code fix,
not an eval/prompt change.

**Verification**: After fix, re-run:
\`\`\`bash
python pixie_qa/scripts/build_dataset.py # refresh dataset
pixie test pixie_qa/tests/ -k faq -v # verify
\`\`\`
```

### Step 5: Fix and re-run

Make the targeted change, rebuild the dataset if needed, and re-run. Always finish by giving the user the exact commands to verify:

```bash
pixie test pixie_qa/tests/test_<feature>.py -v
```

---

## Memory Template

````markdown
# Eval Notes: <Project Name>

## How the application works

### Entry point and execution flow

<How to start/run the app. Step-by-step flow from input to output.>

### Inputs to LLM calls

<For EACH LLM call, document: location in code, system prompt, dynamic content, available tools>

### Intermediate processing

<Steps between input and output: retrieval, routing, tool calls, etc. Code pointers for each.>

### Final output

<What the user sees. Format. Quality expectations.>

### Use cases

<Each scenario with examples of good/bad outputs:>

1. <Use case 1>: <description>
   - Input example: ...
   - Good output: ...
   - Bad output: ...

## Evaluation plan

### What to evaluate and why

<Quality dimensions and rationale>

### Evaluators and criteria

| Test | Dataset | Evaluator | Criteria | Rationale |
| ---- | ------- | --------- | -------- | --------- |
| ...  | ...     | ...       | ...      | ...       |

### Data needed for evaluation

<What data to capture, with code pointers>

## Datasets

| Dataset | Items | Purpose |
| ------- | ----- | ------- |
| ...     | ...   | ...     |

## Investigation log

### <date> — <test_name> failure

<Full structured investigation as described in Stage 7>
````

---

## Reference

See `references/pixie-api.md` for all CLI commands, evaluator signatures, and the Python dataset/store API.
