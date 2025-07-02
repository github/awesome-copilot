# 🤖 Awesome GitHub Copilot Customizations

Enhance your GitHub Copilot experience with community-contributed instructions, prompts, and configurations. Get consistent AI assistance that follows your team's coding standards and project requirements.

## 🎯 GitHub Copilot Customization Features

GitHub Copilot provides three main ways to customize AI responses and tailor assistance to your specific workflows, team guidelines, and project requirements:

| **🔧 Custom Instructions** | **📝 Reusable Prompts** | **🎭 Custom Chat Modes** |
| --- | --- | --- |
| Define common guidelines for tasks like code generation, reviews, and commit messages. Describe *how* tasks should be performed<br><br>**Benefits:**<br>• Automatic inclusion in every chat request<br>• Repository-wide consistency<br>• Multiple implementation options | Create reusable, standalone prompts for specific tasks. Describe *what* should be done with optional task-specific guidelines<br><br>**Benefits:**<br>• Eliminate repetitive prompt writing<br>• Shareable across teams<br>• Support for variables and dependencies | Define chat behavior, available tools, and codebase interaction patterns within specific boundaries for each request<br><br>**Benefits:**<br>• Context-aware assistance<br>• Tool configuration<br>• Role-specific workflows |

> **💡 Pro Tip:** Custom instructions only affect Copilot Chat (not inline code completions). You can combine all three customization types - use custom instructions for general guidelines, prompt files for specific tasks, and chat modes to control the interaction context.


## 📝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on how to submit new instructions and prompts.

## 📋 Custom Instructions

Team and project-specific instructions to enhance GitHub Copilot's behavior for specific technologies and coding practices:

- [Angular Development Instructions](instructions/angular.md) - Angular-specific coding standards and best practices
- [ASP.NET REST API Development](instructions/aspnet-rest-apis.md) - Guidelines for building REST APIs with ASP.NET
- [Azure Functions Typescript](instructions/azure-functions-typescript.md) - TypeScript patterns for Azure Functions
- [Bicep Code Best Practices](instructions/bicep-code-best-practices.md) - Infrastructure as Code with Bicep
- [Blazor](instructions/blazor.md) - Blazor component and application patterns
- [Cmake Vcpkg](instructions/cmake-vcpkg.md) - C++ project configuration and package management
- [Copilot Process tracking Instructions](instructions/copilot-thought-logging.instructions.md) - See process Copilot is following where you can edit this to reshape the interaction or save when follow up may be needed
- [C# Development](instructions/csharp.md) - Guidelines for building C# applications
- [Dotnet Maui](instructions/dotnet-maui.md) - MAUI component and application patterns
- [Genaiscript](instructions/genaiscript.md) - AI-powered script generation guidelines
- [Generate Modern Terraform Code For Azure](instructions/generate-modern-terraform-code-for-azure.md) - Guidelines for generating modern Terraform code for Azure
- [Guidance for Localization](instructions/localization.md) - Guidelines for localizing markdown documents
- [Markdown](instructions/markdown.md) - Documentation and content creation standards
- [Next.js + Tailwind Development Instructions](instructions/nextjs-tailwind.md) - Next.js + Tailwind development standards and instructions
- [Python Coding Conventions](instructions/python.md) - Python coding conventions and guidelines


> 💡 **Usage**: Copy these instructions to your `.github/copilot-instructions.md` file or create task-specific `.github/.instructions.md` files in your workspace's `.github/instructions` folder.

## 🎯 Reusable Prompts

Ready-to-use prompt templates for specific development scenarios and tasks, defining prompt text with a specific mode, model, and available set of tools.

### Backend Development
- [ASP.NET Minimal API with OpenAPI](prompts/aspnet-minimal-api-openapi.prompt.md) - Generate API endpoints with proper documentation
- [Entity Framework Core Best Practices](prompts/ef-core.prompt.md) - Database operations and ORM patterns
- [Multi-Stage Dockerfile](prompts/multi-stage-dockerfile.prompt.md) - Optimized container builds for any technology

### Testing & Quality
- [C# Async Programming](prompts/csharp-async.prompt.md) - Asynchronous programming best practices
- [MSTest Best Practices](prompts/csharp-mstest.prompt.md) - MSTest unit testing with data-driven tests
- [NUnit Best Practices](prompts/csharp-nunit.prompt.md) - NUnit testing patterns and assertions
- [XUnit Best Practices](prompts/csharp-xunit.prompt.md) - XUnit testing with modern C# features
- [JavaScript/TypeScript Jest](prompts/javascript-typescript-jest.prompt.md) - Jest testing patterns, mocking, and structure

### Documentation & Project Management
- [Comment Code Generate Tutorial](prompts/comment-code-generate-a-tutorial.prompt.md) - Transform code into educational content
- [Generate Specs as Issues](prompts/gen-specs-as-issues.prompt.md) - Convert requirements into GitHub issues
- [My Issues](prompts/my-issues.prompt.md)
- [My Pull Requests](prompts/my-pull-requests.prompt.md)
- [C# Documentation Best Practices](prompts/csharp-docs.prompt.md) - Ensure that C# types are documented with XML comments and follow best practices for documentation.

### FinOps
- [Azure Cost Optimize](prompts/az-cost-optimize.prompt.md) - Analyze Azure resources used in the app (IaC files and/or resources in a target rg) and optimize costs - creating GitHub issues for identified optimizations.

> 💡 **Usage**: Use `/prompt-name` in VS Code chat, run `Chat: Run Prompt` command, or hit the run button while you have a prompt open.

## 🧩 Custom Chat Modes

Custom chat modes define specific behaviors and tools for GitHub Copilot Chat, enabling enhanced context-aware assistance for particular tasks or workflows.

- [4.1 Beast Mode](chatmodes/4.1-Beast.chatmode.md) - A custom prompt to get GPT 4.1 to behave like a top-notch coding agent.
- [Database Administrator Chat Mode](chatmodes/PostgreSQL%20DBA.chatmode.md) - Work with PostgreSQL databases using the PostgreSQL extension.
- [Debug Mode Instructions](chatmodes/debug.chatmode.md) - Debug your application to find and fix a bug
- [Planning mode instructions](chatmodes/planner.chatmode.md) - Generate an implementation plan for new features or refactoring existing code.
- [Refine Requirement or Issue Chat Mode](chatmodes/refine-issue.chatmode.md) - Refine the requirement or issue with Acceptance Criteria, Technical Considerations, Edge Cases, and NFRs


> 💡 **Usage**: Create new chat modes using the command `Chat: Configure Chat Modes...`, then switch your chat mode in the Chat input from _Agent_ or _Ask_ to your own mode.

## 📚 Additional Resources

- [VS Code Copilot Customization Documentation](https://code.visualstudio.com/docs/copilot/copilot-customization) - Official Microsoft documentation
- [GitHub Copilot Chat Documentation](https://code.visualstudio.com/docs/copilot/chat/copilot-chat) - Complete chat feature guide
- [Custom Chat Modes](https://code.visualstudio.com/docs/copilot/chat/chat-modes) - Advanced chat configuration
- [VS Code Settings](https://code.visualstudio.com/docs/getstarted/settings) - General VS Code configuration guide


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
