---
title: "第 4 课 - 使用 Autopilot 构建功能"
description: "在 GitHub Copilot app 中使用 Plan 和 Autopilot 模式构建静态客户端筛选功能，观察它如何继承文档标准，并使用智能体技能进行验证。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

本项目已完成一些小更新。但更复杂的更改需要更完善的流程。GitHub Copilot app 可以配合现有流程，确保以正确的方式构建正确的内容。这是连续三节课程中的第一节，你将遵循典型开发流程：先使用议题生成新功能，再使用智能体技能运行验证测试和 lint。

本课将介绍如何：

- 从筛选议题启动新会话。
- 使用 **Plan** 模式规划功能，再通过 **Autopilot** 构建功能。
- 确认生成的代码遵循之前合并的文档标准。
- 使用项目的 `quality-checks` 技能验证工作。

## 场景

主页列出了所有游戏，但访问者无法缩小列表范围。筛选议题要求允许用户按**类别**和**发行商**筛选游戏。接下来使用 Copilot 实现该功能。

## 背景

将 AI 编码智能体引入开发流程不会改变基本原则。事实上，这些原则反而更加重要。大多数开发人员遵循类似以下的流程：

1. 打开已创建的议题，查看需要完成的工作详情。
2. 为需要构建的内容制定计划。
3. 构建并审查代码。
4. 运行测试以验证代码。
5. 手动验证新功能。
6. 创建拉取请求 (PR)。
7. 代码通过审查且持续集成流程成功后，合并代码。

> [!NOTE]
> 具体流程会因团队和组织而异，但大多数流程都是以上主题的变体。

坚持这种标准方法，可以确保 AI 生成的代码满足既定要求，并经过与手写代码相同的审查流程。

## 会话模式

**会话模式**控制智能体的自主程度。可以从提示词字段下方的下拉菜单中设置模式，并随时更改：

- **Interactive**：你与智能体协同工作。智能体提出更改建议，并等待输入后再继续。
- **Plan**：智能体先创建计划。你审查并批准计划后，智能体才会执行。
- **Autopilot**：智能体完全自主工作，包括编写代码、运行测试和迭代，无需等待输入。

## 规划筛选功能

发现潜在问题的最佳时机是在编写任何代码之前，而提前规划正是最好的方法。让 Copilot 进行规划时，它会生成一组步骤，并记录将采用的方法。你可以审查计划并提出改进建议，然后让 Copilot 根据计划生成代码。

接下来打开议题、启动新会话，再切换到 Plan 模式并发出请求，以创建计划。

1. 在导航选项卡中选择 **My work**。
2. 选择标题为 **Allow users to filter games by category and publisher** 的议题。
3. 选择右上角的 **New session**。

   ![GitHub Copilot app 的议题视图，箭头指向右上角的 New session 按钮](/images/learning-hub/copilot-workshops/app-new-session-from-issue.png)

4. 选择 <kbd>Shift</kbd>+<kbd>Tab</kbd>，直到模式显示为 **Plan**。

   ![GitHub Copilot app 提示框，箭头指向设为 Plan 的模式选择器](/images/learning-hub/copilot-workshops/app-4-plan-mode.png)

5. 发送以下提示词。由于会话从筛选议题启动，因此该议题已在会话上下文中：

   ```plaintext
   Plan the work based on the requirements documented in the issue. Please ask any clarifying questions you might have as you build the plan.
   ```

6. 智能体在制定计划时可能会提出后续问题。根据你会如何构建功能来回答这些问题。

> [!NOTE]
> Copilot 具有概率性，因此它提出的具体后续问题会有所不同。事实上，它可能不会提出任何问题，这完全正常。

7. 完成后，Copilot 会提供计划摘要。审查该计划，应会看到构建查询、添加筛选控件和测试的建议。可以根据需要提供反馈来完善计划，智能体会将建议纳入新版本。

## 使用 Autopilot 构建

计划创建后，让 Copilot 构建实现。

1. 在 **Plan summary** 对话框的选项列表中，选择最接近 **Approve and implement with autopilot** 的选项。

Copilot 将开始实现。

> [!NOTE]
> 如果 Copilot 未自动开始创建所需代码，可以使用类似 "Go ahead and start building out the plan!" 的提示词让它继续。
>
> 创建所需更新需要几分钟。智能体会编辑和创建文件、编写并运行测试，以及进行迭代。此时可以回顾目前探索的内容，或稍作休息。

## 审查更改

所有 AI 生成的代码在合并前都需要审查。接下来审查代码并运行网站，确保一切正常。

1. 选择右上角的 **Changes**，打开代码更改。

   ![GitHub Copilot app 会话面板选项卡，箭头指向 Changes 选项卡](/images/learning-hub/copilot-workshops/app-select-changes.png)

2. 审查更改。应会看到新的 TypeScript、Astro 和测试文件。注意，新辅助函数包含 TSDoc 文档注释和文件标头注释。这是第 3 课中合并的文档标准，无需提示便已自动应用。
3. 在 Copilot app 右侧的审查面板中选择 **Terminal**。如果没有 **Terminal** 按钮，请选择 **+**（标记为 **Open in panel**），再选择 **Terminal**。

   ![GitHub Copilot app 审查面板中的 Terminal 按钮](/images/learning-hub/copilot-workshops/app-terminal-screenshot.png)

4. 在终端窗口中输入以下命令，启动 Web 应用的开发服务器：

   ```shell
   npm run dev
   ```

5. 服务器启动后（只需片刻），打开浏览器窗口。
6. 转到 [http://localhost:4321](http://localhost:4321)。
7. 现在应能在主页上看到筛选器。
8. 如果有任何问题，可以要求 Copilot 进行更新。
9. 满意后，返回终端窗口。
10. 选择 <kbd>Ctrl</kbd>+<kbd>C</kbd> 停止开发服务器。

## 使用 quality-checks 技能验证工作

可以仅查看差异就认为工作完成，但团队已经定义了质量标准和可重复的检查方式。

**智能体技能**可指导 Copilot 如何执行重复性任务，例如运行测试、生成构建或创建拉取请求。技能是一个包含指令、脚本和资源的文件夹，智能体可以按需加载。[Agent Skills 是一项开放标准][agent-skills-repo]，适用于多种智能体，因此同一技能可在智能体模式下的 Copilot Chat、Copilot cloud agent、Copilot CLI 和 GitHub Copilot app 中使用。

技能位于项目的 `.github/skills` 文件夹或全局 `~/.copilot/skills` 中。每个技能都在一个文件夹中，其中包含具有 YAML frontmatter（`name` 和 `description`）及 Markdown 指令的 `SKILL.md` 文件：

```yaml
---
name: quality-checks
description: Run the project's test suites and linter to verify code changes are ready to commit, push, or merge.
---
```

技能还可包含脚本、资产和参考资料子文件夹。[智能体技能规范][agent-skills-spec]介绍了完整结构。

> [!TIP]
> 技能会动态加载。智能体根据 `description` 字段决定适用的技能。清晰且针对具体场景的说明决定了技能是会被使用还是被忽略。

## 探索 quality-checks 技能

接下来探索该技能，了解其作用。

1. 如果审查面板尚不可见，请选择右上角的 **Toggle review panel** 将其打开。

   ![GitHub Copilot app 顶部工具栏，箭头指向 Create PR 右侧的 Toggle review panel 按钮](/images/learning-hub/copilot-workshops/app-2-review-panel.png)

2. 选择 **+**，向审查面板添加新项目。
3. 选择 **File**。
4. 搜索 `SKILL.md`。
5. 从文件列表中选择 `SKILL.md .github/skills/quality-checks` 将其打开。
6. 注意 `name` 和 `description`。说明会告知智能体*何时*使用该技能，即每当代码更改需要在提交、推送或合并前进行测试、lint 或验证时。
7. 阅读该技能。它记录了哪个脚本运行哪个套件（单元测试、Playwright 端到端测试、ESLint）、运行顺序，以及如何调试常见故障。因此，智能体会按团队规定的方式运行检查，而不是猜测。

## 运行检查

在同一筛选会话中，要求智能体验证工作。你无需说出技能名称，智能体会根据请求进行匹配。

1. 返回 Copilot app。
2. 使用 slash command `/quality-checks` 直接调用技能，然后选择 <kbd>Enter</kbd>。
3. 智能体按照技能运行单元测试、lint 和端到端测试，并报告结果。如果有任何失败，请要求它修复问题并重新运行检查，直到全部通过。
4. **保持此会话打开。**下一课将添加 Playwright MCP 服务器，并使用它在真实浏览器中查看筛选功能。

## 总结与后续步骤

你端到端构建了一项真实功能，并按照团队的质量标准进行了验证。具体而言，你：

- 从最新项目的筛选议题启动了新会话。
- 使用 Plan 模式规划功能，并使用 Autopilot 构建功能。
- 确认生成的辅助函数遵循第 3 课中合并的文档标准。
- 使用 `quality-checks` 技能验证了工作。

接下来，你将连接 Playwright MCP 服务器，并要求智能体在真实浏览器中探索筛选功能。继续学习[第 5 课 - 使用 Playwright MCP 服务器测试][next-lesson]。

## 资源

- [在 GitHub Copilot app 中使用智能体会话][agent-sessions]
- [关于 Agent Skills][about-agent-skills]
- [自定义 GitHub Copilot app][customize-app]
- [关于 GitHub Copilot 的云沙盒和本地沙盒][sandboxes]

[ex0]: /zh-cn/learning-hub/copilot-workshops/app/0-prerequisites/
[ex2]: /zh-cn/learning-hub/copilot-workshops/app/2-add-star-rating/
[ex3]: /zh-cn/learning-hub/copilot-workshops/app/3-custom-instructions/
[next-lesson]: /zh-cn/learning-hub/copilot-workshops/app/5-mcp-playwright/
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[about-agent-skills]: https://docs.github.com/copilot/concepts/agents/about-agent-skills
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[sandboxes]: https://docs.github.com/copilot/concepts/about-cloud-and-local-sandboxes
[agent-skills-repo]: https://github.com/agentskills/agentskills
[agent-skills-spec]: https://agentskills.io/specification