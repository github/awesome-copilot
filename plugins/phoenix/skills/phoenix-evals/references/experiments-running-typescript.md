# Experiments: Running Experiments in TypeScript

Execute experiments with `runExperiment`.

## Basic Usage

```typescript
import { createClient } from "@arizeai/phoenix-client";
import {
  runExperiment,
  asExperimentEvaluator,
} from "@arizeai/phoenix-client/experiments";

const client = createClient();

const task = async (example: { input: Record<string, unknown> }) => {
  return await callLLM(example.input.question as string);
};

const exactMatch = asExperimentEvaluator({
  name: "exact_match",
  kind: "CODE",
  evaluate: async ({ output, expected }) => ({
    score: output === expected?.answer ? 1.0 : 0.0,
    label: output === expected?.answer ? "match" : "no_match",
  }),
});

const experiment = await runExperiment({
  client,
  experimentName: "qa-experiment-v1",
  dataset: { datasetId: "your-dataset-id" },
  task,
  evaluators: [exactMatch],
});
```

## Task Functions

```typescript
// Basic task
const task = async (example) => await callLLM(example.input.question as string);

// With context (RAG)
const ragTask = async (example) => {
  const prompt = `Context: ${example.input.context}\nQ: ${example.input.question}`;
  return await callLLM(prompt);
};
```

## Evaluator Parameters

```typescript
interface EvaluatorParams {
  input: Record<string, unknown>;
  output: unknown;
  expected: Record<string, unknown>;
  metadata: Record<string, unknown>;
}
```

## Options

```typescript
const experiment = await runExperiment({
  client,
  experimentName: "my-experiment",
  dataset: { datasetName: "qa-test-v1" },
  task,
  evaluators,
  repetitions: 3, // Run each example 3 times
  maxConcurrency: 5, // Limit concurrent executions
});
```

## Add Evaluations Later

```typescript
import { evaluateExperiment } from "@arizeai/phoenix-client/experiments";

await evaluateExperiment({ client, experiment, evaluators: [newEvaluator] });
```
