# Using the Daily Focus Board

A warm, visual board for your day that you run **by talking to your AI partner** (Ember). You set
the tasks; you keep it current through conversation and a few one-tap controls. This guide covers
running it in the **GitHub Copilot app** (best experience) and **directly through Ember** anywhere.

## Quick start

Just ask:

> "Make me a focus board for today."

Ember will ask for your handful of tasks (or lift them from what you've already said), generate the
board, serve it locally, and open it. That's it — you're running your day with a partner.

## Two ways to run it

### A) In the GitHub Copilot app (browser canvas) — recommended
The app can show a **browser canvas** right next to the chat, so the board lives beside your
conversation.

1. Ask Ember to make the board. It serves the folder (e.g. `python -m http.server 8790 --bind 127.0.0.1`) and gives
   you an `http://localhost:…/…html` URL.
2. Open a **browser canvas** to that URL. The board sits in the side panel; the chat stays on the left.
3. Talk to Ember as you work; tap the board for quick updates. Progress saves automatically (localStorage).

### B) Directly through Ember (any Copilot session with this skill)
Same flow, without the side-panel polish:

1. "Make me a focus board for today."
2. Ember serves it and gives you the URL — open it in your browser.
3. Drive it by talking + tapping.

> localStorage needs an `http://` origin, so always **serve** the folder rather than double-clicking
> the file. If you truly can't serve, the file still opens, but progress may not persist.

## The daily loop

**1. Arrive (morning).**
- **Check in:** tap *below / in-between / above the line* — just noticing how you're arriving, no
  judgment. (Below the line? Be gentle and shrink the first step.)
- **Set a mantra:** type today's intention, tap 🔄 for a suggestion, or ask Ember for one.
- **List ~4–9 tasks.** Keep it a focus board, not a backlog. Mark the one real **anchor** (give it
  a `due`). Optionally set each task's **priority** (Do first / Schedule / Delegate / Later — tap
  🧭 for what they mean).

**2. Work (during the day).**
- Tap a task's pill to move it **to do → in progress → done** (starting counts — celebrate it).
- **Log momentum notes** ("first draft done") — they build the story of your day.
- **Focus mode** (🎯) dims everything but one task when the list feels loud.
- A stray thought? **Park it** in the 🧠 brain-dump box and keep going.
- Need to capture something new? **➕ add a task** right on the board.
- Reorder by importance with the **⠿** handle, or tap **⬍ sort by priority**.
- Rename any tile's **label** inline.

**3. Close (end of day).**
- Tap **💾 download recap** to keep the day as a Markdown file, or **📋 copy** it.
- If you copy it, **paste it to Ember** — Ember can journal your day and help you set up tomorrow.
- Carry unfinished things with **⤳ not today** — that's a healthy choice, not a miss.

## Things to say to Ember

- "I'm below the line today — give me a gentle mantra and one tiny first step."
- "What should I do next?" → Ember names **one** thing and can turn on Focus mode.
- "Add 'call the dentist' to the board."
- "Help me prioritize — what's actually important vs just urgent?"
- "Here's my end-of-day recap: …" (paste it) → "journal this and plan tomorrow."

## Good to know

- **It's yours and optional.** Every feature is a support, not a requirement. Focus-friendly for
  everyone; never a diagnosis.
- **Keep it small.** If it passes ~9 active tasks, the board nudges you — carry a few to tomorrow.
- **The Schedule quadrant** (important, not urgent) is where the good, non-frantic work lives —
  protect time for it.
- **State is per-browser.** The end-of-day recap is how you take your day *out* of the browser.
