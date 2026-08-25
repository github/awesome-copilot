# MCP servers

## First: which direction?

Two unrelated things share the name. Get this wrong and nothing works.

| | |
|---|---|
| **`.mcp.json`** — *external MCP servers, called BY Aeon skills* | Wired via the dashboard MCP panel or `./aeon mcp add`. This is what you want when a skill needs a tool. |
| **`bin/add-mcp`** — *Aeon itself AS an MCP server* | Builds `apps/mcp-server` and registers it with Claude Code / Desktop, so all 76 skills appear as `aeon-*` tools **in your local Claude**. Nothing to do with a skill calling out. |

The rest of this doc is the first one. For the second: `bin/add-mcp`, `--desktop` for a Claude Desktop snippet, `--uninstall` to remove, `claude mcp list` to verify.

## Adding a server

### Dashboard (the normal path)

`./aeon` → **MCP** panel. Featured servers install one-click. Behaviour depends on the catalog entry:

- **`authSecret`** → wires `Authorization: Bearer ${SECRET}` and shows a paste-token row.
- **`oauth: true`** → shows **Connect**, runs the browser OAuth flow, stores tokens as repo secrets. See *Key refresh* below.
- **Neither** → public server, no auth wired.

### CLI

```bash
./aeon mcp ls                              # what's configured
./aeon mcp catalog                         # featured slugs
./aeon mcp add glim                        # by catalog slug
./aeon mcp add myserver https://x.com/mcp  # custom HTTP
./aeon mcp add myserver https://… --sse    # SSE transport
./aeon mcp add myserver https://… --header "Authorization: Bearer \${MY_TOKEN}"
./aeon mcp rm myserver
```

Writes `.mcp.json` and pushes. `--dry-run` previews. **OAuth servers can't be connected from the CLI** — the flow needs a browser, so use the dashboard.

### In code — adding a featured server

Append to `MCP_CATALOG` in `apps/dashboard/lib/mcp-catalog.ts`. That one array feeds the dashboard's Featured list, `./aeon mcp catalog`, and the per-skill MCP panel:

```ts
{
  slug: 'myserver',                    // also the .mcp.json key and MCP_<SLUG>_* secret stem
  name: 'My Server',
  url: 'https://myserver.com/mcp',
  logo: 'https://…',
  description: '…',
  transport: 'http',                   // or 'sse'; default http
  authSecret: 'MYSERVER_API_KEY',      // static bearer — OR:
  oauth: true,                         // browser OAuth flow
  oauthScopes: ['openid', 'offline_access'],
  oauthClientId: '…',                  // only if the server has no dynamic registration
}
```

`authSecret` and `oauth` are **mutually exclusive**. Request `offline_access` only if the provider advertises it — Robinhood rejects it and only offers `internal`.

### `.mcp.json` shape

```json
{
  "mcpServers": {
    "glim": {
      "type": "http",
      "url": "https://glim.sh/mcp",
      "headers": { "Authorization": "Bearer ${MCP_GLIM_TOKEN}" }
    }
  }
}
```

`${VAR}` references are resolved from repo secrets at run time. Not committed upstream — each instance has its own.

## Writing a skill that uses one

```yaml
mcp: [glim]        # frontmatter — catalog metadata ONLY
```

**`mcp:` does not gate anything at run time.** Unlike `requires:` (a real least-privilege allowlist for secrets), `mcp:` is read only by `bin/generate-skills-json` for the catalog and the dashboard's requirement panel. Every server in `.mcp.json` is allowed for **every** skill on both harnesses. Declare it anyway — it's how the dashboard tells the operator what to connect.

In the body: tools surface as `mcp__<server>__*` (Claude) / `<server>__<tool>` (grok). **Discover them from the server rather than hardcoding a list** — the house convention is "the tool descriptions are the source of truth, don't assume a fixed list."

Always handle the not-connected case explicitly, as `glim-mcp` does:

> **No `mcp__glim__*` tool callable** → the server isn't connected (or its secrets are missing, in which case the workflow logged a `::warning::` and skipped MCP). Log `GLIM_NOT_CONNECTED`, notify once pointing at dashboard → MCP → Connect, exit.

If calls cost money, set a hard budget in the body (`glim-mcp`: ≤10 tool calls, ≤25 with `--deep`) and say to synthesize from what's in hand when it's spent.

## Where the credentials show up

A connected server's credentials are stored as ordinary repo secrets named from its slug (`tokenVar`/`oauthVar` in `lib/mcp-catalog.ts`), so they appear in **two** places:

- **MCP panel** — inline per server, next to the `${VAR}` it satisfies. Where you set or re-connect them.
- **Settings → Access Keys → MCP** — the credential inventory. Rows are built dynamically from whatever `MCP_*_TOKEN` / `MCP_*_OAUTH` secrets exist, each carrying its server's catalog logo; the section is hidden entirely until a server is connected. Removing one here leaves the server wired in `.mcp.json` but unauthenticated.

There is nothing to add to `BUILTIN_SECRETS` when you add a catalog server — the group is derived from `MCP_SECRET_RE` and `MCP_SECRET_OWNER`, so a new `MCP_CATALOG` entry brings its own group row, description, and logo.

## Key refresh

### Static tokens

Nothing to refresh. The secret named by `authSecret` is injected wherever `.mcp.json` references `${VAR}`.

### OAuth — the durable loop

1. **Connect** (dashboard) — discovery (RFC 9728 → RFC 8414/OIDC), dynamic client registration (RFC 7591), Authorization Code + PKCE. Tokens never reach the browser.
2. **Store** — two repo secrets:
   - `MCP_<SLUG>_TOKEN` — short-lived access token, referenced by the header
   - `MCP_<SLUG>_OAUTH` — JSON refresh material (`token_endpoint`, `client_id`, optional `client_secret`, `refresh_token`, `scope`)
3. **Refresh** — every run sources `scripts/mcp-oauth-refresh.sh` *before* the `${VAR}` resolution loop, mints a fresh access token, and exports `MCP_<SLUG>_TOKEN`. The loop keeps anything already in the environment, so the live token wins over the stored, stale one.

The script is **sourced, never executed**: it can't abort the run, guards every command, and masks tokens with `::add-mask::`. A server whose refresh fails is simply left without a token.

### The trap: rotating refresh tokens

If a provider rotates the refresh token on each use, the old one dies immediately. Unless the replacement is **saved back**, the *next* run fails with `invalid_grant` — auth breaks one run later, not now.

Writing a secret needs a secrets-write credential, and **the default `GITHUB_TOKEN` cannot do it.** Add a fine-grained PAT with **Secrets: read/write** as **`GH_SECRETS_PAT`** (or repo-wide `GH_GLOBAL`).

**Every catalog provider rotates - treat the PAT as required, not optional.**

After adding the PAT, **re-connect the affected server once**. A refresh token already consumed by an earlier run can't be revived by the PAT alone.

Concurrent runs that each refresh the same rotating token still race. For many-server or high-parallelism setups, refresh centrally on a schedule so exactly one run mints and persists per interval.

### Reading the log

| Line | Means |
|---|---|
| `MCP enabled: glim, base` | servers wired for this run |
| `::debug::MCP OAuth: refreshed MCP_GLIM_TOKEN` | refresh worked (needs step debug logging) |
| `MCP OAuth: persisted rotated refresh token for …` | rotation saved — durable refresh active |
| `::warning::… uses a ROTATING refresh token but no secrets-write credential` | next run's auth **will** fail — add the PAT |
| `::warning::… refresh failed … (invalid_grant)` | already broken; re-connect in the dashboard |
| `::warning::.mcp.json references secret(s) not set: …` | see below |

### The harnesses differ on a missing secret

- **Claude:** one unresolved `${VAR}` skips **MCP entirely for that run** — every server, not just the broken one. `Skipping MCP this run.`
- **grok:** only the affected server fails to connect; the run and other servers continue.

So on the Claude harness a single stale token silently disables every MCP tool. If a skill reports "no MCP tools available," check the warning list before assuming its own server broke.

## Files

| Piece | File |
|---|---|
| Catalog (add featured servers here) + credential-name derivation | `apps/dashboard/lib/mcp-catalog.ts` |
| Access Keys **MCP** group (row descriptions) | `apps/dashboard/lib/secrets-catalog.ts` |
| Per-credential logos | `apps/dashboard/lib/service-icons.ts` |
| OAuth core — PKCE, discovery, DCR, exchange | `apps/dashboard/lib/mcp-oauth.ts` |
| Server glue — pending flow, browser, secrets | `apps/dashboard/lib/mcp-oauth-server.ts` |
| Start + callback routes | `apps/dashboard/app/api/mcp-auth/{route,callback/route}.ts` |
| Panel Connect button | `apps/dashboard/components/McpPanel.tsx` |
| Runtime refresh (both harnesses) | `scripts/mcp-oauth-refresh.sh` |
| CLI | `apps/cli/src/commands/mcp.ts` |
| Aeon-as-MCP-server | `apps/mcp-server/`, `bin/add-mcp` |
| Upstream docs | `docs/mcp-oauth.md` |
