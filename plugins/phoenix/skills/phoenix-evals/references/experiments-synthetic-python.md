# Experiments: Generating Synthetic Test Data

Creating diverse, targeted test data for evaluation.

## Dimension-Based Approach

Define axes of variation, then generate combinations:

```python
dimensions = {
    "issue_type": ["billing", "technical", "shipping"],
    "customer_mood": ["frustrated", "neutral", "happy"],
    "complexity": ["simple", "moderate", "complex"],
}
```

## Two-Step Generation

1. **Generate tuples** (combinations of dimension values)
2. **Convert to natural queries** (separate LLM call per tuple)

```python
# Step 1: Create tuples
tuples = [
    ("billing", "frustrated", "complex"),
    ("shipping", "neutral", "simple"),
]

# Step 2: Convert to natural query
def tuple_to_query(t):
    prompt = f"""Generate a realistic customer message:
    Issue: {t[0]}, Mood: {t[1]}, Complexity: {t[2]}
    
    Write naturally, include typos if appropriate. Don't be formulaic."""
    return llm(prompt)
```

## Target Failure Modes

Dimensions should target known failures from error analysis:

```python
# From error analysis findings
dimensions = {
    "timezone": ["EST", "PST", "UTC", "ambiguous"],  # Known failure
    "date_format": ["ISO", "US", "EU", "relative"],   # Known failure
}
```

## Quality Control

- **Validate**: Check for placeholder text, minimum length
- **Deduplicate**: Remove near-duplicate queries using embeddings
- **Balance**: Ensure coverage across dimension values

## When to Use

| Use Synthetic | Use Real Data |
| ------------- | ------------- |
| Limited production data | Sufficient traces |
| Testing edge cases | Validating actual behavior |
| Pre-launch evals | Post-launch monitoring |

## Sample Sizes

| Purpose | Size |
| ------- | ---- |
| Initial exploration | 50-100 |
| Comprehensive eval | 100-500 |
| Per-dimension | 10-20 per combination |
