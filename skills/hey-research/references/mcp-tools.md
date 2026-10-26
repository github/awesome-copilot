# HEY MCP tools

The hosted server `https://heyresearch.xyz/mcp` (Streamable HTTP, stateless, read-only, no key)
publishes the tools below. Each reads HEY's public API, so it can say nothing the API does not.
Every tool returns text plus typed `structuredContent` with an `outputSchema`; every line is
tagged `FACT`, `DERIVED` or `UNKNOWN`. Ask the server for its own list (`tools/list`) when in
doubt — it is the authority, this page is a guide.

A raw call needs no session (stateless, no `initialize`):

```sh
curl -s https://heyresearch.xyz/mcp \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -H 'x-hey-integration: <your-agent>/<version>' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"find_projects","arguments":{"surface":"shipping-now","limit":3}}}'
```

A builder-first profile of the same server, without the market-move, Under the Radar and
valuation tools, is at `https://heyresearch.xyz/mcp/research`.

## find_projects

Which Robinhood Chain project is this name, $TICKER or 0x contract, and is anyone building it?
Also browses discovery surfaces. No argument is required.

- `query` — a name, $TICKER or 0x contract (or its start), 2–120 characters. A full address is a
  contract lookup: its ships in the last 30 days and the newest one with its source.
- `surface` — `shipping-now`, `most-active`, `new-builders`, `back-from-dormancy`,
  `still-building`, `under-the-radar`, `shipping-in-silence`, `accelerating`,
  `building-with-token`, `utility`, `memes`, `builder-radar` (with `radar` for a Radar view).
- Filters: `status`, `kind`, `narrative`, `launchpad`, `has`, `stage`, `sort`, `limit` (1–48),
  `offset`. Market filters and a market `sort` are context the reader asked for, never HEY's
  ranking.

`find_projects({"query": "$HEY"})` · `find_projects({"surface": "back-from-dormancy", "limit": 10})`

## research_answer

The agent contract (AgentIntelligenceResponse v1) in one bounded answer: the answer sentence
first, then claims tagged `FACT`/`DERIVED`/`UNKNOWN` with freshness and evidence ids, and what HEY
does not know with what not to conclude from it. `capability` is required:

- `research_project` / `builder_status` — `project` (slug). Is it still being built, and why?
- `what_changed` — `project` (optional; else chain-wide), `days` 1–30, `types`, `limit`,
  `building: "only"` for building events alone.
- `verify_project` — `address`, optional `project`: does the project itself name this contract?
  `VERIFIED` is never a safety verdict.
- `compare_builders` — `projects`: two to four slugs. No winner, no combined score.
- `unknowns` — `project` or `address`: every coverage gap HEY lists.

`research_answer({"capability": "builder_status", "project": "<slug>"})` ·
`research_answer({"capability": "compare_builders", "projects": ["<slug>", "<slug>"]})`

## get_project_snapshot

Where does this project stand? One read by `slug`: the Research Summary, identity, activity
status and Build Momentum, latest ships, market context with its kind or why it is withheld,
on-chain use (distinct caller addresses, not people), verification, locks, latest changes,
freshness and what HEY does not know.

`get_project_snapshot({"slug": "<slug>"})`

## get_project_timeline

What did it ship, and when? Releases, code weeks, deployments, upgrades, interface changes, token
verification, locks and unlocks, each with how precisely HEY knows its time. `slug` (required),
`lens` (`everything`, `build`, `code`, `onchain`, `market`, `locks`), `limit` 1–100, `before`
(the cursor the previous answer gave).

`get_project_timeline({"slug": "<slug>", "lens": "build", "limit": 20})`

## get_changes

What changed on Robinhood Chain, or for one project or contract? The change ledger, newest first:
one event per change, with its own time and precision, when HEY first knew, and its evidence.
`project`, `contract` (`4663:<0x address>`), `domain`, `type`, `since`/`until` (the event's own
date), `detectedSince` (when HEY recorded it — use it for "today"), `after` (cursor; start at
`c1.0` to follow the ledger), `before`, `limit` 1–100. A retraction means HEY no longer makes that
claim.

`get_changes({"detectedSince": "<ISO instant>", "limit": 50})` ·
`get_changes({"contract": "4663:<0x address>"})`

## get_contract

Who made this contract, and is it a known project's? Project, creation, deployer, verified source
and whose code it is, proxy and implementation history, interface changes, seven days of calls per
method as counts. `address` (chain 4663 by default) or `slug` for all of a project's contracts. An
unread proxy is "not read", never "not a proxy". Not a safety verdict.

`get_contract({"address": "<0x address>"})` · `get_contract({"slug": "<slug>"})`

## get_evidence

What backs this claim? Opens a typed evidence id (`ship:`, `signal:`, `abi:`, `impl:`, `lock:`,
`source:`, `claim:`, `state:`, `integrity:`, `narrative:`, `method:`, `sourcechange:`,
`security:`, `v4hook:`) as a receipt: what it claims, its source URL, when it happened at what
precision, when HEY knew, how it is backed. A withdrawn record says so. An event id with a suffix
(`source:<uuid>:added`) is not an evidence id.

`get_evidence({"id": "<evidence id>"})`

## explain_fact

Why does HEY say this? The value, its tag, the rule and version, the winning source, the inputs,
the lineage and the evidence ids. `slug` (required), `fact` (`activity.status`, `build.momentum`,
`still_building`, `discovery_gap`, `research.level`, `token.verification`, `market.status`,
`market.valuation`, `market_integrity.state`, `source.counted` with `source`). Omit `fact` to list
what can be explained.

`explain_fact({"slug": "<slug>", "fact": "still_building"})`

## project_diff

What changed for a project between two dates (`YYYY-MM-DD`, at most 400 days apart)? Ships,
status, Build Momentum, valuation and liquidity then and now, from the nearest stored point with
its date. Never a cause. `slug`, `from`, `to` are required.

`project_diff({"slug": "<slug>", "from": "<YYYY-MM-DD>", "to": "<YYYY-MM-DD>"})`

## ask_hey

Anything else about one project, in free text (English or Malay), answered only from HEY's record,
each line tagged with its source. Building only; no view on price. `slug` and `question`
(3–280 characters) are required.

`ask_hey({"slug": "<slug>", "question": "Did they ship this month?"})`

## chain_overview

How active is Robinhood Chain as a whole? Aggregates only; nobody is named. `view`: `days`
(default; trades, volume, tokens, transactions, launches, ships per day, with `days` 1–400),
`this-week`, `weekly-report` (with `week`, e.g. `2026-W41`), `unlocks` (scheduled locker unlocks),
`build-market` (Build Momentum beside market attention).

`chain_overview({"view": "this-week"})` · `chain_overview({"view": "days", "days": 30})`

## get_token_market

Does this token still trade? Market context beside the building: the current reading with its
valuation kind and provider, daily price, liquidity, volume and trades, lifecycle, pools and
depth, supply concentration as shares (no addresses). `slug` (required), `days` 1–400,
`include: ["moves"]` for day-on-day valuation moves next to what shipped before them — a sequence,
never a cause. Context only; never a view on price.

`get_token_market({"slug": "<slug>", "days": 30})`

## market_integrity

What happened to the project's tracked token market — liquidity against the level it held,
trading, a pool migration — beside its builder activity, and where the two disagree. It describes
the market, never whether development stopped, and gives no verdict on the project.

`market_integrity({"slug": "<slug>"})`

## get_v4_hook

Who built this Robinhood Chain Uniswap v4 hook? The project HEY ties it to and why, declared
callbacks (not a safety verdict), source, pools by week and unknowns. `address` is required.

`get_v4_hook({"address": "<0x address>"})`
