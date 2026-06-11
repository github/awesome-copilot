---
name: eval-driven-dev
description: >
  Improve AI application with evaluation-driven development. Define eval criteria, instrument the application, build golden datasets, observe and evaluate application runs, analyze results, and produce a concrete action plan for improvements.
  ALWAYS USE THIS SKILL when the user asks to set up QA, add tests, add evals,
  evaluate, benchmark, fix wrong behaviors, improve quality, or do quality assurance for any Python project that calls an LLM model.
license: MIT
compatibility: Python 3.10+
metadata:
  version: 0.8.4
  pixie-qa-version: ">=0.8.4,<0.9.0"
  pixie-qa-source: https://github.com/yiouli/pixie-qa/
---

# Eval-Driven Development for Python LLM Applications

You're building an **automated evaluation pipeline** that tests a Python-based AI application end-to-end — running it the same way a real user would, with real inputs — then scoring the outputs using evaluators and producing pass/fail results via `pixie test`.

**What you're testing is the app itself** — its request handling, context assembly (how it gathers data, builds prompts, manages conversation state), routing, and response formatting. The app uses an LLM, which makes outputs non-deterministic — that's why you use evaluators (LLM-as-judge, similarity scores) instead of `assertEqual` — but the thing under test is the app's code, not the LLM.

During evaluation, the app's own code runs for real — routing, prompt assembly, LLM calls, response formatting — nothing is mocked or stubbed. But the data the app reads from external sources (databases, caches, third-party APIs, voice streams) is replaced with test-specified values via instrumentations. This means each test case controls exactly what data the app sees, while still exercising the full application code path.

**Rule: The app's LLM calls must go to a real LLM.** Do not replace, mock, stub, or intercept the LLM with a fake implementation. The LLM is the core value-generating component — replacing it makes the eval tautological (you control both inputs and outputs, so scores are meaningless). If the project's test suite contains LLM mocking patterns, those are for the project's own unit tests — do NOT adopt them for the eval Runnable.

**The deliverable is a working `pixie test` run with real scores** — not a plan, not just instrumentation, not just a dataset.

This skill is about doing the work, not describing it. Read code, edit files, run commands, produce a working pipeline.

---

## Before you start

**First, activate the virtual environment**. Identify the correct virtual environment for the project and activate it. After the virtual environment is active, run the setup.sh included in the skill's resources.
The script updates the `eval-driven-dev` skill and `pixie-qa` python package to latest version, initialize the pixie working directory if it's not already initialized, and start a web server in the background to show user updates.

**Setup error handling — what you can skip vs. what must succeed:**

- **Skill update fails** → OK to continue. The existing skill version is sufficient.
- **pixie-qa upgrade fails but was already installed** → OK to continue with the existing version.
- **pixie-qa is NOT installed and installation fails** → **STOP.** Ask the user for help. The workflow cannot proceed without the `pixie` package.
- **`pixie init` fails** → **STOP.** Ask the user for help.
- **`pixie start` (web server) fails** → **STOP.** Ask the user for help. Check `server.log` in the pixie root directory for diagnostics. Common causes: port conflict, missing dependency, slow environment. Do NOT proceed without the web server — the user needs it to see eval results.

---

## The workflow

Follow Steps 1–6 straight through without stopping. Do not ask the user for confirmation at intermediate steps — verify each step yourself and continue.

**How to work — read this before doing anything else:**

- **One step at a time.** Read only the current step's instructions. Do NOT read Steps 2–6 while working on Step 1.
- **Read references only when a step tells you to.** Each step names a specific reference file. Read it when you reach that step — not before.
- **Create artifacts immediately.** After reading code for a sub-step, write the output file for that sub-step before moving on. Don't accumulate understanding across multiple sub-steps before writing anything.
- **Verify, then move on.** Each step has a checkpoint. Verify it, then proceed to the next step. Don't plan future steps while verifying the current one.

**When to stop and ask for help:**

Some blockers cannot and should not be worked around. When you encounter any of the following, **stop immediately and ask the user for help** — do not attempt workarounds:

- **Application won't run due to missing environment variables or configuration**: The app requires environment variables or configuration that are not set and cannot be inferred. Do NOT work around this by mocking, faking, or replacing application components — the eval must exercise real production code. Ask the user to fix the environment setup.
- **App import failures that indicate a broken project**: If the app's core modules cannot be imported due to missing system dependencies or incompatible Python versions (not just missing pip packages you can install), ask the user to fix the project setup.
- **Ambiguous entry point**: If the app has multiple equally plausible entry points and the project analysis doesn't clarify which one matters most, ask the user which to target.

Blockers you SHOULD resolve yourself (do not ask): missing Python packages (install them), missing `pixie` package (install it), port conflicts (pick a different port), file permission issues (fix them).

**Run Steps 1–6 in sequence.** If the user's prompt makes it clear that earlier steps are already done (e.g., "run the existing tests", "re-run evals"), skip to the appropriate step. When in doubt, start from Step 1.

---

### Step 1: Understand the app and define eval criteria

**First, check the user's prompt for specific requirements.** Before reading app code, examine what the user asked for:

- **Referenced documents or specs**: Does the prompt mention a file to follow (e.g., "follow the spec in EVAL_SPEC.md", "use the methodology in REQUIREMENTS.md")? If so, **read that file first** — it may specify datasets, evaluation dimensions, pass criteria, or methodology that override your defaults.
- **Specified datasets or data sources**: Does the prompt reference specific data files (e.g., "use questions from eval_inputs/research_questions.json", "use the scenarios in call_scenarios.json")? If so, **read those files** — you must use them as the basis for your eval dataset, not fabricate generic alternatives.
- **Specified evaluation dimensions**: Does the prompt name specific quality aspects to evaluate (e.g., "evaluate on factuality, completeness, and bias", "test identity verification and tool call correctness")? If so, **every named dimension must have a corresponding evaluator** in your test file.

If the prompt specifies any of the above, they take priority. Read and incorporate them before proceeding.

Step 1 has three sub-steps. Each reads its own reference file and produces its own output file. **Complete each sub-step fully before starting the next.**

#### Sub-step 1a: Project analysis

> **Reference**: Read `references/1-a-project-analysis.md` now.

Before looking at code structure or entry points, understand what this software does in the real world — its purpose, its users, the complexity of real inputs, and where it fails. This understanding drives every downstream decision: which entry points matter most, what eval criteria to define, what trace inputs to use, and what dataset entries to create. Write the detailed context file before moving on. **Note**: the project may contain `tests/`, `fixtures/`, `examples/`, mock servers, and documentation — these are the project's own development infrastructure, NOT data sources for your eval pipeline. Ignore them when sourcing trace inputs and dataset content.

> **Checkpoint**: `pixie_qa/00-project-analysis.md` written — covering what the software does, target users, capability inventory (at least 3 capabilities if the project has them), realistic input characteristics, and hard problems / failure modes (at least 2).

#### Sub-step 1b: Entry point & execution flow

> **Reference**: Read `references/1-b-entry-point.md` now.

Read the source code to understand how the app starts and how a real user invokes it. Use the **capability inventory** from `pixie_qa/00-project-analysis.md` to prioritize entry points — focus on the entry point(s) that exercise the most valuable capabilities, not just the first one found. Write the detailed context file before moving on.

> **Checkpoint**: `pixie_qa/01-entry-point.md` written — covering entry point, execution flow, user-facing interface, and env requirements.

#### Sub-step 1c: Eval criteria

> **Reference**: Read `references/1-c-eval-criteria.md` now.

Define the app's use cases and eval criteria. Derive use cases from the **capability inventory** in `pixie_qa/00-project-analysis.md`. Derive eval criteria from the **hard problems / failure modes** — not generic quality dimensions. Use cases drive dataset creation (Step 4); eval criteria drive evaluator selection (Step 3). Write the detailed context file before moving on.

> **Checkpoint**: `pixie_qa/02-eval-criteria.md` written — covering use cases, eval criteria, and their applicability scope. Do NOT read Step 2 instructions yet.

---

### Step 2: Instrument, run application, and capture a reference trace

Step 2 has three sub-steps. Each reads its own reference file. **Complete each sub-step before starting the next.**

#### Sub-step 2a: Instrument with `wrap`

> **Reference**: Read `references/2a-instrumentation.md` now.

Add `wrap()` calls at the app's data boundaries so the eval harness can inject controlled inputs and capture outputs. This makes the app testable without changing its logic.

> **Checkpoint**: `wrap()` calls added at all data boundaries. Every eval criterion from `pixie_qa/02-eval-criteria.md` has a corresponding data point.

#### Sub-step 2b: Implement the Runnable

> **Reference**: Read `references/2b-implement-runnable.md` now.

Write a Runnable class that lets the eval harness invoke the app exactly as a real user would. The Runnable should be simple — it just wires up the app's real entry point to the harness interface. If it's getting complicated, something is wrong.

> **Checkpoint**: `pixie_qa/run_app.py` written. The Runnable calls the app's real entry point with real LLM configuration — no mocking, no faking, no component replacement.

#### Sub-step 2c: Capture and verify a reference trace

> **Reference**: Read `references/2c-capture-and-verify-trace.md` now.

Run the app through the Runnable and capture a trace. The trace proves instrumentation and the Runnable are working correctly, and provides the data shapes needed for dataset creation in Step 4.

> **Checkpoint**: `pixie_qa/reference-trace.jsonl` exists. All expected `wrap` entries and `llm_span` entries appear. `pixie format` shows all data points needed for evaluation. Do NOT read Step 3 instructions yet.

---

### Step 3: Define evaluators

> **Reference**: Read `references/3-define-evaluators.md` now for the detailed sub-steps.

**Goal**: Turn the qualitative eval criteria from Step 1c into concrete, runnable scoring functions. Each criterion maps to either a built-in evaluator, an **agent evaluator** (the default for any semantic or qualitative criterion), or a manual custom function (only for mechanical/deterministic checks like regex or field existence). The evaluator mapping artifact bridges between criteria and the dataset, ensuring every quality dimension has a scorer. Select evaluators that measure the **hard problems** identified in `pixie_qa/00-project-analysis.md` — not just generic quality dimensions.

> **Checkpoint**: All evaluators implemented. `pixie_qa/03-evaluator-mapping.md` written with criterion-to-evaluator mapping and decision rationale. Do NOT read Step 4 instructions yet.

---

### Step 4: Build the dataset

> **Reference**: Read `references/4-build-dataset.md` now for the detailed sub-steps.

**Goal**: Create the test scenarios that tie everything together — the runnable (Step 2), the evaluators (Step 3), and the use cases (Step 1c). Each dataset entry defines what to send to the app, what data the app should see from external services, and how to score the result. Use the reference trace from Step 2 as the source of truth for data shapes and field names. Cover entries from the **capability inventory** in `pixie_qa/00-project-analysis.md` and include entries targeting the **failure modes** identified there. **Do NOT use the project's own test fixtures, mock servers, or example data as dataset `eval_input` content** — source real-world data instead. **Every `wrap(purpose="input")` in the app must have pre-captured content in each entry's `eval_input`** — do NOT leave `eval_input` empty when the app has input wraps.

> **Checkpoint**: Dataset JSON created at `pixie_qa/datasets/<name>.json` with diverse entries covering all use cases. **Dataset realism audit passed** — entries use real-world data at representative scale, no project test fixtures contamination, at least one entry targets a failure mode with uncertain outcome, and every `eval_input` has captured content for all input wraps. Do NOT read Step 5 instructions yet.

---

### Step 5: Run `pixie test` and fix mechanical issues

> **Reference**: Read `references/5-run-tests.md` now for the detailed sub-steps.

**Goal**: Execute the full pipeline end-to-end and get it running without mechanical errors. This step is strictly about fixing setup and data issues in the pixie QA components (dataset, runnable, custom evaluators) — NOT about fixing the application itself or evaluating result quality. Once `pixie test` completes without errors and produces real evaluator scores for every entry, this step is done.

> **Checkpoint**: `pixie test` runs to completion. Every dataset entry has evaluator scores (real `EvaluationResult` or `PendingEvaluation`). No setup errors, no import failures, no data validation errors.
>
> If the test errors out, that's a mechanical bug in your QA components — fix and re-run. But once tests produce scores, move on. Do NOT assess result quality here — that's Step 6.

**Always proceed to Step 6 after tests produce scores.** Analysis is the essential final step — without it, pending evaluations are never completed and the user gets uninterpreted raw scores with no actionable insights. Do NOT stop here and ask the user whether to continue.

**Cycle rule for iterative runs**: Every successful `pixie test` invocation creates a concrete `pixie_qa/results/<test_id>` directory and starts a new analysis cycle. Before you edit application code, prompts, datasets, evaluators, or rerun `pixie test`, complete Step 6 for that exact results directory. Do not skip earlier cycles and analyze only the last run.

---

### Step 6: Analyze outcomes

> **Reference**: Read `references/6-analyze-outcomes.md` now — it has the complete three-phase analysis process, writing guidelines, and output format requirements.

**Goal**: Analyze `pixie test` results in a structured, data-driven process to produce actionable insights on test case quality, evaluator quality, and application quality. This step completes pending evaluations, writes per-entry and per-dataset analysis, and produces a prioritized action plan. Every statement must be backed by concrete data from the evaluation run — no speculation, no hand-waving.

**Persisted analysis artifacts**: In this trimmed workflow, persist analysis only at the dataset level and test-run level. Those artifacts still use a **detailed version** (for agent consumption: data points, evidence trails, reasoning chains) plus a **summary version** (for human review: concise TLDR readable in under 2 minutes). Do not create per-entry analysis files.

**Hard completion gate**: Step 6 is **not complete** until all of the following are true:

- Every `"status": "pending"` entry in every `pixie_qa/results/<test_id>/dataset-*/entry-*/evaluations.jsonl` has been replaced with a scored result containing `score` and `reasoning`.
- Every dataset directory has `analysis.md` and `analysis-summary.md`.
- The test run root has `action-plan.md` and `action-plan-summary.md`.
- You have run the Step 6 verifier script from this skill's `resources/` directory against `pixie_qa/results/<test_id>`, and it reports success.

**Explicitly not sufficient**:

- Writing a single top-level file such as `pixie_qa/06-analysis.md`
- Saying pending evaluations are for the user to review in the web UI
- Saying an entry "likely passes" without updating `evaluations.jsonl`

---

## Web Server Management

pixie-qa runs a web server in the background for displaying context, traces, and eval results to the user. It's automatically started by the setup script (via `pixie start`, which launches a detached background process and returns immediately).

When the user is done with the eval-driven-dev workflow, inform them the web server is still running and you can clean it up with:

```bash
pixie stop
```

IMPORTANT: after the web server is stopped, the web UI becomes inaccessible. So only stop the server if the user confirms they're done with all web UI features. If they want to keep using the web UI, do NOT stop the server.

And whenever you restart the workflow, always run the setup.sh script in resources again to ensure the web server is running:
