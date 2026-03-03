# Bing Grounding Tool

Access real-time web information via Bing Search. Unlike the [Web Search tool](tool-web-search.md) (which works out of the box), Bing Grounding requires a dedicated Bing resource and a project connection.

> ⚠️ **Warning:** Use the [Web Search tool](tool-web-search.md) as the default for web search. Only use Bing Grounding when the user **explicitly** requests Grounding with Bing Search or Grounding with Bing Custom Search.

## When to Use

- User explicitly asks for "Bing Grounding" or "Grounding with Bing Search"
- User explicitly asks for "Bing Custom Search" or "Grounding with Bing Custom Search"
- User needs to restrict web search to specific domains (Bing Custom Search)
- User has an existing Bing Grounding resource they want to use

## Prerequisites

- A [Grounding with Bing Search resource](https://portal.azure.com/#create/Microsoft.BingGroundingSearch) in Azure portal
- `Contributor` or `Owner` role at subscription/RG level to create Bing resource and get keys
- `Azure AI Project Manager` role on the project to create a connection
- A project connection configured with the Bing resource key — see [connections](../../../project/connections.md)

## Setup

1. Register the Bing provider: `az provider register --namespace 'Microsoft.Bing'`
2. Create a Grounding with Bing Search resource in the Azure portal
3. Create a project connection with the Bing resource key — see [connections](../../../project/connections.md)
4. Set `BING_PROJECT_CONNECTION_NAME` environment variable

## Important Disclosures

- Bing data flows **outside Azure compliance boundary**
- Review [Grounding with Bing terms of use](https://www.microsoft.com/bing/apis/grounding-legal-enterprise)
- Not supported with VPN/Private Endpoints
- Usage incurs costs — see [pricing](https://www.microsoft.com/bing/apis/grounding-pricing)

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Connection not found | Name mismatch or wrong project | Use `foundry_connections_list` to find correct name |
| Unauthorized creating connection | Missing Azure AI Project Manager role | Assign role on the Foundry project |
| Bing resource creation fails | Provider not registered | Run `az provider register --namespace 'Microsoft.Bing'` |
| No results returned | Connection misconfigured | Verify Bing resource key and connection setup |

## References

- [Bing Grounding tool documentation](https://learn.microsoft.com/azure/ai-foundry/agents/how-to/tools/bing-grounding?view=foundry)
- [Tool Catalog](https://learn.microsoft.com/azure/ai-foundry/agents/concepts/tool-catalog?view=foundry)
- [Grounding with Bing Terms](https://www.microsoft.com/bing/apis/grounding-legal-enterprise)
- [Connections Guide](../../../project/connections.md)
- [Web Search Tool (default)](tool-web-search.md)
