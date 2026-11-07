# API Reference

The skill exposes a small Python API and a CLI.

## `IntentDriftAnalyzer`
* `parse_arguments(args: list) -> dict` — convert CLI args to a config dict.
* `analyze(config: dict) -> AlignmentReport` — build context, run the engine, return a
  report. `config` needs at least `original_goal` and `current_plan`.
* `export_report(report, format) -> str` — `format` ∈ `{"text","markdown","json"}`.
* `_collect_auto_context(include_shell_history=False) -> dict` — collect execution
  context via `ContextCollector`. Repo-only signals by default; shell history is read
  only when `include_shell_history=True` (see the privacy note below).

```python
from analyzer import IntentDriftAnalyzer
a = IntentDriftAnalyzer()
cfg = a.parse_arguments(["--original-goal", "X", "--current-plan", "Y"])
report = a.analyze(cfg)
print(a.export_report(report, "markdown"))
```

## `AlignmentReport` (from `intent_alignment.models`)
| Field | Type | Meaning |
|-------|------|---------|
| `overall_alignment` | float | 0–100 weighted alignment score |
| `confidence` | float | 0–100 consistency-based confidence |
| `status` | str | `Fully_Aligned` … `Critical_Drift` |
| `breakdown` | dict | per-provider score/weight |
| `summary` | str | prose summary |
| `evidence` | list[Evidence] | all evidence items |
| `risk` | str | risk statement |
| `recommendation` | str | recommended action |
| `timeline` | list | score history; each entry is `{timestamp, score, note}`. Persisted to `~/.local/share/intent-drift/history.json` (or `$XDG_DATA_HOME`) and seeded with the running history on every analysis, so exporters show the trend |

## `Evidence` (from `intent_alignment.models`)
`source: str`, `value: float` (0–100), `confidence: float` (0–1), `details: str`.

## `ContextCollector`
`collect_all() -> dict` with `git_diff`, `recent_commits`, `edited_files`,
`recent_commands`, `file_changes`, `metadata`. Used by `--auto-context`.

Constructor: `ContextCollector(repo_path=None, lookback_hours=1.0,
sanitize_secrets=True, include_shell_history=False)`. `recent_commands` is
`[]` unless `include_shell_history=True` — reading `~/.bash_history` /
`~/.zsh_history` / `~/.history` is an explicit opt-in because shell history
may contain credentials or commands unrelated to the repo. Set
`sanitize_secrets=False` only if you want raw (unscrubbed) output; not
recommended.

## CLI
```bash
# SKILL_DIR is the folder containing SKILL.md
python3 "$SKILL_DIR/analyzer.py" \
  --original-goal "..." --current-plan "..." \
  [--context "..." | --auto-context] [--include-shell-history] \
  [--format text|markdown|json] [--threshold N] [--history] [--compare N]
```
Exit code is `1` when alignment < threshold (for use in CI / hooks).

`--auto-context` collects repo-only signals (git diff, commits, edited files,
file changes). Add `--include-shell-history` to also read the last shell
commands from the user's history files — opt-in only, because shell history
may leak credentials and includes commands unrelated to the repo.

- `--history` prints the persisted score timeline (no analysis required) and
exits.
- `--compare N` prints, after the report, the score trend of this run versus
the run `N` analyses ago — total delta, per-run rate, a verdict
(improving / declining / steady), and drift acceleration once enough history
exists.

History is stored per user in `~/.local/share/intent-drift/history.json`
(respecting `XDG_DATA_HOME`); every run appends its score so the timeline
grows across sessions.
