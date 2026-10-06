---
title: "第 7 课 - 先规划再编辑"
description: "针对第二个议题使用 Plan 模式，让智能体先调查项目并提出方案，再更改文件。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

并非每个议题都应该从编辑开始。Plan 模式先调查项目、提出方案，并等待批准，然后才更改代码。

本课将：

- 为第二个议题启动 Plan 模式会话。
- 审查并完善智能体提出的计划。
- 批准计划，并选择会话继续运行的方式。

## 在更改代码之前确定方案

1. 从 **Issues** 打开**第二个议题**，选择 **New session**。
2. 在会话配置中选择 **Plan**，而不是 **Interactive** 或 **Autopilot**。
3. 发送以下提示词，让智能体在不更改文件的情况下调查：

   ```plaintext
   Plan how to implement this issue. Investigate the existing quiz, list the files you would change, call out risks to accessibility and the single-file constraint, and stop before making any edits.
   ```

4. 阅读提出的计划，如果有遗漏，要求调整。
5. 批准计划。
6. 出现提示时，选择让会话以 **Interactive** 还是 **Autopilot** 模式继续。

> [!TIP]
> **何时值得使用 Plan 模式**
>
> 对于含糊不清、涉及多个方面或难以撤销的任务，使用 Plan 模式。修正不当方案成本最低的时机，是第一次编辑之前。

## 总结与后续步骤

已经在智能体编写任何代码之前共同确定了方案。继续学习[第 8 课：完成 Copilot 审查流程][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-app/8-review-loop/
