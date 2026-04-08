# Model Selection

Error analysis first, model changes last.

## Decision Tree

```
Performance Issue?
       │
       ▼
Error analysis suggests model problem?
    NO  → Fix prompts, retrieval, tools
    YES → Is it a capability gap?
          YES → Consider model change
          NO  → Fix the actual problem
```

## Judge Model Selection

| Principle | Action |
| --------- | ------ |
| Start capable | Use gpt-4o first |
| Optimize later | Test cheaper after criteria stable |
| Same model OK | Judge does different task |

```python
# Start with capable model
judge = ClassificationEvaluator(
    llm=LLM(provider="openai", model="gpt-4o"),
    ...
)

# After validation, test cheaper
judge_cheap = ClassificationEvaluator(
    llm=LLM(provider="openai", model="gpt-4o-mini"),
    ...
)
# Compare TPR/TNR on same test set
```

## Don't Model Shop

```python
# BAD
for model in ["gpt-4o", "claude-3", "gemini-pro"]:
    results = run_experiment(dataset, task, model)

# GOOD
failures = analyze_errors(results)
# "Ignores context" → Fix prompt
# "Can't do math" → Maybe try better model
```

## When Model Change Is Warranted

- Failures persist after prompt optimization
- Capability gaps (reasoning, math, code)
- Error analysis confirms model limitation
