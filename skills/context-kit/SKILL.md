---
name: context-kit
description: "Load your personal context into every AI session — 4 PCA templates (wiki, mental-models, voice, protocols) plus 5 skills (crm-everything, open-loops, watchers, morning-briefing, session-digest) so you start context-full instead of context-zero. Solves AI context amnesia for Claude Code users."
---

# Context Kit

**The problem this solves:** every time you start a new AI session, you lose context. You spend the first 5-10 minutes re-explaining who you are, your goals, your constraints, your voice. The commercial alternatives lock your context in their walled garden. Context Kit keeps it in Markdown files — yours forever, works with any model.

## What's Included

Context Kit installs two kinds of artifacts:

### 4 PCA Templates (Personal Context Artifacts)

Fill these out once. Reference them in your `CLAUDE.md` so every session loads them automatically.

| Template | Question it answers | What goes in it |
|---|---|---|
| `pca-wiki.md` | Who am I? | Background, family, domains, goals, current life-state |
| `pca-mental-models.md` | How do I decide? | Money/time/risk priors, decision frameworks |
| `pca-voice.md` | How do I write? | Writing examples, anti-examples, channel rules |
| `pca-protocols.md` | What are my hard rules? | Non-negotiables agents must never violate |

Add this to your `CLAUDE.md` to start every session context-full:

```markdown
## Personal Context
Read these files at session start:
- ~/.claude/context/pca-wiki.md — who I am
- ~/.claude/context/pca-mental-models.md — how I decide
- ~/.claude/context/pca-voice.md — how I write
- ~/.claude/context/pca-protocols.md — my hard rules
```

### 5 Skills (Slash Commands)

Install to `~/.claude/skills/` and invoke with `/skill-name`:

| Skill | Invoke | What it does |
|---|---|---|
| CRM Everything | `/crm-everything` | Creates/updates a contact file for any person mentioned |
| Open Loops | `/open-loops` | Captures promises and commitments before they become dropped balls |
| Watchers | `/watchers` | Sets up durable notify-me-when-X conditions Claude checks on request |
| Morning Briefing | `/morning-briefing` | Generates a grounded morning status from your state files |
| Session Digest | `/session-digest` | End-of-session summary that primes the next session |

## Install

```bash
# One-command install
bash <(curl -fsSL https://raw.githubusercontent.com/JDDavenport/context-kit/main/scripts/install.sh)

# Or clone and run
git clone https://github.com/JDDavenport/context-kit.git && cd context-kit && bash scripts/install.sh
```

The installer copies PCA templates to `~/.claude/context/` and skills to `~/.claude/skills/`.

## Skills Reference

### `/crm-everything`

Never forget a person. When you mention someone — a colleague, a contact, a founder — this skill creates or updates a contact file capturing relationship context, last interaction, and follow-ups.

### `/open-loops`

A promise made and not tracked is a dropped ball. This skill scans the current conversation for commitments (things you said you'd do, things others said they'd do) and logs them with owner, due date, and priority to `~/.claude/open-loops.md`.

### `/watchers`

Set durable conditions: notify me when X. Watchers are conditions Claude checks whenever invoked, flagging ones that have triggered. Stored in `~/.claude/watchers.md`.

### `/morning-briefing`

Reads your PCA files, domain state files, open loops, and watchers to generate a structured morning briefing — priorities, overdue loops, triggered watchers, domain status. Replaces the what-should-I-focus-on-today spin cycle.

### `/session-digest`

Run at the end of any meaningful session. Generates a structured summary capturing decisions made, work shipped, open loops, and context the next session needs. Stored at `~/.claude/sessions/YYYY-MM-DD-HHMM.md`. Add to your `CLAUDE.md` to auto-load at session start.

## The Philosophy

Context is the asset. Every AI interaction you have builds understanding of who you are and how you work. Context Kit captures that understanding in plain Markdown files — not locked in a vendor's database.

You start context-full, not context-zero.

## Source

Full source, templates, and documentation: **[github.com/JDDavenport/context-kit](https://github.com/JDDavenport/context-kit)**

MIT License.
