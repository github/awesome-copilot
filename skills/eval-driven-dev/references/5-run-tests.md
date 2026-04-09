# Step 5: Run Evaluation-Based Tests

**Why this step**: Run `pixie test` and fix any dataset quality issues — `WrapRegistryMissError`, `WrapTypeMismatchError`, bad `eval_input` data, or import failures — until real evaluator scores are produced for every entry.

---

## 5a. Run tests

```bash
pixie test
```

For verbose output with per-case scores and evaluator reasoning:

```bash
pixie test -v
```

`pixie test` automatically loads the `.env` file before running tests.

The test runner now:

1. Resolves the `Runnable` class from the dataset's `runnable` field
2. Calls `Runnable.create()` to construct an instance, then `setup()` once
3. Runs all dataset entries **concurrently** (up to 4 in parallel):
   a. Reads `entry_kwargs` and `eval_input` from the entry
   b. Populates the wrap input registry with `eval_input` data
   c. Initialises the capture registry
   d. Validates `entry_kwargs` into the Pydantic model and calls `Runnable.run(args)`
   e. `wrap(purpose="input")` calls in the app return registry values instead of calling external services
   f. `wrap(purpose="output"/"state")` calls capture data for evaluation
   g. Builds `Evaluable` from captured data
   h. Runs evaluators
4. Calls `Runnable.teardown()` once

Because entries run concurrently, the Runnable's `run()` method must be concurrency-safe. If you see `sqlite3.OperationalError`, `"database is locked"`, or similar errors, add a `Semaphore(1)` to your Runnable (see the concurrency section in Step 2 reference).

## 5b. Fix dataset/harness issues

**Data validation errors** (registry miss, type mismatch, deserialization failure) are reported per-entry with clear messages pointing to the specific `wrap` name and dataset field. This step is about fixing **what you did wrong in Step 4** — bad data, wrong format, missing fields — not about evaluating the app's quality.

| Error                                 | Cause                                                                                                                   | Fix                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `WrapRegistryMissError: name='<key>'` | Dataset entry missing an `eval_input` item with the `name` that the app's `wrap(purpose="input", name="<key>")` expects | Add the missing `{"name": "<key>", "value": ...}` to `eval_input` in every affected entry    |
| `WrapTypeMismatchError`               | Deserialized type doesn't match what the app expects                                                                    | Fix the value in the dataset                                                                 |
| Runnable resolution failure           | `runnable` path or class name is wrong, or the class doesn't implement the `Runnable` protocol                          | Fix `filepath:ClassName` in the dataset; ensure the class has `create()` and `run()` methods |
| Import error                          | Module path or syntax error in runnable/evaluator                                                                       | Fix the referenced file                                                                      |
| `ModuleNotFoundError: pixie_qa`       | `pixie_qa/` directory missing `__init__.py`                                                                             | Run `pixie init` to recreate it                                                              |
| `TypeError: ... is not callable`      | Evaluator name points to a non-callable attribute                                                                       | Evaluators must be functions, classes, or callable instances                                 |
| `sqlite3.OperationalError`            | Concurrent `run()` calls sharing a SQLite connection                                                                    | Add `asyncio.Semaphore(1)` to the Runnable (see Step 2 concurrency section)                  |

Iterate — fix errors, re-run, fix the next error — until `pixie test` runs cleanly with real evaluator scores for all entries.

### When to stop iterating on evaluator results

Once the dataset runs without errors and produces real scores, assess the results:

- **Custom function evaluators** (deterministic checks): If they fail, the issue is in the dataset data or evaluator logic. Fix and re-run — these should converge quickly.
- **LLM-as-judge evaluators** (e.g., `Factuality`, `ClosedQA`, custom LLM evaluators): These have inherent variance across runs. If scores fluctuate between runs without code changes, the issue is evaluator prompt quality, not app behavior. **Do not spend more than one revision cycle on LLM evaluator prompts.** Run 2–3 times, assess variance, and accept the results if they are directionally correct.
- **General rule**: Stop iterating when all custom function evaluators pass consistently and LLM evaluators produce reasonable scores (most passing). Perfect LLM evaluator scores are not the goal — the goal is a working QA pipeline that catches real regressions.

## 5c. Run analysis

Once tests complete without setup errors and produce real scores, run analysis:

```bash
pixie analyze <test_id>
```

Where `<test_id>` is the test run identifier printed by `pixie test` (e.g., `20250615-120000`). This generates LLM-powered markdown analysis for each dataset, identifying patterns in successes and failures.

## Output

- Test results at `{PIXIE_ROOT}/results/<test_id>/result.json`
- Analysis files at `{PIXIE_ROOT}/results/<test_id>/dataset-<index>.md` (after `pixie analyze`)

---

> **If you hit an unexpected error** when running tests (wrong parameter names, import failures, API mismatch), read `wrap-api.md`, `evaluators.md`, or `testing-api.md` for the authoritative API reference before guessing at a fix.
