# 🤖 Awesome GitHub Copilot Customizations

Enhance your GitHub Copilot experience with community-contributed instructions, prompts, and configurations. Get consistent AI assistance that follows your team's coding standards and project requirements.

## 🎯 GitHub Copilot Customization Features

GitHub Copilot provides three main ways to customize AI responses and tailor assistance to your specific workflows, team guidelines, and project requirements:

| **🔧 Custom Instructions** | **📝 Reusable Prompts** | **🧩 Custom Chat Modes** |
| --- | --- | --- |
| Define common guidelines for tasks like code generation, reviews, and commit messages. Describe *how* tasks should be performed<br><br>**Benefits:**<br>• Automatic inclusion in every chat request<br>• Repository-wide consistency<br>• Multiple implementation options | Create reusable, standalone prompts for specific tasks. Describe *what* should be done with optional task-specific guidelines<br><br>**Benefits:**<br>• Eliminate repetitive prompt writing<br>• Shareable across teams<br>• Support for variables and dependencies | Define chat behavior, available tools, and codebase interaction patterns within specific boundaries for each request<br><br>**Benefits:**<br>• Context-aware assistance<br>• Tool configuration<br>• Role-specific workflows |

> **💡 Pro Tip:** Custom instructions only affect Copilot Chat (not inline code completions). You can combine all three customization types - use custom instructions for general guidelines, prompt files for specific tasks, and chat modes to control the interaction context.


## 📝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on how to submit new instructions and prompts.

## 📋 Custom Instructions

Team and project-specific instructions to enhance GitHub Copilot's behavior for specific technologies and coding practices:

- [Angular Development Instructions](instructions/angular.instructions.md) - Angular-specific coding standards and best practices
- [ASP.NET REST API Development](instructions/aspnet-rest-apis.instructions.md) - Guidelines for building REST APIs with ASP.NET
- [Azure Functions Typescript](instructions/azure-functions-typescript.instructions.md) - TypeScript patterns for Azure Functions
- [Bicep Code Best Practices](instructions/bicep-code-best-practices.instructions.md) - Infrastructure as Code with Bicep
- [Blazor](instructions/blazor.instructions.md) - Blazor component and application patterns
- [Cmake Vcpkg](instructions/cmake-vcpkg.instructions.md) - C++ project configuration and package management
- [Copilot Process tracking Instructions](instructions/copilot-thought-logging.instructions.md) - See process Copilot is following where you can edit this to reshape the interaction or save when follow up may be needed
- [C# Development](instructions/csharp.instructions.md) - Guidelines for building C# applications
- [.NET MAUI](instructions/dotnet-maui.instructions.md) - .NET MAUI component and application patterns
- [Genaiscript](instructions/genaiscript.instructions.md) - AI-powered script generation guidelines
- [Generate Modern Terraform Code For Azure](instructions/generate-modern-terraform-code-for-azure.instructions.md) - Guidelines for generating modern Terraform code for Azure
- [Guidance for Localization](instructions/localization.instructions.md) - Guidelines for localizing markdown documents
- [Markdown](instructions/markdown.instructions.md) - Documentation and content creation standards
- [Next.js + Tailwind Development Instructions](instructions/nextjs-tailwind.instructions.md) - Next.js + Tailwind development standards and instructions
- [Python Coding Conventions](instructions/python.instructions.md) - Python coding conventions and guidelines
- [Secure Coding and OWASP Guidelines](instructions/security-and-owasp.instructions.md) - Comprehensive secure coding instructions for all languages and frameworks, based on OWASP Top 10 and industry best practices.

> 💡 **Usage**: Copy these instructions to your `.github/copilot-instructions.md` file or create task-specific `.github/.instructions.md` files in your workspace's `.github/instructions` folder.

## 🎯 Reusable Prompts

Ready-to-use prompt templates for specific development scenarios and tasks, defining prompt text with a specific mode, model, and available set of tools.

- [ASP.NET Minimal API with OpenAPI](prompts/aspnet-minimal-api-openapi.prompt.md) - Create ASP.NET Minimal API endpoints with proper OpenAPI documentation
- [Azure Cost Optimize](prompts/az-cost-optimize.prompt.md) - Analyze Azure resources used in the app (IaC files and/or resources in a target rg) and optimize costs - creating GitHub issues for identified optimizations.
- [Comment Code Generate A Tutorial](prompts/comment-code-generate-a-tutorial.prompt.md) - Transform this Python script into a polished, beginner-friendly project by refactoring the code, adding clear instructional comments, and generating a complete markdown tutorial.
- [C# Async Programming Best Practices](prompts/csharp-async.prompt.md) - Get best practices for C# async programming
- [C# Documentation Best Practices](prompts/csharp-docs.prompt.md) - Ensure that C# types are documented with XML comments and follow best practices for documentation.
- [MSTest Best Practices](prompts/csharp-mstest.prompt.md) - Get best practices for MSTest unit testing, including data-driven tests
- [NUnit Best Practices](prompts/csharp-nunit.prompt.md) - Get best practices for NUnit unit testing, including data-driven tests
- [XUnit Best Practices](prompts/csharp-xunit.prompt.md) - Get best practices for XUnit unit testing, including data-driven tests
- [Entity Framework Core Best Practices](prompts/ef-core.prompt.md) - Get best practices for Entity Framework Core
- [Product Manager Assistant: Feature Identification and Specification](prompts/gen-specs-as-issues.prompt.md) - This workflow guides you through a systematic approach to identify missing features, prioritize them, and create detailed specifications for implementation.
- [Javascript Typescript Jest](prompts/javascript-typescript-jest.prompt.md) - Best practices for writing JavaScript/TypeScript tests using Jest, including mocking strategies, test structure, and common patterns.
- [Multi Stage Dockerfile](prompts/multi-stage-dockerfile.prompt.md) - Create optimized multi-stage Dockerfiles for any language or framework
- [My Issues](prompts/my-issues.prompt.md) - List my issues in the current repository
- [My Pull Requests](prompts/my-pull-requests.prompt.md) - List my pull requests in the current repository

> 💡 **Usage**: Use `/prompt-name` in VS Code chat, run `Chat: Run Prompt` command, or hit the run button while you have a prompt open.

## 🧩 Custom Chat Modes

Custom chat modes define specific behaviors and tools for GitHub Copilot Chat, enabling enhanced context-aware assistance for particular tasks or workflows.

- [4.1 Beast Mode](chatmodes/4.1-Beast.chatmode.md) - A custom prompt to get GPT 4.1 to behave like a top-notch coding agent.
- [Debug Mode Instructions](chatmodes/debug.chatmode.md) - Debug your application to find and fix a bug
- [Planning mode instructions](chatmodes/planner.chatmode.md) - Generate an implementation plan for new features or refactoring existing code.
- [PostgreSQL Database Administrator](chatmodes/postgresql-dba.chatmode.md) - Work with PostgreSQL databases using the PostgreSQL extension.
- [Refine Requirement or Issue Chat Mode](chatmodes/refine-issue.chatmode.md) - Refine the requirement or issue with Acceptance Criteria, Technical Considerations, Edge Cases, and NFRs
- [Prompt Engineering Chat Mode](chatmodes/Prompt%20Engineer.chatmode.md) - Refines a given prompt, based on an OpenAIs prompt crafting techniques.

> 💡 **Usage**: Create new chat modes using the command `Chat: Configure Chat Modes...`, then switch your chat mode in the Chat input from _Agent_ or _Ask_ to your own mode.

## 📚 Additional Resources

- [VS Code Copilot Customization Documentation](https://code.visualstudio.com/docs/copilot/copilot-customization) - Official Microsoft documentation
- [GitHub Copilot Chat Documentation](https://code.visualstudio.com/docs/copilot/chat/copilot-chat) - Complete chat feature guide
- [Custom Chat Modes](https://code.visualstudio.com/docs/copilot/chat/chat-modes) - Advanced chat configuration
- [VS Code Settings](https://code.visualstudio.com/docs/getstarted/settings) - General VS Code configuration guide

## 🛠️ Development Configuration

This repository uses various configuration files to ensure consistent code style and avoid issues with line endings:

- [`.editorconfig`](.editorconfig) - Defines coding styles across different editors and IDEs
- [`.gitattributes`](.gitattributes) - Ensures consistent line endings in text files
- [`.vscode/settings.json`](.vscode/settings.json) - VS Code-specific settings for this repository
- [`.vscode/extensions.json`](.vscode/extensions.json) - Recommended VS Code extensions

> 💡 **Note**: All markdown files in this repository use LF line endings (Unix-style) to avoid mixed line endings issues. The repository is configured to automatically handle line endings conversion.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## ™️ Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
