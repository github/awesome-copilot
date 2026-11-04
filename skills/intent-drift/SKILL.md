---
name: intent-drift
description: Detects intent drift in AI-assisted development by comparing the original goal against the current plan and execution context. Run /intent-drift to evaluate whether ongoing work has drifted from what was asked. Triggers on "check intent drift", "are we still on track", "is this aligned with the goal", "did the plan drift", "intent alignment", "scope creep check", "am I off track".
---

# intent-drift

A skill that uses the Intent Alignment Engine to detect whether an AI coding agent's
current work has drifted from the user's original goal.

## Run (when invoked)

**0. Gather inputs** (ask only what you cannot infer from the repo):
- `--original-goal` (required): the user's stated objective, or infer from the
  conversation / issue / PR description if available.
- `--current-plan` (required): what is actually being built right now (steps, branch
  purpose, recent edits), or infer from git state + recent messages.
- `--context` / `--auto-context`: execution evidence (edited files, git diff, recent
  commands). With `--auto-context`, collect automatically (see `scripts/collect_context.py`).
  Auto-context is **repo-only by default**: git diff, commits, edited files, and file
  changes. Your **shell history is never read** unless you pass `--include-shell-history`.
  That opt-in is deliberate — `.bash_history` / `.zsh_history` can contain credentials
  typed into a shell and commands unrelated to the current repo, so it stays off unless
  explicitly requested. Auto-collected context is also **scrubbed by default**: secret-like
  content (tokens, `password=`/`api_key=` assignments, `Authorization:` headers, long
  base64 blobs) is masked before it reaches the analyzer and report exporters. To disable
  the scrub (not recommended), construct `ContextCollector(sanitize_secrets=False)`.
- `--format` (`text` | `markdown` | `json`): output format.
- `--threshold` (default 75): minimum alignment % to be considered "on track".

Do NOT ask if enough is inferable from the repo + conversation — infer and state your
assumptions.

**1. Build the context** and call the analyzer.

Set `SKILL_DIR` to the folder that contains this `SKILL.md`:

```bash
SKILL_DIR="/path/to/skills/intent-drift"
python3 "$SKILL_DIR/analyzer.py" \
  --original-goal "Reduce memory usage" \
  --current-plan "Optimize startup latency" \
  --context "Edited: main.py, startup.py. Recent: pip install numpy, cProfile main.py" \
  --format text
```
Or in Python:
```python
import sys
from pathlib import Path

SKILL_DIR = Path("/path/to/skills/intent-drift")  # folder containing SKILL.md
sys.path.insert(0, str(SKILL_DIR))
from analyzer import IntentDriftAnalyzer

a = IntentDriftAnalyzer()
rep = a.analyze(a.parse_arguments([
    "--original-goal", "Reduce memory usage",
    "--current-plan", "Optimize startup latency",
]))
print(a.export_report(rep, "text"))
```

**Setup:** the analyzer needs Python 3.10+ and the engine package. Either run
`pip install -r requirements.txt`, or use the bundled launcher
`node "$SKILL_DIR/bin/intent-drift.js" ...`, which creates a venv and installs
dependencies on first run.

**2. Report** to the user:
- Overall alignment %, status (Fully_Aligned → Critical_Drift), and confidence %.
- The recommendation verbatim.
- The 2–3 strongest evidence lines (✅ / ⚠ / ❌) with their source provider.
- If alignment < threshold: highlight the drifted dimension from the breakdown.

**3. If drift is detected**, surface it clearly and suggest pausing to confirm intent
before continuing — do not silently keep building the off-track plan.

## How it works

Nine evidence providers each inspect the same context and emit weighted `Evidence`
(value 0–100, confidence 0–1). The engine computes a weighted score, a consistency-based
confidence, a status band, and a recommendation. Providers live in `providers/`,
exporters in `exporters/`, and auto context collection in `scripts/collect_context.py`.

| Provider | Weight | What it checks |
|----------|--------|----------------|
| goal_provider | 0.25 | Semantic overlap between goal and plan |
| constraint_provider | 0.20 | Constraints satisfied / violated |
| scope_provider | 0.15 | Scope expansion or reduction |
| execution_provider | 0.15 | Commands / edits / reasoning vs goal |
| file_graph_provider | 0.10 | File relationships and patterns |
| dependency_provider | 0.10 | Dependency install/remove vs goal |
| architecture_provider | 0.10 | Architectural change patterns |
| requirement_coverage_provider | 0.08 | Success criteria coverage |
| problematic_findings_provider | 0.07 | Cross-provider problematic patterns |

## Rules
- State assumptions when inferring goal/plan from the repo; never fabricate intent.
- Below-threshold results are a call to confirm, not a reason to abandon good work.
- Prefer `--auto-context` so evidence reflects real repo state, not just prose.
- This skill is a maintainer tool, not a replacement: it pauses and asks for
  confirmation — it never acts autonomously or re-plans the work itself.

## Files
| File | Purpose |
|------|---------|
| `analyzer.py` | CLI + `IntentDriftAnalyzer` (parse → analyze → export) |
| `providers/` | 9 evidence providers + `base.py` |
| `exporters/` | text / markdown / json report exporters |
| `scripts/collect_context.py` | Repo-only context collection (git diff, commits, edited files, file changes) with default-on secret scrubbing; shell history is opt-in via `--include-shell-history` |
| `config/defaults.yaml` | Thresholds, weights, enabled providers |
| `metadata.json` | Importable skill metadata (params, deps) |
| `requirements.txt` | Python dependencies (`intent-drift`, `PyYAML`) |
| `bin/intent-drift.js` | Node launcher that provisions a venv and runs the analyzer |
| `examples/` | Runnable examples: `basic.py`, `auto_context.py` |
| `docs/` | Deeper reference: architecture, providers, configuration, API, customization |
