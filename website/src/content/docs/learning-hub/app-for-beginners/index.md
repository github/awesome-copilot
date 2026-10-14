---
title: 'GitHub Copilot app for Beginners'
description: 'Learn to direct coding agents in the desktop app through eight chapters with a shared React sample.'
authors:
  - GitHub, Inc.
  - Dan Wahlin
lastUpdated: 2026-10-04
tags:
  - workshop
  - copilot-app
  - desktop
---

![GitHub Copilot app for Beginners](/images/learning-hub/copilot-app-for-beginners/overview/github-copilot-app-for-beginners.webp)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/github/copilot-app-for-beginners/blob/main/LICENSE)&ensp;
[![GitHub Copilot app documentation](https://img.shields.io/badge/GitHub-Copilot_App_Docs-00a3ee?style=flat-square&logo=github)](https://docs.github.com/en/copilot/concepts/agents/github-copilot-app)&ensp;
[![Course level](https://img.shields.io/badge/Level-Beginner-success?style=flat-square)](#target-audience)

🎯 [What You'll Learn](#what-youll-learn) &ensp; 👥 [Target Audience](#target-audience) &ensp; 🤖 [Copilot Family](#understanding-the-github-copilot-family) &ensp; 📚 [Course Structure](#course-structure)

<a id="github-copilot-app-for-beginners"></a>
> Learn to direct and orchestrate AI coding agents from a single desktop app.

The GitHub Copilot app is a desktop control center for working with coding agents, giving you one place to direct, observe, and validate their work. Instead of simply asking AI for code, you can give agents a goal, provide the right context, and let them plan and take action while you stay in control of the work.

The app brings sessions, plans, code changes, tests, browser previews, AI chats, issues, pull requests, and more into one place, making it easier to direct agentic work and review the results without constantly switching between tools.

Throughout this course, you'll learn to treat Copilot app as a place to guide, review, and validate work, not as a magic code button. You'll practice providing effective context, choosing the right session mode, reviewing evidence, and deciding when automation makes sense and when you should stay more closely involved.

![GitHub Copilot app](/images/learning-hub/copilot-app-for-beginners/overview/app-github-copilot-app.webp)

<a id="what-youll-learn"></a>

## 🎯 What You'll Learn

By the end of the course, you'll be able to:

- Install, sign in, and set up the GitHub Copilot app
- Start sessions from prompts, branches, and pull requests, and attach issues as context
- Explain Interactive, Plan, and Autopilot modes
- Use worktree-backed sessions without colliding with your main branch
- Attach and manage agent context
- Review diffs, run tests, preview a web app, and validate changes
- Use the **Issues** and **Pull requests** views for issues, PRs, review comments, and failing checks
- Understand where settings, instructions, skills, custom agents, MCP servers, plugins, canvases, and automations fit

The main sample used throughout the course can be found at:

```text
samples/book-app-web
```

## Target Audience

This course is designed for:

- Developers who want to orchestrate, guide, and review agent-driven coding work
- Students and self-taught learners who want a guided path
- Teams evaluating how to keep humans in control while agents do more work
- Copilot CLI or IDE Copilot users who want to understand where the desktop app fits

No agentic development experience is required. Basic GitHub, Git, and software development familiarity will help. The sample app is a small React/Vite project, so basic npm command familiarity helps in the development chapters. Use the current [Node.js LTS](https://nodejs.org) for `samples/book-app-web`.

The GitHub Copilot app works with a Copilot plan or with your own model provider.

<a id="understanding-the-github-copilot-family"></a>

## 🤖 Understanding the GitHub Copilot Family

| Product | Where it runs | Best for |
|---|---|---|
| GitHub Copilot app (this course) | Desktop app | Supervising multi-agent sessions, plans, diffs, browser validation, PRs, canvases, and automations |
| GitHub Copilot in IDEs | VS Code, Visual Studio, JetBrains, and other editors | Agents, inline suggestions, chat, and editor-centered coding |
| GitHub Copilot CLI | Terminal | Terminal-native agent work and command-line workflows |
| Copilot cloud agent | GitHub-hosted environment | Background work on issues and cloud sessions when enabled |

![Where the GitHub Copilot app fits across Copilot surfaces](/images/learning-hub/copilot-app-for-beginners/overview/copilot-family-comparison.webp)

This course focuses on the GitHub Copilot app. Along the way, you'll see how it connects to GitHub, local tools, browser previews, terminal output, and cloud capabilities when available.

<a id="course-structure"></a>

## 📚 Course Structure

| Chapter | Title | What learners do |
|:--:|---|---|
| 00 | [Setup](/learning-hub/app-for-beginners/00-setup/) | Prepare the course environment |
| 01 | [Tour the App](/learning-hub/app-for-beginners/01-tour-the-app/) | Learn why you'd use the app, then tour chats, project sessions, modes, models, and settings |
| 02 | [Sessions, Worktrees, and Context](/learning-hub/app-for-beginners/02-sessions-worktrees-context/) | Start isolated worktree sessions and use `@`, `#`, and `/` for context and commands |
| 03 | [Development and GitHub Workflows](/learning-hub/app-for-beginners/03-development-workflows/) | Review, debug, test, and preview a change, then move it through issues, PRs, review comments, and checks |
| 04 | [Skills and Custom Agents](/learning-hub/app-for-beginners/04-skills-custom-agents/) | Update a review skill, create a read-only custom agent, and validate one skill-guided improvement |
| 05 | [MCP Servers and Plugins](/learning-hub/app-for-beginners/05-mcp-plugins/) | Retrieve documentation through an MCP server and use a plugin's skill for a focused recommendation |
| 06 | [Canvases](/learning-hub/app-for-beginners/06-canvases/) | Try a community canvas, then use `/create-canvas` to build boards that keep the plan, progress, and validation evidence visible |
| 07 | [Automations](/learning-hub/app-for-beginners/07-automations/) | Create a manual PR review readiness report, schedule it, then learn about event triggers and cloud automations |

## 📖 How This Course Works

After the setup chapter, each chapter follows the same beginner-friendly pattern:

1. An introduction: why the topic matters
2. A recording-studio analogy ("From the Studio")
3. Core agent-development concepts
4. Hands-on exercises using `samples/book-app-web`
5. Key takeaways, an assignment (from Chapter 02 on), and source references

> [!NOTE]
> When a chapter shows a model response, remember that model output varies due to the non-deterministic nature of LLMs. Your app version, model, reasoning setting, repository context, and enabled tools can also change the structure of the response.

## References

- [GitHub Copilot app overview][about-app]
- [GitHub Copilot app videos][about-app-videos]
- [Getting started with the app][getting-started]
- [Working with sessions][agent-sessions]
- [Issues and pull requests][issues-prs]
- [Using automations][automations]
- [Working with canvas extensions][canvas-docs]
- [Customizing the GitHub Copilot app][customizing]
- [Public app repository][app-readme]
- [GitHub Copilot app changelog][ga-changelog]

## Appendices

- [Glossary](https://github.com/github/copilot-app-for-beginners/blob/main/GLOSSARY.md)
- [Git worktrees](https://github.com/github/copilot-app-for-beginners/blob/main/appendices/git-worktrees.md)
- [Training GitHub scenarios](https://github.com/github/copilot-app-for-beginners/blob/main/appendices/training-github-scenarios.md)
- [Troubleshooting reference](https://github.com/github/copilot-app-for-beginners/blob/main/appendices/troubleshooting-reference.md)
- [Book App Web sample](https://github.com/github/copilot-app-for-beginners/blob/main/samples/book-app-web/README.md)

## License

This project is licensed under the terms of the MIT open source license. Please refer to the [LICENSE](https://github.com/github/copilot-app-for-beginners/blob/main/LICENSE) file for the full terms.

[about-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[about-app-videos]: https://www.youtube.com/watch?v=LsA4vIX_3UY&list=PLNBWjViYXaIY
[getting-started]: https://docs.github.com/copilot/how-tos/github-copilot-app/getting-started
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests
[automations]: https://docs.github.com/copilot/how-tos/github-copilot-app/using-automations
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[customizing]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[app-readme]: https://github.com/github/app
[ga-changelog]: https://github.com/github/app/blob/main/changelog.md

Source: [github/copilot-app-for-beginners](https://github.com/github/copilot-app-for-beginners). Copyright GitHub, Inc. Used under the [MIT license](https://github.com/github/copilot-app-for-beginners/blob/main/LICENSE).
