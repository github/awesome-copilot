---
title: "GitHub Copilot CLI 入门"
description: "通过构建并交付 Space Quiz，在引导下探索以终端为中心的 GitHub Copilot CLI 工作流。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
tags:
  - workshop
  - cli
---

通过适合初学者的动手实践探索 GitHub Copilot CLI。从空文件夹构建色彩丰富的 Space Quiz，学习以终端为中心的工作流：在向 Git 写入任何内容之前构建并审查差异，并行运行会话，先规划再编辑，然后在不离开 shell 的情况下创建并合并拉取请求。

本研讨会约需 60 到 90 分钟。项目只有一个 HTML 文件，没有运行时依赖项，因此可以专注于学习 CLI 及其智能体工作流。

> [!NOTE]
> 本研讨会由 [James Montemagno][james] 创建，改编自 [First Steps with GitHub Copilot][source-lab]。原始内容采用 [MIT 许可证][source-license]。

## 课程

| 课程 | 主题 | 实践内容 |
| ------ | ----- | ---------------- |
| [0. 先决条件与设置][lesson-0] | 设置 | 确认先决条件，安装 Copilot CLI，登录并选择模型 |
| [1. 构建测验][lesson-1] | 构建 | 从终端构建测验，并做一项范围明确的更改 |
| [2. 记录项目指令][lesson-2] | 指令 | 使用 `/init` 生成并调整智能体指令 |
| [3. 发布项目][lesson-3] | 发布 | 通过提示词或手动完成初始化、提交和发布 |
| [4. 并行处理议题][lesson-4] | 实现 | 创建待办事项，将议题添加到聊天，用 `/diff` 审查，并在工作树中启动第二个会话 |
| [5. 先规划再编辑][lesson-5] | 规划 | 使用 `/plan` 确定第二个议题的实现方案 |
| [6. 了解智能体能看到什么][lesson-6] | 上下文 | 使用 `/context` 和 `/clear` 检查并重置上下文 |
| [7. 恢复会话与远程访问][lesson-7] | 恢复 | 使用 `/resume` 离开并返回会话，还可用 `/remote` 从其他设备查看本地会话 |
| [8. 创建、审查与合并][lesson-8] | 审查 | 使用 `/pr create` 和 `/pr agentmerge` 创建并合并拉取请求 |
| [9. 委派工作][lesson-9] | 委派 | 将新功能交给 `/delegate`，并查看云会话进度 |
| [10. 回顾与后续步骤][lesson-10] | 回顾 | 回顾工作流并继续学习 |

## 开始学习

[从第 0 课“先决条件与设置”开始][lesson-0]。

[james]: https://github.com/jamesmontemagno
[source-lab]: https://github.com/jamesmontemagno/first-steps-with-github-copilot
[source-license]: https://github.com/jamesmontemagno/first-steps-with-github-copilot/blob/main/LICENSE
[lesson-0]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-cli/0-prerequisites/
[lesson-1]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-cli/1-build/
[lesson-2]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-cli/2-project-instructions/
[lesson-3]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-cli/3-publish/
[lesson-4]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-cli/4-issues-and-sessions/
[lesson-5]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-cli/5-plan-mode/
[lesson-6]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-cli/6-context/
[lesson-7]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-cli/7-resume-and-remote/
[lesson-8]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-cli/8-pull-request/
[lesson-9]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-cli/9-delegate/
[lesson-10]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-cli/10-review/
