---
title: "第 0 课 - 先决条件与设置"
description: "确认研讨会的先决条件，安装 GitHub Copilot CLI，登录，并在空项目文件夹中选择模型。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

让智能体进入终端。确认所需条件，安装 GitHub Copilot CLI，登录，并准备好从空文件夹发出第一个请求。

本课将：

- 确认研讨会的先决条件。
- 安装 GitHub Copilot CLI 并登录。
- 创建并信任项目文件夹。
- 为会话选择模型。

## 先决条件

需要具备：

- GitHub 账户。[创建 GitHub 账户][github-signup]，或使用现有账户。
- 有效的 Copilot 计划。[启用 Copilot Free 或付费 Copilot 计划][copilot-plans]。如果组织已提供 Copilot 访问权限，使用对应账户。
- 已安装 [Git][git]。运行 `git --version` 验证。
- 一台运行 macOS、Windows 或 Linux 的计算机。

[GitHub CLI][gh-cli]（`gh`）是可选项，但建议安装，因为它能让智能体代为创建存储库和拉取请求。

> [!NOTE]
> 如果使用 Copilot Business 或 Copilot Enterprise，管理员必须先启用 **Copilot CLI** 策略，智能体会话才能正常工作。

## 设置 CLI

1. 安装适用于当前平台的 [GitHub Copilot CLI][install-cli]。
2. 创建并进入项目文件夹：

   ```bash
   mkdir space-quiz && cd space-quiz
   ```

3. 运行 `copilot`，登录，并在提示时信任文件夹。
4. 运行 `/model`，按下一节的优先顺序选择模型。
5. 如果尚未安装 [GitHub CLI][gh-cli]，可以选择安装。

![标题为 space-quiz 的终端窗口中的 Copilot CLI 示意图。界面询问是否信任此文件夹中的文件，已选中 Yes, proceed，并提示使用 /model 选择本次会话的模型，用 /help 列出全部斜杠命令。提示词行显示 Create a space exploration quiz。](/images/learning-hub/copilot-workshops/first-steps-cli-welcome.svg)

CLI 启动时会显示信任提示和一些入门命令，包括 `/model`。

> [!TIP]
> 随时输入 `/` 可浏览所有可用命令，或运行 `/help` 查看完整参考。

## 选择模型

运行 `/model` 时，按以下优先顺序选择第一个可用选项：

1. **GPT-6-Luna**（推荐）。
2. **Auto**，作为兼顾各方面的备选。
3. [当前可用模型列表][active-models]中的任意模型。

模型是否可用取决于订阅计划、组织策略和产品版本。

## 总结与后续步骤

Copilot CLI 已安装并登录，正在空的 `space-quiz` 文件夹中运行。继续学习[第 1 课：从终端构建测验][next-lesson]。

[github-signup]: https://github.com/signup
[copilot-plans]: https://github.com/features/copilot/plans
[git]: https://git-scm.com/downloads
[gh-cli]: https://cli.github.com/
[install-cli]: https://docs.github.com/copilot/how-tos/set-up/install-copilot-cli
[active-models]: https://docs.github.com/copilot/reference/copilot-billing/models-and-pricing
[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-cli/1-build/
