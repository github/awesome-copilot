# Setup: Python

Packages required for Phoenix evals and experiments.

## Installation

```bash
# Core Phoenix package (includes client, evals, otel)
pip install arize-phoenix

# Or install individual packages
pip install arize-phoenix-client   # Phoenix client only
pip install arize-phoenix-evals    # Evaluation utilities
pip install arize-phoenix-otel     # OpenTelemetry integration
```

## LLM Providers

For LLM-as-judge evaluators, install your provider's SDK:

```bash
pip install openai      # OpenAI
pip install anthropic   # Anthropic
pip install google-generativeai  # Google
```

## Validation (Optional)

```bash
pip install scikit-learn  # For TPR/TNR metrics
```

## Quick Verify

```python
from phoenix.client import Client
from phoenix.evals import LLM, ClassificationEvaluator
from phoenix.otel import register

# All imports should work
print("Phoenix Python setup complete")
```

## Key Imports (Evals 2.0)

```python
from phoenix.client import Client
from phoenix.evals import (
    ClassificationEvaluator,      # LLM classification evaluator (preferred)
    LLM,                          # Provider-agnostic LLM wrapper
    async_evaluate_dataframe,     # Batch evaluate a DataFrame (preferred, async)
    evaluate_dataframe,           # Batch evaluate a DataFrame (sync)
    create_evaluator,             # Decorator for code-based evaluators
    create_classifier,            # Factory for LLM classification evaluators
    bind_evaluator,               # Map column names to evaluator params
    Score,                        # Score dataclass
)
from phoenix.evals.utils import to_annotation_dataframe  # Format results for Phoenix annotations
```

**Prefer**: `ClassificationEvaluator` over `create_classifier` (more parameters/customization).
**Prefer**: `async_evaluate_dataframe` over `evaluate_dataframe` (better throughput for LLM evals).

**Do NOT use** legacy 1.0 imports: `OpenAIModel`, `AnthropicModel`, `run_evals`, `llm_classify`.
