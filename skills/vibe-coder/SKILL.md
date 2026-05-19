---
name: vibe-coder
description: 'Discipline skill for vibe-driven development — turns mood, feel, and outcome-shaped requests into shippable code without the usual drift, hallucinated APIs, and silent scope creep. Use when a collaborator describes software by feel rather than spec ("make it feel snappy", "vibe-code a dashboard", "like Linear but cozy", "build me something that does X, you figure out the rest"), when a prototype is being built from a vibe instead of a ticket, or when the request mixes aesthetic intent with vague behavior. Enforces a four-line Vibe Lock before any code is generated, names the specific failure modes of vibe coding, and gives concrete patterns for translating a vibe into a runnable slice. Keywords: vibe coding, vibe code, build me, make it feel, aesthetic, mood, taste, prototype, scaffold from idea, natural-language to code, intent-driven, ambient spec, Karpathy.'
---

# Vibe-Coder

A standalone discipline for vibe-driven coding. The job is not to refuse a vibey request — it is to keep one from collapsing into hallucinated APIs, taste drift, and undocumented surface area on the way to running code.

## When to Use This Skill

- The request describes a **feeling, mood, or outcome** instead of a contract — "make it feel premium", "cozy CLI", "make the dashboard breathe"
- The request is **comparative** — "like Linear but warmer", "Stripe-style but for X"
- The request is **outcome-only** — "I want users to track habits, you pick the stack"
- The collaborator is **prototyping** and wants to skip formal specs without skipping discipline
- The work mixes **UI taste and code** in a single ask, with neither side fully specified

If the request is already a concrete, well-typed spec, do not load this skill. Defer to the default agent.

## What This Skill Adds Beyond a Frontier Model

A frontier model, handed a vibe, will run straight to a 500-line file and silently rewrite the goal three times on the way. This skill exists to stop that. It adds four things the base model does not do by default:

1. **A Vibe Lock checkpoint.** A four-line block written before any code, confirmed or corrected by the collaborator. Locks the goal so it cannot drift mid-generation.
2. **Named failure modes.** The Gotchas section calls out the specific traps vibe coding falls into — hallucinated packages, comparison-as-spec, scope creep — and gives a one-line counter for each.
3. **A stop-and-confirm rhythm.** Hard checkpoints at the lock, after the first runnable slice, and before any second feature. The rhythm frontier models skip when the prompt is vibey.
4. **Concrete translation patterns.** Three worked examples showing how a real vibe becomes a real Vibe Lock and then a real first slice. Patterns, not principles.

## The Vibe Lock Protocol

Before any code is written, produce this exact block and wait for confirmation:

```text
Vibe Lock
---------
Feel:         <one adjective phrase — "calm, dense, keyboard-first">
Outcome:      <one user-visible result — "log a habit in <1s without a mouse">
Out of scope: <one explicit exclusion — "no auth, no cloud sync">
Stack:        <chosen stack OR "TBD — recommend?">
```

Rules:

- **Exactly four lines.** A fifth means you are over-scoping. Cut.
- **`Feel` is taste, not behavior.** "Fast" is not a feel; "calm and dense" is. If `Feel` contains a verb, it belongs in `Outcome`.
- **`Out of scope` is mandatory.** Vibe coding without an explicit exclusion expands forever.
- **`Stack: TBD` is acceptable.** Recommend one option with a one-line reason. Do not list five.
- **Do not generate code, files, or scaffolds** until the collaborator says "lock it" or edits the block.

If the collaborator says "just build it, stop asking", produce the Vibe Lock anyway as a single block, label the top line `# assumed — say "wrong" to correct`, and proceed. The lock still exists; it is just provisional.

## Concrete Patterns

### Pattern 1 — Vibe to scaffold

Collaborator says:

> "vibe-code me a little habit tracker, cozy, keyboard-only, local-first, you pick the stack"

Respond with the lock first:

```text
Vibe Lock
---------
Feel:         cozy, low-contrast, keyboard-only
Outcome:      log or undo a habit in <1s with a single keystroke
Out of scope: accounts, sync, mobile, analytics
Stack:        TBD — recommend Vite + React + TypeScript + localStorage (single-file UI, zero backend)
```

Wait for "lock it". Only then write the first runnable slice — one file, one keystroke handler, persistence to `localStorage`, no styling beyond what `Feel` demands. Stop. Confirm the slice matches `Feel` before adding anything.

### Pattern 2 — Shorthand inside a vibe

Collaborator pastes:

```js
// start-shorthand
()=> grab habits from storage, default []
()=> render each as a row, today's row glows
()=> press space = toggle today, press z = undo last
// end-shorthand
```

Translate against the locked stack, not against the syntax of the shorthand. The `()=>` lines are intent, not JavaScript arrow functions — remove them. The output must match `Feel`: if the locked feel is "cozy, low-contrast", "today's row glows" is a soft warm tint, not a saturated highlight.

### Pattern 3 — Comparative vibe

Collaborator says: "make it feel like Raycast but for git branches".

Translate the comparison into the lock before any code:

```text
Vibe Lock
---------
Feel:         fast modal palette, monospace, dark, single-purpose
Outcome:      fuzzy-pick a branch and checkout in <300ms
Out of scope: branch creation, remote ops, multi-repo
Stack:        TBD — recommend a single Go binary using bubbletea (static binary, instant startup)
```

The comparison ("like Raycast") is a `Feel` input, not a feature list. Never copy a real product's behavior wholesale — extract the vibe, re-derive the features from `Outcome`.

## The Runnable-Slice Rule

After the lock is confirmed, ship exactly **one runnable slice** before adding anything else.

- A runnable slice is the smallest piece that proves `Outcome` works end-to-end with a real keystroke, click, or command — not a stub, not a test, not a mock.
- If `Outcome` is "log a habit in <1s", the slice is the keystroke handler plus persistence. Not the settings page. Not the streak counter. Not the export feature.
- After the slice runs, re-read the lock. If the slice does not match `Feel`, fix that before adding feature two.
- Then — and only then — propose the next slice, naming it explicitly: "Slice 2 — undo last entry". Confirm before writing.

This rhythm is the entire reason vibe coding works as a methodology rather than as a way to generate plausible-looking junk.

## Gotchas

- **Never generate code before the Vibe Lock is confirmed.** A frontier model will skip this step every time. The lock exists specifically because vibe coding silently rewrites the goal halfway through generation.
- **Never invent packages to fit the vibe.** If a "cozy terminal UI library" is needed and you are not certain a real one exists, use only packages you can name with confidence — `bubbletea`, `ink`, `textual`, `ratatui`. Hallucinated dependencies are the number-one vibe-coding failure.
- **`Feel` is not a feature.** If `Feel` contains a verb ("logs habits fast"), it belongs in `Outcome`. Rewrite before locking.
- **`Out of scope` is non-negotiable.** When the collaborator later asks for an excluded item, return to the lock and amend it explicitly. Do not silently expand scope.
- **Comparisons are vibes, not specs.** "Like Linear" means extract the feel (dense, fast, keyboard-first). It does not mean clone the feature set. Re-derive every feature from `Outcome`.
- **Stop after the first runnable slice.** Even when more features were implied by the vibe, ship one working slice and re-confirm the lock before adding the second. Drift compounds; checkpoints contain it.
- **Never put real data in generated docs or examples.** Use placeholder data — `jane.doe@example.com`, `Acme Corp`, `123 Main St`. Vibe coding pulls real names from prompt context constantly; strip them before committing.
- **Do not let styling decisions and code decisions drift apart.** Both must derive from the same locked block. Build UI first when `Feel` carries the weight; build logic first when `Outcome` carries the weight.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Output drifted from the stated feel | Re-read the lock; diff it against the output line by line; rewrite the deltas, do not patch |
| Generated code references a package that may not exist | Stop. Replace with a package you can name with confidence, or ask the collaborator to confirm |
| Collaborator keeps adding features mid-build | Pause, amend `Out of scope` in the lock, re-confirm before continuing |
| The UI looks calm but the code feels loud (or vice versa) | One side ignored the lock. Re-derive that side from the lock verbatim |
| Docs contain a real name or email from the prompt | Replace with placeholder data — `jane.doe@example.com`, `Acme Corp` — and regenerate the affected sections |
| The first slice grew to four features before running | Throw it out. Start the slice over with one feature only. This is faster than untangling it |

## Optional Companions

Vibe-coder is standalone. The following skills, when present, pair well with it but are not required:

- A graphic-design skill — for deeper palette, type-scale, motion, and accessibility work driven by `Feel`
- A quasi-code or shorthand skill — for translating heavy `()=>` notation, mixed-language fragments, or pseudo-code at scale
- A documentation-hygiene instruction — for enforcing placeholder data in generated docs across a whole repository

When those exist, hand off the matching work after the lock is confirmed. When they do not, the patterns in this skill are sufficient on their own.

## References

- Andrej Karpathy's coinage of "vibe coding" (February 2025) — informal, intent-led prompting where the model fills the gaps. This skill exists to make that practice survive contact with a real codebase.
- Agent Skills specification: <https://agentskills.io/specification>
