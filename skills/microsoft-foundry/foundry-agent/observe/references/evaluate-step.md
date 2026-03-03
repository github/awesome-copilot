# Step 2 — Create Batch Evaluation

## Prerequisites

- Agent deployed and running
- Evaluators configured (from [Step 1](deploy-and-setup.md) or `evaluators/` folder)
- Local test dataset available (from `datasets/` or will use synthetic data)

## Run Evaluation

Use **`evaluation_agent_batch_eval_create`** to run evaluators against the agent.

### Required Parameters

| Parameter | Description |
|-----------|-------------|
| `projectEndpoint` | Azure AI Project endpoint |
| `agentName` | Agent name |
| `agentVersion` | Agent version (string, e.g. `"1"`) |
| `evaluatorNames` | Array of evaluator names (NOT `evaluators`) |

### Test Data Options

**Preferred — local dataset:** Read JSONL from `datasets/` and pass via `inputData` (array of objects with `query` and optionally `context`, `ground_truth`). Provides reproducibility and version control.

**Fallback — server-side synthetic data:** Set `generateSyntheticData=true` AND provide `generationModelDeploymentName`. Optionally set `samplesCount` (default 50) and `generationPrompt` with the agent's instructions.

### Additional Parameters

| Parameter | When Needed |
|-----------|-------------|
| `deploymentName` | Required for quality evaluators (the LLM-judge model) |
| `evaluationId` | Pass existing eval group ID to group runs for comparison |
| `evaluationName` | Name for a new evaluation group |

> **Important:** Use `evaluationId` (NOT `evalId`) to group runs.

## Auto-Poll for Completion

Immediately after creating the run, poll **`evaluation_get`** in a **background terminal** until completion. Use `evalId` + `isRequestForRuns=true`. The run ID parameter is `evalRunId` (NOT `runId`).

Only surface the final result when status reaches `completed`, `failed`, or `cancelled`.

## Next Steps

When evaluation completes → proceed to [Step 3: Analyze Results](analyze-results.md).

## Reference

- [Azure AI Foundry Cloud Evaluation](https://learn.microsoft.com/en-us/azure/ai-foundry/how-to/develop/cloud-evaluation)
- [Built-in Evaluators](https://learn.microsoft.com/en-us/azure/ai-foundry/how-to/develop/evaluate-sdk#built-in-evaluators)
