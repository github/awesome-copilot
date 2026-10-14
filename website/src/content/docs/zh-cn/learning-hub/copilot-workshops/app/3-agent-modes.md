---
title: "第 3 课 - 智能体模式：Plan 和 Autopilot"
description: "探索智能体模式：使用 Plan 确定方案，使用 Autopilot 根据议题构建筛选功能，再使用 Interactive 审查并验证结果。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

我们先为项目添加了一项小功能，但更复杂的更改需要更完善的流程。GitHub Copilot app 支持组织现有的工作流程，帮助我们用正确的方法构建所需功能。从本课开始，你将通过几节课遵循典型的智能体驱动开发流程：先使用议题生成新功能，确认代码有效且功能行为符合预期，最终将更改成功合并到项目中。

> [!NOTE]
> 在后续功能工作流中，你将沿用同一个会话。通常，不同类型的文件会使用不同的会话或 PR，但这里会采用简化方式，以便专注于核心概念。

本课将介绍如何：

- 从 GitHub 议题启动新的智能体会话。
- 在 **Plan** 模式中定义需求。
- 使用 **Autopilot** 模式实现新功能。
- 审查代码。
- 在浏览器画布中手动验证功能。

继续完成该功能时，你将更新存储库指令、自定义现有的 quality-checks 技能、添加 MCP 验证、创建 QA 智能体并打开功能 PR。

## 场景

Tailspin Toys 的游戏目录不断扩大，访客需要按类别和发行商缩小游戏范围。待办议题描述了功能，但多个类别如何组合等细节需要在编码前达成共识。你将使用 Plan 模式确定这些决策，然后授权 Autopilot 在明确范围内实现功能。

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

先在 Plan 模式中审查计划，再使用 Autopilot 实现。

## 从议题启动会话

开始前，确认星级评分 PR 已合并，并且本地 `main` 已更新。

1. 选择 **Issues**，打开 **Allow users to filter games by category and publisher**。
2. 选择 **New session**，再选择基于更新后 `main` 的 **new working tree**。

    ![GitHub Copilot app 的议题视图，箭头指向 New session 按钮](/images/learning-hub/copilot-workshops/app-new-session-from-issue.png)

3. 确认议题已附加到会话，并在模式选择器中选择 **Plan**。

## 规划筛选功能

规划让你能在 Copilot 编写代码前审查方案。由于会话从议题启动，Copilot 已获得功能请求的上下文。发送：

```plaintext
Build this feature.
```

回答 Copilot 的问题，并对照议题的验收标准审查计划。确认计划涵盖类别和发行商筛选、无障碍控件、数据访问改动及测试。讨论尚不明确的行为，例如多个类别如何组合，或没有匹配游戏时如何处理。

计划应使用项目现有工具执行 lint、单元测试、E2E 测试和类型检查。将范围限定为筛选功能的实现和测试；完成质量工作流后再创建 PR。批准前先请求必要的计划调整，并保留议题 URL 和已达成共识的澄清内容，供后续验证使用。

## 明确批准 Autopilot

对计划满意后，选择 **Approve and implement with autopilot**，或当前版本中的等效选项。确认模式指示器显示 **Autopilot**。

Copilot 将开始实现功能。它会按既定计划逐步推进，生成代码、运行测试，并在过程中迭代。

> [!NOTE]
> 批准后可能立即开始实现，因此应先审查计划。如果 Copilot 报告缺少依赖项或端口冲突，应先解决环境设置问题，再认定检查已完成。只停止自己启动的服务器。

## 审查并验证实现

与其他代码一样，生成的代码也需要在合并前审查。下面将审查代码并运行站点，确认一切正常。

1. 打开 **Changes**，检查筛选实现和测试。
2. 对照议题和批准的澄清内容检查结果，包括多类别及发行商组合。检查更改是否遵循现有存储库指令。
3. 查看 lint、单元测试、E2E 测试和类型检查的输出。跳过的检查不能算通过。
4. 接受实现前，解决失败项并重新运行受影响的检查。Playwright 的 E2E 配置会构建并提供预览服务，且可能复用本地服务器；确保被测服务器属于此工作树，而不是之前的课程。

## 探索新功能

代码看起来没有问题，但能否正常运行？像之前一样启动应用，并在浏览器画布中打开站点。

1. 使用以下提示词，让 Copilot 启动应用并在浏览器画布中打开页面：

    ```plaintext
    Start the app and open it in the browser canvas.
    ```

2. 稍等片刻，应用将启动，Copilot app 内会打开浏览器窗口。
3. 确认已评分的游戏卡片显示满分为五分的评分值。
4. 完成后，使用以下提示词让 Copilot 停止为此会话启动的开发服务器，并关闭浏览器画布：

    ```plaintext
    Stop the dev server and close the browser canvas.
    ```

## 总结与后续步骤

你已使用不同的智能体模式构建并审查功能。本课中，你：

- 从 GitHub 议题启动了新的智能体会话。
- 在 **Plan** 模式中定义了需求。
- 使用 **Autopilot** 模式实现了新功能。
- 审查了代码。
- 在浏览器画布中手动验证了功能。

接下来，我们将深入了解代码生成方式，并[使用自定义指令][next-lesson]确保代码遵循已有实践。

## 资源

- [在 GitHub Copilot app 中使用智能体会话][agent-sessions]

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/app/4-custom-instructions/
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions