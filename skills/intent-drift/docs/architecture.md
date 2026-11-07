# Architecture

The `intent-drift` skill wraps the Intent Alignment Engine to detect intent drift in
AI-assisted development.

## Data flow

```
user inputs (goal, plan, context)
        │
        ▼
IntentDriftAnalyzer.parse_arguments()   # CLI / skill args → config dict
        │
        ▼
IntentDriftAnalyzer.analyze()           # build AlignmentContext, run engine
        │
        ▼
IntentAlignmentEngine.evaluate()        # registered evidence providers
        │  ├─ goal_provider
        │  ├─ constraint_provider
        │  ├─ scope_provider
        │  ├─ execution_provider
        │  ├─ file_graph_provider
        │  ├─ dependency_provider
        │  ├─ architecture_provider
        │  ├─ requirement_coverage_provider
        │  └─ problematic_findings_provider
        ▼
AlignmentReport (overall_alignment, status, confidence, evidence, breakdown, ...)
        │
        ▼
IntentDriftAnalyzer.export_report()     # text | markdown | json
```

## Components

- **`analyzer.py`** — `IntentDriftAnalyzer` ties everything together: parses arguments,
  builds the `AlignmentContext`, evaluates via the engine, and exports the result.
  `main()` is the CLI entry point.
- **`providers/`** — one file per evidence provider. Each subclasses
  `evidence.base.EvidenceProvider`, implements `collect(context) -> List[Evidence]`,
  and replaces the dependency's same-named default in
  `analyzer.py:_configure_engine`, so there is one scoring implementation per
  provider. `base.py` defines the interface and public constructor.
- **`exporters/`** — `TextExporter`, `MarkdownExporter`, `JSONExporter`, each a
  `BaseExporter` subclass implementing `export(report) -> str`.
- **`scripts/collect_context.py`** — `ContextCollector` gathers git diff, recent commits,
  edited files, and recent shell commands for `--auto-context`.
- **`config/defaults.yaml`** — thresholds, provider weights, enabled providers, export
  defaults.

## Scoring

Each `Evidence` carries a `value` (0–100 significance) and `confidence` (0–1). The engine
computes a weighted average of `value`s (weights normalized), then a consistency-based
confidence from the spread and diversity of evidence. `Status` bands:

| Score | Status |
|-------|--------|
| ≥ 90 | Fully_Aligned |
| ≥ 75 | Minor_Drift |
| ≥ 50 | Moderate_Drift |
| ≥ 25 | Major_Drift |
| < 25 | Critical_Drift |

## Portability

The skill is self-contained in its skill folder. It imports the Intent Alignment
Engine from the `intent-drift` package (declared in `requirements.txt` and
`metadata.json`). `metadata.json` declares parameters and dependencies so any agent
harness can discover and invoke it.
