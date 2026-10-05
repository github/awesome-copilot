# Setup My IQ: Create and Update Context Portfolio: extended guide

Sections moved verbatim from [SKILL.md](../SKILL.md) to keep it under 500 lines.

## First-Time Setup

### 2. Begin the interview

Introduce the process:

"I'm going to interview you and produce your personal context portfolio: a set
of markdown files that represent who you are, how you work, and what matters
to you. Any AI skill, agent, or plugin can read these files and immediately
understand what it's working with.

We'll go one file at a time. I'll ask you questions, draft the file, and then
ask you to tell me what I got wrong. You can skip any file you don't want
right now. Ready to start?"

### 10. Wire the files into a custom instructions file

Add pointer entries to one of the user's custom instructions files so other
skills and agents can find the new files. **Recommend user scope, not
workspace scope.** The whole point of this context is that it's available
everywhere, not tied to one repo.

Quick map: 10a detect harnesses, 10b pick the target file, 10c (only if more
than one harness) offer to symlink them to a canonical file, 10d write the
pointers using the bundled template.

On macOS or Linux, every command and path below has a POSIX equivalent.
Substitute `$HOME` for `%USERPROFILE%` in every path, use `ln -s
<canonical-target> <harness-file>` instead of `New-Item -ItemType
SymbolicLink`, and skip the Developer Mode check entirely (symlinks don't
require elevation on macOS or Linux).

**Step 10a. Detect which harnesses the user uses.** Check whether any of these
user-scope paths exist (use the filesystem; no need to ask first):

| Harness | User-scope custom instructions path |
|---------|--------------------------------------|
| VS Code Copilot Chat / Claude Code | `%USERPROFILE%\.claude\CLAUDE.md` |
| GitHub Copilot CLI | `%USERPROFILE%\.copilot\copilot-instructions.md` |

VS Code Copilot Chat does not natively read `%USERPROFILE%\.agents\AGENTS.md`,
but it does read `%USERPROFILE%\.claude\CLAUDE.md`, which is the same file
Claude Code uses. So `.claude\CLAUDE.md` is the shared user-scope file for
those two harnesses.

If `%USERPROFILE%\.agents\AGENTS.md` exists, treat it as the canonical
target. In some setups the harness-specific files above are symlinked to
it, so a single write flows to every wired-up harness.

**Step 10b. Pick the target.** Apply the first rule that matches:

1. If `%USERPROFILE%\.agents\AGENTS.md` exists, default to it. The
   harness-specific files are symlinks to it, so a single write flows to
   every wired-up harness. Confirm with the user before writing.
2. Else if exactly one harness-specific file exists, propose writing to it.
   Confirm. Also mention the canonical-plus-symlink option in step 10c.
3. Else if both harness-specific files exist
   (`copilot-instructions.md` and `CLAUDE.md`), list them and ask which to
   update. Strongly recommend creating `.agents\AGENTS.md` as the canonical
   file and symlinking the others to it so a single edit reaches all
   harnesses (step 10c).
4. Else (no user-scope custom instructions files exist anywhere), ask:
   "Which AI harness do you use most: VS Code Copilot Chat, Claude Code,
   GitHub Copilot CLI, something else?" Then create the matching
   user-scope file (`.claude\CLAUDE.md` for the first two,
   `.copilot\copilot-instructions.md` for Copilot CLI) with a
   `## Personal Context` section.

If the user explicitly asks for workspace scope instead, write to
`<workspace>\AGENTS.md` and tell them the trade-off: it only applies to
that repo.

**Step 10c. Offer to symlink other harnesses to the canonical file.** Only
relevant when the user has (or wants) more than one harness. Ask: "Want me
to make `%USERPROFILE%\.agents\AGENTS.md` the canonical file and symlink
your other harness files to it? That way you edit once and every harness
sees the change."

If yes, for each other harness file the user wants linked:

1. **Prerequisites.** File symlinks on Windows need either Developer Mode
   enabled or an elevated PowerShell. Check Developer Mode with:

   ```powershell
   Get-ItemPropertyValue 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock' AllowDevelopmentWithoutDevLicense -ErrorAction SilentlyContinue
   ```

   Returns `1` if Dev Mode is on. If it isn't, offer the user two options
   and let them pick:

   - **Option A: Enable Developer Mode** (one-time, no restart needed).
     Settings -> Privacy & Security -> For developers -> turn on Developer
     Mode. Or run this in an elevated PowerShell:

     ```powershell
     New-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock' -Name AllowDevelopmentWithoutDevLicense -Value 1 -PropertyType DWord -Force
     ```

   - **Option B: Run the symlink command yourself in an elevated
     PowerShell.** Hand them the exact command (filled in with the real
     paths) and ask them to run it in a PowerShell window opened as
     Administrator. Then continue once they confirm it succeeded:

     ```powershell
     New-Item -ItemType SymbolicLink -Path '<harness-file>' -Target "$env:USERPROFILE\.agents\AGENTS.md"
     ```

   Don't keep going without either Dev Mode on or confirmation that the user
   ran the elevated command.
2. **Back up the existing file** to `<file>.bak-<yyyyMMddHHmmss>` so nothing
   is lost. Never delete.
3. **Create the symlink** pointing to `%USERPROFILE%\.agents\AGENTS.md`
   (skip if the user already ran it themselves under Option B):

   ```powershell
   New-Item -ItemType SymbolicLink -Path '<harness-file>' -Target "$env:USERPROFILE\.agents\AGENTS.md"
   ```

The inline symlink steps above are enough for context wiring.

If the user declines symlinks, proceed with the per-harness write and move
on. Don't push twice.

**Step 10d. Write the pointers.** Use the bundled AGENTS.md template at
`assets/templates/AGENTS.md` (relative to this SKILL.md) as the source of
truth for the `## Personal Context` block structure (header, entry labels,
routing table, rules). Don't reinvent the format.

Behavior:

- **If the target file doesn't exist on disk yet**, create it. Make any
  missing parent directory (e.g., `%USERPROFILE%\.copilot\` or
  `%USERPROFILE%\.claude\`), copy the entire bundled template into the
  target path, replace `<CONTEXT_DIR>` with the absolute path to the
  context directory chosen in step 1, and write it.
- **If the target file exists but has no `## Personal Context` section**,
  append the section to the end of the file (and add the `## Safety`
  section from the template if it's missing too), with `<CONTEXT_DIR>`
  replaced. Don't touch existing content above it.
- **If the `## Personal Context` section already exists**, only add or
  update the specific entries that changed. Do not rewrite the whole
  section. Keep the existing labels and ordering; only swap the `@<path>`
  lines.
- Only wire up files that actually exist on disk. Don't add `@<path>`
  pointers for files the user skipped.

## Interview Rules

### Tone
Be direct, warm, and specific. You're an interviewer, not a coach. Don't
editorialize, compliment, or offer opinions about the user's answers.

### Pre-fill from available data sources before asking
Before walking the user through a question list, check whether any of your
available tools or data sources can answer the factual fields for you. The
user shouldn't have to type things a connected system already knows.

Common examples (use whatever your environment actually provides):

- A connected work profile or directory may know the user's name, title,
  organization, team, manager, and direct reports — useful for identity.md
  and team.md.
- Calendar, mail, or chat history may surface frequent collaborators and
  recurring cadences — useful for team.md and role-and-responsibilities.md.
- Project management or source control integrations may know the user's
  org/project/area path or repos — useful for tools-systems-and-config.md.
- Existing writing samples in mail or documents (with the user's permission)
  may inform communication-style.md without requiring fresh samples.

Rules:

1. Only use sources the user has already authorized. Don't reach for
   anything new mid-interview without asking.
2. Pre-fill is a proposal, not an answer. Present what you found, label it
   as auto-filled, and ask the user to confirm or correct each value
   before it goes into a file.
3. Don't enumerate tool names to the user. Say something like "I can pull
   some of this from your work profile" rather than listing specific
   product names.
4. Fall back to asking when no source is available, or when the data is
   ambiguous, stale, or sensitive.
5. Open-ended fields (what you actually do, what people come to you for,
   voice, boundaries) still need to be asked. Don't fabricate them from
   indirect signals.

### Questions
- Ask one question at a time. Never present lists of questions.
- Never ask compound questions.
- Use what you learn in earlier files to inform later interviews. Don't
  re-ask things you already know.
- If the user goes on a tangent useful for a later file, note it and use it
  when you get there.
- When the user gives a vague answer, push for specifics: "Can you give me
  an example?" or "What does that actually look like day to day?"
- When you have enough to draft, say so and draft. Don't keep asking. "Enough" means you have answers covering the core fields in that file's template (for identity: name, role, org, team, manager, and what they do). You don't need to walk every listed question if earlier answers already covered the information.

### The Reaction Pass
After drafting each file, present it and say:
"Here's my draft. Read through it and tell me what doesn't sound right.
Anything that feels off, anything I assumed wrong, anything that's missing."

If the user says it looks good with no changes, push once:
"Pick one sentence that's the weakest or most generic. What would make it
more specifically you?"

If they push back a second time and say it's fine, accept it and move on.

### File Quality
- Keep files concise. One page, not five.
- The files should sound like the user, not like an AI writing about them.
- Use their language, their framing, their level of formality.
- Never use em dashes.
- If the user wants to skip a file, let them.
- If the user needs to stop mid-file, tell them where you are so they can
  resume.

---

## Example: Identity Interview Walkthrough

This shows what a complete identity.md interview looks like from first
question through final written file.

**Agent:** What's your name and current role?

**User:** Dana Kim, Senior Program Manager.

**Agent:** What organization are you with, and what team?

**User:** Contoso, Cloud Engineering. I'm on the Platform Operations team
under Jordan Rivera.

**Agent:** If you had to explain what you actually do to someone at a dinner
party, what would you say?

**User:** I keep the data platform teams running. Sprint planning, status
reporting, making sure leadership knows what's happening without everyone
drowning in update emails. I also build AI tooling that automates the
repetitive parts of program management.

**Agent:** What do people come to you for?

**User:** Two things: getting a clear picture of where a project actually
stands (not the sanitized version), and figuring out how to use AI tools to
cut busywork out of their workflows.

**Agent:** I have enough to draft. Here's my draft:

```markdown
# Identity

- **Name:** Dana Kim
- **Role:** Senior Program Manager
- **Organization:** Cloud Engineering, Contoso
- **Team:** Platform Operations
- **Manager:** Jordan Rivera

## What I Do

I keep the data platform teams running: sprint planning, status reporting,
and making sure leadership knows what's happening without everyone drowning
in update emails. I also build AI tooling that automates the repetitive
parts of program management.

## What People Come to Me For

Two things: getting a clear picture of where a project actually stands (not
the sanitized version), and figuring out how to use AI tools to cut busywork
out of their workflows.
```

Read through it and tell me what doesn't sound right. Anything that feels
off, anything I assumed wrong, anything that's missing.

**User:** Looks good, ship it.

**Agent:** Pick one sentence that's the weakest or most generic. What would
make it more specifically you?

**User:** The "keep the data platform teams running" line. It's more like I'm
the connective tissue between engineering, leadership, and the ops cadence.
Nobody else holds all three perspectives at once.

**Agent:** *(Updates the "What I Do" paragraph and writes the file to the
context directory.)*

That's identity done. Next is role-and-responsibilities, which captures what
your weeks actually look like. Ready?

---
