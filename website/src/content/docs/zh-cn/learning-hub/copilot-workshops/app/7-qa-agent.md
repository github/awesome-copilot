---
title: "第 7 课 - 创建并使用 QA 智能体"
description: "创建以需求为先的 QA 配置，将测试覆盖、quality-checks 技能和直接浏览器验证证据结合起来。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

你已使用 `quality-checks` 技能运行自动化检查，并使用 Playwright MCP 在浏览器中观察筛选体验。现在，你将通过定义清晰 QA 流程的自定义智能体，将这些能力结合起来。

在本课中，你将：

- 探索自定义智能体如何与指令、技能和 MCP 工具配合。
- 创建并检查可复用的 QA 配置。
- 选择 QA 智能体，并对照筛选议题审查其发现。

## 场景

创建拉取请求 (PR) 前，Tailspin Toys 希望以一致的方式审查需求、代码质量、自动化检查、测试覆盖和浏览器行为。自定义智能体可协调这一 QA 流程，并提供可复用的报告。

## 什么是自定义智能体？

自定义智能体是通过 Markdown 配置文件定义的 Copilot 专业版本。该配置文件描述智能体的用途、指令和可用工具。本工作坊将在 `.github/agents/qa.agent.md` 中定义 QA 角色，然后在应用中选择它。

已经创建的自定义内容各有用途。存储库指令描述团队标准，quality-checks 技能封装可重复执行的检查，Playwright MCP 提供浏览器工具。QA 配置告诉 Copilot 如何使用这些能力评估需求并报告发现。它不会取代这些能力，也不要求另开智能体会话。

## 创建 QA 配置文件

打开功能 PR 前，要求 Copilot 创建可复用的 QA 配置文件。该文件将定义 QA 执行的检查及其必须遵守的边界。

1. 确认会话处于 **Interactive** 模式。
2. 向 Copilot 发送以下提示词，创建新的自定义智能体：

  ```plaintext
  Create a custom agent named QA in .github/agents/qa.agent.md. It should check features against their issues and agreed requirements, follow the repository instructions, run the quality-checks skill, use Playwright MCP to verify behavior, and add tests when coverage is missing.

  Have it report each requirement as pass, fail, or blocked with supporting evidence. It must ask before changing implementation code, and it must not commit changes or open pull requests. Use the current model and available tools. Just create the profile for now so I can review it.
  ```

## 检查配置文件

1. 打开 **Changes**，选择 `.github/agents/qa.agent.md`。
2. 阅读 frontmatter。`description` 是必需字段；`name` 可选，但添加后可为智能体提供明确的显示名称。
3. 阅读配置文件指令，确认 QA 从需求出发、遵循存储库指令、运行 `quality-checks` 技能并使用 Playwright MCP。
4. 确认 QA 报告支持证据，在更改实现代码前先询问，并且不会提交更改或打开拉取请求。
5. 如果生成的配置文件遗漏上述任何职责或边界，请先让普通 Copilot 智能体修订，再继续。

## 根据议题运行 QA

配置文件审查完成后，在当前会话中选择 QA，以便它使用上下文中已有的筛选议题和规划决策。开始审查前，确认当前活动智能体。

1. 在当前会话中打开提示框中的智能体选择器。
2. 选择 **QA**，并在发送运行提示前确认应用明确显示 **QA** 为当前活动智能体。
3. 发送以下提示词，让 QA 审查功能：

    ```plaintext
    Review the filtering feature against the issue and the decisions in our plan. Is it ready for a PR?
    ```

4. 确认 QA 使用了正确的议题和规划决策。如果它提出请求，请提供议题 URL 或缺少的上下文。
5. 完成后阅读其报告。

## 总结与后续步骤

你已为工作流添加可复用的专业角色，并审查了它的工作。本课中，你：

- 探索了自定义智能体如何与指令、技能和 MCP 工具配合。
- 创建并检查了从需求出发的可复用 QA 配置文件。
- 选择 QA 智能体，并对照筛选议题审查了其发现。

现在已具备功能审查所需的实现、技能更新、QA 配置、测试和验证报告。接下来在[第 8 课 - 创建并合并功能 PR][next-lesson]中汇总这些内容，并使用 Agent Merge。

## 资源

- [自定义 GitHub Copilot app，包括选择自定义智能体][customize-app]

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/app/8-create-pull-request/
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
