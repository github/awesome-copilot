# MCP Connectors — Copilot CLI Canvas Extension

A GitHub Copilot CLI **canvas extension** that lets you browse and add MCP
connectors from an Azure **Connector Namespace** directly inside a Copilot CLI
session. Search by name or category, sign in to a connector, and its tools
become available to the agent — without leaving the terminal.

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

This extension lives in the private `serverless-paas-balam/polaris` repo, so
installing it pulls the files through GitHub's API. Before you start, your
Copilot CLI / `gh` login must be a member of the `serverless-paas-balam` org
**with SAML SSO authorized**. Verify it in two seconds:

```
gh api /repos/serverless-paas-balam/polaris --jq .visibility
```

If that prints `internal` (or `private`) you're set. If it returns `404`, your
token isn't authorized yet — run `gh auth login`, approve the SSO prompt for the
org, and retry. (GitHub returns `404`, not a permission error, when gating
private-repo reads, so don't let the status code fool you.)

### Option A — from the repo (recommended)

Track `main` to get the latest committed version:

```
install_extension https://github.com/serverless-paas-balam/polaris/tree/main/.github/extensions/connector-namespaces
```

For a reproducible pin, swap `main` for a release tag — but only one cut
**after** this extension landed on `main`. Run `git tag -l "v*"` and pick the
newest. Tags `v1.4.0` and earlier predate this folder and will `404`, so don't
pin to them. For an internal dev tool, tracking `main` is the safe default.

The destination **scope** is chosen at install time:

- **user** (default) — installs globally for you at
  `$COPILOT_HOME/extensions/connector-namespaces/`. The usual choice for a
  personal tool.
- **project** — installs into the current repo.
- **session** — scoped to a single CLI session.

### Option B — from a gist (no org SSO needed)

If you can't SSO-authorize the org, a gist sidesteps the private-repo wall. The
maintainer publishes a secret gist via **"Share extension as gist…"**; anyone
with the link installs it with **"Install extension from gist…"** or:

```
install_extension https://gist.github.com/<owner>/<gist-id>
```

## Usage

1. Open the **MCP Connectors** canvas from Copilot CLI.
2. On first run a browser tab opens for Microsoft sign-in; complete it and the
   canvas loads your subscriptions. Pick an Azure **subscription** and a
   **Connector Namespace**. The choice is saved for future sessions (change it
   any time via **Change namespace**).
3. Browse or filter the connector catalog, then **Connect**. A browser tab
   opens for Microsoft sign-in; complete it and the canvas updates on its own.
4. Connected connectors are added to your CLI session so the agent can use
   their tools.

## How it works

- `extension.mjs` — entry point; declares the canvas and a few agent-facing
  actions (`add_connector`, `remove_connector`, `list_connectors`).
- `server.mjs` — a loopback HTTP server (bound to `127.0.0.1` only) that serves
  the canvas UI and the JSON/OAuth endpoints the iframe calls.
- `armClient.mjs` — thin ARM client (token via interactive Azure sign-in, public
  ARM base only, SSRF-guarded path segments).
- `catalog.mjs` — fetches and curates the connector list for a namespace.
- `install.mjs` — the connect/install pipeline (managed-API connection, consent,
  best-effort rollback on cancel).
- `renderer.mjs` — all canvas HTML/CSS/client JS.
- `state.mjs` / `actions/` — saved-config persistence and the agent action
  handlers.

## Privacy & security

- Tokens are obtained through an interactive Azure sign-in (OAuth2 auth-code
  with PKCE); no client secret is used. The refresh token is cached under your
  Copilot home directory
  (`~/.copilot/extensions/connector-namespaces/artifacts/auth-cache.json`,
  written with owner-only `0600` permissions) so you are not prompted to sign in
  every session; access tokens are held in memory and never logged.
- All servers bind to loopback (`127.0.0.1`) and are never exposed externally.
- ARM requests go only to `https://management.azure.com/`; path segments are
  validated to prevent SSRF-style host smuggling.

## License

[MIT](./LICENSE) © Microsoft Corporation.
