---
title: "第 5 课 - 先规划再编辑"
description: "使用 /plan 将第二个会话切换到计划模式，让智能体先提出方案，再编辑文件。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

第二个会话已在独立工作树中运行。不要从写代码开始。计划模式会调查项目并提出方案，同时保持文件不变。

本课将：

- 将第二个会话切换到计划模式。
- 审查并完善智能体提出的计划。
- 批准计划，让会话实现它。

## 在任何编辑之前确定方案

1. 切换到上一课打开的**第二个会话**。
2. 运行 `/plan`，将该会话切换到计划模式。
3. 发送以下提示词，让智能体在不编辑任何内容的情况下调查：

   ```plaintext
   Plan how to implement this issue. Investigate the existing quiz, list the files you would change, call out risks to accessibility and the single-file constraint, and stop before making any edits.
   ```

4. 阅读计划，指出所有遗漏，然后批准。
5. 会话以已批准的计划为任务说明，继续进行实现。

> [!TIP]
> **何时值得使用计划模式**
>
> 对于含糊不清、涉及多个方面或难以撤销的任务，使用计划模式。修正不当方案成本最低的时机，是第一次编辑之前。

## 总结与后续步骤

已经在智能体编写任何代码之前共同确定了方案。继续学习[第 6 课：了解智能体能看到什么][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-cli/6-context/
