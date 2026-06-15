# Agents Playground

## purpose

Agents Playground — the local web-based test harness for testing M365 agents (Teams bots, custom engine agents, message extensions) without deploying to the Teams client. Note: declarative agents and Office add-ins are not supported by the Playground — see [test-teams](../test-teams/) for those.

## rules

1. **Agents Playground is a local web UI for testing.** It provides a browser-based chat interface that simulates a Teams conversation. No Teams client, sideloading, or M365 account required. Recommend Agents Playground first for testing — use Teams only when the user explicitly requests it.
2. **Use the `agentsplayground` CLI to start.** Install with `winget install agentsplayground` (Windows), or `npm install -g @microsoft/m365agentsplayground`. Start with `agentsplayground -e http://localhost:3978/api/messages -c msteams`. The `atk preview` command is an alternative that also opens the playground.
3. **`.m365agentsplayground.yml` configures the playground.** This optional config file in the project root customizes playground behavior — bot endpoint URL, display settings, and test scenarios.
4. **The playground connects to your local bot endpoint.** By default it connects to `http://localhost:3978/api/messages` (or whatever port your bot runs on). Ensure your bot server is running before or alongside the playground.
5. **Send messages to test conversation flows.** Type messages in the playground chat to simulate user input. The bot processes them through the same handler pipeline as in production Teams.
6. **Card actions work in the playground.** Adaptive Card actions (submit, execute) are supported. Test card interactions without deploying to Teams.
7. **Activity simulation for advanced testing.** The playground can simulate Teams-specific activities like `conversationUpdate` (member added/removed), `messageReaction`, and `invoke` activities that are hard to trigger manually.
8. **The playground does NOT replace Teams client testing.** It simulates core messaging and card interactions but does not support: SSO/OAuth popups, message extensions, task modules, meeting-specific features, or the full Teams app manifest experience. Always do a final validation in the real Teams client.
9. **`agentsplayground` supports environment-specific config.** Pass `--client-id`, `--client-secret`, and `--tenant-id` flags to test authenticated agents, or use `--channel-id` to emulate different channels (`msteams`, `emulator`, `webchat`, `directline`).
10. **Hot reload works with the playground.** If your bot server supports hot reload (e.g., `nodemon` or `tsx watch`), changes to bot code are reflected immediately without restarting the playground.

## patterns

### Pattern 1: Starting Agents Playground

```bash
# Option 1: agentsplayground CLI (recommended — no provisioning needed)
npm run dev                                                      # Start bot in background
agentsplayground -e http://localhost:3978/api/messages -c msteams # New terminal

# Option 2: With authentication credentials
agentsplayground -e http://localhost:3978/api/messages -c msteams \
  --client-id <CLIENT_ID> --client-secret <CLIENT_SECRET> --tenant-id <TENANT_ID>
```

### Pattern 2: .m365agentsplayground.yml configuration

```yaml
# .m365agentsplayground.yml — optional playground configuration
version: v1.0

# Bot endpoint the playground connects to
botEndpoint: http://localhost:3978/api/messages

# Display name shown in the playground chat header
botName: My Teams Bot

# Optional: pre-configured test messages
testScenarios:
  - name: "Greeting"
    message: "Hello"
  - name: "Help command"
    message: "help"
  - name: "Complex query"
    message: "What are the sales figures for Q4?"
```

### Pattern 3: Local development workflow with playground

```jsonc
// package.json — scripts for playground development
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "playground": "agentsplayground -e http://localhost:3978/api/messages -c msteams"
  }
}
```

```typescript
// src/index.ts — bot entry point
import { Application, TurnState } from '@microsoft/teams-ai';

const app = new Application<TurnState>({
  // In playground mode, the bot runs locally
  // No special config needed — same code works in playground and Teams
});

app.message('/test', async (ctx) => {
  await ctx.send('Playground test successful!');
});

app.message(/.*/, async (ctx) => {
  await ctx.send(`You said: ${ctx.activity.text}`);
});

// Start the server
const port = process.env.PORT || 3978;
app.listen(port, () => {
  console.log(`Bot running at http://localhost:${port}`);
});
```

## pitfalls

- **Bot server not running when playground starts** — The playground connects to your local bot endpoint. If the server isn't running, you'll see connection errors. Start the bot first or use `concurrently`.
- **Wrong port in playground config** — If your bot runs on a non-default port, update `.m365agentsplayground.yml` or the `BOT_ENDPOINT` env variable.
- **Testing SSO in the playground** — OAuth/SSO flows require the real Teams client. The playground cannot simulate the Teams SSO token exchange. Use the playground for message/card testing, Teams client for auth flows.
- **Assuming playground = Teams client** — Message extensions, task modules, meeting features, and app installation flows are not available in the playground. Always validate in Teams before publishing.
- **Forgetting `--env` for environment-specific testing** — Without `--env`, `atk preview` uses the default dev environment. For the `agentsplayground` CLI, pass auth credentials explicitly via `--client-id`, `--client-secret`, `--tenant-id`.
- **Firewall blocking localhost** — Some corporate networks block local WebSocket connections. If the playground can't connect, check firewall rules for localhost ports.
- **Hot reload not configured** — Without `tsx watch` or `nodemon`, code changes require manual server restart. Set up hot reload for efficient playground development.
- **Card rendering differences** — Adaptive Card rendering in the playground may differ slightly from the Teams client. Complex card layouts should be verified in Teams.

## references

- [Test with Agents Playground](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/debug-overview)
- [ATK preview command](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/toolkit-cli)
- [Local debug overview](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/debug-overview)
- [Agents Toolkit VS Code extension](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/install-teams-toolkit)

## instructions

Do a web search for:

- "Microsoft 365 Agents Playground local testing Teams bot 2025"
- "atk preview Agents Playground configuration"
- ".m365agentsplayground.yml configuration options"

Pair with:
- `../experts/teams/dev.debug-test-ts.md` — broader debugging and testing patterns
- `lifecycle-cli.md` — `atk preview` is part of the CLI command set
- `environments.md` — playground uses environment-specific config
- `../experts/teams/runtime.app-init-ts.md` — bot entry point that playground connects to

## research

Deep Research prompt:

"Write a micro expert on Microsoft 365 Agents Playground for testing Teams bots locally (TypeScript). Cover what the playground is, how to start it (atk preview, VS Code command), .m365agentsplayground.yml configuration, testing capabilities (messages, card actions, activity simulation), limitations vs real Teams client (no SSO, no message extensions, no task modules), hot reload workflow, and environment-specific preview. Include canonical patterns for: starting the playground, playground config file, local dev workflow with concurrent bot server and playground."
