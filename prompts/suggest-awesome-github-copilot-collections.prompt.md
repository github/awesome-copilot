---
agent: 'agent'
description: 'Suggest relevant GitHub Copilot collections from the awesome-copilot repository based on current repository context and chat history, providing automatic download and installation of collection assets.'
tools: ['edit', 'search', 'runCommands', 'runTasks', 'think', 'changes', 'testFailure', 'openSimpleBrowser', 'fetch', 'githubRepo', 'todos', 'search']
---
# Suggest Awesome GitHub Copilot Collections

Analyze current repository context and suggest relevant collections from the [GitHub awesome-copilot repository](https://github.com/github/awesome-copilot/blob/main/docs/README.collections.md) that would enhance the development workflow for this repository.

## Process

1. **Fetch Available Collections**: Extract collection list and descriptions from [awesome-copilot README.collections.md](https://github.com/github/awesome-copilot/blob/main/docs/README.collections.md). Must use `#fetch` tool.
2. **Scan Local Assets**: Discover existing prompt files in `prompts/`, instruction files in `instructions/`, and chat modes in `agents/` folders
3. **Extract Local Descriptions**: Read front matter from local asset files to understand existing capabilities
4. **Analyze Repository Context**: Review chat history, repository files, programming languages, frameworks, and current project needs
5. **Match Collection Relevance**: Compare available collections against identified patterns and requirements
6. **Check Asset Overlap**: For relevant collections, analyze individual items to avoid duplicates with existing repository assets
7. **Present Collection Options**: Display relevant collections with descriptions, item counts, and rationale for suggestion
8. **Provide Usage Guidance**: Explain how the installed collection enhances the development workflow
   **AWAIT** user request to proceed with installation of specific collections. DO NOT INSTALL UNLESS DIRECTED TO DO SO.
9. **Download Assets**: For requested collections, automatically download and install each individual asset (prompts, instructions, chat modes) to appropriate directories. Do NOT adjust content of the files. Prioritize use of `#fetch` tool to download assets, but may use `curl` using `#runInTerminal` tool to ensure all content is retrieved.

## Context Analysis Criteria

🔍 **Repository Patterns**:
- Programming languages used (.cs, .js, .py, .ts, .bicep, .tf, etc.)
- Framework indicators (ASP.NET, React, Azure, Next.js, Angular, etc.)
- Project types (web apps, APIs, libraries, tools, infrastructure)
- Documentation needs (README, specs, ADRs, architectural decisions)
- Development workflow indicators (CI/CD, testing, deployment)

🗨️ **Chat History Context**:
- Recent discussions and pain points
- Feature requests or implementation needs
- Code review patterns and quality concerns
- Development workflow requirements and challenges
- Technology stack and architecture decisions

## Output Format

Display analysis results in structured table showing relevant collections and their potential value:

### Collection Recommendations

| Collection Name | Description | Items | Asset Overlap | Suggestion Rationale |
|-----------------|-------------|-------|---------------|---------------------|
| [Azure & Cloud Development](https://github.com/github/awesome-copilot/blob/main/collections/azure-cloud-development.md) | Comprehensive Azure cloud development tools including Infrastructure as Code, serverless functions, architecture patterns, and cost optimization | 15 items | 3 similar | Would enhance Azure development workflow with Bicep, Terraform, and cost optimization tools |
| [C# .NET Development](https://github.com/github/awesome-copilot/blob/main/collections/csharp-dotnet-development.md) | Essential prompts, instructions, and chat modes for C# and .NET development including testing, documentation, and best practices | 7 items | 2 similar | Already covered by existing .NET-related assets but includes advanced testing patterns |
| [Testing & Test Automation](https://github.com/github/awesome-copilot/blob/main/collections/testing-automation.md) | Comprehensive collection for writing tests, test automation, and test-driven development | 11 items | 1 similar | Could significantly improve testing practices with TDD guidance and automation tools |

### Asset Analysis for Recommended Collections

For each suggested collection, break down individual assets:

**Azure & Cloud Development Collection Analysis:**
- ✅ **New Assets (12)**: Azure cost optimization prompts, Bicep planning mode, AVM modules, Logic Apps expert mode
- ⚠️ **Similar Assets (3)**: Azure DevOps pipelines (similar to existing CI/CD), Terraform (basic overlap), Containerization (Docker basics covered)
- 🎯 **High Value**: Cost optimization tools, Infrastructure as Code expertise, Azure-specific architectural guidance

**Installation Preview:**
- Will install to `prompts/`: 4 Azure-specific prompts
- Will install to `instructions/`: 6 infrastructure and DevOps best practices
- Will install to `agents/`: 5 specialized Azure expert modes

## Local Asset Discovery Process

1. **Scan Asset Directories**:
   - List all `*.prompt.md` files in `prompts/` directory
   - List all `*.instructions.md` files in `instructions/` directory
   - List all `*.agent.md` files in `agents/` directory

2. **Extract Asset Metadata**: For each discovered file, read YAML front matter to extract:
   - `description` - Primary purpose and functionality
   - `tools` - Required tools and capabilities
   - `mode` - Operating mode (for prompts)
   - `model` - Specific model requirements (for chat modes)

3. **Build Asset Inventory**: Create comprehensive map of existing capabilities organized by:
   - **Technology Focus**: Programming languages, frameworks, platforms
   - **Workflow Type**: Development, testing, deployment, documentation, planning
   - **Specialization Level**: General purpose vs. specialized expert modes

4. **Identify Coverage Gaps**: Compare existing assets against:
   - Repository technology stack requirements
   - Development workflow needs indicated by chat history
   - Industry best practices for identified project types
   - Missing expertise areas (security, performance, architecture, etc.)

## Collection Asset Download Process

When user confirms a collection installation:

1. **Fetch Collection Manifest**: Get collection YAML from awesome-copilot repository
2. **Download Individual Assets**: For each item in collection:
   - Download raw file content from GitHub
   - Validate file format and front matter structure
   - Check naming convention compliance
3. **Install to Appropriate Directories**:
   - `*.prompt.md` files → `prompts/` directory
   - `*.instructions.md` files → `instructions/` directory
   - `*.agent.md` files → `agents/` directory
4. **Avoid Duplicates**: Skip files that are substantially similar to existing assets
5. **Report Installation**: Provide summary of installed assets and usage instructions

## Requirements

- Use `fetch` tool to get collections data from awesome-copilot repository
- Use `githubRepo` tool to get individual asset content for download
- Scan local file system for existing assets in `prompts/`, `instructions/`, and `agents/` directories
- Read YAML front matter from local asset files to extract descriptions and capabilities
- Compare collections against repository context to identify relevant matches
- Focus on collections that fill capability gaps rather than duplicate existing assets
- Validate that suggested collections align with repository's technology stack and development needs
- Provide clear rationale for each collection suggestion with specific benefits
- Enable automatic download and installation of collection assets to appropriate directories
- Ensure downloaded assets follow repository naming conventions and formatting standards
- Provide usage guidance explaining how collections enhance the development workflow
- Include links to both awesome-copilot collections and individual assets within collections

## Collection Installation Workflow

1. **User Confirms Collection**: User selects specific collection(s) for installation
2. **Fetch Collection Manifest**: Download YAML manifest from awesome-copilot repository
3. **Asset Download Loop**: For each asset in collection:
   - Download raw content from GitHub repository
   - Validate file format and structure
   - Check for substantial overlap with existing local assets
   - Install to appropriate directory (`prompts/`, `instructions/`, or `agents/`)
4. **Installation Summary**: Report installed assets with usage instructions
5. **Workflow Enhancement Guide**: Explain how the collection improves development capabilities

## Post-Installation Guidance

After installing a collection, provide:
- **Asset Overview**: List of installed prompts, instructions, and chat modes
- **Usage Examples**: How to activate and use each type of asset
- **Workflow Integration**: Best practices for incorporating assets into development process
- **Customization Tips**: How to modify assets for specific project needs
- **Related Collections**: Suggestions for complementary collections that work well together


## Icons Reference

- ✅ Collection recommended for installation
- ⚠️ Collection has some asset overlap but still valuable
- ❌ Collection not recommended (significant overlap or not relevant)
- 🎯 High-value collection that fills major capability gaps
- 📁 Collection partially installed (some assets skipped due to duplicates)
- 🔄 Collection needs customization for repository-specific needs
