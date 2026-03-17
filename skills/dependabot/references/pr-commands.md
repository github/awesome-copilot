# Dependabot PR Comment Commands

Interact with Dependabot pull requests by commenting `@dependabot <command>`. Dependabot acknowledges commands with a thumbs-up reaction.

## Commands for Individual PRs

| Command | Description |
|---|---|
| `@dependabot merge` | Merge the PR once CI tests pass |
| `@dependabot squash and merge` | Squash and merge the PR once CI tests pass |
| `@dependabot cancel merge` | Cancel a previously requested merge |
| `@dependabot rebase` | Rebase the PR against the target branch |
| `@dependabot recreate` | Recreate the PR from scratch, overwriting any manual edits |
| `@dependabot reopen` | Reopen a closed PR |
| `@dependabot close` | Close the PR and prevent Dependabot from recreating it |
| `@dependabot ignore this dependency` | Close the PR and stop all future updates for this dependency |
| `@dependabot ignore this major version` | Close and stop updates for this major version |
| `@dependabot ignore this minor version` | Close and stop updates for this minor version |
| `@dependabot ignore this patch version` | Close and stop updates for this patch version |
| `@dependabot show DEPENDENCY_NAME ignore conditions` | Display a table of all current ignore conditions for the dependency |

## Commands for Grouped Updates

These commands work on Dependabot PRs created by grouped version or security updates.

| Command | Description |
|---|---|
| `@dependabot ignore DEPENDENCY_NAME` | Close the PR and stop updating this dependency in the group |
| `@dependabot ignore DEPENDENCY_NAME major version` | Stop updating this dependency's major version |
| `@dependabot ignore DEPENDENCY_NAME minor version` | Stop updating this dependency's minor version |
| `@dependabot ignore DEPENDENCY_NAME patch version` | Stop updating this dependency's patch version |
| `@dependabot unignore *` | Close current PR, clear ALL ignore conditions for ALL dependencies in the group, open a new PR |
| `@dependabot unignore DEPENDENCY_NAME` | Close current PR, clear all ignores for a specific dependency, open a new PR with its updates |
| `@dependabot unignore DEPENDENCY_NAME IGNORE_CONDITION` | Close current PR, clear a specific ignore condition, open a new PR |

## Usage Examples

### Merge After CI

```
@dependabot merge
```

Dependabot waits for all required CI checks to pass before merging.

### Ignore a Major Version Bump

```
@dependabot ignore this major version
```

Useful when a major version has breaking changes and migration is not yet planned.

### Check Active Ignore Conditions

```
@dependabot show express ignore conditions
```

Displays a table showing all ignore conditions currently stored for the `express` dependency.

### Unignore a Dependency in a Group

```
@dependabot unignore lodash
```

Closes the current grouped PR, clears all ignore conditions for `lodash`, and opens a new PR that includes available `lodash` updates.

### Unignore a Specific Condition

```
@dependabot unignore express [< 1.9, > 1.8.0]
```

Clears only the specified version range ignore for `express`.

## Tips

- **Rebase vs Recreate**: Use `rebase` to resolve conflicts while keeping your review state. Use `recreate` to start fresh if the PR has diverged significantly.
- **Force push over extra commits**: If you've pushed commits to a Dependabot branch and want Dependabot to rebase over them, include `[dependabot skip]` in your commit message.
- **Persistent ignores**: Ignore commands via PR comments are stored centrally. For transparency in team repos, prefer using `ignore` in `dependabot.yml` instead.
- **Reopening**: Reopening a closed Dependabot PR reverses any associated `ignore` commands.
- **Grouped commands**: When using `@dependabot unignore`, Dependabot closes the current PR and opens a fresh one with the updated dependency set.
