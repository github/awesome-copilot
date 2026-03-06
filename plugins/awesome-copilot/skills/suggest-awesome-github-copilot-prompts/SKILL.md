---
name: suggest-awesome-github-copilot-prompts
description: 'Suggest relevant GitHub Copilot prompt files from the awesome-copilot repository based on current repository context and chat history, avoiding duplicates with existing prompts in this repository, and identifying outdated prompts that need updates.'
---

# Suggest Awesome GitHub Copilot Prompts

Analyze current repository context and suggest relevant prompt files from the [GitHub awesome-copilot repository](https://github.com/github/awesome-copilot/blob/main/docs/README.prompts.md) that are not already available in this repository.

## Process

1. **Fetch Available Prompts**: Extract prompt list and descriptions from [awesome-copilot README.prompts.md](https://github.com/github/awesome-copilot/blob/main/docs/README.prompts.md). Must use `#fetch` tool.
2. **Scan Local Prompts**: Discover existing prompt files in `.github/prompts/` folder
3. **Extract Descriptions**: Read front matter from local prompt files to get descriptions
4. **Fetch Remote Versions**: For each local prompt, fetch the corresponding version from awesome-copilot repository using raw GitHub URLs (e.g., `https://raw.githubusercontent.com/github/awesome-copilot/main/prompts/<filename>`)
5. **Compare Versions**: Compare local prompt content with remote versions to identify:
   - Prompts that are up-to-date (exact match)
   - Prompts that are outdated (content differs)
   - Key differences in outdated prompts (tools, description, content)
6. **Analyze Context**: Review chat history, repository files, and current project needs
7. **Compare Existing**: Check against prompts already available in this repository
8. **Match Relevance**: Compare available prompts against identified patterns and requirements
9. **Present Options**: Display relevant prompts with descriptions, rationale, and availability status including outdated prompts
10. **Validate**: Ensure suggested prompts would add value not already covered by existing prompts
11. **Output**: Provide structured table with suggestions, descriptions, and links to both awesome-copilot prompts and similar local prompts
    **AWAIT** user request to proceed with installation or updates of specific prompts. DO NOT INSTALL OR UPDATE UNLESS DIRECTED TO DO SO.
12. **Download/Update Assets**: For requested prompts, automatically:
    - Download new prompts to `.github/prompts/` folder
    - Update outdated prompts by replacing with latest version from awesome-copilot
    - Do NOT adjust content of the files
    - Use `#fetch` tool to download assets, but may use `curl` using `#runInTerminal` tool to ensure all content is retrieved
    - Use `#todos` tool to track progress

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
| [code-review.prompt.md](https://github.com/github/awesome-copilot/blob/main/prompts/code-review.prompt.md) | Automated code review prompts | ❌ No | None | Would enhance development workflow with standardized code review processes |
| [documentation.prompt.md](https://github.com/github/awesome-copilot/blob/main/prompts/documentation.prompt.md) | Generate project documentation | ✅ Yes | create_oo_component_documentation.prompt.md | Already covered by existing documentation prompts |
| [debugging.prompt.md](https://github.com/github/awesome-copilot/blob/main/prompts/debugging.prompt.md) | Debug assistance prompts | ⚠️ Outdated | debugging.prompt.md | Tools configuration differs: remote uses `'codebase'` vs local missing - Update recommended |

## Local Prompts Discovery Process

1. List all `*.prompt.md` files in `.github/prompts/` directory
2. For each discovered file, read front matter to extract `description`
3. Build comprehensive inventory of existing prompts
4. Use this inventory to avoid suggesting duplicates

## Version Comparison Process

1. For each local prompt file, construct the raw GitHub URL to fetch the remote version:
   - Pattern: `https://raw.githubusercontent.com/github/awesome-copilot/main/prompts/<filename>`
2. Fetch the remote version using the `#fetch` tool
3. Compare entire file content (including front matter and body)
4. Identify specific differences:
   - **Front matter changes** (description, tools, mode)
   - **Tools array modifications** (added, removed, or renamed tools)
   - **Content updates** (instructions, examples, guidelines)
5. Document key differences for outdated prompts
6. Calculate similarity to determine if update is needed

## Requirements

- Use `githubRepo` tool to get content from awesome-copilot repository prompts folder
- Scan local file system for existing prompts in `.github/prompts/` directory
- Read YAML front matter from local prompt files to extract descriptions
- Compare local prompts with remote versions to detect outdated prompts
- Compare against existing prompts in this repository to avoid duplicates
- Focus on gaps in current prompt library coverage
- Validate that suggested prompts align with repository's purpose and standards
- Provide clear rationale for each suggestion
- Include links to both awesome-copilot prompts and similar local prompts
- Clearly identify outdated prompts with specific differences noted
- Don't provide any additional information or context beyond the table and the analysis


## Icons Reference

- ✅ Already installed and up-to-date
- ⚠️ Installed but outdated (update available)
- ❌ Not installed in repo

## Update Handling

When outdated prompts are identified:
1. Include them in the output table with ⚠️ status
2. Document specific differences in the "Suggestion Rationale" column
3. Provide recommendation to update with key changes noted
4. When user requests update, replace entire local file with remote version
5. Preserve file location in `.github/prompts/` directory
