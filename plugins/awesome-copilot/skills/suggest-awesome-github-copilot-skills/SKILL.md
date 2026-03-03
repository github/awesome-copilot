---
name: suggest-awesome-github-copilot-skills
description: 'Suggest relevant GitHub Copilot skills from the awesome-copilot repository based on current repository context and chat history, avoiding duplicates with existing skills in this repository, and identifying outdated skills that need updates.'
---

# Suggest Awesome GitHub Copilot Skills

Analyze current repository context and suggest relevant Agent Skills from the [GitHub awesome-copilot repository](https://github.com/github/awesome-copilot/blob/main/docs/README.skills.md) that are not already available in this repository. Agent Skills are self-contained folders located in the [skills](https://github.com/github/awesome-copilot/tree/main/skills) folder of the awesome-copilot repository, each containing a `SKILL.md` file with instructions and optional bundled assets.

## Process

1. **Fetch Available Skills**: Extract skills list and descriptions from [awesome-copilot README.skills.md](https://github.com/github/awesome-copilot/blob/main/docs/README.skills.md). Must use `#fetch` tool.
2. **Scan Local Skills**: Discover existing skill folders in `.github/skills/` folder
3. **Extract Descriptions**: Read front matter from local `SKILL.md` files to get `name` and `description`
4. **Fetch Remote Versions**: For each local skill, fetch the corresponding `SKILL.md` from awesome-copilot repository using raw GitHub URLs (e.g., `https://raw.githubusercontent.com/github/awesome-copilot/main/skills/<skill-name>/SKILL.md`)
5. **Compare Versions**: Compare local skill content with remote versions to identify:
   - Skills that are up-to-date (exact match)
   - Skills that are outdated (content differs)
   - Key differences in outdated skills (description, instructions, bundled assets)
6. **Analyze Context**: Review chat history, repository files, and current project needs
7. **Compare Existing**: Check against skills already available in this repository
8. **Match Relevance**: Compare available skills against identified patterns and requirements
9. **Present Options**: Display relevant skills with descriptions, rationale, and availability status including outdated skills
10. **Validate**: Ensure suggested skills would add value not already covered by existing skills
11. **Output**: Provide structured table with suggestions, descriptions, and links to both awesome-copilot skills and similar local skills
    **AWAIT** user request to proceed with installation or updates of specific skills. DO NOT INSTALL OR UPDATE UNLESS DIRECTED TO DO SO.
12. **Download/Update Assets**: For requested skills, automatically:
    - Download new skills to `.github/skills/` folder, preserving the folder structure
    - Update outdated skills by replacing with latest version from awesome-copilot
    - Download both `SKILL.md` and any bundled assets (scripts, templates, data files)
    - Do NOT adjust content of the files
    - Use `#fetch` tool to download assets, but may use `curl` using `#runInTerminal` tool to ensure all content is retrieved
    - Use `#todos` tool to track progress

## Context Analysis Criteria

🔍 **Repository Patterns**:
- Programming languages used (.cs, .js, .py, .ts, etc.)
- Framework indicators (ASP.NET, React, Azure, Next.js, etc.)
- Project types (web apps, APIs, libraries, tools, infrastructure)
- Development workflow requirements (testing, CI/CD, deployment)
- Infrastructure and cloud providers (Azure, AWS, GCP)

🗨️ **Chat History Context**:
- Recent discussions and pain points
- Feature requests or implementation needs
- Code review patterns
- Development workflow requirements
- Specialized task needs (diagramming, evaluation, deployment)

## Output Format

Display analysis results in structured table comparing awesome-copilot skills with existing repository skills:

| Awesome-Copilot Skill | Description | Bundled Assets | Already Installed | Similar Local Skill | Suggestion Rationale |
|-----------------------|-------------|----------------|-------------------|---------------------|---------------------|
| [gh-cli](https://github.com/github/awesome-copilot/tree/main/skills/gh-cli) | GitHub CLI skill for managing repositories and workflows | None | ❌ No | None | Would enhance GitHub workflow automation capabilities |
| [aspire](https://github.com/github/awesome-copilot/tree/main/skills/aspire) | Aspire skill for distributed application development | 9 reference files | ✅ Yes | aspire | Already covered by existing Aspire skill |
| [terraform-azurerm-set-diff-analyzer](https://github.com/github/awesome-copilot/tree/main/skills/terraform-azurerm-set-diff-analyzer) | Analyze Terraform AzureRM provider changes | Reference files | ⚠️ Outdated | terraform-azurerm-set-diff-analyzer | Instructions updated with new validation patterns - Update recommended |

## Local Skills Discovery Process

1. List all folders in `.github/skills/` directory
2. For each folder, read `SKILL.md` front matter to extract `name` and `description`
3. List any bundled assets within each skill folder
4. Build comprehensive inventory of existing skills with their capabilities
5. Use this inventory to avoid suggesting duplicates

## Version Comparison Process

1. For each local skill folder, construct the raw GitHub URL to fetch the remote `SKILL.md`:
   - Pattern: `https://raw.githubusercontent.com/github/awesome-copilot/main/skills/<skill-name>/SKILL.md`
2. Fetch the remote version using the `#fetch` tool
3. Compare entire file content (including front matter and body)
4. Identify specific differences:
   - **Front matter changes** (name, description)
   - **Instruction updates** (guidelines, examples, best practices)
   - **Bundled asset changes** (new, removed, or modified assets)
5. Document key differences for outdated skills
6. Calculate similarity to determine if update is needed

## Skill Structure Requirements

Based on the Agent Skills specification, each skill is a folder containing:
- **`SKILL.md`**: Main instruction file with front matter (`name`, `description`) and detailed instructions
- **Optional bundled assets**: Scripts, templates, reference data, and other files referenced from `SKILL.md`
- **Folder naming**: Lowercase with hyphens (e.g., `azure-deployment-preflight`)
- **Name matching**: The `name` field in `SKILL.md` front matter must match the folder name

## Front Matter Structure

Skills in awesome-copilot use this front matter format in `SKILL.md`:
```markdown
---
name: 'skill-name'
description: 'Brief description of what this skill provides and when to use it'
---
```

## Requirements

- Use `fetch` tool to get content from awesome-copilot repository skills documentation
- Use `githubRepo` tool to get individual skill content for download
- Scan local file system for existing skills in `.github/skills/` directory
- Read YAML front matter from local `SKILL.md` files to extract names and descriptions
- Compare local skills with remote versions to detect outdated skills
- Compare against existing skills in this repository to avoid duplicates
- Focus on gaps in current skill library coverage
- Validate that suggested skills align with repository's purpose and technology stack
- Provide clear rationale for each suggestion
- Include links to both awesome-copilot skills and similar local skills
- Clearly identify outdated skills with specific differences noted
- Consider bundled asset requirements and compatibility
- Don't provide any additional information or context beyond the table and the analysis

## Icons Reference

- ✅ Already installed and up-to-date
- ⚠️ Installed but outdated (update available)
- ❌ Not installed in repo

## Update Handling

When outdated skills are identified:
1. Include them in the output table with ⚠️ status
2. Document specific differences in the "Suggestion Rationale" column
3. Provide recommendation to update with key changes noted
4. When user requests update, replace entire local skill folder with remote version
5. Preserve folder location in `.github/skills/` directory
6. Ensure all bundled assets are downloaded alongside the updated `SKILL.md`
