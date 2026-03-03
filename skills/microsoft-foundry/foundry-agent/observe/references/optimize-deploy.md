# Steps 6–7 — Optimize Prompt & Deploy New Version

## Step 6 — Optimize Prompt

Use **`prompt_optimize`** with:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `developerMessage` | ✅ | Agent's current system prompt / instructions |
| `deploymentName` | ✅ | Model for optimization (e.g., `gpt-4o-mini`) |
| `projectEndpoint` or `foundryAccountResourceId` | ✅ | At least one required |
| `requestedChanges` | | Concise improvement suggestions from cluster analysis |

**Example `requestedChanges`:** *"Be more specific when answering geography questions"*, *"Always cite sources when providing factual claims"*

> Use the optimized prompt returned by the tool. Do NOT manually rewrite.

## Step 7 — Deploy New Version

> **Always confirm before deploying.** Show the user a diff or summary of prompt changes and wait for explicit sign-off.

After approval:

1. Use **`agent_update`** to create a new agent version with the optimized prompt
2. Start the container with **`agent_container_control`** (action: `start`)
3. Poll **`agent_container_status_get`** in a **background terminal** until status is `Running`

## Next Steps

When the new version is running → proceed to [Step 8: Re-Evaluate](compare-iterate.md).
