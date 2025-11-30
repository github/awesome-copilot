# Contributing to Awesome GitHub Copilot

Thank you for your interest in contributing to the Awesome GitHub Copilot repository! We welcome contributions from the community to help expand our collection of custom instructions and prompts.

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

### Adding Chat Modes

Chat modes are specialized configurations that transform GitHub Copilot Chat into domain-specific assistants or personas for particular development scenarios.

1. **Create your chat mode file**: Add a new `.agent.md` file in the `agents/` directory
2. **Follow the naming convention**: Use descriptive, lowercase filenames with hyphens and the `.agent.md` extension (e.g., `react-performance-expert.agent.md`)
3. **Include frontmatter**: Add metadata at the top of your file with required fields
4. **Define the persona**: Create a clear identity and expertise area for the chat mode
5. **Test your chat mode**: Ensure the chat mode provides helpful, accurate responses in its domain

#### Example chat mode format

```markdown
---
description: 'Brief description of the chat mode and its purpose'
model: 'gpt-5'
tools: ['codebase', 'terminalCommand']
---

# Chat Mode Title

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

### Adding Collections

Collections group related prompts, instructions, and chat modes around specific themes or workflows, making it easier for users to discover and adopt comprehensive toolkits.

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
  - path: agents/my-chatmode.agent.md
    kind: agent
    usage: |
     recommended # or "optional" if not essential to the workflow

     This chat mode requires the following instructions/prompts/MCPs:
      - Instruction 1
      - Prompt 1
      - MCP 1

     This chat mode is ideal for...
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

**Note**: Once your contribution is merged, you'll automatically be added to our [Contributors](./README.md#contributors-) section! We use [all-contributors](https://github.com/all-contributors/all-contributors) to recognize all types of contributions to the project.

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

## Contributors Recognition

This project uses [all-contributors](https://github.com/all-contributors/all-contributors) to recognize contributors. When you make a contribution, you'll automatically be recognized in our contributors list!

We welcome contributions of all types, including:

- 📝 Documentation improvements
- 💻 Code contributions
- 🐛 Bug reports and fixes
- 🎨 Design improvements
- 💡 Ideas and suggestions
- 🤔 Answering questions
- 📢 Promoting the project

Your contributions help make this resource better for the entire GitHub Copilot community!

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## License

By contributing to this repository, you agree that your contributions will be licensed under the MIT License.
