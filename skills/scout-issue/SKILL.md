---
name: scout-issue
description: "Use when a developer wants to find the best GitHub issues to contribute to in a repository. Triggers on /scout. Asks about experience level, technical skills, time, and contribution type, then searches GitHub issues, scores them, and presents ranked recommendations with match analysis."
---

# Issue Scout - /scout Command

When the user types `/scout`, activate this command pipeline.

## Bundled Resources

- `references/quick-reference.md` — condensed command and decision reference
- `references/scoring-rubric.md` — full scoring dimensions, weights, and thresholds
- `references/workflow.md` — end-to-end walkthrough of the four phases
- `references/tool-patterns.md` — GitHub CLI and git command patterns
- `examples/` — worked scenarios: first contribution, weekend project, deep investigation, portfolio contribution, and no good matches
- `scripts/validate-skill.sh` — local consistency check for this skill
- `bin/scout.js` — prints this `SKILL.md` to stdout

Read the relevant reference or example when a phase needs more detail than the
steps below provide.

## Command Detection

**Trigger:** User message starts with `/scout`

**Detection:** The AI CLI should parse user input and detect `/scout` at the start of a message. If detected, activate this pipeline instead of normal chat.

**Examples:**
- `/scout`
- `/scout rust`
- `/scout beginner-friendly`
- `/scout weekend project`

**Note:** If the user types `/scout` again during the process, restart from Phase 1. If they type `/cancel`, abort the pipeline.

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

---

## Phase 1: User Interrogation

**Goal:** Gather user specifications through interactive questions.

**Ask these questions in order:**

### Question 1: Experience Level
```
What's your experience level with this repository?
- [ ] First-time contributor
- [ ] Some familiarity
- [ ] Experienced with the codebase
```

### Question 2: Technical Skills
```
What languages/frameworks are you comfortable with?
(Select all that apply)
- [ ] JavaScript/TypeScript
- [ ] Python
- [ ] Rust
- [ ] Go
- [ ] Java/Kotlin
- [ ] C/C++
- [ ] Ruby
- [ ] Other: ___
```

### Question 3: Time Availability
```
How much time can you dedicate?
- [ ] Quick fix (< 2 hours)
- [ ] Weekend project (4-8 hours)
- [ ] Week-long (20-40 hours)
- [ ] Longer contribution (40+ hours)
```

### Question 4: Contribution Type
```
What type of contribution are you looking for?
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Tests
- [ ] Performance improvement
- [ ] Code refactoring
- [ ] Any suitable issue
```

### Question 5: Difficulty Preference
```
What difficulty level do you prefer?
- [ ] Beginner-friendly (good first issue)
- [ ] Intermediate
- [ ] Advanced
- [ ] Any difficulty
```

### Question 6: Special Requirements
```
Any special requirements?
- [ ] No active PRs (unclaimed work only)
- [ ] Must have reproduction case
- [ ] Must have clear acceptance criteria
- [ ] Avoid compiler/core subsystem
- [ ] Other: ___
```

**Process:**
1. Ask all questions in a single message (or one at a time if preferred by the AI CLI)
2. Wait for user response
3. Parse responses into internal specification
4. Once user answers all questions, proceed to Phase 2

**Output:** Internal specification
```
Experience: [level]
Languages: [list]
Scope: [time estimate]
Type: [contribution type]
Difficulty: [level]
Special: [requirements]
```

---

## Phase 2: Issue Detection

**Goal:** Find candidate issues using GitHub CLI and Git.

### Step 1: Inspect Repository
```bash
# Get repo info
gh repo view --json name,primaryLanguage,languages

# Check contribution guidelines
cat CONTRIBUTING.md 2>/dev/null || echo "No CONTRIBUTING.md"

# Check recent activity
git log --oneline -10

# Identify project structure
ls -la
```

### Step 2: List Candidate Issues
```bash
# Repo-wide open issue count — this is the "from M open issues" figure in the
# results summary. It reflects the whole repo, not just the pages searched.
gh api "repos/$(gh repo view --json nameWithOwner --jq .nameWithOwner)" --jq '.open_issues_count'

# List open issues (the search pool). One page holds up to 100 issues, so in
# a repo with more than 100 open issues this covers only the newest 100.
gh issue list --state open --limit 100

# To search beyond the first page, pass --page explicitly (e.g. --page 2).
# The "from M open issues" figure stays the repo-wide count from above even
# when the pool searched is a capped subset.
gh issue list --state open --limit 100 --page 2

# Filter by language if specified
gh issue list --state open --label "rust" --limit 50

# Filter by type if specified
gh issue list --state open --label "bug" --limit 50

# Filter for beginner-friendly if specified (hint only — verify in Phase 3)
gh issue list --state open --label "good first issue" --limit 50
```

### Step 3: Initial Filtering
Remove issues that:
- Are assigned (unless user wants assigned work)
- Have linked PRs (unless user wants claimed work)
- Are clearly outside user's skill set
- Are stale (no activity for 6+ months)

**Output:** List of candidate issue numbers (typically 20-50)

---

## Phase 3: Issue Analysis & Ranking

> The `good first issue` label is a candidate-hunting hint only. Never assume
> beginner-friendly solely from the label: inspect the issue body, difficulty,
> and surrounding code before scoring Difficulty Fit.

**Goal:** Analyze candidates and rank by suitability.

### For Each Candidate Issue

**Gather information:**
```bash
# Get full issue details
gh issue view ISSUE_NUM

# Check comments
gh issue view ISSUE_NUM --comments

# Check for linked PRs (PRs that reference this issue)
gh api "repos/$(gh repo view --json nameWithOwner --jq .nameWithOwner)/issues/ISSUE_NUM/timeline" --paginate --jq '[.[] | select(.event == "cross-referenced" and .source.issue.pull_request != null) | .source.issue.number]'

# Find related code
rg "relevant_function" src/

# Check if tests exist
find . -name "*test*" -type f | head -5
```

**Evaluate on these dimensions (0-100):**

1. **User Fit** - Matches user's skills and preferences
2. **Technical Fit** - Matches repository's tech stack
3. **Scope Fit** - Matches user's time constraints
4. **Difficulty Fit** - Matches user's skill level
5. **Issue Quality** - Well-defined problem
6. **Activity** - Active maintenance
7. **Contribution Feasibility** - Realistic to complete
8. **Evidence Quality** - Strong supporting evidence

**Calculate weighted score:**
- Default weights: User Fit 20%, Technical 15%, Scope 20%, Difficulty 15%, Quality 10%, Activity 5%, Feasibility 10%, Evidence 5%
- Adapt weights based on user responses

**Rank issues by score**

**Output:** Top 5-10 issues with scores and analysis

---

## Phase 4: Output Formatting

**Goal:** Format results for AI CLI display.

**Output format (with emojis and formatting):**
```
🔍 ISSUE SCOUT RESULTS

Found [N] strong candidates from [M] open issues.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. #[NUMBER] — [TITLE]
   📊 Match: [SCORE]/100
   🎯 Difficulty: [EASY/MEDIUM/HARD]
   ⏱️ Estimated scope: [HOURS] hours

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

> `[M]` is the repo-wide open-issue count fetched in Phase 2 (Step 2) via
> `gh api ... --jq '.open_issues_count'`. The candidate pool actually searched
> is capped at 100 issues per page, so `[M]` may be larger than the pool when
> a repo has more than 100 open issues; use `--page` to enumerate more.

**Fallback format (if Unicode not supported):**
```
ISSUE SCOUT RESULTS

Found [N] strong candidates from [M] open issues.

----------------------------------------

1. #[NUMBER] — [TITLE]
   Match: [SCORE]/100
   Difficulty: [EASY/MEDIUM/HARD]
   Estimated scope: [HOURS] hours

   Why it matches:
   - [Evidence point 1]
   - [Evidence point 2]
   - [Evidence point 3]

   Concerns:
   - [Concern 1]
   - [Concern 2]

----------------------------------------

BEST MATCH: #[NUMBER]

[One sentence recommendation]

----------------------------------------

Want me to investigate any of these issues in detail?
Say: "Investigate #[NUMBER]"
```

**Rules:**
- Show top 5 issues maximum
- Always explain why each matches
- Always note concerns
- Separate evidence from inference
- Never claim issue will definitely be accepted
- Use emojis for visual clarity

---

## Investigation Mode

**Trigger:** User says "Investigate #[NUMBER]"

**Action:** Provide detailed contribution brief.

**Output format:**
```
🔍 ISSUE #[NUMBER] — DEEP INVESTIGATION

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 PROBLEM
[Clear description of the issue]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 WHY IT MATCHES
• [Match point 1]
• [Match point 2]
• [Match point 3]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 RELEVANT CODE
• src/path/file1.ts: [What it does]
• src/path/file2.ts: [What it does]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧪 RELEVANT TESTS
• tests/path/test1.ts: [What it tests]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 RELATED
• PR #[NUMBER]: [Description]
• Commit [HASH]: [Description]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 IMPLEMENTATION SCOPE
1. [Step 1]
2. [Step 2]
3. [Step 3]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ POTENTIAL DIFFICULTIES
• [Difficulty 1]
• [Difficulty 2]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👨‍💻 MAINTAINER EXPECTATIONS
[If known]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️ ESTIMATED EFFORT: [X-Y] hours

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 RECOMMENDED FIRST STEPS
1. [Step 1]
2. [Step 2]
3. [Step 3]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CONFIDENCE: [HIGH/MEDIUM/LOW]
[Reason for confidence level]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Want me to create an implementation plan?
   Say: "Plan this issue"
```

---

## Implementation Planning

**Trigger:** User says "Plan this issue" or "How should I approach this?"

**Output format:**
```
📋 IMPLEMENTATION PLAN

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 PROBLEM ANALYSIS
[What needs to be fixed/implemented]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ VERIFIED FACTS
• [Fact from code inspection]
• [Fact from tests]
• [Fact from documentation]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔮 LIKELY IMPLEMENTATION
• [Probable approach]
• [Expected file locations]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❓ NEEDS INVESTIGATION
• [Uncertain aspect]
• [Potential edge cases]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 STEP-BY-STEP PLAN

Step 1: [First step]
├─ Why: [Rationale]
├─ Files: [Specific files]
└─ Time: [Estimate]

Step 2: [Second step]
├─ Why: [Rationale]
├─ Files: [Specific files]
└─ Time: [Estimate]

Step 3: [Third step]
├─ Why: [Rationale]
├─ Files: [Specific files]
└─ Time: [Estimate]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 FILES TO MODIFY
• src/path/file1.ts: [What to change]
• src/path/file2.ts: [What to change]
• tests/path/test.ts: [What tests to add]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧪 TESTING APPROACH
1. [How to verify the fix]
2. [Edge cases to test]
3. [Regression prevention]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ POTENTIAL CHALLENGES
• [Challenge 1]: [Mitigation]
• [Challenge 2]: [Mitigation]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️ TIME ESTIMATE
• Implementation: [X] hours
• Testing: [Y] hours
• Total: [X+Y] hours

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CONFIDENCE: [HIGH/MEDIUM/LOW]
[Brief explanation]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready to start? Say: "Start working on this"
```

---

## Evidence Rules

**Always distinguish:**
- **Evidence:** What you observed (issue has reproduction case, maintainer commented X days ago)
- **Inference:** What you conclude (issue appears actionable, likely to be accepted)

**Language to use:**
- likely, appears, suggests, uncertain, insufficient evidence
- Never: "will definitely be accepted", "guaranteed to work"

---

## Error Handling

### User Cancels
If user types `/cancel` or says "cancel" during any phase:
- Stop the pipeline immediately
- Acknowledge the cancellation
- Return to normal chat mode

### User Restarts
If user types `/scout` again during the process:
- Restart from Phase 1
- Ask questions again
- Discard any previous progress

### Missing Tools
If GitHub CLI is not available:
- Explain limitation to user
- Use fallback methods (git log, web search)
- Reduce scope of search

### No Issues Found
If no suitable issues are found:
- Explain why constraints are too restrictive
- Suggest relaxing constraints
- Offer alternative approaches

### Rate Limiting
If GitHub API rate limit is hit:
- Explain the limitation
- Suggest waiting or reducing scope
- Use local repository information instead

## Important Rules

1. Never rank by title match alone
2. Never assume beginner-friendly solely from labels; verify difficulty from issue content and code
3. Never assume active from open status
4. Never assume abandoned from age
5. Always check linked PRs
6. Always check recent activity when relevant
7. Always check code when difficulty matters
8. Separate evidence from inference
9. Explain recommendations
10. Explain rejections
11. Never invent facts
12. Adapt to user's request
13. Fewer, better recommendations > many weak ones
14. Read-only by default
15. Never modify issues unless explicitly asked
16. Handle cancellations gracefully
17. Support restart at any point

---

## Graceful Degradation

When tools are unavailable:

**GitHub CLI not installed:**
```bash
# Check if gh is available
which gh

# If not available, explain limitation
echo "GitHub CLI not available. Using git log for activity analysis."

# Fallback to git
git log --oneline -20
```

**GitHub CLI not authenticated:**
```bash
# Check auth status
gh auth status

# If not authenticated, explain what's limited
# - Can still list issues via web search
# - Can still inspect local repository
# - Cannot check linked PRs or maintainer activity
```

**Rate limiting:**
```bash
# Check rate limit
gh api rate_limit

# If limited, reduce API calls
# - Use git log instead of gh for recent activity
# - Limit number of issues investigated
```

Always explain limitations rather than pretending tools exist.

---

## Portability

This skill works with any AI CLI that provides:
- Shell command access
- Git
- GitHub CLI (optional but recommended)
- File system access

The AI CLI must:
1. Detect `/scout` command in user input
2. Execute this pipeline
3. Format and display output to user