---
name: refactor-method-complexity-reduce
description: 'Refactor given method `${input:methodName}` to reduce its cognitive complexity to `${input:complexityThreshold}` or below, by extracting helper methods.'
---

# Refactor Method to Reduce Cognitive Complexity

## Objective
Refactor the method `${input:methodName}`, to reduce its cognitive complexity to `${input:complexityThreshold}` or below, by extracting logic into focused helper methods.

## Instructions

1. **Analyze the current method** to identify sources of cognitive complexity:
   - Nested conditional statements
   - Multiple if-else or switch chains
   - Repeated code blocks
   - Multiple loops with conditions
   - Complex boolean expressions

2. **Identify extraction opportunities**:
   - Validation logic that can be extracted into a separate method
   - Type-specific or case-specific processing that repeats
   - Complex transformations or calculations
   - Common patterns that appear multiple times

3. **Extract focused helper methods**:
   - Each helper should have a single, clear responsibility
   - Extract validation into separate `Validate*` methods
   - Extract type-specific logic into handler methods
   - Create utility methods for common operations
   - Use appropriate access levels (static, private, async)

4. **Simplify the main method**:
   - Reduce nesting depth
   - Replace massive if-else chains with smaller orchestrated calls
   - Use switch statements where appropriate for cleaner dispatch
   - Ensure the main method reads as a high-level flow

5. **Preserve functionality**:
   - Maintain the same input/output behavior
   - Keep all validation and error handling
   - Preserve exception types and error messages
   - Ensure all parameters are properly passed to helpers

6. **Best practices**:
   - Make helper methods static when they don't need instance state
   - Use null checks and guard clauses early
   - Avoid creating unnecessary local variables
   - Consider using tuples for multiple return values
   - Group related helper methods together

## Implementation Approach

- Extract helper methods before refactoring the main flow
- Test incrementally to ensure no regressions
- Use meaningful names that describe the extracted responsibility
- Keep extracted methods close to where they're used
- Consider making repeated code patterns into generic methods

## Result

The refactored method should:
- Have cognitive complexity reduced to the target threshold of `${input:complexityThreshold}` or below
- Be more readable and maintainable
- Have clear separation of concerns
- Be easier to test and debug
- Retain all original functionality

## Testing and Validation

**CRITICAL: After completing the refactoring, you MUST:**

1. **Run all existing tests** related to the refactored method and its surrounding functionality
2. **MANDATORY: Explicitly verify test results show "failed=0"**
   - **NEVER assume tests passed** - always examine the actual test output
   - Search for the summary line containing pass/fail counts (e.g., "passed=X failed=Y")
   - **If the summary shows any number other than "failed=0", tests have FAILED**
   - If test output is in a file, read the entire file to locate and verify the failure count
   - Running tests is NOT the same as verifying tests passed
   - **Do not proceed** until you have explicitly confirmed zero failures
3. **If any tests fail (failed > 0):**
   - State clearly how many tests failed
   - Analyze each failure to understand what functionality was broken
   - Common causes: null handling, empty collection checks, condition logic errors
   - Identify the root cause in the refactored code
   - Correct the refactored code to restore the original behavior
   - Re-run tests and verify "failed=0" in the output
   - Repeat until all tests pass (failed=0)
4. **Verify compilation** - Ensure there are no compilation errors
5. **Check cognitive complexity** - Confirm the metric is at or below the target threshold of `${input:complexityThreshold}`

## Confirmation Checklist
- [ ] Code compiles without errors
- [ ] **Test results explicitly state "failed=0"** (verified by reading the output)
- [ ] All test failures analyzed and corrected (if any occurred)
- [ ] Cognitive complexity is at or below the target threshold of `${input:complexityThreshold}`
- [ ] All original functionality is preserved
- [ ] Code follows project conventions and standards
