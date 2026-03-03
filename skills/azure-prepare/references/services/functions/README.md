# Azure Functions

Serverless compute for event-driven workloads, APIs, and scheduled tasks.

> **⚠️ MANDATORY: Use Composition Algorithm**
>
> **NEVER synthesize Bicep or Terraform from scratch for Azure Functions.**
>
> You MUST follow the base + recipe composition workflow:
> 1. Load [selection.md](templates/selection.md) — decision tree for choosing base template + recipe
> 2. Follow [composition.md](templates/recipes/composition.md) — the algorithm for fetching and composing
>
> This ensures proven IaC patterns, correct RBAC, and Flex Consumption defaults.

## When to Use

- Event-driven workloads
- Scheduled tasks (cron jobs)
- HTTP APIs with variable traffic
- Message/queue processing
- Real-time file processing
- MCP servers for AI agents
- Real-time streaming and event processing
- Orchestrations and workflows (Durable Functions)

## Service Type in azure.yaml

```yaml
services:
  my-function:
    host: function
    project: ./src/my-function
```

## Required Supporting Resources

| Resource | Purpose |
|----------|---------|
| Storage Account | Function runtime state |
| App Service Plan | Hosting (Consumption or Premium) |
| Application Insights | Monitoring |

## Hosting Plans

**Use Flex Consumption for new deployments** (all AZD templates default to Flex).

| Plan | Use Case | Scaling | VNET |
|------|----------|---------|------|
| **Flex Consumption** ⭐ | Default for new projects | Auto, pay-per-execution | ✅ |
| Consumption (Y1) | Variable workloads, cost optimization | Auto, scale to zero | ❌ |
| Premium (EP1-EP3) | No cold starts, longer execution | Auto, min instances | ✅ |
| Dedicated | Predictable load, existing App Service | Manual or auto | ✅ |

## Runtime Stacks

> **⚠️ ALWAYS QUERY OFFICIAL DOCUMENTATION FOR VERSIONS**
>
> Do NOT use hardcoded versions. Query for latest GA versions before generating code:
>
> **Primary Source:** [Azure Functions Supported Languages](https://learn.microsoft.com/en-us/azure/azure-functions/supported-languages)
>
> Use the azure-documentation MCP tool to fetch current supported versions:
> ```yaml
> intent: "Azure Functions supported language runtime versions"
> learn: true
> ```

### Version Selection Priority
1. **Latest GA** — For new projects (best features, longest support window)
2. **LTS** — For enterprise/compliance requirements
3. **User-specified** — When explicitly requested

| Language | FUNCTIONS_WORKER_RUNTIME | linuxFxVersion |
|----------|-------------------------|----------------|
| Node.js | `node` | `Node\|<version>` |
| Python | `python` | `Python\|<version>` |
| .NET | `dotnet-isolated` | `DOTNET-ISOLATED\|<version>` |
| Java | `java` | `Java\|<version>` |
| PowerShell | `powershell` | `PowerShell\|<version>` |

## References

- **[Selection Guide](templates/selection.md)** — Start here: decision tree for base + recipe
- **[Composition Algorithm](templates/recipes/composition.md)** — How to fetch and compose templates
- [AZD Templates](templates/README.md) — Template overview
- [Bicep Patterns](bicep.md)
- [Terraform Patterns](terraform.md)
- [Trigger Types](triggers.md)
- [Durable Functions](durable.md)
- [Aspire + Container Apps](aspire-containerapps.md)
