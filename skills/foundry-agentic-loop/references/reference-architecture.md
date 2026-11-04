# Reference architecture service map

Reference for the `foundry-agentic-loop` skill: maps reference-architecture areas to the Azure services and companion skills to add **only when the spec needs them**. `foundry-agentic-loop` matches the spec against this map during skill suggestion; it is not a default resource list.

Use this map to propose additional Azure services only when they are needed or desired by the spec. Do not turn every reference-architecture box into a default resource. The greenfield baseline is a Foundry hosted agent on a Foundry model, with one toolbox carrying its skills, tools and grounding. The framework follows SKILL.md's rule: the Copilot SDK for agents that use runtime skills, Microsoft Agent Framework for basic agents and explicit workflows.

| Reference architecture area | Add when the spec needs | Suggested service / capability | Skill |
| --- | --- | --- | --- |
| Hosted Agent | Hosted runtime, agent deployment, prompt agent, agent tools, evals, model deployment, project setup | Azure AI Foundry hosted agents, Foundry projects, Foundry models, Foundry evals | `microsoft/azure-skills` / `microsoft-foundry` |
| Foundry Models | Frontier model deployment, region/SKU selection, quota/capacity planning | Foundry model deployments | `microsoft/azure-skills` / `microsoft-foundry` |
| Foundry IQ | Grounded knowledge, retrieval, vector/hybrid search, OCR/document extraction, speech features | Foundry IQ knowledge base exposed through the toolbox MCP endpoint; Azure AI Search / Document Intelligence / Speech as backing services when needed | `microsoft/azure-skills` / `azure-ai` - see [`foundry-iq-grounding.md`](foundry-iq-grounding.md) for the brokered toolbox path and direct-retrieval escape hatch |
| Work IQ / Microsoft 365 integration | Microsoft Graph, delegated auth, enterprise workflow integration, agent identity | Entra app registration or Entra Agent ID; use a Work IQ-specific skill if available outside `microsoft/azure-skills` | `microsoft/azure-skills` / `entra-app-registration`, `entra-agent-id` |
| Fabric IQ / analytics grounding | Analytics data, KQL exploration, data lake or blob-backed grounding | Azure Data Explorer for KQL analytics; Azure Storage/Data Lake for files and grounding data | `microsoft/azure-skills` / `azure-kusto`, `azure-storage` |
| Toolbox / APIs / MCP tools | API front door, MCP governance, tool routing, quotas, rate limits, semantic caching | Azure API Management as AI Gateway | `microsoft/azure-skills` / `azure-aigateway` |
| Control plane: Evals | Quality, safety, cost, and regression gates on traces | Foundry Evals and continuous evaluation | `microsoft/azure-skills` / `microsoft-foundry` |
| Control plane: Content Safety | Centralized LLM policies, jailbreak detection, content safety, token limits | AI Gateway policies and/or Foundry guardrails | `microsoft/azure-skills` / `azure-aigateway`, `microsoft-foundry` |
| Control plane: Observability | Telemetry, traces, metrics, app monitoring, KQL diagnostics | Application Insights, Azure Monitor, Log Analytics/KQL | `microsoft/azure-skills` / `appinsights-instrumentation`, `azure-kusto`, `azure-diagnostics` |
| Azure foundation | Deployment scaffold, validation, deployment execution, least-privilege access | azd/Bicep prep, validation, deploy, RBAC | `microsoft/azure-skills` / `azure-prepare`, `azure-validate`, `azure-deploy`, and the `microsoft-foundry/rbac` sub-skill |
