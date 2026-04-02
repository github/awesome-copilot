---
title: 'Understanding MCP Servers'
description: 'Learn how Model Context Protocol servers extend GitHub Copilot with access to external tools, databases, and APIs.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-04-01
estimatedReadingTime: '8 minutes'
tags:
  - mcp
  - tools
  - fundamentals
relatedArticles:
  - ./building-custom-agents.md
  - ./what-are-agents-skills-instructions.md
prerequisites:
  - Basic understanding of GitHub Copilot agents
---

GitHub Copilot's built-in tools—code search, file editing, terminal access—cover a wide range of tasks. But real-world workflows often need access to external systems: databases, cloud APIs, monitoring dashboards, or internal services. That's where MCP servers come in.

This article explains what MCP is, how to configure servers, and how agents use them to accomplish tasks that would otherwise require context-switching.

## What Is MCP?

The **Model Context Protocol (MCP)** is an open standard for connecting AI assistants to external data sources and tools. An MCP server is a lightweight process that exposes capabilities—called **tools**—that Copilot can invoke during a conversation.

Think of MCP servers as bridges:

```
GitHub Copilot  ←→  MCP Server  ←→  External System
                     (bridge)        (database, API, etc.)
```

**Key characteristics**:
- MCP is an open protocol, not specific to GitHub Copilot—it works across AI tools
- Servers run locally on your machine or in a container
- Each server exposes one or more tools with defined inputs and outputs
- Agents and users can invoke MCP tools naturally during conversation

### Built-in vs MCP Tools

GitHub Copilot provides several **built-in tools** that are always available:

| Built-in Tool | What It Does |
|--------------|--------------|
| `codebase` | Search and analyze code across the repository |
| `terminal` | Run shell commands in the integrated terminal |
| `edit` | Create and modify files in the workspace |
| `fetch` | Make HTTP requests to URLs |
| `search` | Search across workspace files |
| `github` | Interact with GitHub APIs |

**MCP tools** extend this with external capabilities:

| MCP Server Example | What It Adds |
|-------------------|--------------|
| PostgreSQL server | Query databases, inspect schemas, analyze query plans |
| Docker server | Manage containers, inspect logs, deploy services |
| Sentry server | Fetch error reports, analyze crash data |
| Figma server | Read design tokens, component specs |

## Configuring MCP Servers

MCP servers are configured per-workspace. GitHub Copilot CLI discovers server definitions from several locations (loaded in order):

| File | Scope | Notes |
|------|-------|-------|
| `.mcp.json` | Repository root | Preferred for repo-shared configuration |
| `.vscode/mcp.json` | VS Code workspace | VS Code–compatible workspace config |
| `devcontainer.json` | Dev container | Available when running inside a container |

> **Security**: Workspace MCP servers are loaded **only after folder trust is confirmed**. If you haven't explicitly trusted a folder, servers defined in its config files won't start — protecting you from malicious MCP server configurations in untrusted repositories.

Example `.mcp.json` or `.vscode/mcp.json`:

```json
{
  "servers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/mydb"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./docs"]
    }
  }
}
```

### Configuration Fields

**command**: The executable to run the MCP server (e.g., `npx`, `python`, `docker`).

**args**: Arguments passed to the command. Most MCP servers are distributed as npm packages and can be run with `npx -y`.

**env**: Environment variables passed to the server process. Use these for connection strings, API keys, and configuration—never hardcode secrets in the JSON file.

### Managing Persistent MCP Configuration via Server RPCs

In addition to file-based configuration, GitHub Copilot CLI exposes **server RPCs** that let MCP servers and tooling scripts manage the persistent MCP server registry at runtime. This enables programmatic setup — for example, an installer script that registers a server without requiring you to hand-edit a JSON file.

The available RPCs are:

| RPC | Description |
|-----|-------------|
| `mcp.config.list` | List all currently registered persistent MCP servers |
| `mcp.config.add` | Add a new MCP server to the persistent configuration |
| `mcp.config.update` | Update an existing registered server |
| `mcp.config.remove` | Remove a server from the persistent configuration |

These are especially useful for plugins and installer scripts that need to self-register or de-register their MCP server as part of install/uninstall flows, without requiring the user to manually edit config files.

### Common MCP Server Configurations

**PostgreSQL** — Query databases and inspect schemas:
```json
{
  "postgres": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-postgres"],
    "env": {
      "DATABASE_URL": "${input:databaseUrl}"
    }
  }
}
```

**GitHub** — Extended GitHub API access:
```json
{
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_TOKEN": "${input:githubToken}"
    }
  }
}
```

**Filesystem** — Controlled access to specific directories:
```json
{
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "./data", "./config"]
  }
}
```

> **Security tip**: Use `${input:variableName}` for sensitive values. VS Code will prompt for these at runtime rather than storing them in the file.

### Authentication

Some MCP servers require authentication to connect to protected resources. GitHub Copilot CLI supports several authentication approaches:

- **OAuth**: MCP servers can use the OAuth flow to authenticate with external services. The CLI handles the browser redirect and token storage automatically. This also works when running in ACP (Agent Coordination Protocol) mode.
- **Device code flow (RFC 8628)**: When the CLI runs in a **headless or CI environment** where a browser redirect is not possible, it automatically falls back to the device code flow. You'll see a URL and a code to enter on another device to complete authentication.
- **`/mcp auth`**: If a token expires or you need to switch accounts, run `/mcp auth` inside a session. This opens the re-authentication UI for any OAuth-enabled MCP server and supports account switching. You can re-authenticate without restarting the session.
- **Microsoft Entra ID (Azure AD)**: MCP servers that authenticate via Microsoft Entra ID are fully supported. Once you complete the initial login, the CLI caches the authentication and **will not show the consent screen on subsequent connections** — you authenticate once per session rather than every time the server reconnects.
- **API keys via environment variables**: Pass secrets through the `env` field in the MCP server configuration (see examples above). Never hardcode credentials in `.mcp.json`.
- **`${input:variableName}` prompts**: VS Code will prompt for these values at runtime, keeping secrets out of committed files.

> **Tip**: If your MCP server uses OAuth with Dynamic Client Registration but hosts its authorization metadata at a non-standard URL (as some enterprise servers like Atlassian Rovo do), Copilot CLI handles this automatically.

## How Agents Use MCP Tools

When an agent declares an MCP server in its `tools` array, Copilot can invoke that server's capabilities during conversation:

```yaml
---
name: 'Database Administrator'
description: 'Expert DBA for PostgreSQL performance tuning and schema design'
tools: ['codebase', 'terminal', 'postgres']
---
```

With this configuration, the agent can:
- Run SQL queries to inspect table structures
- Analyze query execution plans
- Suggest index optimizations based on actual data
- Compare schema changes against the live database

### Example Conversation

```
User: The users page is loading slowly. Can you figure out why?

Agent: Let me check the query that powers the users page.
[Searches codebase for user listing query]
[Runs EXPLAIN ANALYZE via postgres MCP server]

I found the issue. The query on user_profiles is doing a sequential scan
on 2.4M rows. Here's what I recommend:

CREATE INDEX idx_user_profiles_active ON user_profiles (is_active)
  WHERE is_active = true;

This should reduce the query time from ~3.2s to ~15ms based on the
current data distribution.
```

Without the MCP server, the agent would have to guess at database structure and performance characteristics. With it, the agent works with real data.

## MCP Sampling (LLM Inference Requests)

Some advanced MCP servers can request **LLM inference** from the Copilot model — a capability defined in the MCP specification as *sampling*. Instead of only receiving tool calls from the AI, these servers can ask Copilot to generate text or make decisions as part of their own logic.

**How it works**:
1. An MCP server sends a `sampling/createMessage` request to Copilot.
2. Copilot shows a **review prompt** to the user, explaining what the server is requesting.
3. The user approves or rejects the request.
4. If approved, Copilot generates the response and returns it to the server.

This enables sophisticated patterns like MCP servers that orchestrate multi-step reasoning, generate structured output, or build more complex AI pipelines — while keeping the user in control with an explicit approval step.

> **Note**: Sampling requires explicit user approval every time a server requests inference. This is a security boundary — MCP servers cannot silently consume your AI quota or exfiltrate context without your knowledge.

## Finding MCP Servers

The MCP ecosystem is growing rapidly. Here are key resources:

- **[Official MCP Servers](https://github.com/modelcontextprotocol/servers)**: Reference implementations for common services (PostgreSQL, Slack, Google Drive, etc.)
- **[MCP Specification](https://spec.modelcontextprotocol.io/)**: The protocol specification for building your own servers
- **[Awesome MCP Servers](https://github.com/punkpeye/awesome-mcp-servers)**: Community-curated list of MCP servers

### Building Your Own MCP Server

If your team has internal tools or proprietary APIs, you can build custom MCP servers. The protocol supports three main capability types:

| Capability | Description | Example |
|-----------|-------------|---------|
| **Tools** | Functions the AI can invoke | `query_database`, `deploy_service` |
| **Resources** | Data the AI can read | Database schemas, API docs |
| **Prompts** | Pre-built conversation templates | Common troubleshooting flows |

MCP server SDKs are available in [Python](https://github.com/modelcontextprotocol/python-sdk), [TypeScript](https://github.com/modelcontextprotocol/typescript-sdk), and other languages. Browse the [Agents Directory](../../agents/) for examples of agents built around MCP server expertise.

## Best Practices

- **Principle of least privilege**: Only give MCP servers the minimum access they need. Use read-only database connections for analysis agents.
- **Keep secrets out of config files**: Use `${input:variableName}` for API keys and connection strings, or load from environment variables.
- **Document your servers**: Add comments or a README explaining which MCP servers your project uses and why.
- **Version control carefully**: Commit `.mcp.json` or `.vscode/mcp.json` for shared server configurations, but use `.gitignore` for any files containing credentials.
- **Test server connectivity**: Verify MCP servers start correctly before relying on them in agent workflows.
- **Use the MCP allowlist (experimental)**: In high-security environments, the `MCP_ALLOWLIST` feature flag lets you validate MCP servers against a configured registry, blocking unrecognized servers from loading. MCP servers that are blocked by the allowlist policy are **hidden from `/mcp show`** to avoid confusion — only permitted servers appear in that view. This is an experimental feature for enterprise environments requiring strict control over which MCP servers are permitted.

### Organization Policy for Third-Party MCP Servers

GitHub organizations can enforce a policy that restricts which third-party MCP servers members are permitted to use. When this policy is active:

- Copilot CLI **enforces** the policy for all users in the organization.
- A **warning is shown** if a configured MCP server is blocked by the policy, so you know which servers are restricted before expecting them to work.

If you see a warning that an MCP server is blocked, contact your organization administrator to find out which servers are on the allowlist, or switch to an approved alternative.

## Common Questions

**Q: Do MCP servers run in the cloud?**

A: No, MCP servers typically run locally on your machine as child processes. They're started automatically when needed and stopped when the session ends.

**Q: Can I use MCP servers without custom agents?**

A: Yes. Once configured in `.vscode/mcp.json`, MCP tools are available in any Copilot Chat session. Custom agents simply make it easier to pre-select the right tools for a workflow.

**Q: Are MCP servers secure?**

A: MCP servers run with the same permissions as your user account. Follow least-privilege principles: use read-only database connections, scope API tokens narrowly, and review server code before trusting it.

**Q: How many MCP servers can I configure?**

A: There's no hard limit, but each server is a running process. Configure only the servers you actively use. Most projects use 1–3 servers.

## Next Steps

- **Build Agents**: [Building Custom Agents](../building-custom-agents/) — Create agents that leverage MCP tools
- **Explore Examples**: Browse the [Agents Directory](../../agents/) for agents built around MCP server integrations
- **Protocol Deep Dive**: [MCP Specification](https://spec.modelcontextprotocol.io/) — Learn the protocol details for building your own servers

---
