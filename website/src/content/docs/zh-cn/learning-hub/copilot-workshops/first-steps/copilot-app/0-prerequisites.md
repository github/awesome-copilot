---
title: "第 0 课 - 先决条件与设置"
description: "确认研讨会的先决条件，安装 GitHub Copilot app，并熟悉工作区。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

构建 Space Quiz 之前，先确认所需条件，安装 GitHub Copilot app，并熟悉工作区。

本课将：

- 确认研讨会的先决条件。
- 安装并登录 GitHub Copilot app。
- 为会话选择模型。
- 认识应用的主要工作区域。
- 尝试一次简短聊天。

## 先决条件

需要具备：

- GitHub 账户。[创建 GitHub 账户][github-signup]，或使用现有账户。
- 有效的 Copilot 计划。[启用 Copilot Free 或付费 Copilot 计划][copilot-plans]。如果组织已提供 Copilot 访问权限，使用对应账户。
- 一台运行 macOS、Windows 或 Linux 的计算机。

应用自带 Git，无需再安装其他软件。

> [!NOTE]
> 如果使用 Copilot Business 或 Copilot Enterprise，管理员必须先启用 **Copilot CLI** 策略，智能体会话才能正常工作。

## 安装与配置应用

1. 下载并安装适用于当前操作系统的 [GitHub Copilot app][download-app]。
2. 打开应用。
3. 选择 **Sign in to GitHub** 并完成身份验证。
4. 选择主题，然后选择 **Finish**。

## 选择模型

选择模型时，按以下优先顺序选择第一个可用选项：

1. **GPT-6-Luna**（推荐）。
2. **Auto**，作为兼顾各方面的备选。
3. [当前可用模型列表][active-models]中的任意模型。

模型是否可用取决于订阅计划、组织策略和产品版本。

## 熟悉界面

应用将开发工作流集中到一处：

- **New**：在项目中启动会话，或选择 **Chat** 快速提问。
- **Pull requests**：审查并跟踪所有存储库中的拉取请求。
- **Issues**：查找分配给自己、由自己创建或提及自己的议题。
- **Automations**：安排存储库中的周期性智能体任务。
- **Customize**：更改主题和模型，并管理 Canvas 扩展。
- **Projects**：打开存储库，各个存储库的会话列在其下方。

## 尝试简短聊天

并非每个问题都需要工作区。在 **New** 中选择 **Chat**，而不是项目。聊天不关联存储库，也不能编辑文件，因此是快速提问、获取解释，或在启动正式会话前思考方案的最快方式。

在聊天中发送以下提示词：

```plaintext
How does the GitHub Copilot app use worktrees?
```

## 总结与后续步骤

已经确认先决条件、安装应用、选择模型，并探索了主要工作区域。继续学习[第 1 课：创建 Space Quiz 工作区][next-lesson]。

[github-signup]: https://github.com/signup
[copilot-plans]: https://github.com/features/copilot/plans
[download-app]: https://gh.io/app
[active-models]: https://docs.github.com/copilot/reference/copilot-billing/models-and-pricing
[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-app/1-create-workspace/
