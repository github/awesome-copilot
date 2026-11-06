# Tool Usage Patterns

## GitHub CLI Patterns

### List Issues
```bash
# All open issues
gh issue list --state open --limit 100

# Filter by label (hint only — verify difficulty in Phase 3, never trust labels alone)
gh issue list --state open --label "bug" --limit 50
gh issue list --state open --label "good first issue" --limit 50
gh issue list --state open --label "help-wanted" --limit 50

# Filter by language (if repo uses language labels)
gh issue list --state open --label "rust" --limit 50
gh issue list --state open --label "javascript" --limit 50

# Sort by activity. Always pass --repo; gh search issues searches all of
# GitHub when the repository is omitted.
gh search issues --repo OWNER/REPO --state open --sort updated --limit 50

# Search by text
gh issue list --state open --search "memory leak" --limit 50
```

### View Issues
```bash
# Basic view
gh issue view 1234

# With comments
gh issue view 1234 --comments

# JSON format for parsing
gh issue view 1234 --json title,body,labels,assignees

# Check for open linked PRs (only open PRs count as competing work)
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
gh api "repos/$repo/issues/1234/timeline" --paginate --jq '[.[] | select(.event == "cross-referenced") | select(.source.issue.pull_request != null) | select(.source.issue.state == "open") | .source.issue.number]'
```

### List PRs
```bash
# All open PRs
gh pr list --state open --limit 50

# PRs targeting specific branch
gh pr list --state open --base main --limit 50

# PRs by author
gh pr list --state open --author username --limit 50
```

### View PRs
```bash
# Basic view
gh pr view 5678

# View PR files changed
gh pr diff --name-only 5678

# Check if PR is linked to issue (body references like "Fixes #1234")
gh pr view 5678 --json body | grep -iE "(Fixes|Closes|Resolves)[[:space:]]+#"
```

### Search Code
```bash
# Search for function
gh search code "function_name" --repo owner/repo

# Search for file
gh search code "filename:config.ts" --repo owner/repo
```

## Git Patterns

### Recent Activity
```bash
# Last 20 commits
git log --oneline -20

# Commits in last week
git log --oneline --since="1 week ago"

# Commits by specific author
git log --oneline --author="username" -10

# Commits touching specific file
git log --oneline -10 -- path/to/file
```

### Code Search
```bash
# Search for pattern in code
rg "pattern" src/
rg -i "pattern" src/  # case insensitive

# Search in specific file type
rg "pattern" -g "*.ts" src/
rg "pattern" -g "*.rs" src/

# Search with context
rg -C 3 "pattern" src/  # 3 lines before/after
```

### File Operations
```bash
# Find files by name
find . -name "*.ts" -type f
find . -name "*test*" -type f

# Find files by content
grep -r "function_name" src/
grep -l "TODO" src/**/*.ts

# Check file structure
tree -L 2 -I 'node_modules'
ls -la src/
```

### Blame and History
```bash
# Who changed what
git blame path/to/file

# History of specific function
git log -p -S "function_name" -- path/to/file

# Diff between commits
git diff abc123..def456
```

## Combined Patterns

### Investigate Issue
```bash
# Get issue details
gh issue view 1234 --comments

# Find related code
rg "relevant_function" src/

# Check if tests exist
find . -name "*test*" -type f | xargs grep -l "relevant_function"

# Check recent changes to relevant files
git log --oneline -5 -- path/to/file
```

### Check Issue Activity
```bash
# Get issue timeline (open linked PRs referencing this issue)
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
gh api "repos/$repo/issues/1234/timeline" --paginate --jq '[.[] | select(.event == "cross-referenced") | select(.source.issue.pull_request != null) | select(.source.issue.state == "open") | .source.issue.number]'
# Note: `gh issue view --json timelineItems/linkedPRs` is not supported; the CLI
# exposes a fixed set of REST fields, so linked-PR detection uses the timeline API.

# Check maintainer activity
gh issue view 1234 --json comments | jq '.comments[].author.login'
```

### Validate Contribution Feasibility
```bash
# Check if issue is assigned
gh issue view 1234 --json assignees

# Check if PR exists (search titles AND bodies for a reference to this issue)
gh pr list --state open --search "1234 in:title"
gh pr list --state open --search "Fixes #1234"

# Check test coverage
find . -name "*test*" -type f | wc -l

# Check documentation
cat CONTRIBUTING.md 2>/dev/null | head -50
```

## Error Handling

### When gh CLI is not available
```bash
# Fallback to git
git remote -v  # Get repo URL
git log --oneline -20  # Recent activity
```

### When authentication fails
```bash
# Check auth status
gh auth status

# Provide instructions
echo "Please run: gh auth login"
```

### When rate limited
```bash
# Check rate limit
gh api rate_limit

# Use git instead
git log --oneline -20
```