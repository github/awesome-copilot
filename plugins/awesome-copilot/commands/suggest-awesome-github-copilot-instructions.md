---
agent: 'agent'
description: 'Suggest relevant GitHub Copilot instruction files from the awesome-copilot repository based on current repository context and chat history, avoiding duplicates with existing instructions in this repository, and identifying outdated instructions that need updates.'
tools: ['edit', 'search', 'runCommands', 'runTasks', 'think', 'changes', 'testFailure', 'openSimpleBrowser', 'web/fetch', 'githubRepo', 'todos', 'search']
---
# Suggest Awesome GitHub Copilot Instructions

Analyze current repository context and suggest relevant copilot-instruction files from the [GitHub awesome-copilot repository](https://github.com/github/awesome-copilot/blob/main/docs/README.instructions.md) that are not already available in this repository.

## Process

1. **Fetch Available Instructions**: Extract instruction list and descriptions from [awesome-copilot README.instructions.md](https://github.com/github/awesome-copilot/blob/main/docs/README.instructions.md). Must use `#fetch` tool.
2. **Scan Local Instructions**: Discover existing instruction files in `.github/instructions/` folder
3. **Extract Descriptions**: Read front matter from local instruction files to get descriptions and `applyTo` patterns
4. **Fetch Remote Versions**: For each local instruction, fetch the corresponding version from awesome-copilot repository using raw GitHub URLs (e.g., `https://raw.githubusercontent.com/github/awesome-copilot/main/instructions/<filename>`)
5. **Compare Versions**: Compare local instruction content with remote versions to identify:
   - Instructions that are up-to-date (exact match)
   - Instructions that are outdated (content differs)
   - Key differences in outdated instructions (description, applyTo patterns, content)
6. **Analyze Context**: Review chat history, repository files, and current project needs
7. **Compare Existing**: Check against instructions already available in this repository
8. **Match Relevance**: Compare available instructions against identified patterns and requirements
9. **Present Options**: Display relevant instructions with descriptions, rationale, and availability status including outdated instructions
10. **Validate**: Ensure suggested instructions would add value not already covered by existing instructions
11. **Output**: Provide structured table with suggestions, descriptions, and links to both awesome-copilot instructions and similar local instructions
   **AWAIT** user request to proceed with installation or updates of specific instructions. DO NOT INSTALL OR UPDATE UNLESS DIRECTED TO DO SO.
12. **Download/Update Assets**: For requested instructions, automatically:
    - Download new instructions to `.github/instructions/` folder
    - Update outdated instructions by replacing with latest version from awesome-copilot
    - Do NOT adjust content of the files
    - Use `#fetch` tool to download assets, but may use `curl` using `#runInTerminal` tool to ensure all content is retrieved
    - Use `#todos` tool to track progress

## Context Analysis Criteria

🔍 **Repository Patterns**:
- Programming languages used (.cs, .js, .py, .ts, etc.)
- Framework indicators (ASP.NET, React, Azure, Next.js, etc.)
- Project types (web apps, APIs, libraries, tools)
- Development workflow requirements (testing, CI/CD, deployment)

🗨️ **Chat History Context**:
- Recent discussions and pain points
- Technology-specific questions
- Coding standards discussions
- Development workflow requirements

## Output Format

Display analysis results in structured table comparing awesome-copilot instructions with existing repository instructions:

| Awesome-Copilot Instruction | Description | Already Installed | Similar Local Instruction | Suggestion Rationale |
|------------------------------|-------------|-------------------|---------------------------|---------------------|
| [blazor.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/blazor.instructions.md) | Blazor development guidelines | ✅ Yes | blazor.instructions.md | Already covered by existing Blazor instructions |
| [reactjs.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/reactjs.instructions.md) | ReactJS development standards | ❌ No | None | Would enhance React development with established patterns |
| [java.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/java.instructions.md) | Java development best practices | ⚠️ Outdated | java.instructions.md | applyTo pattern differs: remote uses `'**/*.java'` vs local `'*.java'` - Update recommended |

## Local Instructions Discovery Process

1. List all `*.instructions.md` files in the `instructions/` directory
2. For each discovered file, read front matter to extract `description` and `applyTo` patterns
3. Build comprehensive inventory of existing instructions with their applicable file patterns
4. Use this inventory to avoid suggesting duplicates

## Version Comparison Process

1. For each local instruction file, construct the raw GitHub URL to fetch the remote version:
   - Pattern: `https://raw.githubusercontent.com/github/awesome-copilot/main/instructions/<filename>`
2. Fetch the remote version using the `#fetch` tool
3. Compare entire file content (including front matter and body)
4. Identify specific differences:
   - **Front matter changes** (description, applyTo patterns)
   - **Content updates** (guidelines, examples, best practices)
5. Document key differences for outdated instructions
6. Calculate similarity to determine if update is needed

## File Structure Requirements

Based on GitHub documentation, copilot-instructions files should be:
- **Repository-wide instructions**: `.github/copilot-instructions.md` (applies to entire repository)
- **Path-specific instructions**: `.github/instructions/NAME.instructions.md` (applies to specific file patterns via `applyTo` frontmatter)
- **Community instructions**: `instructions/NAME.instructions.md` (for sharing and distribution)

## Front Matter Structure

Instructions files in awesome-copilot use this front matter format:
```markdown
---
description: 'Brief description of what this instruction provides'
applyTo: '**/*.js,**/*.ts' # Optional: glob patterns for file matching
---
```

## Requirements

- Use `githubRepo` tool to get content from awesome-copilot repository instructions folder
- Scan local file system for existing instructions in `.github/instructions/` directory
- Read YAML front matter from local instruction files to extract descriptions and `applyTo` patterns
- Compare local instructions with remote versions to detect outdated instructions
- Compare against existing instructions in this repository to avoid duplicates
- Focus on gaps in current instruction library coverage
- Validate that suggested instructions align with repository's purpose and standards
- Provide clear rationale for each suggestion
- Include links to both awesome-copilot instructions and similar local instructions
- Clearly identify outdated instructions with specific differences noted
- Consider technology stack compatibility and project-specific needs
- Don't provide any additional information or context beyond the table and the analysis

## Icons Reference

- ✅ Already installed and up-to-date
- ⚠️ Installed but outdated (update available)
- ❌ Not installed in repo

## Update Handling

When outdated instructions are identified:
1. Include them in the output table with ⚠️ status
2. Document specific differences in the "Suggestion Rationale" column
3. Provide recommendation to update with key changes noted
4. When user requests update, replace entire local file with remote version
5. Preserve file location in `.github/instructions/` directory
