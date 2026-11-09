# Recovery and Fallbacks

Use these paths when the pipeline cannot continue normally. Always explain the
limitation instead of pretending a tool or data source exists.

## User Cancels

If the user types `/cancel` or says "cancel" during any phase:

1. Stop the pipeline immediately.
2. Acknowledge the cancellation.
3. Return to normal chat mode.

## User Restarts

If the user types `/scout-issue` again during the process:

1. Restart from Phase 1.
2. Ask the questions again.
3. Discard any previous progress.

## Missing Tools

If GitHub CLI is not available:

```bash
which gh
echo "GitHub CLI not available. Using git log for activity analysis."
git log --oneline -20
```

Use git history and web search as fallbacks, reduce the scope of the search, and
state which checks could not be completed. Do not claim that linked PRs or
maintainer activity were verified when they were not.

## GitHub CLI Not Authenticated

```bash
gh auth status
```

If not authenticated, explain what is limited:

- Local repository inspection still works.
- Issue text may be available through web search.
- Linked PRs and maintainer activity cannot be verified through the API.

If the user can authenticate, ask them to run `gh auth login` and resume.

## Rate Limiting

```bash
gh api rate_limit
```

If the API is rate-limited:

- Use git history for recent activity.
- Reduce the number of issues investigated.
- Prefer one batched REST page over many per-issue calls.
- Tell the user which evidence is missing.

## No Issues Found

If no suitable issues are found:

- Explain which constraints are binding.
- Suggest relaxing one constraint at a time.
- Offer alternative approaches, such as a different contribution type or a
  nearby subsystem.
- Never lower the evidence bar to fill the shortlist.

## Limited Repository Information

When the repository is not available locally:

- Work with the issue text and API data that is available.
- Note confidence limitations.
- Suggest manual verification for code locations and tests.
- Prefer issues whose body already points to specific files or subsystems.
