---
name: mcp-configure
description: Configure an MCP server for GitHub Copilot or Claude with your Dataverse environment.
---

# Configure Dataverse MCP for GitHub Copilot or Claude

This skill configures the Dataverse MCP server for GitHub Copilot or Claude with your organization's environment URL. Each organization is registered with a unique server name based on the org identifier (e.g., `DataverseMcporgbc9a965c`). If the user provided a URL it is: $ARGUMENTS.

## Instructions

### 0. Ask which tool to configure

Ask the user which tool they want to configure the Dataverse MCP server for:

> Which tool would you like to configure the Dataverse MCP server for?
> 1. **GitHub Copilot**
> 2. **Claude**

Based on their choice, set the `TOOL_TYPE` variable to either `copilot` or `claude`. Store this for use in all subsequent steps.

### 0b. Ask for MCP scope

Ask the user for the configuration scope based on their tool choice.

**If TOOL_TYPE is `copilot`:**

> Would you like to configure the Dataverse MCP server:
> 1. **Globally** (available in all projects)
> 2. **Project-only** (available only in this project)

Based on their choice, set the `CONFIG_PATH` variable:
- **Global**: `~/.copilot/mcp-config.json` (use the user's home directory)
- **Project**: `.mcp/copilot/mcp.json` (relative to the current working directory)

Store this path for use in steps 1 and 6.

**If TOOL_TYPE is `claude`:**

> Would you like to configure the Dataverse MCP server:
> 1. **User** (available in all projects for this user)
> 2. **Project** (available only in this project)
> 3. **Local** (scoped to current project directory)

Based on their choice, set the `CLAUDE_SCOPE` variable:
- **User**: `CLAUDE_SCOPE` = `user`
- **Project**: `CLAUDE_SCOPE` = `project`
- **Local**: `CLAUDE_SCOPE` = `local`

Store this value for use in step 6.

### 1. Check already-configured MCP servers

**If TOOL_TYPE is `copilot`:**

Read the MCP configuration file at `CONFIG_PATH` (determined in step 0b) to check for already-configured servers.

The configuration file is a JSON file with the following structure:

```json
{
  "mcpServers": {
    "ServerName1": {
      "type": "http",
      "url": "https://example.com/api/mcp"
    }
  }
}
```

Or it may use `"servers"` instead of `"mcpServers"` as the top-level key.

Extract all `url` values from the configured servers and store them as `CONFIGURED_URLS`. For example:

```json
["https://orgfbb52bb7.crm.dynamics.com/api/mcp"]
```

If the file doesn't exist or is empty, treat `CONFIGURED_URLS` as empty (`[]`). This step must never block the skill.

**If TOOL_TYPE is `claude`:**

Skip this step - Claude uses CLI commands to manage MCP servers, so we don't need to check existing configuration.

### 2. Ask how to get the environment URL

Ask the user:

> How would you like to provide your Dataverse environment URL?
> 1. **Auto-discover** — List available environments from your Azure account (requires Azure CLI)
> 2. **Manual entry** — Enter the URL directly

Based on their choice:
- If **Auto-discover**: Proceed to step 2a
- If **Manual entry**: Skip to step 2b

### 2a. Auto-discover environments

**Check prerequisites:**
- Verify Azure CLI (`az`) is installed (check with `which az` or `where az` on Windows)
- If not installed, inform the user and fall back to step 2b

**Make the API call:**

1. Check if the user is logged into Azure CLI:
   ```bash
   az account show
   ```
   If this fails, prompt the user to log in:
   ```bash
   az login
   ```

2. Get an access token for the Power Apps API:
   ```bash
   az account get-access-token --resource https://service.powerapps.com/ --query accessToken --output tsv
   ```

3. Call the Power Apps API to list environments:
   ```
   GET https://api.powerapps.com/providers/Microsoft.PowerApps/environments?api-version=2016-11-01
   Authorization: Bearer {token}
   Accept: application/json
   ```

4. Parse the JSON response and filter for environments where `properties?.linkedEnvironmentMetadata?.instanceUrl` is not null.

5. For each matching environment, extract:
   - `properties.displayName` as `displayName`
   - `properties.linkedEnvironmentMetadata.instanceUrl` (remove trailing slash) as `instanceUrl`

6. Create a list of environments in this format:
   ```json
   [
     { "displayName": "My Org (default)", "instanceUrl": "https://orgfbb52bb7.crm.dynamics.com" },
     { "displayName": "Another Env", "instanceUrl": "https://orgabc123.crm.dynamics.com" }
   ]
   ```

**If the API call succeeds**, proceed to step 3.

**If the API call fails** (user not logged in, network error, no environments found, or any other error), tell the user what went wrong and fall back to step 2b.

### 2b. Manual entry — ask for the URL

Ask the user to provide their environment URL directly:

> Please enter your Dataverse environment URL.
>
> Example: `https://myorg.crm10.dynamics.com`
>
> You can find this in the Power Platform Admin Center under Environments.

Then skip to step 4.

### 3. Ask the user to select an environment

Present the environments as a numbered list. For each environment, check whether any URL in `CONFIGURED_URLS` starts with that environment's `instanceUrl` — if so, append **(already configured)** to the line.

> I found the following Dataverse environments on your account. Which one would you like to configure?
>
> 1. My Org (default) — `https://orgfbb52bb7.crm.dynamics.com` **(already configured)**
> 2. Another Env — `https://orgabc123.crm.dynamics.com`
>
> Enter the number of your choice, or type "manual" to enter a URL yourself.

If the user selects an already-configured environment, confirm that they want to re-register it (e.g. to change the endpoint type) before proceeding.

If the user types "manual", fall back to step 2b.

### 4. Confirm the selected URL

Take the `instanceUrl` from the chosen environment (or the manually entered URL) and strip any trailing slash. This is `USER_URL` for the remainder of the skill.

### 5. Confirm if the user wants "Preview" or "Generally Available (GA)" endpoint

Ask the user:

> Which endpoint would you like to use?
> 1. **Generally Available (GA)** — `/api/mcp` (recommended)
> 2. **Preview** — `/api/mcp_preview` (latest features, may be unstable)

Based on their choice:
- If **GA**: set `MCP_URL` to `{USER_URL}/api/mcp`
- If **Preview**: set `MCP_URL` to `{USER_URL}/api/mcp_preview`

### 6. Register the MCP server

**If TOOL_TYPE is `copilot`:**

Update the MCP configuration file at `CONFIG_PATH` (determined in step 0b) to add the new server.

**Generate a unique server name** from the `USER_URL`:
1. Extract the subdomain (organization identifier) from the URL
   - Example: `https://orgbc9a965c.crm10.dynamics.com` → `orgbc9a965c`
2. Prepend `DataverseMcp` to create the server name
   - Example: `DataverseMcporgbc9a965c`

This is the `SERVER_NAME`.

**Update the configuration file:**

1. If `CONFIG_PATH` is for a **project-scoped** configuration (`.mcp/copilot/mcp.json`), ensure the directory exists first:
   ```bash
   mkdir -p .mcp/copilot
   ```

2. Read the existing configuration file at `CONFIG_PATH`, or create a new empty config if it doesn't exist:
   ```json
   {}
   ```

3. Determine which top-level key to use:
   - If the config already has `"servers"`, use that
   - Otherwise, use `"mcpServers"`

4. Add or update the server entry:
   ```json
   {
     "mcpServers": {
       "{SERVER_NAME}": {
         "type": "http",
         "url": "{MCP_URL}"
       }
     }
   }
   ```

5. Write the updated configuration back to `CONFIG_PATH` with proper JSON formatting (2-space indentation).

**Important notes:**
- Do NOT overwrite other entries in the configuration file
- Preserve the existing structure and formatting
- If `SERVER_NAME` already exists, update it with the new `MCP_URL`

**If TOOL_TYPE is `claude`:**

Generate the CLI command for the user to run. Do NOT edit any configuration files.

**Generate a unique server name** from the `USER_URL`:
1. Extract the subdomain (organization identifier) from the URL
   - Example: `https://orgbc9a965c.crm10.dynamics.com` → `orgbc9a965c`
2. Use lowercase format: `dataverse-{orgid}`
   - Example: `dataverse-orgbc9a965c`

This is the `SERVER_NAME`.

**Build the command:**

Construct the command based on `CLAUDE_SCOPE` and whether the user chose GA or Preview endpoint:

```
claude mcp add --scope {CLAUDE_SCOPE} {SERVER_NAME} -t stdio -- npx -y @microsoft/dataverse@latest mcp "{USER_URL}" {ENDPOINT_FLAG}
```

Where:
- `{CLAUDE_SCOPE}` is `user`, `project`, or `local` (from step 0b)
- `{SERVER_NAME}` is the generated server name (e.g., `dataverse-orgbc9a965c`)
- `{USER_URL}` is the base environment URL (e.g., `https://orgbc9a965c.crm10.dynamics.com`)
- `{ENDPOINT_FLAG}` is `--preview` if the user chose Preview endpoint in step 5, otherwise omit this flag

**Example commands:**
- GA endpoint with user scope: `claude mcp add --scope user dataverse-orgbc9a965c -t stdio -- npx -y @microsoft/dataverse@latest mcp "https://orgbc9a965c.crm10.dynamics.com"`
- Preview endpoint with project scope: `claude mcp add --scope project dataverse-orgbc9a965c -t stdio -- npx -y @microsoft/dataverse@latest mcp "https://orgbc9a965c.crm10.dynamics.com" --preview`

Store this command as `CLAUDE_COMMAND` for use in step 7.

Proceed to step 7.

### 7. Confirm success and provide next steps

**If TOOL_TYPE is `copilot`:**

Tell the user:

> ✅ Dataverse MCP server configured for GitHub Copilot at `{MCP_URL}`.
>
> Configuration saved to: `{CONFIG_PATH}`
>
> **IMPORTANT: You must restart your editor for the changes to take effect.**
>
> Restart your editor or reload the window, then you will be able to:
> - List all tables in your Dataverse environment
> - Query records from any table
> - Create, update, or delete records
> - Explore your schema and relationships

**If TOOL_TYPE is `claude`:**

Display the command for the user to run:

> To install the Dataverse MCP server, exit claude and run:
>
> ```
> {CLAUDE_COMMAND}
> ```
>
> **Optional: Validate your authentication setup first**
>
> Before running the install command, you can optionally verify your Dataverse authentication is configured correctly by running:
>
> ```
> npx -y @microsoft/dataverse@latest mcp "{USER_URL}" --validate
> ```
>
> This command will check your authentication and print any error information if issues are found.
>
> Then restart Claude Code.
>
> After restarting, you will be able to:
> - List all tables in your Dataverse environment
> - Query records from any table
> - Create, update, or delete records
> - Explore your schema and relationships

### 8. Troubleshooting

If something goes wrong, help the user check:

- The URL format is correct (`https://<org>.<region>.dynamics.com`)
- They have access to the Dataverse environment
- The environment URL matches what's shown in the Power Platform Admin Center
- Their Environment Admin has enabled "Dataverse CLI MCP" in the Allowed Clients list
- Their Environment has Dataverse MCP enabled, and if they're trying to use the preview endpoint that is enabled
- **If TOOL_TYPE is `copilot`:**
  - For project-scoped configuration, ensure the `.mcp/copilot/mcp.json` file was created successfully
  - For global configuration, check permissions on the `~/.copilot/` directory
- **If TOOL_TYPE is `claude`:**
  - Ensure the `claude` CLI is installed and available in their PATH
  - If the command fails, check that `npx` and `npm` are installed
  - After running the command, they must restart Claude Code for the changes to take effect
  - They can verify the installation with `claude mcp list --scope {CLAUDE_SCOPE}`