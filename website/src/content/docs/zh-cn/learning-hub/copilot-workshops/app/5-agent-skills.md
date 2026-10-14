---
title: "第 5 课 - 自定义并使用 quality-checks 技能"
description: "探索现有的 quality-checks 技能，自定义其报告格式，并用它验证筛选功能。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

编写代码不只是写出代码。我们已经手动验证代码能够运行，并使用指令文件确保它符合标准。但测试、lint 以及持续集成 (CI) 的其他环节又该如何处理？

对于这类任务，**智能体技能**最为合适。技能可帮助 Copilot 了解如何正确执行这些操作。

在本课中，将：

- 探索现有的 `quality-checks` 技能。
- 自定义结果格式。
- 运行技能并审查输出。

## 场景

Tailspin Toys 使用 `quality-checks` 技能运行单元测试、lint 和类型检查。团队希望改进报告，让结果更易于阅读。

## 指令、脚本和资源

智能体技能将可复用的任务指令、可执行脚本和辅助资源打包，供智能体按需加载。技能本质上是一个以技能命名的文件夹，其中包含名为 `SKILL.md` 的 Markdown 文件。该文件的 frontmatter 使用名称和说明定义技能，正文则概述技能用途、调用时机及使用指南。文件夹还可以包含存放脚本和其他资源的子文件夹，供技能调用时使用。

> [!NOTE]
> 技能不要求包含其他文件夹和文件。本示例中的技能会运行 `npm` 命令来执行测试和 lint，因此不需要额外的辅助文件。

技能可位于项目的 `.github/skills` 文件夹中，成为可供团队其他成员共享和复用的存储库资产；也可位于 Copilot 的根文件夹中，通常为 `~/.copilot/skills`。

## 探索技能

1. 如果尚未打开 **Files** 画布，请在审查面板中选择 **+**，再选择 **File**。
2. 搜索 `.github/skills/quality-checks/SKILL.md`。
3. 阅读顶部的 `name` 和 `description`。注意，说明可帮助 Copilot 判断何时调用技能。
4. 阅读指令，留意它如何引导 Copilot 完成测试和 lint 流程。

## 更改前运行技能

技能既可通过斜杠 (`/`) 命令直接调用，也可使用自然语言调用。下面要求 Copilot 运行该技能的三类检查。

1. 从模式下拉菜单选择 **Interactive**，确保 Copilot 处于该模式。
2. 使用以下提示词调用该技能：

  ```plaintext
  Run the quality-checks skill for unit tests, lint, and type checks.
  ```

3. 查看最后生成的报告。

## 自定义报告

现在，希望报告更清晰地显示运行了哪些检查、是否成功，以及工具实际报告了什么。下面更新技能，让它生成该报告。

1. 返回 **Files** 画布。
2. 如果尚未打开，请打开 `.github/skills/quality-checks/SKILL.md`。
3. 将以下章节添加到文件末尾：

  ```markdown
  ## Results output formatting

  Upon completion, report each command that ran and whether it passed, failed, or was blocked. Include test counts, durations, errors, warnings, and other metrics only when the tool reports them. Identify the next action for any failure or blocker, and never describe a skipped or incomplete check as passed.
  ```

文件会自动保存。

## 运行技能

完成更改后，使用与之前完全相同的提示词查看效果。

1. 从模式下拉菜单选择 **Interactive**，确保 Copilot 处于该模式。
2. 使用以下提示词调用该技能：

  ```plaintext
  Run the quality-checks skill for unit tests, lint, and type checks.
  ```

3. 查看最后生成的报告。

## 总结与后续步骤

你已自定义并使用现有智能体技能。本课中，你：

- 探索了用于单元测试、lint 和类型检查的 `quality-checks` 技能。
- 自定义了结果格式。
- 运行技能并审查了输出。

此更改将与筛选功能一起纳入功能 PR。接下来，你将允许 Copilot 通过 Playwright MCP 服务器直接与站点交互并[验证功能][next-lesson]。

## 更多技能示例

以下社区示例仅供参考，不是额外任务。采用前先检查其先决条件和行为：

- [Agent Skills 规范][skill-spec]。
- [贡献工作流：`make-repo-contribution`][contribution-example]。
- [需求文档：`prd`][prd-example]。
- [图表及配套导出脚本：`drawio`][drawio-example]。
- [浏览器测试：`webapp-testing`][browser-example]。

上游贡献示例名为 `make-repo-contribution`；旧版 Tailspin 模板使用另一个名称 `make-contribution`。本工作坊不依赖其中任何一个贡献技能。

[next-lesson]: /zh-cn/learning-hub/copilot-workshops/app/6-mcp-playwright/
[skill-spec]: https://agentskills.io/specification
[contribution-example]: https://github.com/github/awesome-copilot/tree/main/skills/make-repo-contribution
[prd-example]: https://github.com/github/awesome-copilot/tree/main/skills/prd
[drawio-example]: https://github.com/github/awesome-copilot/tree/main/skills/drawio
[browser-example]: https://github.com/github/awesome-copilot/tree/main/skills/webapp-testing
