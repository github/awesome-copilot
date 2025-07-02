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

- [Angular Development Instructions](instructions/angular.instructions.md) - Instruction specific coding standards and best practices
- [ASP.NET REST API Development](instructions/aspnet-rest-apis.instructions.md) - Development specific coding standards and best practices
- [Azure Functions Typescript](instructions/azure-functions-typescript.instructions.md) - Typescript specific coding standards and best practices
- [Bicep Code Best Practices](instructions/bicep-code-best-practices.instructions.md) - Practice specific coding standards and best practices
- [Blazor](instructions/blazor.instructions.md) - Blazor specific coding standards and best practices
- [Cmake Vcpkg](instructions/cmake-vcpkg.instructions.md) - Vcpkg specific coding standards and best practices
- [Copilot Process tracking Instructions](instructions/copilot-thought-logging.instructions.md) - Instruction specific coding standards and best practices
- [C# Development](instructions/csharp.instructions.md) - Development specific coding standards and best practices
- [.NET MAUI](instructions/dotnet-maui.instructions.md) - MAUI specific coding standards and best practices
- [Genaiscript](instructions/genaiscript.instructions.md) - Genaiscript specific coding standards and best practices
- [Generate Modern Terraform Code For Azure](instructions/generate-modern-terraform-code-for-azure.instructions.md) - Azure specific coding standards and best practices
- [Guidance for Localization](instructions/localization.instructions.md) - Localization specific coding standards and best practices
- [Markdown](instructions/markdown.instructions.md) - Markdown specific coding standards and best practices
- [Next.js + Tailwind Development Instructions](instructions/nextjs-tailwind.instructions.md) - Instruction specific coding standards and best practices
- [Python Coding Conventions](instructions/python.instructions.md) - Convention specific coding standards and best practices


> 💡 **Usage**: Create new chat modes using the command `Chat: Configure Chat Modes...`, then switch your chat mode in the Chat input from _Agent_ or _Ask_ to your own mode.

## 🧩 Custom Chat Modes

Custom chat modes define specific behaviors and tools for GitHub Copilot Chat, enabling enhanced context-aware assistance for particular tasks or workflows.

- [4.1 Beast Mode](chatmodes/4.1-beast.chatmode.md)
- [Debug Mode Instructions](chatmodes/debug.chatmode.md)
- [Planning mode instructions](chatmodes/planner.chatmode.md)
- [Database Administrator Chat Mode](chatmodes/postgresql-dba.chatmode.md)
- [Refine Requirement or Issue Chat Mode](chatmodes/refine-issue.chatmode.md)

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
