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
- Apply broad filters (open; add "not assigned" only when the user requested
  unclaimed work)
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
- Eliminate assigned issues only when the user wants unclaimed work
- Exclude open competing PRs only when the user wants unclaimed work; record
  them as evidence otherwise
- Filter out explicit constraint violations
- Keep inactive issues unless there is evidence of obsolescence or the user set
  a recency constraint

**Output:** Reduced candidate pool

**Filters:**
- Status: Open, not closed
- Assignment: Unassigned only when requested
- PR links: No open competing PR only when requested; closed PRs are evidence
- Recency: No automatic stale exclusion; inactivity lowers Activity evidence
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

### When to Reduce Candidates (not skip checks)
- **Reduce candidate pool** if user provides full context (still inspect for evidence)
- **Reduce candidates investigated** if pool is small (<20) — apply full checks to all
- **Focus deep investigation** on top 3-5 from quick scan — still verify eligibility for each

### When to Iterate
- **Re-prioritize** if user clarifies constraints
- **Expand search** if initial pool is insufficient
- **Deepen investigation** if user requests specific issue

### When to Stop
- **Sufficient candidates** found (3-5 strong matches) after full eligibility checks
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

## Scout-Specific Decisions

Before presenting, run the investigation checklist in `quick-reference.md`.
Evidence and honesty rules live in `SKILL.md`; the decisions below are
specific to scouting.

### Linked-PR Evidence Unavailable for Unclaimed Work
If auth, rate limits, or the timeline API prevent checking linked PRs:
- Do not call the issue unclaimed.
- Mark the competing-work gate **unverified**, lower Confidence, and prefer
  candidates whose status was verified.
- If no verified candidate remains, present the best unverified option with an
  explicit warning and the manual linked-PR check from `quick-reference.md`.

### Issue State Changed Mid-Run
Re-check state immediately before presenting. If an issue closed, became
assigned, or gained an open linked PR:
- Drop it when the change violates a hard constraint.
- Otherwise keep it and record the change as updated evidence.

### Constraints Eliminate Every Candidate
Name the constraint that removes the most candidates and offer one concrete
relaxation. Do not silently drop a hard constraint to produce a match.

### Code or Test Evidence Missing
Keep the candidate but lower Technical Fit and Evidence Quality. State what
could not be verified and point to the manual check, rather than inferring
difficulty from the title.
