---
title: "第 6 课 - 了解智能体能看到什么"
description: "使用 /context 检查上下文窗口中的内容，并在对话偏离目标时用 /clear 重新开始。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

通过终端命令可以查看并有意识地管理上下文。了解智能体能看到什么，有助于理解结果，并决定何时重新开始。

本课将：

- 使用 `/context` 检查上下文窗口。
- 查看各部分占用的窗口空间。
- 使用 `/clear` 重置偏离目标的对话。

## 检查上下文

1. 运行 `/context`，检查文件、指令和对话历史。
2. 检查各部分占用了多少窗口空间。
3. 对话偏离目标时，运行 `/clear` 重新开始。
4. 请求下一项更改之前，重新添加正确的文件。

![运行 /context 后的 Copilot CLI 输出示意图。上下文窗口用量指示器显示已使用 61%，分别由对话、已读取文件和指令占用。提示建议空间不足时使用 /compact 汇总，或启动新会话。](/images/learning-hub/copilot-workshops/first-steps-cli-context.svg)

`/context` 准确显示上下文窗口中有哪些内容，以及还剩多少空间。空间不足时，使用 `/compact` 汇总对话，或启动新会话。

## 总结与后续步骤

现在可以查看并管理智能体掌握的信息。继续学习[第 7 课：恢复会话与远程访问][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-cli/7-resume-and-remote/
