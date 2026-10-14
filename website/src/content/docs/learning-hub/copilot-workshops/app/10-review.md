---
title: "Lesson 10 - Wrap-up and next steps"
description: "Recap the App workflow, two PR milestones, canvas exercises, and reusable quality practices, then explore further resources."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

You used the GitHub Copilot app across a continuous Tailspin Toys workflow. You:

- connected a repository, explored the app's workspace and seeded backlog, and tried a quick chat.
- started a focused star-rating session, reviewed the result in a browser canvas, and manually merged your first pull request (PR).
- started from the filtering issue, defined the approach in **Plan** mode, built it in **Autopilot** mode, and reviewed it in **Interactive** mode.
- guided the agent with custom instructions, then customized the existing `quality-checks` skill and used it to run unit tests, lint, and type checks.
- added the Playwright Model Context Protocol (MCP) server and used it to explore filtering in a real browser.
- created and selected a quality assurance (QA) custom agent to assess requirements, coverage, skill results, and browser evidence.
- reviewed the complete filtering change and authorized **Agent Merge** for your second PR.
- used the existing Database Explorer canvas, then created and tested a repository-backed triage canvas.

## What you shipped

The workshop has two PR milestones, each on its own branch from updated `main`:

1. **Star ratings:** display the existing `starRating` and an explicit unrated state on game cards.
2. **Filtering and quality workflow:** implement filtering, update the instructions and apply them to the feature, customize the `quality-checks` report, create a QA profile, and include the associated tests.

From planning filtering through opening its PR, you used the same session, worktree, and branch. We combined that work in one PR to streamline the workshop. You then used the existing Database Explorer and created a repository-backed triage canvas without repeating the PR workflow.

## Different kinds of verification

You checked the code in several ways: automated tests, your own browser inspection, and Copilot's browser exploration through MCP. The `quality-checks` skill ran unit tests, lint, and type checks and reported them in your new format. QA brought those results together with a review of requirements and test coverage before the PR.

Tests added should close genuine gaps; a QA run that needs no new tests can be correct. Missing tools, skipped checks, and failures are visible blockers, not passes. Review code and evidence before authorizing merge, and refresh affected evidence after changes.

## Best practices

The context and tools you give Copilot shape its work. In this workshop, you updated instructions, customized a skill, created a QA profile, configured an MCP server, and created a canvas. Reuse these customizations across sessions and adjust them as your team's needs change. Instructions set standards, skills describe repeatable tasks, custom agents define specialist roles, MCP servers connect external tools, and canvases provide shared interactive surfaces. Review the actual changes and tool results, not just the agent's summary.

Match the **mode and model** to the task. Use **Plan** to think through an approach before building, **Interactive** to stay in the loop on focused changes, and **Autopilot** only for well-scoped, isolated tasks. Choose a faster model for routine edits and a more capable model with higher reasoning effort for complex work.

Context still matters as much as infrastructure. Clearly describing *what* you want built, *why*, and *how* meaningfully changes the output. Quick chats are a useful place to scope an idea before you commit it to a full session.

## More to explore

You've covered the core workflow. A few more features worth a look:

- [**Automations**][using-automations] for recurring or on-demand tasks such as summarizing recent work. Review the schedule, permissions, and scope before adopting one; creating an automation is a next step, not part of this workshop.
- **Rubber duck** to talk through a problem and get high-signal feedback before you build.
- [`/chronicle`][chronicle] to generate a narrative of what happened in a session.
- [Bring your own key (BYOK)][byok] to use models from your own provider, including local models via Ollama, Foundry Local, or LM Studio.
- [Deep links][deep-links] to open the app straight into a repository, session, or prompt.

## Next steps

The best way to improve with any tool is to keep using it! Use it for production code, for hobby code, for the little app you've had in mind for years but never got around to building. Share your learnings with your team, and learn from theirs. And, as always, explore the documentation.

If you'd like to explore more of the GitHub Copilot ecosystem, check out the [VS Code harness][vscode-harness], the [Copilot CLI harness][cli-harness], or the [Cloud agent harness][cloud-harness].

## Resources

- [About the GitHub Copilot app][about-copilot-app]
- [Getting started with the GitHub Copilot app][getting-started]
- [Customize the GitHub Copilot app][customize]
- [Using automations][using-automations]
- [Working with canvas extensions][canvas-docs]

[vscode-harness]: /learning-hub/copilot-workshops/vscode/
[cli-harness]: /learning-hub/copilot-workshops/cli/
[cloud-harness]: /learning-hub/copilot-workshops/cloud/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[getting-started]: https://docs.github.com/copilot/how-tos/github-copilot-app/getting-started
[customize]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[using-automations]: https://docs.github.com/copilot/how-tos/github-copilot-app/using-automations
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[chronicle]: https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/chronicle
[byok]: https://docs.github.com/copilot/how-tos/github-copilot-app/use-byok-models
[deep-links]: https://docs.github.com/copilot/how-tos/github-copilot-app/open-with-deep-links
