---
title: "Exercise 1 - Custom instructions (Cloud agent)"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

[← Previous lesson: Prerequisites][previous-lesson] · [Next lesson: Copilot cloud agent →][next-lesson]

Context is key when working with generative AI. If a task needs to be done a particular way — or there's background information Copilot should know — you want to make sure that context is reachable. [Instruction files][instruction-files] are how you provide that guidance, so Copilot understands not just *what* you want it to do but *how* you want it done.

In this exercise, you will:

- explore how project-specific context, coding guidelines, and documentation standards reach Copilot through repository custom instructions and path-scoped instruction files,
- add a new repository-wide standard to `.github/copilot-instructions.md`.

> [!NOTE]
> Unlike the VS Code and CLI harnesses, you won't run a *before/after* prompt here — Copilot cloud agent works asynchronously on GitHub issues, so the impact is harder to demonstrate side-by-side in real time. You'll see your instruction file's influence later in this harness when you review the pull requests cloud agent produces.

## Instruction files

### Scenario

As any good dev shop, Tailspin Toys has a set of guidelines and requirements for development practices. These include:

- The data layer always needs unit tests.
- UI should be in dark mode and have a modern feel.
- Documentation should be added to code in the form of TSDoc doc comments.
- A block of comments should be added to the head of each file describing what the file does.

Through the use of instruction files you'll ensure Copilot has the right information to perform the tasks in alignment with the practices highlighted.

### Custom instructions

Custom instructions allow you to provide context and preferences to Copilot, so that it can better understand your coding style and requirements. This is a powerful feature that can help you steer Copilot to get more relevant suggestions and code snippets. You can specify your preferred coding conventions, libraries, and even the types of comments you like to include in your code. You can create instructions for your entire repository, or for specific types of files for task-level context.

There are two types of instructions files:

- `.github/copilot-instructions.md`, a single instruction file sent to Copilot for **every** request for the repository. This file should contain project-level information — context relevant for most chat or CLI requests sent to Copilot. This could include the tech stack being used, an overview of what's being built, best practices, and other global guidance.
- `.github/instructions/*.instructions.md` files can be created for specific tasks or file types. You can use them to provide guidelines for particular languages (like TypeScript or Astro), or for tasks like creating a UI component or a new set of unit tests.

> [!NOTE]
> When working in your IDE, instructions files are only used for code generation in Copilot Chat — not for code completions or next-edit suggestions.
>
> Copilot Chat, Copilot CLI and Copilot cloud agent use both repository-level and `*.instructions.md` files (with `applyTo` front matter) when generating code.
>
> Finally, Copilot [supports instructions files using other standards][custom-instructions-support], including AGENTS.md and CLAUDE.md files.

### Best practices for managing instructions files

A full conversation about creating instructions files is beyond the scope of the workshop. However, the examples provided in the sample project show a representative approach. At a high level:

- Keep instructions in `copilot-instructions.md` focused on project-level guidance, such as a description of what's being built, the structure of the project, and global coding standards.
- Use `*.instructions.md` files to provide specific instructions for file types (unit tests, Astro components, the data layer), or for specific tasks.
- Use natural language. Keep guidance clear. Provide examples of how code should (and shouldn't) look.

There isn't one specific way to create instructions files, just as there isn't one specific way to use AI. You will find through experimentation what works best for your project.

> [!TIP]
> Every project using GitHub Copilot should have a robust collection of instruction files. As you explore the ones in this project, you may notice there are files for numerous types of tasks, including [UI updates][ui-instructions] and [Astro][astro-instructions].
>
> Copilot can also help generate instruction files for you. Each surface exposes this differently (for example, **Configure Chat → Generate Agent Instructions** in VS Code, or `/init` in Copilot CLI) — the lesson for the surface you're on will call it out where it's relevant.
>
> Looking for templates or a starting point? Explore [awesome-copilot][awesome-copilot], a repository full of instruction files, custom agents, and other resources.

[ui-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/ui.instructions.md
[astro-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/astro.instructions.md
[awesome-copilot]: https://github.com/github/awesome-copilot
[custom-instructions-support]: https://docs.github.com/copilot/reference/custom-instructions-support
## Explore the custom instructions files in this project

Take a moment to read the instruction files this repository ships with — there's one core `copilot-instructions.md` and a collection of `*.instructions.md` files for various tasks. Open these in your editor or the GitHub web UI.

1. Open `.github/copilot-instructions.md`.
2. Explore the file, noting the brief description of the project plus sections such as **Agent notes**, **Code standards**, **Scripts**, and **Repository Structure**. Under **Code standards**, note the nested **GitHub Actions Workflows** guidance. These are applicable to any interactions you'd have with Copilot.
3. Open the `.github/instructions` folder and look around. Note there are instructions for Astro files, the Drizzle data layer, tests, and more.
4. Open `.github/instructions/unit-tests.instructions.md`. Note the `applyTo` field at the top — this sets a glob (relative to the repo root) that determines which files the instructions apply to. Here, any TypeScript test file (for example, one matching `**/*.test.ts`) will match.
5. Note the instructions specific to creating unit tests for this project.
6. Finally, open `.github/instructions/drizzle.instructions.md` and scroll to the bottom. Note the links to other instruction files (like `unit-tests.instructions.md`) and existing files in the project. This lets you break larger instruction sets into smaller, reusable files, and point Copilot at examples to follow when generating code. (Paths there are relative to the instruction file rather than the repo root.)

> [!NOTE]
> The **Code formatting requirements** section in `copilot-instructions.md` documents the project's coding standards, but it doesn't yet require in-code documentation. In the next steps, you'll add rules for TSDoc doc comments and file comment headers.
## Add a new repository standard

The next step is the one bit of editing you'll do here: add a project-wide rule that documentation should live in code as TSDoc doc comments and a file-level comment header. Cloud agent will pick this up when it works on issues you assign to it later in this harness.

Before you edit, set up a branch to work on (cloud agent will read your instructions from whatever branch the issue targets, but you'll commit your edits cleanly anyway):

1. From your codespace terminal, create and switch to a new branch:

   ```bash
   git checkout -b custom-instructions-cloud
   ```

As highlighted previously, `.github/copilot-instructions.md` is designed to provide project-level information to Copilot. Let's ensure repository coding standards are documented to improve code suggestions.

1. Re-open `.github/copilot-instructions.md`.
2. Locate the **Code formatting requirements** section, which should be near line 27. Note how it documents the project's coding standards — but it has no rule yet for in-code documentation, which is why the generated helper had no doc comments.
3. Add the following lines of markdown right below the existing standards to instruct Copilot to add file comment headers and TSDoc doc comments:

   ```markdown
   - Every exported function should have a TSDoc comment describing its purpose, parameters, and return value.
   - Before imports or any code, add a comment block to the file that explains its purpose.
   ```

4. Save `copilot-instructions.md`.

> [!TIP]
> As you saw in the previous lesson, instruction files can be created at the repository level (`.github/copilot-instructions.md`) for global guidance, or as `*.instructions.md` files for specific languages, file types, or tasks. The repository-level file is the right home for project-wide standards like the doc comment rule you just added.
## Commit, push, and merge your instruction update

Cloud agent reads instruction files from the branch the issue targets. When you assign an issue to Copilot in the next exercise, Copilot will branch from `main` — so your instruction changes must land on `main` for cloud agent to pick them up.

1. Stage and commit:

   ```bash
   git add .github/copilot-instructions.md
   git commit -m "Add doc comment and file-header standards to copilot instructions"
   ```

2. Push the branch:

   ```bash
   git push -u origin custom-instructions-cloud
   ```

3. Open a pull request from `custom-instructions-cloud` into `main` on github.com and merge it. Cloud agent will then read these instructions when it works on issues assigned in the next exercise.

> [!TIP]
> If you'd rather work on `main` directly for this workshop, you can skip the branch and commit straight to `main`. The branch step is here so the workshop mirrors the way you'd handle this on a real project.

## Summary and next steps

You explored how Copilot picks up context from instruction files in this project and added a new repository-wide standard to `.github/copilot-instructions.md`. You'll see that standard exercised in the pull requests cloud agent generates over the rest of this harness.

Next, you'll [assign your first issue to Copilot cloud agent][next-lesson].

## Resources

- [Instruction files for GitHub Copilot customization][instruction-files]
- [Best practices for creating custom instructions][instructions-best-practices]
- [5 tips for writing better custom instructions for Copilot][copilot-instructions-five-tips]
- [Awesome Copilot — a collection of instruction files and other resources][awesome-copilot]

[previous-lesson]: /learning-hub/copilot-workshops/cloud/0-prerequisites/
[next-lesson]: /learning-hub/copilot-workshops/cloud/2-cloud-agent/
[instruction-files]: https://docs.github.com/copilot/customizing-copilot/about-customizing-github-copilot-chat-responses
[instructions-best-practices]: https://docs.github.com/enterprise-cloud@latest/copilot/using-github-copilot/coding-agent/best-practices-for-using-copilot-to-work-on-tasks#adding-custom-instructions-to-your-repository
[copilot-instructions-five-tips]: https://github.blog/ai-and-ml/github-copilot/5-tips-for-writing-better-custom-instructions-for-copilot/
