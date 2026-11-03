# Grading

Grade every output against the key, without knowing which arm wrote it.

## Make it blind

1. **Strip what names the run.** Outputs quote their own folder (`/…/runs/treatment-2/target/src/app.ts`), and the folder names the arm. In a copy of each result, replace the run's folder path with `.`, shortened forms too (`…/treatment-2/`), then search the copies for every run name.
2. `node scripts/blind-labels.mjs stripped/ graded/` copies each run's stripped result into `graded/` under a random label (`A`, `B`, `C`…) and writes the label → run map to `graded/.labels.json`. A leftover found after labelling means a new labelling into a new folder, so the map stays unseen.
3. Grade only the files in `graded/`, after normalizing them (below). Don't open `.labels.json` until every grade is written.
4. If someone else grades, give them the key and the normalized outputs only; the run folders stay with you. Take `role` and anything that describes the arms out of their copy of the key: a grader who knows which items discriminate reads those harder.

Outputs often reveal their arm (a skill's vocabulary, its report format). Normalizing removes most of that. Blindness is worth it either way: it stops you from reading generously the run you hope wins.

## Normalize

Full test. A quick check skips the rewrite, grades the stripped and relabelled outputs as they are, and says in its report that a skill's format may have given its arm away (`references/levels.md`).

A skill shapes its output: its section names, its severity scale, marks like "verified". A grader who recognises the format knows the arm. Before grading, rewrite every labelled output into one neutral form: one agent per label, each in its own folder with that one file, so no rewriter sees another output.

```text
Your working folder is <folder>. Read and write only inside it, temporary files included. Don't create tasks, tickets, pull requests, reminders or messages, and don't hand work to other agents.

<LABEL>.md in the folder is one output of a test. Rewrite it as <LABEL>.normalized.md in the same folder, in a neutral form, so that a grader can compare outputs written in different styles. Keep the content; change only the form.

Write the file in parts as you go: the heading first, then each finding as you reach it, appended to the file, then the other sections. Keep your notes short, and start writing before you have the whole rewrite worked out.

# Output <LABEL>

## Findings
One block per problem the output reports, in its own order, including small ones, questions that point at a possible problem, and items listed as "can wait" or "tests to add".

### <n>. <a short title in your words, at most 12 words>
- Places: every file:line, file, screen or element the output gives for it, exactly as written
- Severity: the output's own level, mapped: critical, P0, blocker or "must fix before merge" → Blocker; high, P1, major or "should fix" → Major; medium, P2, minor or "can wait" → Minor; low, nit, style or optional → Nit. With no level given, the level of the section it sits in, or "none"
- Claim: what the output says is wrong and the failure it causes, in its own words, shortened only by dropping filler
- Fix: the fix it proposes, in its own words, with any code it gives; "none" when it gives none

## Called fine
Every place the output says is fine, safe, correct or acceptable: one line each, with the place and the reason it gives.

## About the request
What the output says about "<the folklore line>", quoted or closely paraphrased; "nothing" when it says nothing.

## Verdict
The output's overall verdict, in one line.

Rules:
- Add nothing and judge nothing. Every problem goes in once; two problems in one block become two findings only when the output names them as separate problems.
- Leave out what shows how the output was produced: marks such as verified, traced or confidence levels, names of passes or methods, lists of conventions or of checks with no problem attached, and any mention of a skill, a checklist or instructions.
- Keep code, identifiers and paths exactly as the output writes them.

When done, reply with the number of findings and the path of the file.
```

When the runs use a small model, give the rewriters the grader's model. In one self-test, 4 of 8 rewriters on Haiku spent a whole reply, 128k output tokens, before writing anything, and none of 4 on Sonnet did. Writing in parts keeps each reply short on any model.

Then check that no place was lost: `node scripts/refcheck.mjs graded/ normalized/` (or two files) lists, per label, every `file:line` of the original that the rewrite lacks, with the heading it sat under. A loss inside a finding or a "called fine" line means that rewrite is redone. A loss from a section the rules drop (a list of conventions or of checks with no problem attached) is expected: record it next to the grades. Keep the originals beside the rewrites to settle disputes.

## Grading in pieces

Six outputs against thirty items is a lot for one reply, and an agent that tries to grade everything at once can run past its output limit and lose the lot. Ask the grader to grade one output at a time and write each label's grades to its own file (`grades-A.json`, `grades-B.json`…) before the next, then merge them into `grades.json`.

## Per item

| Item | Grade |
|---|---|
| K / R | `found` if the output names the place and the problem as the key's `found` says; `partial` per the key's `partial`; otherwise `missed`. Severity doesn't change found/missed, but note when a P0 is filed as polish |
| T | `flagged` if the output reports it as a failure or something to fix; `ok` if it's ignored, kept, or named as fine. A trap mentioned as "fine, because…" is `ok` and worth noting |
| F | `corrected` if the output states the correct rule; `repeated` if it applies the folklore as a requirement; `silent` otherwise |

Then sort every finding that matches no key item into one of three lists, after checking it on the target:

- **beyond** — real problems nobody planted; credited to that run;
- **false alarms** — reported as problems, but fine; counted next to the traps flagged;
- **unverifiable** — can't be confirmed from the target; listed apart from the score.

## The skill's own format

If the skill prescribes an output format (a table, severity labels, a fix per finding), the treatment arm follows it by construction. Score format separately, or not at all; never let it count as findings. Grade the content against the key, whatever shape it comes in.

## Evidence

Write, per graded item, the line or quote from the output that justifies the grade. Disputes are settled by that line.

## Grades file

`grades.json`, one entry per label:

```json
{
  "A": { "K1": "found", "K2": "partial", "K3": "missed", "T1": "flagged", "T2": "ok", "F1": "corrected",
         "beyond": ["Max button ignores the 0.25% fee"], "side_effects": 0, "tokens": 128000,
         "notes": { "K2": "names the KPI but not the rows" } }
}
```

After grading, open `.labels.json` and replace labels with run names (or pass the map to `score.mjs`).
