---
name: now-sdk-setup
description: Configure the environment so now-sdk explain is usable. Run before now-sdk-explain if the command is not found or returns errors.
---

## Step 1: Check Node version

Run `node --version`.

Node 20 or higher is required. If the version is below 20, run:

```bash
nvm install 20
nvm use 20
```

Then re-check `node --version` to confirm before continuing. If there is no node version found, or they don't have nvm, ask them to install node and nvm and then run the command again.

## Step 2: Check @servicenow/sdk installation and version

Run `npx @servicenow/sdk --version` to check the installed version.

- If `@servicenow/sdk` is not found, install it using `npm install -g @servicenow/sdk@latest`.
- If the version is below **4.6.0**, update it using `npm install -g @servicenow/sdk@latest`. Version 4.6.0 is the minimum that supports the `explain` command via `npx`.
- If the version is 4.6.0 or higher, the SDK is ready. Proceed to the next step.

Verify by running `npx @servicenow/sdk explain quickstart --list --format=raw`. If it succeeds, setup is complete.
