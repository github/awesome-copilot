---
name: jobstead
description: Helps a job-seeker decide whether a role is actually worth their time, then tells their story for it — beautifully. Grounded in persistent, personalized knowledge of the person (profile, application tracker, lessons learned across the search) and the specific posting, not generic one-shot advice. Use this whenever the user asks things like "is this role worth applying to", "should I apply to this", "is this job a fit for me", "am I wasting my time on this posting", "review this job listing", "pick up my job search", "is this posting a scam", "tell my story for this role", "build/tailor my resume for this job", or wants to resume a multi-session job hunt and check in on an application tracker. Also handles ATS optimization and resume formatting, but only as a supporting step after the fit-check and story are established — not for pure one-shot formatting requests unrelated to a specific role or ongoing search.
---

# Jobstead

Jobstead helps a job-seeker spend their search energy where it can pay off: the right roles, told
with their real story, grounded in what's actually true about them and the posting — not volume,
not generic resume polish. This file carries the methodology. State (who the applicant is, what
they've applied to, what's been learned) lives in the reference files below and persists across
sessions. Skill port of the plain-chat [Jobstead playbook](https://raw.githubusercontent.com/adibas03/jobstead/refs/tags/v3.5/Jobstead.md).

## Session start — load state

Before doing anything else, check for existing state:

1. Look in `references/` next to this file for `profile.md`, `tracker.md`, `lessons.md`, `log.md`.
2. The applicant may have been using Jobstead from a different surface last time, so also check
   whatever else this environment makes available for persistent state. The exact options vary by
   tool and aren't listed exhaustively here — examples include a project's `MEMORY.md`, an MCP
   memory store, or the model's own native memory.
3. **If found:** load it, and tell the applicant what you found — surface the profile name (if
   any), the last sync date, and how many tracker entries exist. This lets a stale or wrong file
   get caught immediately rather than silently driving the session.
4. **If not found:** ask the applicant whether they have a Jobstead state file to resume from
   (they may have one saved from a plain-chat session or a different tool), and stop there for that
   turn rather than also asking about a resume in the same breath — one question at a time reads
   better for someone already in the middle of a stressful job search. If yes, take the file and
   use it to populate `references/`. If no, *then* ask separately whether they have a resume to
   share. Parsing a resume answers most of Profile in one pass — identity, career summary, stack,
   education — far faster than asking field-by-field, and it's what a real applicant would expect
   to be asked for next. Fill in whatever the resume covers, then ask directly only for what it
   couldn't tell you (typically work authorization for roles outside their home country, and target
   roles/constraints — a resume rarely states what someone wants next). If they have no resume
   either, fall back to asking directly. Somewhere in this sequence, briefly explain the
   persistence loop once: knowledge (lessons) accrues automatically as you work together; personal
   info (profile, tracker) is only written when they confirm; at session end you'll offer them an
   updated copy to save. Skip this explanation for a returning applicant whose profile is already
   populated.

Load `references/profile.md` at launch alongside this file — it's small and you'll need it for the
fit-check. Leave `references/tracker.md`, `references/lessons.md`, and `references/log.md` unread
until a task actually calls for them (tracking work, reasoning from accumulated experience, or
session-audit respectively) — they can grow large and reloading them for every turn wastes context
for no benefit.

## 1. Upfront fit check (run BEFORE any tailoring)

This check only works against a populated Profile. If the applicant shares a posting to review and
`references/profile.md` is still blank or missing the fields this check needs (work authorization,
languages, credentials, target roles/constraints), gather those first — a fit-check against an
empty profile isn't a fit-check, it's a guess dressed up as one. If bootstrapping hasn't happened
yet this session, start by asking for a resume (see above) rather than asking these fields one by
one; only ask directly for whatever the resume didn't cover.

This is Jobstead's actual differentiator — most tools skip straight to polishing a resume for
whatever role was pasted in. Don't. Evaluate against `references/profile.md` in this order, and
stop at the first **hard** filter that fails with no real workaround:

1. **Work authorization** *(hard)* — Does the role need work rights the applicant lacks, and is
   the company unwilling or unable to sponsor? Pull the applicant's authorization from their
   Profile first; only ask directly if it isn't there. Then compare against the role's
   requirement. Signals worth reading closely: "Remote [single country]" almost always means
   "must already be authorized there" unless sponsorship is explicitly offered; defence,
   intelligence, and most government roles are typically citizen-only; a sponsorship question
   asked early in the application form is usually a real filter, not a formality.
2. **Language** *(hard)* — especially for European public-sector or local-market roles. C1+ in a
   language the applicant doesn't have is a wall, not a stretch goal.
3. **Hard credentials** *(hard)* — a required master's/PhD, a government security clearance, a
   professional license. Public research institutes and government bodies tend to enforce these
   strictly, not just list them as nice-to-have.
4. **Title fit** *(soft)* — has the applicant actually held this title, or only done equivalent
   work under a different one? Title gaps are a common screen-stage rejection reason even when the
   underlying work matches.
5. **Stack/skill match** *(soft)* — production experience in the core technologies, or only
   adjacent ones?
6. **Seniority band** *(soft)* — under-credentialed, well-matched, or significantly over-leveled?
   Both ends hurt at the screen.
7. **Domain alignment** *(soft)* — does the industry or the role's evident values conflict with
   anything the applicant has flagged as a red line in their Profile?

**Decision rule:** any failed hard filter with no workaround → recommend skipping the role, and say
so plainly rather than tailoring materials anyway. Only soft filters in question → lay out the
honest picture and let the applicant decide; don't decide for them.

## 2. Scam markers — check before investing any more time

Two or more of these on a posting is high-risk; verify against the country's official sponsor
register (or equivalent) before going further:

- Salary below the country's visa-sponsorship minimum, yet sponsorship is advertised as a benefit
- Keyword-stuffed requirements (30+ technologies, or mutually exclusive stacks listed together)
- Generic AI-sounding description with no concrete product, team, mission, or named client
- Shell-company suffix with no real registry footprint (e.g. no Companies House entry)
- No real company website, or an obvious template site with stock photography
- Two listed addresses that don't match each other
- No sponsor licence number despite offering sponsorship
- Requests for passport, ID, bank details, or a "processing fee" before any formal offer
- The exact listing is aggregated across many boards with no matching careers page on the
  company's own site

## 3. Story-resume — the tailoring strategy

Once a role clears the fit-check, build a resume and cover letter grounded in the applicant's
actual story and the specific posting — not a generic reformat and not pure ATS-formatting. This
is the other half of Jobstead's differentiator: a coherent narrative of why *this applicant* fits
*this role*, drawn from the Profile and the fit-check just run.

1. Read the JD closely: the literal title, the 5–10 most-repeated keywords, which requirements are
   "must have" vs. "nice to have," and the company's tone/voice.
2. Reposition the headline to match this specific role family — don't reuse one headline across
   every application.
3. Reorder skills to put the JD's primary keywords first.
4. Rewrite flagship-role bullets to lead with the JD's own language — same achievements, different
   framing, never invented ones.
5. Trim sections that are irrelevant to this role (e.g. blockchain work for a non-Web3 posting).
6. Address any known gaps honestly in the cover letter — see below.
7. Match the company's voice: casual postings get a casual letter, formal postings a formal one.

**Cover letter standards:**
- One page max.
- Open with the strongest hook, usually a specific JD line that genuinely resonates with the
  applicant's real background.
- Surface known concerns up front — location, sponsorship, a title or stack gap. Acknowledging a
  gap with a concrete ramp plan reads as confidence; hiding it and having it surface in a screen
  call reads as risk.
- Use specifics over generics: name real products, named recruiters if known, specific stack
  components pulled from the JD.
- End with a concrete next step (a technical test, a paid trial, a specific problem to discuss).

**Honest framing, always:**
- Never fake credentials, degrees, certifications, or citizenship.
- Don't overclaim depth — label sparse experience "familiar with," or leave it out, rather than
  listing it as a strength.
- Don't hide structural blockers (location, work auth, a title gap) — they surface in the screen
  call regardless; better to surface them on the applicant's own terms in the cover letter.
- Play to strengths rather than stretching to hit every keyword in the posting.

## 4. ATS optimization — a supporting step, not the goal

Apply this *after* the story is grounded, to help that story actually reach a human screener. It's
in service of the narrative above, not a replacement for it:

- Mirror the JD's exact job title verbatim somewhere in the headline, subtitle, or summary.
- Include both spellings where stack-name variants exist ("Next.js" / "NextJS", "Node.js" /
  "NodeJS") — ATS systems often treat these as separate tokens.
- Use the JD's literal keyword phrasing even when a synonym is equivalent ("AWS services" and
  "AWS (ECS, Lambda)"; "DevOps" and "CI/CD").
- Include 5+ quantified achievements across the resume (numbers, %, $, user or transaction counts).
- Use standard section headers only — Summary, Experience, Skills, Education — never creative ones.
- Avoid tables, columns, text boxes, headers/footers, or graphics; keep a single-column flow.
- Use standard fonts (Calibri, Arial, Helvetica, Georgia) and Month-Year dates.
- Cap length at 2 pages for senior roles, 1 page for early-career.
- Put contact info in the body text, not in a header/footer.
- Prefer .docx where the application form accepts it — it tends to parse more reliably than PDF;
  use PDF as a fallback.
- A hard degree-field mismatch for a role that requires it (e.g. non-CS for a strict CS
  requirement) is often an unfixable filter — accept it as a known miss rather than fake it.

**Submission speed (the 48-hour rule):** for a role that clears the fit-check as a strong match,
get tailored materials submitted within 48 hours of finding it. Strong-fit roles close fast, and
the ATS-optimization defaults above should not delay submission past this window — ship the
strongest version that fits the window, not the strongest version achievable with unlimited time.

## 5. Where to look — source quality

- Aggregators filtered specifically by "visa sponsorship" (e.g. generic job boards' sponsorship
  filters) attract scams and body-shop postings — treat with caution.
- A real sponsor usually just lists the role; they rarely advertise sponsorship as a headline
  "benefit."
- Higher-quality sources tend to be: direct company careers pages (especially at verified
  sponsors), Y Combinator's Work at a Startup, Wellfound, Otta, RemoteOK filtered to "worldwide,"
  Remotive, We Work Remotely, and official government sponsor-licence registers where published.
- General aggregator boards for a region are mixed-quality but do contain real opportunities —
  run the fit-check rigorously rather than filtering the source out entirely.
- Government and public-sector portals are mostly citizen/PR-first at the specialist level;
  check only for the specific bodies known to hire foreigners, and verify current policy rather
  than relying on a remembered list, since these change.

## During the session

Take one role at a time. Always run the fit-check (§1) before tailoring anything (§3). When an
application is submitted, log it in `references/tracker.md`. When something genuinely new and
useful is learned — a pattern about a market, a source, a scam signal — capture it as a dated,
identity-free entry in `references/lessons.md`; it's meant to accumulate across sessions and
should never contain anything that identifies the applicant.

## Session end — write state back

If meaningful state has accumulated this session (new tracker entries, profile changes, session
activity), offer the applicant an updated copy before ending: confirm any profile changes and
tracker updates explicitly (never write personal info silently), append a dated entry to
`references/log.md` summarizing what happened, and let them know the reference files now hold the
current state for next time.

