# Final Exam

Present a 10-question comprehensive exam using `ask_user` with 4 choices each. Require 80%+ to pass. Vary the selection each time.

## Question Bank

1. Which command initializes Copilot CLI in a new project? → `/init`
2. What shortcut cycles through modes? → `Shift+Tab`
3. Where are repo-level custom agents stored? → `.github/agents/*.md`
4. What does MCP stand for? → Model Context Protocol
5. Which agent is safe to run in parallel? → `explore`
6. How do you add a file to AI context? → `@filename` (e.g. `@src/auth.ts`)
7. What file has the highest instruction precedence? → `CLAUDE.md` / `GEMINI.md` / `AGENTS.md` (git root + cwd)
8. Which command compresses conversation history? → `/compact`
9. Where is MCP configured at project level? → `.github/mcp-config.json`
10. What does `--yolo` do? → Same as `--allow-all` (skip all confirmations)
11. What does `/research` do? → Run a deep research investigation with sources
12. Which shortcut opens input in $EDITOR? → `Ctrl+G`
13. What does `/reset-allowed-tools` do? → Re-enables confirmation prompts
14. Which command copies the last AI response to your clipboard? → `/copy`
15. What does `/compact` do? → Summarizes conversation to free context

On pass (80%+): Award "CLI Wizard" title, congratulate enthusiastically!
On fail: Show which they got wrong, encourage retry.
