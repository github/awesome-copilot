---
title: "第 2 课 - 记录项目指令"
description: "在 Copilot Chat 中运行 /init，为 Space Quiz 生成 .github/copilot-instructions.md，然后进行调整。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

工作区中已有可正常运行的测验，现在生成描述真实项目的存储库自定义指令。Copilot 会在每次聊天请求时读取这些指令。

本课将：

- 使用 `/init` 生成存储库自定义指令。
- 保存之前先审查 `.github/copilot-instructions.md`。
- 精简并个性化调整指令。

## 使用 `/init` 记录规则

1. 在 Copilot Chat 中运行 `/init`。
2. 保存生成的 `.github/copilot-instructions.md` 文件之前先审查。
3. 只保留符合项目的指导：单文件、无依赖项、支持无障碍，并经过浏览器测试。

![VS Code 示意图，编辑器已打开 .github/copilot-instructions.md，Explorer 中选中了该文件，旁边是 index.html。文件标题为 Space Quiz，列出规则：单个 index.html，无依赖项且无需构建步骤；所有答案都可通过键盘访问；两种主题都遵循 prefers-color-scheme。“How I like code written”部分要求使用小函数、提前返回、不使用晦涩的单行代码，并且只为真正出人意料的内容添加注释。](/images/learning-hub/copilot-workshops/first-steps-vscode-instructions.svg)

存储库自定义指令位于 `.github/copilot-instructions.md`，适用于每次聊天请求。

> [!IMPORTANT]
> **顺序很重要**
>
> `/init` 读取的是工作区当前的状态。在测验构建完成后运行，才能生成基于真实代码的指令。

## 按自己的习惯调整

指令文件不只是用来记录项目事实。还可以添加原本会在每个提示词中重复的具体要求，例如代码风格、命名约定、应避免的库，以及希望添加多少注释。后续每个会话都会先读取这个文件，再读取提示词。

## 总结与后续步骤

工作区现在有了基于真实代码的自定义指令。继续学习[第 3 课：检查上下文并测试][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/vscode/3-inspect-and-test/
