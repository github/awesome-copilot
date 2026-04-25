# Anti-Patterns

Lessons learned from real multi-agent projects. Each anti-pattern was encountered at least once and caused real problems.

## Git & Branching

| Don't | Do Instead | Why |
|-------|------------|-----|
| Rebase feature branches | Regular merge | Rebase rewrites history and loses commits. When multiple chats contribute to a branch, rebase causes cascading regressions. |
| Squash merge PRs | Regular merge | Squash hides individual commits, making it impossible to revert a single fix. |
| Use worktrees on shared branches | Separate clones | Worktrees share the git index. Parallel teams stepping on each other's staging area causes confusion. |
| Push directly to main | Feature branch → PR → merge | Direct pushes bypass review and can't be reverted cleanly. |
| Force push (`--force`) | Fix forward or revert | Force push destroys remote history that other teams may have pulled. |

## Team Roles

| Don't | Do Instead | Why |
|-------|------------|-----|
| Producer writes code | Producer only plans, merges, files issues | When the coordinator starts coding, they lose track of the big picture. Fixes in the producer chat often conflict with dev team work. |
| One agent does everything | Separate agents for dev, QA, coordination | Context isolation prevents cross-contamination. QA shouldn't have edit tools. |
| Skip the brainstorm | Run brainstorm → plan → execute | Jumping straight to code produces generic results. Brainstorms surface edge cases early. |
| Vague brainstorm prompts ("you are the team") | Name each agent with distinct perspective | Named agents with defined tendencies produce real debate. Generic prompts produce bland consensus. |

## Sprint Management

| Don't | Do Instead | Why |
|-------|------------|-----|
| Batch "fix everything" commits | One commit per fix with issue reference | Batch commits make it impossible to track what was fixed. If one fix causes a regression, you can't revert just that fix. |
| Keep bugs only in chat | File GitHub Issues | Chat context dies when the conversation ends. Issues persist across all chats and teams. |
| Skip handoff docs (done.md) | Mandatory done.md + PROJECT_BRIEF update | Without handoff docs, the next chat starts blind. It may overwrite work or duplicate effort. |
| Skip progress tracker | Update progress.md after each phase | Without a progress tracker, context overflow recovery is impossible. The new chat doesn't know where the old one left off. |
| Rush the AI with time pressure | "Take your time, do it right" | Time pressure makes the LLM skip edge cases, write less tests, and produce lower quality code. "No rush" produces better results. |

## Testing & QA

| Don't | Do Instead | Why |
|-------|------------|-----|
| Merge before testing | Playtest → file issues → fix → merge | Merging untested code creates a broken main branch. QA can't test against a moving target. |
| QA modifies source code | QA only files issues, dev team fixes | QA fixes often miss context and introduce new bugs. Separation of concerns. |
| Close issues without verification | Dev fixes → QA verifies → close | Self-closing issues skips verification. The fix might not actually work. |

## Context & Communication

| Don't | Do Instead | Why |
|-------|------------|-----|
| Assume chats share memory | Files are the shared memory | Each chat is a fresh context. PROJECT_BRIEF.md and progress.md are the only things that survive. |
| Keep decisions in conversation | Write decisions to files | Decisions made in chat are lost when the chat closes. Write to docs/ or GitHub Issues. |
| Relay raw error logs between teams | Summarize and file as GitHub Issue | Raw logs waste context tokens. Summarize: component, steps, expected, actual. |
