---
name: poka-yoke-guardrails
description: >-
  Pre-commit hooks, CI gates, lint rules, database constraints and branch protection. Use when a rule needs enforcing rather than documenting: "set up enforcement", "unformatted or untyped code must not get merged", "gate this in CI", "we agreed to X and people still do not", "stop secrets getting committed". Covers baselining and ratcheting so existing violations do not block anyone. For constraining an AI agent use agent-guardrails.
license: MIT
---

# Poka-Yoke Guardrails

Design-time devices protect the code you are writing now. Guardrails protect the code
everyone writes later, including the version of you who is in a hurry. They are Shingo's
*successive check*: the next station refuses to accept bad work.

The reason this mode exists as its own thing: the most common failure in software quality is
agreeing on a rule and then writing it down. A rule in a wiki has a half-life of about one
onboarding. The same rule wired into a gate applies itself and costs nothing to remember.

## Building, not reviewing

Most of the time this mode is reached *while someone is building the thing*, not afterwards.
That changes the deliverable. They asked for the config, so produce the config, working, complete,
in their stack. Do not hand back a severity table when the person is mid-feature; a list of
findings about code they have not written yet is not useful to them.

Then add a short closing note, three or four lines, covering:

- which misuses the shape you chose makes impossible, and at which rung,
- what you left possible on purpose, and why that tradeoff is the right one here.

That closing note is what stops the device being undone in six months by someone who cannot
see why it is there. It is also the difference between mistake-proofing and a code generator:
the reasoning travels with the code.

When the code already exists and they are asking what is wrong with it, switch to the audit
voice, ranked findings with the mistake, the consequence, and the device. Match the mode to
where they are in the work, not to this file's default.

## Pick the earliest gate that can hold the rule

The same rule can live at several points in the lifecycle. Earlier is better, feedback is
faster, cheaper, and lands while the author still has the context in their head. But earlier
is also easier to bypass. The resolution is to place the device early **and** back it with a
gate that cannot be skipped.

| Gate | Feedback speed | Bypassable? | Best for |
|---|---|---|---|
| Type system / compiler | instant | no | anything the types can express, always first choice |
| Editor + lint | seconds | yes (ignore comment) | style, banned APIs, unsafe patterns |
| Pre-commit hook | seconds | yes (`--no-verify`) | fast checks: secrets, formatting, obvious footguns |
| Pre-push hook | ~a minute | yes | medium checks you don't want to wait for on every commit |
| CI required check | minutes | **no**, with branch protection | the real enforcement, everything that must not merge |
| Database constraint | instant, at write | no | data invariants, across every service and every script |
| Runtime assertion | at execution | no | invariants no earlier gate can see |

**Never rely on a pre-commit hook alone for anything that matters.** `--no-verify` exists, and
people under deadline use it. Use the hook for speed and the CI check for authority; run the
same script in both so they cannot drift.

## The devices worth installing

Ready-to-adapt templates live in `assets/devices/`. Read the relevant one, adapt it to
the repo's actual stack, and show the user the file before writing it.

- `assets/devices/pre-commit/`, `.pre-commit-config.yaml` covering secrets, large
  files, merge conflict markers, formatting, and a hook for repo-specific rules
- `assets/devices/github-actions/`: a required-check workflow, plus a migration-safety
  gate
- `assets/devices/lint/`: ESLint and Ruff rule sets chosen specifically for
  mistake-prevention rather than style
- `assets/devices/claude-hooks/`: Claude Code hooks (see `agent-guardrails`)

The rules that pay for themselves in nearly every repo, roughly in order of value:

1. **Secret scanning at commit time.** A leaked key is irreversible; rotation is the only
   remedy. This is the highest blast-radius mistake a hook can prevent.
2. **Type checking as a required check**, `tsc --noEmit`, `mypy --strict`, `go vet`. This is
   what makes every design-time device in `design` actually load-bearing. A branded
   type with no type check in CI is decoration.
3. **The specific lint rules that catch silent failure**: floating promises, unhandled
   rejections, unchecked errors, bare `except`, empty catch blocks, non-exhaustive switches.
   Ordinary style rules are not poka-yoke; these are.
4. **Migration safety**: block destructive DDL, or require an explicit acknowledgment for it.
   Dropping a column in a deploy is a classic irreversible mistake with a trivial device.
5. **Test integrity**: fail CI on `it.only`, `fdescribe`, `@pytest.mark.skip` left behind. A
   skipped test is a detection device that has been switched off, usually by accident.
6. **Branch protection with required checks.** Without it, none of the above is enforcement.

## Install carefully: a guardrail people hate gets removed

This is the mode where a well-intentioned change most easily backfires. A gate that fires
constantly on pre-existing code teaches everyone to bypass gates, which is strictly worse
than not adding it. Three rules:

**Baseline first, then ratchet.** Turning on a strict rule in a large repo yields hundreds of
failures and the rule gets reverted by Friday. Instead: enforce on changed files only, or
generate a baseline of existing violations and fail only on *new* ones. The violation count
can only go down. This is how strictness actually lands.

**Be fast or be asynchronous.** A pre-commit hook over about five seconds gets bypassed. Keep
commit-time checks to changed files, push the slow work to CI.

**Make the failure message teach.** A gate that says `error: rule violated` produces a
confused engineer and a workaround. Say what was done, why it is dangerous, and the exact
command or edit that fixes it. This is the one place prose belongs in a poka-yoke: at the
moment of failure, when someone is guaranteed to read it.

Also check what already exists before adding anything. Repos frequently have a lint config or
CI workflow that already covers the rule but isn't wired into branch protection, or is set to
warn instead of error. Flipping an existing warning to an error is a better change than a new
tool.

## Verify the device actually fires

An untested guardrail is a guardrail you *believe in*, which is worse than none. It creates
confidence without protection. Before you call it done, demonstrate it:

1. Write the mistake it is supposed to catch, deliberately.
2. Run the gate. Confirm it fails, and that the message is the one you wrote.
3. Remove the mistake. Confirm it passes.
4. Show the user both outcomes.

Then leave a `poka-yoke:` marker comment on the rule naming the mistake it prevents, see the
recording section in `audit`. A device whose purpose nobody remembers is a device
that gets deleted during the next cleanup.

## Propose first

Show the config files and what they will reject before writing them. Guardrails change how
everyone on the team works, and that is not a change to make on someone's behalf without
their explicit sign-off, especially the branch-protection and required-check pieces, which
you generally cannot apply yourself anyway. For those, hand over the exact settings to click
or the `gh api` command to run.
