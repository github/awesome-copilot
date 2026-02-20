---
name: Dataverse MCP setup
description: Configure an MCP server for GitHub Copilot with your Dataverse environment.
---

# Setup Dataverse MCP for GitHub Copilot

This skill configures the Dataverse MCP server for GitHub Copilot with your organization's environment URL. Each organization is registered with a unique server name based on the org identifier (e.g., `DataverseMcporgbc9a965c`). If the user provided a URL it is: $ARGUMENTS.

## Instructions

### 0. Check already-configured MCP servers

Check already-configured MCP servers by running the `get-configured` command:

```bash
python3 /path/to/skills/mcp-setup/mcp_setup.py get-configured
```

The script outputs a JSON array of MCP server URLs that are already registered in the Copilot configuration, for example:

```json
["https://orgfbb52bb7.crm.dynamics.com/api/mcp"]
```

Store this list as `CONFIGURED_URLS`. If the script fails for any reason, treat `CONFIGURED_URLS` as empty (`[]`) and continue — this step must never block the skill.

### 1. Fetch the list of Dataverse environments

Run the `mcp_setup.py` script with the `list-environments` command, located in the same directory as this skill file:

```bash
python3 /path/to/skills/mcp-setup/mcp_setup.py list-environments
```

The script uses the Azure CLI to authenticate and calls the Power Apps API to retrieve all environments where `databaseType` is `CommonDataService`. It outputs a JSON array to stdout:

```json
[
  { "displayName": "My Org (default)", "instanceUrl": "https://orgfbb52bb7.crm.dynamics.com" }
]
```

**If the script succeeds**, proceed to step 2.

**If the script fails** (Azure CLI not installed, Python not installed, user not logged in, network error, no environments found), tell the user what went wrong and fall back to step 1b.

### 1b. Fallback — ask for the URL manually

If step 1 failed, ask the user to provide their environment URL directly:

> Please enter your Dataverse environment URL.
>
> Example: `https://myorg.crm10.dynamics.com`
>
> You can find this in the Power Platform Admin Center under Environments.

Then skip to step 3.

### 2. Ask the user to select an environment

Present the environments as a numbered list. For each environment, check whether any URL in `CONFIGURED_URLS` starts with that environment's `instanceUrl` — if so, append **(already configured)** to the line.

> I found the following Dataverse environments on your account. Which one would you like to configure?
>
> 1. My Org (default) — `https://orgfbb52bb7.crm.dynamics.com` **(already configured)**
> 2. Another Env — `https://orgabc123.crm.dynamics.com`
>
> Enter the number of your choice, or type "manual" to enter a URL yourself.

If the user selects an already-configured environment, confirm that they want to re-register it (e.g. to change the endpoint type) before proceeding.

If the user types "manual", fall back to step 1b.

### 3. Confirm the selected URL

Take the `instanceUrl` from the chosen environment (or the manually entered URL) and strip any trailing slash. This is `USER_URL` for the remainder of the skill.

### 4. Confirm if the user wants "Preview" or "Generally Available (GA)" endpoint

If preview use `/api/mcp_preview`
If Generally Available (GA) use `/api/mcp`

When setting up the MCP configuration.

### 5. Register the MCP server

Run the `mcp_setup.py` script with the `configure` command. Pass the validated environment URL and the chosen endpoint type (`preview` or `ga`).

```bash
python3 /path/to/skills/mcp-setup/mcp_setup.py configure "USER_URL" "ENDPOINT_TYPE"
```

For example:
```bash
python3 /path/to/skills/mcp-setup/mcp_setup.py configure "https://org.crm.dynamics.com" "ga"
```

The script will merge a uniquely-named Dataverse entry (e.g., `DataverseMcporgbc9a965c`) into the Copilot `mcp-config.json` file without overwriting other entries. This allows you to configure multiple Dataverse organizations.

Interpret the exit code as follows:

- **Exit 0 — success.** Proceed to step 6.
- **Any other non-zero exit code — error.** Report the error output to the user and proceed to step 7 (Troubleshooting).

### 6. Confirm success and instruct restart

Tell the user:

> ✅ Dataverse MCP server configured for GitHub Copilot at `USER_URL`.
>
> **IMPORTANT: You must restart your editor for the changes to take effect.**
>
> Restart your editor or reload the window, then you will be able to:
> - List all tables in your Dataverse environment
> - Query records from any table
> - Create, update, or delete records
> - Explore your schema and relationships

### 7. Troubleshooting

If something goes wrong, help the user check:

- The URL format is correct (`https://<org>.<region>.dynamics.com`)
- They have access to the Dataverse environment
- The environment URL matches what's shown in the Power Platform Admin Center
- Their Environment Admin has enabled "Dataverse CLI MCP" in the Allowed Clients list
- Their Environment has Dataverse MCP enabled, and if they're trying to use the preview endpoint that is enabled.
