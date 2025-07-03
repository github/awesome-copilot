# Contributing to Awesome GitHub Copilot

Thank you for your interest in contributing to the Awesome GitHub Copilot repository! We welcome contributions from the community to help expand our collection of custom instructions and prompts.

## How to Contribute

### Adding Instructions

Instructions help customize GitHub Copilot's behavior for specific technologies, coding practices, or domains.

1. **Create your instruction file**: Add a new `.md` file in the `instructions/` directory
2. **Follow the naming convention**: Use descriptive, lowercase filenames with hyphens (e.g., `python-django.md`)
3. **Structure your content**: Start with a clear heading and organize your instructions logically
4. **Test your instructions**: Make sure your instructions work well with GitHub Copilot

#### Example instruction format:
```markdown
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

#### Example prompt format:
```markdown
---
mode: "agent"
tools: ["codebase", "terminalCommand"]
description: "Brief description of what this prompt does"
---

# Prompt Title

Your goal is to...

## Specific Instructions

- Clear, actionable instructions
- Include examples where helpful
```

## Submitting Your Contribution

1. **Fork this repository**
2. **Create a new branch** for your contribution
3. **Add your instruction or prompt file** following the guidelines above
4. **Run the update script** (optional): `node update-readme.js` to update the README with your new file
   - A GitHub Actions workflow will verify that this step was performed correctly
   - If the README.md would be modified by running the script, the PR check will fail with a comment showing the required changes
5. **Submit a pull request** with:
   - A clear title describing your contribution
   - A brief description of what your instruction/prompt does
   - Any relevant context or usage notes

## Quality Guidelines

- **Be specific**: Generic instructions are less helpful than specific, actionable guidance
- **Test your content**: Ensure your instructions or prompts work well with GitHub Copilot
- **Follow conventions**: Use consistent formatting and naming
- **Keep it focused**: Each file should address a specific technology, framework, or use case
- **Write clearly**: Use simple, direct language

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## License

By contributing to this repository, you agree that your contributions will be licensed under the MIT License.
