# Step 5: Run `pixie test` and Fix Mechanical Issues

**Why this step**: Run `pixie test` and fix mechanical issues in your QA components — dataset format problems, runnable implementation bugs, and custom evaluator errors — until every entry produces real scores. This step is NOT about assessing result quality or fixing the application itself.

---

## 5a. Run tests

```bash
uv run pixie test
```

For verbose output with per-case scores and evaluator reasoning:

```bash
uv run pixie test -v
```

`pixie test` automatically loads the `.env` file before running tests.

The evaluation harness:

1. Resolves the `Runnable` class from the dataset's `runnable` field
2. Calls `Runnable.create()` to construct an instance, then `setup()` once
3. Runs all dataset entries **concurrently** (up to 4 in parallel):
   a. Reads `input_data` and `eval_input` from the entry
   b. Populates the wrap input registry with `eval_input` data
   c. Initialises the capture registry
   d. Validates `input_data` into the Pydantic model and calls `Runnable.run(args)`
   e. `wrap(purpose="input")` calls in the app return registry values instead of calling external services
   f. `wrap(purpose="output"/"state")` calls capture data for evaluation
   g. Builds `Evaluable` from captured data
   h. Runs evaluators
4. Calls `Runnable.teardown()` once

Because entries run concurrently, the Runnable's `run()` method must be concurrency-safe. If you see `sqlite3.OperationalError`, `"database is locked"`, or similar errors, add a `Semaphore(1)` to your Runnable (see the concurrency section in Step 2 reference).

## 5b. Fix mechanical issues only

This step is strictly about fixing what you built in previous steps — the dataset, the runnable, and any custom evaluators. You are fixing mechanical problems that prevent the pipeline from running, NOT assessing or improving the application's output quality.

**What counts as a mechanical issue** (fix these):

| Error                                 | Cause                                                                                                                   | Fix                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `WrapRegistryMissError: name='<key>'` | Dataset entry missing an `eval_input` item with the `name` that the app's `wrap(purpose="input", name="<key>")` expects | Add the missing `{"name": "<key>", "value": ...}` to `eval_input` in every affected entry    |
| `WrapTypeMismatchError`               | Deserialized type doesn't match what the app expects                                                                    | Fix the value in the dataset                                                                 |
| Runnable resolution failure           | `runnable` path or class name is wrong, or the class doesn't implement the `Runnable` protocol                          | Fix `filepath:ClassName` in the dataset; ensure the class has `create()` and `run()` methods |
| Import error                          | Module path or syntax error in runnable/evaluator                                                                       | Fix the referenced file                                                                      |
| `ModuleNotFoundError: pixie_qa`       | `pixie_qa/` directory missing `__init__.py`                                                                             | Run `pixie init` to recreate it                                                              |
| `TypeError: ... is not callable`      | Evaluator name points to a non-callable attribute                                                                       | Evaluators must be functions, classes, or callable instances                                  |
| `sqlite3.OperationalError`            | Concurrent `run()` calls sharing a SQLite connection                                                                    | Add `asyncio.Semaphore(1)` to the Runnable (see Step 2 concurrency section)                  |
| Custom evaluator crashes              | Bug in your custom evaluator implementation                                                                             | Fix the evaluator code                                                                       |

**What is NOT a mechanical issue** (do NOT fix these here):

- Application produces wrong/low-quality output → that's the application's behavior, analyzed in Step 6
- Evaluator scores are low → that's a quality signal, analyzed in Step 6
- LLM calls fail inside the application → report in Step 6, do not mock or work around
- Evaluator scores fluctuate between runs → normal LLM non-determinism, not a bug

Iterate — fix errors, re-run, fix the next error — until `pixie test` runs to completion with real evaluator scores for all entries.

## Output

After `pixie test` completes successfully, results are stored in the per-entry directory structure:

```
{PIXIE_ROOT}/results/<test_id>/
  meta.json                           # test run metadata
  dataset-{idx}/
    metadata.json                     # dataset name, path, runnable
    entry-{idx}/
      config.json                     # evaluators, description, expectation
      eval-input.jsonl                # input data fed to evaluators
      eval-output.jsonl               # output data captured from app
      evaluations.jsonl               # evaluation results (scored + pending)
      trace.jsonl                     # LLM call traces (if captured)
```

The `<test_id>` is printed in console output. You will reference this directory in Step 6.

---

> **If you hit an unexpected error** when running tests (wrong parameter names, import failures, API mismatch), read `wrap-api.md`, `evaluators.md`, or `testing-api.md` for the authoritative API reference before guessing at a fix.
