---
title: "Advanced GitHub Copilot CLI"
description: "A source-faithful mirror of the companion Advanced GitHub Copilot CLI course."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-26
---

# Advanced GitHub Copilot CLI

> **✨ Take GitHub Copilot CLI beyond the basics and use it for real-world brownfield work.**

A hands-on course for experienced developers who are ready to use GitHub Copilot CLI as their primary agent surface — building reusable AI infrastructure (custom instructions, custom agents, agent skills, lifecycle hooks, LSP, and MCP integrations) on top of an existing multi-stack legacy codebase.

> ⚠️ **Note**: Because GitHub Copilot, and generative AI at large, is probabilistic rather than deterministic, the exact code, files changed, and outputs may vary between runs. You may notice slight differences between what's described here and what you see in your terminal. This is expected.

## Who this course is for

You're already comfortable with Copilot in an IDE and with the basics of Copilot CLI (running `copilot`, having a chat, accepting an edit). You want to:

- Use Copilot CLI as your primary agent surface, not as a fallback when you're away from your editor.
- Codify your team's conventions so Copilot follows them automatically.
- Build reusable skills and custom agents instead of re-prompting from scratch every session.
- Extend Copilot CLI with LSP, MCP, and lifecycle hooks, and distribute it all as a plugin your team installs in one shot.

This course assumes you are familiar with Copilot CLI, GitHub flow (issues and pull requests), and using VS Code or a similar IDE, and that you have written software in one or more languages.

> ✅ **You don't need every language.** The scenario app uses Python, Java, TypeScript, and C#, but familiarity with all of them is **not** required. One of the core tasks is asking Copilot about the project and how it works.

## The scenario

You've inherited **AssetTrack** at **Contoso Industries** — an internal asset-tracking application built across **Java**, **Astro/TypeScript with React islands**, **.NET**, and **FastAPI**. It's a brownfield app like many others: incomplete documentation, a long bug list, and the usual rough edges that come from years of accumulated tech decisions and tech debt.

You'll work the legacy app from [`github-samples/contoso-inventory`](https://github.com/github-samples/contoso-inventory) throughout the course, using Copilot CLI to understand it, extend it, and modernize it.

## 🎯 What You'll Learn

Across the seven core modules of this course (plus a prerequisites module and a wrap-up) you will:

- Understand what an AI agent is and how the Copilot CLI harness works under the hood, including how to control models, permissions, and modes — then use Copilot CLI to explore the repo and fill the obvious documentation gaps.
- Build the AI infrastructure for a brownfield repo: generate `copilot-instructions.md` with `/init`, add path-scoped `.instructions` files, author a custom agent for accessibility, and import the `make-repo-contribution` skill so every Copilot contribution flows through issues and PRs.
- Validate accessibility upgrades with Playwright tests, drive a session against a hosted environment with `/remote`, and offload bounded test work to the Copilot cloud agent with `/delegate`.
- Wire lifecycle **hooks** so tests, lint, and build feedback flow back to the agent automatically.
- Plan and execute a new feature (barcode support) with `/research`, `/plan`, rubber-duck critique, QA + accessibility custom agents, and `/fleet` parallel subagents.
- Give Copilot better signal with LSP servers across stacks, a documentation MCP server, and `/research` — then drive modernization with per-stack migrator agents.
- Scale your AI infrastructure: package it as a plugin, build a custom MCP server exposing AssetTrack's database safely, and reason about enterprise-tier custom agents.

## 📚 Course Structure

Each module builds on the ones before it, but every module's exercises include a starting-state note so you can drop in if you need to.

| Module | Title | What You'll Do |
| :----: | ----- | -------------- |
| 00 | [Prerequisites and environment setup](./00-prerequisites/) | Get your Codespaces-based environment ready |
| 01 | [Working with Copilot CLI](./01-working-with-copilot-cli/) | Learn the agent model, harness, models, and permissions |
| 02 | [Building an AI infrastructure foundation](./02-building-ai-infrastructure/) | Custom instructions, a custom agent, and contribution standards |
| 03 | [Enhancing the test suite with remote and delegation](./03-test-suite-remote-delegation/) | Playwright tests, `/remote`, and `/delegate` |
| 04 | [Shaping Copilot CLI's lifecycle with hooks](./04-lifecycle-hooks/) | Deterministic lifecycle hooks feeding the agent |
| 05 | [Adding a new feature: barcode support](./05-add-feature-barcode/) | `/research`, `/plan`, rubber-duck, `/fleet`, and a QA agent |
| 06 | [Modernizing apps with Copilot CLI](./06-modernize-apps/) | LSP and MCP signal plus per-stack migrator agents |
| 07 | [Managing Copilot's infrastructure](./07-manage-infrastructure/) | Custom MCP server, plugin packaging, and enterprise distribution |
| 08 | [Wrap-up and next steps](./08-wrap-up/) | Recap and where to go next |

Head to [Module 0: Prerequisites and environment setup](./00-prerequisites/) to get started.

## 🌿 Jumping into a module: catch-up branches

Each module assumes the cumulative output of every earlier module. If you skip ahead, check out the matching `start-of-module-N` catch-up branch on your AssetTrack repository before you start. Each branch holds the state a learner has after finishing every module before `N`, so `start-of-module-03` gives you everything the first two modules produce.

Create your AssetTrack repository from the [`github-samples/contoso-inventory`](https://github.com/github-samples/contoso-inventory) template with **Include all branches** selected so the catch-up branches come along, then check out the branch for the module you're starting (Module 3 shown):

```bash
git checkout start-of-module-03
```

Module 1 starts from the pristine fork, so it has no catch-up branch, and there is no branch after Module 7 because that module's work targets your fork only.

## 📋 GitHub Copilot CLI Command Reference

The **[GitHub Copilot CLI command reference](https://docs.github.com/copilot/reference/copilot-cli-reference/cli-command-reference)** helps you find commands and keyboard shortcuts to use Copilot CLI effectively.

## 🙋 Getting Help

- 🐛 **Found a bug?** [Open an issue](https://github.com/github-samples/advanced-copilot-cli/issues)
- 🤝 **Want to contribute?** See [`CONTRIBUTING.md`](https://github.com/github-samples/advanced-copilot-cli/blob/main/CONTRIBUTING.md)
- 📚 **Official Docs:** [GitHub Copilot CLI documentation](https://docs.github.com/copilot/concepts/agents/about-copilot-cli)

## License

This project is licensed under the terms of the MIT open source license. Please refer to the [LICENSE](https://github.com/github-samples/advanced-copilot-cli/blob/main/LICENSE) file for the full terms.
