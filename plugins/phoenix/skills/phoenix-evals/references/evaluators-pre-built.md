# Evaluators: Pre-Built

Use for exploration only. Validate before production.

## Python

```python
from phoenix.evals import LLM
from phoenix.evals.metrics import FaithfulnessEvaluator

llm = LLM(provider="openai", model="gpt-4o")
faithfulness_eval = FaithfulnessEvaluator(llm=llm)
```

**Note**: `HallucinationEvaluator` is deprecated. Use `FaithfulnessEvaluator` instead.
It uses "faithful"/"unfaithful" labels with score 1.0 = faithful.

## TypeScript

```typescript
import { createHallucinationEvaluator } from "@arizeai/phoenix-evals";
import { openai } from "@ai-sdk/openai";

const hallucinationEval = createHallucinationEvaluator({ model: openai("gpt-4o") });
```

## Available (2.0)

| Evaluator | Type | Description |
| --------- | ---- | ----------- |
| `FaithfulnessEvaluator` | LLM | Is the response faithful to the context? |
| `CorrectnessEvaluator` | LLM | Is the response correct? |
| `DocumentRelevanceEvaluator` | LLM | Are retrieved documents relevant? |
| `ToolSelectionEvaluator` | LLM | Did the agent select the right tool? |
| `ToolInvocationEvaluator` | LLM | Did the agent invoke the tool correctly? |
| `ToolResponseHandlingEvaluator` | LLM | Did the agent handle the tool response well? |
| `MatchesRegex` | Code | Does output match a regex pattern? |
| `PrecisionRecallFScore` | Code | Precision/recall/F-score metrics |
| `exact_match` | Code | Exact string match |

Legacy evaluators (`HallucinationEvaluator`, `QAEvaluator`, `RelevanceEvaluator`,
`ToxicityEvaluator`, `SummarizationEvaluator`) are in `phoenix.evals.legacy` and deprecated.

## When to Use

| Situation | Recommendation |
| --------- | -------------- |
| Exploration | Find traces to review |
| Find outliers | Sort by scores |
| Production | Validate first (>80% human agreement) |
| Domain-specific | Build custom |

## Exploration Pattern

```python
from phoenix.evals import evaluate_dataframe

results_df = evaluate_dataframe(dataframe=traces, evaluators=[faithfulness_eval])

# Score columns contain dicts — extract numeric scores
scores = results_df["faithfulness_score"].apply(
    lambda x: x.get("score", 0.0) if isinstance(x, dict) else 0.0
)
low_scores = results_df[scores < 0.5]   # Review these
high_scores = results_df[scores > 0.9]  # Also sample
```

## Validation Required

```python
from sklearn.metrics import classification_report

print(classification_report(human_labels, evaluator_results["label"]))
# Target: >80% agreement
```
