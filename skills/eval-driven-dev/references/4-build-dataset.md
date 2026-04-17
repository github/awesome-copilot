# Step 4: Build the Dataset

**Why this step**: The dataset ties everything together — the runnable (Step 2), the evaluators (Step 3), and the use cases (Step 1c) — into concrete test scenarios. At test time, `pixie test` calls the runnable with `input_data`, the wrap registry is populated with `eval_input`, and evaluators score the resulting captured outputs.

**Before building entries**, review:

- **`pixie_qa/00-project-analysis.md`** — the capability inventory and failure modes. Dataset entries should cover entries from the capability inventory and include entries targeting the listed failure modes.
- **`pixie_qa/02-eval-criteria.md`** — use cases and their capability coverage. Ensure every listed use case has representative entries.

---

## Understanding `input_data`, `eval_input`, and `expectation`

Before building the dataset, understand what these terms mean:

- **`input_data`** = the kwargs passed to `Runnable.run()` as a Pydantic model. These are the input data (user message, request body, CLI args). The keys must match the fields of the Pydantic model defined for `run(args: T)`.

- **`eval_input`** = a list of `{"name": ..., "value": ...}` objects corresponding to `wrap(purpose="input")` calls in the app. At test time, these are injected automatically by the wrap registry; `wrap(purpose="input")` calls in the app return the registry value instead of calling the real external dependency.

  `eval_input` **may be an empty list** only when the app has no `wrap(purpose="input")` calls. **If the app HAS input wraps, every dataset entry MUST provide corresponding `eval_input` values with pre-captured content** — otherwise the app makes live external calls during eval, which is slow, flaky, and non-reproducible. See section 4b′ for how to capture this content.

  Each item is a `NamedData` object with `name` (str) and `value` (any JSON-serializable value).

- **`expectation`** (optional) = case-specific evaluation reference. What a correct output should look like for this scenario. Used by evaluators that compare output against a reference (e.g., `Factuality`, `ClosedQA`). Not needed for output-quality evaluators that don't require a reference.

- **eval output** = what the app actually produces, captured at runtime by `wrap(purpose="output")` and `wrap(purpose="state")` calls. **Not stored in the dataset** — it's produced when `pixie test` runs the app.

The **reference trace** at `pixie_qa/reference-trace.jsonl` is your primary source for data shapes:

- Filter it to see the exact serialized format for `eval_input` values
- Read the `kwargs` record to understand the `input_data` structure
- Read `purpose="output"/"state"` events to understand what outputs the app produces, so you can write meaningful `expectation` values

---

## 4a. Derive evaluator assignments

The eval criteria artifact (`pixie_qa/02-eval-criteria.md`) maps each criterion to use cases. The evaluator mapping artifact (`pixie_qa/03-evaluator-mapping.md`) maps each criterion to a concrete evaluator name. Combine these:

1. **Dataset-level default evaluators**: Criteria marked as applying to "All" use cases → their evaluator names go in the top-level `"evaluators"` array.
2. **Item-level evaluators**: Criteria that apply to only a subset → their evaluator names go in `"evaluators"` on the relevant rows only, using `"..."` to also include the defaults.

## 4b. Inspect data shapes with `pixie format`

Use `pixie format` on the reference trace to see the exact data shapes **and** the real app output in dataset-entry format:

```bash
uv run pixie format --input reference-trace.jsonl --output dataset-sample.json
```

The output looks like:

```json
{
  "input_data": {
    "user_message": "What are your business hours?"
  },
  "eval_input": [
    {
      "name": "customer_profile",
      "value": { "name": "Alice", "tier": "gold" }
    },
    {
      "name": "conversation_history",
      "value": [{ "role": "user", "content": "What are your hours?" }]
    }
  ],
  "expectation": null,
  "eval_output": {
    "response": "Our business hours are Monday to Friday, 9am to 5pm..."
  }
}
```

**Important**: The `eval_output` in this template is the **full real output** produced by the running app. Do NOT copy `eval_output` into your dataset entries — it would make tests trivially pass by giving evaluators the real answer. Instead:

- Use `input_data` and `eval_input` as exact templates for data keys and format
- Look at `eval_output` to understand what the app produces — then write a **concise `expectation` description** that captures the key quality criteria for each scenario

**Example**: if `eval_output.response` is `"Our business hours are Monday to Friday, 9 AM to 5 PM, and Saturday 10 AM to 2 PM."`, write `expectation` as `"Should mention weekday hours (Mon–Fri 9am–5pm) and Saturday hours"` — a short description a human or LLM evaluator can compare against.

## 4b′. Capture external content for `eval_input` (mandatory)

**CRITICAL**: If the app has ANY `wrap(purpose="input")` calls, every dataset entry MUST provide corresponding `eval_input` values with **pre-captured real content**. An empty `eval_input` list means the app will make live external calls (HTTP requests, database queries, API calls) during every eval run — this makes evals slow, flaky, and non-reproducible.

### Why this matters

During `pixie test`, each `wrap(purpose="input", name="X")` call in the app checks the wrap registry for a value named `"X"`:

- **If found**: the registered value is returned directly (no external call)
- **If not found**: the real external call executes (non-deterministic, slow, may fail)

An `eval_input: []` entry means NOTHING is in the registry, so every external dependency runs live. This defeats the purpose of instrumentation.

### How to capture content

For each `wrap(purpose="input", name="X")` in the app, you must capture the real data once and embed it in the dataset. Choose one of these approaches:

**Option A — Use the reference trace** (preferred):

The reference trace from Step 2c already contains captured values for every `purpose="input"` wrap. Extract them:

```bash
# View the reference trace to find input wrap values
grep '"purpose": "input"' pixie_qa/reference-trace.jsonl
```

Or use `pixie format` to see the data in dataset-entry format — the `eval_input` array in the output already has the captured values with correct names and shapes.

**Option B — Fetch content directly** (for new entries with different inputs):

When creating dataset entries with different input sources (e.g., different URLs, different queries), capture the content by running the dependency code once:

```python
# Example: for a web scraper, run the app's own fetch logic once
from myapp.fetcher import fetch_page
page_content = fetch_page(target_url)  # use the app's real code path
```

Then include the captured content in the entry's `eval_input`:

```json
{
  "eval_input": [
    {
      "name": "fetch_result",
      "value": "<captured page content here>"
    }
  ]
}
```

**Option C — Run `pixie trace` with each input** (most thorough):

For each set of `input_data`, run `pixie trace` to execute the app with real dependencies and capture all values:

```bash
pixie trace --runnable pixie_qa/run_app.py:AppRunnable --input  trace-input.json
```

Then extract the `purpose="input"` values from the resulting trace and use them as `eval_input`.

### Content format

The `eval_input` value must match the **exact type and format** that the `wrap()` call returns. Check the reference trace to see what format the app produces:

- If the wrap captures a string (e.g., HTML content, markdown text), the value is a string
- If the wrap captures a dict (e.g., database record), the value is a JSON object
- If the wrap captures a list, the value is a JSON array

**Do NOT skip this step.** Every `wrap(purpose="input")` in the app must have a corresponding `eval_input` entry in every dataset row. If you proceed with empty `eval_input` when the app has input wraps, evals will be unreliable.

## 4c. Generate dataset items

Create diverse entries guided by the reference trace and use cases:

- **`input_data` keys** must match the fields of the Pydantic model used in `Runnable.run(args: T)`
- **`eval_input`** must be a list of `{"name": ..., "value": ...}` objects matching the `name` values of `wrap(purpose="input")` calls in the app
- **Cover each use case** from `pixie_qa/02-eval-criteria.md` — at least one entry per use case, with meaningfully diverse inputs across entries

**If the user specified a dataset or data source in the prompt** (e.g., a JSON file with research questions or conversation scenarios), read that file, adapt each entry to the `input_data` / `eval_input` shape, and incorporate them into the dataset. Do NOT ignore specified data.

### Entry quality checklist

Before finalizing the dataset, verify each entry against these criteria:

**Input realism**:

- Does `eval_input` contain world data that respects the synthesization boundary (see Step 2c)? User-authored parameters are fine; world data should be sourced, not fabricated from scratch.
- Does the world data in `eval_input` match the scale and complexity described in `00-project-analysis.md` "Realistic input characteristics"? If the analysis says inputs are typically 5KB–500KB, a 200-char input is not realistic.
- Is the answer to the prompt non-trivial to extract from the input? A test where the answer is in a clearly labeled HTML tag or the first sentence doesn't test extraction quality.

**Scenario diversity**:

- Do entries cover meaningfully different difficulty levels — not just different topics with the same difficulty?
- Does at least one entry target a failure mode from `00-project-analysis.md` that you expect might actually cause degraded scores (not a guaranteed pass)?
- Do entries use different structural patterns in the input data (not just different content poured into the same template)?

**Difficulty calibration**:

- Is there at least one entry you are genuinely uncertain whether the app will handle correctly? If you're confident every entry will pass trivially, the dataset is too easy.
- Consider including one intentionally challenging entry that probes a known limitation — a "stress test" entry. If it passes, great. If it fails, the eval has demonstrated it can catch real issues.

### Anti-patterns for dataset entries

- **Fabricating world data**: Hand-authoring content the app would normally fetch from external sources (e.g., writing HTML for a web scraper, writing "retrieved documents" for a RAG system). This removes real-world complexity.
- **Uniform difficulty**: All entries have the same complexity level. Real workloads have a distribution — some easy, some hard, some edge cases.
- **Obvious answers**: Every entry has the target information cleanly labeled and unambiguous. Real data often has the answer scattered, partially present, duplicated with variations, or embedded in noise.
- **Round-trip authorship**: You wrote both the input and the expected output, so you know exactly what's there. A real evaluator tests whether the app can find information it hasn't seen before.
- **Only happy paths**: No entry tests error conditions, edge cases, or known failure modes.
- **Building all entries from the same toy trace with minor rephrasing**: If all entries have similar `input_data` and similar `eval_input` data, the dataset tests nothing meaningful. Each entry should represent a meaningfully different scenario.
- **Reusing the project's own test fixtures as eval data**: The project's `tests/`, `fixtures/`, `examples/`, and `mock_server/` directories contain data designed for unit/integration tests — small, clean, deterministic, and trivially easy. Using them as `eval_input` data guarantees 100% pass rates and zero quality signal. Even if these fixtures look convenient, they bypass every real-world difficulty that makes the app's job hard. **Run the production code to capture realistic data instead**, or generate synthetic data that matches the scale/complexity from `00-project-analysis.md`.
- **Using a project's mock/fake implementations**: If the project includes mock LLMs, fake HTTP servers, or stub services in its test infrastructure, do NOT use them in your eval pipeline. Your eval must exercise the app's real code paths with realistically complex data — not the project's own test shortcuts.

## 4c′. Verify coverage against project analysis

Before writing the final dataset JSON, open `pixie_qa/00-project-analysis.md` and check:

1. **Realistic input characteristics**: For each characteristic listed (size, complexity, noise, variety), confirm at least one dataset entry reflects it. If the analysis says "messy inputs with navigation and ads," at least one entry's `eval_input` should contain messy data with navigation and ads.
2. **Failure modes**: For each failure mode listed, confirm at least one dataset entry is designed to exercise it. The entry doesn't need to guarantee failure — but it should create conditions where that failure mode _could_ manifest. If a failure mode cannot be exercised with the current instrumentation setup, add a note in `02-eval-criteria.md` explaining why.
3. **Capability coverage**: Confirm the dataset covers the capabilities listed in the eval criteria (Step 1c). Each covered capability should have at least one entry.

If any gap is found, add entries to close it before proceeding to 4d.

## 4c″. STOP CHECK — Dataset realism audit (hard gate)

**This is a hard gate.** Do NOT proceed to 4d until every check passes. If any check fails, revise the dataset and re-audit.

Before writing the final dataset JSON, perform this self-audit:

1. **Cross-reference `00-project-analysis.md`**: Open the "Realistic input characteristics" section. For each characteristic (size, complexity, noise, structure), verify at least one dataset entry's `eval_input` reflects it. If the analysis says "5KB–500KB HTML pages with navigation chrome and ads" and your largest `eval_input` is 1KB of clean HTML, **the dataset is not realistic — add harder entries.**

2. **Count distinct sources**: How many unique `eval_input` data sources are in the dataset? If more than 50% of entries share the same `eval_input` content (even with different prompts), the dataset lacks diversity. Prompt variations on the same input test the LLM's interpretation, not the app's data processing.

3. **Difficulty distribution (mandatory threshold)**: For each entry, label it as "routine" (confident it will pass), "moderate" (likely passes but non-trivial), or "challenging" (genuinely uncertain or targeting a known failure mode).

   - **Maximum 60% "routine" entries.** If you have 5 entries, at most 3 can be routine.
   - **At least one "challenging" entry** that targets a failure mode from `00-project-analysis.md` where you are genuinely uncertain about the outcome. If every entry is a guaranteed pass, the dataset cannot distinguish a good app from a broken one.

4. **Capability coverage (mandatory threshold)**: Count how many capabilities from `00-project-analysis.md` are exercised by at least one dataset entry.

   - **Must cover ≥50% of listed capabilities.** If the analysis lists 6 capabilities, the dataset must exercise at least 3.
   - If coverage is below threshold, add entries targeting the uncovered capabilities.

5. **Project fixture contamination check**: Scan every `eval_input` value. Did any data originate from the project's `tests/`, `fixtures/`, `examples/`, or mock server directories? If yes, **replace it with real-world data.** These fixtures are designed for development convenience, not evaluation realism.

6. **Tautology check**: Will the test pipeline produce meaningful scores, or is it a closed loop? If you authored both the input data and the evaluator logic such that passing is guaranteed by construction (e.g., regex extractor + exact-match evaluator on hand-authored HTML), **the pipeline is tautological** and cannot catch real issues. The app's real LLM should produce the output, and evaluators should assess quality dimensions that can genuinely fail.

7. **`eval_input` completeness check**: For every `wrap(purpose="input", name="X")` call in the instrumented app code, verify that EVERY dataset entry provides a corresponding `eval_input` item with `"name": "X"` and a non-empty `"value"`. If any entry has `eval_input: []` while the app has input wraps, **the dataset is incomplete — captured content is missing.** Go back to step 4b′ and capture the content.

## 4d. Build the dataset JSON file

Create the dataset at `pixie_qa/datasets/<name>.json`:

```json
{
  "name": "qa-golden-set",
  "runnable": "pixie_qa/run_app.py:AppRunnable",
  "evaluators": ["Factuality", "pixie_qa/evaluators.py:ConciseVoiceStyle"],
  "entries": [
    {
      "input_data": {
        "user_message": "What are your business hours?"
      },
      "description": "Customer asks about business hours with gold tier account",
      "eval_input": [
        {
          "name": "customer_profile",
          "value": { "name": "Alice Johnson", "tier": "gold" }
        }
      ],
      "expectation": "Should mention Mon-Fri 9am-5pm and Sat 10am-2pm"
    },
    {
      "input_data": {
        "user_message": "I want to change something"
      },
      "description": "Ambiguous change request from basic tier customer",
      "eval_input": [
        {
          "name": "customer_profile",
          "value": { "name": "Bob Smith", "tier": "basic" }
        }
      ],
      "expectation": "Should ask for clarification",
      "evaluators": ["...", "ClosedQA"]
    },
    {
      "input_data": {
        "user_message": "I want to end this call"
      },
      "description": "User requests call end after failed verification",
      "eval_input": [
        {
          "name": "customer_profile",
          "value": { "name": "Charlie Brown", "tier": "basic" }
        }
      ],
      "expectation": "Agent should call endCall tool and end the conversation",
      "eval_metadata": {
        "expected_tool": "endCall",
        "expected_call_ended": true
      },
      "evaluators": ["...", "pixie_qa/evaluators.py:tool_call_check"]
    }
  ]
}
```

### Key fields

**Entry structure** — all fields are top-level on each entry (flat structure — no nesting):

```
entry:
  ├── input_data    (required) — args for Runnable.run()
  ├── eval_input      (optional) — list of {"name": ..., "value": ...} objects (default: [])
  ├── description     (required) — human-readable label for the test case
  ├── expectation     (optional) — reference for comparison-based evaluators
  ├── eval_metadata   (optional) — extra per-entry data for custom evaluators
  └── evaluators      (optional) — evaluator names for THIS entry
```

**Top-level fields:**

- **`runnable`** (required): `filepath:ClassName` reference to the `Runnable` class from Step 2 (e.g., `"pixie_qa/run_app.py:AppRunnable"`). Path is relative to the project root.
- **`evaluators`** (dataset-level, optional): Default evaluator names applied to every entry — the evaluators for criteria that apply to ALL use cases.

**Per-entry fields (all top-level on each entry):**

- **`input_data`** (required): Keys match the Pydantic model fields for `Runnable.run(args: T)`. These are the app's input data.
- **`eval_input`** (optional, default `[]`): List of `{"name": ..., "value": ...}` objects. Names match `wrap(purpose="input")` names in the app. The runner automatically prepends `input_data` when building the `Evaluable`.
- **`description`** (required): Use case one-liner from `pixie_qa/02-eval-criteria.md`.
- **`expectation`** (optional): Case-specific expectation text for evaluators that need a reference.
- **`eval_metadata`** (optional): Extra per-entry data for custom evaluators — e.g., expected tool names, boolean flags, thresholds. Accessible in evaluators as `evaluable.eval_metadata`.
- **`evaluators`** (optional): Row-level evaluator override.

### Evaluator assignment rules

1. Evaluators that apply to ALL items go in the top-level `"evaluators"` array.
2. Items that need **additional** evaluators use `"evaluators": ["...", "ExtraEval"]` — `"..."` expands to defaults.
3. Items that need a **completely different** set use `"evaluators": ["OnlyThis"]` without `"..."`.
4. Items using only defaults: omit the `"evaluators"` field.

---

## Dataset Creation Reference

### Using `eval_input` values

The `eval_input` values are `{"name": ..., "value": ...}` objects. Use the reference trace as templates — copy the `"data"` field from the relevant `purpose="input"` event and adapt the values:

**Simple dict**:

```json
{ "name": "customer_profile", "value": { "name": "Alice", "tier": "gold" } }
```

**List of dicts** (e.g., conversation history):

```json
{
  "name": "conversation_history",
  "value": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" }
  ]
}
```

**Important**: The exact format depends on what the `wrap(purpose="input")` call captures. Always copy from the reference trace rather than constructing from scratch.

### Crafting diverse eval scenarios

Cover different aspects of each use case. Refer to **`pixie_qa/00-project-analysis.md`** for the capability inventory and failure modes:

- **Cover each capability** — at least one entry per capability from the capability inventory, not just the primary capability
- **Target failure modes** — include entries that exercise the hard problems / failure modes listed in the project analysis (e.g., malformed input, edge cases, complex scenarios)
- Different user phrasings of the same request
- Edge cases (ambiguous input, missing information, error conditions)
- Entries that stress-test specific eval criteria
- At least one entry per use case from Step 1c

---

## Output

`pixie_qa/datasets/<name>.json` — the dataset file.
