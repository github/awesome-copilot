# Test on Teams

Test your agent in the actual Microsoft Teams environment. Requires M365 account and HTTPS endpoint.

**Use this when user explicitly asks to run on Teams.** For quick local testing, recommend [Agents Playground](../test-playground/test-playground.md) first.

## Requirements

- Microsoft 365 account with sideloading enabled
- HTTPS endpoint (for bots, dev tunnels must be started first)

## Quick Start (Bot Projects)

### Step 1: Start devtunnel

```bash
# CRITICAL: devtunnel host NEVER exits on its own — MUST use isBackground=true
# It is a persistent tunnel process that runs until manually killed
devtunnel host -p 3978 --allow-anonymous
# After starting, check terminal output for the tunnel URL
# Copy the tunnel URL and set BOT_ENDPOINT in env/.env.local before provisioning
```

### Step 2: Provision and deploy

```bash
atk provision --env local -i false
atk deploy --env local -i false
```

### Step 3: Start your local service

```bash
# This will HANG the terminal — expected!
# Run as a background process (isBackground=true) since the server keeps running
# Check package.json scripts for the appropriate start command:
# - If project uses .localConfigs: use `npm run dev:teamsfx` or equivalent
# - If project uses .env directly: use `npm run dev` or `npm start`
# Common patterns: npm run dev:teamsfx, npm run dev, npm start, python app.py, dotnet run
```

### Step 4: Open Teams

```bash
# Use a NEW/separate terminal!
# Get TEAMS_APP_ID and TENANT_ID from env/.env.local
# Open: https://teams.microsoft.com/l/app/${{TEAMS_APP_ID}}?installAppPackage=true&webjoin=true&appTenantId=${{TENANT_ID}}&login_hint=${{USER_EMAIL}}
```

## Quick Start (Declarative Agents — No Backend)

```bash
# Just provision/deploy and open directly
atk provision --env local -i false
atk deploy --env local -i false
# Then open Teams and find your agent in the app list
```

## Opening in Different Hosts

Get your app IDs from `env/.env.local`, then open:

| Host | URL |
|------|-----|
| Teams web | `https://teams.microsoft.com/l/app/${{TEAMS_APP_ID}}?installAppPackage=true&webjoin=true&appTenantId=${{TENANT_ID}}&login_hint=${{USER_EMAIL}}` |
| Outlook web | `https://outlook.office.com/host/${{M365_APP_ID}}` |
| Office web | `https://www.office.com/m365apps/${{M365_APP_ID}}` |

## Declarative Agents in M365 Copilot

Declarative agents use `M365_APP_ID` (not `TEAMS_APP_ID`), acquired after `teamsApp/extendToM365` runs during provisioning.

**Sideloading URL format:**
```
https://m365.cloud.microsoft/chat/entity1-d870f6cd-4aa5-4d42-9626-ab690c041429/${agent-hint}?auth=2&developerMode=Basic
```

Where `${agent-hint}` is Base64-encoded JSON:
```json
{"id": "${M365_APP_ID}", "scenario": "launchcopilotextension", "properties": {"clickTimestamp": "2/6/2026, 10:30:45 AM"}, "version": 1}
```

## Dev Tunnels for Bots

**IMPORTANT**: For bot projects, you must start a public devtunnel BEFORE provisioning.

The tunnel must be public/anonymous so Teams can reach your bot:
```bash
# CRITICAL: devtunnel host NEVER exits on its own — MUST use isBackground=true
# It is a persistent tunnel process that runs until manually killed
devtunnel host -p 3978 --allow-anonymous
```

Then set `BOT_ENDPOINT` in `env/.env.local` with the tunnel URL before running `atk provision`.

## Comparison: Playground vs Teams

| Feature | Agents Playground | Teams Direct Launch |
|---------|-------------------|---------------------|
| Setup complexity | Simple | Requires provisioning |
| M365 account needed | No | Yes |
| HTTPS required | No | Yes (for bots) |
| Real Teams environment | No (simulated) | Yes |
| SSO testing | No | Yes |
| Speed | Fast | Slower (tunnel setup) |
| Recommended for | Testing first (recommended) | When user explicitly asks to run on Teams |

## References

- For project file details → see [../toolkit/manifest-and-yaml.md](../toolkit/manifest-and-yaml.md)
- If something goes wrong → see [../troubleshoot/troubleshoot.md](../troubleshoot/troubleshoot.md)

## Expert Deep Dives

> **Applies to: code-based Teams bots/agents only.**
>
> For **declarative agents** and **API plugins**, the experts below do not apply — there is no bot endpoint, no devtunnel, no `App` constructor, and no SDK auth. Use the "Declarative Agents in M365 Copilot" section above (sideloading via `M365_APP_ID`) and consult the [Microsoft 365 Copilot extensibility docs](https://learn.microsoft.com/microsoft-365-copilot/extensibility/) for capability-specific guidance (instructions, knowledge, conversation starters, action authentication).

| Topic | Expert |
|---|---|
| Sideloading URL anatomy, devtunnel, `TENANT_ID`/`TEAMS_APP_TENANT_ID` mapping, `skipAuth` | [../experts/teams/dev.debug-test-ts.md](../experts/teams/dev.debug-test-ts.md) |
| Teams app manifest schema (scopes, valid domains, webApplicationInfo) | [../experts/teams/runtime.manifest-ts.md](../experts/teams/runtime.manifest-ts.md) |
| OAuth/SSO flow for in-Teams sign-in scenarios | [../experts/teams/auth.oauth-sso-ts.md](../experts/teams/auth.oauth-sso-ts.md) |
