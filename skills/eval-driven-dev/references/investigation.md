# Investigation and Iteration

This reference covers Step 6 of the eval-driven-dev process: investigating test failures, root-causing them, and iterating on fixes.

---

## When to use this

Only proceed with investigation if the user asked for it (iteration intent) or confirmed after seeing setup results. If the user's intent was "set up evals," stop after reporting test results and ask before investigating.

---

## Step-by-step investigation

### 1. Get detailed test output

```bash
pixie test pixie_qa/tests/ -v    # shows score and reasoning per case
```

Capture the full verbose output. For each failing case, note:

- The `eval_input` (what was sent)
- The `eval_output` (what the app produced)
- The `expected_output` (what was expected, if applicable)
- The evaluator score and reasoning

### 2. Inspect the trace data

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

### 3. Root-cause analysis

Walk through the trace and identify exactly where the failure originates. Common patterns:

**LLM-related failures** (fix with prompt/model/eval changes):

| Symptom                                                | Likely cause                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| Output is factually wrong despite correct tool results | Prompt doesn't instruct the LLM to use tool output faithfully |
| Agent routes to wrong tool/handoff                     | Routing prompt or handoff descriptions are ambiguous          |
| Output format is wrong                                 | Missing format instructions in prompt                         |
| LLM hallucinated instead of using tool                 | Prompt doesn't enforce tool usage                             |

**Non-LLM failures** (fix with traditional code changes, out of eval scope):

| Symptom                                           | Likely cause                                            |
| ------------------------------------------------- | ------------------------------------------------------- |
| Tool returned wrong data                          | Bug in tool implementation — fix the tool, not the eval |
| Tool wasn't called at all due to keyword mismatch | Tool-selection logic is broken — fix the code           |
| Database returned stale/wrong records             | Data issue — fix independently                          |
| API call failed with error                        | Infrastructure issue                                    |

For non-LLM failures: note them in the investigation log and recommend the code fix, but **do not adjust eval expectations or thresholds to accommodate bugs in non-LLM code**. The eval test should measure LLM quality assuming the rest of the system works correctly.

### 4. Document findings in MEMORY.md

**Every failure investigation must be documented in `pixie_qa/MEMORY.md`** under the Investigation Log section:

````markdown
### <date> — <test_name> failure

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

```bash
python pixie_qa/scripts/build_dataset.py  # refresh dataset
pixie test pixie_qa/tests/ -k faq -v      # verify
```
````

````

### 5. Fix and re-run

Make the targeted change, rebuild the dataset if needed, and re-run. Always finish by giving the user the exact commands to verify:

```bash
pixie test pixie_qa/tests/test_<feature>.py -v
````

---

## The iteration cycle

1. Run tests → identify failures
2. Investigate each failure → classify as LLM vs. non-LLM
3. For LLM failures: adjust prompts, model, or eval criteria
4. For non-LLM failures: recommend or apply code fix
5. Rebuild dataset if the fix changed app behavior
6. Re-run tests
7. Repeat until passing or user is satisfied
