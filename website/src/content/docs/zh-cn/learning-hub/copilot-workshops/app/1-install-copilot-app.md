---
title: "第 1 课 - 安装 GitHub Copilot app"
description: "安装 GitHub Copilot app，连接通过模板创建的存储库，熟悉工作区并尝试快速聊天。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

[**GitHub Copilot app**][about-copilot-app] 是一款用于智能体驱动开发的桌面应用。它基于 GitHub Copilot CLI 构建，并与 GitHub 原生集成，因此存储库、分支和 CI 管道均可直接使用。它适用于同时指挥多个智能体的工作流：每个智能体都在隔离的工作区中运行，无需手动完成所有工作，还可自动执行重复性任务。安装 Node.js 并准备好项目副本后，下一步是安装应用并连接该存储库。

本课将介绍如何：

- 安装 GitHub Copilot app 并登录。
- 从 GitHub 存储库将项目添加到应用。
- 熟悉工作区，包括模板创建的待办事项。
- 通过快速聊天了解应用本身。

## 场景

团队正在采用 AI 智能体来处理不断增加的待办事项。Copilot app 提供了统一的工作位置，可领取议题、运行智能体、审查更改并合并拉取请求。本课将帮助你完成安装和连接，并熟悉如何发起有关项目的对话。

> [!NOTE]
> 必须拥有符合条件的 Copilot 计划，即 Copilot Student 或任一付费计划（Pro、Pro+、Business 或 Enterprise）。如果使用 Copilot Business 或 Copilot Enterprise，管理员必须先启用 **Copilot CLI** 策略，应用才能工作。

## 安装并配置 GitHub Copilot app

要使用 GitHub Copilot app，第一步自然是安装它。应用支持 Windows、macOS 和 Linux。接下来安装应用、完成身份验证，并将 Tailspin Toys 存储库添加到应用。

1. 在浏览器中打开 [GitHub Copilot app 产品页面][download-app]。
2. 下载适用于当前平台的应用，并按照产品页面上的说明进行安装。
3. 安装完成后打开应用。
4. 选择 **Sign in to GitHub**，并按照提示完成身份验证。如果使用 GitHub Enterprise Server，请选择 **Use GitHub Enterprise**，并在提示时输入服务器地址。
5. 身份验证后，系统会询问要连接哪些存储库。选择刚创建的 Tailspin Toys 存储库，其名称应为 `<YOUR_GITHUB_HANDLE>/tailspin-toys`。
6. 选择 **Continue** 继续加入流程。
7. 系统提示选择主题时，选择最喜欢的主题，再选择 **Finish**。

> [!NOTE]
> 如果 Tailspin Toys 副本未自动显示在列表中，可以在应用中完成加入流程后再添加。完成后，Copilot app 会转到主屏幕。在该屏幕选择 **Choose from GitHub**，按名称搜索存储库 (\<YOUR_GITHUB_HANDLE\>/tailspin-toys)，然后将其选中。该存储库随即会添加到 Copilot app。

## 熟悉工作区

连接项目后，花一点时间熟悉工作区。应用将功能组织在侧边栏的以下几个区域：

- **Sessions**：智能体执行工作的区域。每个会话都在独立工作区中运行，因此可以同时运行多个会话，且更改不会发生冲突。下一课将启动第一个会话。
- **Quick chats**：适合提问和集思广益的轻量对话，无需单独创建分支或工作区。本课结束时会进行一次快速聊天。
- **My work**：通过应用的 **GitHub 原生集成**显示议题和拉取请求。在这里，无需离开应用即可浏览和筛选议题与拉取请求、检查 CI 状态、从议题启动会话以及审查拉取请求。
- **Automations**：可按计划或按需运行的已保存智能体任务。本学习路径接近结束时会创建一个自动化任务。

### 查找模板创建的待办事项

由于应用与 GitHub 原生集成，存储库中待处理的工作会直接显示在应用内。通过模板创建存储库时，系统已生成一组议题。现在确认它们是否存在。

1. 在侧边栏中选择 **My work**。
2. 模板在待办列表中创建了八个议题。本课程聚焦以下三个，确认它们可见：

   - Allow users to filter games by category and publisher
   - Update our repository coding standards
   - Implement pagination on the game list page

3. 选择一个议题以阅读详细信息。每个议题也可以作为智能体会话的启动点，后续课程会从这些议题开始工作。

> [!NOTE]
> My work 中的项目会自动筛选，仅显示已添加到 Copilot app 的存储库中的项目。要查看其他存储库中的工作项，请将相应存储库添加到应用。

## 尝试快速聊天

熟悉应用的一种好方法是用它来了解*应用本身*，而 **Quick chats** 正适合这种场景。通过快速聊天，无需创建分支或工作树即可提问或集思广益，非常适合无需会话的一次性问题。

1. 在侧边栏中，选择 **Quick chats** 旁的 **+** 以打开新聊天。
2. 询问应用自身的会话工作方式：

   ```plaintext
   How does the GitHub Copilot app use worktrees?
   ```

3. 在对话视图中阅读回复。每个会话都在独立的 git 工作树中运行，因此可以并行运行多个智能体，而不会造成更改冲突。你可以随时继续对话或开始新聊天。

## 总结与后续步骤

你已安装 GitHub Copilot app、连接项目并探索工作区。你学习了如何：

- 安装应用并登录 GitHub。
- 从 GitHub 存储库添加项目。
- 熟悉工作区，并在 **My work** 中找到模板创建的待办事项。
- 使用快速聊天提出一次性问题。

接下来，你将启动第一个智能体会话，并对项目进行第一次更改，即在游戏卡片上显示星级评分。继续学习[第 2 课 - 运行第一个智能体会话][next-lesson]。

## 资源

- [关于 GitHub Copilot app][about-copilot-app]
- [GitHub Copilot app 入门][getting-started]
- [在 GitHub Copilot app 中使用智能体会话][agent-sessions]

[ex0]: /zh-cn/learning-hub/copilot-workshops/app/0-prerequisites/
[next-lesson]: /zh-cn/learning-hub/copilot-workshops/app/2-add-star-rating/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[getting-started]: https://docs.github.com/copilot/how-tos/github-copilot-app/getting-started
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[download-app]: https://gh.io/app