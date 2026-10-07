---
title: "第 4 课 - 使用自定义指令引导 Copilot"
description: "探索存储库指令，添加文档标准，并将其应用于筛选代码。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

使用生成式 AI 时，上下文至关重要。如果任务需要以特定方式完成，就应向 Copilot 提供相应指导。[指令文件][instruction-files]不仅说明需要什么代码，还说明代码应如何组织。现在筛选功能已构建完成，你将探索 Copilot 使用的指令、添加文档标准，并将其应用于代码。

本课将介绍如何：

- 探索存储库指令和路径范围指令文件如何传递给智能体。
- 更新指令文件以确保遵循编码标准。
- 查看指令文件对代码的影响。

## 场景

与所有优秀的开发团队一样，Tailspin Toys 针对开发实践制定了一组准则和要求，其中包括：

- 注释应说明意图和不明显的决策，而不是复述代码。
- `db/` 和 `src/lib/` 中导出的函数应使用 TSDoc/JSDoc 记录用途、参数和返回值；如果存在可注入的 `db` 参数，也应记录。
- 可复用的 Astro 组件应记录其 `Props` 契约，并在相关代码变化时同步更新注释。
- 应保留现有格式和 lint 指导。

通过指令文件，可以确保 Copilot 获得正确的信息，按照这些实践完成任务。

## 指令文件

自定义指令可向 Copilot 提供上下文和偏好，使其更好地理解编码风格与要求。这项强大功能可引导 Copilot 提供更相关的建议和代码片段。你可以指定首选编码约定、库，甚至希望代码中包含的注释类型。可以为整个存储库创建指令，也可以针对特定文件类型提供任务级上下文。

指令文件分为两类：

- `.github/copilot-instructions.md`：每次针对存储库的请求都会发送给 Copilot 的单个指令文件。此文件应包含项目级信息，即与大多数发送给 Copilot 的聊天或 CLI 请求相关的上下文，例如所用技术栈、正在构建的内容概述、最佳实践和其他全局指导。
- `.github/instructions/*.instructions.md`：可针对特定任务或文件类型创建。可以用它们为特定语言（如 TypeScript 或 Astro）提供准则，也可以为创建 UI 组件或一组新单元测试等任务提供指导。

> [!NOTE]
> 其他指令格式及支持情况因操作环境而异。依赖某种格式前，请查阅[自定义指令支持参考][custom-instructions-support]。

## 探索此项目中的自定义指令文件

初始项目已包含一组指令文件。进行更改前，先探索现有内容并了解其影响。

1. 返回上一课使用的会话。
2. 如果审查面板尚不可见，请选择右上角的 **Toggle review panel** 将其打开。

   ![GitHub Copilot app 顶部工具栏，箭头指向 Create PR 右侧的 Toggle review panel 按钮](/images/learning-hub/copilot-workshops/app-2-review-panel.png)

3. 选择 **+** 图标以“Open in panel”，打开新画布。
4. 选择 **Files**。
5. 选择 **Gear** 图标，确保 **Show hidden files** 旁有勾选标记。
6. 转到 `.github/copilot-instructions.md`。
7. 探索该文件，注意项目的简要说明，以及 **Agent notes**、**Code standards**、**Scripts** 和 **Repository Structure** 等部分。在 **Code standards** 下，注意嵌套的 **GitHub Actions Workflows** 指导。这些内容适用于与 Copilot 的所有交互。
8. 转到 `.github/instructions` 文件夹并探索其中的文件。注意，其中包含针对 Astro 文件、Drizzle 数据层和测试等内容的指令。
9. 打开 `.github/instructions/unit-tests.instructions.md`。注意顶部的 `applyTo` 字段，它设置了一个相对于存储库根目录的 glob，用于确定指令适用的文件。此处会匹配任何 TypeScript 测试文件，例如匹配 `**/*.test.ts` 的文件。
10. 注意此项目中有关创建单元测试的具体指令。
11. 最后，打开 `.github/instructions/drizzle.instructions.md` 并滚动到底部。注意其中指向其他指令文件（如 `unit-tests.instructions.md`）和项目现有文件的链接。这样可以将较大的指令集拆分为较小的可复用文件，并让 Copilot 在生成代码时参考示例。（其中的路径相对于指令文件，而非存储库根目录。）

## 更新指令文件以符合团队指南

现有文件是良好的起点，但仍有缺漏。下面修改核心 `copilot-instructions.md` 文件，确保所有新生成的 TypeScript 文件都添加 [TSDoc 注释][tsdoc]。

> [!NOTE]
> 指令文件对 Copilot 生成的代码影响很大，因此应确保它们能清晰地引导 Copilot。可以先让 Copilot 创建初稿，再自行审查更新是否符合要求。[Awesome Copilot 上的指令文件集合][awesome-copilot]也可作为很好的起点。

1. 在同一个 Files 画布中，转到 `.github/copilot-instructions.md`。
2. 找到文件中部附近的 **Code formatting requirements** 标题。
3. 在该标题下方添加以下最后一个列表项：

   ```plaintext
   All new TypeScript should contain TSDocs comments for documentation purposes.
   ```

文件会自动保存并可供使用。

## 使用更新后的指南

指令文件更新完成后，让 Copilot 审查更新并进行必要修改，以观察它对生成代码的影响。

> [!NOTE]
> 由于刚刚修改了指令文件，我们会明确要求 Copilot 使用它。创建代码时，如果指令文件已经存在，Copilot 会自动使用，无需额外说明。

1. 提示 Copilot 使用指令文件更新代码，使其符合新增要求：

   ```plaintext
   We just updated our instructions and code guidance. Can you please update the code you generated to match that guidance?
   ```

2. 选择右上角的 **Changes**，打开代码更改。

   ![GitHub Copilot app 会话面板选项卡，箭头指向 Changes 选项卡](/images/learning-hub/copilot-workshops/app-select-changes.png)

3. 阅读所有 TypeScript 文件，注意新生成的 TSDoc 注释。

## 总结与后续步骤

你探索了应用如何从指令文件获取上下文，并将新标准应用于功能。具体而言，你：

- 探索了存储库中的 `copilot-instructions.md` 和路径范围 `*.instructions.md` 文件。
- 更新了指令文件以确保遵循编码标准。
- 查看了指令文件对生成代码的影响。

接下来，你将[自定义并运行可复用的 quality-checks 技能][next-lesson]，确保始终如一地运行 lint 和测试。

## 资源

- [用于自定义 GitHub Copilot 的指令文件][instruction-files]
- [自定义 GitHub Copilot app][customize-app]
- [创建自定义指令的最佳实践][instructions-best-practices]
- [Awesome Copilot：指令文件和其他资源集合][awesome-copilot]

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/app/5-agent-skills/
[instruction-files]: https://docs.github.com/copilot/customizing-copilot/about-customizing-github-copilot-chat-responses
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[instructions-best-practices]: https://docs.github.com/copilot/concepts/prompting/response-customization#writing-effective-custom-instructions
[awesome-copilot]: https://awesome-copilot.github.com/
[custom-instructions-support]: https://docs.github.com/copilot/reference/custom-instructions-support
[tsdoc]: https://tsdoc.org/
[ui-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/ui.instructions.md
[astro-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/astro.instructions.md
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests