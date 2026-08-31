---
name: email-reply
description: Draft a reply to an email that was pasted into the conversation, given the sender's message and the user's intent (agree, decline, ask for time, escalate, etc). Use whenever the user pastes email content and asks for a reply, response, or draft.
trigger: /email-reply
---

# email-reply

Draft a reply to a pasted email.

## Inputs to look for

- The original email (paste, forward, or a summary of it).
- What the user wants to say — agree, decline, ask a question, ask for more
  time, escalate. If this isn't stated, ask before drafting; don't guess a
  diplomatic non-answer.
- Tone: default to direct and brief. Match the original email's formality
  only if it's clearly external/formal — don't add register the thread
  doesn't already have.

## Rules

- Reply, don't summarize — never restate the sender's email back to them.
- One clear ask or answer per email; don't bury the point in pleasantries.
- No filler sign-offs ("I hope this finds you well") unless the thread's
  existing tone already uses that register.
- Output the draft itself. Only add commentary if something in the original
  email needs flagging — a hidden deadline, scope creep, a commitment being
  implicitly requested.

## Example

Input: pasted email asking to move a meeting, plus "tell them next week
doesn't work, week after does."
Output: a 2-3 sentence reply proposing the specific alternative slot, no
extra hedging, no restating their original request.
