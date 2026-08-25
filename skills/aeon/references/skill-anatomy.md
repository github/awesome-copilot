# How Aeon skills are actually written

Surveyed across all 76 skills in `aeonfun/aeon`. Frequencies are real counts — match the dominant convention unless there's a reason not to. Bodies run 133–757 lines (~306 median); a skill is a prompt, not a config file, and reads as prose.

## Frontmatter

Universal — **all 76 skills** carry these five:

```yaml
name: my-skill       # the slug (matches the skills/<slug>/ directory)
description: One line — what it does and what it sends.
metadata:
  title: My Skill    # human-readable display name
  category: basics   # core | evolution | basics | dev | crypto | productivity
  tags: [content]
```

Then, in descending real-world use:

| Field | Used by | Meaning |
|---|---|---|
| `var:` | 56 | the operator-tunable knob (topic, filter, mode). Default value; `./aeon skills set <name> --var` overrides at run time |
| `requires:` | 28 | API keys to inject. **This is an allowlist** — see the trap below |
| `mode:` | 17 | `read-only` (10) or `write` (7). **Absent = `write`** |
| `permissions:` | 12 | GitHub token scopes, e.g. `contents:write`, `pull-requests:write` |
| `commits:` | 12 | `true` (9) / `false` (3) — whether the run may commit |
| `capabilities:` | 10 | declared blast radius, e.g. `external_api`, `sends_notifications`. Taxonomy locked by `ci-capabilities-parity` |
| `mcp:` | 4 | MCP servers the skill needs — **catalog metadata only, gates nothing at run time** (`references/mcp.md`) |
| `depends_on:` | 3 | other skills, for chain ordering |

### Trap 1 — `requires:` injects only names that pass the filter

`scripts/skill_requires.sh` reads it with awk and injects only entries matching `^[A-Z][A-Z0-9_]{2,}$` (a trailing `?` marks "works better with"; bare means required). Both list forms parse — inline or block, top-level or nested under `metadata:` (the spec form):

```yaml
metadata:
  requires:
    - COINGECKO_API_KEY?
    - ALCHEMY_API_KEY?
```

This is **least-privilege secret injection**: the run exports only the keys listed here — a skill sees nothing else from the secret store. The trap is the *value*, not the list style — a lowercase, too-short, or otherwise malformed entry is silently dropped, so the skill declares a credential it never receives and fails at run time as if the key were never set.

### Trap 2 — a typo'd `mode:` silently grants write

`scripts/skill_mode.sh` maps an unknown value to `write` ("never silently over-restrict"). `mode: readonly` or `mode: read_only` does **not** get you `read-only` — it gets you full access. The exact string is `read-only`.

### Trap 3 — `schedule:` / `cron:` in frontmatter does nothing

10 skills carry one (`schedule: "0 14 * * *"`, `cron: "0 9,15 * * *"`). Nothing reads it. `.github/workflows/scheduler.yml` parses **`aeon.yml` only** (`done < aeon.yml`). Those lines are stale documentation. Never set a schedule by editing `SKILL.md`, and don't trust one you find there — check `aeon.yml`.

## Body structure

The dominant shape, by heading frequency:

| Heading | Skills | Purpose |
|---|---|---|
| `## Steps` | 40 | the numbered procedure — the core of the skill |
| `## Network note` | 39 | how to fetch: curl vs WebFetch vs `./secretcurl` vs `gh api` |
| `## Constraints` | 29 | judgment rules, what not to do |
| `## Log` | 14 | the exact `memory/logs/` shape to append |
| `## Environment Variables` | 11 | one line per key in `requires:`, saying what degrades without it |
| `## Why this skill exists` | 9 | intent, so later edits don't erode it |
| `## Exit taxonomy` | 6 | the named ways it can end (incl. silent exits) |

Open with the date/var line, close with notify + log:

```markdown
Today is ${today}. <the prompt — plain instructions, including judgment calls>

Report via `./notify` (use `./notify -f file.md` for anything multi-line).
Send nothing if there's nothing worth reporting.
Append what you did to `memory/logs/${today}.md` under a `### <skill-name>` heading.
```

### `${today}` and `${var}` are NOT template variables

There is no substitution step. The workflow never rewrites `SKILL.md` — it builds a prompt that says:

```
Today is 2026-07-21. Read and execute the skill defined in skills/<name>/SKILL.md
Use this variable (override the default in the skill file):
var=<value>
```

…and the model reads the file with its Read tool. So `${today}` works only because the date is in the surrounding prompt and the model resolves it in context. It's a **convention, not an engine** — inventing `${my_thing}` gets you a literal `${my_thing}` with nothing to bind it. (Other `${...}` tokens you'll see in skill bodies — `${total_runs}`, `${network}` — are placeholders inside *sample output blocks*, showing the model what to fill in. Same mechanism: prose, not templating.)

## Calling external scripts

**These do not exist in the repo.** The workflow copies them to the repo root before each run (`.github/workflows/aeon.yml:435-444`), which is why `ls` shows no `notify` but 61 skills call `./notify`. Don't "fix" the missing file, and don't expect them locally.

| Call | Skills | Notes |
|---|---|---|
| `./notify "msg"` / `./notify -f body.md` | 57 | `-f` for anything multi-line. Structured form: `--title`, `--severity {info,success,warn,critical}`, `--link`. Falls back to `.pending-notify/` when the sandbox blocks outbound curl |
| `WebFetch` | 41 | preferred fallback for a flaky public GET |
| `./secretcurl` | 28 | authenticated curl — **the only safe way to use a key** |
| `gh api` | 24 | handles GitHub auth internally; prefer over raw curl for repo metadata |

### `./secretcurl` and the `{ENV_NAME}` placeholder

Claude Code's Bash permission analyzer **blocks any command containing a secret expansion** (`$XAI_API_KEY`, `${XAI_API_KEY}`) because it can't statically prove safety. `./secretcurl` takes curl's arguments and substitutes `{ENV_NAME}` tokens *inside* the script, so the secret never reaches the agent's command line:

```bash
./secretcurl -s -X POST https://api.x.ai/v1/responses \
  -H 'Authorization: Bearer {XAI_API_KEY}' -d "$PAYLOAD"
```

Braces, not `$`. A skill that writes `-H "Authorization: Bearer $XAI_API_KEY"` will be blocked at run time, not at author time.

There is **no network sandbox** — plain `curl` works for unauthenticated GETs.

## Memory

`memory/` is the durable state that survives between runs. Four conventions, in order of how often skills touch them:

### `memory/logs/${today}.md` — the run log (63 of 76 skills)

Every skill appends what it did, under **one** heading that is exactly its slug:

```markdown
### <skill-name>
- Phase: plan | send | all
- Mode: execute | dry-run
- <what happened, one line per fact>
```

The `### <skill-name>` shape is load-bearing — the health/heartbeat loop parses it. Use one heading per run and put discriminators on lines beneath it rather than inventing `### <skill-name> (plan)`.

This is also the **dedup substrate**. The standard rule, and the one to add to any new skill: *read the last 3 days of `memory/logs/` and skip anything already reported.* Without it a daily skill re-reports the same item until it's muted.

### `memory/MEMORY.md` — the durable index (87 references)

Long-lived facts, not run history. Skills read it for context; the `memory-flush` skill promotes important log lines into it and prunes stale ones. Don't append per-run noise here — that's what `logs/` is for.

### Domain state files

Skills that track things across runs own a file: `memory/watched-repos.md`, `memory/products.md`, `memory/instances.json`, `memory/on-chain-watches`, `memory/pending-disclosures/`, `memory/issues/INDEX.md`. Read-modify-write the one your skill owns; don't invent a parallel store.

### Not for skills: `memory/cron-state.json`

Scheduler bookkeeping, written by `scripts/state_store.sh` (append-only via GitHub Issue comments, folded by `state_reduce.py`). **Zero skills call it directly** — it's infrastructure. Leave it alone.
