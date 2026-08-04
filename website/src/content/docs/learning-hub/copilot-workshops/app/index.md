---
title: "GitHub Copilot app"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

The **[GitHub Copilot app](https://docs.github.com/copilot/concepts/agents/github-copilot-app)** is a desktop application built on Copilot CLI that brings agent-driven development into a single, focused workspace. It adds parallel agent sessions, switchable session modes, shared canvases, and native GitHub issue and pull request management — including **Agent Merge**, which shepherds a pull request through rebases, review feedback, CI fixes, and merge.

Across these lessons you'll install the app and set up your project, then get oriented in the app's workspace and the backlog the template seeded for you. You'll start with a small change — adding a star rating — then add a custom instructions standard from an issue, build a filtering feature in an isolated agent session, and verify it with a reusable skill. You'll add the Playwright MCP server to explore the feature in a real browser, then climb a ladder of merge automation that ends with **Agent Merge** landing your pull request. Finally you'll collaborate on a shared canvas and automate recurring work — a complete loop from idea to merged feature.

## Lessons

| Lesson | Topic | Description |
|--------|-------|-------------|
| [0. Prerequisites][ex0] | Setup | Install Node.js and create your copy of the Tailspin Toys project |
| [1. Install the Copilot app][ex1] | Setup | Install the app, connect your project, and get oriented in the workspace |
| [2. Running your first agent session][ex2] | First change | Start a session and ship a small change as your first pull request |
| [3. Guiding Copilot with custom instructions][ex3] | Context | Add a documentation standard from an issue and merge it |
| [4. Building a feature with Autopilot][ex4] | Core Feature | Use Plan and Autopilot to build filtering, then verify it with a skill |
| [5. Testing with Playwright MCP][ex5] | External Tools | Add the Playwright MCP server and explore your feature in a browser |
| [6. Merging with Agent Merge][ex6] | Merge | Let Agent Merge fix and land your filtering pull request |
| [7. Planning with canvases][ex7] | Collaboration | Create a shared canvas to plan and track your work |
| [8. Review and next steps][ex8] | Summary | Automate recurring tasks and explore what's next |

## Prerequisites

Before attending this workshop, please ensure you have:

- [ ] A GitHub account with an active **Copilot Student, Pro, Pro+, Business, or Enterprise** plan
- [ ] A computer running **macOS, Linux, or Windows**
- [ ] [Git installed][install-git] on your computer

> [!TIP]
> No paid plan? Verified students can get GitHub Copilot for free through [GitHub Education][callout-student-plan-education]. The **Copilot Student** plan includes the agent, MCP, code review, and Copilot CLI features this workshop uses — so you can complete every harness with it.

> [!NOTE]
> Because the Copilot app runs on your own machine rather than in a codespace, [Lesson 0][ex0] walks you through installing Node.js and creating your copy of the project before you install the app.

> [!NOTE]
> If you are using Copilot Business or Copilot Enterprise, your administrator must enable the **Copilot CLI** policy before you can use the app.

## Get Started

**[Start with Lesson 0: Prerequisites →][ex0]**

[ex0]: /learning-hub/copilot-workshops/app/0-prerequisites/
[ex1]: /learning-hub/copilot-workshops/app/1-install-copilot-app/
[ex2]: /learning-hub/copilot-workshops/app/2-add-star-rating/
[ex3]: /learning-hub/copilot-workshops/app/3-custom-instructions/
[ex4]: /learning-hub/copilot-workshops/app/4-build-filtering/
[ex5]: /learning-hub/copilot-workshops/app/5-mcp-playwright/
[ex6]: /learning-hub/copilot-workshops/app/6-agent-merge/
[ex7]: /learning-hub/copilot-workshops/app/7-canvases/
[ex8]: /learning-hub/copilot-workshops/app/8-review/
[install-git]: https://github.com/git-guides/install-git
[callout-student-plan-education]: https://github.com/education/students
