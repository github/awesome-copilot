---
name: katalon-platform-setup
description: Set up, verify, and troubleshoot Katalon True Platform/TestOps MCP connectivity for any AI coding agent. Use when you need to install or configure the Katalon MCP server, connect to a Katalon platform account, verify available Katalon MCP tools, diagnose missing authentication or repository access, confirm project/repository discovery, or explain what platform operations are and are not exposed through the MCP. One-time cross-cutting setup, run once by whoever wires the agent to the platform, before any lifecycle skill can work.
---

# Katalon Platform Setup

Use this skill for Katalon MCP installation, connection, and readiness checks. Do not use it for designing or running tests unless the setup check leads directly into `katalon-create-test-cases`, `katalon-execute-test`, or the larger `katalon-true-platform-testing` skill.

This skill is agent-neutral. The Katalon MCP server is the same for every agent (Claude Code, Codex, Copilot, Cursor, Kiro, Windsurf, and others); only the config file location and format differ per agent. For the exact per-agent config path and snippet, read the repository `README.md` install section.

## Setup Boundary

Be explicit about what can be verified from the current environment:

- Available through Katalon MCP once connected: project/repository discovery, requirement reads, test case/suite operations, manual runs, AI sessions, automated scheduling, results, metrics, and ALM-linked defects.
- Not directly available through Katalon MCP: create requirements, create a formal Test Plan entity, inspect live AUT pages, or guarantee AI execution completion.
- If no Katalon MCP tools are exposed in the current session, do not claim the platform is connected.

Read `references/capability-boundaries.md` when explaining available operations.

## Required Setup Inputs

For setup requests, collect the minimum routing and authentication choices before writing or testing MCP config:

1. Resolve the Katalon MCP endpoint:
   - Default to the canonical endpoint `https://platform.katalon.io/mcp`. It serves every workspace and presents a picker after sign-in, so do not ask for a subdomain unless something below applies.
   - If the installed config still contains the `<your.sub.domain>` placeholder, replace it with the canonical endpoint rather than asking the user to fill it in.
   - Only ask for a domain when the user names a dedicated Katalon domain, or when the local config mentions more than one Katalon domain - then list the candidates and ask which one they want.
   - Normalize a bare subdomain to `https://<sub>.katalon.io/mcp`.
2. Ask how the user wants to authenticate when auth is required:
   - Browser OAuth flow with an agent restart/reload after login.
   - CLI/local `mcp-remote` login bootstrap.
   - Login email/account label only for account selection.
3. Never ask for passwords, API tokens, cookies, JWTs, MFA codes, or OAuth callback URLs in chat. If the user offers "login information", accept only non-secret routing details such as login email, organization, domain, project name, or repository/Test Project name.
4. After authentication succeeds and Katalon tools are available, call `list_projects`. If more than one project is returned, list the projects and ask which project to use before calling repository-specific tools.
5. After project selection, call `list_repositories` with the selected `project_id`. If more than one repository/Test Project is returned and none is clearly implied by the user's request, list the repositories and ask which one to use.

## Connection Check

Start every setup/debugging request with a non-destructive check:

1. Follow "Required Setup Inputs" first when the endpoint, domain, or auth route is not already resolved.
2. Search for Katalon/TestOps MCP tools using the agent's tool discovery mechanism.
3. If tools exist, call `list_projects`.
4. If multiple projects are returned, list them and ask which project to use.
5. Call `list_repositories` with the selected or only `project_id` after projects are available.
6. If multiple repositories/Test Projects are returned and no repository is clearly implied, list them and ask which repository/Test Project to use.
7. Confirm at least one project and repository/Test Project can be discovered.
8. If a requirement key or repo name is provided, verify access by searching or reading that target.

If Katalon tools are not exposed in the active agent session, do not stop at "reload required" yet. First try the local proxy bootstrap in "MCP Remote OAuth Bootstrap" below. A successful bootstrap proves the account and endpoint are usable even if the current agent's MCP host has not reloaded the server list.

Report the exact boundary:

- Connected and usable.
- MCP tools exposed but auth/access failed.
- MCP works through local `mcp-remote` proxy, but tools are not exposed in the current agent session.
- MCP tools missing from the session and local proxy bootstrap failed or could not be attempted.
- Project exists but repository/Test Project cannot be resolved.

## Install Or Configure MCP

When MCP tools are missing:

1. Inspect local agent/plugin context for an existing Katalon MCP install path or configuration.
2. If the config still contains a `<your.sub.domain>` placeholder, replace it with `https://platform.katalon.io/mcp`. Never leave a placeholder in an active user config.
3. Prefer a native remote MCP entry. Agents that speak remote MCP directly (Claude Code, Copilot/VS Code, Copilot CLI, Cursor) need only the endpoint and run the browser OAuth flow themselves:

   ```json
   { "mcpServers": { "katalon-prod-mcp": { "type": "http", "url": "https://platform.katalon.io/mcp" } } }
   ```

   See the bundled `.mcp.json` for the canonical shape.
4. Fall back to the `mcp-remote` wrapper only for agents without native remote-MCP support (Kiro, Continue, Codex):

   ```sh
   npx -y mcp-remote https://platform.katalon.io/mcp --transport http-first
   ```

   - Codex declares the same command/args in TOML under `[mcp_servers.katalon-prod-mcp]`.
   - For the exact file path per agent, read the repository `README.md` install section.
5. If the install command, package name, or server URL is not present in local context, use official Katalon-provided setup instructions or ask the user for the MCP package/source. Do not invent install commands.
6. Configure only the minimum required MCP server entry for the user's agent environment.
7. Store secrets using the environment's secret mechanism or environment variables. Never write access tokens, passwords, cookies, or raw auth callback URLs into repo files, skill files, logs, or final answers.
8. Re-run the connection check. Restart or reload the MCP host only if Katalon works through the local proxy but the current agent session still does not expose the tools.

If the user explicitly asks to install but the environment does not permit plugin/MCP installation from the current session, give the exact missing prerequisite and the safest next step.

## MCP Remote OAuth Bootstrap

Use this when Katalon MCP tools are missing from the active session or direct remote MCP config returns `401 Invalid JWT token format`.

1. Ask only for non-secret information needed to target the right server or verify access, such as:
   - Katalon MCP URL, only if the user is on a dedicated domain rather than the canonical `https://platform.katalon.io/mcp`.
   - Project name or project ID.
   - Repository/Test Project name, if the user wants a specific target verified.
   - Login email, only if it helps the user choose the right account in the browser.
2. Do not ask the user to paste passwords, API tokens, cookies, JWTs, or OAuth callback URLs into chat. If authentication is needed, trigger the browser-based OAuth flow and have the user complete login in the browser.
3. Run the proxy with the Katalon endpoint:

   ```sh
   npx -y mcp-remote "https://platform.katalon.io/mcp" --transport http-first
   ```

   If this prints an authorization URL or opens the browser, wait for the user/browser callback to complete. `mcp-remote` stores OAuth state under its own auth cache, such as `~/.mcp-auth`, not in the workspace.

4. Verify through a local MCP client, if Katalon tools are still not exposed through the agent's tool discovery:
   - `listTools` should include `list_projects` and `list_repositories`.
   - Call `list_projects`.
   - Call `list_repositories` with the exact schema field `project_id`.
5. If local proxy verification succeeds but the agent's tool discovery still does not expose Katalon tools, report that MCP is authenticated and usable through `mcp-remote`, but the active agent host needs a reload/new session/new thread to expose the tools natively.

Known working MCP server entries. Prefer the native form; use the `mcp-remote` form only where the agent cannot reach a remote server directly (Codex uses the same command/args in TOML):

```json
{
  "mcpServers": {
    "katalon-prod-mcp": { "type": "http", "url": "https://platform.katalon.io/mcp" }
  }
}
```

```json
{
  "mcpServers": {
    "katalon-prod-mcp": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://platform.katalon.io/mcp", "--transport", "http-first"]
    }
  }
}
```

Known verification observations:

- `mcp-remote` may say `Invalid JWT token format` before OAuth completes; treat this as an auth challenge, not proof the server is unavailable.
- The valid transport strategy is `http-first` or `http-only`; `http` can be rejected by `mcp-remote`.
- `list_repositories` expects `project_id`, not `projectId`.

## Authentication And Access

When tools exist but calls fail:

- Treat 401/403-style failures as auth or account-scope problems.
- Ask the user to authenticate through the platform's secure browser flow. Never ask them to paste secrets into normal chat when a secure mechanism exists.
- You may ask for non-secret account routing details, such as subdomain, project ID/name, repository name, and login email. The user should enter passwords/SSO/MFA only in the browser or secure credential flow.
- If multiple authenticated Katalon domains are available, ask which domain to use before selecting projects.
- If multiple projects are available, list the project names/IDs and ask which project to use before listing repositories.
- If multiple repositories/Test Projects are available, list them and ask which repository/Test Project to use unless the user's request clearly names one.
- For empty project/repository results, verify account membership, organization, project role, and repository/Test Project access.
- For requirement lookup failures, verify that Jira/Azure sync exists and the requirement key belongs to the connected project.

## Handoff

After setup is verified:

- Use `katalon-create-test-cases` for requirement or free-text test design/import.
- Use `katalon-execute-test` for running an existing case or suite.
- Use `katalon-true-platform-testing` for end-to-end flows that include requirement analysis, case creation, suite management, execution, AI polling, and result reporting.
