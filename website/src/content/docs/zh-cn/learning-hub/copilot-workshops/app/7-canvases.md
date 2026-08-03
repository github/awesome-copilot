---
title: "第 7 课 - 使用画布规划"
description: "在 GitHub Copilot app 中创建智能体驱动的共享画布，与智能体共同规划和跟踪工作。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

此前，你通过聊天指挥智能体。但许多工作并不只存在于对话中，而是呈现在看板、文档或检查清单上。借助**画布**，你和智能体可以直接在应用内共享一个适合此类工作的界面。本课将创建一个简单画布，用于规划和跟踪一直在处理的待办事项。

本课将介绍如何：

- 了解画布是什么以及何时使用画布。
- 创建共享的看板画布以对待办事项进行分类。
- 将画布保存到存储库，并为团队合并更改。
- 在新会话中打开画布，并从中开始工作。

## 场景

即使一切顺利，查看一长串议题也可能让人望而生畏。Tailspin Toys 的开发人员一直在寻找一种工具，用于快速对议题进行分类，并在 Copilot app 中着手处理。

## 什么是画布？

[画布][canvas-docs]是用于工作工件的共享交互式界面，例如计划、分类看板、发布检查清单、仪表板或文档。聊天非常适合描述意图和分析模糊问题，但大多数工作发生在具体的*界面*上。画布让你可以直接在该界面上与智能体协作。

画布支持**双向交互**：智能体可以在工作过程中更新画布，你也可以自行编辑同一个界面。创建画布时，智能体会根据提示词和工作流进行构建；之后，可以要求它添加、删除或修改功能。画布创建后会在应用右侧面板中打开。

常见示例包括：

- 用于规划当天工作以及确定议题和拉取请求优先级的 **Markdown 画布**。
- 由人员和智能体添加卡片并在列之间移动工作的**智能体看板**。
- 汇总存储库重要议题和重复出现主题的**议题分类看板**。

## 为什么使用画布？

当任务需要结构、迭代和验证，且仅靠聊天不足以完成时，可以使用画布。画布让你能够：

- 让智能体基于符合工作流的实际工件开展工作。
- 直接在共享界面上引导或纠正工作，再让智能体从更改处继续。
- 通过工件的可见更改检查进度，而不只是查看聊天回复。

## 创建画布来跟踪工作

你已经交付了许多内容：星级评分、文档标准和筛选功能都已合并。但待办事项中仍有其他工作。接下来创建画布，以便快速对这些工作进行分类。

1. 返回（或打开）GitHub Copilot app。
2. 选择 **Home screen**。
3. 确保为存储库选择了 `tailspin-toys`。
4. 在提示框中使用以下提示词，创建满足需求的画布：

   ```plaintext
   Create a basic Kanban board canvas that allows me to quickly triage work. Highlight the three issues which are most likely to need attention right now, with the remainder in a second section down below. The top three cards should include a description of the issue's content and a justification of why they're at the top of the list. Each issue should have a button that allows me to add it to the current context for the current session so I can get to work on it straightaway.
   ```

Copilot 将开始创建画布。

> [!NOTE]
> 此过程需要几分钟。由于任务较复杂，第一版可能无法完全令人满意。可以继续发送提示词，逐步构建理想的工具。

## 保存画布并合并到存储库

与指令文件和技能一样，画布也可以成为存储库中的资产。接下来要求 Copilot 将画布添加到存储库并合并，让整个团队都能使用。

1. 在同一会话中使用以下提示词，要求 Copilot 将画布保存到存储库：

   ```plaintext
   Let's save this canvas definition to the repository so I can share it with my development team
   ```

2. Copilot 保存画布文件后，选择右上角 **Create PR** 旁的下拉菜单。
3. 选择 **Agent merge** 以启用 agent merge。

   ![GitHub Copilot app 中展开的 Create PR 下拉菜单，箭头指向 Agent merge 选项](/images/learning-hub/copilot-workshops/app-enable-agent-merge.png)

4. 按钮文本现在会变为 **Agent merge**。
5. 选择 **Agent merge** 按钮，启动 agent merge 流程。

Copilot app 会开始创建并管理 PR。它先探索项目以确定创建 PR 的最佳方式，然后创建 PR。

片刻后，Copilot 会再次开始工作并查看 PR 条件，即运行存储库全部测试的 CI 流程。它会报告其他团队成员留下的审查状态、需要运行的检查（CI 流程），以及 PR 是否可合并。

6. 选择 **Agent merge** 旁的下拉菜单，再选择 **Merge pull request**，允许 agent merge 合并拉取请求。

   ![Agent merge 下拉菜单显示智能体获准执行的操作：Address reviews、Fix CI failures 和 Resolve conflicts，箭头指向 Merge pull request](/images/learning-hub/copilot-workshops/app-agent-merge-merge.png)

7. 等待所有 CI 流程通过（变为绿色）。全部通过后，Copilot 会自动合并拉取请求。

现在，你已经为团队创建了新的共享画布。

## 在画布中工作

画布创建后，接下来启动新会话并开始使用。

1. 在 Copilot app 中，选择 **tailspin-toys** 旁的 **New session** 启动新会话。
2. 使用以下提示词，要求 Copilot 打开分类画布：

   ```plaintext
   Open the triage issues canvas
   ```

3. 现在应会看到所构建的画布已在新会话中打开。
4. 在最感兴趣的一个议题上选择 **Add to current context**。
5. Copilot 将开始处理该议题。

现在，你已使用自己创建的画布简化了开发流程。

## 总结与后续步骤

你创建了一个可与智能体协作的共享界面。你：

- 了解了画布是什么以及何时使用画布。
- 与智能体共同创建了共享的看板分类画布。
- 使用 Agent Merge 将画布保存并合并到存储库。
- 在新会话中打开画布，并使用它开始工作。

待办事项现已得到跟踪。接下来回顾已构建的所有内容，并了解后续方向。继续学习[第 8 课 - 回顾与后续步骤][next-lesson]。

## 资源

- [在 GitHub Copilot app 中使用画布扩展][canvas-docs]
- [Awesome Copilot 上的画布][awesome-copilot-canvases]
- [关于 GitHub Copilot app][about-copilot-app]

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/app/8-review/
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[awesome-copilot-canvases]: https://awesome-copilot.github.com/extensions/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app