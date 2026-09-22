---
title: "Lesson 8 - Review and next steps"
description: "Recap the GitHub Copilot app harness, automate recurring work, and explore where to go next."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

Over the last several lessons, you took a feature from idea to merge with the GitHub Copilot app, including:

- connecting a repository and orienting to the app's workspace and your seeded backlog.
- starting sessions from a direct task and from issues, and using Plan and Autopilot modes to control how the agent works.
- guiding the agent with custom instructions and a reusable skill.
- testing your work with the Playwright MCP server in a real browser.
- collaborating with the agent on a shared canvas.
- shipping changes up a ladder of merge automation — from merging on github.com yourself to letting **Agent Merge** land a pull request.

Let's automate some recurring work, talk through best practices, and look at where to go next.

## Automate recurring work

The app can run agents for you on a schedule or on demand through **automations** — great for routine tasks like triaging new issues or recapping recent activity. Let's create a simple, non-destructive one.

1. Select **Automations** in the sidebar, then select **New automation**.
2. Give it a name, such as `Recap my recent work`.
3. Choose a trigger. **Manual** lets you run it on demand; **On a schedule** runs it automatically; **When an issue is created** reacts to new issues. Choose **Manual** for this lesson.
4. Enter a read-only prompt so the automation can't change anything, for example:

   ```plaintext
   Summarize the pull requests merged in this repository over the last week, and list any issues still open in the backlog.
   ```

5. Pick the project (your Tailspin Toys repository) and create the automation.
6. Run it on demand to see the result.

> [!TIP]
> Automations can run locally or in the cloud. Enable **Run in the cloud** and pick the **Tools** an automation may use when you want it to run unattended on a schedule. Keep scheduled automations scoped and non-destructive until you trust their output.

## Best practices

When using any AI tool, the infrastructure around it drives the quality of what you get out. Instructions files, skills, and custom agents all played a part in this workshop — invest in them and reuse them across sessions.

Match the **mode and model** to the task. Use **Plan** to think through an approach before building, **Interactive** to stay in the loop on focused changes, and **Autopilot** only for well-scoped, isolated tasks. Choose a faster model for routine edits and a more capable model with higher reasoning effort for complex work.

Context still matters as much as infrastructure. Clearly describing *what* you want built, *why*, and *how* meaningfully changes the output. Quick chats are a great place to scope an idea before you commit it to a full session.

## More to explore

You've covered the core workflow. A few more features worth a look:

- **Quick chats** for fast, throwaway questions that don't need a full session.
- **Rubber duck** to talk through a problem and get high-signal feedback before you build.
- [**Custom agents**][custom-agents] to package a role, its tools, and its instructions for repeatable, specialized work.
- [`/chronicle`][chronicle] to generate a narrative of what happened in a session.
- [Bring your own key (BYOK)][byok] to use models from your own provider, including local models via Ollama, Foundry Local, or LM Studio.
- [Cloud sandboxes][sandboxes] to run sessions in a GitHub-hosted isolated environment.
- [Deep links][deep-links] to open the app straight into a repository, session, or prompt.

## Next steps

The best way to improve with any tool is to keep using it! Use it for production code, for hobby code, for the little app you've had in mind for years but never got around to building. Share your learnings with your team, and learn from theirs. And, as always, explore the documentation.

If you'd like to explore more of the GitHub Copilot ecosystem, check out the [VS Code harness](/learning-hub/copilot-workshops/vscode/), the [Copilot CLI harness](/learning-hub/copilot-workshops/cli/), or the [Cloud agent harness](/learning-hub/copilot-workshops/cloud/).

## Resources

- [About the GitHub Copilot app][about-copilot-app]
- [Getting started with the GitHub Copilot app][getting-started]
- [Customize the GitHub Copilot app][customize]
- [Using automations][using-automations]
- [Working with canvas extensions][canvas-docs]
- [About cloud and local sandboxes][sandboxes]

[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[getting-started]: https://docs.github.com/copilot/how-tos/github-copilot-app/getting-started
[customize]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[using-automations]: https://docs.github.com/copilot/how-tos/github-copilot-app/using-automations
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[sandboxes]: https://docs.github.com/copilot/concepts/about-cloud-and-local-sandboxes
[chronicle]: https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/chronicle
[custom-agents]: https://docs.github.com/copilot/concepts/agents/cloud-agent/about-custom-agents
[byok]: https://docs.github.com/copilot/how-tos/github-copilot-app/use-byok-models
[deep-links]: https://docs.github.com/copilot/how-tos/github-copilot-app/open-with-deep-links
