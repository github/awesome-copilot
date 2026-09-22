---
name: daily-focus-board
description: 'Spin up a personal, motivating daily focus board that renders in a browser canvas and that the user drives by talking to their AI partner. Tasks track status (to-do → in progress → done) with timestamped progress notes and roll up into a "today''s momentum" feed; numeric-goal tasks (pages, pomodoros, reps) render as progress-bar counters. Executive-function / neurodivergent-friendly by design: Focus mode, kind "not today" carryover (no overdue-shaming), a brain-dump box, reduced-motion, and gentle deadline countdowns. Add, reorder, and relabel tasks live, assign Eisenhower priority (Do first / Schedule / Delegate / Later), open with an above/below-the-line check-in and a daily mantra, and save an end-of-day recap. Use when someone wants to plan their day, stay focused, kick off a work session, or track progress. Progress persists in the browser (localStorage).'
---

# Daily Focus Board

A warm, visual "let's go" board for a person's day — rendered from a self-contained HTML
template, opened in a browser (ideally a side-panel **canvas** in the GitHub Copilot app), and
kept current *by conversation*: the human tells you what they finished, you update the board.

This is Ember partnership in daily practice: not a static to-do list, a thing you run *with*
your AI. Keep it light, encouraging, and honest — celebrate real progress, don't inflate it.

## When to use it

Trigger when the user wants to: plan today, "get organized / stay focused," start a work
session, or track progress on a set of tasks they list. If they just mention a pile of things
to do, offer the board.

## How to build it (3 steps)

**1. Gather the tasks.** Ask for (or lift from what they already said) their handful of tasks
for the day. For each, capture: a short title, an optional emoji, an optional one-line
sub-note, and an optional tag. If a task is a *count toward a number* (steps, pages,
pomodoros, reps), make it a **counter** with a numeric `goal`. Keep it to ~4–9 items — a focus
board, not a backlog.

**2. Generate the board.** Copy `assets/board.template.html` to a working file (e.g.
`focus-board.html` in a scratch/working dir — NOT into a source repo unless asked). In the copy,
find this line near the top:

```html
<script>window.__BOARD__ = null; /* SKILL: replace null with the config object above */</script>
```

Replace `null` with the config object. **Inject it as JSON with `<` escaped** so a task's text
can never break out of the `<script>` — e.g. `JSON.stringify(config).replace(/</g, "\\u003c")` —
never hand-concatenate raw user-provided text. Schema:

```js
{
  name: "Alex",              // optional — shows "Let's go, Alex 🔥"; omit for "Let's go 🔥"
  dateKey: "2026-07-27",     // optional — localStorage key; defaults to today (YYYY-MM-DD)
  mantra: "Small, real, done.", // optional — today's intention (editable on the board)
  checkin: "above",          // optional — arrival check-in: "below" | "mid" | "above"
  tasks: [
    // counter task (numeric goal → progress bar + set/＋ buttons):
    { id:"pages", emoji:"📖", title:"Read 30 pages",
      goal:30, start:0, inc:5, unit:"pages", tag:"mind", tagc:"new", quad:"ins" },
    // status task (to-do → in progress → done + progress notes):
    { id:"doc", emoji:"⚙️", title:"Finish the design doc", sub:"the anchor",
      due:"2026-07-27T17:00", tag:"deadline", tagc:"deadline", quad:"iu" },
    { id:"move", emoji:"🌿", title:"Move a little — whatever fits your body", tag:"body" }
  ]
}
```

- `id` must be unique and stable, using only letters, digits, hyphens, or underscores
  (`[A-Za-z0-9_-]`) — it's embedded in HTML attributes, CSS selectors, storage keys, and
  colon-delimited note keys, so avoid quotes, colons, brackets, and spaces. `tagc` is an optional color class:
  `new` (green), `deadline` (red/pink), `career` (purple); omit for the default grey.
- Counter tasks: `goal` (a **positive integer**), `start` (default 0), `inc` (default
  `max(1, round(goal/10))`), `unit` (label). Everything else is a status task. Carryover
  ("not today") is for status tasks — counters are progress you dial down, not defer.
- `due` (optional, ISO local datetime) shows a **gentle** live countdown on the card, and after
  the time passes says "was due 5:00pm — still worth doing" in soft amber (never angry red). Use
  it for the one real anchor, not everything.
- `quad` (optional) sets a task's Eisenhower priority: `iu` (important & urgent → *Do first*),
  `ins` (important, not urgent → *Schedule*), `niu` (urgent, not important → *Delegate*), `ninu`
  (neither → *Later*). Renders as a colored accent; the person can change it on the board.
- `mantra` / `checkin` (both optional, top-level) seed today's intention and the above/below-the-line
  arrival check-in. Set these from the conversation, or leave them for the person to set/tap.
- **Built-in, no config needed:** the "how are you arriving?" check-in + daily mantra (with 🔄
  suggestions), ➕ **add-a-task** live, **drag-to-reorder** (⠿ handle) + **sort by priority**, a
  🧭 priority guide, **editable labels** per tile, a gentle **overload nudge**, an **end-of-day
  save** (download/copy a recap), Focus mode, "not today" carryover, the 🧠 brain-dump box, the
  reduced-motion toggle, and the live clock. Just set good tasks; the rest comes for free.

**3. Serve + open it.** localStorage needs an `http://` origin, so serve the folder rather than
opening the file path directly:

- Serve (loopback only): `python -m http.server 8799 --bind 127.0.0.1` from the board's folder
  (or `scripts/serve-board.ps1`). Binding to `127.0.0.1` keeps a board of personal tasks off the
  local network.
  If Python isn't available, any static file server works — you just need an `http://` origin.
- Open: prefer a **browser canvas** side-panel if the host supports one (best experience —
  it sits next to the chat). Otherwise open `http://localhost:8799/focus-board.html` in the
  default browser.
- If you truly can't serve, opening the file directly still works in most browsers; just note
  that some restrict localStorage on `file://`, so progress may not persist.

## How to drive it (the partnership part)

Once it's up, keep it current **through conversation** — this is the whole point:

- When the user says they finished / started something, either (a) tell them the one-tap move
  ("tap the pill on the design-doc card to mark it done"), or (b) regenerate the board only when
  the *task list itself* changes (add/rename tasks) — status and notes live in the browser
  (localStorage) and are set by tapping, not by config; a regenerate with the same `dateKey`
  preserves existing progress. Clicking is faster for live updates.
- Encourage logging **incremental notes** ("all three desks up and running") — momentum is
  built from small logged wins, and the momentum feed becomes the story of their day.
- The board is the artifact; you are the partner. Check in, nudge the anchor task (the one with
  a deadline), celebrate real completion, and protect against overload (too many cards = not a
  focus board).

## Executive-function-friendly behavior (how to show up)

The board's UI has EF/neurodivergent affordances, but **the biggest help is how you, the
partner, behave.** This matters for everyone and is essential for people with ADHD or executive-function challenges.
Bake these in — they're not optional politeness, they're the point:

- **You are a body-double.** The whole premise — "drive your board by talking to your AI" — is
  body-doubling, a well-documented focus strategy. Stay present: check in, co-work, be the
  gentle other-in-the-room. Don't just set up the board and vanish.
- **Beat activation energy: shrink the first step.** When someone's stuck starting a task, don't
  say "just do it." Offer *one tiny concrete first action* ("open the doc and write the ugliest
  possible first sentence"). Starting is the wall; make the first step almost too small to refuse.
- **Suggest ONE next thing, not the list.** When asked "what now?", name a single next action —
  and offer Focus mode (dim the rest). A visible list of 8 is overwhelming; one is doable.
- **Celebrate starting, not just finishing.** Moving a task to "in progress" is a real win. Log
  it in the momentum feed. Dopamine on starting is what carries people with ADHD through.
- **Never shame an incomplete.** No "you didn't finish." Offer **"not today"** carryover freely —
  deciding *not* to do something is a valid, healthy choice, not a failure. Missing one task
  should never threaten the whole system (all-or-nothing spirals are how these tools get abandoned).
- **Externalize intrusive thoughts.** If they get pulled toward something mid-task, tell them to
  **park it in the brain-dump box** and keep going — don't chase it now.
- **Make time concrete.** Time blindness is real; reference the clock and the gentle countdowns,
  and nudge the anchor task before its `due` — kindly, not as a threat.
- **Protect against overload.** The board nudges gently when it passes ~9 active tasks; back it
  up — help them carry things to tomorrow (⤳ not today). A focus board that's a backlog isn't a
  focus board.
- **Open with a check-in, not a task list.** Invite them to *locate* how they're arriving
  (above / in-between / below the line — from Conscious Leadership). It's noticing without
  judgment; below-the-line just means "be gentler, shrink the first step." Never diagnose it.
- **Offer an intention (the mantra).** A short line for the day — theirs, or one you suggest that
  fits the check-in (grounding when they're below the line, momentum when above). Keep it kind.
- **Prioritize together, gently.** If everything feels equally urgent, walk the Eisenhower
  quadrants with them (Do first / Schedule / Delegate / Later) and offer "sort by priority" — the
  point is to make *Schedule* (important, not urgent) visible, not to cram more in.
- **Close the day: save it.** At end of day, have them **download or copy the recap** — and if
  they copy it, they can paste it to you to journal the day and set up tomorrow. Celebrate what
  got done; frame carryover as a healthy choice, not a miss.

Frame all of this as *executive-function-friendly design for everyone* — never diagnose, never
assume someone is neurodivergent, and keep every affordance optional. See
`references/neurodivergent-design.md` for the principles behind each feature.

## Honest limits (say these if relevant)

- **State lives in the browser (localStorage).** It's per-browser and you (the agent) can't read
  it back directly. The **end-of-day recap** (download/copy) bridges this: when they paste the
  copied recap to you, you *can* journal and plan from it. For a fully automatic read/write loop,
  see `references/customize.md` (file-backed state, v2).
- **The polished side-panel experience needs a host with a browser canvas** (like the GitHub
  Copilot app). Everywhere else it's a normal browser tab — same board, less integrated.

## References

- `references/tutorial.md` — how to use the board in the GitHub Copilot app (browser canvas) or
  directly through Ember: the daily loop (check-in → mantra → plan → work → end-of-day save).
- `examples/sample-board.html` — a populated example board: open it to see the board in action,
  or copy it as a starting point (it's this template with a sample config injected).
- `references/neurodivergent-design.md` — the executive-function / ADHD design principles behind
  each feature (task initiation, time blindness, working memory, overwhelm, reward, shame, capture,
  body-doubling), and the "make it optional, don't medicalize" stance.
- `references/customize.md` — theming, the file-backed-state upgrade (agent can read/write
  progress), and the optional "shared signals" bridge for people who run a multi-agent workshop.
