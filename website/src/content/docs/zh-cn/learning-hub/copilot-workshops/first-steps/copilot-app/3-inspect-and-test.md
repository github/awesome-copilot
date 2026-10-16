---
title: "第 3 课 - 检查会话并测试测验"
description: "查看会话的项目和使用详情，然后在向 Git 写入任何内容之前运行浏览器级冒烟测试。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-15
---

会话已经完成实际工作，现在有内容可以检查了。确认智能体的工作目标，然后让它在集成浏览器中操作测验，报告实际发生的情况，而不是预期会发生的情况。

本课将：

- 查看标题菜单中的项目和会话控件。
- 检查使用情况菜单中的计划、会话使用量、token 和上下文。
- 运行浏览器级冒烟测试，并修复所有失败项。

## 查看项目详情

选择标题栏中的 **Build a space quiz**，打开项目和会话菜单。

![Build a space quiz 标题菜单示意图。它标明 space-quiz 项目的文件夹会话，并提供路径、远程控制、名称、嵌套会话、会话 ID、共享、归档和删除控件。](/images/learning-hub/copilot-workshops/first-steps-app-project-details.svg)

此菜单标明会话正在处理的项目，并提供管理会话的控件。

1. 确认文件夹会话对应 `space-quiz` 项目。
2. 选择 **Path**，确认会话正在预期的文件夹中工作。
3. 查看远程控制、重命名、嵌套会话、共享、归档和删除控件。

## 查看使用详情

选择 **Send** 旁边的使用情况控件，打开计划和会话使用情况菜单。

![Send 按钮旁边的使用情况菜单示意图。它显示 GitHub Copilot Pro+ 计划、会话 AI 额度、输入和输出 token 数量，以及 40 万 token 中 16% 的上下文使用量。](/images/learning-hub/copilot-workshops/first-steps-app-usage-details.svg)

此菜单将帐户和会话使用情况与项目控件分开显示：

- **Plan** 在相关信息可用时显示计划级使用情况。
- **Session** 显示当前会话使用的 AI 额度。
- **Tokens** 显示输入、缓存、输出和推理 token 数量。
- **Context** 显示会话已使用的上下文窗口比例。

随着会话推进，请检查 **Context**。上下文越满，留给实际任务的空间就越少，这时就该启动新会话。

> [!TIP]
> **大多数不理想的结果都源于上下文问题**
>
> 文件夹错误或上下文窗口接近耗尽，比提示词不佳更常导致意外结果。

## 在向 Git 写入任何内容之前测试

集成浏览器是真正的浏览器，智能体可以操作测验并验证行为。发送以下提示词：

```plaintext
Run a browser-level smoke test for the quiz in the integrated browser. Check keyboard navigation, score updates, correct and incorrect feedback, and the results screen. Fix any failures, then report what passed.
```

1. 在智能体逐题测试时观察集成浏览器。
2. 如果有任何失败项，让智能体修复并重新测试，直到全部通过。
3. 只有构建和测试都通过后才继续。

目前尚未向 Git 写入任何内容。下一课将运行 `/init create simple rules for the project`，它会读取项目的当前状态，因此值得先确认项目能正常工作。

## 总结与后续步骤

已经确认会话的项目和使用详情，并通过浏览器级冒烟测试验证了测验。继续学习[第 4 课：记录项目指令][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-app/4-project-instructions/
