---
title: "第 1 课 - 在工作区中构建"
description: "在 VS Code 中构建 Space Quiz，在集成浏览器中预览，并优化选中的元素。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

将编辑器、聊天、文件和预览放在一起。构建测验，在集成浏览器中答题，然后将特定元素直接交给聊天，进行范围明确的更改。

本课将：

- 在单个 `index.html` 中构建测验。
- 在集成浏览器中预览测验。
- 在浏览器中选择并优化元素。

## 构建测验

在 Copilot Chat 中发送以下提示词：

```plaintext
Create a colorful, accessible space exploration quiz with 10 questions in a single index.html. Add a progress bar, score counter, animated correct and incorrect feedback, and a results screen. Use no server or dependencies. Open it in the VS Code integrated browser.
```

1. 在编辑器中审查生成的文件。
2. 打开集成浏览器，尝试回答几道题。
3. 随时打开 **Source Control**，查看已更改的文件和差异。

## 选择并优化元素

集成浏览器可以将特定元素直接交给聊天，无需再描述具体指的是哪个按钮。

1. 在集成浏览器中打开测验后，从浏览器工具栏启动元素选择。
2. 选择答案按钮，将该元素附加到下一条聊天消息。
3. 发送以下提示词，并观察预览重新加载：

   ```plaintext
   Using the selected element, make the answer buttons feel more tactile: add a subtle press state, a clearer focus ring for keyboard users, and a smoother transition into the correct and incorrect colors. Change nothing else.
   ```

4. 保留更改之前，先在 **Source Control** 中查看差异。
5. 按 <kbd>Tab</kbd> 在答案间移动，确认焦点轮廓可见。

## 总结与后续步骤

已经在不离开编辑器的情况下构建、预览并优化测验。继续学习[第 2 课：记录项目指令][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/vscode/2-project-instructions/
