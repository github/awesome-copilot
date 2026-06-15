# Manual Testing with Agents Playground

Test your bot interactively using the Microsoft 365 Agents Playground — a web-based sandbox that requires no M365 account, Azure tunnel, or app registration.

## Installation

**Windows:**
```powershell
winget install agentsplayground
```

**Linux:**
```bash
curl -LO https://github.com/OfficeDev/microsoft-365-agents-toolkit/releases/download/microsoft-365-agents-playground%400.2.23/agentsplayground-linux-x64.zip
unzip agentsplayground-linux-x64.zip agentsplayground
chmod +x agentsplayground
sudo mv agentsplayground /usr/local/bin/
```

**npm:**
```bash
npm install -g @microsoft/m365agentsplayground
```

## Quick Start

```bash
# 1. For ATK projects, deploy playground config first
atk deploy --env playground -i false

# 2. Start your bot service (this will HANG the terminal — expected!)
# Run as a background process since the server keeps running
cd my-bot
npm run dev:teamsfx:playground  # For ATK projects
# npm run dev                   # For customized projects

# 3. Use a NEW/separate terminal to start Agents Playground
agentsplayground -e http://localhost:3978/api/messages -c msteams
```

**Note:** The bot service start command keeps running and will not return to the prompt. This is expected — the server must stay running. Always start the service in a background terminal, then verify it started by checking the output for "listening on port" or "server started". Use a **new terminal** for Agents Playground.

## CLI Options

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--app-endpoint` | `-e` | Recommended | Bot endpoint URL (e.g., http://localhost:3978/api/messages) |
| `--channel-id` | `-c` | Optional | Channel to emulate: msteams, emulator, webchat, directline |
| `--port` | `-p` | Optional | Server port (default: 56150, auto-fallback if occupied) |
| `--client-id` | `--cid` | Optional | Azure app client ID (for authenticated agents) |
| `--client-secret` | `--cs` | Optional | Azure app client secret (for authenticated agents) |
| `--tenant-id` | `--tid` | Optional | Azure tenant ID for authentication |
| `--enable-events-recording` | `--er` | Optional | Enable events recording (default: false) |

## Examples

```bash
# Basic start with Teams channel
agentsplayground -e http://localhost:3978/api/messages -c msteams

# With authentication
agentsplayground -e http://localhost:3978/api/messages -c emulator \
  --client-id <CLIENT_ID> \
  --client-secret <CLIENT_SECRET> \
  --tenant-id <TENANT_ID>

# Test different channels
agentsplayground -e http://localhost:3978/api/messages -c webchat
agentsplayground -e http://localhost:3978/api/messages -c emulator
```

## Features

- **No Setup Required**: Works with HTTP localhost endpoints
- **Adaptive Card Preview**: See how cards render in Teams
- **Chat Interface**: Simulate user messages and bot responses
- **Context Mocking**: Mock Teams APIs (team members, channels, etc.)
- **Message Inspection**: View request/response payloads in real-time

## Limitations

- Application manifest not processed (command menus unavailable)
- Some Adaptive Card features unsupported (people picker, user mentions, stage view)
- SSO not supported
- Only Adaptive Cards supported (not Hero/Thumbnail cards)

## Configuration File

Create `.m365agentsplayground.yml` in project root to mock Teams context:

```yaml
version: "0.1.1"
tenantId: 00000000-0000-0000-0000-0000000000001
bot:
  id: 00000000-0000-0000-0000-00000000000011
  name: Test Bot
currentUser:
  id: user-id-0
  name: Alex Wilber
  email: alexw@example.com
users:
  - id: user-id-1
    name: Megan Bowen
    email: meganb@example.com
personalChat:
  id: personal-chat-id
groupChat:
  id: group-chat-id
team:
  id: team-id
  name: My Team
  channels:
    - id: channel-announcements-id
      name: Announcements
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BOT_ENDPOINT` | Bot endpoint URL |
| `DEFAULT_CHANNEL_ID` | Channel type (emulator, webchat, msteams) |
| `AUTH_CLIENT_ID` | Azure app client ID for authentication |
| `AUTH_CLIENT_SECRET` | Azure app client secret for authentication |
| `AUTH_TENANT_ID` | Azure tenant ID for authentication |

## References

- For project file details → [../toolkit/manifest-and-yaml.md](../toolkit/manifest-and-yaml.md)
- If something goes wrong → [../troubleshoot/troubleshoot.md](../troubleshoot/troubleshoot.md)
- To test on real Teams instead → [../test-teams/test-teams.md](../test-teams/test-teams.md)
- For automated/CI testing → [playground-cli.md](playground-cli.md)
