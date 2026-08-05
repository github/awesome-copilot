---
title: "第 8 课 - 回顾与后续步骤"
description: "回顾 GitHub Copilot app 学习路径，自动执行重复性工作，并探索后续方向。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

在过去几节课程中，你使用 GitHub Copilot app 将一项功能从构想推进到合并，包括：

- 连接存储库，并熟悉应用工作区和模板创建的待办事项。
- 从直接任务和议题启动会话，并使用 Plan 和 Autopilot 模式控制智能体的工作方式。
- 使用自定义指令和可复用技能引导智能体。
- 使用 Playwright MCP 服务器在真实浏览器中测试工作。
- 在共享画布上与智能体协作。
- 逐步提高更改交付的合并自动化程度，从自行在 github.com 上合并，到让 **Agent Merge** 完成拉取请求。

接下来自动执行一些重复性工作、讨论最佳实践，并了解后续方向。

## 自动执行重复性工作

应用可通过**自动化**按计划或按需运行智能体，非常适合对新议题进行分类或汇总近期活动等日常任务。接下来创建一个简单的非破坏性自动化任务。

1. 在侧边栏中选择 **Automations**，再选择 **New automation**。
2. 为其指定名称，例如 `Recap my recent work`。
3. 选择触发器。**Manual** 支持按需运行；**On a schedule** 会自动运行；**When an issue is created** 会在创建新议题时响应。本课请选择 **Manual**。
4. 输入只读提示词，确保自动化任务无法更改任何内容，例如：

   ```plaintext
   Summarize the pull requests merged in this repository over the last week, and list any issues still open in the backlog.
   ```

5. 选择项目（你的 Tailspin Toys 存储库）并创建自动化任务。
6. 按需运行该任务以查看结果。

> [!TIP]
> 自动化任务可以在本地或云中运行。如果希望自动化任务按计划无人值守运行，请启用 **Run in the cloud**，并选择允许它使用的 **Tools**。在信任其输出之前，应确保计划任务范围明确且不具破坏性。

## 最佳实践

使用任何 AI 工具时，其周边基础设施都会影响输出质量。指令文件、技能和自定义智能体都在本研讨会中发挥了作用。应投入精力完善这些资产，并在会话间复用。

根据任务选择适合的**模式和模型**。使用 **Plan** 在构建前思考方法；使用 **Interactive** 参与范围明确的更改；仅对范围清晰且彼此隔离的任务使用 **Autopilot**。日常编辑可选择更快的模型，复杂工作则选择推理能力更强的模型并提高推理强度。

上下文与基础设施同样重要。清楚说明要构建*什么*、*为什么*构建，以及*如何*构建，会显著影响输出。在决定创建完整会话前，可以先通过快速聊天下一步界定想法范围。

## 更多探索内容

你已经了解核心工作流。以下功能也值得探索：

- **Quick chats**：适合不需要完整会话的一次性问题。
- **Rubber duck**：用于分析问题，并在构建前获得高信噪比反馈。
- [**Custom agents**][custom-agents]：将角色、工具和指令打包，以便重复执行专业工作。
- [`/chronicle`][chronicle]：生成会话过程的叙述。
- [Bring your own key (BYOK)][byok]：使用自己提供商的模型，包括通过 Ollama、Foundry Local 或 LM Studio 使用本地模型。
- [Cloud sandboxes][sandboxes]：在 GitHub 托管的隔离环境中运行会话。
- [Deep links][deep-links]：直接在应用中打开存储库、会话或提示词。

## 后续步骤

熟练使用任何工具的最佳方式都是持续使用。可将它用于生产代码、业余项目，或那个构思多年却始终没有动手构建的小应用。与团队分享经验，也向团队学习。并且一如既往地探索文档。

要探索 GitHub Copilot 生态系统的更多内容，请查看 [VS Code 学习路径](/zh-cn/learning-hub/copilot-workshops/vscode/)、[Copilot CLI 学习路径](/zh-cn/learning-hub/copilot-workshops/cli/)或 [Cloud agent 学习路径](/zh-cn/learning-hub/copilot-workshops/cloud/)。

## 资源

- [关于 GitHub Copilot app][about-copilot-app]
- [GitHub Copilot app 入门][getting-started]
- [自定义 GitHub Copilot app][customize]
- [使用自动化][using-automations]
- [使用画布扩展][canvas-docs]
- [关于云沙盒和本地沙盒][sandboxes]

[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[getting-started]: https://docs.github.com/copilot/how-tos/github-copilot-app/getting-started
[customize]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[using-automations]: https://docs.github.com/copilot/how-tos/github-copilot-app/using-automations
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[sandboxes]: https://docs.github.com/copilot/concepts/about-cloud-and-local-sandboxes
[chronicle]: https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/chronicle
[custom-agents]: https://docs.github.com/copilot/concepts/agents/cloud-agent/about-custom-agents
[byok]: https://docs.github.com/copilot/how-tos/github-copilot-app/use-byok-models
[deep-links]: https://docs.github.com/copilot/how-tos/github-copilot-app/open-with-deep-links