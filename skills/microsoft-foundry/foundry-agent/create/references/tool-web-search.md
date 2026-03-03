# Web Search Tool (Preview)

Enables agents to retrieve and ground responses with real-time public web information before generating output. Returns up-to-date answers with inline URL citations. This is the **default tool for web search** — no external resource or connection setup required.

> ⚠️ **Warning:** For Bing Grounding or Bing Custom Search (which require a separate Bing resource and project connection), see [tool-bing-grounding.md](tool-bing-grounding.md). Only use those when explicitly requested.

## Important Disclosures

- Web Search (preview) uses Grounding with Bing Search and Grounding with Bing Custom Search, which are [First Party Consumption Services](https://www.microsoft.com/licensing/terms/product/Glossary/EAEAS) governed by [Grounding with Bing terms of use](https://www.microsoft.com/bing/apis/grounding-legal-enterprise) and the [Microsoft Privacy Statement](https://go.microsoft.com/fwlink/?LinkId=521839&clcid=0x409).
- The [Data Protection Addendum](https://aka.ms/dpa) **does not apply** to data sent to Grounding with Bing Search and Grounding with Bing Custom Search.
- Data transfers occur **outside compliance and geographic boundaries**.
- Usage incurs costs — see [pricing](https://www.microsoft.com/bing/apis/grounding-pricing).

## Prerequisites

- A [basic or standard agent environment](https://learn.microsoft.com/azure/ai-foundry/agents/environment-setup)
- Azure credentials configured (e.g., `DefaultAzureCredential`)

## Setup

No external resource or project connection is required. The web search tool works out of the box when added to an agent definition.

## Configuration Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `user_location` | Approximate location (country/region/city) for localized results | None |
| `search_context_size` | Context window space for search: `low`, `medium`, `high` | `medium` |

## Administrator Control

Admins can enable or disable web search at the subscription level via Azure CLI. Requires Owner or Contributor access.

- **Disable:** `az feature register --name OpenAI.BlockedTools.web_search --namespace Microsoft.CognitiveServices --subscription "<subscription-id>"`
- **Enable:** `az feature unregister --name OpenAI.BlockedTools.web_search --namespace Microsoft.CognitiveServices --subscription "<subscription-id>"`

## Security Considerations

- Treat web search results as **untrusted input**. Validate before use in downstream systems.
- Avoid sending secrets or sensitive data in prompts forwarded to external services.

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| No citations appear | Model didn't determine web search was needed | Update instructions to explicitly allow web search; ask queries requiring current info |
| Requests fail after enabling | Web search disabled at subscription level | Ask admin to enable — see Administrator Control above |
| Authentication errors (REST) | Bearer token missing, expired, or insufficient | Refresh token; confirm project/agent access |
| Outdated results | Content not recently indexed by Bing | Refine query to request most recent info |
| No results for specific topics | Query too narrow | Broaden query; niche topics may have limited coverage |
| Rate limiting (429) | Too many requests | Implement exponential backoff; space out requests |

## References

- [Web Search tool documentation](https://learn.microsoft.com/azure/ai-foundry/agents/how-to/tools/web-search?view=foundry)
- [Tool Catalog](https://learn.microsoft.com/azure/ai-foundry/agents/concepts/tool-catalog?view=foundry)
- [Bing Pricing](https://www.microsoft.com/bing/apis/grounding-pricing)
