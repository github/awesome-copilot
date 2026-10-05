# AI Product GTM: extended guide

Sections moved verbatim from [SKILL.md](../SKILL.md) to keep it under 500 lines.

## Core Frameworks

### 5. The Enterprise AI Demo (Show Failure, Not Just Success)

**What Doesn't Work:**

Canned demo where AI magically solves everything. Buyers think "this won't work on our messy data."

**What Works:**

Show the AI making a mistake and recovering. Seriously.

**Demo Structure That Works:**

**1. The Problem (30 seconds)**
"Your engineers spend hours on [specific task]. Here's what that looks like."
- Show: Current manual workflow
- Quantify: Time × Engineers × Weeks = Total cost

**2. The AI Attempt (60 seconds)**
"Here's the AI handling the same task."
- Show: AI analyzing, taking action
- **Key move**: Have AI encounter an error or uncertainty
- Show: AI re-analyzing, recovering, or asking for help
- **Narrate**: "Notice it didn't get it perfect first time. It handles uncertainty like a human would."

**3. The Human Review (30 seconds)**
"Here's where the engineer reviews and approves."
- Show: Engineer examining AI's work
- **Key move**: Show the engineer overriding or adjusting something
- **Narrate**: "Human stays in control. AI handles repetitive work, human handles judgment calls."

**4. The Outcome (30 seconds)**
"[X hours] → [Y minutes]. Engineer still owns the outcome, AI accelerates execution."
- Quantify: Time reduction, cost savings, capacity freed

**Why This Works:**

- Showing failure → Builds trust (you're not hiding anything)
- Showing recovery → Proves AI is robust
- Showing human override → Gives them control
- Quantifying savings → Makes ROI concrete

**The Pattern I've Seen:**

Demos with perfect AI → Buyers skeptical
Demos with imperfect AI that recovers → Buyers engaged

**Common Mistake:**

Cherry-picking examples where AI is 100% accurate. Buyers know real-world data is messy. If you don't show messiness, they assume you're hiding it.

---

## Decision Trees

### Which Positioning Should I Use?

```
Does your AI act autonomously (no approval per action)?
├─ Yes → Who are you selling to?
│   ├─ Developers → "Agent" framing
│   └─ Enterprises → "Teammate" framing
└─ No → "Copilot" framing
```

### Which Pricing Model Should I Use?

```
Can you measure customer outcomes reliably?
├─ Yes → Outcome-based (or hybrid with outcome component)
└─ No → Continue...
    │
    Does usage vary 5x+ by customer?
    ├─ Yes → Hybrid (base + usage)
    └─ No → Seat-based
```

### Is This Buyer Ready for AI Agents?

```
Do they have incident response processes for tool failures?
├─ Yes → Continue...
│   │
│   Do they have on-call rotations for production systems?
│   ├─ Yes → Qualified buyer
│   └─ No → Help them build it first
└─ No → Not ready (come back in 6 months)
```

---
