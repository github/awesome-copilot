---
name: 'token-usage-observability'
description: 'Plot Copilot Chat transcripts and debug logs to estimate/capture token consumption and break it down by phase'
---

# Token Usage Observability

## Purpose
Always reuse the same flow to measure token spending per session and per phase:
- Analysis
- Documentation
- ExportWord
- Other

Also try to extract exact counters (`prompt_tokens`, `completion_tokens`, `input_tokens`, `output_tokens`) from transcript/debug logs when they exist.

## Associated scripts
- `.github/scripts/token-usage-report.ps1` - Main engine: read transcripts, update MD
- `.github/scripts/token-daily-close.ps1` - Simplified wrapper for daily closing
- `.github/scripts/pre-commit-token-sync.ps1` - (Deprecated - not used)
- `.git/hooks/pre-commit` - Hook that executes the skill before each commit

## Architecture: What Exists and What is Committed

```
AppData/transcripts (local, no tracked)
  ↓
skill reads
  ↓
Actualiza token-usage-daily-aggregate.md DIRECTAMENTE
  ↓
git commit
  ↓
pre-commit hook runs the skill
  ↓
MD is committed ✅
```

**The important thing:**
- ✅ There is no tabular intermediate flow for tokens
- ✅ Local JSON + versioned MD exists
- ✅ The MD is committed
- ✅ The hook ensures that it is fresh before each commit

## Initial Setup (First Time Only)
```powershell
# Install pre-commit hook (runs automatically before each commit)
.\.github\scripts\setup-token-hook.ps1
```

After this: **Every commit will update the MD automatically**

## Quick use
```powershell
# 1) Latest session found automatically
powershell -ExecutionPolicy Bypass -File .github/scripts/token-usage-report.ps1

# 2) Specific session
powershell -ExecutionPolicy Bypass -File .github/scripts/token-usage-report.ps1 -SessionId "<id>"

# 3) Explicit transcript
powershell -ExecutionPolicy Bypass -File .github/scripts/token-usage-report.ps1 -TranscriptPath "C:\...\transcripts\<id>.jsonl"

# 4) With JSON log + weekly summary
powershell -ExecutionPolicy Bypass -File .github/scripts/token-usage-report.ps1 `
	-IncludeDebugLogs `
	-JsonPath ".github/reports/token-usage-history.json" `
	-AppendHistory `
	-ShowWeeklySummary

# 5) With cost estimate
powershell -ExecutionPolicy Bypass -File .github/scripts/token-usage-report.ps1 `
	-IncludeDebugLogs `
	-JsonPath ".github/reports/token-usage-history.json" `
	-AppendHistory `
	-ModelName "gpt-5.3-codex" `
	-InputCostPer1M 5.00 `
	-OutputCostPer1M 15.00 `
	-CostBasis estimated_total_tokens_max

# 6) Daily accumulation in Markdown table
powershell -ExecutionPolicy Bypass -File .github/scripts/token-usage-report.ps1 `
	-IncludeDebugLogs `
	-JsonPath ".github/reports/token-usage-history.json" `
	-AppendHistory `
	-AppendDailyAggregateMarkdown `
	-DailyAggregateMdPath ".github/reports/token-usage-daily-aggregate.md"

# 7) Simple team flow (single command)
powershell -ExecutionPolicy Bypass -File .github/scripts/token-daily-close.ps1

# 8) With custom model and costs
powershell -ExecutionPolicy Bypass -File .github/scripts/token-daily-close.ps1 `
	-ModelName "gpt-5.3-codex" `
	-InputCostPer1M 5 `
	-OutputCostPer1M 15
```

## Expected output
- Visible valuation of tokens
- Estimation with protocol/context overhead
- Breakdown by phase
- Breakdown by origin (User/Assistant/Tool)
- Exact counters if the logs expose them
- Log JSON local (append, gitignored)
- Weekly summary (runs/tokens/cost)
- Configurable cost estimate per model
- Daily cumulative append-only (one new row per run with the day's total)
- Daily cumulative in Markdown (append-only table)
- Daily Closing Wrapper for simple use within Boost (single command)

## Notes
- If there are no exact counters in logs, the result is estimated (traceable by bytes).
- The script avoids failing if exact logs are missing: always returns report.
- For cost, if there is no exact input/output in logs, use an 85/15 approximation `CostBasis`.
