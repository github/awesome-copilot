# Experiments: Generating Synthetic Test Data (TypeScript)

Creating diverse, targeted test data for evaluation.

## Dimension-Based Approach

Define axes of variation, then generate combinations:

```typescript
const dimensions = {
  issueType: ["billing", "technical", "shipping"],
  customerMood: ["frustrated", "neutral", "happy"],
  complexity: ["simple", "moderate", "complex"],
};
```

## Two-Step Generation

1. **Generate tuples** (combinations of dimension values)
2. **Convert to natural queries** (separate LLM call per tuple)

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

// Step 1: Create tuples
type Tuple = [string, string, string];
const tuples: Tuple[] = [
  ["billing", "frustrated", "complex"],
  ["shipping", "neutral", "simple"],
];

// Step 2: Convert to natural query
async function tupleToQuery(t: Tuple): Promise<string> {
  const { text } = await generateText({
    model: openai("gpt-4o"),
    prompt: `Generate a realistic customer message:
    Issue: ${t[0]}, Mood: ${t[1]}, Complexity: ${t[2]}
    
    Write naturally, include typos if appropriate. Don't be formulaic.`,
  });
  return text;
}
```

## Target Failure Modes

Dimensions should target known failures from error analysis:

```typescript
// From error analysis findings
const dimensions = {
  timezone: ["EST", "PST", "UTC", "ambiguous"], // Known failure
  dateFormat: ["ISO", "US", "EU", "relative"], // Known failure
};
```

## Quality Control

- **Validate**: Check for placeholder text, minimum length
- **Deduplicate**: Remove near-duplicate queries using embeddings
- **Balance**: Ensure coverage across dimension values

```typescript
function validateQuery(query: string): boolean {
  const minLength = 20;
  const hasPlaceholder = /\[.*?\]|<.*?>/.test(query);
  return query.length >= minLength && !hasPlaceholder;
}
```

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
