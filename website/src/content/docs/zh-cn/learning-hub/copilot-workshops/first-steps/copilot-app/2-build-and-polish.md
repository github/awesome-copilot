---
title: "第 2 课 - 构建与优化测验"
description: "构建单文件 Space Quiz，并通过集成浏览器和元素选择器优化它。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

使用一个详细的提示词构建 Space Quiz，在集成浏览器中验证行为，并用元素选择器优化视觉效果。

本课将：

- 在 `index.html` 中创建无依赖项的测验。
- 在集成浏览器中测试测验。
- 检查生成的代码。
- 在保持无障碍支持的前提下优化选中的元素。

## 构建测验

在 `space-quiz` 会话中发送以下提示词：

```plaintext
Create a space exploration quiz with 10 questions, a progress bar, score counter, and colorful animated feedback (green for correct, red shake for wrong). Show a results screen with emoji reaction at the end. Center in a narrow column. Single index.html, no server/dependencies. Polished, sans-serif, 14–16px body, prefers-color-scheme. Open in the integrated browser.
```

智能体完成后，尝试回答几道题，并确认：

- 进度条向前推进。
- 得分更新。
- 答对时显示绿色状态。
- 答错时显示红色抖动动画。
- 最后一题结束后出现结果界面。

## 检查生成的代码

折叠左侧边栏和右侧浏览器面板，然后在展开的代码区域中查看 `index.html`。留意 HTML、CSS 和 JavaScript 如何在同一个文件中协作。完成后恢复两个面板。

## 使用元素选择器优化

1. 选择浏览器工具栏中的元素选择器。
2. 选择测验标题或答案区域。
3. 发送以下提示词：

   ```plaintext
   Make the selected element feel more like a mission-control display. Keep it accessible and preserve the existing light and dark themes.
   ```

4. 观察集成浏览器刷新，并验证更改。

## 可选优化

如果想继续尝试，可以让智能体：

- 添加淡雅的星空背景，并遵循 `prefers-reduced-motion`。
- 得分为 8 分或更高时，让结果界面更有庆祝氛围。
- 改善键盘焦点状态，然后在不使用鼠标的情况下验证测验。

## 总结与后续步骤

已经构建、检查并优化了 Space Quiz。继续学习[第 3 课：检查会话并测试测验][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-app/3-inspect-and-test/
