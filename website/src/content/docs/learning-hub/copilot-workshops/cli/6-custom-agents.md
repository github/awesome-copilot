---
title: "Exercise 6 - Custom agents with GitHub Copilot CLI"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

## What are custom agents?

[Custom agents][custom-agents-concept] in GitHub Copilot allow you to create specialized AI assistants tailored to specific tasks or domains within your development workflow. By defining agents through markdown files in the `.github/agents` folder of your repository, you can provide Copilot with focused instructions, best practices, coding patterns, and domain-specific knowledge that guide it to perform particular types of work more effectively. Teams can codify their expertise into reusable agents — an accessibility agent that enforces [WCAG][wcag] compliance, a security agent that follows secure coding practices, or a testing agent that maintains consistent test patterns.

Custom agents are defined by markdown files in the `.github/agents` folder of your project, or globally in `~/.copilot/agents`. Each file has YAML frontmatter with at least a `name` and `description`, followed by a markdown prompt that defines the agent's behavior, expertise, and instructions.

### Custom agents compared with agent skills

There's some logical overlap between custom agents and [agent skills][agent-skills-concept]. Both are primarily defined with markdown files and tell an AI how to perform operations. The cleanest way to separate them: a **custom agent** is the worker, and **skills** are tools.

Custom agents have their own context window and are built to orchestrate skills (and even other agents) as part of doing their work. In this lab, the accessibility custom agent reviews and updates the site against accessibility guidelines; as part of that work it could call skills such as a pull-request workflow skill or one that runs and manages tests.

> [!NOTE]
> There's no single "right" way to author a custom agent. As with anything in AI, test and iterate to find what works for your environments and scenarios.

## Scenario

Many web applications fall short of being accessible to all users, and the website you're working in is no exception. You'll use a custom agent to identify and resolve accessibility shortcomings.

Tailspin Toys is committed to ensuring their crowdfunding platform is accessible to all users, regardless of their visual abilities or preferences. Recent user feedback has highlighted that some users find the current dark theme difficult to read due to insufficient contrast between text and background colors. To address this accessibility concern, the design team has requested the implementation of a high-contrast mode that users can toggle on and off.

Because accessibility is critical, you want to ensure this is implemented as quickly as possible. You're going to utilize a custom agent to generate the functionality.
In this exercise, you will:

- explore custom agents.
- enable a custom agent and assign it a task using Copilot CLI.

## Reviewing the accessibility custom agent

A custom agent has already been created for you for accessibility. Let's review the contents to understand how it will guide Copilot.

1. Open `.github/agents/accessibility.md`.
2. Note the YAML frontmatter with the `name` and `description` fields.

> [!CAUTION]
> The frontmatter with `name` and `description` is required for custom agents.

3. From there, scan and review the next sections which highlight:
   - Core responsibilities when generating code for an accessible website.
   - Best practices for accessibility.
   - Code examples for HTML, CSS, and JavaScript.
   - A list of common pitfalls and mistakes.
## Using a custom agent in Copilot CLI

You can start a custom agent in Copilot CLI by using the `/agent` command. Let's perform an accessibility pass on our website.

1. Return to your codespace. If you closed it, navigate to your repository on GitHub.com, select **Code** > **Codespaces**, then reopen your existing codespace.
2. Return to your open Copilot CLI session. If the terminal is closed or you exited Copilot CLI, open a terminal by selecting <kbd>Ctrl</kbd>+<kbd>\`</kbd>, then start it from the repository root by running `copilot --yolo --enable-all-github-mcp-tools`. Trust the project folder if prompted, then run `/models` and select **Auto**.
3. Bring up the list of agents by typing `/agent` in the prompt window in Copilot CLI and selecting <kbd>Enter</kbd>.
4. Select the **Accessibility agent** from the list of available agents.
5. Use the following prompt to ask the accessibility agent to perform a review and generate fixes for the accessibility backlog item:

    ```
    Perform an accessibility review of the site. Pull the related issue down from the repository for details. Implement a high-contrast mode toggle that persists the user's preference across page reloads. Ensure there are e2e tests for any updates made to the project. Then create a PR with the updates.
    ```

6. Copilot gets to work on the task! It will start by retrieving the issue, then performing the review, generating updates, and finally creating the PR. You should also notice when it creates the PR it utilizes the skill focused on PRs for the project.

> [!NOTE]
> This process will likely take a few minutes. It's a good time to reflect on everything you've learned, enjoy a beverage, or sneak ahead to the next module which talks about some additional commands available to you in Copilot CLI.

## Summary and next steps

This lesson explored [custom agents][custom-agents] in GitHub Copilot, specialized AI assistants tailored to specific tasks and domains. With custom agents you can codify your team's expertise and standards into reusable agents that guide Copilot to perform particular types of work more effectively.

You explored these concepts:

- how custom agents are defined.
- using a custom agent in Copilot CLI.

Next up, let's explore [some slash commands][next-lesson] to learn some additional tricks with Copilot CLI.

## Resources

- [Custom agents][custom-agents]
- [Creating custom agents for a repository][creating-custom-agents]
- [Custom agents on awesome-copilot][awesome-copilot-agents]
- [Preparing to use custom agents in your organization][org-custom-agents]
- [Preparing to use custom agents in your enterprise][enterprise-custom-agents]

[previous-lesson]: /learning-hub/copilot-workshops/cli/5-agent-skills/
[next-lesson]: /learning-hub/copilot-workshops/cli/7-slash-commands/
[custom-agents]: https://docs.github.com/copilot/how-tos/use-copilot-agents/use-copilot-cli#use-custom-agents
[creating-custom-agents]: https://docs.github.com/copilot/how-tos/use-copilot-agents/cloud-agent/create-custom-agents
[awesome-copilot-agents]: https://github.com/github/awesome-copilot/tree/main/agents
[org-custom-agents]: https://docs.github.com/copilot/how-tos/administer-copilot/manage-for-organization/prepare-for-custom-agents
[enterprise-custom-agents]: https://docs.github.com/copilot/how-tos/administer-copilot/manage-for-enterprise/manage-agents/prepare-for-custom-agents
[custom-agents-concept]: https://docs.github.com/copilot/concepts/agents/cloud-agent/about-custom-agents
[agent-skills-concept]: https://docs.github.com/copilot/concepts/agents/about-agent-skills
[wcag]: https://www.w3.org/WAI/standards-guidelines/wcag/
