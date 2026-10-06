---
title: "第 9 课 - 自动化议题分类"
description: "创建并运行每周自动化任务，汇总最近的未关闭议题。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

使用自动化，将重复的议题分类任务转化为定时运行的智能体工作流。

本课将：

- 创建每周自动化任务。
- 将自动化任务关联到 Space Quiz 项目。
- 立即运行自动化任务并审查结果。

## 创建自动化任务

![Copilot app 的 Automations 视图示意图，包含 All、Local 和 Cloud 筛选器、搜索框、Templates 和 New automation 按钮，以及 space-quiz 项目的两个每周自动化任务卡片：Issue triage 和 Accessibility audit。](/images/learning-hub/copilot-workshops/first-steps-app-automations.svg)

自动化任务按计划运行同一个提示词，每个任务都有独立的会话，因此不会干扰当前工作。可以按 **All**、**Local** 或 **Cloud** 筛选，也可以按需运行任意自动化任务。

1. 打开 **Automations**。
2. 选择用于新建每周自动化任务的模板。
3. 输入以下提示词：

   ```plaintext
   Review the latest GitHub issues created and still open in the last week, and provide a summary table ranked by severity and priority.
   ```

4. 将会话模式设为 **Autopilot**。
5. 将模型设为 **Auto**。
6. 选择 `space-quiz` 项目。
7. 打开 **Create** 下拉菜单，然后选择 **Create and run**。

审查生成的汇总，确认其中引用了存储库中最近的未关闭议题。

## 总结与后续步骤

已经创建可复用、按计划运行的智能体工作流。继续学习[第 10 课：远程继续会话][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-app/10-remote/
