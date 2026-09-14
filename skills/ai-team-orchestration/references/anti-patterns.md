# Anti-Patterns

| Avoid | Prefer | Why |
|---|---|---|
| One agent owns planning, implementation, testing, and approval | Keep Producer, Dev, and optional QA responsibilities distinct | Independent perspectives reduce blind spots without requiring ceremony for every change. |
| Hardcoded tool or model allowlists | Inherit the developer's enabled tools and selected model | Extensions and MCP tools remain available without plugin updates. |
| A mandatory process for every change | Scale planning, review, and QA to risk | Small changes stay fast; high-impact changes receive more scrutiny. |
| Universal Git command recipes | Follow repository contribution and branch policy | Projects use different remotes, protections, and merge strategies. |
| Rewriting shared history or discarding unknown work | Preserve work and coordinate destructive actions | Parallel sessions and contributors may depend on existing state. |
| Large plans that duplicate project documentation | Record only outcomes, constraints, decisions, and next actions | Concise context is easier to maintain and recover. |
| Bugs and decisions kept only in chat | Use the repository's issue tracker and durable context | Future sessions can discover them. |
| QA fixes application source | QA reports behavior; Dev implements fixes | Separation preserves independent verification. |
| Treating every automated suggestion as a requirement | Assess relevance, confidence, scope, and practical risk | Review should improve the product, not expand scope without limit. |

## Role responsibilities (Do / Don't)

- Producer
  - Do: Clarify outcome, constraints, acceptance criteria, and explicit exclusions; coordinate reviewers and merge policy.
  - Don't: Implement or ship code changes that should be reviewed by Dev.

- Dev
  - Do: Implement the smallest complete solution, run listed verification, include tests, and prepare the PR with verification steps.
  - Don't: Merge without required checks, failing tests, or without documenting risks and decisions.

- QA (optional)
  - Do: Independently verify behavior, file reproducible issues, and confirm fixes after Dev applies them.
  - Don't: Modify application source as a shortcut for failing verification — report and hand back to Dev.

## Decision logging guidance

- Record material decisions in a DECISIONS.md or the repository issue tracker with: title, date, owner, decision summary (1 line), rationale, and link to related PR/issue.
- Keep entries short and searchable; record the next action when a decision defers work.
