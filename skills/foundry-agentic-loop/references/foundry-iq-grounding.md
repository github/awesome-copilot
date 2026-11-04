# Foundry IQ grounding

Reference for the `foundry-agentic-loop` skill: how a GitHub Copilot SDK **hosted agent** grounds enterprise answers through a **Foundry IQ** knowledge base by consuming a governed Foundry **toolbox MCP endpoint**. `foundry-agentic-loop` decides *that* grounding is Foundry IQ; this file holds the access path, identity, refusal, validation, and escape-hatch guidance. Defer index/knowledge-base provisioning and role selection to `microsoft-foundry` and its `rbac` sub-skill.

## Primary pattern: hosted agent + toolbox MCP

Default foundry-agentic-loop grounding uses:

1. **GitHub Copilot SDK hosted agent** running on Foundry hosted agents and exposing the Responses API by default.
2. **Foundry Skills API** for behavioral instructions; the agent downloads governed skill versions into a writable temp directory at runtime.
3. One **Foundry IQ knowledge base** exposed through a Foundry toolbox connection/tool, typically a `CognitiveSearch` or Foundry IQ grounding connection backed by Azure AI Search.
4. One governed **Foundry toolbox MCP endpoint** as the only runtime tool and grounding surface the agent calls.

The hosted agent should not import `azure-search-documents`, instantiate Search clients, or call Foundry IQ retrieval APIs by default. It bridges the toolbox MCP endpoint, lets the toolbox broker grounding/tool identity, and treats the toolbox response as the source of answer evidence and citations. Direct Search or Foundry IQ calls belong only in provisioning, ingestion, or the explicitly documented diagnostic escape hatch below.

## No-bypass rule

Every enterprise answer flows through the toolbox-hosted Foundry IQ grounding tool. The app and agent must not issue ad hoc Azure AI Search queries that sidestep the knowledge base, toolbox governance, or citation contract. Direct in-code retrieval belongs only in the [escape hatch](#escape-hatch-direct-in-code-retrieval).

## Grounding identity

The primary toolbox path is brokered:

| Retrieval path | Authenticates as | Grant needed |
| --- | --- | --- |
| **Toolbox MCP grounding tool** - a Foundry IQ / `CognitiveSearch` connection attached to the toolbox | Hosted-agent **agent identity** (`agentIdentityId`) via Agent Service-brokered tool identity | Search / knowledge-base data-plane role on `agentIdentityId`; repeat after publish because agent identity can change |
| **Direct in-code retrieval escape hatch** - agent code calls Search / Foundry IQ APIs with `DefaultAzureCredential` | Hosted-agent **runtime instance managed identity** | Search Index Data Reader on the Search service, granted in `postdeploy` after the runtime identity exists |

Generated plans should make the brokered toolbox/tool identity path the default. Runtime instance managed identity Search Reader is not part of the baseline; add it only when direct retrieval is explicitly selected for troubleshooting or unsupported-tool scenarios.

The connection's auth mode decides who calls Search: a `ProjectManagedIdentity` connection calls as the project's managed identity (one validated build needed Search Index Data Reader plus Search Service Contributor on it). When proving least privilege by removing a role, wait past the connection's token cache before trusting continued access.

## Citations and refusal

Return source document, section, and anchor/chunk id for every grounded claim. Rebuild each citation (title, section, anchor, non-routable source URI) from a retrieved document that survived filtering; never pass through provider Search URLs or citation fields the model wrote. Treat "answer with zero citations" as a refusal in the API contract.

Refusal must be deterministic. Prefer a structural signal from the grounding tool - no citations survived retrieval / reranking - rather than string-matching model prose or trusting a model-reported refusal flag. Probe raw retrieval with one supported and one unsupported query first: a toolbox Search tool can return low-scoring documents instead of an empty list. If the toolbox exposes a reranker or relevance threshold, keep it environment-configurable per corpus and apply it before synthesis so weak matches become empty evidence. Otherwise filter the tool's structured documents by an environment-configured minimum score in the agent, reject malformed scores, and refuse when none survive.

## Runtime validation

Post-deploy validation must invoke the **deployed** hosted agent and cover:

1. **Known answer** - a supported question returns the expected grounded claim.
2. **Citation correctness** - every supported claim cites the expected source, section, and anchor/chunk.
3. **Freshness** - newly ingested or updated source content becomes retrievable within the documented ingestion window.
4. **No-supported-source refusal** - an unsupported question returns the exact deterministic refusal with no fabricated citation.
5. **Retrieval telemetry** - logs/traces show the toolbox grounding call, result/citation counts, latency, and refusal reason; runtime logs show no direct Search client calls.

If a known-answer query refuses with empty citations, inspect the toolbox call result and agent logs for brokered identity, role assignment, ingestion, or retrieval failures before tuning prompts.

## Escape hatch: direct in-code retrieval

Use direct in-code Search / Foundry IQ retrieval only when the toolbox path cannot support a required diagnostic or unsupported preview capability. Record it in `docs/spec.md` (SDD) or the root `README.md` (rapid), isolate it from the default agent runtime, and remove or disable it after the diagnostic is complete.

Escape-hatch implications:

- Add the direct retrieval SDK dependency only in that variant; do not include `azure-search-documents` in default hosted-agent dependencies.
- The call authenticates as the hosted-agent **runtime instance managed identity**, not `agentIdentityId`.
- Grant **Search Index Data Reader** to the runtime instance identity in a reproducible `postdeploy` hook because Bicep cannot assign a role to an identity that does not exist until the agent is deployed.
- Validate both auth paths if the app also runs direct retrieval in-process; the backend app identity and hosted-agent runtime identity need separate Search access.

Common direct-retrieval APIs include `KnowledgeAgentRetrievalClient` and `SearchIndexKnowledgeSourceParams`. Keep examples and troubleshooting for those APIs in this escape-hatch section so they are not mistaken for the primary architecture.

## Source

- [Use skills with Microsoft Foundry agents (preview) - azd](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/skills?pivots=azd#manage-skills-with-the-rest-api)
- [Curate intent-based toolbox in Foundry (preview)](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/toolbox)
- [Foundry hosted agents](https://learn.microsoft.com/en-us/azure/ai-foundry/agents/concepts/hosted-agents?view=foundry)
