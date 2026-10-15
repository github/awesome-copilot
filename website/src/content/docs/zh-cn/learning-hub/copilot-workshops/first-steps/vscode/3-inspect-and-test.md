---
title: "第 3 课 - 检查上下文并测试"
description: "检查 Copilot Chat 请求附带的上下文，然后在向 Git 写入任何内容之前运行浏览器级冒烟测试。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

发布任何内容之前，先检查 Copilot 能看到什么，并确认测验能正常工作。

本课将：

- 检查聊天请求包含的上下文。
- 运行浏览器级冒烟测试。
- 在开始使用 Git 之前修复失败项。

## 从右下角检查上下文

VS Code 在 Copilot Chat 输入框的右下角显示当前上下文。

1. 打开聊天输入框**右下角**的上下文指示器。
2. 检查请求中包含的文件、自定义指令和符号。
3. 继续之前，移除无关上下文，或附加测验文件。

## 在向 Git 写入之前构建并测试

初始化存储库或提交任何内容之前，使用集成浏览器和冒烟测试提示词：

```plaintext
Run a browser-level smoke test for the quiz. Check keyboard navigation, score updates, correct and incorrect feedback, and the results screen. Fix any failures, then report what passed.
```

1. 运行冒烟测试，并检查集成浏览器。
2. 修复所有失败项，并重新测试，直到全部通过。
3. 只有构建和测试通过后，才开始使用 Git。

## 总结与后续步骤

已经确认 Copilot 能看到的内容，并在发布之前测试了测验。继续学习[第 4 课：发布项目][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/vscode/4-publish/
