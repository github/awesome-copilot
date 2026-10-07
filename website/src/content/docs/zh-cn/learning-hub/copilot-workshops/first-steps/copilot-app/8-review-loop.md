---
title: "第 8 课 - 完成 Copilot 审查流程"
description: "创建拉取请求，请求 Copilot 审查，处理可执行的反馈，并让 Agent Merge 持续维护拉取请求。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

将已实现的议题提交为拉取请求，请求 Copilot 审查，并在合并前处理反馈。

本课将：

- 最后检查一次会话的更改。
- 从智能体会话创建拉取请求。
- 请求 Copilot 代码审查。
- 审查并落实可执行的反馈。
- 启用 Agent Merge，持续维护拉取请求直到合并。

## 创建并审查拉取请求

1. 打开右侧弹出面板，选择 **Changes** 选项卡，检查会话中更改的文件。
2. 在会话工具栏中选择 **Create PR**。
3. 审查生成的标题和描述，然后创建拉取请求。
4. 在 GitHub 上打开拉取请求。
5. 从 **Reviewers** 菜单请求 **Copilot** 审查。
6. 打开 **Files changed** 选项卡，阅读每条审查评论。
7. 对于每条可执行的评论，使用应用中的 Copilot **Fix** 操作，或自行修改。
8. 审查每项更改，并重新测试功能。
9. 简要回复更改内容，然后将对话标记为已解决。

> [!NOTE]
> 如果建议不适用或超出拉取请求的范围，回复原因，而不是做不必要的更改。合并前解决所有审查对话。

## 使用 Agent Merge 合并

为拉取请求启用 **Agent Merge**，让智能体持续维护它。智能体会处理审查评论、修复失败的检查，并解决新出现的冲突，然后在全部通过后合并。

如果更愿意自行合并，先审查最终差异、验证功能，并在所有检查通过后合并拉取请求。

## 总结与后续步骤

已经完成从议题到经过审查并合并的拉取请求的开发流程。继续学习[第 9 课：自动化议题分类][next-lesson]。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/first-steps/copilot-app/9-automations/
