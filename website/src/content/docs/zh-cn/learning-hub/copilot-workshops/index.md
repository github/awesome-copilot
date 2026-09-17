---
title: "动手实践 GitHub Copilot 智能体"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

GitHub Copilot 最近新增的功能为开发人员提供了贯穿整个软件开发生命周期 (SDLC) 的强大工具，包括处理 GitHub 上的议题和拉取请求、与外部服务交互，当然也包括创建代码。本实验将探索这些功能，并通过实际用例和技巧，帮助你充分发挥这些工具的价值。

> [!CAUTION]
> GitHub Copilot 具有概率性而非确定性，因此生成的具体代码、修改的文件等可能有所不同。因此，实验中的屏幕截图和代码片段可能与你的实际体验略有差异。这是正常现象，也是使用此类工具的固有特点。
>
> 如果内容似乎有误或无法正常运行，请向导师求助！

## 选择操作环境

无论在哪里工作，都可以使用 GitHub Copilot。请选择符合开发方式的操作环境，并基于共用的 Tailspin Toys 待办事项完成相应练习。每种操作环境都有专属的设置步骤，可以直接开始所选路径。

### 🖥️ [VS Code](/zh-cn/learning-hub/copilot-workshops/vscode/)

在 **Visual Studio Code** 和 GitHub Codespaces 中使用 GitHub Copilot。无需离开熟悉的编辑器，即可使用 Copilot Chat 智能体模式、MCP 服务器和自定义智能体。如果希望将 AI 辅助直接融入 IDE，这是理想选择。

### 💻 [Copilot CLI](/zh-cn/learning-hub/copilot-workshops/cli/)

**GitHub Copilot CLI** 是一款在终端中运行的智能体助手。安装后，可以连接 MCP 服务器、使用计划模式生成代码，还能完全通过命令行构建自己的技能、自定义智能体和斜杠命令。

### 🤖 [Copilot App](/zh-cn/learning-hub/copilot-workshops/app/)

**GitHub Copilot app** 是一款基于 Copilot CLI 构建的桌面应用。它支持并行运行智能体会话、切换会话模式、在画布上协作，以及直接管理 GitHub 议题和拉取请求。其中包括 **Agent Merge**，可引导拉取请求完成变基、处理审查反馈、修复 CI 问题并最终合并。

### ☁️ [Copilot Cloud Agent](/zh-cn/learning-hub/copilot-workshops/cloud/)

**Copilot 云智能体** 是一位异步结对编程伙伴，可在后台处理 GitHub 议题。可以分配工作、通过自定义智能体提供指导、在智能体仪表板中监控进度，并审查它创建的拉取请求。

## 场景

你是 Tailspin Toys 的新开发人员。这是一家虚构公司，为开发人员主题的桌游提供众筹服务，而这可是一个巨大的市场！团队的待办事项已经创建为 GitHub 议题，等待处理。其中既有筛选和分页等功能开发，也有无障碍支持和编码标准等质量改进。你将通过迭代完成这些任务，同时探索网站和 Copilot 的功能。

## 开始使用

选择上述操作环境即可开始。每种环境都会先引导完成所需设置，让你立即开始构建。