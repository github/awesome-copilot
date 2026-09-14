---
name: glasser
description: >
  Use when a task needs external or paid data — person or company enrichment,
  person/company search, web, news, image, video, maps, places, scholar or
  shopping search, webpage scraping, lead lookup — and no built-in or
  user-provided integration covers it. Glasser brokers 1,000+ paid third-party
  endpoints behind one key: search the catalog, inspect the price, run, pay per
  call. Works through the glasser MCP tools or CLI. Prefer the user's own keys
  and integrations first.
---

# Glasser CLI

Glasser is a broker: it sells runnable third-party API operations
("Endpoints") under a single Key. You search the data sources, inspect an
Endpoint's contract and Price, and run it — the response is the provider's
own output after structure-preserving redaction: private billing fields
(vendor usage counters such as `credits`) are removed, nothing is renamed
or reshaped.

## Setup

This plugin ships the `glasser` MCP tools — `search`, `inspect`, `run`,
`runs_get`, `runs_list`, `runs_stop`, `balance` — so nothing needs
installing: use them by default and continue to **Authentication**. The CLI
is optional. Install it only when a result is too large for the context
window (it writes to a file with `-o`), for scripting, or for CI:

```sh
glasser --version 2>/dev/null || npm install -g @glasser-ai/cli@latest
```

One command when the CLI is missing, and it installs the current version.
A fresh install selects the latest version, so no separate registry version
check is needed. It needs Node >= 22 and reports where it wrote the binary —
read its output rather than guessing.

**If the CLI was already installed**, upgrade when either is true:

- a command printed an `Update available` notice — the CLI asks the npm
  registry at most once a day and prints this on stderr;
- comparing by hand shows you are behind: `glasser --version` against
  `npm view @glasser-ai/cli version` (or, without npm,
  `curl -fsSL https://registry.npmjs.org/-/package/@glasser-ai%2fcli/dist-tags`).

For a previously installed CLI, check by hand at least once when you plan
to work in `-j` mode: the notice is never printed there, because both
streams stay machine-clean, so an agent that only parses JSON is never
told it is behind.

The canonical copy of this file is https://glasser.ai/SKILL.md. This plugin
pins one version of it next to its MCP config, and a plugin update carries
the newer copy — update the plugin rather than fetching the file on its own,
so the two stay in step. Never downgrade the CLI. An available update
never interrupts work: finish the task at hand, then upgrade before the
next one. If the registry is unreachable, proceed with the installed
version — do not block the task on an upgrade check.

## Transports: MCP tools by default, CLI for large results

The MCP tools and the CLI are the same seven verbs on the same Key,
Workspace and balance, and the rules below apply to both. Only `run`
differs: the tool needs an `idempotency_key` you generate (a UUID); the CLI
generates one for you. Use the MCP tools by default. Switch to the CLI when
a result would flood the context (`-o <file>`, then read selectively), for
scripting, or in CI. To connect a client without this plugin, read
https://glasser.ai/docs/mcp-server.md rather than writing a config from
memory.

## Authentication

Call the `balance` tool (with the CLI, run `glasser balance`). Success means
authentication works; continue to **First run**.

**With the MCP tools**, the client signs the user in: the first call opens
the browser, the user signs in to Glasser, chooses the Workspace whose
balance the agent may spend, and clicks Allow. If `balance` fails with an
invalid or missing key, the client is not signed in or the Key it minted
was revoked: ask the user to sign in again from the client's MCP settings
(Claude Code: `/mcp` → glasser → Authenticate). Never ask them to paste a
Key into the conversation.

**With the CLI**, a missing or rejected Key needs login. Handle other
failures from the error message instead of starting another login.

**With a user present**, run `glasser login` with your shell tool's background
execution support. The CLI opens the sign-in page when possible and prints
a fallback URL and matching code. Sign-in completes when the user checks
the code and approves in the browser. Relay the CLI's URL and code exactly
as printed, with a brief explanation of that next step. Use plain URLs in
setup messages so they are readable in a terminal.

Keep the turn active and check the pending shell command about every five
seconds until it completes; the CLI polls for browser approval for up to
15 minutes. Once login succeeds, use the available balance in its output
and continue to **First run** without asking for a chat reply, unless login
warns that `GLASSER_API_KEY` overrides the saved Key. With that warning,
or if the summary has no available balance, run `glasser balance` in the
environment subsequent commands will use. Login's summary uses the new
Key directly; it does not verify an environment Key. If the check fails,
resolve the override or report that authentication is still blocked; another
login will not fix it. If the authorization expired, start a new login.
Never ask the user to paste a Key.

**Nobody is present** (CI, scripts, scheduled jobs): set `GLASSER_API_KEY`
to a Key minted in the console, or store one with `glasser keys add --label
<l> --key <k>`. `glasser login --json` is a usage error by design — the
flow needs a human.

## First run

Setup is finished when the `balance` tool succeeds — or, with the CLI, when
login reports the available balance without an environment Key override, or
`glasser balance` exits 0 in the environment subsequent commands will use.
If the user already gave you a task, continue it.
For a setup-only request, reply briefly in the user's language: confirm
Glasser is ready, report the available balance from login or the balance
check, then offer three ready-to-send task prompts, one per bullet.
Use a conversational lead-in that explains how the suggestions can help
the user, rather than a generic list heading. Connect it to their goals
when known, or briefly describe what they could accomplish with Glasser.

Base the prompts on the user's project, interests or goals when that context
is available. Otherwise, choose three varied examples from Glasser's
capabilities. Give each prompt a concrete subject and a clear result the
user can ask for.

Omit Workspace names, slugs and installation details from the setup reply.
Wait for the user to choose before starting a paid Run.

## When to use

- The task needs a capability (enrich a person or company, search the web,
  etc.) and no key or integration for it exists in the environment.
- Workflow, in order:
  1. `glasser search -q "<capability>"` — find candidate Endpoints. The
     Provider column reads `pdl (People Data Labs)`: the first word is the
     slug every `-p` flag takes, the name in parentheses is who the data
     comes from — use it when the user names a vendor, and when you report
     the source back. Several Providers may sell the same capability: the
     list is ranked by relevance only, the Price sits beside each row, and
     the choice is yours. A page holds 5 rows; when a next-page hint is
     printed, pass its cursor with `--cursor` to see the rest.
  2. `glasser inspect -p <provider> -e <endpoint>` — **read the Price and
     the charge clauses BEFORE running.** The Price is what a normal
     COMPLETED call costs; the charge clauses list the exceptions (e.g.
     `NO_RESULT $0.00` means an empty answer is free). For any given
     endpoint the clauses are authoritative. Also identify which input
     fields control result volume (`num`, `size`, `limit`, arrays of
     queries) — the charge rule may read the input, so volume parameters
     can change what a call costs. Start small; raise only when the user
     needs more.
  3. `glasser run -p <provider> -e <endpoint> -i '<json>'` — execute.
  4. Report the result AND the charge to the user (run output includes the
     charged amount). Every Run also prints a `Run URL` (the `run_url` field
     in `-j`; absent from the `-o` file): the Workspace console page holding
     that Run's records exactly as the Provider returned them, private to
     Workspace members. Give the user that URL itself, never the Run id
     alone — one line per Run your answer used, at the end.

## When NOT to use

- **Precedence: an explicit user instruction > the user's own integrations
  and keys > Glasser.** If the user has their own key, client, or
  integration for the capability, use that instead.
- **Runs spend the Workspace balance.** Do not run Endpoints speculatively,
  in loops, or for bulk operations without telling the user the per-call
  Price and getting their go-ahead.
- Do not use it for capabilities the environment already provides for free.

## Commands

| Command | Purpose |
|---|---|
| `glasser login` | Browser device authorization; stores a Key |
| `glasser search [-q <query>] [--limit N] [--cursor C]` | Search Endpoints, 5 per page (max 20); `--cursor` takes the next-page cursor printed after a page; bare `search` lists every data source |
| `glasser inspect -p <provider> -e <endpoint> [--endpoint-version N]` | Schemas, current Price, charge clauses, supported version |
| `glasser run -p <provider> -e <endpoint> [-i '<json>' \| -f <file>] [--idempotency-key K] [--wait] [--wait-timeout s] [-o file]` | Execute an Endpoint |
| `glasser runs list [--limit --cursor --status --provider --endpoint]` | List past Runs |
| `glasser runs get -r <runId> [--wait] [-o file]` | Fetch one Run |
| `glasser runs stop -r <runId>` | Stop a queued/running Run |
| `glasser balance` | Balance, held and available; doubles as the auth probe |
| `glasser balance history [--limit --cursor --kind]` | Ledger of charges and top-ups |
| `glasser keys add/list/activate/remove` | Manage Keys stored on this machine |

Global flags: `-j/--json` (raw JSON to stdout, errors as a single JSON
object on stderr), `--help`, `--version`.

Facts that matter when scripting:

- Exit codes: `0` success, `1` runtime failure, `2` usage error, `130`
  interrupted.
- In `-j` mode, stdout is data only; parse stderr for the error object.
- For large outputs, prefer `-o <file>` and read the file selectively —
  dumping a full provider payload into your context wastes it.
- Money is always an **exact decimal string** (e.g. `"0.0125"`), never a
  float. Do not do float arithmetic on it.
- Env: `GLASSER_API_KEY`, `GLASSER_API_BASE_URL` (default
  `https://api.glasser.ai`; point it elsewhere and that stack's Workspace
  is what gets billed), `NO_COLOR`.

## Run statuses and waiting

| Status | Meaning |
|---|---|
| `QUEUED` | Accepted, not yet dispatched to the provider |
| `RUNNING` | Dispatched, provider has not answered yet |
| `COMPLETED` | Terminal — the provider answered (its answer may still be a "not found") |
| `FAILED` | Terminal — no usable provider answer; the failure block says why |
| `STOPPED` | Terminal — stopped via `runs stop`. Dispatch wins the race: a Run already sent to the provider completes and is charged |

Inspect shows each Endpoint's run mode: a `sync` Endpoint returns the
finished Run in the same response (its timeout is printed next to the
mode) — `--wait` on those adds nothing. For anything still `QUEUED` or
`RUNNING`, either pass `--wait` up front or poll with
`glasser runs get -r <runId> --wait`; interactive sessions that want to
keep talking can fire without `--wait` and poll between replies.

## Troubleshooting

| Symptom | Meaning / action |
|---|---|
| `Invalid or missing API key` | The Key is wrong, revoked, or for another stack. MCP tools: the client is not signed in, or the `MCP · <client>` Key was revoked — sign in again from the client's MCP settings. CLI, interactive: run `glasser login` again. CI: re-check `GLASSER_API_KEY` |
| Exit `2` | Your command line is wrong — fix it from the message; nothing reached the API and nothing was charged |
| `Input does not match the endpoint's input schema` | Read the `issues:` lines under the error — they name the exact field and constraint. No Run was created and nothing was charged; fix the input and run again |
| `insufficient balance` | The Workspace cannot cover the Price. Tell the user to top up in the console — do not retry |
| `rate_limited` | The Workspace or the endpoint is at its limit. Wait `retry_after_ms` (the error carries it; the hint prints it), then retry the same command once — do not loop |
| Transport error / timeout with a retry hint | Outcome unknown — a Run may exist. Retry with the SAME Idempotency-Key exactly as the hint prints it |
| `FAILED` with a charge shown | Legitimate when the charge clauses say so — report both the failure and the charge |
| `Update available` notice | Finish the current task, then upgrade the CLI: `npm install -g @glasser-ai/cli@latest` |

## Running safely

- `run` prints `Charge: $X (rule)` — the amount billed under the
  endpoint's charge rule. Report that number to the user.
- `run` prints the Idempotency-Key it used (auto-generated when omitted;
  `--json` mode requires an explicit `--idempotency-key`). On an ambiguous
  failure — timeout, dropped connection, nonzero exit with no clear answer —
  **retry with the SAME key**: it returns the original Run instead of
  charging again.
- **Two indicators, not one.** A Run's status and the provider's response
  are separate. `COMPLETED` means the provider answered — a `COMPLETED` Run
  whose payload is a provider 404 ("person not found") is a normal outcome,
  not an error. Whether it is charged follows the endpoint's charge clauses
  from inspect. Report both the Run status and what the provider actually
  said.
- Use `--wait` to block until the Run settles; without it, poll with
  `glasser runs get -r <runId> --wait`.

## Rules for agents

1. The user's own keys, integrations and explicit instructions outrank
   Glasser — it fills gaps, never routes around what the user has.
2. Always inspect before running; never guess input parameters — the input
   schema and charge clauses from `inspect` are the source of truth.
3. Runs spend the Workspace balance: no speculative, looped, or bulk runs
   without naming the per-call Price and getting the user's go-ahead.
4. Start with small volume parameters; raise them only on request.
5. Auth is the client's own sign-in (MCP tools) or `glasser login` (CLI) —
   never ask the user to paste a Key into the conversation.
6. On an ambiguous failure, retry with the SAME Idempotency-Key.
7. Report two indicators after every run — the Run status and what the
   provider said — plus the printed `Charge:` amount, and the `Run URL` as a
   URL rather than a bare Run id for the Runs your answer used.
8. Money is an exact decimal string; never do float arithmetic on it.
9. Prefer `-o <file>` for large outputs; `-j` when you parse.
10. When any command prints an `Update available` notice: finish the task,
    then upgrade the CLI with `npm install -g @glasser-ai/cli@latest`.
11. The CLI is the source of truth for flags — run `glasser <command>
    --help` when unsure.
12. `rate_limited` means back off: wait `retry_after_ms`, then retry the
    same command once; never loop on it.

`--endpoint-version` selects a supported compatible contract. It does not lock Price.
Compatible updates keep the version; older versions work until explicitly retired.
New Runs use the selected version's Price at admission. Accepted Runs keep their original Price.
