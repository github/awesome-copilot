# Experiments: Overview

Systematic testing of AI systems with datasets, tasks, and evaluators.

## Structure

```
DATASET     → Examples: {input, expected_output, metadata}
TASK        → function(input) → output
EVALUATORS  → (input, output, expected) → score
EXPERIMENT  → Run task on all examples, score results
```

## Basic Usage

```python
from phoenix.client.experiments import run_experiment

experiment = run_experiment(
    dataset=my_dataset,
    task=my_task,
    evaluators=[accuracy, faithfulness],
    experiment_name="improved-retrieval-v2",
)

print(experiment.aggregate_scores)
# {'accuracy': 0.85, 'faithfulness': 0.92}
```

## Workflow

1. **Create dataset** - From traces, synthetic data, or manual curation
2. **Define task** - The function to test (your LLM pipeline)
3. **Select evaluators** - Code and/or LLM-based
4. **Run experiment** - Execute and score
5. **Analyze & iterate** - Review, modify task, re-run

## Dry Runs

Test setup before full execution:

```python
experiment = run_experiment(dataset, task, evaluators, dry_run=3)  # Just 3 examples
```

## Best Practices

- **Name meaningfully**: `"improved-retrieval-v2-2024-01-15"` not `"test"`
- **Version datasets**: Don't modify existing
- **Multiple evaluators**: Combine perspectives
