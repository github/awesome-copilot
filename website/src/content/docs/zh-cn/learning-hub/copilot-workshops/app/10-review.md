---
title: "第 10 课 - 总结与后续步骤"
description: "回顾 App 工作流、两个 PR 里程碑、画布练习和可复用质量实践，再探索更多资源。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

你在一套连续的 Tailspin Toys 工作流中使用了 GitHub Copilot app。你：

- 连接了存储库，探索了应用工作区和模板创建的待办事项，并尝试了快速聊天。
- 启动范围明确的星级评分会话，在浏览器画布中审查结果，并手动合并了第一个拉取请求 (PR)。
- 从筛选功能议题启动会话，在 **Plan** 模式中确定方案，在 **Autopilot** 模式中构建，再在 **Interactive** 模式中审查。
- 使用自定义指令引导智能体，再自定义现有的 `quality-checks` 技能，用它运行单元测试、lint 和类型检查。
- 添加 Playwright 模型上下文协议 (MCP) 服务器，并用它在真实浏览器中探索筛选功能。
- 创建并选择 QA 自定义智能体，以评估需求、覆盖情况、技能脚本结果和浏览器证据。
- 审查完整的筛选功能更改，并为第二个 PR 授权 **Agent Merge**。
- 使用现有的 Database Explorer 画布，再创建并测试由存储库支持的分类画布。

## 交付的内容

本研讨会有两个 PR 里程碑，每个里程碑都从更新后的 `main` 使用自己的分支：

1. **星级评分**：在游戏卡片上显示现有的 `starRating`，以及明确的未评分状态。
2. **筛选功能及质量工作流**：实现筛选功能，更新指令并将其应用于该功能，自定义 `quality-checks` 报告，创建 QA 配置文件，并包含相关测试。

从规划筛选功能到创建其 PR，你一直使用同一会话、工作树和分支。为简化工作坊流程，我们将这些工作合并到一个 PR 中。随后，你使用现有的 Database Explorer 并创建了由存储库支持的分类画布，没有重复 PR 工作流。

## 不同类型的验证

你通过多种方式检查了代码：自动化测试、自己的浏览器检查，以及 Copilot 通过 MCP 进行的浏览器探索。`quality-checks` 技能运行单元测试、lint 和类型检查，并按新的格式报告结果。创建 PR 前，QA 将这些结果与需求和测试覆盖情况的审查结合起来。

新增测试应填补真实缺口；不需要新增测试的 QA 运行也可能完全正确。缺少工具、跳过检查和失败都是需要明确报告的阻塞项，而不是通过。授权合并前审查代码和证据，并在改动后更新受影响的证据。

## 最佳实践

提供给 Copilot 的上下文和工具会影响其工作。在本工作坊中，你更新了指令、自定义了技能、创建了 QA 配置文件、配置了 MCP 服务器并创建了画布。应在不同会话中复用这些自定义项，并随团队需求的变化加以调整。指令设定标准，技能描述可重复执行的任务，自定义智能体定义专业角色，MCP 服务器连接外部工具，画布则提供共享交互式界面。审查实际更改和工具结果，而不只是智能体的摘要。

根据任务选择适合的**模式和模型**。使用 **Plan** 在构建前思考方法；使用 **Interactive** 参与范围明确的更改；仅对范围清晰且彼此隔离的任务使用 **Autopilot**。日常编辑可选择更快的模型，复杂工作则选择推理能力更强的模型并提高推理强度。

上下文与基础设施同样重要。清楚说明要构建*什么*、*为什么*构建，以及*如何*构建，会显著影响输出。在决定创建完整会话前，可以先通过快速聊天明确想法的范围。

## 更多探索内容

你已经了解核心工作流。以下功能也值得探索：

- [**Automations**][using-automations]：用于重复性或按需任务，例如汇总近期工作。采用前审查计划、权限和范围；创建自动化任务属于后续方向，不是本研讨会的一部分。
- **Rubber duck**：用于分析问题，并在构建前获得高信噪比反馈。
- [`/chronicle`][chronicle]：生成会话过程的叙述。
- [Bring your own key (BYOK)][byok]：使用自己提供商的模型，包括通过 Ollama、Foundry Local 或 LM Studio 使用本地模型。
- [Deep links][deep-links]：直接在应用中打开存储库、会话或提示词。

## 后续步骤

熟练使用任何工具的最佳方式都是持续使用。可将它用于生产代码、业余项目，或那个构思多年却始终没有动手构建的小应用。与团队分享经验，也向团队学习。并且一如既往地探索文档。

要探索 GitHub Copilot 生态系统的更多内容，请查看 [VS Code 学习路径][vscode-harness]、[Copilot CLI 学习路径][cli-harness]或 [Cloud agent 学习路径][cloud-harness]。

## 资源

- [关于 GitHub Copilot app][about-copilot-app]
- [GitHub Copilot app 入门][getting-started]
- [自定义 GitHub Copilot app][customize]
- [使用自动化][using-automations]
- [使用画布扩展][canvas-docs]

[vscode-harness]: /zh-cn/learning-hub/copilot-workshops/vscode/
[cli-harness]: /zh-cn/learning-hub/copilot-workshops/cli/
[cloud-harness]: /zh-cn/learning-hub/copilot-workshops/cloud/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[getting-started]: https://docs.github.com/copilot/how-tos/github-copilot-app/getting-started
[customize]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[using-automations]: https://docs.github.com/copilot/how-tos/github-copilot-app/using-automations
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[chronicle]: https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/chronicle
[byok]: https://docs.github.com/copilot/how-tos/github-copilot-app/use-byok-models
[deep-links]: https://docs.github.com/copilot/how-tos/github-copilot-app/open-with-deep-links