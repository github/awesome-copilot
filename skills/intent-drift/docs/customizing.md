# Customizing intent-drift

## Change thresholds and weights
Edit `config/defaults.yaml` (see `docs/config.md`). Weights are normalized, so you only
need relative magnitudes.

## Disable providers
Remove names from `analysis.providers.enabled`. The engine skips unregistered providers.

## Add a custom provider
See `docs/providers.md` → "Adding a provider". Minimal example:

```python
# providers/freshness_provider.py
from intent_alignment.models import Evidence
from .base import EvidenceProvider

class FreshnessProvider(EvidenceProvider):
    def __init__(self):
        super().__init__(name="freshness_provider", weight=0.05)

    def collect(self, context):
        ec = context.get("execution_context", {})
        last_edit = ec.get("last_edit_age_hours", 0)
        score = max(0.0, 100.0 - last_edit * 2)
        return [Evidence(source=self.name, value=score/100, confidence=0.6,
                         details=f"Last edit {last_edit}h ago")]
```

Then add to `providers/__init__.py` and register it in the analyzer.

## Add an exporter
In `exporters/`, subclass `BaseExporter` and implement `export(report) -> str`; register
it in `IntentDriftAnalyzer.export_report`.

## Point at a different engine
The engine is a regular dependency: `analyzer.py` and `__init__.py` import it as
`from intent_alignment.engine import IntentAlignmentEngine`. To use a different
build, install your copy in the environment (e.g. `pip install -e /path/to/engine`)
so `intent_alignment` resolves, or bump `intent-drift` in `pyproject.toml` and
`metadata.json`.
