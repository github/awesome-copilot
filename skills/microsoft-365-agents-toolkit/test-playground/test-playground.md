# Test with Agents Playground

Test your bot locally using the Microsoft 365 Agents Playground toolset. No M365 account, Azure tunnel, or app registration required.

**Default: use [playground.md](playground.md) (manual interactive testing)**, unless user explicitly asks for automated or CI testing.

> **Applies to: code-based Teams bots/agents only.** Declarative agents and API plugins must be tested in M365 Copilot via [test-teams](../test-teams/test-teams.md).

## Intent Router

| User Intent | Read |
|---|---|
| "test my bot", "run locally", "chat with the bot", explore responses, manual testing | → [playground.md](playground.md) *(default)* |
| "automated tests", "CI pipeline", "smoke tests", "programmatic testing", `TestClient`, `ConversationServer` | → [playground-cli.md](playground-cli.md) |

## References

- For project file details → [../toolkit/manifest-and-yaml.md](../toolkit/manifest-and-yaml.md)
- If something goes wrong → [../troubleshoot/troubleshoot.md](../troubleshoot/troubleshoot.md)
- To test on real Teams instead → [../test-teams/test-teams.md](../test-teams/test-teams.md)

