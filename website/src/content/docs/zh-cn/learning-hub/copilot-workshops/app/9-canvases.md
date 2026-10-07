---
title: "第 9 课 - 探索并创建画布"
description: "使用现有的 Database Explorer 画布，再创建并审查由存储库支持的分类画布。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

此前，你通过聊天指挥智能体。但许多工作并不只存在于对话中，而是呈现在看板、文档或检查清单上。借助**画布**，你和智能体可以直接在应用内共享一个适合此类工作的界面。本课将先使用 Tailspin Toys 自带的画布，再为一直在处理的待办事项创建一个画布。

本课将介绍如何：

- 了解画布是什么以及何时使用画布。
- 使用现有的 Database Explorer 画布检查项目数据。
- 创建共享的看板画布以对待办事项进行分类。
- 检查并操作新画布，而不实现其他功能。

## 场景

Tailspin Toys 已包含用于探索数据库的画布。使用它了解画布如何将项目数据转换为交互式界面后，你将创建一个可复用的看板，用于选择下一项工作，而不开始实现其他功能。

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

## 使用 Database Explorer 画布

先使用项目现有的 Database Explorer 画布。通过可用的示例，可以在自行创建画布前了解存储库范围的画布如何工作。

1. 确认筛选拉取请求 (PR) 已合并，并更新本地 `main`。
2. 返回 GitHub Copilot app，选择 **Home screen**。
3. 确认已选择 `tailspin-toys` 存储库。
4. 基于更新后的 `main` 在 **new working tree** 中创建会话，再选择 **Interactive** 模式。
5. 要求 Copilot 根据需要准备本地数据库，并打开现有画布且不做更改：

   ```plaintext
   Set up the local database if needed, then open the repository's Database Explorer canvas. Do not change any files.
   ```

6. 在 Database Explorer 中浏览可用表，并选择 `games`。
7. 运行只读查询，显示五款评分较高的游戏：

   ```sql
   SELECT title, star_rating
   FROM games
   ORDER BY star_rating DESC
   LIMIT 5;
   ```

8. 确认结果包含不超过五款游戏，并按评分降序排列。
9. 打开 **Files**，检查 `.github/extensions/database-explorer/extension.mjs`。注意画布如何随项目存储，并将查询限制为只读的 `SELECT` 和 `WITH` 语句。
10. 确认会话没有文件更改。

## 创建画布来分类议题

现在创建另一种共享界面。将分类画布保存在项目范围内，使其成为团队可以审查和复用的存储库资产。

1. 在同一会话中输入 `/create-canvas`，再描述要创建的画布：

   ```plaintext
   Create a Kanban triage canvas for this repo's open issues and save it under .github/extensions/. Highlight the three issues you'd prioritize and explain why, with the rest below. Include summaries and links.

   Give each card an "Add to current context" action that adds the issue details without starting work or changing the issue. Make it keyboard-accessible and open it so I can try it.
   ```

Copilot 会在 `.github/extensions` 下创建画布扩展，并在应用右侧面板中打开共享界面。生成的扩展是可执行的存储库内容，而不只是可视工件，因此接下来需要检查其文件和行为。

## 检查并操作画布

共享画布前，将其与存储库中的实际议题进行比较，并操作其控件。这样可以确认内容准确、交互无障碍，而且议题操作只添加上下文，不会启动工作。

1. 打开 **Changes**，确认画布定义由存储库支持并位于 `.github/extensions/` 下，而不是仅保存到用户或会话。检查现有扩展和应用文件是否保持不变。
2. 将看板与实际未关闭的议题进行比较，并评估排序说明。
3. 检查卡片和控件是否清晰可读，且支持键盘操作。
4. 为一个议题选择 **Add to current context**，确认只有议题详情进入对话，不应开始实现或更改议题状态。
5. 审查所有修正，并让 Copilot 对更改的文件运行适用的现有验证。记录结果和阻塞项，不要仅因为交互界面能打开就假定它正确。
6. 如果画布需要更改，请在分类范围内请求针对性改进，然后重复受影响的检查。不要在此画布工作中实现某个待办议题。

本工作坊不会再创建 PR，因为你已练习过手动合并和 Agent Merge。在生产环境中，应先按团队的常规流程审查并合并画布，再让其他人使用。

## 总结与后续步骤

你创建并复用了一个可与智能体协作的共享界面。本课中，你：

- 了解了画布是什么以及何时使用画布。
- 使用现有的 Database Explorer 画布检查了项目数据。
- 创建了用于对待办事项进行分类的共享看板画布。
- 检查并操作了新画布，而未实现其他功能。

待办事项现已得到跟踪。接下来回顾已构建的所有内容，并了解后续方向。继续学习[第 10 课 - 总结与后续步骤][next-lesson]。

## 资源

- [在 GitHub Copilot app 中使用画布扩展][canvas-docs]
- [Awesome Copilot 上的画布][awesome-copilot-canvases]
- [关于 GitHub Copilot app][about-copilot-app]

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/app/10-review/
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[awesome-copilot-canvases]: https://awesome-copilot.github.com/extensions/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app