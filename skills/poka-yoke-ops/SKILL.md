---
name: poka-yoke-ops
description: >-
  Deploys, schema migrations, rollback and infrastructure. Use when "can I ship this on Friday", "this migration is scary", "what is the blast radius", "prevent accidental deletion of the database", or a change drops a column. Covers expand/contract, canary rollout, kill switches, prevent_destroy, tested backups. For an incident that already happened use retro.
license: MIT
---

# Poka-Yoke for Deploys and Infrastructure

Operations is where irreversible mistakes concentrate. Code mistakes are usually recoverable, git remembers, a revert ships in twenty minutes. A dropped table, a deleted bucket, a rotated
credential, or a terminated stateful node is not recoverable by any amount of engineering
after the fact.

So the governing question in this mode is different from the rest of the plugin. Not "can this
be done wrong?" but: **when this is done wrong, how much is affected, and can it be undone?**
Those two axes, blast radius and reversibility, determine every device below.

## Answer these four first

Before any framework or table, establish these. They are what an operator actually needs, and
they are the things most often left out: an answer that skips them is not useful no matter
how well organized the rest is. Say each one plainly, in a sentence, before going deeper.

1. **What here is irreversible, and what restores it?** Name the specific unrecoverable step: a dropped column, a deleted bucket, a rotated key. Then say what would restore it: a
   backup, a snapshot, a rebuild. **If the answer is "nothing", say so explicitly.** An
   irreversible step with no stated restore path is the single most important thing you can
   tell someone, and it is the first thing to get lost in a longer answer.
2. **What breaks during the rollout window?** Deploys are not atomic. For a period, old code
   runs against the new state. Say what happens in that window, usually this is the actual
   outage, not the change itself.
3. **Can the irreversible part ship separately?** Most changes are a reversible part and an
   irreversible part stapled together. Splitting them is nearly always available and nearly
   always right; say so concretely rather than in general.
4. **If it goes wrong, who is available and how fast is rollback?** Timing questions are about
   staffing and recovery speed, not superstition. A change that reverts in two minutes is fine
   on a Friday afternoon; one that needs a four-hour restore with two people asleep is not.

Cover all four even when the answer is brief. If you only have room for a little, spend it
here rather than on the taxonomy: the rungs below are how to *think* about the fix, but these
four are what the person has to know before they ship.

## The blast radius ladder

Most ops poka-yoke is not about preventing the bad change. It is about ensuring the bad change
reaches 1% of traffic instead of 100%. You cannot prevent every bad deploy; you can make bad
deploys cheap.

| Rung | Device | What it buys |
|---|---|---|
| **1 Control** | The dangerous operation is impossible in this environment, `prevent_destroy` on stateful resources, deletion protection on the database, no human write access to prod, immutable infrastructure | The mistake cannot be made at all |
| **1 Control** | Progressive rollout with automatic rollback on error-rate: the bad version is withdrawn before most users see it | The mistake is capped and self-healing |
| **2 Warning** | Required plan review, a deploy that prints what it will destroy and demands typed confirmation, alerts wired to the rollout | The mistake is visible at the moment of decision |
| **3 Detection** | Post-deploy smoke tests, monitoring, an on-call human | The mistake is found after users find it |
| **0** | A runbook step that says "double-check the environment first" | Nothing |

## Reversibility is the highest-leverage property

Before adding any gate, ask whether the operation can be made reversible instead: a
reversible operation needs far weaker devices, because the cost of the mistake collapses.

- **Soft delete and retention windows** on anything user-facing. S3 versioning plus MFA delete,
  database point-in-time recovery, trash with a 30-day window.
- **Deletion protection flags** on databases, buckets, clusters, and load balancers. These
  cost nothing and stop the single most expensive class of cloud mistake.
- **Backups that have actually been restored.** An untested backup is a belief, not a device, and this is the most common false sense of protection in the industry. Restore drills on a
  schedule, timed, into a real environment. If nobody has restored it, treat the data as
  unbacked when you assess blast radius.
- **Immutable artifacts** so rolling back means redeploying a known-good image, not rebuilding
  and hoping the build is reproducible.

## Schema migrations: expand and contract

Co-deploying a destructive schema change with the code that depends on it is an outage, not a
risk, during the rollout window old code necessarily runs against the new schema.

The pattern, one deploy per step:

1. **Expand**: add the new column/table, nullable, with no code depending on it.
2. **Backfill**: in batches, resumable, throttled, with progress recorded so a failure resumes
   rather than restarts.
3. **Dual-write**: new code writes both old and new; both remain readable.
4. **Switch reads**: behind a flag, so switching back is instant.
5. **Contract**: drop the old column, in a later deploy, once nothing references it.

Steps 1–4 are reversible: the old column stays readable throughout, so rolling the deploy
back is enough. Only step 5 is not, which is exactly why it gets its own deploy and its own
gate. The device that makes this stick is a CI check that refuses any `DROP`, `TRUNCATE`, or
`ALTER ... DROP` in a changed migration unless the PR carries an explicit approval label, see
`guardrails` for the gate itself.

Migration-specific hazards worth checking every time: a lock taken on a large table during
peak traffic; a backfill with no batch limit; an index created without `CONCURRENTLY`; a
`NOT NULL` added without a default on a populated table; a rename, which is a drop and an add
wearing a disguise.

## Feature flags and kill switches

A kill switch is a poka-yoke for a change you cannot fully test in advance. It converts "roll
back a deploy" (minutes, and impossible if the migration already ran) into "flip a boolean"
(seconds). Ship risky changes dark, behind a flag, then enable progressively.

Two things make flags devices rather than debt:

- **The off path must be tested**, not just the on path. A kill switch whose disabled branch
  was never exercised is a second untested code path shipped at your worst moment.
- **Flags need an expiry.** A permanent flag is a permanent untested branch and a permanent
  source of "works for some users only" bugs. Track age and remove them; stale flags are the
  standard way this device turns into a hazard.

## Infrastructure as code

- **`prevent_destroy` on every stateful resource**: databases, buckets, volumes, DNS zones.
  One line, and it turns the worst cloud accident into a failed plan. It is Control against the
  accident, not against intent: removing the block is another one-line change, so review has to
  read a diff that deletes a `prevent_destroy` as itself a destructive change.
- **Plan review as a required check**, with the plan output posted to the PR. A human approving
  a diff they cannot see is rung zero.
- **Fail the plan on unexpected destruction**: a check that counts destroy actions and blocks
  the apply unless the change is explicitly labeled as intentionally destructive. Terraform
  will happily replace a database to change one immutable attribute, and the plan says so in
  a line people skim past.
- **Separate state and credentials per environment**, so a misconfigured shell cannot point a
  staging apply at production. Environment confusion is a mistake of *context*, and the device
  is making the contexts physically incapable of touching each other.
- **No console access for routine work.** Manual changes drift from code and are invisible to
  review; drift detection turns that into a Warning at minimum.

## Production access

The strongest device is not needing access: good observability, safe read-only debugging
tools, and self-service runbooks remove most reasons a human ever holds a prod shell.

Where access is genuinely needed: time-boxed and audited, read-only by default, write access
requiring a second approver, and a shell prompt that makes the environment impossible to
mistake. Environment confusion, running the staging command against prod, is a top-tier
ops mistake and it is fixed by making prod look and feel different, not by remembering.

Wrap dangerous scripts so the safe form is the easy one: dry-run by default with `--apply` to
commit, print the affected count before acting, refuse to run against prod without an explicit
flag, and refuse an empty or wildcard target.

## Auditing an ops setup

Work through these, and report using the finding structure from `audit`:

1. **What is irreversible today?** Every resource whose loss is unrecoverable. Which have
   deletion protection? When was the backup last *restored*, not last taken?
2. **What is the blast radius of a bad deploy?** All users at once, or 1%? Is rollback
   automatic on an error-rate signal, or does it need a human who is asleep?
3. **Can a migration and its dependent code land together?** Is anything stopping it?
4. **Can a staging command reach production?** Shared credentials, shared state, an ambiguous
   prompt, a `--env` flag defaulting to prod.
5. **What has no kill switch?** Anything risky that can only be withdrawn by a full deploy.
6. **Which flags are older than 90 days?**

Propose devices before applying them, and never apply infrastructure changes without explicit
approval: an `apply` is exactly the class of outward-facing, hard-to-reverse action that
belongs to the user, not to you. For anything you cannot run yourself (console settings,
branch protection, IAM), hand over the exact steps or CLI command.
