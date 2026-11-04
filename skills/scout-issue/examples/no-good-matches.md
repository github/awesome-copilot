# Example: No Good Matches Found

*Note: Issue counts and numbers below are illustrative examples.*

## User Request
```
Find me a beginner-friendly Rust issue in the compiler subsystem.
```

## Output

```
ISSUE SCOUT

Searched 47 open issues. Found 0 strong candidates.

Analysis:
- Rust issues in compiler subsystem: 23
- Beginner-friendly: 3
- After filtering (active PRs, assigned, stale): 0

Rejected issues and reasons:

Issue #1234 — Rejected
Reasons:
- Assigned to maintainer
- Requires deep compiler knowledge
- Estimated scope: 20+ hours

Issue #1289 — Rejected
Reasons:
- Active PR already exists
- Design discussion still ongoing

Issue #1362 — Rejected
Reasons:
- Requires understanding of LLVM backend
- No reproduction case provided

Recommendation:
Your constraints are quite specific. Consider:

1. **Relaxing scope**: "Beginner-friendly Rust issues" (not limited to compiler)
2. **Expanding timeframe**: "Issues I can complete in a week" (not just beginner-friendly)
3. **Different area**: "Frontend Rust issues" or "documentation issues"

The compiler subsystem requires deep expertise. For a first contribution, consider:
- Issues labeled "good first issue" in other areas
- Documentation improvements
- Test coverage additions
- Simple bug fixes in utilities

Would you like me to search with different constraints?
```

## Key Points
- Explains why no matches were found
- Shows rejection reasoning for top candidates
- Suggests alternative approaches
- Offers to re-search with different constraints