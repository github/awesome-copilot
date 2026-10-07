---
title: "第 5 课 - 先规划再编辑"
description: "将 Copilot Chat 切换到 Plan 模式，先调查工作区并提出方案，再编辑文件。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Plan 模式会调查工作区并编写实现计划，而不改动文件。

本课将：

- 将 Copilot Chat 从 Agent 切换到 Plan。
- 审查并完善提出的计划。
- 切回 Agent 来实现计划。

## 在任何编辑之前确定方案

1. 打开 Copilot Chat，使用输入框上方的**模式下拉菜单**。
2. 从 **Agent** 切换到 **Plan**。
3. 用以下提示词描述下一个功能，让 Copilot 调查工作区：

   ```plaintext
   Plan how to add a review screen that shows every question with the answer I chose. Investigate the existing quiz, list the changes you would make, call out accessibility and single-file risks, and stop before editing.
   ```

4. 阅读计划并要求调整，然后切回 **Agent** 来实现。

> [!TIP]
> **何时值得使用计划模式**
>
> 对于含糊不清、涉及多个方面或难以撤销的任务，使用 Plan 模式。修正不当方案成本最低的时机，是第一次编辑之前。

## 总结与后续步骤

已经在 Copilot 编写任何代码之前共同确定了方案。继续学习[第 6 课：为 Copilot 配备 GitHub 工具][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/vscode/6-github-mcp/
