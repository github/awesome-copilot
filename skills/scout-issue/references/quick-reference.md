# Issue Scout Quick Reference

## Commands

| Command | Description |
|---------|-------------|
| `/scout` | Start issue discovery |
| `/scout rust` | Start with language filter |
| `/scout beginner` | Start with difficulty filter |
| `Investigate #NNN` | Deep dive into specific issue |
| `Plan this issue` | Get implementation plan |
| `How should I approach this?` | Get approach advice |
| `/cancel` | Abort the current pipeline and return to normal chat mode |
| `/scout` (again) | Restart the pipeline from Phase 1, discarding previous progress |
| `Start working on this` | Begin the planned implementation |

## Pipeline Flow

```
/scout command detected
    ↓
Phase 1: User Interrogation
    ↓
Phase 2: Issue Detection
    ↓
Phase 3: Issue Analysis & Ranking
    ↓
Phase 4: Output Formatting
    ↓
Display to User
```

## User Interrogation Questions

1. **Experience Level**
   - First-time contributor
   - Some familiarity
   - Experienced with the codebase

2. **Technical Skills**
   - JavaScript/TypeScript
   - Python
   - Rust
   - Go
   - Java/Kotlin
   - C/C++
   - Ruby
   - Other

3. **Time Availability**
   - Quick fix (< 2 hours)
   - Weekend project (4-8 hours)
   - Week-long (20-40 hours)
   - Longer contribution (40+ hours)

4. **Contribution Type**
   - Bug fix
   - New feature
   - Documentation
   - Tests
   - Performance improvement
   - Code refactoring
   - Any suitable issue

5. **Difficulty Preference**
   - Beginner-friendly (good first issue) — label is a hunting hint only; verify difficulty from the issue body and code
   - Intermediate
   - Advanced
   - Any difficulty

6. **Special Requirements**
   - No active PRs (unclaimed work only)
   - Must have reproduction case
   - Must have clear acceptance criteria
   - Avoid compiler/core subsystem
   - Other

## Scoring Dimensions

1. **User Fit** - Matches user preferences
2. **Technical Fit** - Matches tech stack
3. **Scope Fit** - Matches time constraints
4. **Difficulty Fit** - Matches skill level
5. **Issue Quality** - Well-defined problem
6. **Activity** - Active maintenance
7. **Contribution Feasibility** - Realistic to complete
8. **Evidence Quality** - Strong supporting evidence

## GitHub CLI Commands

```bash
# List open issues
gh issue list --state open

# Filter by label
gh issue list --label "bug" --state open

# View specific issue
gh issue view 1234

# Check for linked PRs (PRs that reference this issue)
gh api "repos/$(gh repo view --json nameWithOwner --jq .nameWithOwner)/issues/1234/timeline" --paginate --jq '[.[] | select(.event == "cross-referenced" and .source.issue.pull_request != null) | .source.issue.number]'

# List PRs
gh pr list --state open

# View PR details
gh pr view 5678
```

## Git Commands

```bash
# Recent activity
git log --oneline -20

# Search code
rg "pattern" src/

# Find files
find . -name "*.ts" -type f

# Check blame
git blame src/file.ts
```

## Confidence Levels

- **High**: Strong evidence, clear path, active support
- **Medium**: Good evidence, achievable, some unknowns
- **Low**: Weak evidence, significant unknowns

## Output Format

```
🔍 ISSUE SCOUT RESULTS

Found X strong candidates from Y open issues.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. #NNNN — [TITLE]
   📊 Match: NN/100
   🎯 Difficulty: [LEVEL]
   ⏱️ Estimated scope: [N] hours

   ✅ Why it matches:
   • [Evidence point 1]
   • [Evidence point 2]
   • [Evidence point 3]

   ⚠️ Concerns:
   • [Concern 1]
   • [Concern 2]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 BEST MATCH: #[NUMBER]

[One sentence recommendation]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Want me to investigate any of these issues in detail?
   Say: "Investigate #[NUMBER]"
```

## Key Rules

1. Evidence ≠ Inference
2. Don't rank by title match alone
3. Check linked PRs
4. Check recent activity
5. Explain recommendations
6. Explain rejections
7. Never invent facts
8. Read-only by default

## Investigation Checklist

- [ ] Full description read
- [ ] Comments reviewed
- [ ] Linked PRs checked
- [ ] Code locations identified
- [ ] Tests located
- [ ] Complexity assessed
- [ ] Evidence documented