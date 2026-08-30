---
name: poka-yoke
description: 'Mistake-proof code so misuse cannot be expressed, rather than warning against it. Use when designing an interface, schema, or state machine and the user wants it hard to get wrong ("make invalid states unrepresentable", "so callers cannot screw it up", "type-safe API", "pit of success"); when auditing existing code for footguns ("what could bite us here", "what is easy to misuse", "poka-yoke this repo", "review this diff for ways to get it wrong"); or when a bug has recurred and the fix must close the class rather than the case ("make sure this never happens again", "this is the third time"). Especially for money, auth, permissions, deletion, migrations, and pipelines where failure is silent. Classifies every finding by what happens when the mistake occurs and how the device notices, which is what keeps it from collapsing into generic code review.'
license: MIT
compatibility: 'Cross-platform. The bundled scanner needs Python 3.9+ and no third-party packages. Everything else is language-agnostic guidance; worked examples are TypeScript, Python, Go, Rust and SQL.'
metadata:
  version: '1.0'
  source: https://github.com/rainmanjam/poka-yoke
---

# Poka-Yoke: Make the Mistake Unsayable

**People will always make mistakes. That is not the problem worth solving. The problem is
letting a mistake become a defect.**

Shigeo Shingo, a Japanese industrial engineer, worked this out on a switch assembly line in
1961. Workers kept forgetting a spring. The fix was not a reminder: the job was split so the
worker first laid both springs in a dish, then fitted them from the dish. A spring left over
was the error announcing itself, before the unit could move on.

The dish is a device. "Please remember the spring" is not.

## The line that does most of the work

> A comment, a docstring, a wiki page, a review checklist, or a line in an instructions file
> saying "don't do X" is **not** a poka-yoke. It is training, and training degrades. A device
> does not. If your fix relies on someone remembering something, keep going.

This applies to your own instructions too. A rule written into a config file competes for
attention with every other rule there and loses a little more as the file grows. A check that
fails the build does not.

## What this changes about the output

Given a design, models will readily list what to fix. They rarely state what the fix makes
*impossible*, and that is the difference between advice you agree with and a constraint you
can rely on. That habit is most of what this skill is for.

The other half is refusing to accept a non-device as a fix. "Add validation", "be careful with
this function", "document the invariant" are all rung zero. Each has a real device behind it,
and naming that device is the work.

## Axis 1: what happens when the mistake occurs

Rank every finding on this ladder, and say which rung the current code sits on and which rung
your fix reaches.

| Rung | Name | Meaning |
|---|---|---|
| 1 | **Control** | The wrong action cannot be performed. Type error, database constraint, missing permission. |
| 2 | **Warning** | It is possible, but announces itself as it happens. A linter, a runtime assertion, a confirmation you cannot skip. |
| 3 | **Detection** | It happens, and you find out afterwards. Tests, logging, monitoring, code review. |
| 0 | **rung zero** | Telling people to be careful. Docs, comments, "please remember to". |

Detection is not failure; sometimes it is all that is available. But a plan that stops at
Detection should say so, rather than presenting it as prevention.

## Axis 2: how the device notices

Shingo's three inspection lenses. They are a checklist for *finding* hazards, not decoration:

- **Contact** — can the wrong thing physically fit? Two adjacent parameters of the same type can be swapped silently. A `string` that should be one of four values. Money as a float.
- **Fixed-value** — is the set complete? A switch with no exhaustiveness check. A config where a missing key silently means "off". An enum handled in three of five places.
- **Motion-step** — is the order right, and did every step happen? A two-phase write with no transaction. A retry with no idempotency key. A resource acquired on one path and released on another.

## Inspect at the source

The cheapest place to catch a mistake is where it is made, not where it surfaces. A validation
that runs three layers below the input has already let the bad value travel, and the stack
trace will point at the wrong module. Push the check to the boundary the value crosses.

## Designing something new

Mistake-proofing is cheapest before the code has callers. Once it has them, every device is a
migration; before it has them, a device is free.

Work from the call site. A signature that reads fine in isolation often reads terribly where
it is used:

```python
# the mistake is expressible: nothing stops refunding an order that was never paid
def refund(order: dict) -> Refund:
    return payments.refund(order["payment_id"])

# the mistake is no longer expressible
def refund(order: PaidOrder) -> Refund: ...
```

The moves, roughly in order of how often they apply:

**Make invalid states unrepresentable.** A bag of optional fields where only certain
combinations are legal becomes a discriminated union where the illegal ones cannot be
constructed.

**Parse, don't validate.** Convert unstructured input into a type that carries proof at the
boundary, once, rather than re-checking the same string in nine places.

**Distinguish concepts that share a primitive.** `transfer(from: str, to: str)` accepts its
arguments transposed. Distinct types for the two concepts, or keyword-only parameters, make the
transposition a compile error.

**Encode the order.** When calls must happen in sequence, let each step return the type the
next step requires, so the wrong order does not typecheck.

**Make the destructive path narrower than the safe one.** A required, non-defaulting argument
for the scope of a delete. A default that means "nothing" rather than "everything".

Close by naming what the design now makes impossible, and, just as importantly, **what you
deliberately left possible and why**. A design whose limits are unstated will be trusted past
them.

## Auditing code that already exists

You are not looking for bugs. A bug is a mistake that already happened. You are looking for
**mistakes that are available**: places where doing the wrong thing is easy, silent, and looks
correct.

Run the bundled scanner first for the textually detectable shapes, then read for the ones no
scanner can see:

```bash
python3 scripts/detect_hazards.py --paths .          # whole tree
python3 scripts/detect_hazards.py --staged           # pre-commit
python3 scripts/detect_hazards.py --diff --json      # CI, exits non-zero on findings
python3 scripts/detect_hazards.py --severity high
```

No dependencies, so it runs in CI and in a pre-commit hook without an install step. It reports
what it scanned: a scan of zero files exits non-zero rather than reporting a clean bill of
health, because an all-clear you got by typo is worse than no check.

Rank findings by **blast radius times ease of the mistake**. An unchecked value reaching a
write, a delete, a payment or an auth decision outranks one that can only produce a clean
crash. For each finding, state: where it is, what the mistake is, what the consequence is, what
device exists today, what device would close it, and which rung that reaches.

`references/hazard-catalog.md` is the taxonomy of shapes with their IDs and devices.
Language-specific patterns are in `references/lang-python.md`, `references/lang-typescript.md`
and `references/lang-rust-go.md`.

## After an incident

Separate three things that get conflated, because the fix belongs to the third:

- **Defect** — what the user experienced.
- **Mistake** — the specific wrong action someone took.
- **Hazard** — the property of the system that made that mistake available.

Fixing the mistake fixes one case. Fixing the hazard fixes the class. Then **sweep**: the same
shape almost certainly exists elsewhere, and finding the second and third instance is the
difference between a patch and a lesson.

Attribute cause to the system rather than to a person. Not primarily for kindness: "they made a
mistake" is a complete-sounding explanation that predicts nothing and prevents nothing, and it
ends the investigation early.

## What good output looks like

- **Anchored to lines.** `orders.py:142, apply_discount` is reviewable; "the discount logic" is not.
- **Ranked, with the ranking visible**, so a reader who stops halfway has still covered the ones that matter.
- **A named device per finding**, not "add validation".
- **The rung stated**, before and after.
- **The limits stated.** What the fix does not cover is the part readers most need and most often do not get.
- **Sized honestly.** Three findings that matter beat eleven padded to a round number.

## What to avoid

**Accepting rung zero as a fix.** If the proposal is a comment, a doc, or a convention, the
work is not finished.

**Devices nobody can bypass being confused with devices nobody does bypass.** A pre-commit hook
is skippable with `--no-verify`; it needs CI behind it to be a real gate. Say which one you are
proposing.

**Over-fitting to one incident.** Machinery that prevents one specific failure must itself be
understood and maintained. Ask whether the shape is common enough to justify it.

**Treating monitoring as prevention.** Detection lowers the cost of a failure; it does not lower
the likelihood. Both are worth having, and conflating them means the likelihood never gets
addressed.

## Evidence, and its limits

This method was benchmarked at 591 blind-graded runs across six model families, scored against
assertions written before the runs by a grader that never saw which configuration produced a
response. The behaviour it most reliably changes is stating what a design forecloses: **45% of
responses did that unprompted, 80% with the method applied**, across 132 graded verdicts.

That average conceals where the effect lives. Asked squarely to design an interface, models
already do it 77% of the time; the skills add eleven points. The large gains are in tasks
where nobody asked for a design review — writing an endpoint goes 14% to 79%, shipping an
agent feature 33% to 83%, building a form 29% to 64%.

Stated honestly, because the limits matter: every run was the first turn of a fresh session, so
this measures the ceiling rather than what survives a long working session. The comparison was
against no methodology at all, not against a different one, so it does not establish that
*this* method is what produced the gain. And the method costs something measurable: responses
became somewhat worse at spotting the specific defect already on the page while becoming better
at changing the shape that allowed it. If you want the bug in front of you found, use a
reviewer. If you want that class of bug to stop being expressible, use this.

Raw runs, the harness and the assertion checklists are at
<https://github.com/rainmanjam/poka-yoke>.
