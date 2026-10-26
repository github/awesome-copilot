# HEY public REST API — the reads an agent needs

Base URL `https://heyresearch.xyz/api`. Every read is a GET returning JSON, public, read-only and
for Robinhood Chain (chain id 4663) only. The full reference is
https://heyresearch.xyz/docs/public-api and the machine description is the OpenAPI 3.1 document
at https://heyresearch.xyz/openapi.json — both are the authority; this page is a guide.

## Access and limits

- No key: 120 requests a minute per client address; anonymous answers are cached for 60 seconds.
  CORS is open for GET.
- Optional free key from https://heyresearch.xyz/account: `Authorization: Bearer <key>` (or the
  `x-api-key` header). It names your integration, gives you a rate bucket of your own, carries a
  monthly allowance and unlocks the bulk reads; keyed answers are private (`no-store`). A key reads
  the same public data — it never unlocks anything private. Never print, log or commit a key.
- Name your software with `x-hey-integration: <name>/<version>`. A self-declaration that changes
  no answer.
- Errors are JSON: `{"error": "<code>", "message": "...", "retryable": true|false, "requestId": "...",
  "retryAfterSeconds": 30}`. 400 malformed request (`invalid_parameter` names the allowed values),
  404 no published record (a hidden project looks the same as one that never existed), 429
  `rate_limited` (wait `retry-after` seconds) or `quota` (monthly allowance spent), 5xx retryable.
  Retry at most once, after the delay HEY gives. Keep the `requestId` when you report an error.

## Find a project

| Read | What it answers |
| --- | --- |
| `GET /api/projects?q=<text>&limit=<1-48>` | Search the published catalogue by name, symbol or contract. Also `tab` (`shipping-now`, `most-active`, `new-builders`, `back-from-dormancy`, `still-building`, `under-the-radar`, `building-with-token`, `utility`, `memes`), `status`, `kind`, `narrative`, `launchpad`, `has`, `sort`, `offset` (follow `nextOffset`). |
| `GET /api/search/suggest?q=<text>` | Type-ahead identity rows (name, ticker, contract, route), at most eight. |
| `GET /api/token/4663/<address>` | Which published project HEY records for a token contract. `status: "unknown"` is an answer: HEY has no published project for it — not a finding about the token. |
| `GET /api/v1/scan?chain=4663&token=<address>` | A one-line card for a contract: status in HEY's words, verified builder, 30-day ships and commits, last ship. `found: false` is a normal 200 answer. |

```sh
curl -s "https://heyresearch.xyz/api/projects?q=<name or ticker>&limit=5"
curl -s "https://heyresearch.xyz/api/token/4663/<0x address>"
```

## Read one project

| Read | What it answers |
| --- | --- |
| `GET /api/projects/<slug>/snapshot` | Start here: identity, build (activity status, Build Momentum, last ships, Still Building, Discovery Gap or why it is withheld), market context with kind, provider and `observedAt`, on-chain use, verification, locks, newest changes, freshness and coverage. |
| `GET /api/projects/<slug>` | The dossier: description, token identity, every registered source and how it was established, market context. |
| `GET /api/projects/<slug>/coverage` | Per dimension, whether HEY measured it — states, never a score. Read it before concluding anything from an absence. |
| `GET /api/projects/<slug>/explain?fact=<fact>` | Why HEY publishes a value: rule, inputs, lineage, evidence ids. Facts: `activity.status`, `build.momentum`, `still_building`, `discovery_gap`, `research.level`, `token.verification`, `market.status`, `market.valuation`, `market_integrity.state`, `source.counted`. |
| `GET /api/projects/<slug>/timeline?lens=build` | Every kind of evidence on one axis, newest first; `lens` is `everything`, `build`, `code`, `onchain`, `market` or `locks`; page with `before=<nextCursor>`. |
| `GET /api/projects/<slug>/diff?from=<YYYY-MM-DD>&to=<YYYY-MM-DD>` | Then and now, never a cause. |
| `GET /api/projects/<slug>/contracts` | The project's contracts. |
| `GET /api/compare?slugs=<slug>,<slug>` | Two to four projects side by side. No winner. |

A renamed slug answers 308 to the current one; follow it.

```sh
curl -s "https://heyresearch.xyz/api/projects/<slug>/snapshot"
curl -s "https://heyresearch.xyz/api/projects/<slug>/coverage"
curl -s "https://heyresearch.xyz/api/projects/<slug>/explain?fact=activity.status"
```

## The agent contract (one bounded answer)

`GET /api/agent/<capability>` returns AgentIntelligenceResponse v1 — the same JSON as the MCP
tool `research_answer`: an answer sentence first, then claims tagged `FACT`, `DERIVED` or
`UNKNOWN` with source, `observedAt`, precision and evidence ids, unknowns with what not to
conclude, and freshness per data family. `GET /api/agent` describes the contract itself.

| Capability | Parameters | Question |
| --- | --- | --- |
| `research_project` | `project` | What is HEY's current research view of this project? |
| `builder_status` | `project` | Is it still building, and why does HEY say so? |
| `what_changed` | `project` (optional), `days` 1–30, `types`, `limit`, `building=only` | What changed with this project, or on the chain? |
| `verify_project` | `address`, `project` (optional) | Does this contract appear to belong to this project? |
| `compare_builders` | `projects` (2–4, comma-separated) | How do these building records compare over 30 days? |
| `unknowns` | `project` or `address` | What does HEY not know? |

```sh
curl -s "https://heyresearch.xyz/api/agent/builder_status?project=<slug>"
curl -s "https://heyresearch.xyz/api/agent/what_changed?days=7&building=only"
curl -s "https://heyresearch.xyz/api/agent/verify_project?address=<0x address>&project=<slug>"
curl -s "https://heyresearch.xyz/api/agent/unknowns?project=<slug>"
```

## What changed, and what shipped

| Read | What it answers |
| --- | --- |
| `GET /api/changes` | The change ledger, one event per meaningful change. Filters: `project`, `contract` (`4663:<address>`), `domain`, `type`, `since`/`until` (the event's own date), `detectedSince` (when HEY recorded it), `limit` 1–100. To follow it, start at `after=c1.0` and keep each page's `nextCursor` — never sync on a timestamp. A `retract` event means HEY withdrew that claim. |
| `GET /api/ships` | What projects shipped, each with its public source and how it is backed. `project`, `since`, `until`, `type` (`releases` for every release type), `q`, `limit` 1–48. |
| `GET /api/this-week` | The week's rollup, each count with the window it was counted over. |
| `GET /api/chain?days=<1-400>` | Robinhood Chain day by day: aggregates only. A figure absent from a day was not read that day. |
| `GET /api/builders` | The Builder Radar: ranked by verified development, on-chain use and research standing, never by price. |

Three different times on a change: `occurredAt` (when a source dates it; `null` when HEY only
observed it), `detectedAt` (when HEY first knew) and `recordedAt` (when the ledger recorded it).

```sh
curl -s "https://heyresearch.xyz/api/changes?project=<slug>&limit=20"
curl -s "https://heyresearch.xyz/api/ships?since=<YYYY-MM-DD>&type=releases&limit=20"
```

## Evidence and contracts

| Read | What it answers |
| --- | --- |
| `GET /api/evidence/<id>` | A receipt for a typed evidence id (`ship:`, `signal:`, `abi:`, `impl:`, `lock:`, `source:`, `claim:`, `state:`, `integrity:`, `narrative:`, `method:`, `sourcechange:`, `security:`, `v4hook:`): what it claims, source URL, when, at what precision, how it is backed. URL-encode the id. A withdrawn record answers `withdrawn: true`. |
| `GET /api/contracts/4663/<address>` | One contract: creation, deployer, proxy and implementation history, verified source, interface counts, seven-day activity, each section with whether HEY measured it (`MEASURED`, `NOT_READ`, `ERROR`, `NO_SOURCE`). |

```sh
curl -s "https://heyresearch.xyz/api/evidence/<url-encoded evidence id>"
curl -s "https://heyresearch.xyz/api/contracts/4663/<0x address>"
```

## Market context (never building evidence)

`GET /api/projects/<slug>/market` (HEY's daily index of the project's token) and
`GET /api/projects/<slug>/market-integrity` (what happened to the tracked market beside the
building). Every figure carries its provider and `observedAt`; a valuation carries its `kind`
(`marketCap` or `fdv`, never compared as one figure); a withheld valuation says why
(`valuationWithheld`). Report these as context with their date, never as a view on price.

## Other doors to the same record

- TypeScript SDK `@hey-research-lab/sdk` (`new HeyClient()`; typed reads, cursor helpers).
- A2A: Agent Card https://heyresearch.xyz/.well-known/agent-card.json, JSON-RPC
  `POST https://heyresearch.xyz/api/a2a` (`SendMessage`, header `A2A-Version: 1.0`).
- Feeds: https://heyresearch.xyz/feed/ships.xml and https://heyresearch.xyz/feed/updates.xml.
- Webhooks (API key): https://heyresearch.xyz/docs/webhooks.
- Everything about HEY in one file: https://heyresearch.xyz/llms.txt; the agent guide:
  https://heyresearch.xyz/developers/agents.
- Source code: https://github.com/hey-research-lab/hey-research-open; CLI:
  https://github.com/hey-research-lab/hey-cli.
