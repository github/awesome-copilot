---
name: cli-mastery
description: 'Interactive training for the GitHub Copilot CLI. Guided lessons, quizzes, scenario challenges, and a full reference covering slash commands, shortcuts, modes, agents, skills, MCP, and configuration. Say "cliexpert" to start.'
metadata:
  version: 1.2.0
license: MIT
---

# Copilot CLI Mastery

**UTILITY SKILL** — interactive Copilot CLI trainer.
INVOKES: `ask_user`, `sql`, `view`
USE FOR: "cliexpert", "teach me the Copilot CLI", "quiz me on slash commands", "CLI cheat sheet", "copilot CLI final exam"
DO NOT USE FOR: general coding, non-CLI questions, IDE-only features

## Routing and Content

| Trigger | Action |
|---------|--------|
| "cliexpert", "teach me" | Read next `references/module-N-*.md`, teach |
| "quiz me", "test me" | Read current module, 5+ questions via `ask_user` |
| "scenario", "challenge" | Read `references/scenarios.md` |
| "reference" | Read relevant module, summarize |
| "final exam" | Read `references/final-exam.md` |

Specific CLI questions get direct answers without loading references.
Reference files in `references/` dir. Read on demand with `view`.

## Behavior

On first interaction, initialize progress tracking:
```sql
CREATE TABLE IF NOT EXISTS mastery_progress (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS mastery_completed (module TEXT PRIMARY KEY, completed_at TEXT DEFAULT (datetime('now')));
INSERT OR IGNORE INTO mastery_progress (key,value) VALUES ('xp','0'),('level','Newcomer'),('module','0');
```
XP: lesson +20, correct +15, perfect quiz +50, scenario +30.
Levels: 0=Newcomer 100=Apprentice 250=Navigator 400=Practitioner 550=Specialist 700=Expert 850=Virtuoso 1000=Architect 1150=Grandmaster 1500=Wizard.
Max XP from all content: 1600 (8 modules × 145 + 8 scenarios × 30 + final exam 200).

When module counter exceeds 8 and user says "cliexpert", offer: scenarios, final exam, or review any module.

Rules: `ask_user` with `choices` for ALL quizzes/scenarios. Show XP after correct answers. One concept at a time; offer quiz or review after each lesson.
