# Example: Finding a Weekend-Sized Issue

## User Request
```
Find me a Rust issue I could realistically finish this weekend.
```

## Output

```
ISSUE SCOUT

Found 3 strong candidates from 156 open issues.

1. #892 — Fix memory leak in connection pool
   Match: 94/100
   Difficulty: Medium
   Estimated scope: 4-6 hours

   Why:
   ✓ Clear reproduction with profiler output
   ✓ Maintainer confirmed the issue
   ✓ Localized to single module
   ✓ Existing test infrastructure
   ✓ Clear success criteria

   Concern:
   ⚠ May require understanding of async lifetimes
   ⚠ Similar to #845 but different scenario

2. #915 — Improve error messages for invalid configurations
   Match: 88/100
   Difficulty: Easy-Medium
   Estimated scope: 3-5 hours

   Why:
   ✓ Multiple user reports (real problem)
   ✓ Maintainer wants this fixed
   ✓ Follows existing error patterns
   ✓ Good learning opportunity

   Concern:
   ⚠ Touches multiple files
   ⚠ Need to decide on error message format

3. #878 — Add timeout to HTTP client requests
   Match: 85/100
   Difficulty: Medium
   Estimated scope: 5-7 hours

   Why:
   ✓ Clear specification
   ✓ Follows existing patterns
   ✓ Good feature contribution

   Concern:
   ⚠ Need to understand client architecture
   ⚠ May need API design decisions

Best match: #892

It's a well-defined bug with clear reproduction, localized fix, and existing tests. The 4-6 hour estimate fits perfectly in a weekend.