---
title: "Exercise 4 - Custom agents"
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

[custom-agents-concept]: https://docs.github.com/copilot/concepts/agents/cloud-agent/about-custom-agents
[agent-skills-concept]: https://docs.github.com/copilot/concepts/agents/about-agent-skills
[wcag]: https://www.w3.org/WAI/standards-guidelines/wcag/
## Scenario

Tailspin Toys is committed to ensuring their crowdfunding platform is accessible to all users, regardless of their visual abilities or preferences. Recent user feedback has highlighted that some users find the current dark theme difficult to read due to insufficient contrast between text and background colors. To address this accessibility concern, the design team has requested the implementation of a high-contrast mode that users can toggle on and off.

Because accessibility is critical, you want to ensure this is implemented as quickly as possible. You're going to utilize a custom agent to generate the functionality.
In this exercise, you will:

- review an existing accessibility custom agent.
- use the accessibility agent in Copilot Chat to implement a high-contrast mode.

## Reviewing the accessibility custom agent

A custom agent has already been created for you for accessibility. Let's review the contents to understand how it will guide Copilot.

Return to your codespace, then open a terminal and switch to a fresh branch off `main` for the accessibility work (you'll keep the filtering PR from Exercise 3 separate):

```bash
git checkout main
git pull
git checkout -b accessibility-vscode
```

1. Open `.github/agents/accessibility.md`.
2. Note the YAML frontmatter with the `name` and `description` fields.

> [!CAUTION]
> The frontmatter with `name` and `description` is required for custom agents.

3. From there, scan and review the next sections which highlight:
   - Core responsibilities when generating code for an accessible website.
   - Best practices for accessibility.
   - Code examples for HTML, CSS, and JavaScript.
   - A list of common pitfalls and mistakes.
## Using the custom agent in Copilot Chat

VS Code surfaces every custom agent defined in `.github/agents` in the agents dropdown at the bottom of the Copilot Chat view. You can select a custom agent to scope a chat session to that agent's instructions and tooling.

> [!TIP]
> **Open Copilot Chat**
>
> Before you start the exercises below, return to your codespace, open the Copilot Chat panel, and select **New Chat** to start a clean conversation. Mode and model selection vary per exercise — each step calls those out where it matters.
1. Select **Agent** from the agents dropdown in the Chat view if it isn't already selected.

   ![Screenshot showing the agent picker in the Chat view.](/images/learning-hub/copilot-workshops/shared-chat-mode-selector.png)

2. Select the agents dropdown at the bottom of the chat view (it shows the active agent — by default, this is **default**).
3. Select **Accessibility agent** from the list of available agents.
4. Send the following prompt to the accessibility agent:

    ```
    Add a high-contrast mode to the site. There should be a toggle for high contrast which the user can set, and the setting should persist across page reloads using local storage on the browser.
    ```

5. Copilot Chat will get to work — it'll explore the codebase, propose changes, and apply edits to your project files. Each edit will appear inline in the chat with the file path and a diff you can review.
6. As edits land, the **Files changed** indicator updates so you can see the working set the agent has modified.

> [!NOTE]
> This process will likely take a few minutes. Copilot is making real changes to your repository — it'll edit existing files such as the Astro components, CSS, and any related tests as it works.

You'll review and steer this in-flight work in the next exercise.

## Summary and next steps

This lesson explored [custom agents][custom-agents] in GitHub Copilot, specialized AI assistants tailored to specific tasks and domains. With custom agents you can codify your team's expertise and standards into reusable agents that guide Copilot to perform particular types of work more effectively.

You explored these concepts:

- how custom agents are defined.
- using a custom agent in Copilot Chat agent mode.

Next, you'll [monitor and steer the agent's work][next-lesson] — reviewing the changes as they happen and adding a light-mode toggle to the same session.

## Resources

- [About custom agents][custom-agents]
- [Creating custom agents in your IDE][creating-custom-agents-ide]
- [Custom agents in VS Code][custom-agents-vscode]
- [Custom agents configuration][custom-agents-config]
- [Custom agents on awesome-copilot][awesome-copilot-agents]

---

| [← Previous lesson: Testing your feature with the Playwright MCP server][previous-lesson] | [Next lesson: Monitoring and managing agents →][next-lesson] |
|:--|--:|

[previous-lesson]: /learning-hub/copilot-workshops/vscode/3-mcp/
[next-lesson]: /learning-hub/copilot-workshops/vscode/5-managing-agents/
[custom-agents]: https://docs.github.com/copilot/concepts/agents/cloud-agent/about-custom-agents
[creating-custom-agents-ide]: https://docs.github.com/copilot/how-tos/use-copilot-agents/cloud-agent/create-custom-agents-in-your-ide
[custom-agents-vscode]: https://code.visualstudio.com/docs/copilot/customization/custom-agents
[custom-agents-config]: https://docs.github.com/copilot/reference/custom-agents-configuration
[awesome-copilot-agents]: https://github.com/github/awesome-copilot/tree/main/agents
