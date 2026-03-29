---
name: daily-prep
description: 'Prepare for tomorrow''s meetings and tasks. Pulls calendar from Outlook via WorkIQ, cross-references open tasks and workspace context, classifies meetings, detects conflicts and day-fit issues, finds learning and deep-work slots, and generates a structured HTML prep file with productivity recommendations.'
---

# Daily Prep

Generate a structured prep file for the next working day with meeting details, prep bullets, linked tasks, and productivity recommendations.

## When to Use

- End of day: "prepare me for tomorrow"
- Any time: "prep me for Friday" or "what does March 25 look like?"
- Weekly planning: run for multiple days

## Procedure

### 1. Determine Target Date

If the user specifies a date, use it. Otherwise, default to tomorrow (current date + 1 day).
If tomorrow is Saturday, default to Monday. If Sunday, default to Monday.
Compute the output path: `outputs/YYYY/MM/YYYY-MM-DD-prep.html`

### 2. Pull Calendar via WorkIQ

Use the WorkIQ MCP tool to fetch the calendar. Ask WorkIQ:

> "What meetings do I have on {target date}? For each meeting, include: subject, start time, end time, organizer, all attendees with their email addresses, location, whether it's online, and whether I've accepted or declined."

If the response is insufficient, make a follow-up query:

> "For the meetings on {target date}, which ones are marked as optional or tentative? Which ones are recurring?"

### 3. Classify Each Meeting

Apply these labels based on attendee domains and subject:

| Label | Criteria |
|-------|----------|
| `[Customer · HIGH]` | External attendees from customer/partner domains, or subject matches a known customer name |
| `[Internal]` | Only internal company domain attendees |
| `[Community]` | CoP, community, guild, learning sessions |
| `[Upskilling]` | Training, workshop, certification, learning |
| `[Optional · skip]` | Tentative, low importance, or known recurring optional (e.g., "Office Hours", "Open Q&A") |
| `[Personal]` | Private events, non-work |

#### Zone Markers

For every meeting, check the organizer field and apply these additional markers:

| Condition | Marker | Action |
|-----------|--------|--------|
| Starts ≥ 15:30 and < 16:00 (any organizer) | `⚠️ After-hours` | Recommend decline |
| Starts ≥ 16:00 and **not** self-organized | `⚠️ After-hours` | Recommend decline |
| Starts ≥ 16:00 and self-organized | _(no flag)_ | OK — you chose to schedule it |
| Before 09:00 and **not** self-organized | `⚠️ Early` | Recommend decline — intrudes on learning window |
| Before 09:00 and self-organized | _(no flag)_ | OK — you chose to schedule it |
| Overlaps 12:00–13:00 | `🍽️ Lunch conflict` | Note in Calendar Notes |

"Self-organized" means **you** are the meeting organizer (check the organizer field from WorkIQ).

### 4. Ideal Day Structure

Use this as the decision framework for all analysis steps. Every meeting must be evaluated against these zones. Users should adapt these times and targets to their personal routine.

| Zone | Time | Purpose | Rules |
|------|------|---------|-------|
| Morning Focus | Before 09:00 | Admin, learning, personal work | Protect from others' meetings. Flag external events. |
| Customer Zone | 09:00–12:00 | Customer / external meetings | Max 2 customer meetings. Prefer mornings for external calls. |
| Lunch | 12:00–13:00 | Break | Protected. Flag any overlap. |
| Deep Work | 13:00–15:30 | Deliverables, focused coding/writing | Minimize meetings. Flag non-essential meetings as deep work disruption. |
| Protected (strict) | 15:30–16:00 | End of day wind-down | Flag all meetings regardless of organizer. |
| Protected (flex) | 16:00+ | End of day | Flag others' meetings only. Self-organized OK. |

**Targets per day:**
- Learning hours: **1.5h** (from morning focus + gap time)
- Deep work hours: **2.5h** (13:00–15:30 zone)
- Customer meetings: **max 2** (preferably in 09:00–12:00)

### 5. Detect Conflicts & Day Fit Issues

Compare event time windows. Flag overlaps in a Conflicts table with a recommendation for each — prioritize customer meetings over internal/optional.

Also detect these **day fit issues** (report in a separate "Day Fit Issues" table):

| Check | Condition | Flag |
|-------|-----------|------|
| **Customer overload** | >2 `[Customer · HIGH]` meetings | Flag 3rd+ as "Consider rescheduling to another day" |
| **Deep work disruption** | Non-essential meetings in 13:00–15:30 zone | "Disrupts deep work — consider moving to morning" |
| **Non-ideal placement** | Customer meetings outside 09:00–12:00 | "Customer meeting outside preferred morning zone" |
| **Early intrusion** | Others' meetings before 09:00 | "Intrudes on learning window — recommend decline" |
| **Lunch conflict** | Meeting overlaps 12:00–13:00 | "Conflicts with lunch break" |

### 6. Gather Context from Workspace

1. Read open task files for tasks related to customer names or attendees in tomorrow's meetings
2. Search workspace folders for recent files related to those customers or topics
3. Check recent meeting summaries or plans for relevant prep context
4. Use this to generate actionable prep bullets per meeting

### 7. Generate Prep per Meeting

For each meeting (chronological), include:
- Time, subject, organizer
- Attendee list (first name, company if external)
- 3–5 actionable prep bullets based on open tasks, recent summaries, and meeting subject
- If no context available, note what to ask/clarify in the meeting

### 8. Find Learning & Focus Slots

After generating prep per meeting, analyze the day's schedule to find open slots:

1. **Morning Focus confirmation** — Verify the morning focus window is clear. If any non-self-organized event exists there, flag it.

2. **Learning Slots** — Find gaps ≥ 30 min in the morning window and any other free slots suitable for upskilling. Target: **1.5h/day**. For each slot: time range, duration, suggested activity.

3. **Deep Work Blocks** — Find continuous free gaps in the 13:00–15:30 zone for deliverables. For each block: time range, duration, suggested task from open tasks.

4. **Report totals:**
   - Learning hours found vs. 1.5h target (e.g., "1.0h / 1.5h target — 0.5h short")
   - Deep work hours available in 13:00–15:30 (e.g., "2.0h / 2.5h available")

### 9. Productivity Recommendations

Analyze the full day and provide:

| Section | What to Include |
|---------|------------------|
| **Day Fit Score** | Rate 0–100% how well the day matches the Ideal Day Structure. Criteria: (1) morning focus clear (+20%), (2) ≤2 customer meetings in 09:00–12:00 (+20%), (3) lunch 12:00–13:00 protected (+15%), (4) deep work 13:00–15:30 intact (+20%), (5) nothing after 15:30 or only self-organized after 16:00 (+15%), (6) ≥1h learning slots found (+10%). Show as: 🟢 ≥80%, 🟡 50–79%, 🔴 <50%. |
| **Day Shape** | Total meeting hours, focus time available, learning hours, deep work hours, heavy/moderate/light assessment |
| **Decline Candidates** | Auto-include: (1) all meetings 15:30–16:00, (2) others' meetings ≥16:00, (3) others' meetings <09:00, (4) 3rd+ customer meeting, (5) optional meetings during deep work zone. Show "Reclaim" column with minutes recovered. Self-organized meetings before 09:00 or after 16:00 are **excluded** from auto-decline. |
| **Conflict Resolution** | Specific recommendation for each overlap |
| **Learning Slots** | Gaps for upskilling — from Step 8. Table: Window, Duration, Suggested Activity. Show total vs. 1.5h target. |
| **Deep Work Blocks** | Free gaps in 13:00–15:30 for deliverables — from Step 8. Table: Window, Duration, Suggested Task. |
| **Energy Management** | Flag if >3h back-to-back customer meetings without a break |
| **Top 3 Priorities** | The 3 most impactful things to accomplish (meetings + tasks combined) |

### 10. Write the File

Create the output file at `outputs/YYYY/MM/YYYY-MM-DD-prep.html` as a self-contained HTML file with embedded CSS (dark theme, color-coded timeline, responsive layout).

If a file already exists for that date, read it first and update rather than overwrite — the user may have added manual notes.

## Example Prompts

- "Prepare me for tomorrow"
- "What does Friday look like?"
- "Daily prep for March 28"
- "Prep me for next Monday — focus on customer meetings"

## Requirements

- **WorkIQ MCP tool** must be available for calendar access (Microsoft 365 / Outlook)
- A workspace with task files and customer/project folders for context enrichment
- Output is self-contained HTML — no external dependencies
