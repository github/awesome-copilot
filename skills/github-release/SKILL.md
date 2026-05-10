---
name: github-release
description: >
  Guides IA through releasing a new version of a GitHub library end-to-end. 
  Handles SemVer versioning and Keep a Changelog formatting automatically.
compatibility: "requires: gh CLI and git"
---

# GitHub Release Skill

This skill automates the full release workflow for a single-package GitHub repository,
from analysis through changelog authoring and PR creation. It relies exclusively on
`gh` (GitHub CLI) and `git` — no other tools needed.

Steps 1–4 are **read-only reconnaissance** — nothing is written to the repo until
Step 5, once the version number is confirmed.

## When to Use This Skill

Use this skill whenever the user wants to cut a new release, publish a new version,
bump a version, create a release branch, generate a changelog, or open a release PR
on a GitHub repository. Trigger even if the user says something casual like "let's
ship a new version" or "time to release".

---

## Prerequisites

Examples below include both Bash and PowerShell variants; Windows users should prefer 
the PowerShell blocks.

Before starting, verify the environment:

```bash
gh auth status                        # must be authenticated
gh repo view --json nameWithOwner     # must be inside a GitHub repo
git status                            # working tree should be clean
```

If any check fails, stop and tell the user what to fix before continuing.

Then ask the user one question:

> *"Which directory contains your library's public-facing source code?
> (e.g. `src/`, `lib/`, `pkg/` — used to focus the diff on what consumers
> actually see. Press Enter to scan the whole repo.)"*

Store the answer as `PUBLIC_PATH`. If empty, `PUBLIC_PATH` is `.` (repo root).
Exclude these paths from all diffs regardless: `tests/`, `test/`, `spec/`,
`__tests__/`, `docs/`, `*.lock`, `*-lock.json`, `*.sum`, generated files
(files with a "do not edit" header comment), and build artefacts.

---

## The 9-Step Release Workflow

Work through every step in order. Show the user what command you're about to run and
its output. Pause and ask for confirmation only when explicitly noted.

---

### Step 1 — Ensure main is up to date

```bash
git checkout main
git pull origin main
```

Stay on `main` for now. The release branch is created in Step 5, after the version
is confirmed.

---

### Step 2 — Grab the latest version tag

> **Why not `gh release list`?** GitHub Releases are an optional layer on top of Git
> tags. Many repos tag releases with `git tag` without ever creating a GitHub Release,
> so `gh release list` can return empty even when version tags exist. Reading tags
> directly from git is the reliable source of truth.

```bash
# Fetch all tags from remote to ensure local view is current
git fetch --tags

# Find the latest version tag, sorted semantically
# --sort=-version:refname handles 1.10.0 > 1.9.0 correctly (unlike alphabetical)
PREV_TAG=$(git tag --sort=-version:refname | grep -E '^v?[0-9]+\.[0-9]+\.[0-9]+' | head -1)
echo "Latest tag: $PREV_TAG"
```

```PowerShell
# Fetch all tags from remote to ensure local view is current
git fetch --tags

# Find the latest version tag, sorted semantically
# --sort=-version:refname handles 1.10.0 > 1.9.0 correctly (unlike alphabetical)
$prevTag = git tag --sort='-version:refname' | `
  Select-String '^[vV]?\d+\.\d+\.\d+' | `
  Select-Object -First 1 -ExpandProperty Line

if ($prevTag) {
  $prevSha = git rev-list -n 1 $prevTag
} else {
  $prevSha = git rev-list --max-parents=0 HEAD
}

Write-Output "Latest tag: $prevTag"
```

Then verify the tag exists on the remote (not just locally):

```bash
git ls-remote --tags origin | grep "refs/tags/$PREV_TAG$"
```

If the remote check returns nothing, warn the user that the tag appears to be local-only
and hasn't been pushed — they may want to push it before continuing.

- `PREV_TAG` is the tag name exactly as found (e.g. `v1.4.2`). Strip any leading `v`
  when doing arithmetic; preserve it when naming things.
- If **no tags exist at all**, treat `PREV_TAG` as `(none)`, set `PREV_SHA` to the
  first commit, and default the new version to `1.0.0` (skip Step 4 versioning logic;
  go straight to Step 5).
- If the tag does not point to a real commit (orphaned tag), fall back to
  `git rev-list --max-parents=0 HEAD` and warn the user.

```bash
PREV_SHA=$(git rev-list -n 1 "$PREV_TAG" 2>/dev/null || git rev-list --max-parents=0 HEAD)
```

---

### Step 3 — Analyse what changed since the last release

This step uses **two complementary signals**. The code diff is the primary source of
truth; commit messages provide supporting context about intent.

#### 3a — Code diff (primary signal)

```bash
# Focused diff on the public source path, excluding noise
git diff "$PREV_SHA"..HEAD -- "$PUBLIC_PATH" \
  ':(exclude)tests/' ':(exclude)test/' ':(exclude)spec/' \
  ':(exclude)__tests__/' ':(exclude)docs/' \
  ':(exclude)*.lock' ':(exclude)*-lock.json' ':(exclude)*.sum'
```

```PowerShell
# Focused diff on the public source path, excluding noise
git diff "$($prevSha)..HEAD" -- $publicPath `
  ':(exclude)tests/' ':(exclude)test/' ':(exclude)spec/' `
  ':(exclude)__tests__/' ':(exclude)docs/' `
  ':(exclude)*.lock' ':(exclude)*-lock.json' ':(exclude)*.sum'
```

Read the full diff output. For each changed file, identify:

1. **Removed symbols** — functions, classes, methods, constants, exported names that
   existed before and are now gone. ? Strong signal for MAJOR.
2. **Changed signatures** — functions that exist in both versions but with different
   parameters, return types, or thrown errors. ? Strong signal for MAJOR.
3. **New exported symbols** — public functions, classes, constants that didn't exist
   before. ? Signal for MINOR.
4. **Internal-only changes** — modifications that don't touch any public interface
   (private helpers, unexported functions, algorithm internals). ? PATCH.
5. **Bug fixes** — corrections to logic that was provably wrong (e.g. off-by-one,
   null check, wrong condition), without changing the public API. ? PATCH.

If the diff is very large (thousands of lines), first run the stat summary to
prioritise which files to read in full:

```bash
git diff "$PREV_SHA"..HEAD --stat -- "$PUBLIC_PATH"
```

Focus your detailed reading on files with the most changes and files whose names
suggest they define public interfaces (e.g. `index.*`, `api.*`, `exports.*`,
`public.*`, `mod.*`, `__init__.*`).

#### 3b — Commit log (secondary signal)

```bash
git log "$PREV_SHA"..HEAD --oneline --no-merges
```

Use this to:
- Understand the **intent** behind code changes that aren't self-explanatory from
  the diff alone (e.g. a one-line security fix labelled as such).
- Catch changes that may be in paths outside `PUBLIC_PATH` but are still user-visible
  (e.g. a CLI flag change in a `cmd/` directory).
- Fill in context for changelog entries where the code alone doesn't tell the whole
  story.

See `references/commit-classification.md` for mapping message patterns to change types.

#### 3c — Reconcile the two signals

When signals agree ? use that classification with confidence.

When signals conflict ? **prefer the code diff**. Examples:
- Commit says `fix: typo` but the diff shows a removed public method ? treat as MAJOR.
- Commit says `feat: new API` but the diff only touches private internals ? treat as PATCH.
- Commit says `chore: refactor` but the diff adds new exported symbols ? treat as MINOR.

Document any conflicts you notice — flag them to the user during the changelog review
in Step 6.

---

### Step 4 — Determine the next SemVer version

Apply these rules to your analysis from Step 3 (full rules in `references/semver-rules.md`):

| Condition | Bump |
|---|---|
| Any breaking change to public API (removal, signature change, behaviour change) | MAJOR |
| New exported symbol or feature, no breaking changes | MINOR |
| Bug fix, perf improvement, security fix, docs, chore only | PATCH |

When a release contains a mix, the **highest precedence wins**:
`MAJOR > MINOR > PATCH`.

Compute `NEXT_VERSION`:
- Split `PREV_TAG` into `MAJOR.MINOR.PATCH` integers.
- Apply the appropriate bump.
- Format as `vMAJOR.MINOR.PATCH`.

**Present the proposed version to the user** with a brief rationale that cites
specific code findings, not just commit messages. Example:

> *"I'm proposing v2.1.0. The diff shows two new exported functions (`NewClient` and
> `WithTimeout`) in `src/client.go`, and no existing public symbols were removed or
> changed. Commit messages corroborate this as feature additions."*

Ask: *"Does this version look right, or would you like to adjust it?"*
Wait for confirmation before proceeding.

---

### Step 5 — Create the release branch

Now that the version is confirmed, create the branch with the correct name from the start:

```bash
git checkout -b release/vX.Y.Z
git push -u origin release/vX.Y.Z
```

---

### Step 6 — Update CHANGELOG.md

Read the existing `CHANGELOG.md` (or create it if absent). Follow the
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format strictly.

**Structure to insert** at the top (just below the `# Changelog` header):

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Deprecated
- ...

### Removed
- ...

### Fixed
- ...

### Security
- ...
```

Rules:
- Use today's date in `YYYY-MM-DD` format.
- Omit sections that have no entries — don't leave empty headings.
- Write entries in **plain English from a user's perspective**, derived primarily
  from what the code diff shows, supplemented by commit message context.
  Good: *"Added `WithTimeout` option to HTTP client constructor."*
  Bad: *"feat: add timeout cfg param"*
- Map findings to sections:
  - New exported symbol ? Added
  - Breaking removal ? Removed
  - Breaking change to existing API ? Changed (flag it as breaking)
  - Bug/logic fix, perf ? Fixed
  - Security fix ? Security
  - Internal refactor, docs, chore, test ? omit unless user-visible
- If a commit message revealed intent that the code diff alone wouldn't convey
  (e.g. a security fix disguised as a one-line change), include that context in
  the changelog entry.
- Also update the diff link at the bottom of the file:
  ```markdown
  [X.Y.Z]: https://github.com/OWNER/REPO/compare/vPREV...vNEXT
  ```

**Show the user the proposed changelog section before writing it to disk.**
If any signal conflicts were found in Step 3c, flag them here so the user can verify.
Ask: *"Does this changelog look accurate? Any entries to add, remove, or reword?"*
Incorporate feedback, then write to disk.

---

### Step 7 — Commit and push

```bash
git add CHANGELOG.md
git commit -m "chore: release vX.Y.Z"
git push origin release/vX.Y.Z
```

Confirm the push succeeded before moving on.

---

### Step 8 — Open a Pull Request

**?? IMPORTANT:** Always use `--body-file` to pass PR body text, never `--body` with inline text.
Inline escape sequences like `\n` are not interpreted as newlines by PowerShell and will appear
as literal text in the PR. Using a file ensures proper markdown formatting.

```bash
gh pr create \
  --base main \
  --head release/vX.Y.Z \
  --title "Release vX.Y.Z" \
  --body "$(cat <<'EOF'
## Release vX.Y.Z

This PR prepares the **vX.Y.Z** release.

### What's included
<!-- paste the changelog section here -->

### Checklist
- [ ] Changelog reviewed
- [ ] Version bump verified
- [ ] CI passing

After merging, create the tag on the merge commit:
\`\`\`
git tag vX.Y.Z <merge-commit-sha>
git push origin vX.Y.Z
\`\`\`
EOF
)"
```

```PowerShell
# Create PR body using here-string (preserves actual newlines, not escape sequences)
$prBody = @"
## Release vX.Y.Z

This PR prepares the **vX.Y.Z** release.

### What's included
<paste changelog here>

### Checklist
- [ ] Changelog reviewed
- [ ] Version bump verified
- [ ] CI passing

After merging, create the tag on the merge commit:
``````
git tag vX.Y.Z <merge-commit-sha>
git push origin vX.Y.Z
``````
"@

# Write to file and use --body-file (do NOT use inline --body with escape sequences)
$prBody | Out-File -FilePath release_pr_body.md -Encoding utf8 -NoNewline
gh pr create --base main --head release/vX.Y.Z --title "Release vX.Y.Z" --body-file release_pr_body.md
```

Paste the changelog section into the PR body's "What's included" block (or leave placeholder for manual review).


---

### Step 9 — Hand off to the user

Tell the user:

> **Release PR is open! ??**
>
> New version: **vX.Y.Z**
>
> Once the PR is reviewed and merged, you'll need to **create the tag yourself** on
> the merge commit:
>
> ```bash
> git tag vX.Y.Z <merge-commit-sha>
> git push origin vX.Y.Z
> ```
>
> Then go to GitHub Releases and publish the release from that tag. You can copy the
> changelog section directly into the release notes.

---

## Error handling

| Situation | What to do |
|---|---|
| `gh auth status` fails | Stop; tell user to run `gh auth login` |
| Not inside a git repo | Stop; tell user to `cd` into their repo |
| Working tree is dirty | Warn; ask if they want to stash or abort |
| No commits since last tag | Tell user there's nothing to release |
| Tag exists but points to no commit | Use first commit as diff base; warn user |
| Latest tag exists locally but not on remote | Warn user; ask if they want to push the tag first or continue anyway |
| Diff is empty for `PUBLIC_PATH` but commits exist | Warn; all changes may be internal; ask if they still want to proceed |
| `git push` fails (e.g. protected branch rules) | Report the error verbatim; suggest they check branch protection settings |

---

## Troubleshooting in PowerShell

- If a command that works locally prints gh usage or treats a subcommand as separate token, ensure you're
  invoking the gh.exe on PATH (Get-Command gh) and avoid passing unexpanded nested substitutions; use the PowerShell 
  patterns above.
- Recommend tests: gh --version; git fetch --tags; run the PowerShell snippet to set $prevTag and run git diff --name-only $prevSha..HEAD -- src/

---

## Limitations

- Requires the `gh` CLI to be installed and authenticated.
- Requires git tags to determine current version.

---

## Reference files

- `references/semver-rules.md` — Extended SemVer decision rules and edge cases
- `references/commit-classification.md` — Heuristics for classifying commit messages into change types
