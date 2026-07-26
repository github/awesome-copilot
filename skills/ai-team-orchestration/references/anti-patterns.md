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
