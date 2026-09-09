---
name: poka-yoke-audit
description: 'Find footguns in code that already exists: swappable arguments, silent fallbacks, unguarded deletes, signatures that are easy to misuse. Use when someone asks "what could bite us here", "what is easy to misuse", "poka-yoke this repo", or wants a diff or PR reviewed for ways to get it wrong. Ranks by blast radius. For code not yet written use design; for something that already broke use retro.'
license: MIT
---

# Poka-Yoke Audit

Find the mistakes that are *available* in this code, then close them. You are not looking for
bugs: a bug is a mistake that already happened. You are looking for **affordances for
mistakes**: places where doing the wrong thing is easy, silent, and looks correct.

The load-bearing question throughout: *if a competent, tired engineer used this at 4pm on a
Friday, what would go wrong and would anything stop them?*

## 1. Establish scope

Default, when the user names no path:

1. `git diff HEAD`: uncommitted work. This is what they are most likely asking about.
2. If the tree is clean, `git diff HEAD~5..HEAD`: recent commits.
3. If neither yields anything (fresh repo, no git), fall back to the risk surfaces below and
   say that's what you did.

Widen to the whole repo only when asked ("audit the whole codebase", "full audit"). It is
slow and it buries the important findings in volume. When you do go wide, prioritize by
**risk surface** rather than by directory, go straight to code that touches money,
authentication, authorization, deletion or overwriting, migrations, external I/O,
concurrency, and anything with `admin`, `force`, `bulk`, `sync`, or `delete` in its name.

State the scope you chose in one line before you start, so the user can redirect you cheaply.

## 2. Run the detector, then think

```bash
python3 scripts/detect_hazards.py --diff   # path is relative to this SKILL.md
```

Also `--paths src/`, `--staged`, `--since HEAD~10`, `--json`, `--severity high`, `--id C1 M2`.

It finds the mechanically detectable shapes: adjacent same-type parameters, boolean flag
arguments, unbounded deletes, money as a float, unvalidated request bodies, retries with no
idempotency key. Shapes a real linter already covers are off by default; `--all` runs them too.
It is a fast first pass with real false positives, not an oracle — read the surrounding code
before you believe a hit.

Then do the part the script cannot: run the three lenses over the interfaces.

**Contact — can the wrong thing fit?** Are two adjacent parameters the same type? Could a
caller pass an order ID where a user ID belongs, cents where dollars belong, a raw string where
a validated one belongs? Does the boundary accept `any` / `dict` / `interface{}` and hope?

**Fixed-value — can an incomplete set pass?** Is every enum branch handled, and does adding a
variant break the build or silently fall through? Can a bulk operation run on an empty or
unexpectedly huge set? Is config validated as a whole, or discovered missing at 3am?

**Motion-step — can the order be wrong?** Must something be called before something else with
nothing enforcing it? Can a retry double-charge? Can a resource leak on the error path? Can two
callers interleave between a check and the act that depends on it?

## 3. Classify every finding

Each finding gets four fields. Fill all four: an unclassified finding is just an opinion.

- **Mistake**: the specific wrong thing a person can do, stated as an action.
  *"Call `transfer(dst, src)` with the accounts reversed."*
- **Consequence**: what happens when they do, and how loudly. Silence is the aggravator: a mistake that throws immediately is far less dangerous than one that returns a plausible
  wrong answer.
- **Current rung**: what exists today, Control / Warning / Detection / **None**.
- **Proposed device + rung**: the specific change, and the rung it reaches. If you're
  proposing Warning, say what would be needed for Control and why you didn't.

## 4. Rank by expected damage, not by count

Priority is **blast radius × ease of mistake**. A hundred stringly-typed internal helpers matter
less than one `delete_users(filter)` where `filter` can be empty.

Blast radius, descending: irreversible data loss or money movement → authorization bypass →
silent data corruption → wrong output the user acts on → crash → degraded experience. A crash
ranking *below* silent wrong output is deliberate: loud failures are cheap, quiet ones compound.

Ease, descending: silent and plausible-looking → requires only forgetting → needs an
unusual-but-reachable input → needs deliberate misuse.

Report in priority order and stop somewhere sensible — ten well-argued findings beat forty. Say
how many you set aside and why.

## 5. Report

Use this structure. It is short on purpose; the detail lives per-finding.

```markdown
# Poka-Yoke Audit — <scope> — <date>
**Verdict**: <the single most important thing to fix>

### 1. <the mistake> — <blast radius>/<ease>
**Where**: `path/file.ts:42`
**Mistake**: <the wrong action a person can take>
**Consequence**: <what happens, and whether it is silent>
**Today**: Control | Warning | Detection | None
**Device**: <the specific change> → **<rung>**
```

Write it to `docs/poka-yoke/audit-YYYY-MM-DD.md` in the user's repo. If they'd rather not
have a file, keep it in the conversation, ask if it isn't obvious.

## 6. Propose, then apply

Present the findings and wait. Do not edit files yet. These changes alter interface shapes
and ripple through call sites; people reasonably want to see the plan first.

When they approve some or all of it: apply each device, leave a `poka-yoke:` marker comment
at it saying which mistake it blocks, and run the tests.

