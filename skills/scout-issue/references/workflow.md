# Issue Scout Workflow

## High-Level Flow

```
User Request
    ↓
Parse Intent → Internal Specification
    ↓
Inspect Repository → Understand Context
    ↓
Discover Issues → Candidate Pool
    ↓
Filter Obvious Bad Candidates → Reduced Pool
    ↓
Investigate Promising Candidates → Deep Analysis
    ↓
Score & Rank → Final Shortlist
    ↓
Present Results → User Decision
```

## Detailed Steps

### 1. Parse User Intent

**Input:** Natural language request

**Process:**
- Extract explicit constraints (languages, time, type)
- Infer implicit constraints (experience, preferences)
- Identify priorities (what matters most)
- Create internal specification

**Output:** Structured internal specification

**Example:**
```
"Find me a Rust issue I could finish this weekend"

→ Goal: Weekend project
→ Language: Rust
→ Scope: 4-8 hours
→ Preference: Clear requirements, reproducible bugs
→ Priority: Scope fit > Technical fit
```

### 2. Inspect Repository

**Input:** Repository context

**Process:**
- Identify primary language/framework
- Understand project structure
- Review contribution guidelines
- Check issue templates and labels
- Assess recent activity
- Identify testing infrastructure

**Output:** Repository understanding

**Key Questions:**
- What is this project?
- How is it organized?
- What are the contribution norms?
- What testing tools are used?
- How active is maintenance?

### 3. Discover Issues

**Input:** Repository and constraints

**Process:**
- Use GitHub CLI/API to list issues
- Apply broad filters (open, not assigned)
- Consider labels and milestones
- Start with high-potential categories

**Output:** Candidate issue pool

**Commands:**
```bash
gh issue list --state open --limit 100
gh issue list --label "bug" --state open
gh issue list --label "help-wanted" --state open
```

### 4. Filter Obvious Bad Candidates

**Input:** Candidate pool

**Process:**
- Remove closed/duplicate issues
- Eliminate assigned issues (if user wants unclaimed)
- Remove issues with active PRs (if applicable)
- Filter out explicit constraint violations
- Remove stale/obsolete issues

**Output:** Reduced candidate pool

**Filters:**
- Status: Open, not closed
- Assignment: Unassigned (if requested)
- PR links: None active (if requested)
- Constraints: Match user requirements

### 5. Investigate Promising Candidates

**Input:** Reduced pool

**Process:**
- Read full issue descriptions
- Examine comments and discussion
- Check linked PRs and commits
- Locate relevant code files
- Assess implementation complexity
- Verify evidence quality

**Output:** Deep analysis of each candidate

**Investigation Checklist:**
- [ ] Full description read
- [ ] Comments reviewed
- [ ] Linked PRs checked
- [ ] Code locations identified
- [ ] Tests located
- [ ] Complexity assessed
- [ ] Evidence documented

### 6. Score & Rank

**Input:** Deep analysis

**Process:**
- Apply scoring rubric
- Adapt weights to user priorities
- Calculate final scores
- Rank by score
- Identify best match

**Output:** Ranked shortlist with scores

**Scoring Dimensions:**
- User Fit
- Technical Fit
- Scope Fit
- Difficulty Fit
- Issue Quality
- Activity
- Contribution Feasibility
- Evidence Quality

### 7. Present Results

**Input:** Ranked shortlist

**Process:**
- Format concise output
- Explain why each issue matches
- Highlight concerns
- Provide clear recommendation
- Offer rejection reasoning for top rejected issues

**Output:** User-ready recommendation

**Format:**
- Top 3-5 issues with scores
- Clear "best match" recommendation
- Key evidence for each
- Important concerns noted

## Decision Points

### When to Skip Steps
- **Skip repository inspection** if user provides full context
- **Skip filtering** if candidate pool is small (<20)
- **Skip deep investigation** if quick scan reveals clear winners

### When to Iterate
- **Re-prioritize** if user clarifies constraints
- **Expand search** if initial pool is insufficient
- **Deepen investigation** if user requests specific issue

### When to Stop
- **Sufficient candidates** found (3-5 strong matches)
- **Time constraints** reached
- **User satisfaction** indicated

## Edge Cases

### No Good Matches Found
- Explain why constraints are too restrictive
- Suggest relaxing constraints
- Offer alternative approaches

### Too Many Good Matches
- Increase filtering strictness
- Prioritize highest-scoring
- Group by category

### Ambiguous User Request
- Ask clarifying questions
- Make reasonable assumptions
- Document assumptions made

### Limited Repository Information
- Work with available data
- Note confidence limitations
- Suggest manual verification

## Quality Checks

### Before Presenting
- [ ] All recommendations have evidence
- [ ] Scores are justified
- [ ] Concerns are documented
- [ ] Rejections are explained
- [ ] Confidence levels are accurate

### After Presenting
- [ ] User can understand reasoning
- [ ] Recommendations are actionable
- [ ] Next steps are clear
- [ ] Limitations are acknowledged