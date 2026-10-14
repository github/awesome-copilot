---
title: "第 2 课 - 添加星级评分：快速上手"
description: "在 GitHub Copilot app 中启动第一个智能体会话，对游戏卡片进行一项小改动，并通过第一个拉取请求合并更改。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

在上一课中，你浏览了工作区并使用了快速聊天。现在可以启动**智能体会话**，对项目进行第一次更改。此次改动很小：游戏数据中已有星级评分，但主页上的游戏卡片尚未显示。你将要求智能体显示评分、审查更改，并通过第一个拉取请求合并更改。

本课将介绍如何：

- 启动智能体会话，并了解会话的结构。
- 要求智能体对项目进行一项范围明确的小改动。
- 在工作区差异视图中审查更改。
- 在本地运行应用，并在浏览器中确认更改。
- 打开并合并第一个拉取请求。

## 场景

Tailspin Toys 中的每款游戏都可以有星级评分，该评分已显示在游戏详情页上。但主页的游戏卡片只显示标题、类别、发行商和说明。作为热身，你将让智能体在每张卡片上显示现有评分。这项小型、独立的更改非常适合作为第一个会话任务。

## 会话剖析

**会话**是与智能体的对话，在独立工作区中运行。每个会话都有**专用的 git 工作树和分支**，因此可以同时运行多个会话，例如一个添加功能，另一个修复 bug，而不会造成更改冲突。会话按存储库分组显示在侧边栏中，选择任一会话即可切换。

会话中包含三类内容：与智能体的**对话**、智能体探索和编辑文件时的**工具活动**，以及带有差异的**已更改文件**列表。

## 启动会话并请求更改

现在启动新会话，探索项目并实现功能。在[上一课][prior-lesson]中，你从 GitHub 存储库添加了项目。接下来为该存储库创建新会话并请求更改。

1. 返回（或打开）GitHub Copilot app。
2. 选择 **Projects** 旁的 **+**。
3. 选择 `tailspin-toys` 作为存储库。
4. 在提示框下方选择 **new working tree** 和 **Interactive** 模式。使用以下提示词请求更改：

    ```plaintext
    Show each game's starRating out of 5 in the game cards on the list page. If the rating is null, show "No rating yet". Keep the card layout as it is, add tests, and run the relevant checks.
    ```

5. 按 <kbd>Enter</kbd> 将提示词发送给 Copilot。

Copilot app 首先创建新的工作树，即项目的隔离副本。随后，它会探索项目，找到添加新功能所需更新的文件，然后创建必要的代码。现在，你已经使用 Copilot app 添加了一项新功能。

## 审查差异

所有 AI 生成的更改在合并前都应接受审查，即使改动很小。接下来直接在 Copilot app 中探索这些更改。

1. 在应用右上角选择 **Toggle review panel**。差异屏幕会打开，显示 Copilot 所做的所有待处理更改。

    ![GitHub Copilot app 顶部工具栏，箭头指向 Create PR 右侧的 Toggle review panel 按钮](/images/learning-hub/copilot-workshops/app-2-review-panel.png)

2. 应会看到核心游戏详情显示文件 `GameCard.astro` 中新增了代码。代码应与以下示例类似：一个小代码块，在评分存在时呈现评分，在 `starRating` 为 `null` 时回退到 "No rating yet"：

   ```astro
   {game.starRating !== null ? (
       <span class="text-xs font-medium px-2.5 py-0.5 rounded bg-amber-900/60 text-amber-300" data-testid="game-rating">
           ★ {game.starRating} / 5
       </span>
   ) : (
       <span class="text-xs font-medium text-slate-500" data-testid="game-rating-empty">
           No rating yet
       </span>
   )}
   ```

> [!NOTE]
> Copilot 与所有生成式 AI 工具一样，具有概率性而非确定性，因此实际代码可能与以上示例不同，但应大致相似。

## 检查更改

打开浏览器前，先审查智能体的自动化检查结果。确认测试覆盖数值类型的 `starRating` 和 `null` 回退状态。缺少先决条件或跳过检查不算通过；批准安装请求前先审查。

当然，不能只阅读代码就假定它能正常运行。让 Copilot 打开网站，以便检查更新后的 UI。可以让它启动网站，并在浏览器画布中打开。

> [!TIP]
> 画布是 Copilot app 内的交互式小组件。稍后你将探索自定义画布，甚至创建自己的画布；现在先使用内置的浏览器画布。

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

## 打开并合并第一个拉取请求

你已创建该功能。现在创建拉取请求 (PR)，将新代码合并到现有代码库中。

1. 选择右上角的 **Create PR**。
2. 如果系统提示，请选择 **Sign in with your browser**，并按照提示完成身份验证。
3. Copilot 开始创建 PR。
4. 选择聊天上方的 **PR** 气泡，在审查窗格中打开并查看拉取请求。可根据需要在此审查 PR。
5. 准备好后，选择 **Ready to merge**。
6. 在新对话框窗口中选择 **Merge pull request**，合并拉取请求。

## 总结与后续步骤

你已启动第一个智能体会话，并交付了第一次更改。具体而言，你：

- 启动了智能体会话，并了解了会话的结构。
- 指示智能体对游戏卡片进行一项范围明确的小改动。
- 在工作区差异视图中审查了更改。
- 在本地运行应用，并在浏览器中确认了星级评分。
- 打开了 PR 1，审查了检查结果，并明确执行了合并。

接下来，你将[从筛选功能议题开始，并使用 Plan 和 Autopilot 模式][next-lesson]构建一项更大的功能。

## 资源

- [在 GitHub Copilot app 中使用智能体会话][agent-sessions]
- [关于 GitHub Copilot app][about-copilot-app]
- [使用 GitHub Copilot app 管理议题和拉取请求][managing-issues-prs]

[prior-lesson]: /zh-cn/learning-hub/copilot-workshops/app/1-install-copilot-app/#%E5%AE%89%E8%A3%85%E5%B9%B6%E9%85%8D%E7%BD%AE-github-copilot-app
[next-lesson]: /zh-cn/learning-hub/copilot-workshops/app/3-agent-modes/
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests