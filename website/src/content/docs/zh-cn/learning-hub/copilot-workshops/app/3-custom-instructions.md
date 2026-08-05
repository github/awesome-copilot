---
title: "第 3 课 - 使用自定义指令引导 Copilot"
description: "使用 GitHub Copilot app 向存储库添加自定义指令标准，从待办议题开始，并通过拉取请求合并更改。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

使用生成式 AI 时，上下文至关重要。如果任务需要以特定方式完成，或 Copilot 应了解一些背景信息，就应提供这些上下文。[指令文件][instruction-files]是实现此目的最强大的工具之一，它不仅说明需要什么代码，还说明代码应如何组织。本课将向存储库添加文档标准，并采用后续大多数工作的方式：从待办议题开始，让智能体完成更改。

本课将介绍如何：

- 探索存储库指令和路径范围指令文件如何传递给智能体。
- 从待办事项中的指令议题启动会话。
- 要求智能体向 `.github/copilot-instructions.md` 添加文档标准。
- 审查更改，并通过拉取请求合并更改。

## 场景

与所有优秀的开发团队一样，Tailspin Toys 针对开发实践制定了一组准则和要求，其中包括：

- 应以 TSDoc 文档注释的形式向代码添加文档。
- 应记录格式规范，并通过 lint 强制执行。

通过指令文件，可以确保 Copilot 获得正确的信息，按照这些实践完成任务。

## 指令文件

自定义指令可向 Copilot 提供上下文和偏好，使其更好地理解编码风格与要求。这项强大功能可引导 Copilot 提供更相关的建议和代码片段。你可以指定首选编码约定、库，甚至希望代码中包含的注释类型。可以为整个存储库创建指令，也可以针对特定文件类型提供任务级上下文。

指令文件分为两类：

- `.github/copilot-instructions.md`：每次针对存储库的请求都会发送给 Copilot 的单个指令文件。此文件应包含项目级信息，即与大多数发送给 Copilot 的聊天或 CLI 请求相关的上下文，例如所用技术栈、正在构建的内容概述、最佳实践和其他全局指导。
- `.github/instructions/*.instructions.md`：可针对特定任务或文件类型创建。可以用它们为特定语言（如 TypeScript 或 Astro）提供准则，也可以为创建 UI 组件或一组新单元测试等任务提供指导。

> [!NOTE]
> Copilot 还支持通过 AGENTS.md、CLAUDE.md 和 GEMINI.md 等其他标准引入指令指导，确保 Copilot 始终具有正确的上下文。

### 管理指令文件的最佳实践

深入讨论如何创建指令文件超出了本研讨会的范围。不过，示例项目提供了具有代表性的方法。总体而言：

- `copilot-instructions.md` 中的指令应专注于项目级指导，例如所构建内容的说明、项目结构和全局编码标准。
- 使用 `*.instructions.md` 文件为文件类型（单元测试、Astro 组件、数据层）或特定任务提供具体指令。
- 使用自然语言。保持指导清晰，并提供代码应采用和不应采用的示例。

创建指令文件没有唯一方法，使用 AI 同样如此。通过不断试验，可以找到最适合项目的方式。

> [!TIP]
> 每个使用 GitHub Copilot 的项目都应拥有一套完善的指令文件。探索本项目中的文件时，可以看到针对多种代码文件类型的指令文件。
>
> 要查找模板或起点，请探索 [awesome-copilot][awesome-copilot]，其中包含大量指令文件、自定义智能体和其他资源。

## 探索此项目中的自定义指令文件

花一点时间阅读此存储库附带的指令文件：一个核心 `copilot-instructions.md`，以及一组用于不同任务的 `*.instructions.md` 文件。在编辑器或 GitHub Web UI 中打开这些文件。

1. 如果审查面板尚不可见，请选择右上角的 **Toggle review panel** 将其打开。

   ![GitHub Copilot app 顶部工具栏，箭头指向 Create PR 右侧的 Toggle review panel 按钮](/images/learning-hub/copilot-workshops/app-2-review-panel.png)

2. 选择 **+**，向审查面板添加新项目。
3. 选择 **File**。
4. 搜索 `copilot-instructions.md`。
5. 从文件列表中选择 `copilot-instructions.md` 将其打开。
6. 探索该文件，注意项目的简要说明，以及 **Agent notes**、**Code standards**、**Scripts** 和 **Repository Structure** 等部分。在 **Code standards** 下，注意嵌套的 **GitHub Actions Workflows** 指导。这些内容适用于与 Copilot 的所有交互。
7. 选择 **Show folder view** 打开文件夹导航器。

   ![GitHub Copilot app 审查面板中打开了一个文件，并显示 Show folder view 按钮](/images/learning-hub/copilot-workshops/app-show-folder-view.png)

8. 转到 `.github/instructions` 文件夹并探索其中的文件。注意，其中包含针对 Astro 文件、Drizzle 数据层和测试等内容的指令。
9. 打开 `.github/instructions/unit-tests.instructions.md`。注意顶部的 `applyTo` 字段，它设置了一个相对于存储库根目录的 glob，用于确定指令适用的文件。此处会匹配任何 TypeScript 测试文件，例如匹配 `**/*.test.ts` 的文件。
10. 注意此项目中有关创建单元测试的具体指令。
11. 最后，打开 `.github/instructions/drizzle.instructions.md` 并滚动到底部。注意其中指向其他指令文件（如 `unit-tests.instructions.md`）和项目现有文件的链接。这样可以将较大的指令集拆分为较小的可复用文件，并让 Copilot 在生成代码时参考示例。（其中的路径相对于指令文件，而非存储库根目录。）

> [!NOTE]
> `copilot-instructions.md` 中的 **Code formatting requirements** 部分记录了项目编码标准，但尚未要求代码内文档。接下来，你将添加 TSDoc 文档注释和文件注释标头的规则。

## 从指令议题开始

上一课通过直接提示词启动了会话。不过，大多数工作都从议题开始。接下来，根据用于更新指令文件的议题创建新会话，再请求更新。

> [!NOTE]
> 指令文件对 Copilot 生成的代码影响很大，因此应确保它们能清晰地引导 Copilot。让 Copilot 创建第一版（正如本课将要做的），再由你审查更新是否满足要求，是一种有效方法。

1. 在侧边栏中选择 **My work**。
2. 选择标题为 **Update our repository coding standards** 的议题，将其打开。
3. 选择右上角的 **New session**，根据该议题启动新会话。

   ![GitHub Copilot app 的议题视图，箭头指向右上角的 New session 按钮](/images/learning-hub/copilot-workshops/app-new-session-from-issue.png)

4. 使用以下提示词，请求 Copilot 更新指令文件以满足议题中记录的要求：

  ```plaintext
  Following this issue, make the updates to the instructions files in this project to meet the requirements documented. Don't create the PR quite yet!
  ```

Copilot 会进行更新。

## 审查更改

接下来阅读 Copilot 所做的更新，并要求它提供根据更新后指令生成的代码示例。

1. 选择右上角的 **Changes**，打开代码更改。

   ![GitHub Copilot app 会话面板选项卡，箭头指向 Changes 选项卡](/images/learning-hub/copilot-workshops/app-select-changes.png)

2. 审查更新后的指令文件，确认其中包含有关向代码添加文档和注释的准则。

> [!NOTE]
> AI 具有概率性而非确定性，因此实际文本会有所不同。

3. 使用以下提示词，要求 Copilot 创建它现在会生成的代码示例：

  ```plaintext
  Do not make any updates, but show me what the code would look like. Based on the new instructions, if I asked Copilot to create a new library component to return all Publishers what would that code look like?
  ```

4. 审查 Copilot 提议的代码。注意其中包含 TSDoc 文档注释和文件标头注释，这正是更新后的指令所要求的内容。

现在，你已更新项目中的指令文件，并了解了更新带来的影响。

## 打开并合并拉取请求

指令文件会成为存储库中的资产，与团队其他成员共享。接下来像处理任何其他资产一样，为此次工作创建 PR。

1. 在右上角选择 **Create PR**。
2. 如果系统提示，请选择 **Sign in with your browser**，并按照提示完成身份验证。
3. Copilot 开始创建 PR。

PR 创建后，Copilot 会监视存储库中需要运行的工作流。片刻后，右上角的按钮会变为 **Ready to merge**，表示 PR 已可合并。

4. 选择 **Ready to merge**。
5. 在新对话框窗口中选择 **Merge pull request**，合并拉取请求。

> [!NOTE]
> 标准合并到默认分支后，便会成为每位成员和每个新会话的项目组成部分。下一课从最新默认分支启动筛选会话时，智能体会自动遵循此标准。生成的 TypeScript 无需提示便会包含 TSDoc 文档注释。这是指令影响代码生成的一个虽小但真实的示例。

## 总结与后续步骤

你探索了应用如何从指令文件获取上下文，然后使用会话添加并合并存储库范围的标准。具体而言，你：

- 探索了存储库中的 `copilot-instructions.md` 和路径范围 `*.instructions.md` 文件。
- 从待办事项中的指令议题启动了会话。
- 要求智能体向 `.github/copilot-instructions.md` 添加文档标准。
- 审查了更改，并通过拉取请求将其合并。

接下来，你将在新会话中构建筛选功能，并观察它如何采用刚合并的标准。继续学习[第 4 课 - 使用 Autopilot 构建功能][next-lesson]。

## 资源

- [用于自定义 GitHub Copilot 的指令文件][instruction-files]
- [自定义 GitHub Copilot app][customize-app]
- [创建自定义指令的最佳实践][instructions-best-practices]
- [Awesome Copilot：指令文件和其他资源集合][awesome-copilot]

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/app/4-build-filtering/
[instruction-files]: https://docs.github.com/copilot/customizing-copilot/about-customizing-github-copilot-chat-responses
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[instructions-best-practices]: https://docs.github.com/enterprise-cloud@latest/copilot/using-github-copilot/coding-agent/best-practices-for-using-copilot-to-work-on-tasks#adding-custom-instructions-to-your-repository
[awesome-copilot]: https://awesome-copilot.github.com/
[custom-instructions-support]: https://docs.github.com/copilot/reference/custom-instructions-support
[ui-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/ui.instructions.md
[astro-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/astro.instructions.md
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests