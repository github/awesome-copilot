---
title: "第 6 课 - 使用 Playwright MCP 验证功能"
description: "通过 Customize 配置 Playwright MCP，在现有功能工作树中通过浏览器观察筛选功能。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

如前所述，编写代码不只是写出代码。我们还需要处理数据和外部服务，甚至让 Copilot 能够使用更多自动化功能。这正是 MCP 服务器的用武之地。MCP 服务器让 Copilot 能够使用应用内置功能以外的更多工具和服务。

本课将介绍如何：

- 了解模型上下文协议 (MCP) 及 GitHub Copilot app 如何使用它。
- 添加 Playwright MCP 服务器。
- 要求智能体操控浏览器并探索筛选功能。

## 场景

单元测试和端到端测试很重要，但验证 UI 更新需要实际与 UI 交互。你希望 Copilot 能像用户一样使用正在开发的网站，以进一步自动执行更改并提高对更新符合预期的信心。

## 什么是模型上下文协议 (MCP)？

[模型上下文协议 (MCP)][mcp-blog-post] 为 AI 智能体提供了与外部工具和服务通信的方式。借助 MCP，AI 智能体可以实时与外部工具和服务通信。这让它们既能访问最新信息（使用资源），也能代表你执行操作（使用工具）。

这些工具和资源通过 MCP 服务器访问。MCP 服务器是 AI 智能体与外部工具和服务之间的桥梁，负责管理双方的通信。外部工具可以是现有 API，也可以是 NPM 包等本地工具。每个 MCP 服务器代表 AI 智能体可访问的一组不同工具和资源。

以下是两种常用的现有 MCP 服务器：

- [**GitHub MCP Server**](https://github.com/github/github-mcp-server)：提供一组用于管理 GitHub 存储库的 API。AI 智能体可以创建新存储库、更新现有存储库，以及管理议题和拉取请求。
- [**Playwright MCP Server**][playwright-mcp-server]：使用 Playwright 提供浏览器自动化功能。AI 智能体可以转到网页、填写表单和选择按钮。

还有许多其他 MCP 服务器可用于访问不同的工具和资源。GitHub 托管了一个 [MCP registry](https://github.com/mcp)，以提高生态系统的可发现性并促进贡献。

> [!CAUTION]
> 应像对待项目中的任何其他依赖项一样对待 MCP 服务器。使用前请仔细审查其源代码、验证发布者并考虑安全影响。仅使用可信的 MCP 服务器，并谨慎授予对敏感资源或操作的访问权限。

## 添加 Playwright MCP 服务器

通过侧边栏中的 **Customize** 管理 MCP 服务器。在存储库或 Copilot CLI 中配置的服务器可能已在 app 中可用，因此添加前先检查，避免重复。[App 自定义文档][customize-app]介绍了可用选项。

1. 在侧边栏中选择 **Customize**。
2. 选择 **MCP**，再检查 **Installed** 中是否已有 Playwright 服务器。
3. 如有需要，在可用服务器中找到 **Playwright**，或使用发布者文档说明的自定义服务器流程。
4. 批准前审查发布者、配置和所有安装提示。按提示添加服务器；组织策略或缺少先决条件可能阻止设置。
5. 返回 **Interactive** 模式的筛选会话，确认 Playwright MCP 工具可用。

如果设置失败，应先解决配置或权限问题，再继续。

## 要求 Copilot 通过 Playwright 探索功能

议题和规划决策已在上下文中。要求 Copilot 启动服务器前，先停止之前启动的所有开发服务器。

1. 使用以下提示词，要求 Copilot 验证新功能：

    ```plaintext
    Start the app and use Playwright MCP to check filtering against the issue and our plan. Tell me what works and what doesn't, without making changes. Stop the server you started when you're done.
    ```

  > [!NOTE]
  > 不必明确要求 Copilot 使用特定 MCP 服务器；它通常会根据当前上下文找到合适的服务器。不过，明确指出你认为重要的信息始终是合理做法。

  2. 接下来只需观察其操作。

  Copilot 会启动服务器、打开浏览器并与网站交互。完成后，它会停止服务器并提供报告。

## 总结与后续步骤

你使用 Playwright MCP 服务器，从 GitHub Copilot app 在真实浏览器中探索了功能。总结来说，你：

- 了解了模型上下文协议 (MCP) 及 GitHub Copilot app 如何使用它。
- 添加了 Playwright MCP 服务器。
- 要求智能体操控浏览器并探索筛选功能。

接下来，在[第 7 课 - 创建并使用 QA 智能体][next-lesson]中，通过专业角色将技能和浏览器工具结合起来。

## 资源

- [MCP 是什么？为什么每个人都在谈论它？][mcp-blog-post]
- [Microsoft Playwright MCP Server][playwright-mcp-server]
- [在 GitHub Copilot app 中配置 MCP 服务器][customize-app]

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/app/7-qa-agent/
[mcp-blog-post]: https://github.blog/ai-and-ml/llms/what-the-heck-is-mcp-and-why-is-everyone-talking-about-it/
[playwright-mcp-server]: https://github.com/microsoft/playwright-mcp
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app