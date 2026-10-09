---
title: "第 5 课 - 发布项目"
description: "将本地 Space Quiz 实验项目发布为公开的 GitHub 存储库。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-08
---

发布 Space Quiz，以便管理议题、使用隔离的工作树，并完成拉取请求工作流。

本课将：

- 将文件夹初始化为 Git 存储库。
- 创建并推送到公开的 GitHub 存储库。
- 在 Copilot app 中将项目关联到 GitHub。

## 发布存储库

发送以下提示词：

```plaintext
Initialize this folder as a Git repository, create an initial commit, and create a new public GitHub repository named space-quiz in my account. Push the current branch and set it as the default branch. Refresh the project within this app so the GitHub project is linked.
```

> [!WARNING]
> 根据审批设置，智能体可能在创建存储库或推送代码前要求确认，也可能自动批准这些操作。启用 **Approve all** 时，不要指望出现单独的确认提示。发送发布提示词前，先审查设置、请求的操作和目标位置。

智能体完成后：

1. 在 GitHub 上打开新存储库。
2. 确认存在 `index.html`。
3. 返回 Copilot app，确认项目已关联到存储库。

## 总结与后续步骤

项目现在已成为 GitHub 存储库。继续学习[第 6 课：使用议题与会话][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-app/6-issues-and-sessions/
