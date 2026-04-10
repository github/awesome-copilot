# Investigation and Iteration

This reference covers Step 6 of the eval-driven-dev process: investigating test failures, root-causing them, and iterating on fixes.

---

## STOP — check before proceeding

**Before doing any investigation or iteration work, you must decide whether to continue or stop and ask the user.**

**Continue immediately** if the user's original prompt explicitly asked for iteration — look for words like "fix", "improve", "debug", "iterate", "investigate failures", or "make tests pass". In this case, proceed to the investigation steps below.

**Otherwise, STOP here.** Report the test results to the user:

> "QA setup is complete. Tests show N/M passing. [brief summary of failures if any]. Want me to investigate the failures and iterate?"

**Do not proceed with investigation until the user confirms.** This is the default — most prompts like "set up evals", "add tests", "set up QA", or "add evaluations" are asking for setup only, not iteration.

---

## Step-by-step investigation

When the user has confirmed (or their original prompt was explicitly about iteration), proceed:

### 1. Read the analysis

Start by reading the analysis generated in Step 5. The analysis files are at `{PIXIE_ROOT}/results/<test_id>/dataset-<index>.md`. These contain LLM-generated insights about patterns in successes and failures across your test run. Use the analysis to prioritize which failures to investigate first and to understand systemic issues.

### 2. Get detailed test output

```bash
pixie test -v    # shows score and reasoning per case
```

Capture the full verbose output. For each failing case, note:

- The `entry_kwargs` (what was sent)
- The `the captured output` (what the app produced)
- The `expected_output` (what was expected, if applicable)
- The evaluator score and reasoning

### 3. Inspect the trace data

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

### 4. Root-cause analysis

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

### 5. Document findings

**Every failure investigation should be documented** alongside the fix. Include:

````markdown
### <date> — failure investigation

**Dataset**: `qa-golden-set`
**Result**: 3/5 cases passed (60%)

#### Failing case 1: "What rows have extra legroom?"

- **entry_kwargs**: `{"user_message": "What rows have extra legroom?"}`
- **the captured output**: "I'm sorry, I don't have the exact row numbers for extra legroom..."
- **expected_output**: "rows 5-8 Economy Plus with extra legroom"
- **Evaluator score**: 0.1 (Factuality)
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
pixie test -v      # verify
```
````

### 6. Fix and re-run

Make the targeted change, update the dataset if needed, and re-run:

```bash
pixie test -v
```

After fixes stabilize, run analysis again to see if the patterns have changed:

```bash
pixie analyze <new_test_id>
```

---

## The iteration cycle

1. Read analysis from Step 6 → prioritize failures
2. Run tests verbose → identify specific failures
3. Investigate each failure → classify as LLM vs. non-LLM
4. For LLM failures: adjust prompts, model, or eval criteria
5. For non-LLM failures: recommend or apply code fix
6. Update dataset if the fix changed app behavior
7. Re-run tests and analysis
8. Repeat until passing or user is satisfied
