# Step 1 — Deploy Agent & Setup Evaluators

## Deploy

For deployment, follow the [deploy skill](../../deploy/deploy.md). It handles project detection, Dockerfile generation, ACR build, agent creation, and container startup.

After deployment completes, persist these variables to `.env` for future conversations:

| Variable | Purpose |
|----------|---------|
| `AZURE_AI_PROJECT_ENDPOINT` | Foundry project endpoint |
| `AZURE_AI_AGENT_NAME` | Deployed agent name |
| `AZURE_AI_AGENT_VERSION` | Current agent version |
| `AZURE_CONTAINER_REGISTRY` | ACR resource (hosted agents) |

## Auto-Create Evaluators & Dataset

> **This step is fully automatic.** After deployment, immediately prepare evaluators and a local test dataset without waiting for the user to request it.

### 1. Read Agent Instructions

Use **`agent_get`** (or local `agent.yaml`) to understand the agent's purpose and capabilities.

### 2. Select Evaluators

Combine **built-in, custom, and safety evaluators**:

| Category | Evaluators |
|----------|-----------|
| **Quality (built-in)** | intent_resolution, task_adherence, coherence, fluency, relevance |
| **Safety (include ≥2)** | violence, self_harm, hate_unfairness, sexual, indirect_attack |
| **Custom (create 1–2)** | Domain-specific via `evaluator_catalog_create` (see below) |

### 3. Create Custom Evaluators

Use **`evaluator_catalog_create`** with:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `projectEndpoint` | ✅ | Azure AI Project endpoint |
| `name` | ✅ | e.g., `domain_accuracy`, `citation_quality` |
| `category` | ✅ | `quality`, `safety`, or `agents` |
| `scoringType` | ✅ | `ordinal`, `continuous`, or `boolean` |
| `promptText` | ✅* | Template with `{{query}}`, `{{response}}` placeholders |
| `minScore` / `maxScore` | | Default: 1 / 5 |
| `passThreshold` | | Scores ≥ this value pass |

> **LLM-judge tip:** Include in the evaluator prompt: *"Do NOT penalize the response for mentioning dates or events beyond your training cutoff. The agent has real-time access."*

### 4. Identify LLM-Judge Deployment

Use **`model_deployment_get`** to find a suitable model (e.g., `gpt-4o`) for quality evaluators.

### 5. Generate Local Test Dataset

Use the identified LLM deployment to generate realistic test queries based on the agent's instructions and tool capabilities. Save to `datasets/<agent-name>-test.jsonl` with each line containing at minimum a `query` field (optionally `context`, `ground_truth`).

### 6. Persist Artifacts

```
evaluators/        # custom evaluator definitions
  <name>.yaml      # prompt text, scoring type, thresholds
datasets/          # locally generated input datasets
  *.jsonl          # test queries
results/           # evaluation run outputs (populated later)
  <eval-id>/
    <run-id>.json
```

Save evaluator definitions to `evaluators/<name>.yaml` and test data to `datasets/*.jsonl`.

### 7. Prompt User

*"Your agent is deployed and running. Evaluators and a local test dataset have been auto-configured. Would you like to run an evaluation to identify optimization opportunities?"*

If yes → proceed to [Step 2: Evaluate](evaluate-step.md). If no → stop.
