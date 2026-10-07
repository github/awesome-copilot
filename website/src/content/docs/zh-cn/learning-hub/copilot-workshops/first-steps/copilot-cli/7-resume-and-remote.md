---
title: "第 7 课 - 恢复会话与远程访问"
description: "离开 Copilot CLI 会话后，使用 copilot --resume 或 /resume 返回，还可用 /remote 从其他设备查看会话。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

会话可以暂停，而不丢失对话或工作区上下文。离开会话，稍后返回，还可以选择让其他设备访问。

本课将：

- 退出会话，并从终端恢复。
- 在不离开 CLI 的情况下切换会话。
- 按需让会话可供远程访问。

## 离开会话并稍后返回

1. 准备切换任务时，退出当前 Copilot CLI 会话。
2. 在终端中运行 `copilot --resume`，选择之前的会话。
3. 在 Copilot CLI 中使用 `/resume`，无需离开 CLI 即可切换会话。
4. 确认恢复后的会话仍有预期的文件、议题上下文和模型。

## 可选：远程继续会话

运行 `/remote`，让*同一个会话*继续在本地运行，同时可从网页和 GitHub Copilot 移动应用访问。本机需要保持开机。在浏览器中打开返回的链接，或在 GitHub Copilot 移动应用中访问会话。

> [!NOTE]
> `/remote` 不是委派，也不会将执行移到云端。本研讨会不要求使用此功能，可以在熟悉本地工作流程后再尝试。

## 总结与后续步骤

现在可以暂停并恢复会话，也可以从其他设备查看本地会话。继续学习[第 8 课：从 CLI 创建、审查与合并][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-cli/8-pull-request/
