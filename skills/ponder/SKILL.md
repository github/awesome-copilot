---
name: ponder
description: 'Convergent deliberation loop - repeated grading passes over one subject until the answer stops changing, with coverage enforced so no unit is silently skipped. Use when the user says "ponder <anything>" ("ponder the UI", "ponder our error handling"), "think this over properly", "keep thinking until it converges", "keep looping until it converges", "loop on this until it stops changing", "go through all the screens and grade them", "audit/rate/grade every X", or asks for any broad sweep-and-grade across many units where a single pass would miss things. Also use to resume or recover a ponder already in flight - "where were we", "carry on pondering", a lost thread mid-loop, or a .ponder/ directory in the project - where the move is to run ponder status rather than start over.'
---

# Ponder

Ponder runs repeated passes over one subject until the answer stops changing: each pass revises the previous pass's findings - adding what was missed (`Dreamer` → `add`), sharpening what was vague (`Builder` → `edit`), re-grading what was mis-scored from the human user's lived and emotional perspective (`Empath` → `change`), and retracting what was unsupported or dead-code noise (`Skeptic` → `delete`). You decide how many passes to run; the engine measures whether stopping is honest and refuses to let you stop while a single enumerated unit is ungraded.

Unlike standard multi-pass prompts that force an LLM to manufacture nitpicks or hallucinate when asked to review again, Ponder treats **epistemic silence** as the goal of late passes: all four voices must verify the evidence and speak in `deliberation.json` (`voices = 4`), but a voice whose findings already hold emits **zero deltas**. Two consecutive fully reviewed, confident quiet passes earn `stop (converged)`.

> **Lost the thread mid-ponder? Run `ponder status`.** It names the pass you are in, the phase you owe, and the literal next command. If you do not know the slug - or do not know whether a session exists at all - run `ponder list` first; a `.ponder/` directory in the project means one probably does. Do not start over: a second session throws away the first one's ledger, which is the whole value. See [Resumption](#resumption) before you conclude anything is missing.

The binary is `ponder` on `PATH` (`~/.local/bin/ponder`), `${CLAUDE_PLUGIN_ROOT}/bin/ponder` (when installed as a plugin), or `~/code/ponder/bin/ponder`. If `command -v ponder` fails and neither path exists, clone [`https://github.com/Quinnod345/ponder`](https://github.com/Quinnod345/ponder) to `~/code/ponder` and run `~/code/ponder/install.sh` from that reviewed checkout. **Every command ends with a `NEXT:` line naming the phase you now owe.** That line is the engine driving you, and it is the thing that survives a compaction.

Every `--file` in this document is a path you write first. Make the scratch directories once, before the first command: `mkdir -p .ponder/tmp/batch`. The engine ignores directories under `.ponder/` that hold no `session.json`, so `.ponder/tmp/` is a safe place to stage input - `tmp/` for what you hand the engine, `tmp/batch/` for what fan-out agents write.

The terminal transcripts below are abbreviated and are there to show you the *shape* of a pass. Where a transcript and the engine disagree, the engine is right - read its actual output.

Deeper references, load only when you need them:

- `references/protocol.md` - every command, every flag, every JSON shape, the verdict rules, exit codes, and how reconciliation and `verify --repair` work.
- `references/perspectives.md` - Skeptic / Builder / Dreamer / Empath as runnable prompts, and how to fan them out.
- `references/harness-notes.md` - what differs between Claude Code and Codex: subagents, sandboxing, psql, install. Also the session lock, in full, if you are about to fan work out.

Read the lens pack for your subject (`lenses/<lens>.md` in the ponder repo) before pass 1. It defines what a unit is, how to enumerate exhaustively, the dimensions, and what each rung of the 1-5 scale means.

## The loop

### Once, at the start

**First check that you are actually at the start.** If a pondering of this subject is already open, `start` is the wrong command and a second session throws away the first one's ledger.

```sh
ponder list                                     # is one already open? if yes, go to Resumption
ponder doctor                                   # environment + whether the OCA bridge is reachable
ponder start "the UI" --lens ui --max-passes 6 --min-passes 2
```

`start` prints **Prior pondering** if the OCA remembers thinking about this subject before - read it, it is where you left off last time. The OCA is optional; an unreachable one degrades silently and never blocks a pass.

### Every pass, in this order

1. **predict** - before you look at anything.
   `ponder predict --churn 0.35 --claim "Pass 1 over-graded empty states and never opened the error paths."`
   You are stating what this pass will do to the finding set. The engine scores it as `surprise = |predicted - actual|`. Guessing low every time to look calibrated corrupts the only signal that tells you whether you understand the subject yet.
   **`--churn` is validated to 0-1 - anything outside that is refused, not clamped: `ponder predict --churn 1.2` exits `1` and records nothing.** `0` and `1.0` are both legal. On pass 1 the number is recorded but not scored - there is no previous pass, so the engine reports no churn to take the distance from. Write the honest guess and put the real content in `--claim`. The signal starts at pass 2.
2. **survey** *(pass 1 only)* - enumerate every unit exhaustively, using the lens pack's enumeration recipe, or let the CLI walk disk/git directly with `--scan <dir>`.
   `ponder units --file .ponder/tmp/units.json --scan src/routes --strict-scope` (or `ponder units --scan src/routes` to auto-seed every file in `<dir>`)
   When `--scan <dir> --strict-scope` is passed alongside `--file`, the engine cross-checks every `unit.path` against the actual files on disk under `<dir>` and exits `2` if any file was omitted. Later passes amend the inventory with deltas instead: `unit-add` for what the survey missed, `unit-edit` for what it got wrong, `unit-delete` for what is out of scope.
3. **appraise** - grade every unit against the lens rubric.
   Pass 1: `ponder grade --file .ponder/tmp/findings.json`
   Pass 2+: re-read the units and the current findings. The output is deltas, filed at step 5 - on later passes you appraise *by* revising, so there is no separate command.
4. **deliberate** - put the current finding set to the four perspectives (`references/perspectives.md`).
   `ponder deliberate --file .ponder/tmp/deliberation-2.json`
   **This is where the through-line gets written, not just where deltas get produced.** The findings are per-unit by construction; the argument is the only place in the loop where anything is said about the set as a whole. On the 228-screen run the single most valuable output was not one of the 760 findings - it was the Dreamer's cross-screen claim, which no individual grade could have carried. Write each `argument` as a paragraph that would be worth reading on its own, name the pattern across units, and let the deltas fall out of it. An argument written as a list of delta stubs has already thrown away the part that mattered.
   Skipping is legal and recorded against you: `ponder deliberate --skip --why "..."` marks the pass skipped in `passes/NN/deliberation.json`, surfaces the reason in `report.md`, and - when the OCA is reachable - raises a `deliberation_skipped` metacognitive observation. The record survives with the OCA off; only the observation does not.
5. **revise** - apply the deltas the deliberation produced.
   `ponder delta --file .ponder/tmp/deltas-2.jsonl`
   Every delta carries `op`, `perspective`, and a non-empty `why`. The engine rejects a delta without a `why`. On pass 2+ this call satisfies appraise as well.
   **Token-efficient internal notation:** To keep multi-pass token usage low (~56% reduction across 4 passes), you may write internal machine-to-machine `deliberation.json` arguments and `deltas.jsonl` `why` strings using compact causal arrows (`"safe-query.js:5 binds $1 -> SQLi claim false -> retract"`), while keeping all user-facing finding `title`, `detail`, and `recommendation` fields in clear, complete prose.
6. **judge** - `ponder judge` computes the metrics and prints advice.
7. **decide** - `ponder decide <continue|stop|escalate> --why "..."` commits your call.

On pass 2+ the engine skips survey and collapses appraise into the `ponder delta` call, so the command sequence is **predict → deliberate → delta → judge → decide**. Phase order is enforced: a command that arrives out of order exits `2` and names the phase you owe. Believe that message over your memory. And if at any point in this list you are not certain which pass you are in or what you already did, stop guessing and run **`ponder status`** - it is cheap, it takes no lock, and it answers both ([Resumption](#resumption)).

`voices` counts the perspectives that **spoke in the deliberation** - a non-empty `argument` in `passes/NN/deliberation.json`. A Skeptic who opened the evidence, found the finding sound and said so has voted; finding nothing is a result, and a voice should not have to manufacture a delta to be counted. A pass that skipped deliberation heard nobody and reports `voices` 0. Watch the delta *ops* separately: a pass whose deltas are all `add` accumulated rather than argued, whatever its `voices` says.

## How many passes

`ponder judge` **advises**. `ponder decide` **commits**. The advice is computed from coverage, novelty, churn, thrash, surprise, stall, confidence floor and voices (formulas and the ordered verdict rules are in `references/protocol.md`). It cannot see what you know, so it can be overridden - with one exception below.

**Write the `--why` before you choose.** Whichever way you are leaning, draft the sentence you would put in `ponder decide` and read it as the user will read it in `report.md` in a month. "Two quiet passes, full coverage, every open must above 0.5 confidence" is a stop. "Nothing new came up" is not - it is the sentence you write when you are tired. If you cannot write a `--why` that survives being read back, you have your answer: run another pass.

**Default to the advice.** You may override it in either direction, and both directions cost the same thing: a `--why` of at least 12 characters, written permanently into `report.md` under **Overrides**. Overriding a `stop` into another pass is the cheap mistake - one more pass. Overriding a `continue` into a `stop` is the expensive one, and the bar for it is the whole honest-stop checklist below, every item, not a feeling that you are done. The two checklists below are where the decision actually gets made - the engine's rules got you a default, and you are the only one in the loop who can see whether it is right.

Override toward another pass when any of these is true:

- **The last pass changed your mind about something important.** If pass N killed a finding you would have shipped, moved a severity, or opened a dimension nobody had looked at, then pass N+1 has somewhere real to go. Late novelty is not noise - it is evidence the subject is deeper than your inventory.
- **A whole class of unit was graded shallowly.** One finding on a screen no earlier pass had seen is a first look, not a grade. Same for "all six modals got one line each". Coverage counts units, not depth; it cannot see this and you can.
- **The deliberation barely happened.** `voices < 3` - fewer than three perspectives argued at all - or four spoke and the deltas still came back all one op. Run another pass and put the Skeptic and the Empath on it specifically; the missing voices are usually the ones that would have cut findings, not added them.
- **Your prediction was badly wrong toward more churn** (`surprise > 0.3` with actual above predicted). You do not model the subject yet, so you cannot claim it has settled.

**Stopping is honest when all of these hold:**

- `coverage` is 1.0 (the engine enforces this; see below).
- The last two passes produced no `add` you would defend as new ground.
- `churn` is near zero, and what did move was ranking, not substance.
- Every open `must` finding has `confidence >= 0.5` - that is `confidenceFloor 0.00` on the judge table, not merely under the 0.2 the engine enforces. You are about to recommend work; a `must` you cannot defend is a guess you are asking someone to act on. If the floor is not zero, either go and get the evidence (a `change` raising the confidence) or drop the severity.
- The last pass you would call substantive heard at least three voices. `ponder decide stop` warns below three and lets you through; if you go through, say why in the `--why`.
- Every unit you dropped from the inventory, you dropped for a reason you would say out loud to the person who asked for the pondering. See the phantom rule below.

**Stopping is not honest** because you are bored, because the context got long (that is what `ponder status` and a fresh subagent are for), because the remaining findings are tedious to write up, or because you hit `maxPasses` while the numbers were still moving. That last one is a **budget stop** - the engine reports it as `budget`, never as convergence, and so should you.

**A converging pass is supposed to feel quiet, and a pass that emits nothing is a real result.** The last pass of the 228-screen run produced zero deltas from all four voices - every perspective read the set, found nothing it would change, and said so - and that was the correct, honest outcome, not a wasted pass. It is the strongest evidence of convergence the loop can produce: four voices looking for work and finding none. Expect the pass count to feel anticlimactic near the end, and do not manufacture a delta to prove you were there. The mechanics allow it: `ponder delta` takes an empty file, applies nothing, prints `0 deltas applied` and `delta voices 0/4 - no perspective emitted a delta`, and advances the phase like any other pass. A `voices 4/4` with `delta voices 0/4` and a deliberation whose arguments each say concretely *what was re-checked and why it held* is a converged pass. The same row with four arguments saying "looks fine" is three voices going through the motions, and only you can tell which one you just ran.

**`blocked` cannot be overridden.** When `coverage < 1.0` the verdict is `blocked`, it names every ungraded unit, and `ponder decide stop` exits non-zero. Every other verdict is a judgement call about diminishing returns; this one is a fact about work not done, and it is the exact failure ponder exists to prevent - a sweep that grades 11 of 12 screens and reports as though it graded 12. There is exactly one move that always works: **go and grade the missing units** (`ponder delta` with `add`s). There is a second move, narrow and checked by the engine, for a unit that does not exist at all - the phantom rule below.

Do not go looking for a way around it. `ponder decide` recomputes coverage from `units.json` and `findings.json` at the moment you decide, so a stale `metrics.json`, a hand-edited `verdict.json`, a lowered `--min-passes`, `--json` mode and a second session all leave the gate exactly where it was. Verified: every one of those still exits `2`, `--json` included - it just returns the refusal as `{"ok": false, "code": 2}` instead of printing it.

**`escalate` means the loop is oscillating** (`thrash > 0.25` - passes reversing each other on the same targets). Another identical pass will not help. Rotate which perspectives lead, widen the evidence you are reading, or split the subject into two sessions and ponder each. Commit it with `ponder decide escalate --why "..."` and then actually do something different.

Budget shape: `--min-passes 2` because a single pass is an opinion, not a pondering; `--max-passes 6` for a broad sweep, 3-4 for a narrow subject.

### Correcting a unit - the caption has to follow the finding

**A unit's `label` is a caption on the inventory, and a pass that corrects the finding underneath it has to correct the caption too.** Pass 1 enumerates a screen as `"Marketing footer - both links 404"`. Pass 3 opens the file, finds `/privacy-policy` resolves fine, and rewrites the finding to say so. If the caption cannot move, `report.md` now leads with a headline that contradicts the finding printed directly beneath it. The real 228-screen run shipped exactly that, because there was no way to fix it. There is now.

```
{"op":"unit-edit","target":"screen.marketing.footer","perspective":"builder","why":"Pass 1's label said both links 404; the finding under it now says the opposite, and says it correctly.","set":{"label":"Marketing footer - /privacy-policy resolves","meta":{"route":"/"}}}
```

- **It sets `label`, `path`, `kind`, `meta` - and nothing else.** Anything else is refused by name.
- **It can never set `id`.** The id is the join key between `units.json` and `findings.json`; moving it would orphan every finding on that unit. The engine refuses and says so. If the id itself is wrong, `unit-delete` and `unit-add` the corrected unit, and pay what that costs coverage.
- **`meta` merges key by key.** Correcting a route leaves the `state` marker sitting beside it alone. Every other field replaces.
- **Coverage does not move.** That is the point. Correcting a caption by deleting the unit and re-adding it would drop coverage below 1.0 and block the stop - a wrong caption would reopen the session. `unit-edit` costs `churn` instead, which is honest: something did move.
- **It is a revision, so it thrashes like one.** A label changed in pass 2 and put back in pass 3 registers as a reversal.
- **It is on the record.** Every `unit-edit` appears in `report.md` under **Corrected screens** - or whatever your lens calls a unit - with its pass, its voice, the new values and your `why`. And a label edited by hand in `units.json` with no ledger record behind it is a divergence: `judge`, `decide`, `report` and `apply` all refuse the session until it reconciles. Correcting a caption on the record is one delta. Correcting one off the record is not available.

Use it when the pass genuinely learned something about the unit. Do not use it to tidy wording you simply prefer - that is churn you will have to defend at `decide`.

### The phantom rule - deleting a unit you never looked at

`unit-delete` is the only op that shortens the ungraded list, so it is the one the engine watches hardest. What it costs coverage depends on whether you ever looked:

- **The unit carries a finding** (even a retracted one - withdrawing a judgment does not un-see the thing). Deleting it is an honest scope change. It leaves the inventory and the coverage denominator.
- **The unit was never graded.** It leaves the inventory and **stays in the coverage denominator**, still counted, still ungraded, gate still shut. Nothing errors. Coverage simply does not move, and if you were deleting it to make the number go up, it did not work.
- **The unit was never graded and the delta carries `"phantom": true`.** Now the denominator drops - after the engine has checked you. It resolves **every path the unit has ever carried** from the project root: **any of them exists → the whole batch is rejected** (`Something you can open is not something pass 1 imagined`); all of them missing and the path never moved → accepted and recorded for ever as `verified-missing`; the path was edited, or there was never one → accepted and recorded for ever as `unverified`. Every accepted phantom is named permanently in `report.md` under **Phantom units**, with your `why` quoted underneath it.

```
{"op":"unit-delete","target":"screen.legacy.print","perspective":"skeptic","why":"Opened src/routes/legacy/print.tsx - the file is gone; the route was removed in #1841 and pass 1 enumerated it off a stale router snapshot.","phantom":true}
```

**Now the part that matters.** `phantom` is a claim that a route does not exist - that pass 1's survey enumerated something the software does not have. It is not a claim that you ran out of context, or time, or patience.

**If you did not look at a screen, do not delete it from the list. Go look at it.** That is the whole job. The engine can catch you only when the unit has a path to check; a unit with no path is accepted on your word alone, and the record will say `unverified` next to your `why` for as long as the session exists. Writing `"phantom": true` about a route you simply never opened is lying to a file that keeps it - and it is precisely the half-delivered sweep ponder was built to make impossible, done by hand.

Before you write `phantom`, answer one question: **what did I open, and what was not there?** If the answer names a path and an absence, put it in the `why` and file the delta. If the answer is "nothing, I just didn't get to it", you have a unit to grade, not a phantom to declare.

**And the path is not a way around that.** `unit-edit` can move a unit's `path`. Two deltas - point the unit at a filename that does not exist, then claim it never existed - would have the engine certify the absence of a screen that is sitting right there in the repo. That is the same dishonesty as the last paragraph wearing a new op, and the engine closes it: **a phantom claim is checked against every path the unit has ever carried** - the one its `unit-seed` or `unit-add` gave it, every value any `unit-edit` has set since, the one `units.json` holds now, and any set earlier in the same batch. One survivor sinks the whole batch, and the refusal names the path it found and the pass that set it:

```
delta line 3: unit "screen.auth.sso" is claimed phantom, but a path it has carried exists:
/abs/src/routes/auth/sso.tsx (carried by the unit-add that created it in pass 4). Something you
can open is not something pass 1 imagined. A phantom claim is checked against every path the unit
has ever had, so editing the path first does not clear it.
```

Editing a path never *strengthens* a phantom claim either. If the path moved and no version of it exists, the claim is accepted but permanently recorded `unverified` - never `verified-missing` - and `report.md` says which paths were checked. Every version was missing, and the engine still will not certify it, because "missing" and "never existed" are only the same claim when the target stayed still. So a moved path buys you exactly nothing and leaves a permanent note that the unit moved before it vanished.

If the path in the inventory is genuinely wrong, correct it with a `unit-edit` and **go grade the screen**. That is what the op is for. It is not a step on the way to deleting the screen.

**And one refusal that is not about you at all.** Every path is resolved from the session's project root, so the check is only as good as that root. If the root was *guessed* - no `--project`, and no `.git` / `package.json` / other project marker anywhere above the directory you started in, so the engine adopted a stray `.ponder` or fell back to the working directory - then a path that fails to resolve tells you nothing, and the claim is refused:

```
delta line 2: unit "screen.settings.profile" is claimed phantom and none of the 2 paths it has
carried (src/routes/settings/profile.tsx, src/routes/settings/profile-v2.tsx) resolves under
/private/tmp - but that project root was guessed, not established (no project marker anywhere
above the working directory; adopted an ancestor .ponder). A file that is missing from the wrong
directory is not a screen that never existed.
```

This is the engine refusing to certify its own guess. `ponder start` and `ponder status` print the project root and what decided it, so check that line first: if it says the root was adopted or fallen back to, and it is not where the software actually lives, start the session again with `--project <path>` and the claim will be checked properly. A unit that never had a path is unaffected - there was nothing for a root to resolve, and it is still accepted as `unverified` on your word.

The honest exits when you genuinely cannot finish are `ponder decide continue` (do the work next pass) and `ponder abort --why "..."` (say what stopped you). Both leave a record that reads true later. A false phantom does not.

## Fanning out over many units

A sweep of 40 screens does not fit in one context and should not try to. Batch the *grading*; keep the *session* single-threaded.

**Batching rule: 8-12 units per agent.** Fewer wastes a context; more and the last units in the batch get a thinner read than the first - exactly the shallow-grade failure you would then have to spend a pass fixing.

Non-negotiables for fan-out:

- **Only the parent runs `ponder`.** Batch agents grade and return text. The engine does hold an exclusive lock on the session, so a race cannot corrupt it - but a race has a **loser**, and the loser's work is refused, not merged. Two concurrent `ponder delta` calls: one applies its batch and advances the phase; the other waits for the lock, reloads the session, finds it now owes `judge`, and exits `2` with nothing applied. A subagent that does not check its exit code will report success while its entire batch went nowhere. Collect JSONL from the batch agents, concatenate, and make one call yourself. (`references/harness-notes.md` has the lock's full behaviour - the wait, the stale reclaim, what the loser sees.)
- **Give each agent the rubric, its own units, and the output shape** - the lens pack text, its unit list with paths, the dimensions, the 1-5 scale. Do not give it the whole finding set on pass 1; you want independent grades, not consensus.
- **On revision passes, hand each agent only the current findings for its own units**, and ask for *deltas*, not a re-grade. Ask for a re-grade and you get thirty `add`s that duplicate what is already there, which the Skeptic then has to kill, which the thrash detector then flags.
- **Ask for JSONL, one object per line, and nothing else** - no prose, no fences. A truncated line is droppable; a truncated JSON array is garbage. Concatenation is then `cat`.

**In Claude Code:** use the Agent tool, one agent per batch, all launched in a single message so they run in parallel. Each agent writes its lines to `.ponder/tmp/batch/findings-<n>.jsonl` and returns only the path plus a count. For a very large sweep (60+ units, or one where batches need retrying), the Workflow tool handles batching and result collection better than hand-rolled parallel agents.

**In Codex:** there is no in-process subagent. Either spawn `codex exec` subprocesses, one per batch -

```sh
codex exec -C "$PWD" --sandbox workspace-write --skip-git-repo-check \
  -o .ponder/tmp/batch/batch-3.txt \
  "Grade these 10 screens against ~/code/ponder/lenses/ui.md. Units: ... .
   Write one JSON finding object per line to .ponder/tmp/batch/findings-3.jsonl. Output nothing else." \
  </dev/null &
```

- backgrounded with `&` and collected with `wait`; or run batches **sequentially in one context**, writing each batch's JSONL to disk and dropping the detail before starting the next. Sequential is slower but has no subprocess or sandbox surprises, and the disk is your memory either way. `codex exec` starts a fresh session and inherits none of your context, so everything it needs goes in the prompt or in a file it can read.

Neither of the two extra tokens on that command line is decoration. Without `--skip-git-repo-check` the child exits `1` before it does any work - `Not inside a trusted directory and --skip-git-repo-check was not specified` - so a ponder of anything that is not a git checkout loses every batch at once. And `codex exec` reads stdin even when the prompt is an argument; backgrounded with `&` it inherits the parent's stdin, so `</dev/null` is what stops a batch blocking on a pipe nobody is going to close.

Then, in either harness, concatenate once and hand the engine a single file. `ponder grade` takes JSON, not JSONL, so the batch lines need wrapping:

```sh
cat .ponder/tmp/batch/findings-*.jsonl > .ponder/tmp/all.jsonl
node -e 'let s="";process.stdin.setEncoding("utf8");process.stdin.on("data",d=>s+=d).on("end",()=>{const findings=s.split("\n").filter(Boolean).map((l)=>JSON.parse(l));process.stdout.write(JSON.stringify({version:1,findings},null,2)+"\n")})' \
  < .ponder/tmp/all.jsonl > .ponder/tmp/findings.json
ponder grade --file .ponder/tmp/findings.json
```

`setEncoding("utf8")` is not decoration. Without it the chunks arrive as buffers and each one is stringified on its own, so a multi-byte character that straddles a 64 KB read boundary is coerced to replacement characters. Reproduced deterministically: 65,535 ASCII bytes followed by `数` turns that one character into three `U+FFFD` without it, and survives intact with it. Whether it bites at all depends on where your curly quotes and accents happen to fall, which is the worst property a corruption can have - it ships a mangled title with a clean exit code and no warning, and the run that finds it is not the run that has the bug.

**Stage batch files in their own directory (`.ponder/tmp/batch/`) and never let the concat glob match its own output.** `cat .ponder/tmp/deltas-*.jsonl > .ponder/tmp/deltas-2.jsonl` works exactly once: on the re-run you are told to do when a batch dies, the glob now matches `deltas-2.jsonl`, the shell truncates it before `cat` opens it, and `cat` ends up reading the file it is writing.

What happens next depends on sort order, which is the part that makes this hard to believe until it bills you. Measured: with `deltas-1.jsonl` sorting *before* the target, `cat` copies batch 1 in, then opens `deltas-2.jsonl` and finds that same content waiting for it - a loop that fills the disk (capped at 20 MB with `ulimit -f` in the test, still climbing when it hit the cap). With the target sorting first, there is no loop at all: it reads an empty file and you get a quietly incomplete batch instead. So the failure is either a full disk or silent data loss depending on what you named the files, and "I tried it once and it was fine" proves nothing. Deltas need no wrapping, so:

```sh
cat .ponder/tmp/batch/deltas-2-*.jsonl > .ponder/tmp/deltas-2.jsonl   # pattern cannot match the target
ponder delta --file .ponder/tmp/deltas-2.jsonl
```

Deliberation does not fan out by unit. It fans out by perspective - four agents, one per voice, same finding set, each emitting only its own delta op. See `references/perspectives.md`.

## Resumption

**If you have lost context, do not guess and do not start over. Run `ponder status`.**

```sh
ponder status
```

```
ponder status - ui-2026-08-24
  session       ui-2026-08-24  open
  subject       the UI
  lens          ui - unit = screen, 12 dimensions
  grade on      information-hierarchy, empty-states, loading-states, error-states, motion,
            affordance-clarity, density, responsive-behaviour, accessibility,
            copy-tone, consistency, delight
  pass          3 of 6  (min 2)
  owes          deliberate
  coverage      0.92 - 11 of 12 screens graded
  findings      29 total · 26 open · 0 resolved · 0 deferred · 3 retracted
  prediction    churn 0.12 - "The invite route is small; one or two findings there and no…"
  signals p2    novelty 0.12  churn 0.42  thrash 0.00  surprise 0.02  stall 0  conf-floor 0.11  voices 4/4
  last verdict  pass 2: blocked → decided continue - "Dreamer found /invite/:token. Cannot stop with a screen…"
  oca           reachable - postgres://localhost/oneiro
  store         /abs/path/.ponder/ui-2026-08-24

  1 ungraded screen - stop is refused until this list is empty:
    screen.invite.accept

  History
    pass  advice    decision  reason
    1     continue  continue  Pass 1 is the inventory plus a first opinion. Nothi…
    2     blocked   continue  Dreamer found /invite/:token. Cannot stop with a sc…

NEXT: deliberate - ponder deliberate --file deliberation.json --session ui-2026-08-24   # or: ponder deliberate --skip --why "<reason>"
```

**Act on the `owes` row and the `NEXT:` line.** `NEXT:` is the literal command, already carrying `--session`; paste it. Everything else you need to resume is in the same block: which pass, what is still ungraded, what the last pass decided and why, and where the files are. The `signals` row is labelled with the pass it came from - `signals p2` while you are working pass 3, because the current pass has not been judged yet.

### Getting back to work in five commands

Do these in order. Do not substitute recall for any of them.

```sh
ponder status                                   # 1. the pass, the phase you owe, the ungraded list
ponder verify                                   # 2. do the files still agree with the ledger?
cat .ponder/<slug>/findings.json                # 3. the current truth - every live finding, with ids
cat .ponder/<slug>/ledger.jsonl                 # 4. how it got there: every delta, every why, in order
ponder report                                   # 5. optional, when you want it readable rather than raw
```

Then run whatever `NEXT:` printed.

**`ponder verify` is the command for a session you did not personally leave in a known state** - one you inherited, one another agent was driving, or one whose last command was interrupted. It replays `ledger.jsonl` from line 1, derives what `units.json` and `findings.json` must contain, and compares - then compares the ledger against the per-pass `deltas.jsonl` files, which are the same records written a second time. Exit `0` and a summary means the session is sound. Exit `2` names every id and field that disagrees, and `judge`, `decide`, `report` and `apply` will refuse the session on the same grounds, so it is better to find out now than at the verdict.

Every command writes `ledger.jsonl` **before** it writes the state files, so the only thing an interrupted command can leave behind is a ledger that is ahead of its own view - and that is repairable. **`ponder verify --repair`** replays the ledger, rewrites the state files to what those records must have produced, appends the missing tail to any pass's `deltas.jsonl`, and prints line by line what it rebuilt. It refuses, exit `2`, when a state file holds a unit or a finding **no ledger record ever created**: that data exists in exactly one place, so nothing can rebuild it, and it is either a forgery or an unrecoverable loss. Do not go looking for a flag past that refusal - there isn't one, and `--repair` never invents state. Without `--repair`, `verify` writes nothing at all, so running it is free.

Steps 3 and 4 are not optional reading for a mid-loop pass. You cannot deliberate over a finding set you have not re-read, and you cannot avoid re-adding what the Skeptic killed two passes ago without the ledger in front of you - that is what `thrash` measures and what an `escalate` you caused yourself looks like. For a big set, read the findings for the units this pass is about, plus every ledger line touching them.

Everything else you might need:

- `ponder status --json` for the same thing machine-readable, including the ungraded unit list.
- `ponder list` shows every session it can see from here - both stores, this project's `.ponder/` and the `~/.ponder/` fallback - with each one's status, pass, phase and coverage. It is how you find a slug you have forgotten. Every other command then takes `--session <slug>` to target one. **Never start a new session because you lost the thread** - you would throw away the ledger, which is the whole value.
- Nothing in `findings.json` or `ledger.jsonl` is ever erased. A retraction is a state, so pass 2's reasoning is still legible in pass 6 and a later pass can reverse an earlier pass's kill.
- `ponder doctor` reconciles every session it can see and names any that fail under **Problems**, with the `ponder verify --session <slug>` that diagnoses each one. That is how a machine full of sessions tells you which one is damaged.
- **Never hand-edit `units.json` or `findings.json` to fix something.** The ledger is the authority and every decision-point command recomputes against it, so a hand-edit does not correct the session - it breaks it, and you will meet the refusal at `judge`. Everything you might want to fix that way has a delta: `edit`, `change`, `delete`, `unit-add`, `unit-edit`, `unit-delete`.
- Re-running a phase you already satisfied exits `2` and names the phase you actually owe. That is not an error to work around; it is the state machine correcting your memory.
- If the subject genuinely changed under you, `ponder abort --why "..."` and start a clean session. Silently re-scoping an open session poisons its metrics.

If you were the parent of fan-out agents and one died, re-run that batch only. The state lives in files, not in anybody's context.

**A compaction is not a reason to stop.** It is the failure mode the whole design is built around: the files hold the pondering, `ponder status` hands it back, and the loop continues from exactly where it was. Deciding `stop` because your context got long is the dishonest stop wearing a technical excuse - and if coverage is short, the engine will refuse it anyway.

## Worked example - pondering a UI

Twelve screens, four passes, one of them blocked. Abbreviated throughout.

**Pass 1 - seed.**

```sh
mkdir -p .ponder/tmp/batch
ponder start "the UI" --lens ui --max-passes 6 --min-passes 2
ponder predict --churn 0.9 --claim "Pass 1 is seeding. I expect the empty and error states to be the weak dimensions and the dashboard to grade well."
```

On pass 1 the number is recorded and not scored - there is no previous pass to have churned against - so the `--claim` is the part that will be worth reading in pass 2. Both go into `passes/01/predict.json` and into `report.md`.

Enumerate per the lens - a unit is one thing a person can be looking at, so a route with a distinct
empty, loading or failed state is more than one unit. Eleven units across seven routes (remember that number):

```json
{ "version": 1, "lens": "ui", "units": [
  { "id": "screen.dashboard", "label": "Dashboard - populated", "path": "src/routes/dashboard.tsx",
    "kind": "screen", "meta": { "route": "/" } },
  { "id": "screen.settings.billing.empty", "label": "Settings → Billing - no invoices",
    "path": "src/routes/settings/billing.tsx",
    "kind": "screen", "meta": { "route": "/settings/billing", "state": "empty" } }
] }
```

```sh
ponder units --file .ponder/tmp/units.json     # 11 units
ponder grade --file .ponder/tmp/findings.json  # 24 findings → f-0001..f-0024
ponder deliberate --file .ponder/tmp/deliberation-1.json
ponder delta --file .ponder/tmp/deltas-1.jsonl # 8 deltas: 2 add, 3 edit, 2 change, 1 delete
ponder judge
ponder decide continue --why "Pass 1 is the inventory plus a first opinion. Nothing has been argued with yet."
```

On pass 1, four of the eight signals (`novelty`, `churn`, `thrash`, `surprise`) print as `-` because there is no previous pass to measure change against; `coverage` (1.00), `confidenceFloor` (0.14), `stall` (0) and `voices` (4/4) describe the current state. Rule 2 advises `continue` regardless because a single pass is an opinion, not a pondering.

**Pass 2 - the revision pass. This is where the value is.**

```sh
ponder predict --churn 0.4 --claim "Pass 1 over-graded card polish and never opened the error paths. Expect deletes on the dashboard and new findings on 500/timeout."
ponder deliberate --file .ponder/tmp/deliberation-2.json
```

```json
{ "question": "Does the pass-1 finding set survive a second reading of the code?",
  "skeptic": { "argument": "Two findings are unsupported. f-0011 claims inconsistent card padding; both cards resolve to --space-4. f-0019 is f-0004 on a different screen - same root cause, counted twice.", "confidence": 0.85 },
  "builder": { "argument": "Half the recommendations name a problem instead of a change. 'Improve hierarchy' is not a next step.", "confidence": 0.7 },
  "dreamer": { "argument": "Nobody has asked what any screen does when the API 500s. Every finding so far assumes the happy path. Also: /invite/:token exists and is not in the inventory.", "confidence": 0.75 },
  "empath": { "argument": "The billing empty state blocks a first-run user; it outranks three polish findings currently scored above it.", "confidence": 0.7 } }
```

The deltas - two of pass 1's findings deleted, three added, plus the missed route (note that `unit-add` must sit above any `add`, `unit-edit`, or `unit-delete` targeting that new unit because deltas apply in file order):

```
{"op":"delete","target":"f-0011","perspective":"skeptic","why":"Claimed inconsistent card padding; both cards resolve to --space-4. Unsupported."}
{"op":"delete","target":"f-0019","perspective":"skeptic","why":"Duplicate of f-0004 - same root cause on a different screen."}
{"op":"unit-add","perspective":"dreamer","why":"Route exists and was missed in the pass 1 survey. One unit, not four: the loader validates the token server-side and an invalid or spent token 404s at the router, so there is only ever one render state.","unit":{"id":"screen.invite.accept","label":"Accept invite","path":"src/routes/invite/accept.tsx","kind":"screen","meta":{"route":"/invite/:token"}}}
{"op":"add","perspective":"dreamer","why":"No pass had asked what any screen does when the API 500s.","finding":{"unit":"screen.projects.detail","title":"No error state - a failed load renders an empty shell","detail":"The query error branch returns null, so a 500 is indistinguishable from 'no projects'.","dimension":"error-states","score":1,"severity":"must","confidence":0.85,"effort":"m","evidence":["src/routes/projects/[id].tsx:41-60"],"recommendation":"Render a failure state with the cause and a retry that refetches."}}
{"op":"edit","target":"f-0007","perspective":"builder","why":"Recommendation named the problem, not the change.","set":{"recommendation":"Add an empty state with cause, expectation and a 'Add payment method' primary action."}}
{"op":"change","target":"f-0009","perspective":"empath","why":"Blocks first-run; outranks polish.","set":{"severity":"must","score":2}}
```

```sh
ponder delta --file .ponder/tmp/deltas-2.jsonl  # 11 deltas: 3 add, 3 edit, 2 change, 2 delete, 1 unit-add
ponder judge
```

```
ponder judge - pass 2 of 6
  signal           value  reads as
  coverage         0.92   11 of 12 screens graded
  novelty          0.12   revising adds ÷ live findings
  churn            0.42   revising deltas ÷ live findings
  thrash           0.00   0 reversing deltas
  surprise         0.02   predicted 0.40, got 0.42
  stall            0      consecutive passes under 0.02 churn
  confidenceFloor  0.11   open must-findings still guessing
  voices           4/4    builder, dreamer, empath, skeptic
  delta voices     4/4    builder, dreamer, empath, skeptic

  advice: blocked - 1 of 12 screen has never been graded. Stopping is not permitted.

  1 ungraded screen - "ponder decide stop" will be refused:
    screen.invite.accept

NEXT: decide - ponder decide continue --why "<reason>" --session ui-2026-08-24   # blocked: 1 ungraded screen - stop is refused until coverage is 1.0
```

The Dreamer found a route at deliberation time, after appraise had closed. Coverage dropped to 11/12 and the verdict is `blocked` - no override exists. Note thrash stayed at 0.00 even though the Skeptic killed two pass-1 findings: pass-1 seeding is not a deliberative `add`, so deleting its noise reads as the Skeptic working, not as the loop reversing itself.

```sh
ponder decide continue --why "Dreamer found /invite/:token. Cannot stop with a screen nobody has graded."
```

**Pass 3 - close the gap, and correct the caption pass 2 put on it.**

```sh
ponder predict --churn 0.12 --claim "The invite route is small; one or two findings there and nothing new elsewhere."
ponder deliberate --file .ponder/tmp/deliberation-3.json
```

Grading the invite route turns up the screen nobody had described. Pass 2's Dreamer named it `"Accept invite"` off the router; opening the file, accept is one of *two* buttons, and the Dreamer's `add` lands on the decline button beside it. The Builder updates the unit caption with `unit-edit` so `report.md` does not contradict the finding beneath it:

```
{"op":"unit-edit","target":"screen.invite.accept","perspective":"builder","why":"Pass 2 named this screen off the router and called it \"Accept invite\". The finding filed against it this pass is about the decline button beside accept, so the caption now contradicts the finding printed under it.","set":{"label":"Accept or decline invite"}}
```

```sh
ponder delta --file .ponder/tmp/deltas-3.jsonl  # 2 deltas: 1 add, 1 unit-edit
ponder judge
ponder decide continue --why "The invite route earned one finding on a thin pass. I don't trust a one-look grade on a screen no earlier pass had seen."
```

`ponder judge` on pass 3 reports `coverage 1.00` (12/12), `novelty 0.04`, `churn 0.07`, `voices 4/4` and `delta voices 2/4` (the Skeptic and Empath verified the set and found nothing to change). Because convergence requires two consecutive quiet passes and pass 2 churned `0.42`, the engine advises `continue`.

**Pass 4 - confirm.**

```sh
ponder predict --churn 0.05 --claim "The invite route holds up on a hard second read. At most a ranking change."
ponder deliberate --file .ponder/tmp/deliberation-4.json   # targeted re-check by builder and empath
ponder delta --file .ponder/tmp/deltas-4.jsonl  # 2 deltas: 1 edit, 1 change. No adds.
ponder judge
```

A two-key deliberation file is legal and prints warnings on `deliberate`, `delta`, and `decide stop` reminding you to explain in `--why` why fewer than three voices spoke. Here the Empath's `change` raises `f-0014` above 0.5 confidence after running the case, moving `confidenceFloor` to `0.00`:

```
ponder judge - pass 4 of 6
  signal           value  reads as
  coverage         1.00   12 of 12 screens graded
  novelty          0.00   revising adds ÷ live findings
  churn            0.07   revising deltas ÷ live findings
  thrash           0.00   0 reversing deltas
  surprise         0.02   predicted 0.05, got 0.07
  stall            0      consecutive passes under 0.02 churn
  confidenceFloor  0.00   open must-findings still guessing
  voices           2/4    builder, empath
  delta voices     2/4    builder, empath

  advice: stop - novelty 0.00 and churn 0.07, two passes running. Further passes stopped changing the answer.

NEXT: decide - ponder decide stop --why "<reason>" --session ui-2026-08-24   # the engine advises stop
```

```sh
ponder decide stop --why "Coverage 12/12, two consecutive quiet passes, no open must-fix under 0.5 confidence. Pass 4 heard two voices because it was a targeted re-check of the invite screen and the last shaky must; passes 2 and 3 heard all four."
ponder report --out docs/ui-ponder.md
ponder apply --dry-run --severity must,should
```

Only a `stop` the engine advised for reason `converged` closes the session as **converged**; a budget stop, a perseveration stop or an override closes it as **stopped**, and `report.md` says which. `ponder apply` emits an ordered work plan grouped by unit, with evidence paths and recommendations. **Ponder never edits the subject's source** - it hands you the plan and you do the work. `--dry-run` prints and changes nothing; dropping it writes `apply-plan.md` and marks the session `applied` (terminal). Running `apply` on an open or aborted session exits `2`.

## Anti-patterns

- Running one pass and reporting it as a ponder.
- A pass whose deltas are all `add`. You accumulated; you did not deliberate - and `voices 4/4` does not excuse it, because that counts who spoke, not what changed.
- Predicting low churn every pass to look calibrated. It destroys `surprise`, the only signal that says whether you understand the subject.
- `delete`ing a finding because it is low priority. Delete is for unsupported, duplicated, or wrong. Low priority is a `change` to `severity` or `status: deferred` - retracting it hides it from the ranking instead of ranking it.
- Deleting a unit from the inventory to clear a `blocked` verdict. It does not clear it - a never-graded unit stays in the coverage denominator.
- Claiming `"phantom": true` on a route you never opened. Phantom means the thing does not exist. If you did not look, go look.
- `unit-edit`ing a path to something that does not exist and then claiming phantom on it. The engine checks every path the unit has ever carried and rejects the batch. It is the previous anti-pattern with an extra step.
- Manufacturing a delta on a quiet pass so it does not look idle. Zero deltas from four voices that each said what they re-checked is convergence; one invented `edit` is churn you have to defend in `report.md` for ever.
- Hand-editing `units.json` or `findings.json`. It is a divergence, not a fix - `judge`, `decide`, `report` and `apply` refuse it. Use a delta.
- Letting a fan-out agent call `ponder`.
- Starting a fresh session after a compaction instead of running `ponder status`.
- Looking for a way past `blocked` - a flag, an env var, a hand-edited `metrics.json`. There isn't one; coverage is recomputed at decision time. The time is better spent grading the unit.
- Treating a transcript in this file as the engine's contract. It shows the shape of a pass. `ponder status` and the `NEXT:` line show the truth.
