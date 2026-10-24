# 📋 Custom Instructions

Team and project-specific instructions to enhance GitHub Copilot's behavior for specific technologies and coding practices.

### How to Contribute

See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-instructions) for guidelines on how to contribute new instructions, improve existing ones, and share your use cases.

### How to Use Custom Instructions

**To Install:**
- Click the **VS Code** or **VS Code Insiders** install button for the instruction you want to use
- Download the `*.instructions.md` file and manually add it to your project's instruction collection

**To Use/Apply:**
- For repository-wide guidance, merge the resource's Markdown body into your `.github/copilot-instructions.md` file, preserving existing instructions and omitting the YAML frontmatter
- In VS Code, keep the complete `*.instructions.md` file, including its YAML frontmatter, in your workspace's `.github/instructions/` folder for path-specific guidance
- Instructions automatically apply to Copilot behavior once installed in your workspace

**IntelliJ IDEA and other JetBrains IDEs:**

[Set up in IntelliJ](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions-in-your-ide/add-repository-instructions-in-your-ide?tool=jetbrains) using the manual setup guide, not a one-click installer. Use the repository-wide `.github/copilot-instructions.md` workflow above. The resource's `applyTo` patterns are not enforced in this file, so include only guidance appropriate for the whole repository.

_No entries found yet._