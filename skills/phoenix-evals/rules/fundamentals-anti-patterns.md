# Anti-Patterns

Common mistakes and fixes.

| Anti-Pattern | Problem | Fix |
| ------------ | ------- | --- |
| Generic metrics | Pre-built scores don't match your failures | Build from error analysis |
| Vibe-based | No quantification | Measure with experiments |
| Ignoring humans | Uncalibrated LLM judges | Validate >80% TPR/TNR |
| Premature automation | Evaluators for imagined problems | Let observed failures drive |
| Saturation blindness | 100% pass = no signal | Keep capability evals at 50-80% |
| Similarity metrics | BERTScore/ROUGE for generation | Use for retrieval only |
| Model switching | Hoping a model works better | Error analysis first |

## Quantify Changes

```python
baseline = run_experiment(dataset, old_prompt, evaluators)
improved = run_experiment(dataset, new_prompt, evaluators)
print(f"Improvement: {improved.pass_rate - baseline.pass_rate:+.1%}")
```

## Don't Use Similarity for Generation

```python
# BAD
score = bertscore(output, reference)

# GOOD
correct_facts = check_facts_against_source(output, context)
```

## Error Analysis Before Model Change

```python
# BAD
for model in models:
    results = test(model)

# GOOD
failures = analyze_errors(results)
# Then decide if model change is warranted
```
