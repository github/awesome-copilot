# Step 11 — Enable CI/CD Evals & Continuous Monitoring

After confirming the final agent version, prompt with two options:

## Option 1 — CI/CD Evaluations

*"Would you like to add automated evaluations to your CI/CD pipeline so every deployment is evaluated before going live?"*

If yes, generate a GitHub Actions workflow (e.g., `.github/workflows/agent-eval.yml`) that:

1. Triggers on push to `main` or on pull request
2. Reads evaluator definitions from `evaluators/` and test datasets from `datasets/`
3. Runs `evaluation_agent_batch_eval_create` against the newly deployed agent version
4. Fails the workflow if any evaluator score falls below configured thresholds
5. Posts a summary as a PR comment or workflow annotation

Use repository secrets for `AZURE_AI_PROJECT_ENDPOINT` and Azure credentials. Confirm the workflow file with the user before committing.

## Option 2 — Continuous Production Monitoring

*"Would you like to set up continuous evaluations to monitor your agent's quality in production?"*

If yes, generate a scheduled GitHub Actions workflow (e.g., `.github/workflows/agent-eval-scheduled.yml`) that:

1. Runs on a cron schedule (ask user preference: daily, weekly, etc.)
2. Evaluates the current production agent version using stored evaluators and datasets
3. Saves results to `results/`
4. Opens a GitHub issue or sends a notification if any score degrades below thresholds

The user may choose one, both, or neither.

## Reference

- [Azure AI Foundry Cloud Evaluation](https://learn.microsoft.com/en-us/azure/ai-foundry/how-to/develop/cloud-evaluation)
- [Hosted Agents](https://learn.microsoft.com/en-us/azure/ai-foundry/agents/concepts/hosted-agents)
