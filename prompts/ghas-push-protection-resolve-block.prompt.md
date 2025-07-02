---
mode: "agent"
tools: ["changes", "codebase", "editFiles", "problems", "terminal"]
description: "Help developers resolve GitHub Advanced Security push protection blocked pushes containing secrets"
---

Your goal is to help me resolve a blocked push that was prevented by GitHub Advanced Security push protection due to detected secrets in my commits. You should automatically analyze the CLI output, detect the blocked push information, and guide me through the proper resolution strategy.

## Automated Analysis and Strategy Selection

You will automatically:

1. **Gather context** by running diagnostic commands and parsing terminal output
2. **Extract key information** from the push protection error:
   - Commit IDs and file paths where secrets were detected
   - Secret types (API keys, tokens, etc.) from error headers
   - Chronological order of affected commits
3. **Select optimal resolution strategy** based on commit analysis and recommendations detailed in GitHub Documentation:
    - Resolving a blocked push: https://docs.github.com/en/code-security/secret-scanning/working-with-secret-scanning-and-push-protection/working-with-push-protection-from-the-command-line#resolving-a-blocked-push
4. **Execute the resolution** with real-time validation, and if any manual intervention following a command in the CLI is expected of the user, I will inform them of this before I execute the command, with a recommendation of what they will need to do (such as entering ":q")

### Error Pattern Recognition
You will parse patterns like:
```
remote:   —— GitHub Personal Access Token ——————————————————————
remote:      - commit: 8728dbe67
remote:        path: README.md:4
```

## Resolution Strategies

You will automatically choose and execute the appropriate strategy:

### Latest Commit Only
```bash
# Remove secret from code, then:
git add .
git commit --amend --no-edit
git push
```

### Earlier Commits
```bash
# Find earliest problematic commit and rebase:
git rebase -i <EARLIEST_COMMIT>~1
# When using interactive rebase to squash commits containing secrets, you will provide automated sed commands to modify the rebase TODO file without user manual intervention.
```

### Multiple Commits
Plan comprehensive rebase strategy addressing all detected commit IDs.

## Secret Removal Best Practices

- **Remove the actual secret**: Replace API keys, tokens, passwords, or other sensitive data with placeholders or environment variables
- **Use environment variables**: Move secrets to environment variables or secure configuration files
- **Update .gitignore**: Add patterns to prevent similar files from being committed in the future

## Automated Error Handling

You will handle common scenarios:
- **Merge conflicts** during rebase (identify conflicted files, guide resolution)
- **Large repositories** (optimize commands for performance)
- **Branch protection rules** (check for restrictions that might affect resolution)

## Smart Bypass Assessment

If patterns suggest false positives, you will analyze for:
- Test data patterns ("test_api_key", "fake_token")
- Placeholder values ("YOUR_API_KEY_HERE")
- Example/documentation code

You will extract bypass URLs from error messages and recommend appropriate reasons:
- "It's used in tests" - for harmless test secrets
- "It's a false positive" - for non-secrets
- "I'll fix it later" - for real secrets to be addressed soon

## Post-Resolution Verification

After resolving, you will automatically:
1. **Verify secret removal** using pattern matching and Git history checks
2. **Test push capability** with `git push --dry-run`
3. **Suggest prevention measures** (pre-commit hooks, .gitignore updates)

**Goal**: Maintain security while enabling productive development. Always prioritize removing real secrets over bypassing protection.
