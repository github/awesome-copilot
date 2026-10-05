---
title: "第 1 课 - 从终端构建测验"
description: "用一个详细请求让 Copilot CLI 构建完整的 Space Quiz，再做一项范围明确的优化。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

用一个详细请求描述整个项目，在批准之前审查智能体的提议，然后做一项范围明确的小更改。

本课将：

- 在 `index.html` 中构建无依赖项的测验。
- 从会话中在浏览器里打开测验。
- 做一项范围明确的更改并验证。

## 构建测验

在 Copilot CLI 会话中发送以下提示词：

```plaintext
Create a space exploration quiz with 10 questions, a progress bar, score counter, and colorful animated feedback (green for correct, red shake for wrong). Show a results screen with an emoji reaction at the end. Single index.html, no server or dependencies. Accessible, keyboard-navigable, and respects prefers-color-scheme.
```

1. 阅读提出的计划，并批准文件更改。
2. 在浏览器中打开 `index.html`，尝试回答几道题。要从会话启动浏览器，在 macOS 上运行 `!open index.html`，在 Windows 上运行 `!start index.html`，在 Linux 上运行 `!xdg-open index.html`。

## 做一项小更改，然后检查

提出一项范围明确的优化，观察限定范围的请求会带来怎样的结果：

```plaintext
The results screen feels flat. Give it a stronger sense of arrival: animate the score counting up and make the emoji reaction larger. Change nothing else.
```

1. 在浏览器中重新加载页面，并答题直到结束。
2. 留意此时还没有任何内容进入 Git，因此没有可用于差异比较的基准。发布项目后，情况就不同了。

## 总结与后续步骤

已经构建测验，并通过限定范围的请求进行了优化。继续学习[第 2 课：记录项目指令][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-cli/2-project-instructions/
