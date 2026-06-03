# Slack to Teams Migration

Migrate a Slack bot to Microsoft Teams using the Microsoft 365 Agents Toolkit.

## Overview

The migration converts:
- Slack Bolt app → Teams Bot Framework app
- Block Kit UI → Adaptive Cards
- Slack slash commands → Teams message extensions or bot commands
- Slack events → Teams bot activities

## Full Skill

The complete Slack-to-Teams migration skill with 100+ expert files is available at:  
[`OfficeDev/microsoft-365-agents-toolkit` — slack-to-teams](https://github.com/OfficeDev/microsoft-365-agents-toolkit/tree/dev/packages/vscode-extension/skills/microsoft-365-agents-toolkit/slack-to-teams)

## Quick Start: Scaffold Teams Project

```bash
# Start with a Teams bot template
atk new -c bot -l typescript -n my-teams-bot -f /tmp -i false
mv /tmp/my-teams-bot/. .
rmdir /tmp/my-teams-bot
npm install
```

## Key Mapping

| Slack | Teams |
|-------|-------|
| `app.message()` | `app.activity('message', handler)` |
| `app.command('/cmd')` | Bot command handler or message extension |
| Block Kit JSON | Adaptive Card JSON |
| `say({ blocks: [...] })` | `activity.reply({ attachments: [adaptiveCard] })` |
| Socket Mode | HTTPS endpoint (via devtunnel for dev) |
| Slack OAuth | AAD SSO (via `teamsApp/create` + `aadApp/create`) |
| `SLACK_BOT_TOKEN` | `BOT_ID` + `BOT_PASSWORD` in `.localConfigs` |

## Block Kit → Adaptive Card Conversion

For a quick conversion, describe your Block Kit JSON to the AI and ask it to convert to an Adaptive Card. Key patterns:

- `section` with `text` → `TextBlock`
- `actions` with `button` → `ActionSet` with `Action.Submit`
- `input` block → `Input.Text` or `Input.ChoiceSet`
- `image` block → `Image`

## Notes

- Teams bots use Bot Framework activities (Activity, TurnContext)
- Authentication: replace Slack OAuth with Microsoft AAD (SSO or OAuth cards)
- Proactive messaging: use `continueConversation` instead of Slack's `chat.postMessage`
