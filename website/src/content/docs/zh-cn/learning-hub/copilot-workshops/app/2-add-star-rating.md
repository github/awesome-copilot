---
title: "第 2 课 - 运行第一个智能体会话"
description: "在 GitHub Copilot app 中启动第一个智能体会话，对游戏卡片进行一项小改动，并通过第一个拉取请求合并更改。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

在上一课中，你介绍了工作区并使用了快速聊天。现在可以启动**智能体会话**，对项目进行第一次更改。此次改动很小：游戏数据中已有星级评分，但主页上的游戏卡片尚未显示。你将要求智能体显示评分、审查更改，并通过第一个拉取请求合并更改。

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
2. 选择 **Home screen**。
3. 确保为存储库选择了 `tailspin-toys`。

   ![GitHub Copilot app 提示框，其中存储库选择器设为 tailspin-toys，提示框下方显示模型选择器](/images/learning-hub/copilot-workshops/app-2-start-session.png)

4. 使用以下提示词请求更改：

   ```plaintext
   On the game cards, show each game's star rating. The Game type already includes a starRating field — it's a number out of 5, or null when a game hasn't been rated yet. Display it on each card in src/components/GameCard.astro, and when starRating is null show "No rating yet" instead. Keep the change small and don't restructure the card layout.
   ```

> [!NOTE]
> 请注意，提示词包含了 Copilot 要更新的文件名。虽然不要求指定 Copilot 应在工作中包含哪些文件，但指出正确方向既能帮助 Copilot 快速生成代码，也能减少令牌用量。

5. 选择 <kbd>Enter</kbd> 将提示词发送给 Copilot。

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

当然，不能只阅读代码就假定它能正常工作，还应进行视觉测试。为此，需要从终端启动应用，再确认一切正常。Copilot app 恰好内置了终端。

1. 在 Copilot app 右侧的审查面板中选择 **Terminal**。如果没有 **Terminal** 按钮，请选择 **+**（标记为 **Open in panel**），再选择 **Terminal**。

   ![GitHub Copilot app 审查面板中的 Terminal 按钮](/images/learning-hub/copilot-workshops/app-terminal-screenshot.png)

2. 在终端窗口中输入以下命令，启动 Web 应用的开发服务器：

   ```shell
   npm run dev
   ```

3. 服务器启动后（只需片刻），打开浏览器窗口。
4. 转到 [http://localhost:4321](http://localhost:4321)。
5. 现在应能在主页上的所有游戏中看到星级评分。
6. 返回终端窗口。
7. 选择 <kbd>Ctrl</kbd>+<kbd>C</kbd> 停止开发服务器。

## 打开并合并第一个拉取请求

更改看起来没有问题，现在可以交付。你将要求智能体打开拉取请求，然后在 github.com 上自行审查并合并。目前先手动管理此流程，后续课程将探索 Copilot 如何自动处理其中部分工作。

1. 在右上角选择 **Create PR**。
2. 如果系统提示，请选择 **Sign in with your browser**，并按照提示完成身份验证。
3. Copilot 开始创建 PR。

PR 创建后，Copilot 会监视存储库中需要运行的工作流。片刻后，右上角的按钮会变为 **Ready to merge**，表示 PR 已可合并。

4. 选择聊天上方的 **PR** 气泡，在审查窗格中打开并查看拉取请求。可根据需要在此审查 PR。
5. 准备好后，选择 **Ready to merge**。
6. 在新对话框窗口中选择 **Merge pull request**，合并拉取请求。

现在，新功能已推送到网站。

## 总结与后续步骤

你已启动第一个智能体会话，并交付了第一次更改。具体而言，你：

- 启动了智能体会话，并了解了会话的结构。
- 指示智能体对游戏卡片进行一项范围明确的小改动。
- 在工作区差异视图中审查了更改。
- 在本地运行应用，并在浏览器中确认了星级评分。
- 打开并自行在 github.com 上合并了拉取请求。

接下来，你将从待办事项中的一个议题开始，使用应用向存储库添加自定义指令标准。继续学习[第 3 课 - 使用自定义指令引导 Copilot][next-lesson]。

## 资源

- [在 GitHub Copilot app 中使用智能体会话][agent-sessions]
- [关于 GitHub Copilot app][about-copilot-app]
- [使用 GitHub Copilot app 管理议题和拉取请求][managing-issues-prs]

[prior-lesson]: /zh-cn/learning-hub/copilot-workshops/app/1-install-copilot-app/#安装并配置-github-copilot-app
[next-lesson]: /zh-cn/learning-hub/copilot-workshops/app/3-custom-instructions/
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests