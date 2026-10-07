---
title: "第 4 课 - 发布项目"
description: "完全通过 VS Code 内置的 Source Control 集成，将 Space Quiz 初始化、提交并发布。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

完全通过内置的 Git 集成，将经过测试的测验发布到 GitHub，并让 Copilot 根据实际更改起草提交消息。

本课将：

- 从 **Source Control** 初始化存储库。
- 根据已暂存的差异生成提交消息。
- 将分支发布到新的公开 GitHub 存储库。

## 初始化、提交与发布

1. 打开 **Source Control**，选择 **Initialize Repository**。
2. 暂存文件。
3. 选择提交消息框中的 **sparkle pencil** 图标，让 Copilot 根据已暂存的差异编写消息。阅读消息，纠正所有不准确的内容，然后提交。
4. 选择 **Publish Branch**，在 GitHub 上创建公开的 `space-quiz` 存储库。
5. 确认 GitHub 上存在经过测试的文件。

![VS Code 的 Source Control 视图示意图。Changes 列表显示 index.html 和 .github/copilot-instructions.md。提交消息框中的闪光按钮旁有标注 Copilot wrote your message，消息为 Add per-question timer to the quiz。Commit 按钮下方高亮显示 Create Pull Request 按钮，旁注为 Commit first, then this button appears right inside Source Control。](/images/learning-hub/copilot-workshops/first-steps-vscode-commit.svg)

闪光按钮根据已暂存的差异起草提交消息。提交后，**Source Control** 还会提供创建拉取请求的选项。

## 总结与后续步骤

经过测试的测验现在已发布到 GitHub。继续学习[第 5 课：先规划再编辑][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/vscode/5-plan-mode/
