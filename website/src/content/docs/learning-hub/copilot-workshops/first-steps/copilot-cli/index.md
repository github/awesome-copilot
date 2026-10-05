---
title: "GitHub Copilot CLI first steps"
description: "Take a guided, terminal-first tour of GitHub Copilot CLI by building and shipping a Space Quiz."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
tags:
  - workshop
  - cli
---

Take a beginner-friendly, hands-on tour of GitHub Copilot CLI. You will build a colorful Space Quiz from an empty folder and learn the terminal-first loop: build and review diffs before Git writes anything, run sessions side by side, plan before you edit, then create and merge the pull request without leaving your shell.

The workshop takes approximately 60 to 90 minutes. Your project uses a single HTML file with no runtime dependencies, so you can focus on learning the CLI and its agentic workflows.

> [!NOTE]
> This workshop was created by [James Montemagno][james] and adapted from [First Steps with GitHub Copilot][source-lab]. The original content is available under the [MIT License][source-license].

## Lessons

| Lesson | Topic | What you will do |
| ------ | ----- | ---------------- |
| [0. Prerequisites and setup][lesson-0] | Setup | Verify prerequisites, install Copilot CLI, sign in, and choose a model |
| [1. Build the quiz][lesson-1] | Build | Build the quiz from the terminal and make one focused change |
| [2. Capture project instructions][lesson-2] | Instructions | Generate and tailor agent instructions with `/init` |
| [3. Publish the project][lesson-3] | Publish | Initialize, commit, and publish by prompt or by hand |
| [4. Work on issues in parallel][lesson-4] | Implement | Create a backlog, add an issue to chat, review with `/diff`, and start a second session in a worktree |
| [5. Plan before you edit][lesson-5] | Plan | Use `/plan` to agree on an approach for the second issue |
| [6. Know what the agent can see][lesson-6] | Context | Inspect and reset context with `/context` and `/clear` |
| [7. Resume and go remote][lesson-7] | Resume | Leave and return to sessions with `/resume`, and optionally follow a local session from another device with `/remote` |
| [8. Create, review, and merge][lesson-8] | Review | Create and merge a pull request with `/pr create` and `/pr agentmerge` |
| [9. Delegate work][lesson-9] | Delegate | Hand a new feature to `/delegate` and follow a cloud session |
| [10. Review and next steps][lesson-10] | Review | Recap the workflow and continue learning |

## Get started

[Start with Lesson 0: Prerequisites and setup][lesson-0].

[james]: https://github.com/jamesmontemagno
[source-lab]: https://github.com/jamesmontemagno/first-steps-with-github-copilot
[source-license]: https://github.com/jamesmontemagno/first-steps-with-github-copilot/blob/main/LICENSE
[lesson-0]: /learning-hub/copilot-workshops/first-steps/copilot-cli/0-prerequisites/
[lesson-1]: /learning-hub/copilot-workshops/first-steps/copilot-cli/1-build/
[lesson-2]: /learning-hub/copilot-workshops/first-steps/copilot-cli/2-project-instructions/
[lesson-3]: /learning-hub/copilot-workshops/first-steps/copilot-cli/3-publish/
[lesson-4]: /learning-hub/copilot-workshops/first-steps/copilot-cli/4-issues-and-sessions/
[lesson-5]: /learning-hub/copilot-workshops/first-steps/copilot-cli/5-plan-mode/
[lesson-6]: /learning-hub/copilot-workshops/first-steps/copilot-cli/6-context/
[lesson-7]: /learning-hub/copilot-workshops/first-steps/copilot-cli/7-resume-and-remote/
[lesson-8]: /learning-hub/copilot-workshops/first-steps/copilot-cli/8-pull-request/
[lesson-9]: /learning-hub/copilot-workshops/first-steps/copilot-cli/9-delegate/
[lesson-10]: /learning-hub/copilot-workshops/first-steps/copilot-cli/10-review/
