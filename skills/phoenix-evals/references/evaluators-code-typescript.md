# Evaluators: Code Evaluators in TypeScript

Deterministic evaluators without LLM. Fast, cheap, reproducible.

## Basic Pattern

```typescript
import { createEvaluator } from "@arizeai/phoenix-evals";

const containsCitation = createEvaluator<{ output: string }>(
  ({ output }) => /\[\d+\]/.test(output) ? 1 : 0,
  { name: "contains_citation", kind: "CODE" }
);
```

## With Full Results (asExperimentEvaluator)

```typescript
import { asExperimentEvaluator } from "@arizeai/phoenix-client/experiments";

const jsonValid = asExperimentEvaluator({
  name: "json_valid",
  kind: "CODE",
  evaluate: async ({ output }) => {
    try {
      JSON.parse(String(output));
      return { score: 1.0, label: "valid_json" };
    } catch (e) {
      return { score: 0.0, label: "invalid_json", explanation: String(e) };
    }
  },
});
```

## Parameter Types

```typescript
interface EvaluatorParams {
  input: Record<string, unknown>;
  output: unknown;
  expected: Record<string, unknown>;
  metadata: Record<string, unknown>;
}
```

## Common Patterns

- **Regex**: `/pattern/.test(output)`
- **JSON**: `JSON.parse()` + zod schema
- **Keywords**: `output.includes(keyword)`
- **Similarity**: `fastest-levenshtein`
