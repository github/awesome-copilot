# Evaluators: Code Evaluators in Python

Deterministic evaluators without LLM. Fast, cheap, reproducible.

## Basic Pattern

```python
import re
import json
from phoenix.evals import create_evaluator

@create_evaluator(name="has_citation", kind="code")
def has_citation(output: str) -> bool:
    return bool(re.search(r'\[\d+\]', output))

@create_evaluator(name="json_valid", kind="code")
def json_valid(output: str) -> bool:
    try:
        json.loads(output)
        return True
    except json.JSONDecodeError:
        return False
```

## Parameter Binding

| Parameter | Description |
| --------- | ----------- |
| `output` | Task output |
| `input` | Example input |
| `expected` | Expected output |
| `metadata` | Example metadata |

```python
@create_evaluator(name="matches_expected", kind="code")
def matches_expected(output: str, expected: dict) -> bool:
    return output.strip() == expected.get("answer", "").strip()
```

## Common Patterns

- **Regex**: `re.search(pattern, output)`
- **JSON schema**: `jsonschema.validate()`
- **Keywords**: `keyword in output.lower()`
- **Length**: `len(output.split())`
- **Similarity**: `editdistance.eval()` or Jaccard

## Return Types

| Return type | Result |
| ----------- | ------ |
| `bool` | `True` → score=1.0, label="True"; `False` → score=0.0, label="False" |
| `float`/`int` | Used as the `score` value directly |
| `str` (short, ≤3 words) | Used as the `label` value |
| `str` (long, ≥4 words) | Used as the `explanation` value |
| `dict` with `score`/`label`/`explanation` | Mapped to Score fields directly |
| `Score` object | Used as-is |

## Important: Code vs LLM Evaluators

The `@create_evaluator` decorator wraps a plain Python function.

- `kind="code"` (default): For deterministic evaluators that don't call an LLM.
- `kind="llm"`: Marks the evaluator as LLM-based, but **you** must implement the LLM
  call inside the function. The decorator does not call an LLM for you.

For most LLM-based evaluation, prefer `ClassificationEvaluator` which handles
the LLM call, structured output parsing, and explanations automatically:

```python
from phoenix.evals import ClassificationEvaluator, LLM

relevance = ClassificationEvaluator(
    name="relevance",
    prompt_template="Is this relevant?\n{{input}}\n{{output}}\nAnswer:",
    llm=LLM(provider="openai", model="gpt-4o"),
    choices={"relevant": 1.0, "irrelevant": 0.0},
)
```

## Pre-Built

```python
from phoenix.experiments.evaluators import ContainsAnyKeyword, JSONParseable, MatchesRegex

evaluators = [
    ContainsAnyKeyword(keywords=["disclaimer"]),
    JSONParseable(),
    MatchesRegex(pattern=r"\d{4}-\d{2}-\d{2}"),
]
```
