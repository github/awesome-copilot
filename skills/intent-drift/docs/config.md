# Configuration

The skill reads `config/defaults.yaml`. All keys are optional and overridden by CLI flags.

```yaml
analysis:
  threshold: 75              # min alignment % to be "on track"
  confidence_threshold: 80   # min confidence % for a reliable read
  providers:
    enabled:                 # which providers run (subset supported)
      - goal_provider
      - constraint_provider
      # ...
  weights:                   # relative importance (normalized internally)
    goal_provider: 0.25
    constraint_provider: 0.20
    # ...

export:
  default_format: text       # text | markdown | json
  file: null                 # path or null → stdout
  include_metadata: true

context_collection:
  auto_enabled: false
  methods:
    git_diff: true
    recent_commits: true
    edited_files: true
    recent_commands: true
    file_changes: true
  lookback_hours: 24

history:
  history_path: null         # null → $XDG_DATA_HOME/intent-drift/history.json
                             # (or ~/.local/share/intent-drift/history.json)
                             # Set to relocate the timeline; `~` and env vars
                             # are expanded. Must be a non-empty string.
```

## CLI overrides

| Flag | Overrides | Notes |
|------|-----------|-------|
| `--threshold N` | `analysis.threshold` | 0–100 |
| `--format F` | `export.default_format` | text/markdown/json |
| `--auto-context` | `context_collection.auto_enabled` | runs `ContextCollector` |
| `--context "..."` | `execution_context` | manual evidence string |

`--history` overrides nothing: it reads the timeline from
`history.history_path` (falling back to the XDG default) and prints it, so
that key is unaffected by any CLI flag.

## Per-invocation config

Drop a `config/user.yaml` next to `defaults.yaml`; the analyzer merges it over the
defaults. `user.yaml` is git-ignored by convention.
