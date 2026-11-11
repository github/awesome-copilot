# Example: Deep Investigation of a Specific Issue

## User Request
```
Investigate #1842.
```

## Output

```
ISSUE #1842 — Investigation Brief

Problem: Multi-line commands get corrupted in terminal history. When recalling such commands, line breaks are lost or duplicated.

Why it matches:
- Bug fix with clear reproduction
- No active PR (previous attempt reverted)
- Maintainer priority for upcoming release
- Good learning opportunity for terminal internals

Relevant code:
- src/terminal/history.rs: Main history management
- src/terminal/parser.rs: Command parsing
- src/terminal/display.rs: Display logic

Relevant tests:
- tests/history_tests.rs: Existing history tests
- tests/integration/terminal_integration.rs: Integration tests

Related PRs:
- PR #1801: Fixed similar issue for single-line (merged)
- PR #1839: Attempted fix reverted (indicates complexity)

Related commits:
- abc123: Refactored history storage
- def456: Fixed memory leak in history

Likely implementation scope:
1. Fix multi-line storage in history.rs
2. Update parser to handle line breaks
3. Add tests for multi-line scenarios
4. Update documentation

Potential difficulties:
- Multi-line command boundaries unclear
- Single-line optimizations may conflict
- Edge cases with escaped characters
- Performance considerations

Maintainer expectations:
- Must not break single-line functionality
- Comprehensive test coverage required
- Consider performance impact
- Documentation updates needed

Estimated effort: 8-12 hours

Recommended first steps:
1. Read PR #1839 to understand previous attempt
2. Create reproduction test case
3. Study history.rs and parser.rs
4. Implement fix with tests

Confidence: Medium

Reasons:
- Clear problem and reproduction
- Previous fix attempt suggests complexity
- Need to understand parser internals
- Edge cases may be tricky