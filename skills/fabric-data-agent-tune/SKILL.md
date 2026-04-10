---
name: fabric-data-agent-tune
description: "Diagnose and fix failing queries on Fabric Data Agents — reproduce issues, identify root causes, add corrective few-shots, re-publish and verify"
---

# Tune Fabric Data Agent

Improve a Fabric Data Agent's accuracy by diagnosing failing queries and applying targeted fixes.

## Prerequisites

- A published Fabric Data Agent
- A question the agent answers incorrectly
- The expected correct answer

## Steps

1. **Get current config** — check instructions, table selection, and few-shot count
2. **Reproduce the issue** — query the agent with the failing question, show the generated SQL
3. **Diagnose the root cause**:
   - **Case sensitivity**: SQL endpoint may be case-sensitive; agent uses wrong casing
   - **Missing date filter**: Agent doesn't scope to a time period
   - **Wrong table**: Agent queries the wrong table for the metric
   - **Missing few-shot**: No similar example exists to guide the agent
   - **Instruction gap**: Instructions don't cover this pattern
4. **Apply the fix**:
   - Bad SQL pattern → add a corrective few-shot with validated SQL
   - Missing context → append to instructions
   - Wrong tables → add missing tables with select_tables
5. **Publish** the updated agent
6. **Re-test** the same question to confirm the fix

## Common Fixes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| "No data found" | Case-sensitive string match | Add `LOWER()` instruction + few-shot |
| Wrong number | No date filter | Add default date range instruction |
| Completely wrong answer | Wrong table | Add corrective few-shot with correct table |
| Partial answer | Missing aggregation source | Add instruction listing all relevant tables |

## Key Rules

- Always show the SQL so the user understands what went wrong
- Validate corrective SQL before adding as a few-shot
- Re-test after every fix to confirm improvement
- One fix at a time to isolate what works
