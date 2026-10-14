---
title: "第 6 课 - 使用议题与会话"
description: "创建范围明确的待办事项，选择一个议题，在隔离的工作树中实现，并亲自审查差异。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

让智能体提出范围明确的产品改进建议，将想法转化为 GitHub 议题，并在隔离的会话中实现其中一个。

本课将：

- 为 Space Quiz 创建三个范围明确的议题。
- 在 **Issues** 中浏览待办事项。
- 从议题启动使用新工作树的会话。
- 在 **Changes** 选项卡中审查差异并验证功能。

## 在 Issues 中创建待办事项

发送以下提示词：

```plaintext
Review the space quiz and suggest three focused feature ideas that could each be completed in a short session. Create a separate GitHub issue for each idea with a clear title, user-focused description, and acceptance criteria. Do not implement them yet.
```

打开 **Issues**，审查这三个议题，选择一个价值明确且范围可控的议题。

![Copilot app 的 Issues 视图示意图。侧边栏列出 New、Pull requests、Issues、Automations、Customize、More 和 space-quiz 项目。主区域包含 Assigned to me、Created by me、Mentioning me 和 Done 选项卡、搜索框、State 和 Assignee 筛选器，以及 space-quiz 存储库中的三个未关闭议题。](/images/learning-hub/copilot-workshops/first-steps-app-issues.svg)

**Issues** 将所有存储库中的 GitHub 议题汇总到应用中，并按 **Assigned to me**、**Created by me**、**Mentioning me** 和 **Done** 筛选。

## 实现议题

1. 从 **Issues** 打开选定的议题。
2. 选择 **New session**。
3. 出现提示时，选择 **new worktree**。
4. 使用 **Interactive** 模式和偏好的模型。
5. 发送以下提示词：

   ```plaintext
   Implement this issue completely. Keep the single-file, dependency-free design, test the behavior in the integrated browser, and summarize the changes when finished.
   ```

新工作树将功能与默认分支隔离，直到准备好审查和合并。

## 亲自审查差异

智能体报告结果后，不要仅凭报告就认定工作无误。

1. 打开右侧弹出面板，选择 **Changes** 选项卡。
2. 查看会话修改过的每个文件的差异。
3. 在集成浏览器中测试功能，确认满足议题的验收标准。

![Copilot app 会话示意图，右侧弹出面板已打开 Changes 选项卡。面板显示一个已更改的文件 index.html，新增 142 行、删除 8 行，差异行与会话对话并排显示。](/images/learning-hub/copilot-workshops/first-steps-app-changes-tab.svg)

**Changes** 选项卡列出会话修改过的每个文件，并内联显示差异。

## 总结与后续步骤

已经创建待办事项，在隔离会话中实现一个议题，并审查了差异。继续学习[第 7 课：先规划再编辑][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-app/7-plan-mode/
