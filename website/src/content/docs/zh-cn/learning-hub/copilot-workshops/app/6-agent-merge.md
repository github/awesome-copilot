---
title: "第 6 课 - 使用 Agent Merge 合并"
description: "打开筛选功能的拉取请求，在 My work 中进行审查，并让 Agent Merge 修复阻塞项并完成合并，这是合并自动化阶梯的最高一级。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

筛选功能已构建、验证，并确认可以在浏览器中正常工作。最后一步是将其合并。在本学习路径中，你已经合并过两次，每次都是自行打开拉取请求并在 github.com 上合并。这一次将使用 **Agent Merge** 让应用处理繁重工作。它可以在应用内管理拉取请求的整个生命周期。

本课将介绍如何：

- 了解 Agent Merge 及其如何自动执行合并生命周期。
- 在筛选会话中启用 Agent Merge。
- 观察它创建拉取请求、运行 CI，并在所有检查通过后合并。

## 场景

在前几课中，你探索了不同程度的自动化，从创建代码到让 Copilot 直接验证 UI。为了进一步加快开发速度，Tailspin Toys 希望了解是否可以自动合并经过审查和验证的拉取请求。

## Agent Merge 简介

通过 **Agent Merge**，可以使用 Copilot app 自动执行拉取请求落地前的最后阶段。启用后，应用会话会读取拉取请求并处理阻塞项，包括修复失败的 CI 检查、响应审查意见，以及在需要时变基。GitHub 允许后，它会立即合并。该功能在后台运行，应用重启后仍会继续，并在拉取请求合并后自动关闭。

此前，你一直在 github.com 上自行选择 **Merge pull request**。Agent Merge 将这项责任交给智能体，因此它可以管理 PR 直至完成，而你可以继续处理下一项任务。你仍需审查并批准工作，智能体只负责机械性的收尾步骤。

## 使用 Agent Merge 管理 PR

你已手动审查代码、运行测试，甚至让 Copilot 验证了 UI。现在可以将新代码合并到代码库。接下来让 agent merge 管理 PR 的持续集成 (CI) 流程并完成合并。

1. 返回上一课中用于添加筛选功能且仍保持打开的会话。
2. 在右上角选择 **Create PR** 旁的下拉菜单。
3. 选择 **Agent merge** 以启用 agent merge。

   ![GitHub Copilot app 中展开的 Create PR 下拉菜单，箭头指向 Agent merge 选项](/images/learning-hub/copilot-workshops/app-enable-agent-merge.png)

4. 按钮文本现在会变为 **Agent merge**。
5. 选择 **Agent merge** 按钮，启动 agent merge 流程。

Copilot app 随即开始创建并管理 PR。它先探索项目以确定创建 PR 的最佳方式，然后创建新 PR。

片刻后，Copilot 会再次开始工作并查看 PR 条件，即运行存储库全部测试的 CI 流程。它会报告其他团队成员留下的审查状态、需要运行的检查（CI 流程），以及 PR 是否可合并。

6. 选择 **Agent merge** 旁的下拉菜单，再选择 **Merge pull request**，允许 agent merge 合并拉取请求。

   ![Agent merge 下拉菜单显示智能体获准执行的操作：Address reviews、Fix CI failures 和 Resolve conflicts，箭头指向 Merge pull request](/images/learning-hub/copilot-workshops/app-agent-merge-merge.png)

7. 所有 CI 流程变为绿色（表示测试通过）后，Copilot 会合并拉取请求。

## 总结与后续步骤

你已自动执行开发流程中的多个环节，包括生成代码、测试和验证代码，以及拉取请求流程。你：

- 了解了 Agent Merge 及其如何自动执行合并生命周期。
- 在筛选会话中启用了 Agent Merge。
- 观察了它创建拉取请求、运行 CI，并在所有检查通过后完成合并。

接下来，你将探索**画布**，这是一种与智能体共同规划和可视化工作的更丰富方式。继续学习[第 7 课 - 使用画布规划][next-lesson]。

## 资源

- [使用 GitHub Copilot app 管理议题和拉取请求][managing-issues-prs]
- [关于 GitHub Copilot app][about-copilot-app]

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/app/7-canvases/
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app