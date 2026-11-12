# Issue Scouting

Finding an issue that is real, current, and winnable.

## What makes a good target

- **Live reproducible bugs beat labels.** "Good first issue" labels are
  often years stale. Prefer fresh issues with concrete symptoms: a crash, a
  wrong value, a resource leak, a parse mismatch. These are finishable
  because the symptom defines done.
- **The reporter did half your work.** Issues with reproduction steps,
  versions, and expected/actual behavior are worth 2x. Issues with none
  require you to reproduce from scratch — budget for that or skip.
- **The project is alive.** Check recent commit dates and whether open PRs
  receive reviews. A dead repo cannot merge your work.
- **Severity you can prove.** A memory leak with numbers (144 orphaned
  processes, 1589 reconnect events) outranks a typo fix for visibility.

## Finding issues in a target repo

```bash
gh search issues --repo OWNER/REPO --state open --sort created \
  --json number,title,author,createdAt,labels --limit 30
gh issue list --repo OWNER/REPO --state open --limit 50
```

Filter mentally for: concrete symptoms, no assignee, no linked PR, filed
within the last few months, and touching code you can actually read.

## Competing claims

Before investing hours, check whether someone else is mid-flight:

```bash
gh pr list --repo OWNER/REPO --author CLAIMANT --state open
gh api users/CLAIMANT/repos --jq '.[].name' | grep -i repo-name
```

A claim with no open PR and no fork is **dead** — the claimant said "I can
take this" and vanished. Proceed, but credit their diagnosis in your issue
comments and PR body. Claims cost nothing to honor and buy goodwill.

If a competing PR exists and is alive, pick a different issue.

## Reproduce before you commit

Reproducing locally is the entry ticket. If the reproduction needs an
environment you cannot stand up (specific OS, cloud service, hardware), the
issue is not yours. Write the reproduction down — it becomes the fixture
for your regression test later.

## One at a time

Finish and submit one contribution before scouting the next. Parallel
half-finished contributions across repos produce zero merged PRs; a
pipeline produces many.
