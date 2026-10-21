# Validating Evaluators (TypeScript)

Validate an LLM evaluator against human-labeled examples before deploying it.
Target: **>80% TPR and >80% TNR**.

Roles are inverted compared to a normal task experiment:

| Normal experiment | Evaluator validation |
|---|---|
| Task = agent logic | Task = run the evaluator under test |
| Evaluator = judge output | Evaluator = exact-match vs human ground truth |
| Dataset = agent examples | Dataset = golden hand-labeled examples |

## Golden Dataset

Use a separate dataset name so validation experiments don't mix with task experiments in Phoenix.
Store human ground truth in `metadata.groundTruthLabel`. Aim for ~50/50 balance:

```typescript
import type { Example } from "@arizeai/phoenix-client/types/datasets";

const goldenExamples: Example[] = [
  { input: { q: "Capital of France?" }, output: { answer: "Paris" },       metadata: { groundTruthLabel: "correct" } },
  { input: { q: "Capital of France?" }, output: { answer: "Lyon" },        metadata: { groundTruthLabel: "incorrect" } },
  { input: { q: "Capital of France?" }, output: { answer: "Major city..." }, metadata: { groundTruthLabel: "incorrect" } },
];

const VALIDATOR_DATASET = "my-app-qa-evaluator-validation"; // separate from task dataset
const POSITIVE_LABEL = "correct";
const NEGATIVE_LABEL = "incorrect";
```

## Validation Experiment

```typescript
import { createClient } from "@arizeai/phoenix-client";
import { createOrGetDataset, getDatasetExamples } from "@arizeai/phoenix-client/datasets";
import { asExperimentEvaluator, runExperiment } from "@arizeai/phoenix-client/experiments";
import { myEvaluator } from "./myEvaluator.js";

const client = createClient();

const { datasetId } = await createOrGetDataset({ client, name: VALIDATOR_DATASET, examples: goldenExamples });
const { examples } = await getDatasetExamples({ client, dataset: { datasetId } });
const groundTruth = new Map(examples.map((ex) => [ex.id, ex.metadata?.groundTruthLabel as string]));

// Task: invoke the evaluator under test
const task = async (example: (typeof examples)[number]) => {
  const result = await myEvaluator.evaluate({ input: example.input, output: example.output, metadata: example.metadata });
  return result.label ?? "unknown";
};

// Evaluator: exact-match against human ground truth
const exactMatch = asExperimentEvaluator({
  name: "exact-match", kind: "CODE",
  evaluate: ({ output, metadata }) => {
    const expected = metadata?.groundTruthLabel as string;
    const predicted = typeof output === "string" ? output : "unknown";
    return { score: predicted === expected ? 1 : 0, label: predicted, explanation: `Expected: ${expected}, Got: ${predicted}` };
  },
});

const experiment = await runExperiment({
  client, experimentName: `evaluator-validation-${Date.now()}`,
  dataset: { datasetId }, task, evaluators: [exactMatch],
});

// Compute confusion matrix
const runs = Object.values(experiment.runs);
const predicted = new Map((experiment.evaluationRuns ?? [])
  .filter((e) => e.name === "exact-match")
  .map((e) => [e.experimentRunId, e.result?.label ?? null]));

let tp = 0, fp = 0, tn = 0, fn = 0;
for (const run of runs) {
  if (run.error) continue;
  const p = predicted.get(run.id), a = groundTruth.get(run.datasetExampleId);
  if (!p || !a) continue;
  if (a === POSITIVE_LABEL && p === POSITIVE_LABEL) tp++;
  else if (a === NEGATIVE_LABEL && p === POSITIVE_LABEL) fp++;
  else if (a === NEGATIVE_LABEL && p === NEGATIVE_LABEL) tn++;
  else if (a === POSITIVE_LABEL && p === NEGATIVE_LABEL) fn++;
}
const total = tp + fp + tn + fn;
const tpr = tp + fn > 0 ? (tp / (tp + fn)) * 100 : 0;
const tnr = tn + fp > 0 ? (tn / (tn + fp)) * 100 : 0;
console.log(`TPR: ${tpr.toFixed(1)}%  TNR: ${tnr.toFixed(1)}%  Accuracy: ${((tp + tn) / total * 100).toFixed(1)}%`);
```

## Results & Quality Rules

| Metric | Target | Low value means |
|---|---|---|
| TPR (sensitivity) | >80% | Misses real failures (false negatives) |
| TNR (specificity) | >80% | Flags good outputs (false positives) |
| Accuracy | >80% | General weakness |

**Golden dataset rules:** ~50/50 balance · include edge cases · human-labeled only · never mutate (append new versions) · 20–50 examples is enough.

**Re-validate when:** prompt template changes · judge model changes · criteria updated · production FP/FN spike.

## See Also

- `validation.md` — Metric definitions and concepts
- `experiments-running-typescript.md` — `runExperiment` API
- `experiments-datasets-typescript.md` — `createOrGetDataset` / `getDatasetExamples`
