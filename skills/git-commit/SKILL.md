---
name: git-commit
description: 'Use this skill when the user wants to make a Git commit or split changes into more than one commit. Also use it when the user types "/commit" or asks for a conventional commit. The skill examines the diff, stages the related files, writes a Conventional Commits message, and runs git commit. Do not use it when the user wants only a commit message and no commit. Do not use it to push, open a pull request, rebase, or change the commit history.'
license: MIT
compatibility: 'Requires Git. The `--resolved` option of `git add` requires Git 2.56 or later. Older versions use the fallback in step 3.'
allowed-tools: shell(git:*)
---

# Git Commit with Conventional Commits

Make Git commits that follow the [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) specification. Get the type, the scope, and the summary from the diff.

## Message Format

```text
<type>(<scope>): <summary>

<body>

<footer>
```

- The scope, the body, and the footer are optional. Without a scope, write `<type>: <summary>`.
- Write the summary in the imperative mood: "add", not "added" or "adds".
- Keep the first line at 72 characters or less. Do not put a period at the end.
- In the body, tell what changed and why.
- Write each footer as `Token: value` or `Token #value`, for example `Refs: #456` or `Closes #123`. Conventional Commits accepts the two forms, but Git reads only `Token: value` as a trailer. In a token, use `-` in place of a space.

## Types

Conventional Commits defines only `feat` and `fix`. The other types come from the Angular convention ([`@commitlint/config-conventional`](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional)). If the repository has its own list, use that list.

| Type       | Use it for                                     |
| ---------- | ---------------------------------------------- |
| `feat`     | A new feature                                  |
| `fix`      | A bug fix                                      |
| `docs`     | Documentation only                             |
| `style`    | Formatting only, with no change to the logic   |
| `refactor` | A code change that is not a feature or a fix   |
| `perf`     | A performance improvement                      |
| `test`     | New or changed tests                           |
| `build`    | The build system or the dependencies           |
| `ci`       | The CI configuration                           |
| `chore`    | Other maintenance                              |
| `revert`   | A revert of an earlier commit                  |

## Breaking Changes

Put `!` before the colon, or add a `BREAKING CHANGE:` footer. Write the token in uppercase. `BREAKING-CHANGE:` is also correct.

```text
feat(api)!: remove the v1 endpoints

BREAKING CHANGE: Clients must use the v2 endpoints.
```

## Workflow

### 1. Read the repository rules

Find the commit rules before you write a message:

- A commitlint configuration, for example `commitlint.config.js` or `.commitlintrc.json`.
- `CONTRIBUTING.md`.
- The recent messages: `git log --oneline -10`.

If a repository rule is different from this skill, use the repository rule.

### 2. Examine the changes

```bash
git status --porcelain
git diff --staged
git diff
```

If there are no changes, run the checks at the start of step 3. If they find `MERGE_HEAD`, continue. If not, tell the user what `git status --long` shows. Do not make an empty commit.

### 3. Stage the files

First, check for an operation in progress. Run each command alone. Do not chain them with `&&`. In a subdirectory, run every command in this step as `git -C <root> ...`. `git rev-parse --show-toplevel` prints the root.

```bash
git rev-parse -q --verify --symbolic-full-name MERGE_HEAD
git rev-parse -q --verify --symbolic-full-name CHERRY_PICK_HEAD
git rev-parse -q --verify --symbolic-full-name REVERT_HEAD
git diff --name-only --diff-filter=U --no-relative
git status --long
```

A `rev-parse` command prints a ref name if its operation is in progress. If not, the command prints nothing and exits with status 1. The `git diff` command lists unmerged files. It finds conflicts that have no ref, for example from `git stash pop`. `git status --long` shows the other cases.

**If an operation is in progress or there are unmerged files**, do not unstage files. Do not split the commit. The index holds the result of the operation. If you unstage a file, Git drops the changes of the other side or removes a conflict entry.

- Stop and tell the user if `git status --long` shows "rebase in progress", "You are in the middle of an am session", "Cherry-pick currently in progress", or "Revert currently in progress".
- Run `git status --porcelain=v2`. A line that starts with `u` shows an unmerged file. You can resolve the file only if all these conditions are true:
  - The line starts with `u UU N...` or `u AA N...`.
  - Each mode on the line is `100644`, `100755`, or `000000`.
  - `git diff --no-relative` does not show `Binary files differ` for the file.
- Ask the user how to resolve all other unmerged files. Git cannot find conflict markers in these files. `git add --resolved` and the checks below stage these files without a warning. Stage each of these files only after the user resolves it: `git add -- <path>`.
- With Git 2.56 or later, stage the files that you can resolve with `git add --resolved -- <paths>`.
- With older Git, check those files and stage them:

```bash
git diff --check -- path/to/file1 path/to/file2
git add -- path/to/file1 path/to/file2
```

- Stage the files only if `git diff --check` finds no "leftover conflict marker" line. Ignore whitespace warnings from the other branch.
- Then, with any Git version, run `git diff --name-only --no-relative` and `git ls-files --others --exclude-standard`. They list edits in other files. Skip the files that are still unmerged.
- Show these paths to the user. Ask if they belong to the commit. Stage only the approved paths with `git add -- <paths>`.
- Git quotes some paths, for example paths with non-ASCII characters. `git add` fails for a quoted path. Ask the user about these files.

**If there is no operation and no unmerged file**, put one logical change in each commit. If the staged files contain more than one change, first unstage the files of the other changes. Then stage the files for this change:

```bash
git reset -q -- path/to/other-file1 path/to/other-file2
git add -- path/to/file1 path/to/file2
git add -- '*.test.*'
git add -- src/components/
```

- Put a glob in quotes. Without quotes, the shell expands the glob and does not find the files in subdirectories.
- Do not use `git add -p` or `git add -i`. These commands wait for input from a person.
- Examine the list of staged files with `git diff --staged --name-only`. Do not commit secrets, for example `.env` files, `credentials.json`, or private keys.

### 4. Write the message

Get each part from the diff:

- **Type**: The kind of change.
- **Scope**: The module or the area that the change affects.
- **Summary**: What changed, in one line.

### 5. Commit

When step 3 finds `MERGE_HEAD`, `CHERRY_PICK_HEAD`, or `REVERT_HEAD`, run `git commit --no-edit` with no paths and no `--cleanup` option. This keeps the message that Git prepared. Do not write a new `-m` message. The message can keep the `Conflicts:` comment lines from Git. Do not remove them.

In all other cases:

Give each paragraph with a different `-m` option. Git puts a blank line between the paragraphs. This command works in Bash, PowerShell, and other shells.

```bash
git commit -m "feat(auth): add token refresh"
git commit -m "fix(parser): accept empty input" -m "An empty file caused a crash." -m "Closes: #123"
```

For a long message, write the message to a temporary file. Then run `git commit -F <file>`.

### 6. Make sure that the commit is correct

```bash
git log -1 --stat --first-parent
git status --porcelain
```

## Safety Rules

- Do not change the Git configuration.
- Do not use `--no-verify` unless the user tells you to. Hooks can be in `.git/hooks` or in the Git configuration.
- If a hook fails, Git does not make the commit. Fix the problem, stage the files again, and run the same `git commit` command again. Do not use `--amend`, because it changes the previous commit.
- Do not change the commit history unless the user tells you to. Do not use `git reset --hard`, `git rebase`, or the experimental `git history` command.
- Do not push unless the user tells you to. Do not force push to the default branch.
