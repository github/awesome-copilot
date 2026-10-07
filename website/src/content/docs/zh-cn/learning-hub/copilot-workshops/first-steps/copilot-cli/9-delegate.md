---
title: "第 9 课 - 对工作流程有把握后再委派工作"
description: "将 Space Quiz 的新功能交给 /delegate，在任务运行时继续工作，并从 CLI 查看云会话进度。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

已经交付一个功能，现在知道什么样的结果才是合格的。此时值得让一个全新的想法与当前工作并行运行，而不是占据当前会话。本课将委派**可分享的任务报告**功能，把一次已完成的答题结果变成玩家可以发布的卡片。

本课将：

- 使用 `/delegate` 委派新功能。
- 在委派任务运行时继续在主会话中工作。
- 接受委派结果之前先比较。

> [!NOTE]
> `/delegate` 和云会话需要符合条件的付费 Copilot 计划。Business 和 Enterprise 的访问权限可能还需要管理员启用。

## 委派新功能

运行 `/delegate`，委派以下任务：

```plaintext
Delegate this: add a shareable mission report to the space quiz. At the end of a run, generate a compact summary card with the score, a rank title based on the percentage, and the slowest question. Add a Copy result button that puts a short plain-text version on the clipboard. Keep it in the single index.html with no dependencies, keep it keyboard accessible, and report back with what changed.
```

1. 在委派任务运行时，继续在主会话中工作。
2. 接受结果之前，将委派结果与当前会话进行比较。
3. 对于范围更大、说明清晰的议题，启动**云会话**，并从 CLI 查看进度。

## 总结与后续步骤

已经委派完整功能并审查结果。继续学习[第 10 课：回顾与后续步骤][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-cli/10-review/
