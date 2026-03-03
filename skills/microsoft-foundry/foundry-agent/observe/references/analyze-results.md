# Steps 3–5 — Download Results, Cluster Failures, Dive Into Category

## Step 3 — Download Results

`evaluation_get` returns run metadata but **not** full per-row output. Write a Python script (save to `scripts/`) to download detailed results:

1. Initialize `AIProjectClient` with project endpoint and `DefaultAzureCredential`
2. Get OpenAI client via `project_client.get_openai_client()`
3. Call `openai_client.evals.runs.output_items.list(eval_id=..., run_id=...)`
4. Serialize each item with `item.model_dump()` and save to `results/<eval-id>/<run-id>.json` (use `default=str` for non-serializable fields)
5. Print summary: total items, passed, failed, errored counts

> SDK setup: `pip install azure-ai-projects azure-identity openai`

## Step 4 — Cluster Failures by Root Cause

Analyze every row in the results. Group failures into clusters:

| Cluster | Description |
|---------|-------------|
| Incorrect / hallucinated answer | Agent gave a wrong or fabricated response |
| Incomplete answer | Agent missed key parts |
| Tool call failure | Agent failed to invoke or misused a tool |
| Safety / content violation | Flagged by safety evaluators |
| Runtime error | Agent crashed or returned an error |
| Off-topic / refusal | Agent refused or went off-topic |

Produce a **prioritized action table**:

| Priority | Cluster | Suggested Action |
|----------|---------|------------------|
| P0 | Runtime errors | Check container logs |
| P1 | Incorrect answers | Optimize prompt ([Step 6](optimize-deploy.md)) |
| P2 | Incomplete answers | Optimize prompt ([Step 6](optimize-deploy.md)) |
| P3 | Tool call failures | Fix tool definitions or instructions |
| P4 | Safety violations | Add guardrails to instructions |
| P5 | Off-topic / refusal | Clarify scope in instructions |

**Rule:** Runtime errors first (P0), then by count × severity.

## Step 5 — Dive Into Category

When the user wants to inspect a specific cluster, display the individual rows: input query, the agent's original response, evaluator scores, and failure reason. Let the user confirm which category to optimize.

## Next Steps

After clustering → proceed to [Step 6: Optimize Prompt](optimize-deploy.md).
