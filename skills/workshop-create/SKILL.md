---
name: workshop-create
description: 'Create a new workshop or use an existing directory as one. Handles two paths: (A) use an existing local directory the operator points at, or (B) create a new private GitHub repo in the signed-in account. Never creates a repo inside another repo.'
---

# Create a Workshop

Set up a new workshop — the root directory where desks live.

## When to use

- The operator says "create a workshop" or "start a new workshop"
- The operator wants to organize work under a shared root
- The operator has an existing directory they want to use as a workshop

## Two paths

### Path A: Use an existing directory

The operator already has a folder they want to use. Maybe it's a repo
they cloned, maybe it's a local project folder.

1. **Confirm the path exists.** If not, ask the operator for a valid path.
2. **Check if it's already a workshop.** Look for `desks/` or `classroom/`
   folders, a `workshop.md`, `CAIRN.md`, or `hands-up.md`. If any exist,
   it's already a workshop — just use it.
3. **Scaffold the workshop structure** (only what's missing):
   ```
   <path>/
     desks/           # where desks live
     bench/            # shared workspace
     CAIRN.md          # operating disposition
     README.md         # workshop map
   ```
4. **Do NOT run `git init`.** The directory may already be a git repo, or
   the operator may not want one yet. Leave git state alone.
5. **Do NOT create a GitHub repo.** This path is local-only.

### Path B: Create a new private GitHub repo

The operator wants a fresh workshop backed by a GitHub repo.

1. **Get the workshop name.** Short, no spaces, kebab-case preferred.
2. **Create the repo:** `gh repo create <owner>/<name> --private --clone`
   - Use the operator's signed-in GitHub account as `<owner>`
   - Clone it to a sensible location (ask the operator where, or use
     their configured workshops directory)
3. **Scaffold the workshop structure** inside the cloned repo:
   ```
   <name>/
     desks/
     bench/
     CAIRN.md
     README.md
   ```
4. **Commit and push** the scaffold.

### Critical: Never nest repos

**Never run `git init` inside a directory that is already inside a git
repository.** Before initializing, check:

```bash
git -C <parent-dir> rev-parse --is-inside-work-tree
```

If that returns `true`, the parent is already a git repo. Do NOT create
another repo inside it. Either:
- Use Path A (just scaffold, no git)
- Or clone to a different location that isn't inside a repo

## CAIRN.md content

The operating disposition every desk reads:

```markdown
# cairn

the trail markers that say: someone was here, and they were honest.

## how a desk stands

- **stop is a valid finish.** don't force a result when the evidence
  says stop. "this doesn't work" is a finding, not a failure.
- **"done" means it holds.** if you'd bet your desk on it, ship it.
  if not, say what's uncertain and why.
- **hold scope.** touch only what the task needs. if you find something
  outside scope, note it and move on — don't chase it.
- **never go silent, never bluff.** partial + honest > complete + wrong.
  if you're stuck, say so. if you're unsure, say that too.
- **equal standing.** you can say "that's the wrong question." you can
  disagree with another desk. you answer to evidence, not hierarchy.

## the bench

the shared workspace. leave your work where others can find it.
label it. if it supersedes earlier work, say so.

## hands-up

when two desks disagree and can't settle it against external facts,
that's a hands-up. it goes to the operator. this is the system
working, not failing.
```

## After creation

Tell the operator:
- Where the workshop lives (full path)
- That they can now open desks in it with `desk-open`
- That Cairn will show signals once desks start emitting them

## Principles

- A workshop is a place, not a product. Keep it simple.
- The operator decides where things go. Don't assume.
- If an existing directory already has work in it, preserve everything.
  Only add what's missing.
