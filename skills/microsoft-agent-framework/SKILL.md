---
name: microsoft-agent-framework
description: 'Create, update, refactor, explain, or review Microsoft Agent Framework solutions using shared guidance plus language-specific references for .NET and Python.'
---

# Microsoft Agent Framework

Use this skill when working with applications, agents, workflows, or migrations built on Microsoft Agent Framework.

Microsoft Agent Framework is the unified successor to Semantic Kernel and AutoGen, combining their strengths with new capabilities. Because it is still in public preview and changes quickly, always ground implementation advice in the latest official documentation and samples rather than relying on stale knowledge.

## Determine the target language first

Choose the language workflow before making recommendations or code changes:

1. Use the **.NET** workflow when the repository contains `.cs`, `.csproj`, `.sln`, `.slnx`, or other .NET project files, or when the user explicitly asks for C# or .NET guidance. Follow [references/dotnet.md](references/dotnet.md).
2. Use the **Python** workflow when the repository contains `.py`, `pyproject.toml`, `requirements.txt`, or the user explicitly asks for Python guidance. Follow [references/python.md](references/python.md).
3. If the repository contains both ecosystems, match the language used by the files being edited or the user's stated target.
4. If the language is ambiguous, inspect the current workspace first and then choose the closest language-specific reference.

## Always consult live documentation

- Read the Microsoft Agent Framework overview first: <https://learn.microsoft.com/agent-framework/overview/agent-framework-overview>
- Prefer official docs and samples for the current API surface.
- Use the Microsoft Docs MCP tooling when available to fetch up-to-date framework guidance and examples.
- Treat older Semantic Kernel or AutoGen patterns as migration inputs, not as the default implementation model.

## Shared guidance

When working with Microsoft Agent Framework in any language:

- Use async patterns for agent and workflow operations.
- Implement explicit error handling and logging.
- Prefer strong typing, clear interfaces, and maintainable composition patterns.
- Use `DefaultAzureCredential` when Azure authentication is appropriate.
- Use agents for autonomous decision-making, ad hoc planning, conversation flows, tool usage, and MCP server interactions.
- Use workflows for multi-step orchestration, predefined execution graphs, long-running tasks, and human-in-the-loop scenarios.
- Support model providers such as Azure AI Foundry, Azure OpenAI, OpenAI, and others, but prefer Azure AI Foundry services for new projects when that matches user needs.
- Use thread-based or equivalent state handling, context providers, middleware, checkpointing, routing, and orchestration patterns when they fit the problem.

## Migration guidance

- If migrating from Semantic Kernel, use the official migration guide: <https://learn.microsoft.com/agent-framework/migration-guide/from-semantic-kernel/>
- If migrating from AutoGen, use the official migration guide: <https://learn.microsoft.com/agent-framework/migration-guide/from-autogen/>
- Preserve behavior first, then adopt native Agent Framework patterns incrementally.

## Workflow

1. Determine the target language and read the matching reference file.
2. Fetch the latest official docs and samples before making implementation choices.
3. Apply the shared agent and workflow guidance from this skill.
4. Use the language-specific package, repository, sample paths, and coding practices from the chosen reference.
5. When examples in the repo differ from current docs, explain the difference and follow the current supported pattern.

## References

- [.NET reference](references/dotnet.md)
- [Python reference](references/python.md)

## Completion criteria

- Recommendations match the target language.
- Package names, repository paths, and sample locations match the selected ecosystem.
- Guidance reflects current Microsoft Agent Framework documentation rather than legacy assumptions.
- Migration advice calls out Semantic Kernel and AutoGen only when relevant.
