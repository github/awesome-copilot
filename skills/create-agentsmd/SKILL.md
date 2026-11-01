---
name: create-agentsmd
description: 'Prompt for generating an AGENTS.md file for a repository'
---
# Create high‑quality AGENTS.md file

You are a code agent. Your task is to create a complete, accurate AGENTS.md at the root of this repository that follows the public guidance at https://agents.md/.

AGENTS.md is an open format designed to provide coding agents with the context and instructions they need to work effectively on a project.

## What is AGENTS.md?

AGENTS.md is a Markdown file that serves as a "README for agents" - a dedicated, predictable place to provide context and instructions to help AI coding agents work on your project. It complements README.md by containing detailed technical context that coding agents need but might clutter a human-focused README.

## Key Principles

- **Agent-focused** : Make every token count. Prioritize context that helps the agent make better decisions in any session, and link to task-specific details for when they are needed
- **Complements README.md**: Doesn't replace human documentation but adds agent-specific context
- **Standardized location**: Placed at repository root (or subproject roots for monorepos)
- **Open format**: Uses standard Markdown with flexible structure
- **Minimal size**: Keep it as small as possible while preserving essential, actionable instructions. Remove redundancy and link to existing documentation instead of duplicating it
- **Ecosystem compatibility**: Works across 20+ different AI coding tools and agents

## File Structure and Content Guidelines

### 1. File Requirements

- Create the file as `AGENTS.md` in the repository root
- Use standard Markdown formatting
- No required fields - flexible structure based on project needs

### 2. Sections to Consider

Choose sections and detail based on the project. Short command lists and concise rules can stay inline or link to an existing command block. Link longer explanations and procedures to a coherent documentation range or dedicated skill. Group related topics under one reference when they are documented together; separate links only when they help agents find distinct content.

#### Project Overview

- Brief description of what the project does
- Architecture overview
- Key technologies and frameworks used

#### Setup

Keep the full setup guide in human documentation or a dedicated skill, where dependencies, prerequisites, configuration, and troubleshooting can be explained together. AGENTS.md should briefly say when to consult it and link to the relevant range; a simple installation command can stay inline if it is sufficient.

- Installation instructions
- Environment setup steps
- Dependency management commands
- Database setup if applicable

#### Development Workflow

- How to start development server
- Watch/hot-reload commands
- Package manager specifics (npm, pnpm, yarn, etc.)

#### Testing Instructions

Keep a short list of test commands and essential requirements inline, or link to the testing command block. Use a broader reference for explanations of suite selection, fixtures, coverage, or failure diagnosis.

- How to run tests (unit, integration, e2e)
- Test file locations and naming conventions
- Coverage requirements
- Specific test patterns or frameworks used
- How to run a subset of tests or focus on specific areas

#### Code Style Guidelines

Use the topics below as links to the relevant blocks in external documentation or a dedicated skill. Simple lint/format commands can stay inline when useful; convention topics should point to their content rather than serve as placeholders for expanding it inside AGENTS.md.

- Language-specific conventions
- Linting and formatting rules
- File organization patterns
- Naming conventions
- Import/export patterns

#### Build and Deployment

Build commands and output paths can be a few inline entries or one link to the command block. Link deployment procedures when they involve environment configuration, prerequisites, release steps, or recovery guidance; a single deployment command needs no separate guide if it is sufficient.

- Build commands and outputs
- Environment configurations
- Deployment steps and requirements
- CI/CD pipeline information

### 3. Optional but Recommended Sections

#### Security Considerations

- Security testing requirements
- Secrets management
- Authentication patterns
- Permission models

#### Monorepo Instructions (if applicable)

- How to work with multiple packages
- Cross-package dependencies
- Selective build/test commands or a shared reference when the workflow needs explanation
- Package-specific commands

#### Pull Request Guidelines

Keep brief requirements such as the title format, required checks, and commit convention inline. Link the contribution or review workflow as a block when it needs more explanation; do not create a separate reference just for a title format.

- Title format requirements
- Required checks before submission
- Review process
- Commit message conventions

#### Debugging and Troubleshooting

- Keep a short, recurring fix inline when useful
- Link longer diagnosis and recovery procedures to the relevant documentation range or dedicated skill, indicating when to consult it

## Example Template

Use this as a starting template, keeping applicable topics and filling placeholders with concise rules or commands. Use shared references for detail, omit redundant entries, and replace example paths and line ranges with verified ones:

```markdown
# AGENTS.md

## Project Overview

[Brief description of the project, its purpose, and key technologies]

## Setup References

- For first-time setup, consult [Setup: dependencies, environment, database, and troubleshooting — README.md, lines 45–90](./README.md#L45-L90).

## Development Workflow

- Start development server: `[command]`
- Watch for changes: `[command]`

## Testing Instructions

- Run all tests: `[command]`
- Run unit tests: `[command]`
- Run integration tests: `[command]`
- Test coverage: `[command]`
- For test selection and specific requirements, consult [Testing guide — README.md, lines 91–120](./README.md#L91-L120).

## Code Style Guidelines

- [Language and framework conventions — CONTRIBUTING.md, lines 45–59](./CONTRIBUTING.md#L45-L59)
- [Linting rules and commands — CONTRIBUTING.md, lines 60–69](./CONTRIBUTING.md#L60-L69)
- [Formatting requirements — CONTRIBUTING.md, lines 70–79](./CONTRIBUTING.md#L70-L79)
- [File organization patterns — CONTRIBUTING.md, lines 80–90](./CONTRIBUTING.md#L80-L90)

## Build and Deployment

- Build: `[command]`
- Output: `[directory]`
- For environment-specific builds and deployment steps, consult [Build and deployment guide — README.md, lines 121–160](./README.md#L121-L160).

## Pull Request Guidelines

- Title format: [component] Brief description
- Required checks: `[lint command]`, `[test command]`
- Commit messages: [brief convention]
- For the full submission and review workflow, consult [Contribution guide — CONTRIBUTING.md, lines 91–130](./CONTRIBUTING.md#L91-L130).

## Additional Notes

- [Any project-specific context]
- For environment troubleshooting, consult [Setup and troubleshooting — README.md, lines 45–90](./README.md#L45-L90).
- [Performance considerations]
```

## Implementation Steps

1. **Analyze the project structure** to understand:

   - Programming languages and frameworks used
   - Package managers and build tools
   - Testing frameworks
   - Project architecture (monorepo, single package, etc.)
2. **Identify key workflows** by examining:

   - package.json scripts
   - Makefile or other build files
   - CI/CD configuration files
   - Documentation files
3. **Choose useful content for each section**:

   - Keep short commands, concise rules, and useful topic lists inline where they help
   - Link setup and other extended procedures to coherent documentation ranges or dedicated skills
   - Group related guidance under a shared reference rather than creating a link for every item
4. **Include specific, actionable commands** where a short list is sufficient, or link to an existing command block
5. **Verify the instructions** by checking retained commands and referenced content, including line ranges
6. **Keep it focused** on what agents need to know, not general project information

## Best Practices

- **Prioritize relevance across sessions**: A good AGENTS.md contains information useful in every session; unused content reduces its effectiveness. Link to task-specific procedures for agents to read when needed instead of detailing workflows a session may never use.
- **Choose detail by usefulness**: Short command lists and rules can stay inline or link to a shared block. Keep extended setup, troubleshooting, and other procedures in documentation or dedicated skills; preserve useful topic lists without requiring a link per item.
- **Be specific**: Include exact commands, not vague descriptions
- **Use code blocks**: Wrap commands in backticks for clarity
- **Link to relevant ranges**: Point to a coherent block, e.g. `[README.md — lines 45–90](./README.md#L45-L90)`. Related items can share one reference; use separate links when they lead to distinct guidance. Verify ranges and update them when content moves.
- **Include context**: Explain why certain steps are needed
- **Stay current**: Update as the project evolves
- **Test commands**: Ensure all listed commands actually work
- **Consider nested files**: For monorepos, create AGENTS.md files in subprojects as needed

## Monorepo Considerations

For large monorepos:

- Place a main AGENTS.md at the repository root
- Create additional AGENTS.md files in subproject directories
- The closest AGENTS.md file takes precedence for any given location
- Include navigation tips between packages/projects

## Final Notes

- AGENTS.md works with 20+ AI coding tools including Cursor, Aider, Gemini CLI, and many others
- The format is intentionally flexible - adapt it to your project's needs
- Focus on actionable instructions that help agents understand and work with your codebase
- This is living documentation - update it as your project evolves

When creating the AGENTS.md file, prioritize clarity, completeness, and actionability. The goal is to give any coding agent enough context to effectively contribute to the project without requiring additional human guidance.
