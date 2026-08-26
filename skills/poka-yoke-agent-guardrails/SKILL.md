---
name: poka-yoke-agent-guardrails
description: >-
  Stop an AI agent damaging your repo: PreToolUse hooks, permission deny rules, protected paths, verification gates. Use when "claude keeps force pushing", "CLAUDE.md says X but it still does Y", "stop the agent touching prod or .env", or making a repo safe for unattended agent work. For AI features you ship to users use llm.
license: MIT
---

# Poka-Yoke for AI-Written Code

An agent is a fast, tireless operator with no memory of yesterday and a strong prior toward
appearing successful. That is the exact profile Shingo designed poka-yoke for, except an
agent makes mistakes faster than any human, and never learns from the ones you correct in
conversation.

The governing insight: **instructions to an agent are rung zero.** A line in CLAUDE.md saying
"never commit to main" is training, and training degrades, under long contexts, compaction,
and subagents that never read the file. A PreToolUse hook that denies the push is a device. If
you have been repeating the same correction to an agent, that is the signal to stop writing
instructions and install a device.

## A complete answer covers all five

**The diagnosis is not the answer.** "Instructions are not enforcement" is the right insight,
and it is satisfying to write, but someone asking *"what am I doing wrong?"* has a repo they
need to fix: not a question about their prose. Explaining why the rules fail and stopping
there leaves them exactly where they started. State the insight in a sentence, then spend the
rest of the answer on the replacement.

Replacing an instruction with a device is not one step, it is five, and stopping after the
first leaves the person with a rule that looks enforced and is not. Naming the deny rule is
the easy part and the least of it. Cover every one of these, briefly, before adding depth:

1. **The deny rule, with real syntax.** Show the actual `permissions.deny` entry for their
   case, `"Bash(git push --force:*)"`: not a description of one. A pattern they have to
   invent themselves is a step where this fails.
2. **A hook where a pattern is not enough.** Deny rules match strings. Anything conditional: a `DELETE` without a `WHERE`, an edit allowed in one directory but not another, a
   production hostname, needs a `PreToolUse` hook that inspects the call and returns a deny.
   Say which of their two rules needs which.
3. **What the deny message says.** The agent reads it and acts on it, so a bare refusal
   produces a workaround, often a worse one. The message must name what was blocked, why, and
   what to do instead. This is the one place prose belongs in a device.
4. **Where the config lives, so it applies to everyone.** `.claude/settings.json`, committed.
   A rule in `settings.local.json` protects one machine, which is the same failure as
   documenting it: the protection exists only where someone remembered to set it up.
5. **Proof that it fires.** Run the blocked action and confirm the denial *and* its message,
   then run the legitimate neighbouring action and confirm it still works. Untested hooks fail
   open more often than people expect: a regex that does not match the real command string is
   a hook that does nothing while looking like protection. **An unverified device is worse
   than no device, because it creates confidence without protection.**

Steps 3 and 5 are the ones most often dropped, and they are what separate a device that works
from one that merely exists.

## The three failure modes, and the device for each

**1. The agent does something destructive.** Force-push, `rm -rf`, dropping a table, editing
`.env`, running against production, `git checkout .` over uncommitted work, `--no-verify`.
These are irreversible and fast. Device: **deny at the tool boundary**: a hook or permission
rule that refuses the call before it executes. This is Control and it is the only rung that
matters for irreversible actions.

**2. The agent writes code that looks right and isn't.** Plausible-but-wrong is an agent's
characteristic defect: correct-looking imports of things that don't exist, tests that assert
nothing, error handling that swallows, a stub that returns a hardcoded value. Device: **the
type checker and the test suite as required gates**, plus lint rules against silent failure.
Everything in `guardrails` applies here with extra force, because the volume of
generated code is higher and human review attention per line is lower.

**3. The agent reports success it didn't achieve.** "All tests pass" when the suite wasn't
run; "done" with the build broken. Device: **verification the agent cannot fake**: a Stop
hook that actually runs the tests, or a CI gate. Never accept a claim of completion that only
exists as text.

## Devices, strongest first

### Deny rules in settings.json

The cheapest device and the first thing to install. Permission denies are evaluated before the
tool runs and need no scripting:

```jsonc
{
  "permissions": {
    "deny": [
      "Bash(git push --force:*)",
      "Bash(git push -f:*)",
      "Bash(git commit --no-verify:*)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Edit(./.env)",
      "Edit(./migrations/**)",
      "Bash(terraform apply:*)"
    ]
  }
}
```

Reading `.env` matters as much as writing it: an agent that reads a secret can echo it into a
log, a commit, or a message to a third-party service. Deny the read.

A deny entry matches the **start** of the command, so it only holds where the dangerous form
is the prefix. That is why `rm -rf` is not on this list: `"Bash(rm -rf /:*)"` would leave
`rm -fr /`, `rm -Rf /` and `cd / && rm -rf *` untouched while looking like coverage.
Recursive delete needs the hook below, see the `rm` pattern in
`assets/devices/claude-hooks/guard_dangerous_commands.py`.

Put team-wide rules in `.claude/settings.json` (committed) and personal ones in
`.claude/settings.local.json` (gitignored), otherwise the rules exist only on the machine of
whoever set them up, which is the same failure as documenting them.

### PreToolUse hooks for anything conditional

When the rule needs logic, "block `DELETE` without a `WHERE`", "block edits to
`schema.prisma` unless a migration exists", "block production hostnames in a connection
string": a hook script inspects the call and returns a deny with a reason.

Templates in `assets/devices/claude-hooks/`. The critical detail:
**the deny message is read by the agent and is your only chance to redirect it.** A bare
"denied" produces a workaround attempt, often a creative and worse one. A message that says
what was blocked, why, and what to do instead produces the right action. Write it as you would
write an error message for a colleague:

> Blocked: `DELETE` without a `WHERE` clause on `users`. Unbounded deletes are irreversible
> here. Add a `WHERE` clause, or if a full truncate is genuinely intended, ask the user to
> confirm and run it themselves.

### Stop hooks that verify completion

Run the type check and the test suite when the agent tries to finish. This converts "tests
pass" from a claim into a fact, and it is the single highest-value hook in most repos.

### Machine-checkable CLAUDE.md

Anything in CLAUDE.md that *can* be a check should be one; what remains should be facts the
agent needs rather than rules you hope it follows.

- "Always run `make fmt` before committing" → a pre-commit hook.
- "Never use `any`" → a lint rule with a required check.
- "Don't edit generated files" → a deny rule, plus a header in the generated files.
- "Use `pnpm`, not `npm`" → a deny on `Bash(npm install:*)` with a message naming `pnpm`.

What legitimately stays as prose: architecture, domain vocabulary, where things live, why
past decisions were made. Facts, not commands.

### Make the safe path the easy path

Agents follow the shortest route to a working answer. If `make test` runs the right thing with
the right env, it gets used; if the correct invocation is a fifteen-flag command documented in
a wiki, it does not. Every ergonomic improvement here is a poka-yoke: a `make check` that
bundles fmt + lint + types + tests, a `.env.example` with every key present, a devcontainer or
a single setup script. Ambiguity is where agents improvise, and improvisation is where damage
comes from.

## A caution about over-restriction

Deny rules that block ordinary work produce an agent that spends its turns fighting the
harness, and a user who turns the rules off. Aim the strong devices at **irreversible and
outward-facing** actions, force-push, prod, secrets, destructive SQL, deletion, publishing, and leave ordinary editing and reading alone. Reversibility is the right axis: git makes most
code changes cheap to undo, so they do not need a gate. A rotated credential and a dropped
table do not.

## Verify each device

Same discipline as any other guardrail, and easy to check here: try the blocked action and
confirm the denial and its message, then confirm the legitimate neighbouring action still
works. Untested hooks fail open surprisingly often: a regex that doesn't match the real
command string is a hook that does nothing while looking like protection.

Leave a `poka-yoke:` marker comment on each rule naming what it prevents, and show the user
each config before writing it. Hooks execute code on their machine on every tool call; that is not a change to
make on someone's behalf unseen.
