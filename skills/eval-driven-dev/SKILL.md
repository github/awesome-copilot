---
name: eval-driven-dev
description: >
  Set up eval-based QA for Python LLM applications: instrument the app, build golden datasets,
  write and run eval tests, and iterate on failures.
  ALWAYS USE THIS SKILL when the user asks to set up QA, add tests, add evals,
  evaluate, benchmark, fix wrong behaviors, improve quality, or do quality assurance for any Python project that calls an LLM model.
license: MIT
compatibility: Python 3.11+
metadata:
  version: 0.2.0
---

# Eval-Driven Development for Python LLM Applications

You're building an **automated QA pipeline** that tests a Python application end-to-end — running it the same way a real user would, with real inputs — then scoring the outputs using evaluators and producing pass/fail results via `pixie test`.

**What you're testing is the app itself** — its request handling, context assembly (how it gathers data, builds prompts, manages conversation state), routing, and response formatting. The app uses an LLM, which makes outputs non-deterministic — that's why you use evaluators (LLM-as-judge, similarity scores) instead of `assertEqual` — but the thing under test is the app's code, not the LLM.

**What's in scope**: the app's entire code path from entry point to response — never mock or skip any part of it. **What's out of scope**: external data sources the app reads from (databases, caches, third-party APIs, voice streams) — mock these to control inputs and reduce flakiness.

**The deliverable is a working `pixie test` run with real scores** — not a plan, not just instrumentation, not just a dataset.

This skill is about doing the work, not describing it. Read code, edit files, run commands, produce a working pipeline.

---

## Before you start

Run the following to keep the skill and package up to date. If any command fails or is blocked by the environment, continue — do not let failures here block the rest of the workflow.

**Update the skill:**

```bash
npx skills update
```

**Upgrade the `pixie-qa` package**

Make sure the python virtual environment is active and use the project's package manager:

```bash
# uv project (uv.lock exists):
uv add pixie-qa --upgrade

# poetry project (poetry.lock exists):
poetry add pixie-qa@latest

# pip / no lock file:
pip install --upgrade pixie-qa
```

---

## The workflow

Follow Steps 1–5 straight through without stopping. Do not ask the user for confirmation at intermediate steps — verify each step yourself and continue.

**Two modes:**

- **Setup** ("set up evals", "add tests", "set up QA"): Complete Steps 1–5. After the test run, report results and ask whether to iterate.
- **Iteration** ("fix", "improve", "debug"): Complete Steps 1–5 if not already done, then do one round of Step 6.

If ambiguous: default to setup.

---

### Step 1: Understand the app and define eval criteria

Read the source code to understand:

1. **How it runs** — entry point, startup, config/env vars
2. **The real entry point** — how a real user invokes the app (HTTP endpoint, CLI, function call). This is what the eval must exercise — not an inner function that bypasses the request pipeline.
3. **The request pipeline** — trace the full path from entry point to response. What middleware, routing, state management, prompt assembly, retrieval, or formatting happens along the way? All of this is under test.
4. **External dependencies (both directions)** — identify every external system the app talks to (databases, APIs, caches, queues, file systems, speech services). For each, understand:
   - **Data flowing IN** (external → app): what data does the app read from this system? What shapes, types, realistic values? You'll make up this data for eval scenarios.
   - **Data flowing OUT** (app → external): what does the app write, send, or mutate in this system? These are side-effects that evaluations may need to verify (e.g., "did the app create the right calendar entry?", "did it send the correct transfer request?").
   - **How to mock it** — look for abstract base classes, protocols, or constructor-injected backends (e.g., `TranscriptionBackend`, `SynthesisBackend`, `StorageBackend`). These are testability seams — you'll create mock implementations of these interfaces. If there's no clean interface, you'll use `unittest.mock.patch` at the module boundary.
5. **Use cases** — distinct scenarios, what good/bad output looks like

Read `references/understanding-app.md` for detailed guidance on mapping data flows and the MEMORY.md template.

Write your findings to `pixie_qa/MEMORY.md` before moving on. Include:

- The entry point and the full request pipeline
- Every external dependency, what it provides/receives, and how you'll mock it
- The testability seams (pluggable interfaces, patchable module-level objects)

Determine **high-level, application-specific eval criteria**:

**Good criteria are specific to the app's purpose.** Examples:

- Voice customer support agent: "Does the agent verify the caller's identity before transferring?", "Are responses concise enough for phone conversation (under 3 sentences)?", "Does the agent route to the correct department based on the caller's request?"
- Research report generator: "Does the report address all sub-questions in the query?", "Are claims supported by the retrieved sources?", "Is the report structured with clear sections?"
- RAG chatbot: "Are answers grounded in the retrieved context?", "Does it say 'I don't know' when the context doesn't contain the answer?"

**Bad criteria are generic evaluator names dressed up as requirements.** Don't say "Factual accuracy" or "Response relevance" — say what factual accuracy or relevance means for THIS app.

At this stage, don't pick evaluator classes or thresholds. That comes later in Step 5, after you've seen the real data shape.

Record the criteria in `pixie_qa/MEMORY.md` and continue.

> **Checkpoint**: MEMORY.md written with app understanding + eval criteria. Proceed to Step 2.

---

### Step 2: Instrument and observe a real run

**Why this step**: You need to see the actual data flowing through the app before you can build anything. This step serves two goals:

1. **Learn the data shapes** — what data flows in from external dependencies, and what side-effects flow out? What types, structures, realistic values? You'll need to make up this data for eval scenarios later.
2. **Verify instrumentation captures what evaluators need** — do the traces contain the data required to assess each eval criterion from Step 1? If a criterion is "does the agent route to the correct department," the trace must capture the routing decision.

**This is a normal app run with instrumentation — no mocks, no patches.**

#### 2a. Decide what to instrument

This is a reasoning step, not a coding step. Look at your eval criteria from Step 1 and your understanding of the codebase, and determine what data the evaluators will need:

- **For each eval criterion**, ask: what observable data would prove this criterion is met or violated?
- **Map that data to code locations** — which functions produce, consume, or transform that data?
- **Those functions need `@observe`** — so their inputs and outputs are captured in traces.

Examples:

| Eval criterion                             | Data needed                                        | What to instrument                                           |
| ------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------ |
| "Routes to correct department"             | The routing decision (which department was chosen) | The routing/dispatch function                                |
| "Responses grounded in retrieved context"  | The retrieved documents + the final response       | The retrieval function AND the response function             |
| "Verifies caller identity before transfer" | Whether identity check happened, transfer decision | The identity verification function AND the transfer function |
| "Concise phone-friendly responses"         | The final response text                            | The function that produces the LLM response                  |

**LLM provider calls (OpenAI, Anthropic, etc.) are auto-captured** — `enable_storage()` activates OpenInference instrumentors that automatically trace every LLM API call with full input messages, output messages, token usage, and model parameters. You do NOT need `@observe` on the function that calls `client.chat.completions.create()` just to see the LLM interaction.

**Use `@observe` for application-level functions** whose inputs, outputs, or intermediate states your evaluators need but that aren't visible from the LLM call alone. Examples: the app's entry-point function (to capture what the user sent and what the app returned), retrieval functions (to capture what context was fetched), routing functions (to capture dispatch decisions).

`enable_storage()` goes at application startup. Read `references/instrumentation.md` for the full rules, code patterns, and anti-patterns for adding instrumentation.

#### 2b. Add instrumentation and run the app

Add `@observe` to the functions you identified in 2a. Then run the app normally — with its real external dependencies, or by manually interacting with it — to produce a **reference trace**. Do NOT mock or patch anything. This is an observation run.

If the app can't run without infrastructure you don't have (a real database, third-party service credentials, etc.), use the simplest possible approach to get it running — a local Docker container, a test account, or ask the user for help. The goal is one real trace.

```bash
uv run pixie trace list
uv run pixie trace last
```

#### 2c. Examine the reference trace

Study the trace data carefully. This is your blueprint for everything that follows. Document:

1. **Data from external dependencies (inbound)** — What did the app read from databases, APIs, caches? What are the shapes, types, and realistic value ranges? This is what you'll make up in eval_input for the dataset.
2. **Side-effects (outbound)** — What did the app write to, send to, or mutate in external systems? These need to be captured by mocks and may be part of eval_output for verification.
3. **Intermediate states** — What did the instrumentation capture beyond the final output? Tool calls, retrieved documents, routing decisions? Are these sufficient to evaluate every criterion from Step 1?
4. **The eval_input / eval_output structure** — What does the `@observe`-decorated function receive as input and produce as output? Note the exact field names, types, and nesting.

**Check instrumentation completeness**: For each eval criterion from Step 1, verify the trace contains the data needed to evaluate it. If not, add more `@observe` decorators and re-run.

**Do not proceed until you understand the data shape and have confirmed the traces capture everything your evaluators need.**

> **Checkpoint**: Instrumentation added based on eval criteria. Reference trace captured with real data. For each criterion, confirm the trace contains the data needed to evaluate it. Proceed to Step 3.

---

### Step 3: Write a utility function to run the full app end-to-end

**Why this step**: You need a function that test cases can call. Given an eval_input (app input + mock data for external dependencies), it starts the real application with external dependencies patched, sends the input through the app's real entry point, and returns the eval_output (app response + captured side-effects).

#### The contract

```
run_app(eval_input) → eval_output
```

- **eval_input** = application input (what the user sends) + data from external dependencies (what databases/APIs would return)
- **eval_output** = application output (what the user sees) + captured side-effects (what the app wrote to external systems, captured by mocks) + captured intermediate states (tool calls, routing decisions, etc., captured by instrumentation)

#### How to implement

1. **Patch external dependencies** — use the mocking plan from Step 1 item 4. For each external dependency, either inject a mock implementation of its interface (cleanest) or `unittest.mock.patch` the module-level client. The mock returns data from eval_input and captures side-effects for eval_output.

2. **Call the app through its real entry point** — the same way a real user or client would invoke it. Look at how the app is started: if it's a web server (FastAPI, Flask), use `TestClient` or HTTP requests. If it's a CLI, use subprocess. If it's a standalone function with no server or middleware, import and call it directly.

3. **Collect the response** — the app's output becomes eval_output, along with any side-effects captured by mock objects.

Read `references/run-harness-patterns.md` for concrete examples of entry point invocation for different app types.

**Do NOT call an inner function** like `agent.respond()` directly just because it's simpler. The whole point is to test the app's real code path — request handling, state management, prompt assembly, routing. When you call an inner function directly, you skip all of that, and the test has to reimplement it. Now you're testing test code, not app code.

#### Verify

Take the eval_input from your Step 2 reference trace and feed it to the utility function. The outputs won't match word-for-word (non-deterministic), but verify:

- **Same structure** — same fields present, same types, same nesting
- **Same code path** — same routing decisions, same intermediate states captured
- **Sensible values** — eval_output fields have real, meaningful data (not null, not empty, not error messages)

**If it fails after two attempts**, stop and ask the user for help.

> **Checkpoint**: Utility function implemented and verified. When fed the reference trace's eval_input, it produces eval_output with the same structure and exercises the same code path. Proceed to Step 4.

---

### Step 4: Build the dataset

**Why this step**: The dataset is a collection of eval_input items (made up by you) that define the test scenarios. Each item may also carry case-specific expectations. The eval_output is NOT pre-populated in the dataset — it's produced at test time by the utility function from Step 3.

#### 4a. Determine verification and expectations

Before generating data, decide how each eval criterion from Step 1 will be checked.

**Examine the reference trace from Step 2** and identify:

- **Structural constraints** you can verify with code — JSON schema, required fields, value types, enum ranges, string length bounds. These become validation checks on your generated eval_inputs.
- **Semantic constraints** that require judgment — "the mock customer profile should be realistic", "the conversation history should be topically coherent". Apply these yourself when crafting the data.
- **Which criteria are universal vs. case-specific**:
  - **Universal criteria** apply to ALL test cases the same way → implement in the test function (e.g., "responses must be under 3 sentences", "must not hallucinate information not in context")
  - **Case-specific criteria** vary per test case → carry as `expected_output` in the dataset item (e.g., "should mention the caller's appointment on Tuesday", "should route to billing department")

#### 4b. Generate eval_input items

Create eval_input items that match the data shape from the reference trace:

- **Application inputs** (user queries, requests) — make these up to cover the scenarios you identified in Step 1
- **External dependency data** (database records, API responses, cache entries) — make these up in the exact shape you observed in the reference trace

Each dataset item contains:

- `eval_input`: the made-up input data (app input + external dependency data)
- `expected_output`: case-specific expectation text (optional — only for test cases with expectations beyond the universal criteria). This is a reference for evaluation, not an exact expected answer.

At test time, `eval_output` is produced by the utility function from Step 3 and is not stored in the dataset itself.
Read `references/dataset-generation.md` for the dataset creation API, data shape matching, expected_output strategy, and validation checklist.

#### 4c. Validate the dataset

After building:

1. **Execute `build_dataset.py`** — don't just write it, run it
2. **Verify structural constraints** — each eval_input matches the reference trace's schema (same fields, same types)
3. **Verify diversity** — items have meaningfully different inputs, not just minor variations
4. **Verify case-specific expectations** — `expected_output` values are specific and testable, not vague
5. For conversational apps, include items with conversation history

> **Checkpoint**: Dataset created with diverse eval_inputs matching the reference trace's data shape. Proceed to Step 5.

---

### Step 5: Write and run eval tests

**Why this step**: With the utility function built and the dataset ready, writing tests is straightforward — wire up the function, choose evaluators for each criterion, and run.

#### 5a. Map criteria to evaluators

For each eval criterion from Step 1, decide how to evaluate it:

- **Can it be checked with a built-in evaluator?** (factual correctness → `FactualityEval`, exact match → `ExactMatchEval`, RAG faithfulness → `FaithfulnessEval`)
- **Does it need a custom evaluator?** Most app-specific criteria do — use `create_llm_evaluator` with a prompt that operationalizes the criterion.
- **Is it universal or case-specific?** Universal criteria go in the test function. Case-specific criteria use `expected_output` from the dataset.

For open-ended LLM text, **never** use `ExactMatchEval` — LLM outputs are non-deterministic.

`AnswerRelevancyEval` is **RAG-only** — it requires a `context` value in the trace. Returns 0.0 without it. For general relevance without RAG, use `create_llm_evaluator` with a custom prompt.

Read `references/eval-tests.md` for the evaluator catalog, custom evaluator examples, and the test file boilerplate.

#### 5b. Write the test file and run

The test file wires together: a `runnable` (calls your utility function from Step 3), a reference to the dataset, and the evaluators you chose.

Read `references/eval-tests.md` for the exact `assert_dataset_pass` API, required parameter names, and common mistakes to avoid. **Re-read the API reference immediately before writing test code** — do not rely on earlier context.

Run with `pixie test` — not `pytest`:

```bash
uv run pixie test pixie_qa/tests/ -v
```

**After running, verify the scorecard:**

1. Shows "N/M tests passed" with real numbers
2. Does NOT say "No assert_pass / assert_dataset_pass calls recorded" (that means missing `await`)
3. Per-evaluator scores appear with real values

A test that passes with no recorded evaluations is worse than a failing test — it gives false confidence. Debug until real scores appear.

> **Checkpoint**: Tests run and produce real scores.
>
> - **Setup mode**: Report results ("QA setup is complete. Tests show N/M passing.") and ask: "Want me to investigate the failures and iterate?" Stop here unless the user says yes.
> - **Iteration mode**: Proceed directly to Step 6.
>
> If the test errors out (import failures, missing keys), that's a setup bug — fix and re-run. But if tests produce real pass/fail scores, that's the deliverable.

---

### Step 6: Investigate and iterate

**Iteration mode only, or after the user confirmed in setup mode.**

When tests fail, understand _why_ — don't just adjust thresholds until things pass.

Read `references/investigation.md` for procedures and root-cause patterns.

The cycle: investigate root cause → fix (prompt, code, or eval config) → rebuild dataset if needed → re-run tests → repeat.

---

## Quick reference

### Imports

```python
from pixie import enable_storage, observe, assert_dataset_pass, ScoreThreshold, last_llm_call
from pixie import FactualityEval, ClosedQAEval, create_llm_evaluator
```

Only `from pixie import ...` — never subpackages (`pixie.storage`, `pixie.evals`, etc.). There is no `pixie.qa` module.

### CLI commands

```bash
uv run pixie test pixie_qa/tests/ -v    # Run eval tests (NOT pytest)
uv run pixie trace list                 # List captured traces
uv run pixie trace last                 # Show most recent trace
uv run pixie trace show <id> --verbose  # Show specific trace
uv run pixie dataset create <name>      # Create a new dataset
```

### Directory layout

```
pixie_qa/
  MEMORY.md      # your understanding and eval plan
  datasets/      # golden datasets (JSON)
  tests/         # eval test files (test_*.py)
  scripts/       # run_app.py, build_dataset.py
```

All pixie files go here — not at the project root, not in a top-level `tests/` directory.

### Key concepts

- **eval_input** = application input + data from external dependencies
- **eval_output** = application output + captured side-effects + captured intermediate states (produced at test time by the utility function, NOT pre-populated in the dataset)
- **expected_output** = case-specific evaluation reference (optional per dataset item)
- **test function** = utility function (produces eval_output) + evaluators (check criteria)

### Evaluator selection

| Output type                           | Evaluator                                             | Notes                                                            |
| ------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| Open-ended text with reference answer | `FactualityEval`, `ClosedQAEval`                      | Best default for most apps                                       |
| Open-ended text, no reference         | `AnswerRelevancyEval`                                 | **RAG only** — needs `context` in trace. Returns 0.0 without it. |
| Deterministic output                  | `ExactMatchEval`, `JSONDiffEval`                      | Never use for open-ended LLM text                                |
| RAG with retrieved context            | `FaithfulnessEval`, `ContextRelevancyEval`            | Requires context capture in instrumentation                      |
| Domain-specific quality               | `create_llm_evaluator(name=..., prompt_template=...)` | Custom LLM-as-judge — use for app-specific criteria              |

### What goes where: SKILL.md vs references

**This file** (SKILL.md) is loaded for the entire session. It contains the _what_ and _why_ — the reasoning, decision-making process, goals, and checkpoints for each step.

**Reference files** are loaded when executing a specific step. They contain the _how_ — tactical API usage, code patterns, anti-patterns, troubleshooting, and ready-to-adapt examples.

When in doubt: if it's about _deciding what to do_, it's in SKILL.md. If it's about _how to implement that decision_, it's in a reference file.

### Reference files

| Reference                            | When to read                                                                       |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| `references/understanding-app.md`    | Step 1 — investigating the codebase, MEMORY.md template                            |
| `references/instrumentation.md`      | Step 2 — `@observe` and `enable_storage` rules, code patterns, anti-patterns       |
| `references/run-harness-patterns.md` | Step 3 — examples of how to invoke different app types (web server, CLI, function) |
| `references/dataset-generation.md`   | Step 4 — crafting eval_input items, expected_output strategy, validation           |
| `references/eval-tests.md`           | Step 5 — evaluator selection, test file pattern, assert_dataset_pass API           |
| `references/investigation.md`        | Step 6 — failure analysis, root-cause patterns                                     |
| `references/pixie-api.md`            | Any step — full CLI and Python API reference                                       |
