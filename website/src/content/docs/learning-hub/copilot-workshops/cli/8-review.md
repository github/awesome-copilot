---
title: "Exercise 8 - Review and Next Steps"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

Over the last several exercises, you explored some of the most common use cases for GitHub Copilot CLI, including:

- interacting with GitHub and other MCP servers.
- using instructions files to guide code generation.
- implementing skills to add tools to the Copilot CLI toolbox.
- calling custom agents for advanced and more complex tasks.
- using slash commands to manage your session, and optionally bridging back to cloud agent via `/delegate`.

Let's talk about some slash commands, best practices, and next steps.

## Slash commands

Copilot CLI has a series of slash commands available to interact with it, including ones which allow you to configure it or see what's going on behind the scenes. You've already used `/clear` to start a new chat which clears the current context, and `/mcp` to inspect and manage MCP servers. Some additional ones you might find helpful are:

| Command            | Description                                                   |
| ------------------ | ------------------------------------------------------------- |
| `/add-dir`         | Add a directory to the trusted list for Copilot               |
| `/clear`, `/new`   | Clear the conversation history and start fresh                |
| `/compact`         | Summarize conversation history to reduce context window usage |
| `/context`         | Show context window token usage and visualization             |
| `/diff`            | Review the changes made in the current directory              |
| `/model`           | Select AI model to use (Claude Sonnet, GPT-5, etc.)           |
| `/plan <prompt>`   | Create an implementation plan before coding                   |
| `/review <prompt>` | Run code review agent to analyze changes                      |
| `/delegate`        | Delegate task to Copilot cloud agent for async processing    |
| `/session`         | Show session info and workspace summary                       |
| `/share`           | Share session to markdown file or GitHub gist                 |
| `/skills`          | Manage skills for enhanced capabilities                       |
| `/usage`           | Display session usage metrics and statistics                  |

> [!TIP]
> Use `/help` to see the full list of available commands and keyboard shortcuts.

## Best practices

When using any AI tool, the underlying infrastructure drives the quality of what you get out. Robust instructions files, custom agents, and agent skills all play a part — you explored each of them in this workshop. [awesome-copilot][awesome-copilot] is a good source of templates, and Copilot itself can scaffold these for you as a starting point.

Context still matters as much as infrastructure. Clearly describing *what* you want built, *why*, and *how* meaningfully changes the output. If a piece of information would help Copilot, pass it along.

## Next steps

The best way to improve your skills with any tool is to keep using the tool! Use it for production code, for hobby code, for the little app you've had in your mind for years but never got around to building. Share your learnings with your team, and learn from your team. And, as always, explore the documentation.

If you'd like to explore more of the GitHub Copilot ecosystem, check out the [VS Code harness](/learning-hub/copilot-workshops/vscode/) or the [Cloud agent harness](/learning-hub/copilot-workshops/cloud/).

## Resources

- [About Copilot CLI][about-copilot-cli]
- [Using Copilot CLI][using-copilot-cli]
- [Awesome Copilot Repository][awesome-copilot]
- [Custom Instructions Guide][repo-instructions]
- [Agent Skills Documentation][agent-skills]
- [Custom Agents Documentation][custom-agents]
- [MCP Specification][mcp-spec]

[previous-lesson]: /learning-hub/copilot-workshops/cli/7-slash-commands/
[about-copilot-cli]: https://docs.github.com/copilot/concepts/agents/about-copilot-cli
[using-copilot-cli]: https://docs.github.com/copilot/how-tos/use-copilot-agents/use-copilot-cli
[awesome-copilot]: https://github.com/github/awesome-copilot
[repo-instructions]: https://docs.github.com/copilot/how-tos/configure-custom-instructions/add-repository-instructions
[agent-skills]: https://docs.github.com/copilot/concepts/agents/about-agent-skills
[custom-agents]: https://docs.github.com/copilot/how-tos/use-copilot-agents/use-copilot-cli#use-custom-agents
[mcp-spec]: https://modelcontextprotocol.io/
