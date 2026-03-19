---
title: "Copilot CLI for Beginners"
description: "A beginner-friendly Learning Hub course that adapts the companion Copilot CLI curriculum into a practical path from setup to everyday terminal workflows."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-03-18
estimatedReadingTime: "8 minutes"
tags:
  - copilot-cli
  - beginners
  - course
relatedArticles:
  - ./copilot-cli-for-beginners-00-quick-start.md
tableOfContents: false
---

> **Learn GitHub Copilot CLI step by step without leaving the terminal.** This Learning Hub version keeps the structure of the original course, but reshapes it into a guided web experience with clearer practice cues, launch links, and chapter-by-chapter navigation.

![Copilot CLI for Beginners course banner](/images/learning-hub/copilot-cli-for-beginners/overview/copilot-banner.png)

GitHub Copilot CLI brings AI assistance directly into your shell. Instead of switching to a browser or IDE every time you need help, you can ask questions, inspect code, generate changes, review work, and automate tasks from the command line.

This course follows the companion repository [`github/copilot-cli-for-beginners`](https://github.com/github/copilot-cli-for-beginners), so you can either read here in the Learning Hub or launch the source repo and work through the original hands-on labs alongside each chapter.

## What you'll learn

By the end of this course, you should be able to:

- install and sign in to Copilot CLI confidently
- understand where Copilot CLI fits within the broader GitHub Copilot product family
- choose the right interaction style for a task: interactive, plan-first, or one-shot programmatic use
- guide Copilot CLI with repository context, follow-up prompts, and practical workflow checks
- apply Copilot CLI to code review, debugging, refactoring, automation, and integration scenarios

## Who this course is for

This course is a good fit if you:

- are new to Copilot CLI and want a structured place to start
- prefer keyboard-driven, terminal-first workflows
- want a practical course that stays beginner-friendly without losing the original hands-on flow
- learn best by copying prompts, testing them, and iterating on real files

## Before you start

You do **not** need prior Copilot CLI experience, but it helps to have:

- a GitHub account with Copilot access
- basic terminal comfort with commands like `cd`, `ls`, and running commands
- a safe repository or working folder you can explore
- the companion repo ready if you want to follow the full book-app exercises from the source course

## Understanding the GitHub Copilot family

The source course begins by grounding Copilot CLI in the wider Copilot ecosystem. That context matters because it helps you choose the right tool for the job.

| Product                         | Where it runs                                 | Best for                                                                                               |
| ------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **GitHub Copilot CLI**          | Your terminal                                 | Shell-native AI help, repo exploration, reviews, and coding workflows without leaving the command line |
| **GitHub Copilot in editors**   | VS Code, Visual Studio, JetBrains, and others | Chat, inline suggestions, agent mode, and editor-centric coding help                                   |
| **Copilot on GitHub.com**       | GitHub                                        | Repo-aware conversations, agent creation, and collaboration around code on the web                     |
| **GitHub Copilot coding agent** | GitHub                                        | Assigning work to agents and receiving pull requests back                                              |

This Learning Hub course focuses on **GitHub Copilot CLI** specifically: how to get productive in the terminal, how to keep your workflow grounded in real repos, and how to verify that the help you receive is actually useful.

## Course structure

The original README lays out the course as a chapter-based path from setup to more advanced workflows. This web version keeps that structure intact.

![Copilot CLI learning path overview](/images/learning-hub/copilot-cli-for-beginners/overview/learning-path.png)

| Chapter | Focus                                                                                             | What you'll do                                                                           |
| ------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 00      | [Quick Start](../copilot-cli-for-beginners-00-quick-start/)                                       | Install Copilot CLI, sign in, and verify your environment                                |
| 01      | [Setup and First Steps](../copilot-cli-for-beginners-01-setup-and-first-steps/)                   | Experience your first wins, learn the three main modes, and practice follow-up prompting |
| 02      | [Context and Conversations](../copilot-cli-for-beginners-02-context-and-conversations/)           | Work with files, folders, and multi-turn repo-aware conversations                        |
| 03      | [Development Workflows](../copilot-cli-for-beginners-03-development-workflows/)                   | Apply Copilot CLI to reviews, debugging, tests, and everyday coding tasks                |
| 04      | [Agents and Custom Instructions](../copilot-cli-for-beginners-04-agents-and-custom-instructions/) | Customize how Copilot works for your team and workflow                                   |
| 05      | [Skills](../copilot-cli-for-beginners-05-skills/)                                                 | Package reusable behaviors and specialized capabilities                                  |
| 06      | [MCP Servers](../copilot-cli-for-beginners-06-mcp-servers/)                                       | Connect Copilot CLI to external systems like GitHub, APIs, and databases                 |
| 07      | [Putting It All Together](../copilot-cli-for-beginners-07-putting-it-all-together/)               | Combine the building blocks into fuller, end-to-end workflows                            |

## How this course works

Each chapter follows the same teaching pattern from the source material:

1. **Core idea first** so you understand what the feature is for
2. **Hands-on examples** you can copy into a terminal or session
3. **Practice or assignment tasks** that push you past passive reading
4. **A next-step chapter link** so the course still feels like a guided path

> **Reading note:** When you see lines that start with `>` in code blocks, those are prompts typed inside a `copilot` session. Plain shell commands run in your terminal outside the Copilot prompt.

## Choose how you'll follow along

If you want the richest experience, use the companion repository while reading these pages:

| I want to...                            | Use this                                                                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Browse the original course              | [github/copilot-cli-for-beginners](https://github.com/github/copilot-cli-for-beginners)                                                                                        |
| Launch instantly in a cloud environment | [Open the repo in Codespaces](https://codespaces.new/github/copilot-cli-for-beginners?hide_repo_select=true&ref=main&quickstart=true)                                          |
| Work locally                            | `git clone https://github.com/github/copilot-cli-for-beginners.git`                                                                                                            |
| Compare with the source course map      | [Original README](https://github.com/github/copilot-cli-for-beginners/blob/main/README.md)                                                                                     |
| Keep the official docs nearby           | [Copilot CLI docs](https://docs.github.com/en/copilot/how-tos/copilot-cli) and the [CLI command reference](https://docs.github.com/en/copilot/reference/cli-command-reference) |

<aside class="repo-launch-cta" aria-label="Companion repository launch options">
  <div class="repo-launch-cta__inner">
    <p class="repo-launch-cta__eyebrow">Companion repo launch pad</p>
    <h2 class="repo-launch-cta__title">Jump from the Learning Hub into the hands-on repo</h2>
    <p class="repo-launch-cta__description">Use the companion repository when you want the original lab flow, a fork you can experiment in, or a ready-made Codespaces environment that matches the source course closely.</p>
    <div class="repo-launch-cta__actions">
      <a href="https://codespaces.new/github/copilot-cli-for-beginners?hide_repo_select=true&ref=main&quickstart=true" class="btn btn-primary" target="_blank" rel="noopener">Open in Codespaces</a>
      <a href="https://github.com/github/copilot-cli-for-beginners" class="btn btn-outline" target="_blank" rel="noopener">View companion repo</a>
      <a href="https://docs.github.com/en/copilot/how-tos/copilot-cli" class="btn btn-outline" target="_blank" rel="noopener">Read official CLI docs</a>
    </div>
    <div class="repo-launch-cta__grid">
      <div class="repo-launch-cta__card">
        <h3>Fork before you experiment</h3>
        <p>Start in <a href="https://github.com/github/copilot-cli-for-beginners" target="_blank" rel="noopener">the public repo</a>, then fork it when you want your own branches, history, or Codespace.</p>
      </div>
      <div class="repo-launch-cta__card">
        <h3>Open the original course map</h3>
        <p>The <a href="https://github.com/github/copilot-cli-for-beginners/blob/main/README.md" target="_blank" rel="noopener">source README</a> is the fastest way to compare this web version with the original chapter flow.</p>
      </div>
      <div class="repo-launch-cta__card">
        <h3>Clone locally</h3>
        <p>If you prefer your own editor and terminal, clone your fork locally after you create it.</p>
        <code class="repo-launch-cta__code">git clone https://github.com/YOUR-USERNAME/copilot-cli-for-beginners.git</code>
      </div>
      <div class="repo-launch-cta__card">
        <h3>Keep the docs nearby</h3>
        <ul class="repo-launch-cta__card-links">
          <li><a href="https://docs.github.com/en/copilot/how-tos/copilot-cli" target="_blank" rel="noopener">Official Copilot CLI docs</a></li>
          <li><a href="https://docs.github.com/en/copilot/reference/cli-command-reference" target="_blank" rel="noopener">CLI command reference</a></li>
        </ul>
      </div>
    </div>
  </div>
</aside>

## Suggested pace

If you are brand new, the first three chapters are enough to make Copilot CLI feel useful quickly. A practical beginner loop looks like this:

1. start a session
2. ask a focused question
3. provide the right file or repo context
4. review the result instead of blindly accepting it
5. iterate, verify, or escalate to a more capable workflow

## Getting help while you learn

- **Need installation help?** Keep [the getting started guide](https://docs.github.com/en/copilot/how-tos/copilot-cli/cli-getting-started) open while you work through Chapter 00.
- **Need command reminders?** Use the [CLI command reference](https://docs.github.com/en/copilot/reference/cli-command-reference).
- **Want the unadapted lesson flow?** Jump back to the [source course README](https://github.com/github/copilot-cli-for-beginners/blob/main/README.md).
