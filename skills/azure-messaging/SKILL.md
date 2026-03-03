---
name: azure-messaging
description: "Troubleshoot and resolve issues with Azure Messaging SDKs for Event Hubs and Service Bus. Covers connection failures, authentication errors, message processing issues, and SDK configuration problems. USE FOR: event hub SDK error, service bus SDK issue, messaging connection failure, AMQP error, event processor host issue, message lock lost, send timeout, receiver disconnected, SDK troubleshooting, azure messaging SDK, event hub consumer, service bus queue issue, topic subscription error, enable logging event hub, service bus logging, eventhub python, servicebus java, eventhub javascript, servicebus dotnet, event hub checkpoint, event hub not receiving messages, service bus dead letter DO NOT USE FOR: creating Event Hub or Service Bus resources (use azure-prepare), monitoring metrics (use azure-observability), cost analysis (use azure-cost-optimization)"
license: MIT
metadata:
  author: Microsoft
  version: "1.0.0"
---

# Azure Messaging SDK Troubleshooting

## Quick Reference

| Property | Value |
|----------|-------|
| **Services** | Azure Event Hubs, Azure Service Bus |
| **MCP Tools** | `mcp_azure_mcp_eventhubs`, `mcp_azure_mcp_servicebus` |
| **Best For** | Diagnosing SDK connection, auth, and message processing issues |

## When to Use This Skill

- SDK connection failures, auth errors, or AMQP link errors
- Message lock lost, session lock, or send/receive timeouts
- Event processor or message handler stops processing
- SDK configuration questions (retry, prefetch, batch size)

## MCP Tools

| Tool | Command | Use |
|------|---------|-----|
| `mcp_azure_mcp_eventhubs` | Namespace/hub ops | List namespaces, hubs, consumer groups |
| `mcp_azure_mcp_servicebus` | Queue/topic ops | List namespaces, queues, topics, subscriptions |
| `mcp_azure_mcp_monitor` | `logs_query` | Query diagnostic logs with KQL |
| `mcp_azure_mcp_resourcehealth` | `get` | Check service health status |
| `mcp_azure_mcp_documentation` | Doc search | Search Microsoft Learn for troubleshooting docs |

## Diagnosis Workflow

1. **Identify the SDK and version** — Ask which language SDK and version the user is on
2. **Check resource health** — Use `mcp_azure_mcp_resourcehealth` to verify the namespace is healthy
3. **Review the error message** — Match against language-specific troubleshooting guide
4. **Look up documentation** — Use `mcp_azure_mcp_documentation` to search Microsoft Learn for the error or topic
5. **Check configuration** — Verify connection string, entity name, consumer group
6. **Recommend fix** — Apply remediation, citing documentation found


## Connectivity Troubleshooting

See [Service Troubleshooting Guide](references/service-troubleshooting.md) for ports, WebSocket fallback, IP firewall, private endpoints, and service tags.

## SDK Troubleshooting Guides

- **Event Hubs**: [Python](references/sdk/azure-eventhubs-py.md) | [Java](references/sdk/azure-eventhubs-java.md) | [JS](references/sdk/azure-eventhubs-js.md) | [.NET](references/sdk/azure-eventhubs-dotnet.md)
- **Service Bus**: [Python](references/sdk/azure-servicebus-py.md) | [Java](references/sdk/azure-servicebus-java.md) | [JS](references/sdk/azure-servicebus-js.md) | [.NET](references/sdk/azure-servicebus-dotnet.md)

## References

Use `mcp_azure_mcp_documentation` to search Microsoft Learn for latest guidance. See [Service Troubleshooting Guide](references/service-troubleshooting.md) for network and service-level docs.