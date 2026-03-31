# Dataset Generation

This reference covers Step 4 of the eval-driven-dev process: creating the eval dataset.

For full `DatasetStore`, `Evaluable`, and CLI command signatures, see `references/pixie-api.md` (Dataset Python API and CLI Commands sections).

---

## What a dataset contains

A dataset is a collection of `Evaluable` items. Each item has:

- **`eval_input`**: Made-up application input + data from external dependencies. This is what the utility function from Step 3 feeds into the app at test time.
- **`expected_output`**: Case-specific evaluation reference (optional). The meaning depends on the evaluator — it could be an exact answer, a factual reference, or quality criteria text.
- **`eval_output`**: **NOT stored in the dataset.** Produced at test time when the utility function replays the eval_input through the real app.

The dataset is made up by you based on the data shapes observed in the reference trace from Step 2. You are NOT extracting data from traces — you are crafting realistic test scenarios.

---

## Creating the dataset

### CLI

```bash
pixie dataset create <dataset-name>
pixie dataset list   # verify it exists
```

### Python API

```python
from pixie import DatasetStore, Evaluable

store = DatasetStore()
store.create("qa-golden-set", items=[
    Evaluable(
        eval_input={"user_message": "What are your hours?", "customer_profile": {"name": "Alice", "tier": "gold"}},
        expected_output="Response should mention Monday-Friday 9am-5pm and Saturday 10am-2pm",
    ),
    Evaluable(
        eval_input={"user_message": "I need to cancel my order", "customer_profile": {"name": "Bob", "tier": "basic"}},
        expected_output="Should confirm which order and explain the cancellation policy",
    ),
])
```

Or build incrementally:

```python
store = DatasetStore()
store.create("qa-golden-set")
for item in items:
    store.append("qa-golden-set", item)
```

---

## Crafting eval_input items

Each eval_input must match the **exact data shape** from the reference trace. Look at what the `@observe`-decorated function received as input in Step 2 — same field names, same types, same nesting.

### What goes into eval_input

| Data category            | Example                                           | Source                                              |
| ------------------------ | ------------------------------------------------- | --------------------------------------------------- |
| Application input        | User message, query, request body                 | What a real user would send                         |
| External dependency data | Customer profile, retrieved documents, DB records | Made up to match the shape from the reference trace |
| Conversation history     | Previous messages in a chat                       | Made up to set up the scenario                      |
| Configuration / context  | Feature flags, session state                      | Whatever the function expects as arguments          |

### Matching the reference trace shape

From the reference trace (`pixie trace last`), note:

1. **Field names** — use the exact same keys (e.g., `user_message` not `message`, `customer_profile` not `profile`)
2. **Types** — if the trace shows a list, use a list; if it shows a nested dict, use a nested dict
3. **Realistic values** — the data should look like something the app would actually receive. Don't use placeholder text like "test input" or "lorem ipsum"

**Example**: If the reference trace shows the function received:

```json
{
  "user_message": "I'd like to reschedule my appointment",
  "customer_profile": {
    "name": "Jane Smith",
    "account_id": "A12345",
    "tier": "premium"
  },
  "conversation_history": [
    { "role": "assistant", "content": "Welcome! How can I help you today?" }
  ]
}
```

Then every eval_input you make up must have `user_message` (string), `customer_profile` (dict with `name`, `account_id`, `tier`), and `conversation_history` (list of message dicts).

---

## Setting expected_output

`expected_output` is a **reference for evaluation** — its meaning depends on which evaluator will consume it.

### When to set it

| Scenario                                    | expected_output value                                                                  | Evaluator it pairs with                                    |
| ------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Deterministic answer exists                 | The exact answer: `"Paris"`                                                            | `ExactMatchEval`, `FactualityEval`, `ClosedQAEval`         |
| Open-ended but has quality criteria         | Description of good output: `"Should mention Saturday hours and be under 2 sentences"` | `create_llm_evaluator` with `{expected_output}` in prompt  |
| Truly open-ended, no case-specific criteria | Leave as `"UNSET"` or omit                                                             | Standalone evaluators (`PossibleEval`, `FaithfulnessEval`) |

### Universal vs. case-specific criteria

- **Universal criteria** apply to ALL test cases → implement in the test function's evaluators (e.g., "responses must be concise", "must not hallucinate"). These don't need expected_output.
- **Case-specific criteria** vary per test case → carry as `expected_output` in the dataset item (e.g., "should mention the caller's Tuesday appointment", "should route to billing").

### Anti-patterns

- **Don't generate both eval_output and expected_output from the same source.** If they're identical and you use `ExactMatchEval`, the test is circular and catches zero regressions.
- **Don't use comparison evaluators (`FactualityEval`, `ClosedQAEval`, `ExactMatchEval`) on items without expected_output.** They produce meaningless scores.
- **Don't mix expected_output semantics in one dataset.** If some items use expected_output as a factual answer and others as style guidance, evaluators can't handle both. Split into separate datasets or use separate test functions.

---

## Validating the dataset

After creating the dataset, check:

### 1. Structural validation

Every eval_input must match the reference trace's schema:

- Same fields present
- Same types (string, int, list, dict)
- Same nesting depth
- No extra or missing fields compared to what the function expects

### 2. Semantic validation

- **Realistic values** — names, messages, and data look like real-world inputs, not test placeholders
- **Coherent scenarios** — if there's conversation history, it should make topical sense with the user message
- **External dependency data makes sense** — customer profiles have realistic account IDs, retrieved documents are plausible

### 3. Diversity validation

- Items have **meaningfully different** inputs — different user intents, different customer types, different edge cases
- Not just minor variations of the same scenario (e.g., don't have 5 items that are all "What are your hours?" with different names)
- Cover: normal cases, edge cases, things the app might plausibly get wrong

### 4. Expected_output validation

- case-specific `expected_output` values are specific and testable, not vague
- Items where expected_output is universal don't redundantly carry expected_output

### 5. Verify by listing

```bash
pixie dataset list
```

Or in the build script:

```python
ds = store.get("qa-golden-set")
print(f"Dataset has {len(ds.items)} items")
for i, item in enumerate(ds.items):
    print(f"  [{i}] input keys: {list(item.eval_input.keys()) if isinstance(item.eval_input, dict) else type(item.eval_input)}")
    print(f"       expected_output: {item.expected_output[:80] if item.expected_output != 'UNSET' else 'UNSET'}...")
```

---

## Recommended build_dataset.py structure

Put the build script at `pixie_qa/scripts/build_dataset.py`:

```python
"""Build the eval dataset with made-up scenarios.

Each eval_input matches the data shape from the reference trace (Step 2).
Run this script to create/recreate the dataset.
"""
from pixie import DatasetStore, Evaluable

DATASET_NAME = "qa-golden-set"

def build() -> None:
    store = DatasetStore()

    # Recreate fresh
    try:
        store.delete(DATASET_NAME)
    except FileNotFoundError:
        pass
    store.create(DATASET_NAME)

    items = [
        # Normal case — straightforward question
        Evaluable(
            eval_input={
                "user_message": "What are your business hours?",
                "customer_profile": {"name": "Alice Johnson", "account_id": "C100", "tier": "gold"},
            },
            expected_output="Should mention Mon-Fri 9am-5pm and Sat 10am-2pm",
        ),
        # Edge case — ambiguous request
        Evaluable(
            eval_input={
                "user_message": "I want to change something",
                "customer_profile": {"name": "Bob Smith", "account_id": "C200", "tier": "basic"},
            },
            expected_output="Should ask for clarification about what to change",
        ),
        # ... more items covering different scenarios
    ]

    for item in items:
        store.append(DATASET_NAME, item)

    # Verify
    ds = store.get(DATASET_NAME)
    print(f"Dataset '{DATASET_NAME}' has {len(ds.items)} items")
    for i, entry in enumerate(ds.items):
        keys = list(entry.eval_input.keys()) if isinstance(entry.eval_input, dict) else type(entry.eval_input)
        print(f"  [{i}] input keys: {keys}")

if __name__ == "__main__":
    build()
```

---

## The cardinal rule

**`eval_output` is always produced at test time, never stored in the dataset.** The dataset contains `eval_input` (made-up input matching the reference trace shape) and optionally `expected_output` (the reference to judge against). The test's `runnable` function produces `eval_output` by replaying `eval_input` through the real app.
