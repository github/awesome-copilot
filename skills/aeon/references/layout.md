# Inventory & paths

Where everything lives in an Aeon repo, and the fastest way to see what's on.

## Listing skills

```bash
./aeon skills ls                  # all skills + live config
./aeon skills ls --enabled        # only what actually runs
./aeon skills ls --pack crypto    # one pack
./aeon skills <name>              # one skill's detail
./aeon skills ls --enabled --json # for building the Mode 2 timeline
```

`ls` prints `SKILL / ON / SCHEDULE / PACK / DESCRIPTION` and a footer — `76 skills · 1 enabled`. First run installs the CLI runtime (tsx + yaml, ~12MB, one-time); the noise is expected.

**The `SCHEDULE` column is populated for disabled skills too** — it's their `aeon.yml` entry, not proof anything fires. Only the `●` in `ON` means it runs.

### Without the CLI

Read-only greps for when the CLI isn't installed, `gh` isn't authed, or you want to see the raw file. Run from the repo root:

```bash
# every skill on disk
ls skills/*/SKILL.md | cut -d/ -f2

# what's actually enabled, with its cron
grep -E '^  [a-z0-9-]+: *\{[^}]*enabled: true' aeon.yml

# the day as a UTC-sorted timeline (Mode 2)
grep -E '^  [a-z0-9-]+: *\{[^}]*enabled: true' aeon.yml \
  | sed -E 's/^  ([a-z0-9-]+):.*schedule: *"([^"]*)".*/\2|\1/' \
  | awk -F'|' '{split($1,c," "); printf "%02d:%02d UTC  %-18s %s\n", c[2], c[1], $2, $1}' \
  | sort
```

### The two lists that should match

A skill directory with no `aeon.yml` entry reads as **disabled** and is indistinguishable from a configured-but-off skill — the Preflight warning. This is the command that tells them apart:

```bash
comm -23 <(ls skills/*/SKILL.md | cut -d/ -f2 | sort) \
         <(grep -oE '^  [a-z0-9-]+:' aeon.yml | tr -d ' :' | sort)
```

Anything printed is **on disk but unconfigured** — `./aeon skills enable` on it reports `no change — already in that state`, which is false (Mode 4 step 4). Empty output means every skill is configured.

The reverse — an `aeon.yml` entry with no skill directory — is caught by `node scripts/validate-config.js` ("skill-refs").

## Paths

```
aeon.yml           the only runtime config. What's enabled, when, per-skill var/model/harness.
                   Cron here is UTC and the scheduler is the ONLY thing that reads it.
aeon               the CLI + dashboard entrypoint. With args → apps/cli; bare → web dashboard.
CLAUDE.md          operating manual, in every run's context. Imports @STRATEGY.md.
STRATEGY.md        the north star (Mode 7). Costs tokens on every run — keep it tight.
AGENTS.md          GENERATED from STRATEGY.md for the grok harness. Never hand-edit;
                   run `node scripts/gen-agents-md.js` (gated by ci-agents-md).

skills/<name>/SKILL.md    the skills themselves — 61 upstream. One prompt per file.
soul/              SOUL.md + STYLE.md + examples/ — voice, read on every run (Mode 7).
memory/            durable state between runs:
  logs/<date>.md     per-run append under `### <skill-name>`. The dedup substrate.
  MEMORY.md          the durable index — long-lived facts, not run history.
  issues/, topics/   durable memory: issue tracker + knowledge notes by topic.
  cron-state.json    scheduler bookkeeping. Infrastructure — no skill touches it.
output/            what skills produce: articles/, images/.
catalog/           generated manifests — skills.json, packs.json (+ .config), skill-packs.json.
                   Never hand-edit; regenerate with bin/generate-*-json (ci gates).
bin/               operator tools: add-skill, install-skill-pack, generate-*-json, export-skill.
scripts/           runtime helpers + validators. notify.sh and secretcurl.sh are copied
                   to ./notify and ./secretcurl at run time — that's why they're not at root.
apps/              dashboard (Next.js), cli, mcp-server, webhook (Cloudflare Worker).
docs/              CONFIGURATION.md, CAPABILITIES.md, skill-packs.md, harnesses.md.
.github/workflows/ 14 workflows: aeon.yml (the runner), scheduler.yml (cron matcher),
                   chain-runner.yml, and 9 ci-*.yml gates (see references/ci.md).
```

### The three that get confused

- **`aeon.yml`** (repo root) — operator config: what runs and when.
- **`.github/workflows/aeon.yml`** — the runner that executes a skill. Different file, same name. When someone says "aeon.yml" mid-debug, check which they mean.
- **`catalog/skills.json`** — the generated catalog. Read by the dashboard and `bin/add-skill`; deliberately does **not** carry schedules, because those are per-deployment operator config.
