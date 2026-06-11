# Step 2c: Capture and verify a reference trace

**Goal**: Run the app through the Runnable, capture a trace, and verify that instrumentation and the Runnable are working correctly. The trace proves everything is wired up and provides the exact data shapes needed for dataset creation in Step 4.

---

## Choose the trace input

The trace input determines what code paths are captured. A trivial input produces a trivial trace that misses the app's real behavior.

The input must reflect the "Realistic input characteristics" section, according to `pixie_qa/00-project-analysis.md` you've read in step 2b.

The input has two parts — understand the boundary between them:

- **User-provided parameters** (you author): What a real user types or configures — prompts, queries, configuration flags, URLs, schema definitions. Write these to be representative of real usage.
- **World data** (captured from production code, not fabricated): Content the app fetches from external sources during execution — database records, API responses, files, etc. Run the production code once to capture this data into the trace. Only resort to synthetic data generation when:
  - The user explicitly instructs you to use synthetic data, OR
  - Fetching from real sources is impractical (too many fetches, incurs real monetary cost, or takes unreasonably long — more than ~30 minutes)

**Quick check before writing input**: "Would a real user create this data, or would the app get it from somewhere else?" If the app gets it, let the production code run and capture it.

| App type             | User provides (you author)            | World provides (you source)                                        |
| -------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| Web scraper          | URL + prompt + schema definition      | The HTML page content                                              |
| Research agent       | Research question + scope constraints | Source documents, search results                                   |
| Customer support bot | Customer's spoken message             | Customer profile from CRM, conversation history from session store |
| Code review tool     | PR URL + review criteria              | The actual diff, file contents, CI results                         |

### Capture multiple traces

Capture **at least 2 traces** with different input characteristics before building the dataset:

- Different complexity (simple case vs. complex case)
- Different capabilities (see `00-project-analysis.md` capability inventory)
- Different edge conditions (missing optional data, unusually large input)

This calibration prevents dataset homogeneity — you see what the app actually does with varied inputs.

---

## Run `pixie trace`

**First**, verify the app can be imported: `python -c "from <module> import <class>"`. Catch missing packages before entering a trace-install-retry loop.

```bash
# Create a JSON file with input data
echo '{"user_message": "a realistic sample input"}' > pixie_qa/sample-input.json

uv run pixie trace --runnable pixie_qa/run_app.py:AppRunnable \
  --input pixie_qa/sample-input.json \
  --output pixie_qa/reference-trace.jsonl
```

The `--input` flag takes a **file path** to a JSON file (not inline JSON). The JSON keys become kwargs for the Pydantic model.

For additional traces:

```bash
uv run pixie trace --runnable pixie_qa/run_app.py:AppRunnable \
  --input pixie_qa/sample-input-complex.json \
  --output pixie_qa/trace-complex.jsonl
```

---

## Verify the trace

### Quick inspection

The trace JSONL contains one line per `wrap()` event and one line per LLM span:

```jsonl
{"type": "kwargs", "value": {"user_message": "What are your hours?"}}
{"type": "wrap", "name": "customer_profile", "purpose": "input", "data": {...}, ...}
{"type": "llm_span", "request_model": "gpt-4o", "input_messages": [...], ...}
{"type": "wrap", "name": "response", "purpose": "output", "data": "Our hours are...", ...}
```

Check that:

- Expected `wrap` entries appear (one per `wrap()` call in the code)
- At least one `llm_span` entry appears (confirms real LLM calls were made)
- Missing entries indicate the execution path was different than expected — fix before continuing

### Format and verify coverage

Run `pixie format` to see the data in dataset-entry format:

```bash
pixie format --input trace.jsonl --output dataset_entry.json
```

The output shows:

- `input_data`: the exact keys/values for runnable arguments
- `eval_input`: data from `wrap(purpose="input")` calls
- `eval_output`: the actual app output (from `wrap(purpose="output")`)

For each eval criterion from `pixie_qa/02-eval-criteria.md`, verify the format output contains the data needed. If a data point is missing, go back to Step 2a and add the `wrap()` call.

### Trace audit

Before proceeding to Step 3, audit every trace:

1. **World data check**: For each `wrap(purpose="input")` field, is the data realistically complex? Compare against `00-project-analysis.md` "Realistic input characteristics." If the analysis says inputs are 5KB–500KB and yours is under 5KB, it's not representative.

2. **LLM span check**: Do `llm_span` entries appear? If not, the app's LLM calls didn't fire — the Runnable may be misconfigured or the LLM may be mocked/faked. Fix this before continuing.

3. **Complexity check**: Does the trace exercise the hard problems from `00-project-analysis.md`? If it only exercises the happy path, capture an additional trace with harder inputs.

If any check fails, go back and fix the input or Runnable, then re-capture.

---

## Output

- `pixie_qa/reference-trace.jsonl` — reference trace with all expected wrap events and LLM spans
- Additional trace files for varied inputs
