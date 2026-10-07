---
title: "第 9 课 - 将下一个想法交给云会话"
description: "将 Copilot Chat 的运行环境从 Local 切换到 Cloud，委派一个可独立完成、以拉取请求交付的功能。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

已经在本地完成整个流程，现在知道什么样的结果才是合格的。此时正适合让任务独立运行。Copilot Chat 可以将运行环境从本机切换到 GitHub。

本课将：

- 将 Copilot Chat 的运行环境从 **Local** 切换到 **Cloud**。
- 委派一个可独立完成、验收标准明确的功能。
- 审查产生的拉取请求。

> [!NOTE]
> 云会话需要符合条件的付费 Copilot 计划。Business 和 Enterprise 的访问权限可能还需要管理员启用。

## 委派到云端

![VS Code 中 Copilot Chat 的示意图，Harness 选择器已打开。Copilot 下选择了 Cloud 而不是 Local，还列出 Claude、Codex 等其他运行环境。上方添加三个新配色主题的请求显示 Working in the cloud，并提供在 GitHub 上查看会话进度的链接。](/images/learning-hub/copilot-workshops/first-steps-vscode-cloud-harness.svg)

**Harness** 选择器列出在 **Local** 或 **Cloud** 运行的 Copilot，以及其他运行环境。切换到 **Cloud** 后，下一个请求将在 GitHub 上运行，而不是在本机运行。

1. 在 Copilot Chat 中打开 **Harness** 选择器，将 Copilot 从 **Local** 切换到 **Cloud**。
2. 启动新会话，提供一个可独立完成、验收标准明确的功能：

   ```plaintext
   Add a theme picker to the space quiz with three named themes: Deep Space, Launch Pad, and Lunar. Persist the choice in localStorage, keep everything in the single index.html with no dependencies, keep contrast accessible in every theme, and open a pull request when the tests pass.
   ```

3. 合上笔记本电脑。工作会继续在 GitHub 上运行，并以拉取请求交付。
4. 像审查自己编写的拉取请求一样，认真审查这个拉取请求。

> [!TIP]
> **委派能够描述清楚的任务**
>
> 云会话在任务说明明确时效果更好。如果还写不出验收标准，任务就还没准备好离开本机。

## 总结与后续步骤

已经将功能委派给云会话，并审查了结果。继续学习[第 10 课：回顾与后续步骤][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/vscode/10-review/
