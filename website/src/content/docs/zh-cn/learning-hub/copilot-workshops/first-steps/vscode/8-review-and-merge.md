---
title: "第 8 课 - 审查与合并"
description: "从 Source Control 创建拉取请求，请求 Copilot 代码审查，使用 GitHub 工具处理反馈，然后合并。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-08
---

使用 VS Code 中的 GitHub 工具检查、审查并合并新工作。

本课将：

- 提交新工作，并从 **Source Control** 创建拉取请求。
- 请求 Copilot 代码审查。
- 使用 GitHub MCP 处理反馈和失败的检查。
- 合并拉取请求。

## 检查、审查与合并

> [!IMPORTANT]
> Copilot Free 不包含针对拉取请求的 Copilot 代码审查。使用 Copilot Student 或包含代码审查的付费 Copilot 计划。组织也可以为没有 Copilot 许可证的成员启用 GitHub.com 上的付费代码审查，但这不会授予 IDE 中的代码审查访问权限。查看 [Copilot 代码审查的可用性说明][code-review]。
>
> 如果没有访问权限，跳过步骤 4 中的 Copilot 审查请求。自行审查差异或请团队成员审查，然后继续其余步骤，在合并前处理人工审查反馈并重新测试。

1. 打开 **Source Control**，在创建任何内容之前先检查已更改的文件和差异。
2. 提交新工作，再次使用 **sparkle** 按钮编写消息。
3. 选择 **Source Control** 中出现的 **Create Pull Request** 按钮。Copilot 会根据提交起草标题和描述，比从零开始请求生成的拉取请求更完善。
4. 在创建拉取请求时、从 VS Code 的 **GitHub** 视图，或在 GitHub 上请求 **Copilot code review**。
5. 让 Copilot 通过 GitHub MCP 检查拉取请求、解决合并冲突、处理审查评论，并调查失败的 CI 检查。
6. 在集成浏览器中重新测试，审查每项拟议的更改，并更新分支。
7. 检查和审查完成后，让智能体合并，或通过 GitHub 集成合并。

> [!NOTE]
> 也可以随时在聊天中让 Copilot 执行这些操作。值得先学会 **Source Control** 路径，因为它能根据实际更改编写提交和拉取请求文本。

## 总结与后续步骤

已经在不离开 VS Code 的情况下审查并合并拉取请求。继续学习[第 9 课：将下一个想法交给云会话][next-lesson]。

[code-review]: https://docs.github.com/copilot/concepts/agents/code-review
[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/vscode/9-cloud-session/
