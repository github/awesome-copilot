---
title: "第 3 课 - 检查会话并测试测验"
description: "查看会话详情，确认智能体正在处理的内容，然后在向 Git 写入任何内容之前运行浏览器级冒烟测试。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

会话已经完成实际工作，现在有内容可以检查了。确认智能体的工作目标，然后让它在集成浏览器中操作测验，报告实际发生的情况，而不是预期会发生的情况。

本课将：

- 查看会话详情面板。
- 检查会话的项目、路径、分支、更改和上下文使用量。
- 运行浏览器级冒烟测试，并修复所有失败项。

## 查看会话详情

会话详情准确显示智能体正在处理的内容。无需时刻关注这个面板，但当结果出乎意料时，其中的每一项都值得检查。

![Copilot app 中 Space Quiz 构建会话的详情面板示意图。面板显示基于 origin/main 的 main 分支、路径、项目、会话名称、会话 ID、智能体、一个已更改的文件、token 数量、27% 的上下文使用量、会话费用，以及启用远程控制、重命名、查看洞察、以机密 gist 分享或归档会话的选项。](/images/learning-hub/copilot-workshops/first-steps-app-session-details.svg)

面板显示工作位置、更改内容，以及上下文窗口的使用程度。这里没有模型行，因为模型是在输入区域中为每次请求单独选择的。

1. 确认 **project**、**path** 和 **branch** 与预期编辑的目标一致。
2. 查看 **Changes**，了解会话是否已修改任何内容。
3. 检查 **context usage**。使用量越高，留给实际任务的空间越少，这时就该启动新会话。

> [!TIP]
> **大多数不理想的结果都源于上下文问题**
>
> 分支错误、文件夹错误或上下文窗口接近耗尽，比提示词不佳更常导致意外结果。

## 在向 Git 写入任何内容之前测试

集成浏览器是真正的浏览器，智能体可以操作测验并验证行为。发送以下提示词：

```plaintext
Run a browser-level smoke test for the quiz in the integrated browser. Check keyboard navigation, score updates, correct and incorrect feedback, and the results screen. Fix any failures, then report what passed.
```

1. 在智能体逐题测试时观察集成浏览器。
2. 如果有任何失败项，让智能体修复并重新测试，直到全部通过。
3. 只有构建和测试都通过后才继续。

目前尚未向 Git 写入任何内容。下一步的 `/init` 会读取项目的当前状态，因此值得先确认项目能正常工作。

## 总结与后续步骤

已经确认会话正在处理的内容，并通过浏览器级冒烟测试验证了测验。继续学习[第 4 课：记录项目指令][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-app/4-project-instructions/
