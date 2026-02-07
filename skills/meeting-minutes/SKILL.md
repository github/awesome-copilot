---
name: meeting-minutes
description: 'Generate concise, actionable meeting minutes for internal meetings. Includes metadata, attendees, agenda, decisions, action items (owner + due date), and follow-up steps.'
---

# Meeting Minutes Skill — Short Internal Meetings

## Purpose / Overview

This Skill produces high-quality, consistent meeting minutes for internal meetings that are 60 minutes or shorter. Output is designed to be clear, actionable, and easy to convert into task trackers (e.g., GitHub Issues, Jira). The generated minutes prioritize decisions and action items so teams can move quickly from discussion to execution.

## When to Use

Use this skill when:

- Internal syncs, standups, design reviews, triage, planning or ad-hoc meetings with short duration
- Situations that require a concise record of decisions, assigned action items, and follow-ups
- Creating a standardized minutes document from a live meeting, transcript, recording, or notes

---

## Operational Workflow

### Phase 1: Intake (before drafting)

- Obtain meeting metadata: title, date, start/end time (or duration), organizer, and intended audience.
- Confirm available inputs: agenda, slides, recording, transcript, or raw notes.
- If key details are missing, ask up to 3 clarifying questions before producing minutes (see "Discovery" below).

### Phase 2: Capture (during / immediately after meeting)

- Record attendees and absentees.
- Capture brief notes per agenda item with time markers if available.
- Record explicit decisions, rationale summary (1–2 sentences), and action items (owner + due date).

### Phase 3: Drafting

- Generate minutes following the **Strict Minutes Schema** (below).
- Ensure every action item includes owner, due date (or timeframe), and acceptance criteria when applicable.
- Mark unresolved issues or items requiring follow-up in the Parking Lot.

### Phase 4: Review & Publish

- If possible, send draft to meeting organizer or a designated reviewer for quick verification (within 24 hours).
- Publish final minutes to the agreed channel (shared drive, repo, ticket, or email) and optionally create tasks in the team's tracker.

---

## Discovery (required clarifying questions)

Before generating minutes, the agent **MUST** ask up to three clarifying questions if any of these are missing:

- What is the meeting title, date, start time (or duration), and organizer?
- Is there an agenda or transcript/recording to reference? If yes, please provide.
- Who should be assigned as the reviewer or approver for the minutes?

If the user responds "no transcript" or "no agenda," proceed but mark source material as "ad-hoc notes" and flag potential gaps.

---

## Strict Minutes Schema (Output Structure)

You **MUST** produce meeting minutes following this exact structure. If information is unavailable, use `TBD` or `Unknown` and explain how to obtain it.

### 1. Metadata

- **Title**:
- **Date (YYYY-MM-DD)**:
- **Start Time (UTC)**:
- **End Time (UTC) or Duration**:
- **Organizer**:
- **Location / Virtual Link**:
- **Minutes Author** (agent or person):
- **Distribution List** (who receives the minutes):

### 2. Attendance

- **Present**: [list of names + roles]
- **Regrets / Absent**: [list]
- **Notetaker / Recorder**: [name or "agent"]

### 3. Agenda

Bullet list of agenda items, in order:

- Item 1: short title
- Item 2: short title
- ...

### 4. Summary

A concise one-paragraph summary (1–3 sentences) of the meeting's objective and high-level outcome.

### 5. Decisions Made

Each as a separate bullet:

- **Decision 1**: statement of decision.
  - Who decided / approved: [name(s) or group]
  - Rationale (1–2 sentences): brief reason.
  - Effective date (if applicable): YYYY-MM-DD
- **Decision 2**: ...

### 6. Action Items

Table-style bullets; **must include owner and due date**:

- **[ID] Action**: short description
  - **Owner**: Name (team)
  - **Due**: YYYY-MM-DD or "ASAP" / timeframe
  - **Acceptance Criteria**: (what completes this action)
  - **Linked artifacts / tickets**: (optional URL or ticket id)

**Example:**

- [A1] Draft deployment runbook for feature X
  - Owner: Alex (Engineering)
  - Due: 2026-02-05
  - Acceptance Criteria: runbook includes steps for rollback, health checks, and monitoring links
  - Linked artifacts: https://github.com/owner/repo/issues/123

### 7. Notes by Agenda Item

Brief, factual, timestamp optional:

- **Agenda Item 1**: title
  - Key points:
    - Point A (timestamp 00:05)
    - Point B (timestamp 00:12)
  - Open issues / questions:
    - Q1: question text (owner if assigned)
- **Agenda Item 2**: ...

### 8. Parking Lot / Unresolved Items

- **Item**: short description
  - Why parked / next step:
  - Suggested owner or next meeting to resolve

### 9. Risks / Blockers (if any)

- **Risk 1**: short description, impact, mitigation owner
- **Risk 2**: ...

### 10. Next Meeting / Follow-up

- Proposed date/time (if any)
- Objectives for next meeting

### 11. Attachments / References

- Agenda document: URL
- Slides: URL
- Transcript / Recording: URL
- Related tickets: list of URLs or IDs

### 12. Version & Change Log

- **Version**: 1.0
- **Last updated**: YYYY-MM-DDTHH:MM:SSZ
- **Changes**: short notes on edits and who made them

---

## Style & Quality Rules

- Keep minutes concise: total length should typically be under 1 A4 page for meetings <= 30 minutes and under 2 pages for meetings close to 60 minutes.
- Use plain language and bullet lists for readability.
- Prioritize decisions and action items at the top of the document.
- Do NOT include speculative language or unverified claims. If something is uncertain, label it `TBD` and note the missing info source.
- Use consistent timestamps and ISO 8601 dates (YYYY-MM-DD or full UTC timestamp).

---

## DO / DON'T

**DO:**

- Include owner and due date for every action item.
- Provide acceptance criteria for action items when possible.
- Link to artifacts (tickets, slides, recordings) for traceability.
- Send draft for quick review if minutes contain significant decisions.

**DON'T:**

- Omit decisions or action items — these are the primary value of minutes.
- Mix personal opinions with facts. Keep commentary clearly marked as "Opinion" or exclude it.
- Publish raw PII gathered during discussion unless required and authorized.

---

## Example Prompts (for Copilot / Agent)

**Prompt to generate minutes from transcript:**

> "Generate meeting minutes from the following meeting transcript. Meeting title: 'Platform Weekly Sync'. Date: 2026-02-10. Duration: 45 minutes. Organizer: Priya (Platform Lead). Transcript: <paste transcript>. Follow the Strict Minutes Schema. Highlight decisions and create action items with owners and due dates where implied."

**Prompt to generate minutes from notes:**

> "I have raw notes from a 30-minute design review. Title: 'Feature Y Design Review'. Date: 2026-02-11. Notes: <paste notes>. Produce concise minutes following the Strict Minutes Schema. Ask up to 3 clarifying questions if critical fields are missing."

---

## Quick Templates (copyable)

### Concise minutes template (short):

```
- Title:
- Date:
- Organizer:
- Present:
- Summary:
- Decisions:
  - Decision 1 — Who — Effective:
- Action Items:
  - [A1] Action — Owner — Due — Acceptance Criteria
- Next Steps / Next Meeting:
```

### Detailed minutes template (full schema):

Use the Strict Minutes Schema above.

---

## Verification & Acceptance Criteria for Generated Minutes

A generated minutes document is acceptable if:

- It contains Metadata, Attendance, Decisions, and Action Items sections.
- Every action item has an assigned owner and a due date or a clear timeframe.
- All significant decisions are captured with at least 1-line rationale.
- Attachments or references are listed or explicitly marked `None`.
- The document is factual; uncertain items are labeled `TBD`.
