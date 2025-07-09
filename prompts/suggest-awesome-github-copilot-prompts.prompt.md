---
mode: 'agent'
description: 'Suggest relevant GitHub Copilot prompt files from the awesome-copilot repository based on current repository context and chat history, avoiding duplicates with existing prompts in this repository.'
tools: ['changes', 'codebase', 'editFiles', 'fetch', 'findTestFiles', 'githubRepo', 'new', 'openSimpleBrowser', 'problems', 'runCommands', 'runTasks', 'runTests', 'search', 'searchResults', 'terminalLastCommand', 'terminalSelection', 'testFailure', 'usages', 'vscodeAPI', 'github']
---
# Suggest Awesome GitHub Copilot Prompts

Analyze current repository context and suggest relevant prompt files from the [GitHub awesome-copilot repository](https://github.com/github/awesome-copilot/tree/main/prompts) that are not already available in this repository.

## Process

1. **Fetch Available Prompts**: Extract prompt list and descriptions from [awesome-copilot README](https://github.com/github/awesome-copilot/blob/main/README.md)
2. **Scan Local Prompts**: Discover existing prompt files in `.github/prompts/` folder
3. **Extract Descriptions**: Read front matter from local prompt files to get descriptions
4. **Analyze Context**: Review chat history, repository files, and current project needs
5. **Compare Existing**: Check against prompts already available in this repository
6. **Match Relevance**: Compare available prompts against identified patterns and requirements
7. **Present Options**: Display relevant prompts with descriptions, rationale, and availability status
8. **Validate**: Ensure suggested prompts would add value not already covered by existing prompts
9. **Output**: Provide structured table with suggestions, descriptions, and links to both awesome-copilot prompts and similar local prompts
10. **Next Steps**: If any suggestions are made, provide instructions that GitHub Copilot will be able to follow to add the suggested prompts to the repository by downloading the file into the prompts directory. Offer to do this automatically if the user confirms.

## Context Analysis Criteria

🔍 **Repository Patterns**:
- Programming languages used (.cs, .js, .py, etc.)
- Framework indicators (ASP.NET, React, Azure, etc.)
- Project types (web apps, APIs, libraries, tools)
- Documentation needs (README, specs, ADRs)

🗨️ **Chat History Context**:
- Recent discussions and pain points
- Feature requests or implementation needs
- Code review patterns
- Development workflow requirements

## Output Format

Display analysis results in structured table comparing awesome-copilot prompts with existing repository prompts:

| Awesome-Copilot Prompt | Description | Already Installed | Similar Local Prompt | Suggestion Rationale |
|-------------------------|-------------|-------------------|---------------------|---------------------|
| [code-review.md](https://github.com/github/awesome-copilot/blob/main/prompts/code-review.md) | Automated code review prompts | ❌ No | None | Would enhance development workflow with standardized code review processes |
| [documentation.md](https://github.com/github/awesome-copilot/blob/main/prompts/documentation.md) | Generate project documentation | ✅ Yes | create_oo_component_documentation.prompt.md | Already covered by existing documentation prompts |
| [debugging.md](https://github.com/github/awesome-copilot/blob/main/prompts/debugging.md) | Debug assistance prompts | ❌ No | None | Could improve troubleshooting efficiency for development team |

## Local Prompts Discovery Process

1. List all `*.prompt.md` files directory `.github/prompts/`.
2. For each discovered file, read front matter to extract `description`
3. Build comprehensive inventory of existing prompts
4. Use this inventory to avoid suggesting duplicates

## Requirements

- Use `githubRepo` tool to get content from awesome-copilot repository
- Scan local file system for existing prompts in `.github/prompts/` directory
- Read YAML front matter from local prompt files to extract descriptions
- Compare against existing prompts in this repository to avoid duplicates
- Focus on gaps in current prompt library coverage
- Validate that suggested prompts align with repository's purpose and standards
- Provide clear rationale for each suggestion
- Include links to both awesome-copilot prompts and similar local prompts
- Don't provide any additional information or context beyond the table and the analysis


## Icons Reference

- ✅ Already installed in repo
- ❌ Not installed in repo
