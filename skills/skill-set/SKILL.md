---
name: skill-set
description: 'Installs, shares, locks, verifies, and updates skill sets (named, versioned groups of agent skills). Use for any multi-skill, manifest (.skill-set.json), or set-lock operation. Not for authoring or installing one skill, or for npm and pip.'
license: MIT
---

# Skill sets

A skill set is a named, versioned bundle of agent skills, defined by a small JSON manifest and installed as a group. This skill drives the `skill-set` CLI, which wraps `npx skills` to resolve each member. Full docs: https://skill-set.md.

## Quick start

Install a published, tag-pinned set whose four members are verified against its sidecar lock:

    npx @skill-set/cli add https://skill-sets.md/sets/skill-authoring/skill-authoring.skill-set.json
    npx @skill-set/cli add https://skill-sets.md/sets/skill-authoring/skill-authoring.skill-set.json#sha256=<setHash>

The first form auto-discovers and checks the author's sidecar lock; the second also pins the rollup hash obtained out-of-band. Either way, if verification fails nothing is kept and the command exits 3.

Or define your own set from remote skills, then install it:

    npx @skill-set/cli init <name> <owner/repo@skill> [<owner/repo@skill> ...]
    npx @skill-set/cli install <name>

## Core concepts

- **Manifest** — `<name>.skill-set.json`: the set's name, version, and member skill locators. The shareable definition.
- **Set-lock** — `<name>.skill-set.lock.json`: each member skill's resolved content hash plus a rollup `setHash`, for byte-exact verification.
- **SKILL-SET.md** — a generated discovery page per set. Do not hand-edit; run `build`.
- Sets live under `.agents/skills/skill-sets/<name>/`; member skills install as ordinary skills under `.agents/skills/`.

## Common tasks

Global flags: `--json` (machine output), `--yes` (CI),
`--dry-run` (preview, changes nothing). Full reference: https://skill-set.md/cli.

- **Create a set** — `init <name> <locators...>`
- **Install / sync** — `install <name>` (skips members the lock already satisfies)
- **Generate lock of local contents** — `lock <name>`
- **Regenerate pages + index** — `build [<name>] [--lock]`
- **Verify installed content** — `verify <name> [--frozen]` (frozen re-hashes vs the lock; the CI default)
- **Update members** — `update <name>` (re-resolves via `npx skills`, then re-locks)
- **Remove a set** — `remove <name>` (optionally removes skills no other set uses)

## Sharing a set

`share` re-fetches every member into a clean staging area and records the hash of the *delivered* content — never your local, possibly-edited folders:

    npx @skill-set/cli share <name>

Publish the emitted `<name>.skill-set.json` and `<name>.skill-set.lock.json` together. A recipient verifies at install time:

    npx @skill-set/cli add <url>                  # auto-discovers and checks the sidecar lock
    npx @skill-set/cli add <url>#sha256=<setHash>  # or pin the rollup hash out-of-band

If verification fails, nothing is kept and the command exits 3 — see https://skill-set.md/faq for what gets verified and when.

## Caveats

- **`.agents/skills/skill-sets/` is the set-definitions directory, not a skill.** The name `skill-sets` is reserved: the CLI refuses to install any skill under it, so set definitions survive member installs. To remove a single set, use `skill-set remove <name>` — never delete inside that directory by hand.
- **Local member locators work locally but aren't shareable.** You can `init`, `install`, and `lock` a set that references local skill paths, but `share` rejects them — a shared set must resolve from remote sources on another machine.

## Reference

- Manifest + set-lock format — https://skill-set.md/spec
- Full CLI reference (commands, flags, exit codes) — https://skill-set.md/cli
- Trust model, what is verified and when — https://skill-set.md/faq
