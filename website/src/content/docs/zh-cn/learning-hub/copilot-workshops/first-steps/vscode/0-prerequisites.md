---
title: "第 0 课 - 先决条件与设置"
description: "确认研讨会的先决条件，验证 VS Code 中的 Copilot Chat，添加 GitHub Pull Requests and Issues 扩展，并选择模型。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

让 Copilot 进入编辑器。VS Code 自带 Copilot，因此无需为聊天功能额外安装软件。添加 GitHub 扩展，然后打开空文件夹。

本课将：

- 确认研讨会的先决条件。
- 确认 Copilot Chat 在 VS Code 中能正常响应。
- 安装 GitHub Pull Requests and Issues 扩展。
- 打开空项目文件夹，并选择模型。

## 先决条件

需要具备：

- GitHub 账户。[创建 GitHub 账户][github-signup]，或使用现有账户。
- 有效的 Copilot 计划。[启用 Copilot Free 或付费 Copilot 计划][copilot-plans]。如果组织已提供 Copilot 访问权限，使用对应账户。
- [Visual Studio Code][vscode]。
- 已安装 [Git][git]。在终端中运行 `git --version` 验证。

## 设置 VS Code

1. 安装 [VS Code][vscode] 并登录 GitHub。Copilot 和 Copilot Chat 已内置，因此从标题栏打开 **Chat** 视图，确认它能正常响应。
2. 打开 **Extensions** 视图，安装官方 [GitHub Pull Requests and Issues][pr-extension] 扩展，让议题和拉取请求显示在侧边栏中。
3. 创建名为 `space-quiz` 的空文件夹，然后选择 **File** > **Open Folder** 并打开它。
4. 使用 **Chat** 视图中的模型选择器，按下一节的优先顺序选择模型。

## 选择模型

选择第一个可用选项：

1. **GPT-6-Luna**（推荐）。
2. **Auto**，作为兼顾各方面的备选。
3. [当前可用模型列表][active-models]中的任意模型。

模型是否可用取决于订阅计划、组织策略和产品版本。

## 总结与后续步骤

VS Code 已准备就绪，具备 Copilot Chat、GitHub 扩展和空的 `space-quiz` 文件夹。继续学习[第 1 课：在工作区中构建][next-lesson]。

[github-signup]: https://github.com/signup
[copilot-plans]: https://github.com/features/copilot/plans
[vscode]: https://code.visualstudio.com/
[git]: https://git-scm.com/downloads
[pr-extension]: https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-pull-request-github
[active-models]: https://docs.github.com/copilot/reference/copilot-billing/models-and-pricing
[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/vscode/1-build-and-polish/
