---
title: '02 · Building an AI Infrastructure Foundation'
description: 'Build reusable AI infrastructure — custom instructions, a custom agent, and contribution standards — for a brownfield repo.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-26
---

# Module 2 — Building an AI infrastructure foundation

| [← Previous: Working with Copilot CLI][previous-lesson] | [Next: Enhancing the test suite with remote and delegation →][next-lesson] |
|:--|--:|

Every time you start a fresh Copilot CLI session, the agent only sees your raw files in the working directory. Without shared instructions, guidelines and codified conventions, you have to keep re-explaining your stacks and re-establishing your coding standards. That repetition makes sessions much slower and produces inconsistent output, so in this module, we build the **AI infrastructure** that makes future interactions with Copilot faster and more accurate.

## What you will learn

By the end of this module you will be able to:

- Generate baseline & path-scoped instructions for Copilot
- Understand where Copilot CLI looks for and applies different customizations including instructions, skills and agents 
- Create a custom agent with a clear persona, scope and well-defined rules of engagement
- Bootstrap contribution standards to be observed by every AI-influenced change

## Scenario

Contoso has a set of best practices that need to be followed in every code change: stack-specific conventions, accessibility requirements (the organization is moving toward WCAG 2.2 AA), and a hard rule that every AI-generated change must flow through an issue and a pull request - no direct commits to main.

> [!NOTE]
> Starting state: your fork has the documentation updates from [Module 1][previous-lesson] merged. If you're jumping in here, check out the catch-up branch that holds them:
>
> ```bash
> git checkout start-of-module-02
> ```

## Add custom instructions to Copilot CLI

Previously, you watched Copilot rediscover AssetTrack from scratch and updated the docs. Now you'll codify what Copilot needs to know about *how* the team writes code in general and on each stack.

Having proper documentation helps Copilot *understand* your project. **Custom instructions** go further by telling Copilot *how to behave* when working in your project. With every Copilot interaction, you want your coding standards, style and business rules to be automatically reflected in the agent's responses. Custom instructions are the persistent, version-controlled files that encode those standards and shape every response the agent generates.

### Where Copilot CLI looks for instructions

Copilot CLI loads instructions from several sources and combines them. The sources are:

- `.github/copilot-instructions.md` - for rules that apply to every session within the context of the repository
- `.github/instructions/**/*.instructions.md` - for rules that apply to a specific area of the codebase following a defined path pattern
- `~/.copilot/copilot-instructions.md` - for user-level rules that apply to every Copilot CLI session across repositories on your machine
- `AGENTS.md`, and its sibling files like `CLAUDE.md` / `GEMINI.md` - for agent-level instructions that apply whenever the corresponding agent is active

This layering is intentional as they all serve different purposes, but can also result in conflicting rules if not managed carefully. Copilot combines instructions when all sources are present but given the non-deterministic nature of language models, its choice of instruction mix might not always be predictable.

Knowing where the agent looks for instructions is the first debugging step when you notice Copilot ignoring rules. Run `/instructions` to see exactly what's loaded in the current session and update your files accordingly.

### Agent-generated baseline instructions

For brownfield projects like AssetTrack, you can use the agent itself to generate a baseline `copilot-instructions.md` that captures the conventions and patterns it observes in the code. The built-in `/init` command asks Copilot to scan the repository, inspect code, build files and existing docs, then produces a baseline set of instructions.

> [!CAUTION]
> The output of `/init` is a **starting point**, not a finished artifact. It will miss nuances, include things that are too vague to be useful and sometimes get conventions wrong, depending on the quality of the codebase. Always review and refine the generated file.

### Path-scoped instructions

Repository-wide instructions cover broad rules that apply everywhere. But AssetTrack runs across four stacks: 
- Java for the workforce, audit and auth services, 
- Astro/TypeScript with React islands for the frontend, 
- .NET for the asset service,
- Python for reporting and notification services,

and each stack has rules the others don't share. For example, Astro components would need accessibility rules that don't make sense to the backend, which would in turn need SQL-safety rules. FastAPI services are to follow modern-Python conventions that aren't relevant in sessions targeting .NET context. 

Path-scoped instruction files let you apply targeted rules by specifying an `applyTo` glob pattern that matches the relevant files. This way you can have a clean separation of concerns, applying the right rules to each stack without cluttering the global instructions.

## Exercise 1: Create instruction files for AssetTrack

Let's start by capturing existing conventions and patterns in the codebase in a baseline instructions file, then adding path-scoped instruction files for each stack.  

### Generate the baseline instructions

1. Return to your codespace. If you closed it, navigate to your repository on GitHub.com, select **Code** > **Codespaces**, then reopen your existing codespace.
2. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and select **Chat: New Copilot CLI Session to the side** 
3. If prompted, trust the project folder by selecting **Yes, and remember this folder for future sessions**.
4. Run `/models`, select **Auto** from the list and **Enter**
5. Run `/init`. 
    
    Copilot scans the repository and generates a `.github/copilot-instructions.md` file. You'll see the agent reviewing available docs, reading through the code, it may also try to run build and test-related commands, then draft the instructions file based on its findings.

6. Open `.github/copilot-instructions.md` and review the generated content. What you need to be asking yourself as you review is *"If Copilot followed these instructions exactly, would it produce better, acceptable code?"* If the answer is "no" or "maybe", revise the instructions removing anything that isn't helpful or accurate, clarify what is too vague and add any important rules or conventions the agent missed. 

> [!TIP]
> Re-run `/init` when the instructions start drifting significantly from reality either after a major restructure, after adopting a new framework or when Copilot consistently produces code that violates your current conventions. You can also run it frequently as a diagnostic tool to see what Copilot *thinks* your conventions are and if you are not happy with the "perceptions", treat that as a sign you need to improve on your code quality and consistency.

### Create scoped instructions

Let's start with our Java parts of the codebase. 

1. Create a new file - `.github/instructions/java.instructions.md`, and paste in the following content:

    ```markdown
    ---
    applyTo: "services/**/*.java"
    description: This file describes instructions for Java code style and best practices for the project.
    ---

    - Follow standard naming conventions — Classes in PascalCase, methods/variables in camelCase, constants in UPPER_SNAKE_CASE, packages in lowercase. 
    - Program to interfaces, not implementations — Declare variables/parameters using the most general interface type (e.g., List<String> list = new ArrayList<>()) to enable flexibility and loose coupling. 
    - Favor composition over inheritance — Prefer delegating to component objects rather than extending classes; inheritance breaks encapsulation and creates fragile hierarchies. 
    - Handle exceptions properly — Never swallow exceptions with empty catch blocks, use checked exceptions for recoverable conditions and runtime exceptions for programming errors, and always clean up resources with try-with-resources.
    - Adhere to SOLID principles — Especially Single Responsibility (one reason to change per class) and Dependency Inversion (depend on abstractions); foundational for maintainable OO design. 
    - Make classes immutable whenever possible — Mark fields private final, avoid setters, and don't expose internal mutable state; immutable objects are inherently thread-safe and easier to reason about. 
    ```

    The instruction file has 2 distinct sections: the **YAML frontmatter** at the top, which sets the `applyTo` glob to match all Java files under `services/` and adds a description, and the **body** - which lists the instructions for Java code in AssetTrack.


2. Spot-check the scoped instructions with a stack-specific prompt:

    ```text
    Refactor the notification logic in AssignmentService into a separate component that properly handles failures instead of swallowing exceptions. Show me the new interface, implementation class and how you'd update AssignmentService to use it - don't apply it
    ```

    Notice the tool call to **Read** on `java.instructions.md` before the agent writes its proposal and the code should reflect the specific rules you set for Java code.

    We'll take a different approach for the Astro/React instructions, where instead of manually authoring the rules, you'll ask Copilot to generate them.

3. In the Copilot CLI, run `/new` to reset the session context, then prompt Copilot to create the Astro instructions file:

    ```text
    Generate a path-specific instruction file for only the Astro + TypeScript React frontend portions of this mixed-language microservices application. Use proper `.instructions.md` format with YAML frontmatter - `applyTo` single glob expression targeting frontend Astro/TS/TSX files only, and accurate description and should be optimized for high quality future code updates. Define concise engineering standards for Astro + React architecture, strict TypeScript, accessibility, styling consistency, performant data fetching, error/loading states, testing, maintainability, minimal dependencies, clean incremental changes etc.

    ```

    Your checklist for this step is to:

    - [ ] Ensure the generated file has valid YAML frontmatter with an `applyTo` glob that matches only the Astro/React files (for example `services/web/src/**/*.{astro,ts,tsx}`)
    - [ ] Ensure the instructions are specific, actionable and enforceable - not just vague or aspirational. (Make necessary edits as you see fit)

4. Optionally create two more instruction files for the .NET and FastAPI services, or any other areas of the codebase you want to target with specific rules.


5. Confirm all instruction files are loaded by running `/instructions`. You should see your instruction files with the option to enable or disable each one. 

6. Create a new branch and commit the instruction files. Don't push yet:

    ```text
    Create a new branch called add-ai-infrastructure and commit the instruction files with a descriptive commit message.
    ```

## Custom agents in Copilot CLI

Instructions files apply *passively* and take effect for every session that touches the matched paths. Custom agents on the other hand, are configured **personas** that can be explicitly invoked when the workflow needs to take advantage of their specialized knowledge. In the Copilot CLI environment, you can either: -

- Run a custom agent as the default, or
- Go through the main agent, which interacts with custom agents following a hierarchical structure, recognizing them as subagents that have their own isolated loop and context window separate from its own.

Think of custom agents as specialized workers your main agent can offload scoped & focused tasks to and only expects the final output. In other words, if your main agent decides to invoke a custom agent, what it does in between is a "black box" to the main agent, and is not included in the main agent's context window.

When thinking about creating a custom agent, aim for a well-defined, recurring and narrowly-scoped task that benefits from domain-expert level behavior, a restricted toolset and strict rules of engagement. This design pattern goes a long way in preventing it from straying into areas it shouldn't be working on.

Custom agents live in `.github/agents/` (for repo-scoped) or `~/.copilot/agents/` (for user-scoped), and are invoked via `/agent`.

## Exercise 2: Create an Accessibility Expert custom agent 

Now let's add a reusable `Accessibility Expert` custom agent and use it against the frontend code. Instead of designing the agent from scratch, you'll reuse one from the Awesome GitHub Copilot repo, a community-curated collection of copilot customizations that are ready to drop in. 

1. Browse the [Awesome GitHub Copilot][awesome-copilot] website and in the search bar, type "accessibility" to find related customizations.

2. Select the **Agent** filter, and find the `Accessibility Expert - Agent`. Select it.

3. This previews the agent definition file that you can quickly review to confirm it fits your use case.

4. At the top of the preview page, select **Render** first, then **Copy** and move back to your codespace.

5. Create a new file - `.github/agents/accessibility-expert.agent.md` - and paste the copied content into it.

> [!NOTE]
> Tools and toolsets are updated frequently, so you might notice some of the tools mentioned in the agent definition file are no longer available or have changed names. If that's the case,  select **Configure Tools ...** right above the `tools: ...` definition in the agent file, and select the **Built-in** and **GitHub MCP** checkboxes. This will update the agent definition with the current tool names and you can always adjust the allowlist accordingly.
>
> Ensure you enable the GitHub tools for a later exercise in this module.

6. If you exited the previous Copilot CLI session, restart it or reset to a clean conversation with `/new`.

7. Confirm Copilot discovers the new agent with `/agent`. You should see `Accessibility Expert` in the list. Exit the agent menu for now with `Esc`.

### Use the agent to make accessibility improvements

1. Ask Copilot to work with the Accessibility Expert agent to produce an accessibility report for the Astro frontend with recommendations

    ```text
    Work with the the accessibility expert to review the Astro frontend code and produce an accessibility report with specific recommendations for improvements based on WCAG 2.2 AA standards.
    ```

    Notice that the main agent passes the task to the Accessibility Expert agent, which then finds the custom instructions for Astro/React you created earlier, tracks the relevant files and produces a report with specific, actionable recommendations that reference WCAG success criteria and specific selectors in the code.
    
    If the agent fails to reference the instructions you created, this creates an opportunity to improve its behavior by adding a rule in the agent definition file that explicitly instructs it to always check for relevant instruction files in the repository and apply them when working on tasks that match the scope.

2. We'll leave this session and come back to it at a later exercise in this module, but before you do, **run `/rename` to rename the session to "Accessibility Report"** so you can easily identify it later when you return to it.

3. Start a new session with `/new`, commit the agent file to `add-ai-infrastructure`, push and open a PR.

## Agent skills

Custom agents introduce *specialized personas*. **Agent skills** change what Copilot *knows* to do. A skill is a packaged capability, could include an instruction set, optional scripts and resources - that the agent can invoke **at runtime** when the task matches its trigger. Skills live in `.copilot/skills/` (for repo-scoped) or `~/.copilot/skills/` (for user-scoped) and in Copilot CLI, you use `/skills` to view and manage them.

The new AI infrastructure for Contoso is coming together nicely, but there's one more piece to add. Now that you have a baseline for how copilot should approach making updates locally, we want to bootstrap the contribution standards that should be followed to land these updates through channels that integrate with the team's existing workflows for enhanced collaboration, human-in-the-loop review and auditability.

We'll import a skill that encodes the standard contribution flow: file an issue following a standard template, create a branch from `main`, make and push changes, open a PR with the right template and link the issue. For the skill's output to be reviewable, the issue and PR templates need to exist first. When invoked, `make-repo-contribution` walks through the contribution flow as a unit instead of improvising it each time.

## Exercise 3: Import and use the `make-repo-contribution` skill

This last exercise guides you to install the `make-repo-contribution` skill and use it to land the changes so far.

1. Browse the [Awesome GitHub Copilot][awesome-copilot] website and in the search bar, type "contribution" to find related customizations.

2. Select the **Skill** filter and find the `Make Repo Contribution - Skill`. Select it.

3. A skill can be a single `SKILL.md` file or a collection of files with additional scripts and assets. At the top of the preview page, select **SKILL.md** to view the other files included in the skill. You should see the `SKILL.md` file, a `assets/issue-template.md` file and a `assets/pr-template.md` file.

4. Select **Download** to get the full skill package and move back to your codespace.

5. Create a new folder - `.github/skills/` and move the downloaded skill folder into it, so the structure looks like `.github/skills/make-repo-contribution/` with the three files inside.

6. Restart the Copilot CLI session with `/restart` to load the new skill.

7. Confirm the skill is loaded with `/skills list`, then exit the skills menu for now.

### Make a contribution with the skill

Let's bring it all together now. You'll use the `make-repo-contribution` skill to open a new issue for the recommendations from the report you generated with the Accessibility Expert agent, then implement the change and open a PR through the same skill.

1. In the CLI, run `/resume` and select the Accessibility Report session you created in Exercise 2.

2. Use `/agent` to switch to the Accessibility Expert agent, then run the following prompt:

    ```text
    The accessibility report you generated has some great recommendations. Pick one that you think would have a high impact but is not too complex to implement, create an issue then go ahead and implement it. Remember to follow the relevant custom instructions in the repo and when you're ready, commit and open a PR following the contribution standards we established.
    ```

    Observe as the agent works on the implementation and automatically invokes the `make-repo-contribution` skill when ready to land the change. The agent should first create an issue using the provided template, then commit the change, push to a new branch and open a PR linking the issue, all through the skill's workflow.

> [!NOTE]
> Compare what just happened to the manual push and PR you opened at the end of Exercise 2. The skill enforced the same steps with issue, branch, commit, PR, linked issue - but as a single, consistent unit. For Contoso, that means every AI-driven contribution follows the same auditable flow regardless of who (or what) triggered it.

3. Navigate to your repository on GitHub.com, open each PR, review the changes and merge both into `main`.

## Summary

Together these files form the **AI infrastructure** for AssetTrack. Every future Copilot CLI session and every exercise in the rest of this course benefits from the context you've established here. Instructions are durable, version-controlled, reviewable in pull requests and shareable across the entire team.

In this module, you learned:

- How to generate baseline instructions with `/init` 
- How to create path-scoped instruction files targeting specific stacks with relevant rules
- To import custom agents from Awesome Copilot, a community-curated repo of ready-to-use customizations - and how to use them

Next, you'll close the loop on accessibility with **Playwright tests** and offload the broader test backfill via `/remote` and `/delegate` in [Module 3][next-lesson].

## Resources

- [Using Copilot CLI][copilot-cli-docs]
- [Awesome GitHub Copilot - community-curated collection of Copilot customizations][awesome-copilot]
- [CLI Command reference][commands-reference]
- [Comparing GitHub Copilot CLI customization features][cli-customization-comparison]


| [← Previous: Working with Copilot CLI][previous-lesson] | [Next: Enhancing the test suite with remote and delegation →][next-lesson] |
|:--|--:|

[previous-lesson]: ../01-working-with-copilot-cli/
[next-lesson]: ../03-test-suite-remote-delegation/
[copilot-cli-docs]: https://docs.github.com/copilot/how-tos/copilot-cli
[awesome-copilot]: https://awesome-copilot.github.com/
[commands-reference]: https://docs.github.com/copilot/reference/copilot-cli-reference/cli-command-reference
[cli-customization-comparison]: https://docs.github.com/copilot/concepts/agents/copilot-cli/comparing-cli-features
