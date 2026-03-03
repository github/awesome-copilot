# Agent Observability Loop

Orchestrate the full eval-driven optimization cycle for a Foundry agent. This skill manages the **multi-step workflow** — auto-creating evaluators, generating test datasets, running batch evals, clustering failures, optimizing prompts, redeploying, and comparing versions. Use this skill instead of calling individual foundry-mcp evaluation tools manually.

## When to Use This Skill

USE FOR: evaluate my agent, run an eval, test my agent, check agent quality, run batch evaluation, analyze eval results, why did my eval fail, cluster failures, improve agent quality, optimize agent prompt, compare agent versions, re-evaluate after changes, set up CI/CD evals, agent monitoring, eval-driven optimization.

> ⚠️ **DO NOT manually call** `evaluation_agent_batch_eval_create`, `evaluator_catalog_create`, `evaluation_comparison_create`, or `prompt_optimize` **without reading this skill first.** This skill defines required pre-checks, artifact persistence, and multi-step orchestration that the raw tools do not enforce.

## Quick Reference

| Property | Value |
|----------|-------|
| MCP server | `foundry-mcp` |
| Key MCP tools | `evaluation_agent_batch_eval_create`, `evaluator_catalog_create`, `evaluation_comparison_create`, `prompt_optimize`, `agent_update` |
| Prerequisite | Agent deployed and running (use [deploy skill](../deploy/deploy.md)) |

## Entry Points

| User Intent | Start At |
|-------------|----------|
| "Deploy and evaluate my agent" | [Step 1: Deploy & Setup](references/deploy-and-setup.md) |
| "Evaluate my agent" / "Run an eval" | [Step 2: Evaluate](references/evaluate-step.md) |
| "Why did my eval fail?" / "Analyze results" | [Step 3: Analyze](references/analyze-results.md) |
| "Improve my agent" / "Optimize prompt" | [Step 4: Optimize](references/optimize-deploy.md) |
| "Compare agent versions" | [Step 5: Compare](references/compare-iterate.md) |
| "Set up CI/CD evals" | [Step 6: CI/CD](references/cicd-monitoring.md) |

## Before Starting — Detect Current State

1. Check `.env` for `AZURE_AI_PROJECT_ENDPOINT` and `AZURE_AI_AGENT_NAME`
2. Use `agent_get` and `agent_container_status_get` to verify the agent exists and is running
3. Use `evaluation_get` to check for existing eval runs
4. Jump to the appropriate entry point

## Behavioral Rules

1. **Auto-poll in background.** After creating eval runs or starting containers, poll in a background terminal. Only surface the final result.
2. **Confirm before changes.** Show diff/summary before modifying agent code or deploying. Wait for sign-off.
3. **Prompt for next steps.** After each step, present options. Never assume the path forward.
4. **Write scripts to files.** Python scripts go in `scripts/` — no inline code blocks.
5. **Persist eval artifacts.** Save to `evaluators/`, `datasets/`, and `results/` for version tracking (see [deploy-and-setup](references/deploy-and-setup.md) for structure).

## Related Skills

| User Intent | Skill |
|-------------|-------|
| "Analyze production traces" / "Search conversations" / "Find errors in App Insights" | [trace skill](../trace/trace.md) |
| "Debug container issues" / "Container logs" | [troubleshoot skill](../troubleshoot/troubleshoot.md) |
| "Deploy or redeploy agent" | [deploy skill](../deploy/deploy.md) |
