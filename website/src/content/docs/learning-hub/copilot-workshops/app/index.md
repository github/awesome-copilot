---
title: "Real-World Development with GitHub Copilot app"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-08
description: "Practice agent-driven development with the GitHub Copilot app and the Tailspin Toys workshop."
tags:
  - workshop
---

The **[GitHub Copilot app](https://docs.github.com/copilot/concepts/agents/github-copilot-app)** is a desktop application built on Copilot CLI that brings agent-driven development into a single, focused workspace. It adds parallel agent sessions, switchable session modes, shared canvases, and native GitHub issue and pull request management — including **Agent Merge**, which shepherds a pull request through rebases, review feedback, continuous integration (CI) fixes, and merge.

The workshop follows one continuous Tailspin Toys workflow:

1. Prepare the project, install the app, connect your repository, and explore its workspace and seeded backlog.
2. Make a focused star-rating change, review it in the browser, and manually merge your first pull request (PR).
3. Start from the filtering issue, define the approach in **Plan** mode, build it in **Autopilot** mode, then review it in **Interactive** mode.
4. Update the repository instructions and apply them to the filtering work.
5. Customize the existing `quality-checks` skill and use it to run the project checks.
6. Add the Playwright Model Context Protocol (MCP) server and use it to explore filtering in a browser.
7. Create a quality assurance (QA) custom agent and use it to review requirements, coverage, and verification evidence.
8. Review the complete filtering change and use Agent Merge for the second PR.
9. Use the existing Database Explorer canvas, then create and test a repository-backed triage canvas.

To keep the workshop focused, you'll create two PRs: star ratings, then filtering with the instruction updates, skill update, QA profile, and tests. Start each from updated `main`. The filtering and quality workflow shares one session, worktree, and branch so you can build on your work as you explore each tool. The final canvas exercise stays in its session so you can focus on creating and testing the shared surface rather than repeating the PR workflow.

## Lessons

| Lesson | Topic | Description |
|--------|-------|-------------|
| [0. Prerequisites][ex0] | Setup | Install Node.js and create your copy of the Tailspin Toys project |
| [1. Install the Copilot app][ex1] | Setup | Install the app, connect your project, and get oriented in the workspace |
| [2. Add star ratings: a quick win][ex2] | First change | Display existing ratings and the null fallback, then merge PR 1 |
| [3. Agent modes: Plan and Autopilot][ex3] | Agent modes | Plan the feature from its issue, build with Autopilot, then review in Interactive mode |
| [4. Guide Copilot with custom instructions][ex4] | Context | Explore and update instructions, then apply them to filtering |
| [5. Customize and use a quality-checks skill][ex5] | Repeatable checks | Explore the existing skill, change its report format, and run it |
| [6. Validate functionality with Playwright MCP][ex6] | Browser observation | Configure MCP through Customize and inspect filtering behavior |
| [7. Create and use a QA agent][ex7] | Requirements and coverage | Create and select a specialist profile, then gather final verification evidence |
| [8. Create and merge the feature PR][ex8] | Review and merge | Review filtering, instructions, the skill, QA profile, and tests, then use Agent Merge for the second PR |
| [9. Explore and create canvases][ex9] | Collaboration | Use Database Explorer, then create and test a repository-backed triage canvas |
| [10. Wrap-up and next steps][ex10] | Summary | Review the workflow, artifacts, and further resources |

## Prerequisites

Before attending this workshop, please ensure you have:

- [ ] A GitHub account with an active **Copilot Student, Pro, Pro+, Business, or Enterprise** plan
- [ ] A computer running **macOS, Linux, or Windows**
- [ ] [Git installed][install-git] on your computer

> [!TIP]
> No paid plan? Verified students can get GitHub Copilot for free through [GitHub Education][callout-student-plan-education]. The **Copilot Student** plan includes the agent, MCP, code review, and Copilot CLI features this workshop uses — so you can complete every harness with it.

> [!NOTE]
> Because the Copilot app runs on your own machine rather than in a codespace, [the prerequisites exercise][ex0] walks you through installing Node.js and creating your copy of the project before you install the app.

> [!NOTE]
> If you are using Copilot Business or Copilot Enterprise, your administrator must enable the **Copilot CLI** policy before you can use the app.

## Get Started

**[Start with the prerequisites →][ex0]**

[ex0]: /learning-hub/copilot-workshops/app/0-prerequisites/
[ex1]: /learning-hub/copilot-workshops/app/1-install-copilot-app/
[ex2]: /learning-hub/copilot-workshops/app/2-add-star-rating/
[ex3]: /learning-hub/copilot-workshops/app/3-agent-modes/
[ex4]: /learning-hub/copilot-workshops/app/4-custom-instructions/
[ex5]: /learning-hub/copilot-workshops/app/5-agent-skills/
[ex6]: /learning-hub/copilot-workshops/app/6-mcp-playwright/
[ex7]: /learning-hub/copilot-workshops/app/7-qa-agent/
[ex8]: /learning-hub/copilot-workshops/app/8-create-pull-request/
[ex9]: /learning-hub/copilot-workshops/app/9-canvases/
[ex10]: /learning-hub/copilot-workshops/app/10-review/
[install-git]: https://github.com/git-guides/install-git
[callout-student-plan-education]: https://github.com/education/students
