# AGENTS.md

## Project Overview

The Awesome GitHub Copilot repository is a community-driven collection of custom agents and instructions designed to enhance GitHub Copilot experiences across various domains, languages, and use cases. The project includes:

- **Agents** - Specialized GitHub Copilot agents that integrate with MCP servers
- **Instructions** - Coding standards and best practices applied to specific file patterns
- **Skills** - Self-contained folders with instructions and bundled resources for specialized tasks
- **Hooks** - Automated workflows triggered by specific events during development
- **Workflows** - [Agentic Workflows](https://github.github.com/gh-aw) for AI-powered repository automation in GitHub Actions
- **Plugins** - Installable packages that group related agents, commands, and skills around specific themes

## Repository Structure

```
.
├── agents/           # Custom GitHub Copilot agent definitions (.agent.md files)
├── instructions/     # Coding standards and guidelines (.instructions.md files)
├── skills/           # Agent Skills folders (each with SKILL.md and optional bundled assets)
├── hooks/            # Automated workflow hooks (folders with README.md + hooks.json)
├── workflows/        # Agentic Workflows (.md files for GitHub Actions automation)
├── plugins/          # Installable plugin packages (folders with plugin.json)
├── extensions/       # Canvas extensions (each with extension.mjs and plugin metadata)
├── docs/             # Documentation for different resource types
├── eng/              # Build and automation scripts
└── scripts/          # Utility scripts
```

## Setup Commands

```bash
# Install dependencies
npm ci

# Build the project (generates README.md and marketplace.json)
npm run build

# Validate plugin manifests
npm run plugin:validate

# Generate marketplace.json only
npm run plugin:generate-marketplace

# Create a new plugin
npm run plugin:create -- --name <plugin-name>

# Validate agent skills
npm run skill:validate

# Create a new skill
npm run skill:create -- --name <skill-name>
```

## Development Workflow

### Working with Agents, Instructions, Skills, and Hooks

All agent files (`*.agent.md`) and instruction files (`*.instructions.md`) must include proper markdown front matter. Agent Skills are folders containing a `SKILL.md` file with frontmatter and optional bundled assets. Hooks are folders containing a `README.md` with frontmatter and a `hooks.json` configuration file:

#### Agent Files (\*.agent.md)

- Must have `description` field (wrapped in single quotes)
- File names should be lower case with words separated by hyphens
- Recommended to include `tools` field
- Strongly recommended to specify `model` field

#### Instruction Files (\*.instructions.md)

- Must have `description` field (wrapped in single quotes, not empty)
- Must have `applyTo` field specifying file patterns (e.g., `'**.js, **.ts'`)
- File names should be lower case with words separated by hyphens

#### Agent Skills (skills/\*/SKILL.md)

- Each skill is a folder containing a `SKILL.md` file
- SKILL.md must have `name` field (lowercase with hyphens, matching folder name, max 64 characters)
- SKILL.md must have `description` field (wrapped in single quotes, 10-1024 characters)
- Folder names should be lower case with words separated by hyphens
- Skills can include bundled assets (scripts, templates, data files)
- Bundled assets should be referenced in the SKILL.md instructions
- Asset files should be reasonably sized (under 5MB per file)
- Skills follow the [Agent Skills specification](https://agentskills.io/specification)

#### Canvas Extensions (extensions/\*)

- Each extension folder must include `extension.mjs`
- Extension metadata must live at `.github/plugin/plugin.json`
- Extension `plugin.json` **must** follow the convention:
  - `name`, `description`, `version` are required
  - `logo` **must** be exactly `"assets/preview.png"` (enforced convention)
  - `extensions` **must** be exactly `"."` in source manifests (materialization rewrites this to `"extensions"` for distribution output)
  - Optional: `author`, `keywords` fields
  - **Must not** include `x-awesome-copilot` field (use convention-based `assets/preview.png` only)
- Each extension must have `assets/preview.png` as the primary visual asset
- Do not add `canvas.json`; website metadata is sourced from `.github/plugin/plugin.json`

#### Hook Folders (hooks/\*/README.md)

- Each hook is a folder containing a `README.md` file with frontmatter
- README.md must have `name` field (human-readable name)
- README.md must have `description` field (wrapped in single quotes, not empty)
- Must include a `hooks.json` file with hook configuration (hook events extracted from this file)
- Folder names should be lower case with words separated by hyphens
- Can include bundled assets (scripts, utilities, configuration files)
- Bundled scripts should be referenced in the README.md and hooks.json
- Follow the [GitHub Copilot hooks specification](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/use-hooks)
- Optionally includes `tags` field for categorization

#### Workflow Files (workflows/\*.md)

- Each workflow is a standalone `.md` file in the `workflows/` directory
- Must have `name` field (human-readable name)
- Must have `description` field (wrapped in single quotes, not empty)
- Contains agentic workflow frontmatter (`on`, `permissions`, `safe-outputs`) and natural language instructions
- File names should be lower case with words separated by hyphens
- Only `.md` files are accepted — `.yml`, `.yaml`, and `.lock.yml` files are blocked by CI
- Follow the [GitHub Agentic Workflows specification](https://github.github.com/gh-aw/reference/workflow-structure/)

#### Plugin Folders (plugins/\*)

- Each plugin is a folder containing a `.github/plugin/plugin.json` file with metadata
- plugin.json must have `name` field (matching the folder name)
- plugin.json must have `description` field (describing the plugin's purpose)
- plugin.json must have `version` field (semantic version, e.g., "1.0.0")
- Plugin content is defined declaratively in plugin.json using Claude Code spec fields (`agents`, `commands`, `skills`). Source files live in top-level directories and are materialized into plugins by CI.
- The `marketplace.json` file is automatically generated from all plugins during build
- Plugins are discoverable and installable via GitHub Copilot CLI

### Adding New Resources

When adding a new agent, instruction, skill, hook, workflow, or plugin:

**For Agents and Instructions:**

1. Create the file with proper front matter
2. Add the file to the appropriate directory
3. Update the README.md by running: `npm run build`
4. Verify the resource appears in the generated README

**For Hooks:**

1. Create a new folder in `hooks/` with a descriptive name
2. Create `README.md` with proper frontmatter (name, description, hooks, tags)
3. Create `hooks.json` with hook configuration following GitHub Copilot hooks spec
4. Add any bundled scripts or assets to the folder
5. Make scripts executable: `chmod +x script.sh`
6. Update the README.md by running: `npm run build`
7. Verify the hook appears in the generated README

**For Workflows:**

1. Create a new `.md` file in `workflows/` with a descriptive name (e.g., `daily-issues-report.md`)
2. Include frontmatter with `name` and `description`, plus agentic workflow fields (`on`, `permissions`, `safe-outputs`)
3. Compile with `gh aw compile --validate` to verify it's valid
4. Update the README.md by running: `npm run build`
5. Verify the workflow appears in the generated README

**For Skills:**

1. Run `npm run skill:create` to scaffold a new skill folder
2. Edit the generated SKILL.md file with your instructions
3. Add any bundled assets (scripts, templates, data) to the skill folder
4. Run `npm run skill:validate` to validate the skill structure
5. Update the README.md by running: `npm run build`
6. Verify the skill appears in the generated README

**For Plugins:**

1. Run `npm run plugin:create -- --name <plugin-name>` to scaffold a new plugin
2. Define agents, commands, and skills in `plugin.json` using Claude Code spec fields
3. Edit the generated `plugin.json` with your metadata
4. Run `npm run plugin:validate` to validate the plugin structure
5. Run `npm run build` to update README.md and marketplace.json
6. Verify the plugin appears in `.github/plugin/marketplace.json`

**For Canvas Extensions:**

1. Create/update the extension in `extensions/<extension-id>/` with `extension.mjs`
2. Add `.github/plugin/plugin.json` metadata (required: `name`, `description`, `version`, `logo: "assets/preview.png"`, `extensions: "."`; optional: `author`, `keywords`)
3. Ensure `assets/preview.png` exists as the primary visual asset
4. Run `npm run plugin:validate` to validate plugin and extension metadata
5. Run `npm run build` to regenerate website data and marketplace output

**For External Plugins:**

1. Do not open a direct PR that edits `plugins/external.json` for a public third-party plugin submission
2. Public external plugin submissions use the external plugin issue workflow documented in [CONTRIBUTING.md](CONTRIBUTING.md#adding-external-plugins)
3. In v1, only GitHub-hosted plugins are accepted for public submission, using a public repo plus an immutable `ref`, `sha`, or both
4. The shared validator in `eng/external-plugin-validation.mjs` is the canonical source of truth for external plugin data rules; reuse it instead of duplicating checks in scripts or workflows
5. Submission issues move through `external-plugin` + `awaiting-review` and then either `ready-for-review` or `requires-submitter-fixes` based on automated quality gates
6. After issue edits, the issue author or a maintainer can comment `/rerun-intake` to re-run automated intake and quality gates without opening a new submission issue
7. Maintainers can explicitly override a quality-gate blocker with `/mark-ready-for-review [optional reason]`, which moves the issue to `ready-for-review`
8. Maintainers make the decision with `/approve` or `/reject <reason>` issue comments once the issue is in `ready-for-review`; approved issues are closed and used as the six-month re-review anchor
9. Approval automation creates or updates the PR against `main`, updates `plugins/external.json`, and regenerates marketplace outputs
10. Nightly re-review automation finds closed `external-plugin` + `approved` issues that are at least six months old, applies `re-review-due`, and opens or updates a tracking issue for maintainers
11. Maintainers complete re-review on the original approved submission issue with `/re-review-keep`, `/re-review-needs-changes`, or `/re-review-remove`; keep resets the issue `closed_at`, and remove opens a PR against `main`

### Testing Instructions

```bash
# Run all validation checks
npm run plugin:validate
npm run skill:validate

# Build and verify README generation
npm run build

# Fix line endings (required before committing)
bash eng/fix-line-endings.sh
```

Before committing:

- Ensure all markdown front matter is correctly formatted
- Verify file names follow the lower-case-with-hyphens convention
- Run `npm run build` to update the README
- **Always run `bash eng/fix-line-endings.sh`** to normalize line endings (CRLF → LF)
- Check that your new resource appears correctly in the README

## Code Style Guidelines

### Markdown Files

- Use proper front matter with required fields
- Keep descriptions concise and informative
- Wrap description field values in single quotes
- Use lower-case file names with hyphens as separators

### JavaScript/Node.js Scripts

- Located in `eng/` and `scripts/` directories
- Follow Node.js ES module conventions (`.mjs` extension)
- Use clear, descriptive function and variable names

## Pull Request Guidelines

When creating a pull request:

> **Important:** All pull requests should target the **`main`** branch, not `staged`.

1. **README updates**: New files should automatically be added to the README when you run `npm run build`
2. **Front matter validation**: Ensure all markdown files have the required front matter fields
3. **File naming**: Verify all new files follow the lower-case-with-hyphens naming convention
4. **Build check**: Run `npm run build` before committing to verify README generation
5. **Line endings**: **Always run `bash eng/fix-line-endings.sh`** to normalize line endings to LF (Unix-style)
6. **Description**: Provide a clear description of what your agent/instruction does
7. **Testing**: If adding a plugin, run `npm run plugin:validate` to ensure validity

### Pre-commit Checklist

Before submitting your PR, ensure you have:

- [ ] Run `npm install` (or `npm ci`) to install dependencies
- [ ] Run `npm run build` to generate the updated README.md
- [ ] Run `bash eng/fix-line-endings.sh` to normalize line endings
- [ ] Verified that all new files have proper front matter
- [ ] Tested that your contribution works with GitHub Copilot
- [ ] Checked that file names follow the naming convention

### Code Review Checklist

For instruction files (\*.instructions.md):

- [ ] Has markdown front matter
- [ ] Has non-empty `description` field wrapped in single quotes
- [ ] Has `applyTo` field with file patterns
- [ ] File name is lower case with hyphens

For agent files (\*.agent.md):

- [ ] Has markdown front matter
- [ ] Has non-empty `description` field wrapped in single quotes
- [ ] Has `name` field with human-readable name (e.g., "Address Comments" not "address-comments")
- [ ] File name is lower case with hyphens
- [ ] Includes `model` field (strongly recommended)
- [ ] Considers using `tools` field

For skills (skills/\*/):

- [ ] Folder contains a SKILL.md file
- [ ] SKILL.md has markdown front matter
- [ ] Has `name` field matching folder name (lowercase with hyphens, max 64 characters)
- [ ] Has non-empty `description` field wrapped in single quotes (10-1024 characters)
- [ ] Folder name is lower case with hyphens
- [ ] Any bundled assets are referenced in SKILL.md
- [ ] Bundled assets are under 5MB per file

For hook folders (hooks/\*/):

- [ ] Folder contains a README.md file with markdown front matter
- [ ] Has `name` field with human-readable name
- [ ] Has non-empty `description` field wrapped in single quotes
- [ ] Has `hooks.json` file with valid hook configuration (hook events extracted from this file)
- [ ] Folder name is lower case with hyphens
- [ ] Any bundled scripts are executable and referenced in README.md
- [ ] Follows [GitHub Copilot hooks specification](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/use-hooks)
- [ ] Optionally includes `tags` array field for categorization

For workflow files (workflows/\*.md):

- [ ] File has markdown front matter
- [ ] Has `name` field with human-readable name
- [ ] Has non-empty `description` field wrapped in single quotes
- [ ] File name is lower case with hyphens
- [ ] Contains `on` and `permissions` in frontmatter
- [ ] Workflow uses least-privilege permissions and safe outputs
- [ ] No `.yml`, `.yaml`, or `.lock.yml` files included
- [ ] Follows [GitHub Agentic Workflows specification](https://github.github.com/gh-aw/reference/workflow-structure/)

For plugins (plugins/\*/):

- [ ] Directory contains a `.github/plugin/plugin.json` file
- [ ] Directory contains a `README.md` file
- [ ] `plugin.json` has `name` field matching the directory name (lowercase with hyphens)
- [ ] `plugin.json` has non-empty `description` field
- [ ] `plugin.json` has `version` field (semantic version, e.g., "1.0.0")
- [ ] Directory name is lower case with hyphens
- [ ] If `keywords` is present, it is an array of lowercase hyphenated strings
- [ ] If `agents`, `commands`, or `skills` arrays are present, each entry is a valid relative path
- [ ] The plugin does not reference non-existent files
- [ ] Run `npm run build` to verify marketplace.json is updated correctly

## Contributing

This is a community-driven project. Contributions are welcome! Please see:

- [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community standards
- [SECURITY.md](SECURITY.md) for security policies

## MCP Server

The repository includes an MCP (Model Context Protocol) Server for searching and installing resources directly from this repository. Docker is required to run the server.

## License

MIT License - see [LICENSE](LICENSE) for details
