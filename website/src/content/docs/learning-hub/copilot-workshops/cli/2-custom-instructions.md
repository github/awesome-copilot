---
title: "Exercise 2 - Custom instructions (Copilot CLI)"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

[← Previous lesson: Installing Copilot CLI][previous-lesson] · [Next lesson: Generating code with CLI →][next-lesson]

Context is key when working with generative AI. If a task needs to be done a particular way — or there's background information Copilot should know — you want to make sure that context is available. There are several tools available to you to help Copilot, which we'll explore throughout this workshop. We're going to start with [instruction files][instruction-files], which are typically focused on how the code itself should be structured. This helps Copilot understand not just *what* code you want but *how* it should be structured.

In this exercise, you will:

- explore how project-specific context, coding guidelines, and documentation standards reach Copilot through repository custom instructions and path-scoped instruction files,
- generate the first data slice for filtering (a publishers helper) with the *current* instructions in place,
- add a new repository-wide standard to `.github/copilot-instructions.md`,
- run a follow-up prompt and watch the regenerated code adopt the new standard,
- commit the instruction updates and helper so the next exercise can build on them.

> [!CAUTION]
> Generated code may diverge from some of the standards you set. Copilot is non-deterministic. The goal is to see the *trend* in behavior change after updating the instructions, not to match output character-for-character.

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
## Create a branch

You'll be making code changes, so create a branch to work in.

1. From your codespace terminal, create and switch to a new branch:

   ```bash
   git checkout -b update-custom-instructions
   ```

2. Confirm Copilot CLI is installed and authenticated:

   ```bash
   copilot --version
   ```

   If the command isn't found or you haven't logged in, return to [Exercise 1 - Installing GitHub Copilot CLI](/learning-hub/copilot-workshops/cli/1-install-copilot-cli/).

## Use Copilot CLI *before* updating the instructions

To see the impact of custom instructions, start by generating code with the current instructions in place. Later, you'll update the file and run a follow-up prompt.

> [!CAUTION]
> `--yolo` enables full automatic permissions (`--allow-all-tools`, `--allow-all-paths`, and `--allow-all-urls`). Use it only in an isolated environment like a Codespace or VM, and never alias it as your default for day-to-day development. See [Allowing and denying tool use][allow-all-warning] for details.

Running Copilot CLI from the **repository root** ensures it picks up `.github/copilot-instructions.md` automatically. `--enable-all-github-mcp-tools` turns on the read/write GitHub MCP tools so Copilot can read your backlog and open pull requests later in the workshop.

1. Return to your codespace. If you closed it, navigate to your repository on GitHub.com, select **Code** > **Codespaces**, then reopen your existing codespace.
2. Return to your open Copilot CLI session. If the terminal is closed or you exited Copilot CLI, open a terminal by selecting <kbd>Ctrl</kbd>+<kbd>\`</kbd>, then start it from the repository root by running `copilot --yolo --enable-all-github-mcp-tools`. Trust the project folder if prompted, then run `/models` and select **Auto**.
3. At the Copilot CLI prompt, ask it to generate the publishers helper that the filtering UI will use:

   ```plaintext
   Create a new data-access helper at src/lib/publishers.ts to return a list of all publishers. It should return the name and id for all publishers. Do not run the tests yet.
   ```

4. Copilot CLI will explore the project, propose a plan, and write the file in this `--yolo` session. Monitor the changes in your terminal output, then review in your editor.
5. Open the generated `src/lib/publishers.ts` in your editor.
6. Notice the helper is a typed function that takes a `db` client as its first argument and returns a typed array of publishers — that's coming from the data-layer conventions in `.github/instructions/drizzle.instructions.md` (which applies to `src/lib/*.ts`).
7. Notice the generated code **is missing** TSDoc doc comments and a file-level comment header.

> [!CAUTION]
> Copilot is probabilistic — there's a chance it'll add doc comments even without being told. If that happens, that's fine; the *consistency* improvement after the instruction update is still the takeaway.

## Add a new repository standard

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
## Re-run the prompt and observe the change

Now that the instructions have a doc comment rule, ask Copilot CLI to update the publishers file you just generated. The same standards directive will steer the rewrite.

1. Send `/clear` in your Copilot CLI session to start with a clean conversation.
2. Send the following prompt:

   ```plaintext
   Update src/lib/publishers.ts to follow the latest documentation conventions in .github/copilot-instructions.md.
   ```

3. Let the edit complete, then reopen `src/lib/publishers.ts`.
4. Notice that the file now opens with a comment block similar to:

   ```typescript
   /**
    * Publisher data-access helpers for the Tailspin Toys Crowd Funding platform.
    * Provides functions to retrieve publisher information from the database.
    */
   ```

5. Notice that the generated function now includes a TSDoc comment similar to:

   ```typescript
   /**
    * Returns a list of all publishers with their id and name.
    *
    * @param db - The Drizzle database client.
    * @returns A promise that resolves to an array of publisher objects.
    */
   ```

6. Keep this updated file in place. It's the first data slice you'll build on in the next exercise.

## Commit and push this first filtering slice

1. In your terminal, verify the changed files:

   ```bash
   git status
   ```

2. Stage the instruction update and the helper:

   ```bash
   git add .github/copilot-instructions.md src/lib/publishers.ts
   ```

3. Commit the changes:

   ```bash
   git commit -m "Add doc comment standards and publishers helper foundation"
   ```

4. Push the branch:

   ```bash
   git push -u origin update-custom-instructions
   ```

## Summary and next steps

You explored how Copilot picks up context from instruction files in this project, then used Copilot CLI to:

- generate a publishers data-access helper foundation for filtering with the *existing* instructions,
- add a new repository-wide standard to `.github/copilot-instructions.md`,
- run a follow-up prompt and watch the regenerated code adopt the new standard,
- commit and push both the instructions update and the helper foundation.

Next, you'll apply these instructions while implementing backlog work in [the generating-code exercise][next-lesson].

## Resources

- [Instruction files for GitHub Copilot customization][instruction-files]
- [Best practices for creating custom instructions][instructions-best-practices]
- [5 tips for writing better custom instructions for Copilot][copilot-instructions-five-tips]
- [Awesome Copilot — a collection of instruction files and other resources][awesome-copilot]

[previous-lesson]: /learning-hub/copilot-workshops/cli/1-install-copilot-cli/
[next-lesson]: /learning-hub/copilot-workshops/cli/3-generating-code/
[instruction-files]: https://docs.github.com/copilot/customizing-copilot/about-customizing-github-copilot-chat-responses
[instructions-best-practices]: https://docs.github.com/enterprise-cloud@latest/copilot/using-github-copilot/coding-agent/best-practices-for-using-copilot-to-work-on-tasks#adding-custom-instructions-to-your-repository
[copilot-instructions-five-tips]: https://github.blog/ai-and-ml/github-copilot/5-tips-for-writing-better-custom-instructions-for-copilot/
[allow-all-warning]: https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/allowing-tools
[ui-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/ui.instructions.md
[astro-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/astro.instructions.md
[awesome-copilot]: https://github.com/github/awesome-copilot
[custom-instructions-support]: https://docs.github.com/copilot/reference/custom-instructions-support
