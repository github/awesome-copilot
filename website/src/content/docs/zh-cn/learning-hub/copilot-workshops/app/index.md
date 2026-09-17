---
title: "GitHub Copilot app"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

[**GitHub Copilot app**](https://docs.github.com/copilot/concepts/agents/github-copilot-app) 是一款基于 Copilot CLI 构建的桌面应用，可将智能体驱动的开发集中到一个专注的工作区。它支持并行智能体会话、可切换的会话模式、共享画布，以及原生的 GitHub 议题和拉取请求管理功能。其中包括 **Agent Merge**，可处理拉取请求的变基、审查反馈、CI 修复与合并。

在这些课程中，你将安装应用并设置项目，然后熟悉应用工作区和模板为你创建的待办事项。你会先完成一项小改动，即添加星级评分；再根据议题添加自定义指令标准，在隔离的智能体会话中构建筛选功能，并使用可复用技能进行验证。随后，你将添加 Playwright MCP 服务器，在真实浏览器中探索该功能，并逐步提高合并自动化程度，最终由 **Agent Merge** 合并拉取请求。最后，你将通过共享画布协作并自动执行重复性工作，完整体验从构想到功能合并的流程。

## 课程

| 课程 | 主题 | 说明 |
|--------|-------|-------------|
| [0. 先决条件][ex0] | 设置 | 安装 Node.js，并创建自己的 Tailspin Toys 项目副本 |
| [1. 安装 Copilot app][ex1] | 设置 | 安装应用、连接项目并熟悉工作区 |
| [2. 运行第一个智能体会话][ex2] | 首次更改 | 启动会话，并通过第一个拉取请求交付一项小改动 |
| [3. 使用自定义指令引导 Copilot][ex3] | 上下文 | 根据议题添加文档标准并合并更改 |
| [4. 使用 Autopilot 构建功能][ex4] | 核心功能 | 使用 Plan 和 Autopilot 构建筛选功能，再通过技能进行验证 |
| [5. 使用 Playwright MCP 测试][ex5] | 外部工具 | 添加 Playwright MCP 服务器，并在浏览器中探索功能 |
| [6. 使用 Agent Merge 合并][ex6] | 合并 | 让 Agent Merge 修复并合并筛选功能的拉取请求 |
| [7. 使用画布规划][ex7] | 协作 | 创建共享画布来规划和跟踪工作 |
| [8. 回顾与后续步骤][ex8] | 总结 | 自动执行重复性任务，并探索后续内容 |

## 先决条件

参加本次研讨会前，请确保具备：

- [ ] 拥有有效 **Copilot Student、Pro、Pro+、Business 或 Enterprise** 计划的 GitHub 帐户
- [ ] 一台运行 **macOS、Linux 或 Windows** 的计算机
- [ ] 计算机上已[安装 Git][install-git]

> [!TIP]
> 没有付费计划？经过验证的学生可通过 [GitHub Education][callout-student-plan-education] 免费获取 GitHub Copilot。**Copilot Student** 计划包含本研讨会所需的智能体、MCP、代码审查和 Copilot CLI 功能，因此可以完成所有学习路径。

> [!NOTE]
> Copilot app 在本地计算机而非 codespace 中运行，因此[第 0 课][ex0]会先指导你安装 Node.js 并创建项目副本，然后再安装应用。

> [!NOTE]
> 如果使用 Copilot Business 或 Copilot Enterprise，管理员必须先启用 **Copilot CLI** 策略，你才能使用该应用。

## 开始学习

[**从第 0 课“先决条件”开始 →**][ex0]

[ex0]: /zh-cn/learning-hub/copilot-workshops/app/0-prerequisites/
[ex1]: /zh-cn/learning-hub/copilot-workshops/app/1-install-copilot-app/
[ex2]: /zh-cn/learning-hub/copilot-workshops/app/2-add-star-rating/
[ex3]: /zh-cn/learning-hub/copilot-workshops/app/3-custom-instructions/
[ex4]: /zh-cn/learning-hub/copilot-workshops/app/4-build-filtering/
[ex5]: /zh-cn/learning-hub/copilot-workshops/app/5-mcp-playwright/
[ex6]: /zh-cn/learning-hub/copilot-workshops/app/6-agent-merge/
[ex7]: /zh-cn/learning-hub/copilot-workshops/app/7-canvases/
[ex8]: /zh-cn/learning-hub/copilot-workshops/app/8-review/
[install-git]: https://github.com/git-guides/install-git
[callout-student-plan-education]: https://github.com/education/students