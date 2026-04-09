# Step 4: Build the Dataset

**Why this step**: The dataset ties everything together — the runnable (Step 2), the evaluators (Step 3), and the use cases (Step 1b) — into concrete test scenarios. At test time, `pixie test` calls the runnable with `entry_kwargs`, the wrap registry is populated with `eval_input`, and evaluators score the resulting captured outputs.

---

## Understanding `entry_kwargs`, `eval_input`, and `expectation`

Before building the dataset, understand what these terms mean:

- **`entry_kwargs`** = the kwargs passed to `Runnable.run()` as a Pydantic model. These are the entry-point inputs (user message, request body, CLI args). The keys must match the fields of the Pydantic model defined for `run(args: T)`.

- **`eval_input`** = a list of `{"name": ..., "value": ...}` objects corresponding to `wrap(purpose="input")` calls in the app. At test time, these are injected automatically by the wrap registry; `wrap(purpose="input")` calls in the app return the registry value instead of calling the real external dependency.

  **CRITICAL**: `eval_input` must have **at least one item** (enforced by `min_length=1` validation). If the app has no `wrap(purpose="input")` calls, you must still include at least one `eval_input` item — use the primary entry-point argument as a synthetic input:

  ```json
  "eval_input": [
    { "name": "user_input", "value": "What are your business hours?" }
  ]
  ```

  Each item is a `NamedData` object with `name` (str) and `value` (any JSON-serializable value).

- **`expectation`** (optional) = case-specific evaluation reference. What a correct output should look like for this scenario. Used by evaluators that compare output against a reference (e.g., `Factuality`, `ClosedQA`). Not needed for output-quality evaluators that don't require a reference.

- **eval output** = what the app actually produces, captured at runtime by `wrap(purpose="output")` and `wrap(purpose="state")` calls. **Not stored in the dataset** — it's produced when `pixie test` runs the app.

The **reference trace** at `pixie_qa/reference-trace.jsonl` is your primary source for data shapes:

- Filter it to see the exact serialized format for `eval_input` values
- Read the `kwargs` record to understand the `entry_kwargs` structure
- Read `purpose="output"/"state"` events to understand what outputs the app produces, so you can write meaningful `expectation` values

---

## 4a. Derive evaluator assignments

The eval criteria artifact (`pixie_qa/02-eval-criteria.md`) maps each criterion to use cases. The evaluator mapping artifact (`pixie_qa/03-evaluator-mapping.md`) maps each criterion to a concrete evaluator name. Combine these:

1. **Dataset-level default evaluators**: Criteria marked as applying to "All" use cases → their evaluator names go in the top-level `"evaluators"` array.
2. **Item-level evaluators**: Criteria that apply to only a subset → their evaluator names go in `"evaluators"` on the relevant rows only, using `"..."` to also include the defaults.

## 4b. Inspect data shapes with `pixie format`

Use `pixie format` on the reference trace to see the exact data shapes **and** the real app output in dataset-entry format:

```bash
pixie format --input reference-trace.jsonl --output dataset-sample.json
```

The output looks like:

```json
{
  "entry_kwargs": {
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

- Use `entry_kwargs` and `eval_input` as exact templates for data keys and format
- Look at `eval_output` to understand what the app produces — then write a **concise `expectation` description** that captures the key quality criteria for each scenario

**Example**: if `eval_output.response` is `"Our business hours are Monday to Friday, 9 AM to 5 PM, and Saturday 10 AM to 2 PM."`, write `expectation` as `"Should mention weekday hours (Mon–Fri 9am–5pm) and Saturday hours"` — a short description a human or LLM evaluator can compare against.

## 4c. Generate dataset items

Create diverse entries guided by the reference trace and use cases:

- **`entry_kwargs` keys** must match the fields of the Pydantic model used in `Runnable.run(args: T)`
- **`eval_input`** must be a list of `{"name": ..., "value": ...}` objects matching the `name` values of `wrap(purpose="input")` calls in the app
- **Cover each use case** from `pixie_qa/02-eval-criteria.md` — at least one entry per use case, with meaningfully diverse inputs across entries

**If the user specified a dataset or data source in the prompt** (e.g., a JSON file with research questions or conversation scenarios), read that file, adapt each entry to the `entry_kwargs` / `eval_input` shape, and incorporate them into the dataset. Do NOT ignore specified data.

## 4d. Build the dataset JSON file

Create the dataset at `pixie_qa/datasets/<name>.json`:

```json
{
  "name": "qa-golden-set",
  "runnable": "pixie_qa/scripts/run_app.py:AppRunnable",
  "evaluators": ["Factuality", "pixie_qa/evaluators.py:concise_voice_style"],
  "entries": [
    {
      "entry_kwargs": {
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
      "entry_kwargs": {
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
      "entry_kwargs": {
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
  ├── entry_kwargs    (required) — args for Runnable.run()
  ├── eval_input      (required) — list of {"name": ..., "value": ...} objects
  ├── description     (required) — human-readable label for the test case
  ├── expectation     (optional) — reference for comparison-based evaluators
  ├── eval_metadata   (optional) — extra per-entry data for custom evaluators
  └── evaluators      (optional) — evaluator names for THIS entry
```

**Top-level fields:**

- **`runnable`** (required): `filepath:ClassName` reference to the `Runnable` class from Step 2 (e.g., `"pixie_qa/scripts/run_app.py:AppRunnable"`). Path is relative to the project root.
- **`evaluators`** (dataset-level, optional): Default evaluator names applied to every entry — the evaluators for criteria that apply to ALL use cases.

**Per-entry fields (all top-level on each entry):**

- **`entry_kwargs`** (required): Keys match the Pydantic model fields for `Runnable.run(args: T)`. These are the app's entry-point inputs.
- **`eval_input`** (required): List of `{"name": ..., "value": ...}` objects. Names match `wrap(purpose="input")` names in the app.
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

Cover different aspects of each use case:

- Different user phrasings of the same request
- Edge cases (ambiguous input, missing information, error conditions)
- Entries that stress-test specific eval criteria
- At least one entry per use case from Step 1b

---

## Output

`pixie_qa/datasets/<name>.json` — the dataset file.
