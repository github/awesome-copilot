# Microsoft Agent Framework for .NET

Use this reference when the target project is written in C# or another .NET language.

## Authoritative sources

- Repository: <https://github.com/microsoft/agent-framework/tree/main/dotnet>
- Samples: <https://github.com/microsoft/agent-framework/tree/main/dotnet/samples>

## Installation

For new projects, install the package with:

```bash
dotnet add package Microsoft.Agents.AI
```

## .NET-specific guidance

- Use `async`/`await` patterns consistently for agent operations and workflow execution.
- Follow .NET type-safety and dependency-injection conventions.
- Keep service registration, configuration, and authentication aligned with standard .NET hosting patterns.
- Use middleware, context providers, and orchestration components idiomatically within the .NET application model.
- Check the latest .NET samples before introducing new APIs or workflow patterns.
