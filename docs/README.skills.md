# 🎯 Agent Skills

Agent Skills are self-contained folders with instructions and bundled resources that enhance AI capabilities for specialized tasks. Based on the [Agent Skills specification](https://agentskills.io/specification), each skill contains a `SKILL.md` file with detailed instructions that agents load on-demand.

Skills differ from other primitives by supporting bundled assets (scripts, code samples, reference data) that agents can utilize when performing specialized tasks.
### How to Use Agent Skills

**What's Included:**
- Each skill is a folder containing a `SKILL.md` instruction file
- Skills may include helper scripts, code templates, or reference data
- Skills follow the Agent Skills specification for maximum compatibility

**When to Use:**
- Skills are ideal for complex, repeatable workflows that benefit from bundled resources
- Use skills when you need code templates, helper utilities, or reference data alongside instructions
- Skills provide progressive disclosure - loaded only when needed for specific tasks

**Usage:**
- Browse the skills table below to find relevant capabilities
- Copy the skill folder to your local skills directory
- Reference skills in your prompts or let the agent discover them automatically

| Name | Description | Bundled Assets |
| ---- | ----------- | -------------- |
| [appinsights-instrumentation](../skills/appinsights-instrumentation/SKILL.md) | Instrument a webapp to send useful telemetry data to Azure App Insights | `LICENSE.txt`<br />`examples/appinsights.bicep`<br />`references/ASPNETCORE.md`<br />`references/AUTO.md`<br />`references/NODEJS.md`<br />`references/PYTHON.md`<br />`scripts/appinsights.ps1` |
| [azure-resource-visualizer](../skills/azure-resource-visualizer/SKILL.md) | Analyze Azure resource groups and generate detailed Mermaid architecture diagrams showing the relationships between individual resources. Use this skill when the user asks for a diagram of their Azure resources or help in understanding how the resources relate to each other. | `LICENSE.txt`<br />`assets/template-architecture.md` |
| [azure-role-selector](../skills/azure-role-selector/SKILL.md) | When user is asking for guidance for which role to assign to an identity given desired permissions, this agent helps them understand the role that will meet the requirements with least privilege access and how to apply that role. | `LICENSE.txt` |
| [azure-static-web-apps](../skills/azure-static-web-apps/SKILL.md) | Helps create, configure, and deploy Azure Static Web Apps using the SWA CLI. Use when deploying static sites to Azure, setting up SWA local development, configuring staticwebapp.config.json, adding Azure Functions APIs to SWA, or setting up GitHub Actions CI/CD for Static Web Apps. | None |
| [github-issues](../skills/github-issues/SKILL.md) | Create, update, and manage GitHub issues using MCP tools. Use this skill when users want to create bug reports, feature requests, or task issues, update existing issues, add labels/assignees/milestones, or manage issue workflows. Triggers on requests like "create an issue", "file a bug", "request a feature", "update issue X", or any GitHub issue management task. | `references/templates.md` |
| [microsoft-code-reference](../skills/microsoft-code-reference/SKILL.md) | Look up Microsoft API references, find working code samples, and verify SDK code is correct. Use when working with Azure SDKs, .NET libraries, or Microsoft APIs—to find the right method, check parameters, get working examples, or troubleshoot errors. Catches hallucinated methods, wrong signatures, and deprecated patterns by querying official docs. | None |
| [microsoft-docs](../skills/microsoft-docs/SKILL.md) | Query official Microsoft documentation to understand concepts, find tutorials, and learn how services work. Use for Azure, .NET, Microsoft 365, Windows, Power Platform, and all Microsoft technologies. Get accurate, current information from learn.microsoft.com and other official Microsoft websites—architecture overviews, quickstarts, configuration guides, limits, and best practices. | None |
| [nuget-manager](../skills/nuget-manager/SKILL.md) | Manage NuGet packages in .NET projects/solutions. Use this skill when adding, removing, or updating NuGet package versions. It enforces using `dotnet` CLI for package management and provides strict procedures for direct file edits only when updating versions. | None |
| [snowflake-semanticview](../skills/snowflake-semanticview/SKILL.md) | Create, alter, and validate Snowflake semantic views using Snowflake CLI (snow). Use when asked to build or troubleshoot semantic views/semantic layer definitions with CREATE/ALTER SEMANTIC VIEW, to validate semantic-view DDL against Snowflake via CLI, or to guide Snowflake CLI installation and connection setup. | None |
| [vscode-ext-commands](../skills/vscode-ext-commands/SKILL.md) | Guidelines for contributing commands in VS Code extensions. Indicates naming convention, visibility, localization and other relevant attributes, following VS Code extension development guidelines, libraries and good practices | None |
| [vscode-ext-localization](../skills/vscode-ext-localization/SKILL.md) | Guidelines for proper localization of VS Code extensions, following VS Code extension development guidelines, libraries and good practices | None |
| [web-design-reviewer](../skills/web-design-reviewer/SKILL.md) | This skill enables visual inspection of websites running locally or remotely to identify and fix design issues. Triggers on requests like "review website design", "check the UI", "fix the layout", "find design problems". Detects issues with responsive design, accessibility, visual consistency, and layout breakage, then performs fixes at the source code level. | `references/framework-fixes.md`<br />`references/visual-checklist.md` |
| [webapp-testing](../skills/webapp-testing/SKILL.md) | Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs. | `test-helper.js` |
