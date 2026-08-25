# History mining — deep reference (Mode 8)

`scripts/mine-history.mjs` reads the operator's local coding-agent transcripts and
surfaces recurring work that could become a scheduled Aeon skill. This file is the
detail behind Mode 8: what the tool reads, how it ranks, and how to turn a digest
row into a real skill without proposing junk.

## What it reads

Claude Code writes one JSONL transcript per session under
`~/.claude/projects/<encoded-cwd>/<session-uuid>.jsonl`; Codex writes one under
`~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`. Each line is a record;
the ones the miner uses:

| record `type` | field | used for |
|---|---|---|
| `ai-title` | `aiTitle` | the session's generated title — the semantic label for theme grouping (last one in a file wins = freshest) |
| `user` | `message.content` (string) | real human prompts — only plain strings without a `<system-reminder>`/`<command-name>` wrapper; tool-result echoes are lists and are skipped |
| `assistant` | `message.content[].tool_use` | `Bash` commands → normalised workflows; `mcp__*` names → MCP tool usage |
| any | `cwd`, `timestamp`, `sessionId` | project scoping, cadence (distinct days), dedup |

It only scans **top-level sessions** — files under a `subagents/` path are
sidechains (agent fan-out) and would double-count the parent's work, so they're
skipped. The scan window is bounded by file mtime (`--days`, default 120) so it
stays a few seconds even over thousands of transcripts.

## How it ranks

Everything is ranked by `distinct sessions × 1000 + distinct days × 10 + runs` —
so **breadth of recurrence dominates raw volume**. A command run 500 times in one
marathon session ranks below one run once each across 20 days: the second is a
habit with a cadence, the first is a one-off you happened to repeat. Days are the
cadence signal that tells you *daily* vs *weekly* when you get to `schedule:`.

`--min-sessions N` (default 2) drops anything seen in a single session — a true
one-off is never an automation candidate.

### Command normalisation

Each `Bash` command is split on `&&`, `|`, `;`, and loop keywords into segments;
each segment's first token becomes `binary subcommand` (for `node`/`python3` the
script basename is the "subcommand", since that's the recurring workflow). Two
denylists keep the signal clean:

- **`NOISE_BIN`** — file-poking and shell/JS keywords (`ls`, `cat`, `grep`,
  `printf`, `done`, `const`, …). Never a workflow.
- **`PLUMBING`** — universal git/gh navigation (`git status`, `git log`,
  `git diff`, `gh auth`, …). Present in nearly every coding session, so it tells
  you nothing about *what* to automate. Filtered from the command table.

What survives is the distinctive stuff: named scripts, specific CLIs, tight API
patterns. Note that `gh pr`, `gh api`, `npm run` survive the filter but are still
near-substrate — high in *every* repo. Treat them as weak on their own; they
matter only when a **title theme** explains *what* the PR/API work was for.

### Title grouping

Session titles are lowercased, stripped to their content words (stopwords
removed), truncated to the first six, and grouped. Near-identical titles collapse
("Synthesize activity logs into timeline cards" ≈ "Synthesizing user activity
logs…"), and the group is ranked by sessions then days. This is usually the
**most useful table** — the titles are already semantic, so a high-count group is
a plain-language description of a thing the operator keeps doing.

## From a digest row to a skill

A row is a candidate only if it clears all four gates:

1. **Recurring** — several sessions across several days. One busy day = not yet.
2. **Fetch / compute / report-shaped** — it pulls or checks something and reports
   a result. Read-heavy monitoring, digests, and status checks automate cleanly.
   Interactive debugging, decision-heavy review, and one-off migrations do not —
   they need a human in the loop that a cron run doesn't have.
3. **Unattended-safe** — no reliance on local files, a logged-in desktop app, or
   the operator answering a question mid-task. If the observed work used a local
   MCP server or read `~`, that part has to be re-wired as a repo secret /
   `.mcp.json` or dropped (Mode 4 steps 2–3).
4. **Not already covered.** Dedup against `./aeon skills ls` *before* proposing.
   Common overlaps to watch for:

   | Digest signal | Already a skill → do this instead |
   |---|---|
   | Heavy `gh pr` / PR review | `pr-review`, `pr-check` → Mode 2 reschedule |
   | Recurring topic research / "digest X" | `digest`, `article`, `mention-radar` → Mode 5 `--var` |
   | Repo / commit monitoring | `github-monitor`, `changelog` |
   | Shipping recap | `shiplog`, `heartbeat` |

   If an existing skill fits, the win is a **reschedule (Mode 2)** or a **`var`
   change (Mode 5)**, not a new skill. Only genuinely uncovered recurring work
   earns a new `SKILL.md`.

## Inferring the schedule

Read cadence from the `days` column of the winning row against the window:

- days ≈ window length (hit almost every active day) → **daily** (`0 13 * * *`).
- days ≈ window / 7 (a weekly rhythm) → **weekly** (`0 13 * * 1`).
- bursty / irregular → propose `workflow_dispatch` (on-demand) first; let the
  operator promote it to cron once it proves useful.

Always convert to UTC and confirm the next 3 fire times in their timezone
(Mode 2 rules), and remember the quoted-`schedule:` gotcha when the entry lands
(Mode 4 step 4).

## Privacy

Transcripts are the operator's own and can contain anything they've ever pasted
into the coding agent. The miner only emits **aggregates** — command patterns, grouped
titles, counts. Keep it that way: never surface a raw prompt body, and never write
transcript contents into a committed file or a notification. The counts and titles
carry all the signal needed to decide what to automate.

## Running it

From the instance repo root, on the operator's own machine:

```bash
# default: last 120 days, markdown digest
node "${PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}/skills/aeon/scripts/mine-history.mjs"

# a tighter recent window, more rows
node "${PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}/skills/aeon/scripts/mine-history.mjs" --days 45 --top 20

# scope to one repo/topic (matches the session's cwd)
node "${PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}/skills/aeon/scripts/mine-history.mjs" --project my-repo

# machine-readable, to post-process
node "${PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}/skills/aeon/scripts/mine-history.mjs" --json | jq '.titles'
```

Needs only Node (>=16) and a local `~/.claude/projects` or `~/.codex/sessions` - it exits with a clear
message anywhere that directory is absent (e.g. a CI checkout), and never writes
anything. If a busy background app dominates the tables (a tool that itself drives
a coding agent will pile up near-identical sessions), scope past it with `--project`.

### Flags

| flag | default | effect |
|---|---|---|
| `--days N` | 120 | only sessions whose transcript was modified in the last N days |
| `--top N` | 20 | rows per table |
| `--project SUBSTR` | — | only sessions whose cwd contains SUBSTR |
| `--min-sessions N` | 2 | drop candidates seen in fewer than N distinct sessions |
| `--json` | off | raw JSON instead of the markdown digest |

### Sample output (synthetic)

```
# Automation candidates - mined from coding-agent history

Scanned 240 sessions (240 files, last 45 days) across 38 active days.

## Recurring command workflows
| # | pattern      | runs | sessions | days | projects |
| 1 | `gh pr`      | 610  | 92       | 34   | 40       |
| 2 | `gh api`     | 240  | 55       | 30   | 28       |
| 3 | `npm run`    | 180  | 41       | 22   | 12       |

## Recurring task themes
| # | recurring session title  | sessions | days |
| 1 | Review open pull requests| 14       | 12   |
| 2 | Weekly analytics digest  | 6        | 6    |
| 3 | Audit repos for cleanup  | 4        | 4    |
```

Read that as: PR review is a near-daily habit (route to `pr-review`, don't
re-invent it); a weekly analytics digest recurs on a clean 7-day cadence and has
no covering skill (a real new-skill candidate → daily/weekly `mode: read-only`);
the repo audit is real but low-cadence (offer `workflow_dispatch` first).
