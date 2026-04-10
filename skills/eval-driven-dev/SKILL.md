---
name: eval-driven-dev
description: >
  Set up eval-based QA for Python LLM applications: instrument the app,
  build golden datasets, write and run eval tests, and iterate on failures.
  ALWAYS USE THIS SKILL when the user asks to set up QA, add tests, add evals,
  evaluate, benchmark, fix wrong behaviors, improve quality, or do quality assurance for any Python project that calls an LLM model.
license: MIT
compatibility: Python 3.11+
metadata:
  version: 0.6.1
  pixie-qa-version: ">=0.6.1,<0.7.0"
  pixie-qa-source: https://github.com/yiouli/pixie-qa/
---

# Eval-Driven Development for Python LLM Applications

You're building an **automated QA pipeline** that tests a Python application end-to-end — running it the same way a real user would, with real inputs — then scoring the outputs using evaluators and producing pass/fail results via `pixie test`.

**What you're testing is the app itself** — its request handling, context assembly (how it gathers data, builds prompts, manages conversation state), routing, and response formatting. The app uses an LLM, which makes outputs non-deterministic — that's why you use evaluators (LLM-as-judge, similarity scores) instead of `assertEqual` — but the thing under test is the app's code, not the LLM.

During evaluation, the app's own code runs for real — routing, prompt assembly, LLM calls, response formatting — nothing is mocked or stubbed. But the data the app reads from external sources (databases, caches, third-party APIs, voice streams) is replaced with test-specified values via instrumentations. This means each test case controls exactly what data the app sees, while still exercising the full application code path.

**The deliverable is a working `pixie test` run with real scores** — not a plan, not just instrumentation, not just a dataset.

This skill is about doing the work, not describing it. Read code, edit files, run commands, produce a working pipeline.

---

## Before you start

**First, activate the virtual environment**. Identify the correct virtual environment for the project and activate it. After the virtual environment is active, then run the setup.sh included in the skill's resources.
The script updates the `eval-driven-dev` skill and `pixie-qa` python package to the latest version, initializes the pixie working directory if it's not already initialized, and starts a web server in the background to show user updates. If the skill or package update fails, continue — do not let these failures block the rest of the workflow.

---

## The workflow

Follow Steps 1–6 straight through without stopping. Do not ask the user for confirmation at intermediate steps — verify each step yourself and continue.

**How to work — read this before doing anything else:**

- **One step at a time.** Read only the current step's instructions. Do NOT read Steps 2–6 while working on Step 1.
- **Read references only when a step tells you to.** Each step names a specific reference file. Read it when you reach that step — not before.
- **Create artifacts immediately.** After reading code for a sub-step, write the output file for that sub-step before moving on. Don't accumulate understanding across multiple sub-steps before writing anything.
- **Verify, then move on.** Each step has a checkpoint. Verify it, then proceed to the next step. Don't plan future steps while verifying the current one.

**Run Steps 1–6 in sequence.** If the user's prompt makes it clear that earlier steps are already done (e.g., "run the existing tests", "re-run evals"), skip to the appropriate step. When in doubt, start from Step 1.

---

### Step 1: Understand the app and define eval criteria

**First, check the user's prompt for specific requirements.** Before reading app code, examine what the user asked for:

- **Referenced documents or specs**: Does the prompt mention a file to follow (e.g., "follow the spec in EVAL_SPEC.md", "use the methodology in REQUIREMENTS.md")? If so, **read that file first** — it may specify datasets, evaluation dimensions, pass criteria, or methodology that override your defaults.
- **Specified datasets or data sources**: Does the prompt reference specific data files (e.g., "use questions from eval_inputs/research_questions.json", "use the scenarios in call_scenarios.json")? If so, **read those files** — you must use them as the basis for your eval dataset, not fabricate generic alternatives.
- **Specified evaluation dimensions**: Does the prompt name specific quality aspects to evaluate (e.g., "evaluate on factuality, completeness, and bias", "test identity verification and tool call correctness")? If so, **every named dimension must have a corresponding evaluator** in your test file.

If the prompt specifies any of the above, they take priority. Read and incorporate them before proceeding.

Step 1 has two sub-steps. Each reads its own reference file and produces its own output file. **Complete each sub-step fully before starting the next.**

#### Sub-step 1a: Entry point & execution flow

> **Reference**: Read `references/1-a-entry-point.md` now.

Read the source code to understand how the app starts and how a real user invokes it. Write your findings to `pixie_qa/01-entry-point.md` before moving on.

> **Checkpoint**: `pixie_qa/01-entry-point.md` written with entry point, execution flow, user-facing interface, and env requirements.

#### Sub-step 1b: Eval criteria

> **Reference**: Read `references/1-b-eval-criteria.md` now.

Define the app's use cases and eval criteria. Use cases drive dataset creation (Step 4); eval criteria drive evaluator selection (Step 3). Write your findings to `pixie_qa/02-eval-criteria.md` before moving on.

> **Checkpoint**: `pixie_qa/02-eval-criteria.md` written with use cases, eval criteria, and their applicability scope. Do NOT read Step 2 instructions yet.

---

### Step 2: Instrument with `wrap` and capture a reference trace

> **Reference**: Read `references/2-wrap-and-trace.md` now for the detailed sub-steps.

**Goal**: Make the app testable by controlling its external data and capturing its outputs. `wrap()` calls at data boundaries let the test harness inject controlled inputs (replacing real DB/API calls) and capture outputs for scoring. The `Runnable` class provides the lifecycle interface that `pixie test` uses to set up, invoke, and tear down the app. A reference trace captured with `pixie trace` proves the instrumentation works and provides the exact data shapes needed for dataset creation in Step 4.

> **Checkpoint**: `pixie_qa/scripts/run_app.py` written and verified. `pixie_qa/reference-trace.jsonl` exists and all expected data points appear when formatted with `pixie format`. Do NOT read Step 3 instructions yet.

---

### Step 3: Define evaluators

> **Reference**: Read `references/3-define-evaluators.md` now for the detailed sub-steps.

**Goal**: Turn the qualitative eval criteria from Step 1b into concrete, runnable scoring functions. Each criterion maps to either a built-in evaluator or a custom one you implement. The evaluator mapping artifact bridges between criteria and the dataset, ensuring every quality dimension has a scorer.

> **Checkpoint**: All evaluators implemented. `pixie_qa/03-evaluator-mapping.md` written with criterion-to-evaluator mapping. Do NOT read Step 4 instructions yet.

---

### Step 4: Build the dataset

> **Reference**: Read `references/4-build-dataset.md` now for the detailed sub-steps.

**Goal**: Create the test scenarios that tie everything together — the runnable (Step 2), the evaluators (Step 3), and the use cases (Step 1b). Each dataset entry defines what to send to the app, what data the app should see from external services, and how to score the result. Use the reference trace from Step 2 as the source of truth for data shapes and field names.

> **Checkpoint**: Dataset JSON created at `pixie_qa/datasets/<name>.json` with diverse entries covering all use cases. Do NOT read Step 5 instructions yet.

---

### Step 5: Run evaluation-based tests

> **Reference**: Read `references/5-run-tests.md` now for the detailed sub-steps.

**Goal**: Execute the full pipeline end-to-end and verify it produces real scores. This step is about getting the machinery running — fixing any setup or data issues until every dataset entry runs and gets scored. Once tests produce results, run `pixie analyze` for pattern analysis.

> **Checkpoint**: Tests run and produce real scores. Analysis generated.
>
> If the test errors out, that's a setup bug — fix and re-run. But if tests produce real pass/fail scores, that's the deliverable.
>
> **STOP GATE — read this before doing anything else after tests produce scores:**
>
> - If the user's original prompt asks only for setup ("set up QA", "add tests", "add evals", "set up evaluations"), **STOP HERE**. Report the test results to the user: "QA setup is complete. Tests show N/M passing. [brief summary]. Want me to investigate the failures and iterate?" Do NOT proceed to Step 6.
> - If the user's original prompt explicitly asks for iteration ("fix", "improve", "debug", "iterate", "investigate failures", "make tests pass"), proceed to Step 6.

---

### Step 6: Investigate and iterate

> **Reference**: Read `references/6-investigate.md` now — it has the stop/continue decision, analysis review, root-cause patterns, and investigation procedures. **Follow its instructions before doing any investigation work.**

---

## Web Server Management

pixie-qa runs a web server in the background for displaying context, traces, and eval results to the user. It's automatically started by the setup script (via `pixie start`, which launches a detached background process and returns immediately).

When the user is done with the eval-driven-dev workflow, inform them the web server is still running and you can clean it up with:

```bash
pixie stop
```

IMPORTANT: after the web server is stopped, the web UI becomes inaccessible. So only stop the server if the user confirms they're done with all web UI features. If they want to keep using the web UI, do NOT stop the server.

And whenever you restart the workflow, always run the setup.sh script in resources again to ensure the web server is running:
