---
name: fabric-data-agent-test
description: "CSV-based accuracy testing for Fabric Data Agents — run test prompts, compare agent answers against expected values, report pass/fail with tolerance"
---

# Test Fabric Data Agent Accuracy

Run automated accuracy tests against a Fabric Data Agent using a CSV file with prompts and expected answers.

## Prerequisites

- A published Fabric Data Agent
- A CSV file with columns: `Number`, `Prompt`, `ExpectedAnswer`

## CSV Format

```csv
Number,Prompt,ExpectedAnswer
1,Total time savings in March 2026,7500
2,Total unique users in March 2026,3081
3,Total refinements in March 2026,577
```

## Steps

1. **Ask the user** for the workspace, agent, and CSV file path
2. **Verify the agent** is published and has tables selected (call get_agent_config)
3. **Run the accuracy test** — for each row in the CSV:
   - Query the agent with the prompt
   - Extract numeric values from the response
   - Compare against expected answer with tolerance (default 5%)
   - Record pass/fail and percentage difference
4. **Report results** — show overall accuracy and per-question details
5. If failures exist, **offer to diagnose** — reproduce the failing query, show the SQL, identify the root cause

## Interpreting Results

- **PASS**: Extracted number is within tolerance of expected value
- **FAIL**: Number is outside tolerance, or no number could be extracted
- **Diff%**: Percentage difference between expected and actual values

## Follow-Up Actions

- For failing queries: use the tune-agent skill to fix
- For passing queries with high diff: consider tightening instructions
- Re-run after fixes to confirm improvement
