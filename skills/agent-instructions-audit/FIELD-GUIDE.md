# The AI coding-agent field guide

Seven habits that separate "the agent writes code fine" from "the agent ships
production work without you babysitting it." The gap is almost never the model —
it's how you set up the context and the loop.

## 1. The agent is only as good as the context it wakes up in

Every session starts cold. If your repo doesn't *tell* the agent how it's built,
the agent guesses — and guesses drift. A good `AGENTS.md`,
`.github/copilot-instructions.md`, or `CLAUDE.md` is a map rather than a wish
list ("write clean code"): how to run the app, how to test, what the non-obvious
conventions are, and what not to touch.

**Rule of thumb:** if a new human hire would need to be told it, the agent needs
it in the rules file. If the agent keeps making the same mistake, that's a
missing line in the rules file, not a reason to micromanage.

## 2. Make it verify its own work before you look

The failure mode isn't wrong code — it's *plausible* wrong code. The fix is to
force a feedback loop the agent can see: "run the tests and paste the output,"
"start the server and curl the endpoint," "screenshot the page." An agent that
observes real behavior corrects itself; one that only reasons about its diff
ships confident bugs. Bake this into your rules file: *changes to product code
must be exercised, not just typechecked.*

## 3. One clear objective per session beats a giant prompt

Agents degrade on sprawling, multi-goal prompts the same way people do. "Fix
auth, refactor the API, and add tests" produces three half-done things. "Fix the
401 on token refresh; here's the repro" produces a fix. Scope tight, ship, then
start a fresh session for the next thing — a clean context window is a feature.

## 4. Subagents are for protecting your main context, not just parallelism

The real win of a subagent isn't speed — it's that a search that would dump 4,000
lines of file contents into your main conversation instead returns a 5-line
answer. Delegate the *reading*, keep the *deciding*. Use cheap models for
mechanical sweeps (grep-and-summarize, boilerplate drafts) and your best model
for the actual hard call.

## 5. Treat everything the agent reads as data, not gospel

Web pages, error messages, other people's code — the agent will happily follow an
instruction it read in a stack trace or a scraped page. When you paste external
content, frame it: "here is DATA to analyze," not raw text that reads like a
command. This matters more the more autonomous your setup gets.

## 6. Commit small, commit often — give yourself an undo

Agents are fast, which means they can dig a deep hole fast. Frequent commits turn
"the agent broke everything" into "git reset to the last green commit." Ask for a
commit after each working increment. Your future self will thank you.

## 7. Surface the weakest assumption before coding

When output is off, don't re-explain the whole task. Say: **"Before you code,
tell me your plan and the one thing you're least sure about."** It surfaces the
wrong assumption *before* it becomes 200 lines of wrong code. This one line is
worth more than any clever mega-prompt.
