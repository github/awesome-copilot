# Test in Microsoft Teams

Test your app by sideloading it directly into Microsoft Teams.

> **Required for:** declarative agents, API plugins, message extensions in Teams, Copilot extensions.

## Prerequisites

- Microsoft 365 developer account with sideloading enabled
- devtunnel (install: `winget install Microsoft.devtunnel` or `brew install --cask devtunnel`)

## Step 1: Start devtunnel (background terminal)

```bash
devtunnel login
devtunnel create --allow-anonymous
devtunnel host -p 3978 --allow-anonymous
```

Copy the tunnel URL (e.g., `https://xxxxx.devtunnels.ms`).

## Step 2: Set BOT_ENDPOINT

In `env/.env.local`:
```
BOT_ENDPOINT=https://xxxxx.devtunnels.ms
```

## Step 3: Provision + Deploy locally

```bash
atk provision --env local -i false
atk deploy --env local -i false
```

## Step 4: Start bot server (background terminal)

```bash
npm run dev
```

Wait for "listening on port 3978".

## Step 5: Sideload to Teams

```bash
atk install --file-path ./appPackage/build/appPackage.local.zip -i false
```

Or open Teams → Apps → Manage your apps → Upload an app → select the zip.

## Step 6: Test in Teams

Open Teams, find your app in the list, and start chatting.

## For Declarative Agents

After provisioning:
1. Go to Microsoft 365 Copilot
2. Click the plugin icon (bottom right)
3. Find your agent and enable it
4. Chat with your declarative agent

## Notes

- Keep devtunnel and bot server running during testing
- If Teams shows "Unable to connect": verify `BOT_ENDPOINT` matches your tunnel URL
- For Copilot testing, ensure your M365 tenant has Copilot licenses
