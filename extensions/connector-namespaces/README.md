# MCP Connectors — Copilot CLI Canvas Extension

A GitHub Copilot CLI **canvas extension** that lets you browse and add MCP
connectors from an Azure **Connector Namespace** directly inside a Copilot CLI
session. Search by name or category, sign in to a connector, then restart the
session to make its tools available to the agent.

> The canvas talks to public Azure Resource Manager (`management.azure.com`)
> using a token from an interactive Azure sign-in — a browser tab opens once per
> session. No client secret is embedded in the extension; the refresh token is
> cached locally (owner-only) so you are not prompted every session.

## Prerequisites

- **GitHub Copilot CLI** (the host that loads canvas extensions).
- **An Azure account.** The first time the canvas loads subscriptions, a browser
  tab opens for Microsoft sign-in; after that the token is renewed silently for
  the session. No Azure CLI required.
- **An Azure subscription with a Connector Namespace** — resource type
  `Microsoft.Web/connectorGateways` (API version `2026-05-01-preview`). This is
  a preview resource provider; you must have access to it for the catalog to
  load. Without it the extension installs fine but has nothing to show.

## Install

Install it from the public Awesome Copilot repository:

```
install_extension https://github.com/github/awesome-copilot/tree/main/extensions/connector-namespaces
```

For a reproducible install, swap `main` for a reviewed commit SHA from this
repository.

The destination **scope** is chosen at install time:

- **user** (default) — installs globally for you at
  `$COPILOT_HOME/extensions/connector-namespaces/`. The usual choice for a
  personal tool.
- **project** — installs into the current repo.
- **session** — scoped to a single CLI session.

## Usage

1. Open the **MCP Connectors** canvas from Copilot CLI.
2. On first run a browser tab opens for Microsoft sign-in; complete it and the
   canvas loads your subscriptions. Pick an Azure **subscription** and a
   **Connector Namespace**. The choice is saved for future sessions (change it
   any time via **Change namespace**).
3. Browse or filter the connector catalog, then **Connect**. A browser tab
   opens for Microsoft sign-in; complete it and the canvas updates on its own.
4. Connected connectors move into **My MCPs**. Use **Sandbox** on a tile to open
   that server directly in the namespace MCP playground.
5. Restart the Copilot CLI session so the agent can load the connected tools.

The extension registers the native `connector_namespaces_open_playground` tool,
so GitHub Copilot can open a named connector from **My MCPs** without installing
an additional Agent Skill.

## How it works

- `extension.mjs` — entry point; declares the canvas, `open_sandbox` action, and
  native `connector_namespaces_open_playground` tool.
- `server.mjs` — a loopback HTTP server (bound to `127.0.0.1` only) that serves
  the canvas UI and the JSON/OAuth endpoints the iframe calls.
- `armClient.mjs` — thin ARM client (token via interactive Azure sign-in, public
  ARM base only, SSRF-guarded path segments).
- `catalog.mjs` — fetches and curates the connector list for a namespace.
- `install.mjs` — the connect/install pipeline (managed-API connection, consent,
  best-effort rollback on cancel).
- `renderer.mjs` — all canvas HTML/CSS/client JS.
- `sandbox.mjs` — builds namespace playground links and resolves named My MCPs.
- `state.mjs` — saved namespace and connector state.

## Privacy & security

- Tokens are obtained through an interactive Azure sign-in (OAuth2 auth-code
  with PKCE); no client secret is used. The refresh token and current ARM access
  token are cached under your Copilot home directory
  (`~/.copilot/extensions/connector-namespaces/artifacts/auth-cache.json`,
  written with owner-only `0600` permissions) so you are not prompted to sign in
  every session. Tokens are never logged.
- All servers bind to loopback (`127.0.0.1`) and are never exposed externally.
- ARM requests go only to `https://management.azure.com/`; path segments are
  validated to prevent SSRF-style host smuggling.

## License

[MIT](./LICENSE) © Microsoft Corporation.
