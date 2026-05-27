# Experiments: Running Experiments in Python

Execute experiments with `run_experiment`.

## Basic Usage

```python
from phoenix.client import Client
from phoenix.client.experiments import run_experiment

client = Client()
dataset = client.datasets.get_dataset(name="qa-test-v1")

def my_task(example):
    return call_llm(example.input["question"])

def exact_match(output, expected):
    return 1.0 if output.strip().lower() == expected["answer"].strip().lower() else 0.0

experiment = run_experiment(
    dataset=dataset,
    task=my_task,
    evaluators=[exact_match],
    experiment_name="qa-experiment-v1",
)
```

## Task Functions

```python
# Basic task
def task(example):
    return call_llm(example.input["question"])

# With context (RAG)
def rag_task(example):
    return call_llm(f"Context: {example.input['context']}\nQ: {example.input['question']}")
```

## Evaluator Parameters

| Parameter | Access |
| --------- | ------ |
| `output` | Task output |
| `expected` | Example expected output |
| `input` | Example input |
| `metadata` | Example metadata |

## Options

```python
experiment = run_experiment(
    dataset=dataset,
    task=my_task,
    evaluators=evaluators,
    experiment_name="my-experiment",
    dry_run=3,       # Test with 3 examples
    repetitions=3,   # Run each example 3 times
)
```

## Results

```python
print(experiment.aggregate_scores)
# {'accuracy': 0.85, 'faithfulness': 0.92}

for run in experiment.runs:
    print(run.output, run.scores)
```

## Stability

Single-run scores are noisy when either the task or the evaluator is non-deterministic — an LLM call, tool use, streaming output, an LLM-as-judge. On a small dataset, that per-run noise can swamp the signal from a prompt change.

Averaging over repetitions lets the score you report reflect the prompt rather than the sampling noise:

```python
run_experiment(
    # ...
    repetitions=3,
)
```

Things to consider:

- Reach for repetitions when the task or the evaluator is an LLM call and the dataset is small.
- Prefer repetitions when per-example cost is low and you mostly want to settle the score; prefer growing the dataset when you also need to cover more behaviors.
- Skip repetitions when both the task and the evaluator are deterministic (e.g. string comparison against a ground truth) — a single run is the answer.

Consider adding stability when:

- Repeat runs of the same experiment drift in ways that feel larger than the differences you're trying to measure.
- A prompt change flips example labels in ways that don't track with how the outputs actually changed.
- The judge's reasoning on the same output reads differently from one run to the next.

Repetitions are also what `repetitions=1` (default) silently relies on — don't trust a tuning decision based on a single 10-example run.

## Add Evaluations Later

```python
from phoenix.client.experiments import evaluate_experiment

evaluate_experiment(experiment=experiment, evaluators=[new_evaluator])
```
