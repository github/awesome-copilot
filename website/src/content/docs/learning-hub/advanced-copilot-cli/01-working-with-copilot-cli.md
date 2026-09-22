---
title: '01 · Working with Copilot CLI'
description: 'Understand the agent model, how the Copilot CLI harness works under the hood, and the everyday mechanics of models and permissions.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-26
---

# Module 1 — Working with Copilot CLI

| [← Previous: Prerequisites and environment setup][previous-lesson] | [Next: Building an AI infrastructure →][next-lesson] |
|:--|--:|

As we begin exploring deeper concepts in Copilot CLI, it helps to know how things work internally. This module grounds you in the agent model, walks through what's happening under the hood when Copilot is "thinking," and gets you comfortable with the core mechanics — picking a model and granting permissions.

## What you will learn

In this lesson, you will learn:

- how requests are processed by AI agents, including GitHub Copilot CLI.
- what an AI agent is and how it differs from chatting with an AI tool.
- how the Copilot CLI harness works under the hood.
- the core mechanics you'll use every day.

## Scenario

You're a developer who recently joined Contoso Industries and inherited **AssetTrack** — an internal asset-tracking application built on Java, Astro/TypeScript with React islands, .NET, and FastAPI. The app has incomplete documentation, many files, and a non-trivial bug list. Before changing anything, you want to understand what Copilot CLI is doing on your behalf, and develop the muscle memory for steering it.

> [!NOTE]
> Starting state: this is the first module, so there's no catch-up branch — work from the default branch of the AssetTrack fork you created in the [prerequisites][previous-lesson].

## Tech topics

This module covers two foundational concepts:

- **Understanding AI agents** — how requests are processed, what makes an agent different from a chat tool, and what context Copilot uses to ground its responses.
- **Copilot CLI under the hood** — the harness, the tool surface, and the permission model.

## Understanding AI agents

Any prompt to GitHub Copilot, including Copilot CLI, goes through a set of steps before a response is generated. While much of this happens behind the scenes, you have several inputs into this flow. Ensuring Copilot has the right context at the right time is key to success with Copilot. At a high level, it follows a general flow:

- Understand the prompt.
- Analyze the context.
- With the context, determine the user's intent.
- Generate a response.
- Apply filters.
- Send response to user.

Let's briefly walk through each of these.

> [!IMPORTANT]
> The flow highlighted above provides an overview of the approach Copilot will typically take. Internally, it may iterate between multiple steps as it works on providing the solution for the provided prompt. For example, it may generate an initial response, discover it doesn't meet the needs, and return back to analyzing context to improve its response.

### Understand the prompt

The prompt you send to Copilot is certainly the most obvious part of the flow with Copilot CLI. It's what you type into the dialog box, and what devs typically focus on when first working with an AI assistant. A good prompt should contain:

- What you're looking to build
- Why you're trying to build it
- How you're trying to build it

Short, single sentence prompts similar to "Add a filter to the assets list page" contain too much ambiguity. Ambiguity leads to code that, while technically accurate, doesn't genuinely meet the requirements set forth in the project. A more detailed prompt gives Copilot a better starting point when determining the appropriate strategy for generating its response:

```
Add a filter to the assets list page. Operators should be able to filter by category (a dropdown list) and availability (a toggle with the heading of "In stock"). Create the React island for the filter UI, the .NET endpoint on assets-svc that backs it, and the necessary tests on both sides.
```

> [!NOTE]
> Large language models (LLMs) process and generate text as tokens. In the prompt above, it's very likely every word would be a single token as they're all relatively common in English and development. The one exception to this is *availability*, which might be broken down into its root *available* and the suffix *ility*. This type of breakdown allows for better understanding of the word and its meaning in context with the rest of the prompt. By and large you don't need to consider tokenization of prompts, responses, or other text considered by Copilot, but it can be helpful to better understand how Copilot is working on your request.

### Analyze the context

Context is key throughout much of life, and when working with AI. While the more robust prompt in the section above provides a lot of direction to Copilot, there's still quite a bit that needs to be understood to ensure the response generated genuinely meets the needs of the project. Some questions that need to be answered include:

- Which Astro / React conventions are in play on the frontend? Is the filter expected to be an island or part of a server-rendered page?
- What tools are we using for tests? For unit tests? Are we using end to end tests? And, if so, what framework is being used there?
- Where's the assets list page in the project?
- Where's the `assets-svc` endpoint defined, and what's the existing .NET convention for query parameters and validation?
- What conventions are followed? Are there lint rules?

We always need to ensure Copilot is able to find the correct answers to these questions. Copilot is able to explore the project to find and follow existing patterns. But this approach can be inefficient on larger projects, especially when you may have portions of your codebase which don't follow the guidelines set forth by your team.

This is where your AI infrastructure - your instructions files, agent skills, custom agents and MCP servers - helps guide Copilot by providing curated context it can use when generating responses. Between your prompt, your code, and your project's AI infrastructure, Copilot will have the understanding of how to work in your environment. You'll build out that infrastructure starting in [Module 2][next-lesson].

### Determine the user's intent

You'll notice that determining the intent of your prompt is the third step in this flow. This might feel a bit curious. After all, shouldn't this be the first thing Copilot does? But as highlighted previously, even our relatively detailed prompt instructing Copilot of what to build and how to build it left a fair amount of ambiguity. Only after examining the prompt and the context is Copilot able to build out an effective plan for fulfilling the request.

At this point, Copilot may ask follow-up questions depending on its level of certainty with the approach it's about to take to fulfilling the request. As always, you can always add direction to your prompt or other forms of context (e.g. your instructions files) to be more likely to ask clarifying questions.

> [!NOTE]
> Copilot will often automatically create a plan when approaching a task. If you wish to formalize this step, and iterate on the plan before asking Copilot to begin building the solution, you can use [`/plan` mode][plan-mode].

### Generate a response

It's now time for Copilot to begin generating a response! This could include creating code or determining a particular task should be run, like calling a skill or running tests. This could be considered the draft version of the response Copilot generates, as there's still one more step before it actually performs any actions.

### Apply filters

Built into Copilot are various filters, including responsible AI usage, a [light security filter][security-filter], and, if enabled, [filtering code that matches publicly available code][public-code-filter]. This ensures responsible use of Copilot, and further improves the quality of code.

> [!NOTE]
> The security filter built into GitHub Copilot is not built as a replacement for proper security reviews, including human and automated tool reviews.

### Send response to the user

Now it's time for Copilot to do its work! After running through all of the above, Copilot begins generating the necessary code and performing the required tasks. During this process it will determine if any changes to the content or its approach need to be made, potentially returning to earlier steps in the flow.

Throughout the entire process, you can send additional messages to Copilot to steer it or further refine your request. Copilot will consider those prompts, again running through the same flow as needed.

And, from here, you will iterate! You'll validate the code and the completed operations, ensuring everything looks good. You'll make additional requests, run more tests, create commits, pull requests, and your standard developer flow.

## Copilot CLI under the hood

An AI agent is, in concrete terms, an LLM that runs in a loop, picks tools to call, observes the results, and iterates autonomously or as directed. Unlike a standard chat request of Copilot which reads input and generates code, Copilot agents can run scripts, access files, and perform other, potentially dangerous, operations. As a result, Copilot will always ask for permission before performing any tasks - including just launching the tool. [Tools available to Copilot CLI][available-tools] include:

| Tool | Description |
|---|---|
| `view` | Read a file or list a directory's contents. |
| `edit` | Modify an existing file via string replacement. |
| `create` | Create a new file. |
| `bash` / `powershell` | Execute shell commands in your local environment. |
| `grep` (or `rg`) | Search file contents for text or patterns. |
| `glob` | Find files matching a name or path pattern. |
| `web_fetch` | Fetch and parse content from a URL. |
| `task` | Spawn a subagent (e.g., `explore`, `general-purpose`) to handle a focused piece of work in its own context. |
| `skill` | Invoke a custom skill that bundles instructions or scripts for a specialized job. |
| MCP server tools | Tools provided by built-in or configured MCP servers — e.g., the GitHub MCP server for issues and pull requests. |

### Managing permissions

When you start Copilot CLI for the first time in a folder, Copilot will prompt you for read access to the folder. You can choose to deny permissions (which will cause Copilot to exit), to allow for that session, or to approve and save that choice for all future sessions. In addition to access to the folder, Copilot will request permissions before running any potentially unsafe operations. You can choose to allow or deny these calls individually, approve for the current session, or to always allow the tool.

> [!NOTE]
> A [session][session-docs] is the conversation between launching `copilot` and exiting. Sessions are persisted, so you can pick one back up later with `/resume` or `copilot --continue`. Note that "approve for the rest of this session" approvals only apply to the current run; they reset when you exit and resume.

Copilot offers many [options to control permissions][permissions-docs], including:

| Slash command | CLI switch | Description |
|---|---|---|
| `/model [MODEL]`, `/models` | `--model=MODEL` | Display available models, or switch the active model for the session. |
| `/add-dir PATH` | `--add-dir=PATH` | Grant the agent file access to an additional directory beyond the launch folder. |
| `/list-dirs` | — | Display the directories currently allowed for file access. |
| `/cwd [PATH]`, `/cd [PATH]` | — | Change (or display) the working directory without restarting the session. |
| — | `--allow-tool=TOOL` | Pre-approve specific tools (e.g., `shell(git:*)`, `write`, `MyMCP`) so they run without prompting. |
| — | `--deny-tool=TOOL` | Block specific tools entirely; deny rules win over allow rules. |
| `/reset-allowed-tools` | — | Clear all session-level tool approvals you've granted. |
| `/allow-all`, `/yolo` | `--allow-all`, `--yolo` | Enable all permissions — tools, paths, and URLs. Use with care. |
| — | `--allow-all-tools` | Auto-approve every tool call (required for programmatic / scripted runs), but paths must still be approved. |
| — | `--allow-all-paths` | Skip path verification and allow access to any file location. |
| — | `--allow-url=URL` / `--deny-url=URL` | Allow or block specific URLs/domains for `web_fetch` and shell network calls. |

> [!WARNING]
> Enabling all tools (commonly referred to as **YOLO mode**) gives Copilot unrestricted ability to read, modify, and execute files, run shell commands, and call out to MCP servers without asking. A misinterpreted prompt or a prompt-injection attack via fetched content can result in data loss, leaked secrets, or destructive commands. Only use YOLO mode in [trusted, sandboxed environments][risk-mitigation] such as a container or disposable VM, and never in a directory containing credentials or unreviewed code.

## Exercise: Explore the project using Copilot CLI

As you likely expected, there's quite a bit going on behind the scenes with Copilot CLI, and a host of options we have for controlling how it behaves. Let's make a couple of requests of Copilot CLI, focusing on how Copilot fulfills the requests we make of it and the tools it calls.

1. Return to your codespace. If you already closed it, navigate to your repository on GitHub.com, select **Code** > **Codespaces**, then select your existing codespace.
2. Open a terminal window by selecting <kbd>Ctrl</kbd> + <kbd>`</kbd>.
3. Start Copilot CLI by running the following command in the terminal window:

    ```bash
    copilot
    ```

4. When prompted to trust the folder, select **2. Yes, and remember this folder for future sessions.**

> [!NOTE]
> If you choose to approve access for all future sessions, the folder is listed in Copilot's local configuration, stored in `~/.copilot/config.json` (a hidden directory in your home folder) by default.

5. If prompted to determine [session sync][session-sync], use the right arrow to highlight **This repository** and select <kbd>Enter</kbd>.
6. Display the list of models available to you by entering the following switch and selecting <kbd>Enter</kbd>:

    ```
    /models
    ```

7. Make note of the list of available models. Note that this list will vary depending on the current plan for Copilot you have access to and, if on a business account, what your administrators have chosen to make available.
8. Select **auto** from the list and select <kbd>Enter</kbd>.
9. Send the following prompt to Copilot CLI to ask about the project:

    ```
    Tell me about this project
    ```

10. Make note of the tool calls to **Read** to read files and **List directory** to explore the available files. Because you already granted permissions to Copilot to read the folder in the prior step, these are run without having to ask for permissions.
11. Send the following prompt to list any GitHub issues filed for the repo:

    ```
    Are there any issues currently open on this GitHub repo?
    ```

12. Note that again Copilot didn't ask permissions. This is because the read-only MCP server is automatically built into Copilot CLI. Also note the call to **MCP:github-mcp-server** took place automatically, as Copilot determined it was the correct tool to call.
13. Send the following prompt to create issues based on the todos in the README file:

    ```
    Can you create a set of short issues based on the todos you see in the readme?
    ```

    Because you are now requesting Copilot make changes to your repository in the form of creating issues, it now asks for permissions. Also note the heading for the dialog, which says **Permission request (2 remaining)**.

    Selecting **Yes** will allow for the first call only, and the next two will require separate approvals. **Yes, and don't ask again for `gh issue` in this repo (*path*)** will allow Copilot CLI to always call the `gh issue` CLI tool for this repository.

> [!IMPORTANT]
> Ensure you always consider the implications of granting Copilot or any AI tool permissions to perform actions on your behalf.

14. For purposes of this exercise, select **2** by cursoring down to option 2 to allow Copilot CLI to call `gh issue` for this repository, then select <kbd>Enter</kbd>.
15. Copilot CLI creates the issues!
16. Display the summaries of the newly created issues by sending the following prompt to Copilot CLI:

    ```
    Show me summaries of the issues on this repository
    ```

17. Again, because Copilot CLI has read access via the GitHub MCP server, it automatically pulls down the issue summaries from the repository.
18. Revoke Copilot's ability to create issues by using the following switch and selecting <kbd>Enter</kbd>:

    ```
    /reset-allowed-tools
    ```

19. Attempt to create another issue by sending the following prompt to Copilot CLI:

    ```
    Create an issue to add dark mode to the application.
    ```

20. Note how Copilot CLI prompts you for permissions to perform the action. Select <kbd>Esc</kbd> twice to exit out of the prompt.

You explored how Copilot CLI uses tools behind the scenes, and how it requests permissions. You also saw how you can both grant and revoke permissions for Copilot CLI.

## Exercise: Improve documentation

As with many (most?) applications, documentation is lacking in AssetTrack. There's missing documentation and some that's even incorrect. This not only causes challenges when you or your team members look to make updates to the codebase, it also impacts Copilot's ability to generate quality code. Let's perform an audit of our documentation in the project, identify key areas for improvement, and ask Copilot to make the necessary changes.

1. With Copilot CLI still running in your codespace, ask Copilot to tour the repo and produce a structured summary. Send the following prompt:

    ```
    Tour the repo and give me a structured summary: each stack's purpose, modules, entry points, data layer, templates, scripts, tech-debt areas, and unenforced rules.
    ```

2. Review the output. Copilot will read across the codebase using the `view` and `grep` tools as you saw previously.
3. Ask Copilot to identify what's missing or wrong in the current `README.md`:

    ```
    Compare what you just found against the current README.md. What's missing, outdated, or wrong?
    ```

4. Have Copilot draft updates to `README.md` (and any supplemental docs you decide are warranted — `ARCHITECTURE.md`, per-stack READMEs under `services/*`, etc.):

    ```
    Draft updates to README.md (and add ARCHITECTURE.md if it helps) reflecting what you found. If there's any ambiguity, please ask me for follow-up information.
    ```

5. Review the changes by opening the diffs inside of Copilot CLI by using the slash command `/diff`.
6. Confirm the updates match the current structure of the project.

> [!IMPORTANT]
> Always review documentation generated by an AI tool against the actual code. A confidently wrong README is worse than no README.

7. Create a new branch with the updates by prompting Copilot:

    ```
    Create a new branch called docs-update, and a short commit message for the changes.
    ```

8. Have Copilot create a pull request (PR) by using the following prompt:

    ```
    Create a PR from the new branch to main. Create a descriptive comment describing the docs updates.
    ```

9. In a new browser tab, open your repository.
10.  Select **Pull requests** to open the list of pull requests.
11.  Select the PR you just generated.
12.  Select **Merge** to merge the pull request.


## Summary

Copilot CLI isn't a chat box bolted onto your terminal — it's an agent running in a loop, pulling in context from your prompt, your code, and your AI infrastructure, then picking tools to act on your behalf. In this module you saw that flow end-to-end: how a prompt is interpreted, where context comes from, what the harness exposes as tools, and how the permission model keeps you in control of what runs. You then put it to work by exploring AssetTrack, calling the GitHub MCP server, managing approvals, and shipping a real documentation update through a branch and pull request.

In this lesson, you learned:

- how requests are processed by AI agents, including GitHub Copilot CLI.
- what an AI agent is and how it differs from chatting with an AI tool.
- how the Copilot CLI harness works under the hood.
- the core mechanics you'll use every day.

Next, you'll **build the AI infrastructure** — codify what you just documented as `copilot-instructions.md` and scoped `.instructions` files, then add a custom agent and an imported skill in [Module 2][next-lesson].

## Resources

- [About GitHub Copilot CLI][copilot-cli-docs]
- [Using GitHub Copilot CLI][copilot-cli-howto]
- [Tool availability values][available-tools]
- [Tool permission patterns][permissions-docs]
- [Resume an interactive session][session-docs]
- [Session sync (chronicle)][session-sync]
- [Use plan mode][plan-mode]
- [Risk mitigation and YOLO mode][risk-mitigation]
- [Security measures for GitHub Copilot CLI][security-filter]
- [Public code filtering][public-code-filter]

---

| [← Previous: Prerequisites and environment setup][previous-lesson] | [Next: Building an AI infrastructure →][next-lesson] |
|:--|--:|

[previous-lesson]: ../00-prerequisites/
[next-lesson]: ../02-building-ai-infrastructure/
[copilot-cli-docs]: https://docs.github.com/copilot/concepts/agents/about-copilot-cli
[copilot-cli-howto]: https://docs.github.com/copilot/how-tos/use-copilot-agents/use-copilot-cli
[plan-mode]: https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/overview#use-plan-mode
[public-code-filter]: https://docs.github.com/copilot/responsible-use/copilot-cli#public-code
[security-filter]: https://docs.github.com/copilot/responsible-use/copilot-cli#security-measures-for-github-copilot-cli
[available-tools]: https://docs.github.com/copilot/reference/copilot-cli-reference/cli-command-reference#tool-availability-values
[permissions-docs]: https://docs.github.com/copilot/reference/copilot-cli-reference/cli-command-reference#tool-permission-patterns
[session-docs]: https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/overview#resume-an-interactive-session
[session-sync]: https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/chronicle
[risk-mitigation]: https://docs.github.com/copilot/concepts/agents/copilot-cli/about-copilot-cli#risk-mitigation
