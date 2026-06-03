# Test with Agents Playground

Test your bot locally using the Microsoft 365 Agents Playground. No M365 account, Azure tunnel, or app registration required.

> **Applies to: code-based Teams bots/agents only.**  
> Declarative agents must be tested in M365 Copilot via [test-teams.md](test-teams.md).

## Step 1: Install dependencies

```bash
cd <project-folder>
npm install
```

## Step 2: Start the bot server (background terminal)

```bash
# This hangs — run as background process
npm run dev
# or: node index.js  /  python app.py
```

Wait for: `Bot started listening on port 3978` (or similar).

## Step 3: Provision locally

```bash
atk provision --env local -i false
```

After provisioning, verify `TENANT_ID` is in `.localConfigs`:

```bash
grep TENANT_ID .localConfigs
# If missing, copy from env/.env.local:
grep TENANT_ID env/.env.local
# Then add TENANT_ID=<value> to .localConfigs manually
```

## Step 4: Launch Agents Playground (new terminal)

```bash
npx @microsoft/agents-playground
```

Or if installed globally: `agentsplayground`

Open the URL shown (usually `http://localhost:4000`).

## Step 5: Configure and chat

1. In the playground, set Bot URL: `http://localhost:3978/api/messages`
2. Click **Connect**
3. Send a message to test

## Notes
- Keep bot server running in background
- If bot doesn't respond: check `.localConfigs` for `TENANT_ID`, check bot server logs
- For automated/CI testing: use `TestClient` or `ConversationServer` from the Playground CLI
