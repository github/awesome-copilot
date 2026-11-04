# Foundry models selector

Choose the model, version, SKU, capacity and region for each deployment the solution needs. SDD declares the deployments in `azure.yaml` under `services.ai-project.deployments[]` ([azd-layout.md](azd-layout.md#azureyaml)) and `azd provision` creates them. Rapid reuses the project's deployments and asks before adding one. Both record the selection in `.azure/deployment-plan.md`. Resolve live quota, availability and provisioning commands through `microsoft-foundry`.

> The catalog changes monthly. Resolve exact versions, SKUs, registration and regional availability live through `microsoft-foundry` and the [Azure-direct models](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure) and [region availability](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability) pages; never copy a version from memory.

## Starting points by task

Recommend the first fit, then offer alternatives only when cost, region, quota or registration blocks it. Prefer GA for production and flag Preview or registration-required models before deploying.

| Task | Start with | Consider when needed |
| --- | --- | --- |
| Chat, agents, tools | `gpt-5.4-mini` (SDD default) | a nano tier for cost; a flagship tier for hard reasoning or very long context |
| Deep reasoning | the current GPT flagship | an o-series mini for cost |
| Coding | the current Codex model | `gpt-4.1` for very large contexts |
| Multimodal input | `gpt-5.4-mini` | the flagship for long context |
| Embeddings | `text-embedding-3-large` | `text-embedding-3-small` for cost |
| Rerank | Cohere rerank (current version) | its fast tier for latency |
| Image, audio, video, document AI | the current GA model in that family | Preview models only with approval |
| Cost-optimized routing | `model-router` | only where it is offered (few regions) |

## Joint region and capacity preflight

Treat placement as one subscription-specific decision, not a static model lookup. Before persisting `AZURE_LOCATION` or declaring a deployment, validate every required resource in each candidate region:

| Resource | Validate live |
| --- | --- |
| Foundry model | Exact model, version, SKU, requested capacity/quota, and registration status |
| Azure AI Search | Required SKU availability and regional feature support |
| Foundry hosted agents | Hosted-agent availability for the target project/account shape |
| Preview dependencies | Required provider/feature registration and regional availability |

Start with the preferred region, then use the target subscription's live availability and quota checks through the maintained `microsoft-foundry` guidance. If any required resource fails, reject that candidate and rank alternatives that satisfy the **complete** resource set; do not move one resource independently unless the architecture explicitly supports cross-region placement.

Write the placement decision to `./.azure/deployment-plan.md`:

| Field | Value |
| --- | --- |
| Preferred location | User/data-residency preference |
| Deployed location | First candidate that passed the joint preflight |
| Evidence | Model/version/SKU/capacity, Search SKU, hosted-agent, and preview checks |
| Variance | Reason deployed location differs, or `none` |

When the deployed location differs from the preferred location, update `./docs/spec.md` (SDD) before implementation continues.

## Record the selection

Only after the joint preflight passes:

- Set the region: `azd env set AZURE_LOCATION "<region>"` (SDD).
- Declare each deployment in `azure.yaml` `services.ai-project.deployments[]` with its deployment `name`, model `name`, `format` (`OpenAI`, `Microsoft`, `MistralAI`, `Cohere`, `DeepSeek`, `Meta`, `xAI`, ...), `version`, and `sku` `name` (usually `GlobalStandard`) and `capacity` (thousands of tokens per minute).
- Record the preferred and deployed locations, each deployment and the evidence in `.azure/deployment-plan.md`.

## Workflow

1. Take the task and modality (chat, reasoning, coding, multimodal, embeddings, rerank, image generation, video, audio, document AI) from the spec or brief; ask only when neither states it.
2. Recommend the starting point for the task and resolve its current GA version live.
3. Confirm the preferred region. Start with `eastus2` (broadest Azure OpenAI coverage); prefer `swedencentral` for EU data residency.
4. Confirm capacity. Defaults: **100** (chat / reasoning / coding), **30** (embeddings), **50** (image / audio). When one end-to-end request makes several model calls, size chat capacity to at least four times its estimated tokens, within the remaining quota, so Verify can run E2E cases in parallel. GlobalStandard bills per token, so the headroom costs nothing; record the sizing in the deployment plan.
5. Flag any **registration-required** or **Preview** models explicitly before deploying.
6. Run the joint live preflight for the model and every co-located required service; rank only complete placements.
7. [Record the selection](#record-the-selection).
8. **Reconcile actual availability.** If provisioning selects a different model or location, update `./docs/spec.md` and `./.azure/deployment-plan.md` immediately.
