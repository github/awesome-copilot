---
title: "第 3 课 - 发布项目"
description: "通过提示词或自行运行命令，将 Space Quiz 初始化、提交并发布到 GitHub。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

将实验项目发布为公开的 GitHub 存储库。可以用一个提示词提出请求，也可以自行运行命令。两种方式都尝试一次，就能准确了解智能体代为执行了哪些操作。

本课将：

- 初始化 Git 存储库并创建第一个提交。
- 创建并推送到公开的 GitHub 存储库。
- 确认提交和文件已成功写入。

## 选项 A：让智能体执行

发送以下提示词：

```plaintext
Initialize this folder as a Git repository, create an initial commit, and create a new public GitHub repository named space-quiz in my account. Push the current branch and set it as the default branch.
```

在智能体请求时逐一批准 Git 和 GitHub 操作。

## 选项 B：自行运行

在每条命令前加上 `!`，即可在会话中运行；也可以在自己的终端中运行不带此前缀的命令：

```plaintext
!git init -b main
!git add .
!git commit -m "Add space quiz"
!gh repo create space-quiz --public --source=. --push
```

最后一条命令使用 [GitHub CLI][gh-cli]。如果没有安装，在 GitHub 上创建存储库，然后运行 `!git remote add origin <url>` 和 `!git push -u origin main`。

## 确认结果

1. 运行 `!git log --oneline`，确认提交已成功写入。
2. 在 GitHub 上打开存储库，确认存在 `index.html`。

## 总结与后续步骤

项目现在已成为 GitHub 存储库，并有了可用于比较的已验证版本。继续学习[第 4 课：并行处理议题][next-lesson]。

[gh-cli]: https://cli.github.com/
[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-cli/4-issues-and-sessions/
