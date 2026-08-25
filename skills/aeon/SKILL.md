---
name: aeon
description: Set up and run an Aeon agent instance — get started from scratch, pick which skills to turn on or install more from packs, reschedule or change what runs, edit what an existing skill does, fix a skill that isn't firing, set the STRATEGY.md north star and soul/ voice, turn a coding-agent chat into a scheduled Aeon skill, and mine past coding-agent conversations for recurring work worth automating as a skill. Use when the user mentions Aeon, aeon.yml, an Aeon skill / instance / routine / pack, asks to schedule, enable, edit, or debug an agent that runs on a cron, or asks what of their repeated/manual work Aeon could take over.
---

# Aeon

Aeon is an agent that runs on the user's own GitHub repo via Actions. A skill is a Markdown file (`skills/<name>/SKILL.md`); `aeon.yml` says which ones run and when.

Pick the mode they're asking for:

| | |
|---|---|
| **1 · Start** | No instance yet, or set one up from scratch |
| **2 · Reschedule** | Change times, cadence, or what a skill focuses on |
| **3 · Unblock** | "It didn't run" / "nothing happened" |
| **4 · Chat → skill** | Turn what we just did into a scheduled skill |
| **5 · Edit a skill** | Change what an existing skill does |
| **6 · What to turn on** | Pick skills, browse packs, install more |
| **7 · Strategy & voice** | `STRATEGY.md` and `soul/` — the north star and the tone |
| **8 · Mine history → skill** | "What of my repeated work could Aeon do for me?" — surface it from past coding-agent chats |

## Preflight (every mode)

1. Find the repo: current dir → `gh repo set-default` → ask. Clone it if it isn't local.
2. **Confirm `gh` points at THEIR instance, before any command that writes.**

   ```bash
   gh repo view --json nameWithOwner -q .nameWithOwner
   ```

   If that prints `aeonfun/aeon` and they aren't working on upstream itself, stop and run `gh repo set-default <owner>/<repo>`. `gh` prefers an `upstream` remote over `origin` when no default is pinned, and every Aeon write (`auth`, `secrets set`, `skills run`, config pushes) is a `gh -R <resolved>` call — so it will cheerfully put their API keys on the upstream repo and dispatch runs there. It looks like success: no error, a real run id, and the skill just never fires on their instance.
3. `gh auth status` — everything routes through `gh`. If it fails, tell them to run `gh auth login` and stop.
4. Use the `./aeon` CLI for all config writes. It preserves comments in `aeon.yml` and validates. Never hand-edit the YAML — with one exception: the CLI cannot *create* an entry for a brand-new skill (see Mode 4 step 4).

**Don't trust "disabled" for a skill you just created.** The read path lists skills from disk and defaults a missing `aeon.yml` entry to `enabled: false`, so "not configured" and "disabled" look identical. One command tells them apart:

```bash
comm -23 <(ls skills/*/SKILL.md | cut -d/ -f2 | sort) \
         <(grep -oE '^  [a-z0-9-]+:' aeon.yml | tr -d ' :' | sort)
```

Anything it prints is on disk but unconfigured. **Orientation — what's installed, what's on, and where everything lives: `references/layout.md`.**

**Setting any key or token:** read `references/secrets.md` — it has every secret and repo variable with the exact page to get it from. Always set secrets with `./aeon secrets set NAME --stdin`, never as a command argument.

---

## Mode 1 — Start on Aeon

Goal: one real notification in their phone, fast. Do not configure a schedule first.

1. **Get a repo. Ask public or private before you run anything** — it changes the command, and switching later means moving the repo.

   **Public** (recommend this): Actions minutes are free, and upstream skill updates arrive with one command.

   ```bash
   gh repo fork aeonfun/aeon --clone && cd aeon
   gh repo set-default <owner>/aeon        # REQUIRED — see below
   ```

   **Private**: a fork of a public repo is always public, so a private instance is a mirror, not a fork.

   ```bash
   gh repo create <name> --private
   git clone --bare https://github.com/aeonfun/aeon.git
   git -C aeon.git push --mirror https://github.com/<owner>/<name>.git
   rm -rf aeon.git && git clone https://github.com/<owner>/<name>.git && cd <name>
   git remote add upstream https://github.com/aeonfun/aeon.git
   gh repo set-default <owner>/<name>      # REQUIRED — see below
   ```

   Say both costs out loud before they pick private: Actions minutes bill against the account quota (2,000/mo on Free — scheduled skills burn it), and updates come from `git fetch upstream && git merge upstream/main` instead of `gh repo sync`.

   **Pin the default repo before any other command — both paths.** Both end up with an `upstream` remote (`gh repo fork --clone` adds one for you), and with no default pinned **`gh` prefers `upstream` over `origin`**. Everything in Aeon routes through `gh -R $(gh repo view …)`, so an unpinned checkout silently writes secrets to and dispatches runs against `aeonfun/aeon` instead of their instance — with no error, because the commands genuinely succeed on the wrong repo. Verify:

   ```bash
   gh repo view --json nameWithOwner -q .nameWithOwner   # must print THEIR repo
   ```

   Everything after this step is identical either way.
2. **Auth a model.** At least one is required. Fastest is `./aeon auth --oauth` (Claude Pro/Max, opens a browser), or `./aeon auth --key <key>`, which detects the provider **from the key prefix** — `sk-ant-oat` (OAuth), `sk-or-` (OpenRouter), `bk_` (Bankr), `inf_` (Surplus), `xai-` (Grok); anything else lands in `ANTHROPIC_API_KEY`.

   **UsePod and Venice keys have no prefix** and are undetectable, so a bare `--key` files them as a plain Anthropic key and the run fails later with a confusing auth error. They must be named:

   ```bash
   ./aeon auth --key <token> --provider usepod    # same for venice
   ```

   `--dry-run` prints the resolved `method=… → secret …` without calling `gh` or `claude` — worth running whenever the provider is in doubt.

   **Don't assume they have a Claude subscription:** eight providers work, including OpenRouter, Grok, and crypto-settled gateways. See "Providers and harnesses".
3. **Wire one channel.** Telegram is the fastest: create a bot with @BotFather, then `./aeon secrets set TELEGRAM_BOT_TOKEN --stdin` and `TELEGRAM_CHAT_ID`. Skip Discord/Slack/email for now — one channel is enough to prove it works.
4. **Run one skill now.** Pick it with Mode 6 — ask what they want handled, propose one — then `./aeon skills run <name>`. Wait for it, then `./aeon runs logs <id>`. They should get a Telegram message.
5. **Only then, schedule it.** `./aeon skills enable <name>` and set a time (see Mode 2).

Good first skills: `digest` (topic briefing), `github-monitor` (their repos), `heartbeat` (already on by default, reports only when something needs attention).

---

## Mode 2 — Reschedule / change the routine

Show them their day as a **timeline in their own timezone**, not a config file:

```
07:00  digest           "solana"
09:00  pr-review        your repos
18:00  heartbeat        health check
```

Build it from `./aeon skills ls --enabled --json`. (`--enabled` matters: plain `ls` prints a `SCHEDULE` column for *disabled* skills too — that's their `aeon.yml` entry, not proof anything fires.) No CLI, or want the raw file? `references/layout.md` has grep-only equivalents. Then take plain-language edits and apply them:

| They say | You do |
|---|---|
| "move the digest to 7am" | `./aeon skills schedule digest "0 6 * * *"` |
| "weekdays only" | `... "0 6 * * 1-5"` |
| "too noisy, twice a week" | `... "0 6 * * 1,4"` |
| "stop the crypto one" | `./aeon skills disable token-movers` |
| "make it about rust instead" | `./aeon skills set digest --var rust` |

Rules:
- **All cron in `aeon.yml` is UTC.** Convert from their timezone, and say so: "7am Paris = `0 6 * * *` UTC (5am in summer — want it pinned to local time?" There is no local-time option, so if DST matters, tell them which half of the year is off by an hour.
- Confirm back the **next 3 fire times in their timezone** after any change.
- `--dry-run` first on anything ambiguous, show the diff, then apply.
- Changes need a push to take effect. The CLI does it; confirm it landed.
- **Then check the value came out quoted** — one grep, every time:

  ```bash
  grep '^  <skill>:' aeon.yml
  ```

  The scheduler only reads `schedule: "…"` **with double quotes**. The CLI writes a *new* key unquoted, so an entry that had no `schedule:` yet comes back as `schedule: 0 12 * * *` and the skill is skipped forever. Details below.

Skills with `schedule: workflow_dispatch` are on-demand only — they never fire on cron. `reactive` ones fire on conditions, not time.

---

## Mode 3 — Unblock

"It didn't run." Check in this order and stop at the first hit:

1. **Is it on?** `./aeon skills ls --enabled` — is it listed?
2. **Duplicate key?** `node scripts/validate-config.js`. A repeated skill name in `aeon.yml` silently shadows the first one. Common after hand-edits.
3. **Is it even cron?** `workflow_dispatch` and `reactive` never fire on a schedule.
4. **Are Actions disabled?** `gh api repos/{owner}/{repo}/actions/permissions`. GitHub auto-disables scheduled workflows after 60 days of repo inactivity — this silently kills forks and nothing in Aeon surfaces it. Re-enable in repo Settings.
5. **Is the schedule quoted?** `grep '^  <skill>:' aeon.yml` — the value must be `schedule: "0 12 * * *"`, **with double quotes**.

   ```
   schedule: "0 12 * * *"   ✅ fires
   schedule: 0 12 * * *     ❌ never fires, no error anywhere
   ```

   `scheduler.yml` matches schedules with the bash regex `schedule: *"([^"]+)"`. An unquoted value doesn't match, `$SCHED` is empty, and the match loop hits `[ -z "$SCHED" ] && continue` — skipped silently, every tick, forever.

   How it gets that way: the CLI edits `aeon.yml` through a YAML document model that preserves an *existing* quoted node but writes a **newly added** key in plain style. So `./aeon skills schedule <name> "0 12 * * *"` is safe on an entry that already had a quoted `schedule:`, and quietly breaks one that didn't. Same for a first-time `--var`.

   **Nothing else detects this.** The file is valid YAML, `validate-config.js` reports CLEAN, and `./aeon skills ls --enabled` lists the skill with its schedule — because they all parse YAML properly and only the scheduler uses a regex. Fix by adding the quotes by hand.
6. **Did it run and fail?** `./aeon runs ls` then `./aeon runs logs <id>`. A failed skill retries after a 30-minute cooldown.

Three more, if the above are clean:

- **It ran against the wrong repo.** The giveaway is a command that reported success with a run id, but `./aeon runs ls` on their instance shows nothing. `gh` prefers `upstream` over `origin` when no default is pinned, so an unpinned checkout sends every write to `aeonfun/aeon`.

  ```bash
  gh repo view --json nameWithOwner -q .nameWithOwner   # if this isn't their repo:
  gh repo set-default <owner>/<repo>
  ```

  Then **clean up what landed upstream** — re-running against the right repo does not undo it. Any key set while mispointed is now a secret on someone else's repo:

  ```bash
  gh secret list -R aeonfun/aeon      # timestamps matching the misfire = theirs
  ```

  **Rotate it at the provider first, always** — it sat on a repo whose collaborators can land a workflow that reads it. Then re-set it on their instance with `./aeon secrets set NAME --stdin`.

  **Don't blind-delete it.** `gh secret list` shows only *last-updated*, so it cannot tell you whether the upstream repo already had that secret and the misfire **overwrote** it. Ask before removing:
  - Upstream never had it → `gh secret delete <NAME> -R <upstream>`.
  - Upstream had its own → deleting breaks *their* scheduled runs. The owner must re-set upstream's own value; the overwrite is not reversible from here.

  If the delete 403s, they never had write access — nothing was ever written, and the earlier command failed while only *looking* fine.
- **Missing secret.** Skills declare keys in `requires:`. Check them against `./aeon secrets ls --set`. A missing optional key (`KEY?`) means it degrades quietly, not that it breaks.
- **"No MCP tools available."** On the Claude harness a single unresolved `${VAR}` in `.mcp.json` disables **every** MCP server for that run, not just the broken one (`::warning::.mcp.json references secret(s) not set:` … `Skipping MCP this run.`). Grok degrades per-server instead. If an OAuth server broke a run *after* working, suspect a rotated refresh token that couldn't be saved — `references/mcp.md`.
- **It ran but sent nothing.** That's usually correct. Aeon's convention is silence on no signal — a clean run sends nothing rather than an empty report.

Note: GitHub only delivers ~10% of `*/5` cron ticks, so the scheduler catches up missed slots for up to 12 hours. A skill firing 40 minutes late is normal.

---

## Mode 4 — Turn this chat into a skill

They just did something in this chat and want it to happen on a schedule.

1. **Write the skill file.** `skills/<name>/SKILL.md` — frontmatter, then the prompt. Derive it from what actually happened in the session:
   - the prompt body = what they asked for, plus the steps that worked
   - `mode:` = `read-only` unless it needs to commit or open PRs
   - `requires:` = any API key the work hit (`KEY?` if it can degrade without it)
   - `category:` = one of `core evolution basics dev crypto productivity`
   - if they liked the output, paste a trimmed sample into the body as the format spec

2. **Fix the three things that break unattended runs:**
   - **Nobody's there.** Any point where you asked them a question has to become a default or a rule.
   - **Stay silent on nothing.** Add an explicit "if there's nothing worth reporting, log and exit without notifying." Otherwise it gets muted in a week.
   - **Don't repeat yesterday.** Add "check the last 3 days of `memory/logs/` and skip anything already reported."

3. **Check it can actually run there.** No local filesystem, no logged-in tools. If the session read their home directory or used a local MCP server, say so plainly — that part won't work unattended unless it's wired as a repo secret / `.mcp.json`. Wiring an MCP server for unattended use (dashboard Connect, OAuth refresh, the rotating-token PAT): `references/mcp.md`.

4. **Add the `aeon.yml` entry yourself.** A new skill on disk has no entry, and `./aeon skills enable|schedule` **will not create one** — they only flip entries that already exist, and report `no change — already in that state`, which is false. Add it by hand, disabled, before the fallback `heartbeat:` line:

   ```yaml
     my-skill: { enabled: false, schedule: "0 12 * * *" }
   ```

   **Include the quoted `schedule:` even though it's disabled — the quotes are load-bearing.** Writing a bare `{ enabled: false }` and letting `./aeon skills schedule` add the key later produces an *unquoted* value the scheduler cannot read, and the skill never fires (Mode 3, check 5). Seeding a quoted node here means every later CLI edit preserves the quotes.

   Match the inline `{ … }` form the other 61 entries use, on one line. `aeon.yml:367` reads per-skill `model:`/`harness:` overrides with a single-line grep, so an entry split across lines takes the global default instead.

   This is the one sanctioned exception to "never hand-edit the YAML". Validate after: `node scripts/validate-config.js` — but note it only checks structure, and will not catch an unquoted value.

5. **Regenerate BOTH catalogs, then ship it as a PR.** A new skill trips three CI gates. Run them locally — **nothing blocks a merge on red**, `main` is unprotected and has no rulesets, so an unrun gate just fails after the fact:

   ```bash
   bash scripts/check-skill-categories.sh   # category is one of the six
   bin/generate-skills-json                 # catalog/skills.json
   bin/generate-packs-json                  # catalog/packs.json — NOT optional
   ```

   `generate-packs-json` is the one everyone forgets: `catalog/skills.json` is itself a trigger path for `ci-packs-json`, so committing the skills catalog without the pack catalog goes red on a workflow you never touched. Commit both files.

   Full gate list, triggers, and the `ci-tests` / `ci-apps` commands: `references/ci.md`.

6. **Run it once** (`./aeon skills run <name>`), show them the output, then schedule it via Mode 2.

### Skill file shape

```yaml
---
name: my-skill
description: One line — what it does and what it sends.
metadata:
  title: My Skill
  mode: read-only
  category: basics
  var: ""
  tags:
    - content
  requires:
    - SOME_API_KEY?
---

Today is ${today}. <the prompt — plain instructions, including judgment calls>

## Steps
1. <the procedure — 43 of 76 skills lead with this>

## Network note
<curl / WebFetch / `./secretcurl` / `gh api` — how this skill fetches>

## Log
Report via `./notify` (use `./notify -f file.md` for anything multi-line).
Send nothing if there's nothing worth reporting.
Append what you did to `memory/logs/${today}.md` under a `### <skill-name>` heading.
```

Bodies run 133–757 lines (~306 median) — a skill is a prompt in prose, not a config file. `## Steps` / `## Network note` / `## Constraints` / `## Log` is the house shape.

Four things that bite when authoring — full detail in `references/skill-anatomy.md`:

- **`requires:` is a least-privilege allowlist — the run exports only the keys named here.** Inline (`requires: [KEY?]`) and block (`- KEY` lines) both parse, top-level or nested under `metadata:`. The catch is the value: only names matching `^[A-Z][A-Z0-9_]{2,}$` (trailing `?` = optional) are injected; a lowercase or malformed entry is silently dropped.
- **A typo'd `mode:` grants write.** Unknown values fall back to `write`, never to the safer tier. The exact string is `read-only`.
- **`${today}` / `${var}` are not templated.** Nothing rewrites `SKILL.md`; the workflow puts the date and var in the surrounding prompt and the model resolves them in context. Inventing `${my_thing}` yields a literal `${my_thing}`.
- **Never put a secret on a command line.** Use `./secretcurl` with a `{ENV_NAME}` placeholder in braces — Claude Code's permission analyzer blocks `$SECRET` expansions at run time.

Schedules do **not** go in `SKILL.md` — they live in `aeon.yml`. 10 upstream skills carry a `schedule:` or `cron:` frontmatter line anyway; **nothing reads it** (`scheduler.yml` parses `aeon.yml` only). Don't copy that pattern, and don't trust one you find — check `aeon.yml`.

---

## Mode 5 — Change what an existing skill does

"Make the digest shorter", "stop covering X", "add a source". More common than authoring a new skill.

**First, check whether it's a config change, not a file edit.** Most skills take a topic, filter, or mode through `var` — read the skill's `var:` line and the comment on its `aeon.yml` entry before touching the body. If `var` covers it, you're done:

```bash
./aeon skills set digest --var "rust"          # no file edit at all
```

Otherwise edit `skills/<name>/SKILL.md`:

1. **Read the whole body first.** These files run long (200–750 lines) and carry judgment rules, exit taxonomies, and scoring rubrics that a targeted edit can silently contradict.
2. **Don't strip the survival machinery.** Whatever else changes, the skill must keep: the `./notify` path, the silent-on-no-signal exit, the `memory/logs/${today}.md` append under `### <skill-name>`, and any already-reported dedup. Edits that "tighten" a skill often delete these. The `### <skill-name>` heading is parsed by the health loop and the dedup rule reads the last 3 days of logs — breaking either makes the skill re-report until it gets muted. Conventions in `references/skill-anatomy.md`.
3. **Update frontmatter if the behaviour moved.** A new data source that needs a key → add it to `requires:`. Now writes files or opens PRs → `mode: write`. Changed `description:`, `name:`, `category:` or `requires:` → regenerate **both** catalogs (`bin/generate-skills-json && bin/generate-packs-json`) and commit both; `skills.json` carries those fields and feeds `packs.json`. See `references/ci.md`.
4. **Warn if it's an upstream skill.** Anything shipped in `aeonfun/aeon` will conflict on the next `git merge upstream/main`. Fine, but say so — the two-repo convention is to keep local edits deliberate and few.
5. **Run it once** (`./aeon skills run <name>`) and read the output before leaving.

Automated alternative: the in-repo `autoresearch` skill evolves a target skill by generating four scored variations and shipping the winner as a PR. Reach for it when the ask is "make this better" rather than a specific change.

---

## Mode 6 — "What should I turn on?"

The real first question during onboarding. **Don't dump the catalog.** Ask two or three questions about what they actually want handled while they're away, then propose **three** skills with a one-line reason each.

Three at a time, not twelve. Every enabled skill is a recurring notification, and the fastest way to kill an instance is to make it noisy on day one. `heartbeat` is already on and stays silent unless something needs attention.

```bash
./aeon skills ls                 # all skills — SKILL / ON / SCHEDULE / PACK / DESC
./aeon skills ls --enabled       # only what actually runs
./aeon skills ls --pack crypto   # one pack
./aeon skills <name>             # one skill's detail
./aeon packs ls                  # the six first-party packs
```

`ls` footers with `76 skills · 1 enabled` — read it to them before proposing anything. First run installs the CLI runtime (tsx + yaml, ~12MB); the npm noise is one-time and expected. Grep-only equivalents: `references/layout.md`.

Packs are a visibility filter, not a runtime switch — revealing one runs nothing. Core (12), Evolution (9) and Basics (18) show by default; Dev (11), Crypto (15) and Productivity (11) are on demand.

Reasonable starting sets:

| They care about | Propose |
|---|---|
| Their repos | `github-monitor`, `pr-review`, `changelog` |
| A topic / research | `digest`, `article`, `mention-radar` |
| Markets | `token-movers`, `defi-overview`, `monitor-polymarket` |
| Shipping / traction | `heartbeat`, `shiplog`, `bd-radar` |

### Installing more

```bash
bin/install-skill-pack --list             # browse the community registry
bin/install-skill-pack <owner>/<repo>     # install a curated pack
bin/add-skill <owner>/<repo> --list       # any repo containing SKILL.md files
```

Everything lands **disabled**, security-scanned, with provenance in `skills.lock`.

**Read a community SKILL.md before enabling it.** Installing a pack means running a stranger's prompt with your secrets injected. The scanner is regex — it can't catch prompt injection. Check that `requires:` matches the stated job, that `capabilities:` is honest, and that nothing instructs the agent to send data somewhere unrelated.

**Confirm explicitly before enabling anything with real-world blast radius:** `distribute-tokens` (sends USDC), `schedule-ads` (spends money), `send-email` and `vuln-scanner` (contact real people), `deploy-prototype` and `feature` (push to other people's repos).

---

## Mode 7 — Strategy and voice

Two files that ride in the context of **every** run. Neither is required, both are cheap, and they move output quality more than any per-skill tuning.

### `STRATEGY.md` — the north star

Imported into `CLAUDE.md`, so it's in every skill's context: goal, priorities, audience, hard constraints. When a choice isn't otherwise determined, this breaks the tie. Keep it **tight** (it costs tokens on every single run) and **specific** (a vague strategy can't break a tie).

```bash
./aeon strategy show
./aeon strategy set --file STRATEGY.md
./aeon strategy build "<one-line goal>"    # dispatches the strategy-builder skill
```

`build` reads the brief plus the repo README and `memory/MEMORY.md`, then commits a draft. It runs as an Action, so pull once it finishes. No API key needed.

### `soul/` — how it sounds

By default Aeon has no personality. `soul/SOUL.md` (identity, worldview, opinions) and `soul/STYLE.md` (voice, vocabulary, anti-patterns) are read on every run, so notifications and content sound like the operator. `soul/examples/` holds 10–20 calibration samples.

```bash
./aeon soul show
./aeon soul build --handle <x-handle> --name "<Full Name>" --links <url,url>
```

`XAI_API_KEY` gives the richest read of a real X timeline; without it, `soul-builder` falls back to web search. There's also a gallery of complete example souls at github.com/aeonfun/soul.md to start from.

**The quality bar: specific enough to be wrong.** *"I think most AI safety discourse is galaxy-brained cope"* is useful. *"I have nuanced views on AI safety"* is not. Push for the first kind — a soul that can't offend anyone won't sound like anyone.

---

## Mode 8 — Mine history for skills to automate

"What am I doing by hand over and over that Aeon could just do?" Mode 4 turns *this* chat into a skill; Mode 8 mines *past* chats to find which chat is worth turning into one. It reads the operator's local coding-agent transcripts (`~/.claude/projects` or `~/.codex/sessions`), so it only works on their own machine — never inside an Aeon run.

1. **Scan.** Run the miner from the instance repo root:

   ```bash
   node "${PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}/skills/aeon/scripts/mine-history.mjs" --days 45 --top 15
   ```

   It parses every top-level session in the window (skips subagent sidechains), normalises shell commands to `binary subcommand`, groups session titles, and prints a digest ranked by **distinct sessions × distinct days** — recurrence and cadence, not raw volume. Flags: `--days N` (window, default 120), `--project SUBSTR` (only sessions whose cwd matches — scope to one repo/topic), `--top N`, `--min-sessions N`, `--json`. It has no dependencies and reverts to a clean error if there's no history. Deeper reading of the tables and the candidate rubric: `references/history-mining.md`.

2. **Read it as a human would.** The digest is raw signal, not a verdict — the judgment is yours:
   - **Recurring command workflows** — a `binary subcommand` across many sessions *and* many days is a habit. Universal plumbing (`git status`, `gh auth`, bare `node`/`python3`) is already filtered out, but `gh pr`/`gh api`/`npm run` are substrate too — high everywhere, weak as a skill idea. Look for the *distinctive* recurring call: a named script, a specific CLI (`x-cli`, `langfuse`, `raindrop`), a tight `gh api` pattern.
   - **Recurring task themes** — grouped session titles are the strongest signal. A title you've hit across many days at a rough cadence ("check X", "review Y", "digest Z") is almost always the real automation candidate.
   - **Tooling / projects** — which MCP servers and repos the work lives in; tells you what a skill would need wired and where to scope `--project`.

3. **Filter to genuine candidates.** A row is worth proposing only if it's all of:
   - **Recurring** — spans several sessions across several days, not one busy afternoon.
   - **Fetch/compute/report-shaped** — pulls or checks something and reports. Interactive, decision-heavy, or one-off migration work does *not* automate.
   - **Unattended-safe** — no dependence on local files, logged-in desktop apps, or a human answering mid-task (Mode 4 step 2/3 covers hardening).
   - **Not already a skill.** Dedup against the instance: `./aeon skills ls`. Much recurring `gh pr` work is already `pr-review`/`pr-check`; a research cadence is already `digest`/`mention-radar`. If an existing skill covers it, the move is Mode 2 (reschedule) or Mode 5 (edit its `var`), **not** a new skill.

4. **Propose three, with evidence.** Don't dump the digest. Name **three** candidates, each with its recurrence count as proof ("you did X across N sessions over D days"), a one-line skill sketch (what it fetches, what it sends), a suggested `mode:` (`read-only` if it only fetches and reports) and a suggested `schedule:` inferred from the observed cadence (seen ~daily → daily; ~weekly → weekly). Ask which to build.

5. **Hand off to Mode 4** to author the chosen one — the same skill-file shape, unattended-hardening, quoted-`schedule:` entry, and dual-catalog CI. Mode 8 finds the work; Mode 4 ships it.

**Privacy:** the transcripts are read locally and only the aggregate digest is surfaced. Don't paste raw prompt bodies or anything sensitive from a session into a channel or a committed file; the counts and titles are enough to decide.

---

## Providers and harnesses

Two independent axes. Don't confuse them: the **gateway** decides which model answers; the **harness** decides which CLI runs the skill.

### Gateway — what powers Claude Code

Set a secret and it's live. `aeon.yml` ships `gateway: { provider: auto }`, which resolves at run time from whichever keys exist, in this priority order:

```
claude → anthropic → openrouter → bankr → usepod → venice → surplus → grok
```

`direct` is **not** a hop in that chain — it's the placeholder when *none* of the eight secrets is set. It requires nothing and configures nothing, so the run proceeds on whatever `ANTHROPIC_*` env happens to exist and otherwise fails at the first model call. "Resolved to `direct`" in a log means **no key was found**, not that a fallback worked.

| Provider | Secret | Notes |
|---|---|---|
| Claude subscription | `CLAUDE_CODE_OAUTH_TOKEN` | One-click OAuth, included in Pro/Max |
| Anthropic API | `ANTHROPIC_API_KEY` | Pay-as-you-go |
| OpenRouter | `OPENROUTER_API_KEY` | `sk-or-…` · Anthropic-native passthrough, lowest-risk |
| Bankr | `BANKR_LLM_KEY` | `bk_…` · discounted Opus |
| UsePod | `USEPOD_TOKEN` | No prefix — pass `--provider usepod`. Token sits in the base URL, keep it secret |
| Venice | `VENICE_API_KEY` | No prefix — pass `--provider venice`. Privacy-first, bridged via a sidecar |
| Surplus | `SURPLUS_API_KEY` | `inf_…` · settles USDC on Base — fund the wallet + `approve()` once first |
| Grok (xAI) | `XAI_API_KEY` | `xai-…` · passthrough to `api.x.ai` |

It runs as a **cascade**, not a single choice: the highest-priority key goes first, and on *any* failure (no credits, rate limit, outage, dud response) the run falls over to the next provider whose key is set. It only errors if every one fails. The log prints `Routing attempt via '<provider>'` per hop.

- **Reorder:** repo variable `GATEWAY_ORDER` (space-separated names).
- **Pin one** (disables failover): `./aeon config set gateway <name>`.
- **Any Anthropic-compatible endpoint:** `ANTHROPIC_API_KEY` plus the repo variable `ANTHROPIC_BASE_URL` — e.g. `https://api.deepseek.com/anthropic`.

### Harness — which CLI runs the skill

`claude` (default) or `grok`. The Grok harness runs the `grok` CLI instead of Claude Code and **bypasses the gateway entirely** — it has its own auth.

- **Set it:** `./aeon config set harness grok` globally, or `harness: "grok"` on a single skill's `aeon.yml` entry — **quoted, on the entry's one inline line**. Per-skill `model:` and `harness:` are read by a single-line grep that requires double quotes (`aeon.yml:367`, `:380`), so an unquoted or line-split override is silently ignored and the skill keeps running the global default — no error, and the log's `model=` line looks normal. After setting either by CLI, re-read the entry and add the quotes if they're missing.
- **Auth:** `XAI_API_KEY`, or an X account (SuperGrok / X Premium+) via the dashboard's **Connect X account**, which stores `GROK_CREDENTIALS`. There is no CLI flag for the X OAuth flow — send them to `./aeon` (the dashboard) for that one.
- **Models:** `grok-4.5` (default, reasoning) or `grok-composer-2.5-fast` (cheap).
- **No free tier.**

Tell them up front:
- Grok runs report **0 tokens** — its JSON carries no token counts, so cost tracking reads blank. Not a bug.
- The X OAuth session expires. If unattended runs start failing on auth, reconnect.
- `mode: read-only` still applies (maps to `--sandbox read-only`), and MCP works.

Per-skill grok knobs, in `SKILL.md` frontmatter (ignored on the Claude harness): `max_turns` (default 60), `best_of_n`, `verify`, and `effort` (`low|medium|high|xhigh|max` — reasoning models only; `grok-composer-2.5-fast` rejects it).
