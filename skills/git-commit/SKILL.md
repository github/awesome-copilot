---
name: git-commit
description: 'Use this skill when the user wants to make a Git commit or split changes into more than one commit. Also use it when the user types "/commit" or asks for a conventional commit. The skill examines the diff, stages the related files, writes a Conventional Commits message, and runs git commit. Do not use it when the user wants only a commit message and no commit. Do not use it to push, open a pull request, rebase, or change the commit history.'
license: MIT
compatibility: 'Requires Git. The `--resolved` option of `git add` requires Git 2.56 or later.'
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
- Write each footer as `Token: value`, for example `Refs: #456` or `Closes: #123`. In a token, use `-` in place of a space.

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

If there are no changes, tell the user. Do not make an empty commit.

### 3. Stage the files

Put one logical change in each commit. If the staged files contain more than one change, stage only the files for one change:

```bash
git add -- path/to/file1 path/to/file2
git add -- '*.test.*'
git add -- src/components/
```

- Put a glob in quotes. Without quotes, the shell expands the glob and does not find the files in subdirectories.
- Do not use `git add -p` or `git add -i`. These commands wait for input from a person.
- After you resolve a merge conflict, use `git add --resolved`. This command stages only the resolved files. If a file still has conflict markers, the command stops.
- Examine the list of staged files with `git diff --staged --name-only`. Do not commit secrets, for example `.env` files, `credentials.json`, or private keys.

### 4. Write the message

Get each part from the diff:

- **Type**: The kind of change.
- **Scope**: The module or the area that the change affects.
- **Summary**: What changed, in one line.

### 5. Commit

Give each paragraph with a different `-m` option. Git puts a blank line between the paragraphs. This command works in Bash, PowerShell, and other shells.

```bash
git commit -m "feat(auth): add token refresh"
git commit -m "fix(parser): accept empty input" -m "An empty file caused a crash." -m "Closes: #123"
```

For a long message, write the message to a temporary file. Then run `git commit -F <file>`.

### 6. Make sure that the commit is correct

```bash
git log -1 --stat
git status --porcelain
```

## Safety Rules

- Do not change the Git configuration.
- Do not use `--no-verify` unless the user tells you to. Hooks can be in `.git/hooks` or in the Git configuration.
- If a hook fails, Git does not make the commit. Fix the problem, stage the files again, and run the same `git commit` command again. Do not use `--amend`, because it changes the previous commit.
- Do not change the commit history unless the user tells you to. Do not use `git reset --hard`, `git rebase`, or the experimental `git history` command.
- Do not push unless the user tells you to. Do not force push to the default branch.
