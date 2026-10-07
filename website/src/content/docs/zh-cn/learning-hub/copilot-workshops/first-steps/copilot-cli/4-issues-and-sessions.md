---
title: "第 4 课 - 并行处理议题"
description: "创建待办事项，从侧面板将议题添加到聊天，使用 /diff 审查更改，并在独立工作树中启动第二个会话。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

在终端中管理待办事项和实现流程，并为相互独立的工作开启单独的会话。

本课将：

- 创建三个范围明确的 GitHub 议题。
- 从侧面板将议题添加到聊天并实现。
- 使用 `/diff` 审查更改。
- 在隔离的工作树中启动第二个会话。

## 创建待办事项

发送以下提示词：

```plaintext
Review the space quiz and create three focused GitHub issues with clear titles, user-focused descriptions, and acceptance criteria. Do not implement them yet.
```

## 在当前会话中处理第一个议题

1. 按 <kbd>Left arrow</kbd> 键打开侧面板，然后按 <kbd>Tab</kbd> 切换到 **Issues** 选项卡。
2. 高亮选中第一个议题，按 <kbd>c</kbd> 将其作为上下文添加到聊天。要先阅读完整议题，则按 <kbd>Enter</kbd>。
3. 让智能体实现该议题。

![终端中的 Copilot CLI 侧面板示意图。顶部有 Current、Sessions、Issues、Pull requests 和 Gists 选项卡，其中 Issues 已选中。针对 space-quiz 存储库未关闭议题的搜索筛选显示一个议题：Add a score screen at the end of the quiz。提示说明 Left arrow 键用于打开面板，Tab 用于切换选项卡；底部列出快捷键：斜杠用于搜索，Enter 查看详情，o 打开，w 创建工作树，c 添加到聊天，a 显示全部。](/images/learning-hub/copilot-workshops/first-steps-cli-side-panel.svg)

侧面板顶部列出所有选项卡，底部的快捷键提示适用于当前高亮选中的项目。

## 使用 `/diff` 审查更改

项目已发布，因此有已验证的版本可供比较。`/diff` 准确显示本次议题在该版本基础上更改了什么，也就是即将请他人审查的内容。

1. 运行 `/diff`，查看每个已更改的文件。
2. 对任何看起来不正确的内容要求修复，然后再次运行 `/diff`。
3. 想直接检查 Git 时，随时运行 `!git status` 或 `!git diff`。

## 并行处理第二个议题

1. 再次打开侧面板，切换到 **Sessions** 选项卡。
2. 为第二个议题启动另一个会话，同时保留第一个会话。
3. 在新会话中运行 `/worktree`，使用隔离的工作树，而不是在原目录中创建分支。现在两个会话可以同时运行，互不干扰。
4. 用 <kbd>c</kbd> 将第二个议题添加到该会话。
5. 暂时保持会话在这个状态。下一课会在编写任何代码之前规划这个议题。

![运行 /worktree 后的 Copilot CLI 输出示意图。输出显示已在 issue-13-review-screen 分支上创建工作树 ../space-quiz-13，本会话现在在该位置工作，main 保持不变。](/images/learning-hub/copilot-workshops/first-steps-cli-worktree.svg)

`/worktree` 将会话移到独立分支上的独立检出目录中，让第一个会话继续工作，不受干扰。

## 总结与后续步骤

已经实现第一个议题，用 `/diff` 审查了更改，并在独立工作树中启动第二个会话。继续学习[第 5 课：先规划再编辑][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-cli/5-plan-mode/
