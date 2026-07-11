# Anti-Patterns

Lessons learned from real multi-agent projects. Each anti-pattern was encountered at least once and caused real problems.

## Git & Branching

| Don't | Do Instead | Why |
|-------|------------|-----|
| Rebase or force-push a coordinated feature branch | Keep its published history stable; fix forward or revert, then use a regular merge | Rewriting commit IDs or shared refs invalidates recorded SHAs and complicates multi-session handoffs, review evidence, and recovery. |
| Squash a reviewed sprint PR | Use a regular merge | Squashing is valid Git behavior, but this workflow preserves checkpoint and fix commits for auditability and targeted diagnosis. |
| Share one working arrangement across concurrent agent sessions | Use a separate clone per team/session | Worktrees have separate working files and per-worktree indexes, but still share repository metadata. Separate clones reduce branch and repository-state coordination. |
| Push directly to the target branch | Working branch → PR → gates → merge | Direct pushes bypass the review and QA evidence attached to a PR. |

## Team Roles

| Don't | Do Instead | Why |
|-------|------------|-----|
| Producer writes or delegates implementation | Producer plans, owns status, commissions review, and merges | Coding compromises role independence and conflicts with Dev ownership. The Producer's bounded reviewer/subagent is for independent analysis, not implementation. |
| One agent owns implementation, independent review, and acceptance | Keep Dev, independent review, QA, and Producer responsibilities distinct | Different roles reduce shared assumptions. QA may edit test automation and QA docs, but never application source. |
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
| Claim an issue, PR, push, edit, command, or merge happened without the required capability | Detect capabilities first; otherwise hand off the exact target, payload/instructions, actor, and expected evidence | A prepared payload is useful; a false mutation claim corrupts shared state. |

## Testing & QA

| Don't | Do Instead | Why |
|-------|------------|-----|
| Treat Dev self-review as the independent gate | Dev self-reviews, then Producer commissions a non-author reviewer | Self-review catches problems early but shares the author's assumptions and cannot establish independence. |
| Make post-merge smoke the first behavioral test | QA accepts the exact PR head SHA or immutable preview before merge; smoke after merge | Pre-merge acceptance protects the target branch; post-merge smoke only confirms integration or deployment. |
| Reuse gate evidence after the PR head changes | Issue fresh independent-review and QA evidence for every new head, or record a new head-specific docs-only/trivial exemption | SHA-bound evidence applies only to the exact commit it evaluated. |
| Commit a sign-off that claims the application PR's current head SHA | Put live SHA-bound evidence on the PR, then archive it in a post-merge docs-only closeout PR | Committing a file changes the PR head, so a file cannot durably identify its own containing commit as already accepted. |
| QA modifies application source | QA edits test automation and QA documentation, files issues, and lets Dev fix source on the same branch | QA can improve tests and evidence without becoming the implementation author. |
| Close issues before fix verification | Dev fixes → QA re-verifies the new PR head → authorized owner closes | A commit or author assertion does not prove the reported behavior is fixed. |

## Context & Communication

| Don't | Do Instead | Why |
|-------|------------|-----|
| Assume chats share memory | Files are the shared memory | Each chat is a fresh context. PROJECT_BRIEF.md and progress.md are the only things that survive. |
| Keep decisions in conversation | Write decisions to files | Decisions made in chat are lost when the chat closes. Write to docs/ or GitHub Issues. |
| Copy real secrets or end-user identifying information into evidence | Redact or synthesize logs, screenshots, fixtures, docs, and issues | Diagnostic evidence must not create a second privacy or security incident. |
| Relay unbounded raw logs between teams | Summarize the relevant, redacted lines with component, SHA/environment, steps, expected, and actual | Concise evidence preserves context and avoids propagating sensitive data. |
