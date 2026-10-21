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

## Add Evaluations Later

```python
from phoenix.client.experiments import evaluate_experiment

evaluate_experiment(experiment=experiment, evaluators=[new_evaluator])
```
