---
name: technical-job-search
description: 'Use this skill when a software engineer asks for help with job search tasks: parsing or analyzing a job description, tailoring a CV/resume, writing a cover letter, evaluating a job offer, or drafting a post-interview follow-up email. Do not activate for general career advice unrelated to an active job search action.'
license: MIT
argument-hint: 'Optional: the specific task — e.g. "analyze this JD", "tailor my CV", "write cover letter", "evaluate this offer"'
---

# Technical Job Search

Helps software engineers with discrete job search tasks: job description analysis, CV tailoring, cover letter writing, offer evaluation, and follow-up emails.

---

## Job Description Analysis

When given a job description, extract and structure:

**Must-haves** (explicitly required or repeated multiple times):
- Technical skills, years of experience, specific domain knowledge

**Nice-to-haves** (preferred, a bonus, or mentioned once):
- List these separately. Candidates often disqualify themselves over requirements that are actually optional.

**What the role actually solves** (inferred from the description):
- Summarize in 2-3 sentences what business problem this hire addresses

**Red flags to surface**:
- "Wear many hats" with no clarity on scope — risk of undefined ownership
- 10+ must-have technologies for a single role — unrealistic bar or poor team planning
- No mention of team size, tech stack, or what the role ships — may indicate disorganization

---

## CV / Resume Tailoring

When tailoring a CV to a specific job description:

1. **Match language exactly** — use the same terminology as the JD, not synonyms. If the JD says "distributed systems", do not write "large-scale systems".
2. **Lead with impact** — every bullet should have a result: "Reduced P99 latency by 40%" not "Worked on performance improvements".
3. **Quantify everything possible** — users, QPS, team size, cost saved, revenue impact.
4. **Cut what does not match** — a two-page CV tailored to the role beats a four-page generic one.
5. **Mirror the seniority signals** — entry roles want "built", senior roles want "designed", staff and principal roles want "drove" or "defined".

Do not keyword-stuff. Write for the hiring manager reading it, not for an ATS parser.

---

## Cover Letter Writing

A cover letter should answer three questions in under 300 words:

1. **Why this company?** Something specific — a product, a technical challenge they have written about, a problem space you care about. Not "I admire your mission."
2. **Why you?** One or two concrete things from your background that directly match what they need. Link to the specific role, not your full career history.
3. **Why now?** What is your motivation at this point in your career? One sentence.

Format: three short paragraphs. No preamble ("I am writing to apply for..."). No summary of your CV.

Avoid:
- Restating your CV in prose form
- "I am passionate about..."
- Generic company praise ("a leader in the industry", "innovative company")
- Going longer than one page

---

## Offer Evaluation

When evaluating a job offer, compare across these dimensions:

**Compensation**
- Base salary: check against market rate for role, level, and location (levels.fyi, Glassdoor, Blind, Comprehensive.io)
- Equity: current valuation, vesting schedule (4-year with 1-year cliff is standard), dilution risk for early-stage companies
- Bonus: target percentage vs actual historical payout
- Total comp = base + expected bonus + annualized equity value

**Role clarity**
- Scope: what does "owning" this role actually mean vs what is already decided?
- Team: size, structure, who you report to, tenure of the team
- Growth: what does the next level look like and how long do people typically take to get there?

**Company health**
- Stage: runway, revenue, growth rate — ask directly if not public
- Engineering culture signals: PR review process, incident postmortem culture, on-call burden
- Remote or hybrid reality: written policy vs actual practice

**Red flags in an offer**
- Pressure to decide in under 48 hours — a reasonable window is one to two weeks
- Equity with no clear liquidity path for a company that has been private for 10+ years
- A role described as greenfield that turns out to have 6 months of existing unmaintained code

Get everything in writing before accepting.

---

## Follow-up Emails

After an interview, send a follow-up within 24 hours:
- One sentence thanking them for the time
- One sentence referencing something specific from the conversation (a problem discussed, a question they asked)
- One sentence reaffirming interest, if genuine

Do not write multiple paragraphs. Do not restate your qualifications. Do not follow up more than once if there is no reply.
