# Contributing to Awesome GitHub Copilot

Thank you for your interest in contributing to the Awesome GitHub Copilot repository! We welcome contributions from the community to help expand our collection of custom instructions and prompts.

## Prerequisites

### Windows Users: Enable Symlinks

This repository uses symbolic links for plugins. On Windows, you need to enable symlink support before cloning:

1. **Enable Developer Mode** (recommended):
   - Open **Settings** → **Update & Security** → **For developers**
   - Enable **Developer Mode**
   - This allows creating symlinks without administrator privileges

2. **Configure Git to use symlinks**:
   ```bash
   git config --global core.symlinks true
   ```

3. **Clone the repository** (after enabling the above):
   ```bash
   git clone https://github.com/github/awesome-copilot.git
   ```

> **Note:** If you cloned the repository before enabling symlinks, the symlinks will appear as plain text files containing the target path. You'll need to delete the local repository and re-clone after enabling symlink support.

**Alternative for older Windows versions:** If Developer Mode is not available, you can run Git Bash as Administrator, or grant your user the "Create symbolic links" privilege via Local Security Policy (`secpol.msc` → Local Policies → User Rights Assignment → Create symbolic links).

## How to Contribute

### Adding Instructions

Instructions help customize GitHub Copilot's behavior for specific technologies, coding practices, or domains.

1. **Create your instruction file**: Add a new `.md` file in the `instructions/` directory
2. **Follow the naming convention**: Use descriptive, lowercase filenames with hyphens (e.g., `python-django.instructions.md`)
3. **Structure your content**: Start with a clear heading and organize your instructions logically
4. **Test your instructions**: Make sure your instructions work well with GitHub Copilot

#### Example instruction format

```markdown
---
description: 'Instructions for customizing GitHub Copilot behavior for specific technologies and practices'
---

# Your Technology/Framework Name

## Instructions

- Provide clear, specific guidance for GitHub Copilot
- Include best practices and conventions
- Use bullet points for easy reading

## Additional Guidelines

- Any additional context or examples
```

### Adding Prompts

Prompts are ready-to-use templates for specific development scenarios and tasks.

1. **Create your prompt file**: Add a new `.prompt.md` file in the `prompts/` directory
2. **Follow the naming convention**: Use descriptive, lowercase filenames with hyphens and the `.prompt.md` extension (e.g., `react-component-generator.prompt.md`)
3. **Include frontmatter**: Add metadata at the top of your file (optional but recommended)
4. **Structure your prompt**: Provide clear context and specific instructions

#### Example prompt format

```markdown
---
agent: 'agent'
tools: ['codebase', 'terminalCommand']
description: 'Brief description of what this prompt does'
---

# Prompt Title

Your goal is to...

## Specific Instructions

- Clear, actionable instructions
- Include examples where helpful
```

### Adding an Agent

Agents are specialized configurations that transform GitHub Copilot Chat into domain-specific assistants or personas for particular development scenarios.

1. **Create your agent file**: Add a new `.agent.md` file in the `agents/` directory
2. **Follow the naming convention**: Use descriptive, lowercase filenames with hyphens and the `.agent.md` extension (e.g., `react-performance-expert.agent.md`)
3. **Include frontmatter**: Add metadata at the top of your file with required fields
4. **Define the persona**: Create a clear identity and expertise area for the agent
5. **Test your agent**: Ensure the agent provides helpful, accurate responses in its domain

#### Example agent format

```markdown
---
description: 'Brief description of the agent and its purpose'
model: 'gpt-5'
tools: ['codebase', 'terminalCommand']
name: 'My Agent Name'
---

You are an expert [domain/role] with deep knowledge in [specific areas].

## Your Expertise

- [Specific skill 1]
- [Specific skill 2]
- [Specific skill 3]

## Your Approach

- [How you help users]
- [Your communication style]
- [What you prioritize]

## Guidelines

- [Specific instructions for responses]
- [Constraints or limitations]
- [Best practices to follow]
```

### Adding Skills

Skills are self-contained folders in the `skills/` directory that include a `SKILL.md` file (with front matter) and optional bundled assets.

1. **Create a new skill folder**: Run `npm run skill:create -- --name <skill-name> --description "<skill description>"`
2. **Edit `SKILL.md`**: Ensure the `name` matches the folder name (lowercase with hyphens) and the `description` is clear and non-empty
3. **Add optional assets**: Keep bundled assets reasonably sized (under 5MB each) and reference them from `SKILL.md`
4. **Validate and update docs**: Run `npm run skill:validate` and then `npm run build` to update the generated README tables

### Adding Collections

Collections group related prompts, instructions, agents, and skills around specific themes or workflows, making it easier for users to discover and adopt comprehensive toolkits.

1. **Create your collection manifest**: Add a new `.collection.yml` file in the `collections/` directory
2. **Follow the naming convention**: Use descriptive, lowercase filenames with hyphens (e.g., `python-web-development.collection.yml`)
3. **Reference existing items**: Collections should only reference files that already exist in the repository
4. **Test your collection**: Verify all referenced files exist and work well together

#### Creating a collection

```bash
# Using the creation script
node create-collection.js my-collection-id

# Or using VS Code Task: Ctrl+Shift+P > "Tasks: Run Task" > "create-collection"
```

#### Example collection format

```yaml
id: my-collection-id
name: My Collection Name
description: A brief description of what this collection provides and who should use it.
tags: [tag1, tag2, tag3] # Optional discovery tags
items:
  - path: prompts/my-prompt.prompt.md
    kind: prompt
  - path: instructions/my-instructions.instructions.md
    kind: instruction
  - path: agents/my-custom.agent.md
    kind: agent
    usage: |
     recommended # or "optional" if not essential to the workflow

     This agent requires the following instructions/prompts/MCPs:
      - Instruction 1
      - Prompt 1
      - MCP 1

     This agent is ideal for...
      - Use case 1
      - Use case 2
    
      Here is an example of how to use it:
      ```markdown, task-plan.prompt.md
      ---
      mode: task-planner
      title: Plan microsoft fabric realtime intelligence terraform support
      ---
      #file: <file including in chat context>
      Do an action to achieve goal.
      ```

      To get the best results, consider...
      - Tip 1
      - Tip 2
    
display:
  ordering: alpha # or "manual" to preserve order above
  show_badge: false # set to true to show collection badge
```

For full example of usage checkout edge-ai tasks collection:
- [edge-ai-tasks.collection.yml](./collections/edge-ai-tasks.collection.yml)
- [edge-ai-tasks.md](./collections/edge-ai-tasks.md)

#### Collection Guidelines

- **Focus on workflows**: Group items that work together for specific use cases
- **Reasonable size**: Typically 3-10 items work well
- **Test combinations**: Ensure the items complement each other effectively
- **Clear purpose**: The collection should solve a specific problem or workflow
- **Validate before submitting**: Run `node validate-collections.js` to ensure your manifest is valid

### Working with Plugins

Plugins are installable packages automatically generated from collections. They contain symlinked agents, commands (prompts), and skills from the source collection.

#### Creating a Plugin from a Collection

When you create a new collection, you can generate a corresponding plugin:

```bash
# Migrate a collection to a new plugin (first time only)
npm run plugin:migrate -- --collection <collection-id>
```

#### Updating Plugins After Collection Changes

If you modify a collection (add/remove items, update metadata), refresh the corresponding plugin:

```bash
# Refresh a single plugin
npm run plugin:refresh -- --collection <collection-id>

# Refresh all existing plugins
npm run plugin:refresh -- --all
```

#### Plugin Structure

```plaintext
plugins/<collection-id>/
├── .github/plugin/plugin.json  # Plugin metadata (auto-generated)
├── README.md                   # Plugin documentation (auto-generated)
├── agents/                     # Symlinks to agent files (.md)
├── commands/                   # Symlinks to prompt files (.md)
└── skills/                     # Symlinks to skill folders
```

#### Plugin Guidelines

- **Symlinks, not copies**: Plugin files are symlinks to the source files, avoiding duplication
- **Instructions excluded**: Instructions are not currently supported in plugins
- **Auto-generated content**: The `plugin.json` and `README.md` are generated from the collection metadata
- **Keep plugins in sync**: After modifying a collection, run `plugin:refresh` to update the plugin

## Submitting Your Contribution

1. **Fork this repository**
2. **Create a new branch** for your contribution
3. **Add your instruction, prompt file, chatmode, or collection** following the guidelines above
4. **Run the update script**: `npm start` to update the README with your new file (make sure you run `npm install` first if you haven't already)
   - A GitHub Actions workflow will verify that this step was performed correctly
   - If the README.md would be modified by running the script, the PR check will fail with a comment showing the required changes
5. **Submit a pull request** with:
   - A clear title describing your contribution
   - A brief description of what your instruction/prompt does
   - Any relevant context or usage notes

> [!NOTE] 
> We use [all-contributors](https://github.com/all-contributors/all-contributors) to recognize all types of contributions to the project. Jump to [Contributors Recognition](#contributor-recognition) to learn more!

## What We Accept

We welcome contributions covering any technology, framework, or development practice that helps developers work more effectively with GitHub Copilot. This includes:

- Programming languages and frameworks
- Development methodologies and best practices
- Architecture patterns and design principles
- Testing strategies and quality assurance
- DevOps and deployment practices
- Accessibility and inclusive design
- Performance optimization techniques

## What We Don't Accept

To maintain a safe, responsible, and constructive community, we will **not accept** contributions that:

- **Violate Responsible AI Principles**: Content that attempts to circumvent Microsoft/GitHub's Responsible AI guidelines or promotes harmful AI usage
- **Compromise Security**: Instructions designed to bypass security policies, exploit vulnerabilities, or weaken system security
- **Enable Malicious Activities**: Content intended to harm other systems, users, or organizations
- **Exploit Weaknesses**: Instructions that take advantage of vulnerabilities in other platforms or services
- **Promote Harmful Content**: Guidance that could lead to the creation of harmful, discriminatory, or inappropriate content
- **Circumvent Platform Policies**: Attempts to work around GitHub, Microsoft, or other platform terms of service

## Quality Guidelines

- **Be specific**: Generic instructions are less helpful than specific, actionable guidance
- **Test your content**: Ensure your instructions or prompts work well with GitHub Copilot
- **Follow conventions**: Use consistent formatting and naming
- **Keep it focused**: Each file should address a specific technology, framework, or use case
- **Write clearly**: Use simple, direct language
- **Promote best practices**: Encourage secure, maintainable, and ethical development practices

## Contributor Recognition

We use [all-contributors](https://github.com/all-contributors/all-contributors) to recognize **all types of contributions** to this project.

To add yourself, leave a comment on a relevant issue or pull request using your GitHub username and the appropriate contribution type(s):

```markdown
@all-contributors add @username for contributionType1, contributionType2
```

The contributors list is updated automatically every Sunday at **3:00 AM UTC**. When the next run completes, your name will appear in the [README Contributors](./README.md#contributors-) section.

### Contribution Types

We welcome many kinds of contributions, including the custom categories below:

| Category | Description | Emoji |
| --- | --- | :---: |
| **Instructions** | Custom instruction sets that guide GitHub Copilot behavior | 🧭 |
| **Prompts** | Reusable or one-off prompts for GitHub Copilot | ⌨️ |
| **Agents** | Defined GitHub Copilot roles or personalities | 🎭 |
| **Skills** | Specialized knowledge of a task for GitHub Copilot | 🧰 |
| **Collections** | Curated bundles of related prompts, agents, or instructions | 🎁 |

In addition, all standard contribution types supported by [All Contributors](https://allcontributors.org/emoji-key/) are recognized.

> Every contribution matters. Thanks for helping improve this resource for the GitHub Copilot community.


## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## License

By contributing to this repository, you agree that your contributions will be licensed under the MIT License.
