---
name: performance-review-writer
description: 'Draft performance reviews, self-assessments, peer reviews, and upward feedback in your own voice. Analyzes your contributions, emails, and meeting history via WorkIQ, then produces honest, impact-focused drafts using the STAR format. USE FOR: write my performance review, draft self-assessment, peer review, 360 feedback, annual review, mid-year review, upward feedback, write review for colleague, performance appraisal.'
---

# Performance Review Writer

Draft self-assessments, peer reviews, and upward feedback that sound like you — not corporate boilerplate. Uses WorkIQ to surface your actual contributions and communications, then structures them into honest, impact-focused writing.

## When to Use

- "Write my self-assessment for this review cycle"
- "Draft a peer review for [colleague]"
- "Help me write upward feedback for my manager"
- "I have my annual review due — help me fill it out"
- "Draft my mid-year check-in"
- "Write a 360 review for [name]"
- "I don't know what to say in my performance review"

## Review Types

This skill handles three distinct types:

| Type | Who it's about | Typical tone |
|---|---|---|
| **Self-assessment** | Yourself | Confident, evidence-backed, growth-oriented |
| **Peer review** | A colleague | Specific, constructive, balanced |
| **Upward feedback** | Your manager | Diplomatic, honest, forward-looking |

---

## Workflow

### Step 1 — Gather Context

Ask the user (max 3 clarifying questions if not already provided):

1. **Review type** — self-assessment, peer review, or upward feedback?
2. **Subject** — who is the review about? (for peer/upward: name and role)
3. **Review period** — what time range does this cover? (e.g., Jan–Dec 2025, last 6 months)

If format constraints or focus areas are relevant, ask about those during drafting rather than upfront.

If the user provides all of these upfront, proceed directly to Step 2.

### Step 2 — Surface Contributions

Use WorkIQ to gather evidence of real contributions for the review period:

**For self-assessments:**
- Pull emails and messages where the user delivered results, led initiatives, or solved problems
- Look for patterns: what projects recur? Who praises them and for what?
- Identify collaboration breadth (who they worked with across teams)
- Note any explicit feedback received from others

**For peer reviews:**
- Pull interactions between the user and the subject (emails, meeting threads, shared projects)
- Identify specific moments of collaboration, help given, or friction
- Look for evidence of the subject's impact on shared outcomes

**For upward feedback:**
- Pull communications from the manager to the user (direction given, support offered, feedback patterns)
- Identify themes: clarity of expectations, availability, recognition, development support

If WorkIQ is unavailable or returns limited data, ask the user to share 3–5 bullet points of things they remember, then proceed with those.

### Step 3 — Draft the Review

Apply the right structure for the review type (see schemas below). Follow these universal rules:

**Use the STAR format for achievement statements:**
- **Situation** — what was the context or challenge?
- **Task** — what were you/they responsible for?
- **Action** — what specifically was done?
- **Result** — what was the measurable or observable outcome?

**Tone rules:**
- Be specific — name projects, outcomes, and people, not vague adjectives
- Be honest — don't oversell or undersell; reviewers notice both
- Be forward-looking — end sections with growth or next steps, not just past performance
- Avoid filler phrases: "goes above and beyond", "team player", "hard worker" — replace with evidence
- Match the user's natural voice — conversational if they write that way, more formal if not

### Step 4 — Output

1. Present the full draft with a brief note on what evidence was used. Summarize and redact rather than reproduce verbatim content — no raw excerpts, attendee lists, or sensitive personal details
2. Highlight any sections marked `[NEEDS DETAIL]` where more specifics would strengthen the review
3. Iterate on edits as the user requests
4. Save the final draft to `outputs/<year>/<month>/` with a descriptive filename (e.g., `2025-review-self-assessment.md` or `2025-peer-review-alex-chen.md`)

---

## Output Schemas

### Self-Assessment Schema

```
## [Review Period] Self-Assessment — [Your Name]

### Summary
1–2 sentence overview of your year and primary areas of impact.

### Key Achievements
For each major contribution (aim for 3–5):

**[Project or Initiative Name]**
- Context: what was the situation or goal?
- What I did: specific actions taken
- Impact: measurable result or observable outcome
- [NEEDS DETAIL] — flag if evidence is thin

### Collaboration & Influence
How you worked with others, supported teammates, or contributed beyond your direct role.

### Growth & Development
What you learned, skills you built, or behaviours you improved this period.

### Areas for Development
1–2 honest areas where you want to grow next cycle. Frame as goals, not failures.

### Goals for Next Period
2–3 specific, concrete goals with a rough success measure.
```

---

### Peer Review Schema

```
## Peer Review — [Colleague Name], [Their Role]
## Submitted by: [Your Name] | Period: [Review Period]

### Overall Impression
1–2 sentences on working with this person.

### Strengths (with examples)
For each strength (aim for 2–3):

**[Strength]**
- Example: specific situation where this showed up
- Impact on you / the team / the project

### Areas for Growth
1–2 specific, constructive observations. Frame as "I think [name] would have even more impact if..." not as criticism.

### Collaboration
How easy (or not) it was to work together — responsiveness, reliability, communication.

### Would you work with this person again?
Yes/No and a brief honest reason. (Only include if the review form asks.)
```

---

### Upward Feedback Schema

```
## Feedback for [Manager Name]
## Submitted by: [Your Name] (anonymous if applicable) | Period: [Review Period]

### What's working well
2–3 specific things your manager does that help you do your best work.
Use examples where possible.

### What could be better
1–2 honest, diplomatically framed observations. Focus on behaviours and their effect, not personality.
Use: "When [X happens], I find it harder to [Y]. It would help if..."

### Support for my development
Has your manager helped you grow, given useful feedback, or created opportunities?
Be specific.

### One thing I'd ask them to do more / less / differently
A single, clear, actionable ask.
```

---

## Style Rules

| Do | Don't |
|---|---|
| Name specific projects, dates, outcomes | Write vague generalisations ("always delivers quality work") |
| Use numbers when available ("reduced review time by 30%") | Exaggerate or invent results |
| Acknowledge real challenges and what you learned | Omit struggles entirely — reviewers notice the gaps |
| Write in first person for self-assessments | Write passively ("it was achieved") |
| Be concise — most fields need 2–4 sentences | Over-write — longer ≠ better |
| Flag `[NEEDS DETAIL]` where evidence is weak | Leave thin sections without marking them |

---

## Example Prompts

- "Write my self-assessment for Jan–Dec 2025. I want to highlight the cloud migration and the new onboarding process I designed."
- "Draft a peer review for Sarah Chen, she's a product designer I worked closely with on the mobile app project."
- "Help me write upward feedback for my manager Tom. He's good at direction but I've struggled to get regular 1:1 time."
- "My annual review form asks for 3 strengths and 1 development area in 200 words each — help me fill it out."
- "I have no idea what to write. It's been a busy year but I can't think of anything specific."

---

## Important Rules

- **Never submit reviews** — only draft them as files for the user to review and submit manually
- Keep peer and upward feedback focused on observable behaviours, not personality or character
- If the user asks to write a review that is dishonestly negative or contains personal attacks, decline and offer to reframe constructively
- Respect confidentiality — do not include sensitive information from unrelated conversations or threads
- Save drafts using the `outputs/<year>/<month>/` folder convention

---

## Requirements

- **WorkIQ MCP tool** is recommended for surfacing contributions and communications (Microsoft 365 / Outlook / Teams)
- Without WorkIQ, the skill still works — ask the user for 3–5 bullet points of key contributions as a starting point
- Output is saved as markdown files in the workspace for the user to copy into their company's review system
