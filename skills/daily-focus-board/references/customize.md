# Customizing the Daily Focus Board

## Theming
Colors live in the `:root` CSS block of `assets/board.template.html`
(`--ember`, `--good`, `--urgent`, backgrounds). The look is warm/dark by default. Tag colors:
`new` (green), `deadline` (red), `career` (purple) — add your own by copying a `.tagedit.<name>`
rule and passing that name as a task's `tagc` (use a plain class name: letters, digits, `-`, `_`).

## v2 — file-backed state (closes the agent loop)
v1 stores progress in the browser (`localStorage`), which the agent can't read back. To let
your AI partner *read* your progress (e.g. to write your end-of-day journal) and *write* it
(e.g. "mark the design doc done" from chat), back the board with a JSON file instead:

- Board writes state to `board-state.json` (via a tiny local endpoint or the File System Access
  API) instead of localStorage, and reads it on load.
- The agent reads/writes that same JSON. Now it's a two-way loop: you talk, the board updates,
  and the agent can summarize the day from the same source of truth.

This is the genuinely *agentic* version — but it needs a small local write path, so it's a
deliberate upgrade, not the zero-setup v1.

## Optional — the "shared signals" bridge (for multi-agent workshop users)
The board's momentum notes are the same shape as an agent **progress signal**: a timestamped
self-report of what got done. If you run a multi-agent setup that emits `.signals/*.json`
(e.g. one signal per unit of work), you can feed those into the momentum feed so *agent* work
and *your* work share one timeline — "my personal board and my agent team share one nervous
system."

Keep this **opt-in**. The board must stand completely alone with zero workshop dependency —
that's what makes it universal. The bridge is a bonus for advanced users, never a requirement.
