---
title: "第 5 课 - 使用 Playwright MCP 服务器测试"
description: "将 Playwright MCP 服务器添加到 GitHub Copilot app，并要求智能体在真实浏览器中手动测试筛选功能。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

上一课使用项目的自动化测试套件创建并验证了筛选功能。测试可以自动验证代码，但让智能体确认行为同样很有价值。智能体可以对它在实际 UI 中发现的问题作出响应。接下来探索 MCP 如何让 AI 智能体访问外部功能，并添加 Playwright MCP 服务器，使 Copilot 可以直接与正在构建的网站交互。

本课将介绍如何：

- 了解模型上下文协议 (MCP) 及 GitHub Copilot app 如何使用它。
- 从应用设置中添加 Playwright MCP 服务器。
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

可以在应用设置中添加和管理 MCP 服务器。应用内置了常用服务器目录，只需几个步骤即可添加 [Playwright MCP 服务器][playwright-mcp-server]。

1. 选择 <kbd>Ctrl</kbd>+<kbd>,</kbd> 打开 Copilot app 设置页面。
2. 选择 **MCP servers**。
3. 在搜索对话框中输入 `Playwright`。
4. 从 **Popular MCP servers** 列表中选择 **Playwright**。
5. 选择 **Add server**，将其添加到可用 MCP 服务器列表。
6. 选择 <kbd>Esc</kbd> 关闭设置对话框。

现在，Playwright MCP 服务器已添加。

## 要求 Copilot 通过 Playwright 探索功能

接下来要求 Copilot 使用 Playwright MCP 服务器手动测试该功能。

1. 使用以下提示词，要求 Copilot 验证新功能：

   ```plaintext
   Start the dev server then use the Playwright MCP server to validate the functionality you just added exists. Use the details in the issue to ensure the newly added behavior matches the specs.
   ```

Copilot 将通过 Playwright MCP 服务器启动浏览器、逐步执行每项操作并报告发现的结果。你会实际看到它在系统上打开浏览器执行任务。

2. 对照议题中的验收标准阅读摘要。如果发现问题，请提出后续问题，或要求它在打开拉取请求前修复代码。
3. 保持此会话打开，下一课将完成该会话。

现在，Copilot 已像用户一样探索功能，并在浏览器中验证了其行为。

## 总结与后续步骤

你使用 Playwright MCP 服务器，从 GitHub Copilot app 在真实浏览器中探索了功能。总结来说，你：

- 了解了模型上下文协议 (MCP)，以及应用如何提供 MCP 工具。
- 从应用设置中添加了 Playwright MCP 服务器。
- 要求智能体操控浏览器并探索筛选功能。

功能已构建、验证并确认可以正常工作。现在可以使用 **Agent Merge** 打开并合并拉取请求。继续学习[第 6 课 - 使用 Agent Merge 合并][next-lesson]。

## 资源

- [MCP 是什么？为什么每个人都在谈论它？][mcp-blog-post]
- [Microsoft Playwright MCP Server][playwright-mcp-server]
- [在 GitHub Copilot app 中配置 MCP 服务器][customize-app]

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/app/6-agent-merge/
[mcp-blog-post]: https://github.blog/ai-and-ml/llms/what-the-heck-is-mcp-and-why-is-everyone-talking-about-it/
[playwright-mcp-server]: https://github.com/microsoft/playwright-mcp
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app