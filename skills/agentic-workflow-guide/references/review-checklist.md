# Review Checklist

Review checklist for agent workflows.

## How to Use

1. Review this checklist after completing workflow design
2. Mark each item as ✅ or ❌
3. If there are ❌ items, consider solutions
4. Improve until all items are ✅

---

## Quick Check (5 minutes)

Minimum items to verify:

```markdown
- [ ] Is each agent focused on a single responsibility? (SRP)
- [ ] Can errors be detected and stopped immediately? (Fail Fast)
- [ ] Is it divided into small steps? (Iterative)
- [ ] Can results be verified at each step? (Feedback Loop)
- [ ] Is there any possibility of infinite loops?
```

---

## Detailed Check

### Core Principles Check

```markdown
## SSOT (Single Source of Truth)

- [ ] Is the same information defined in multiple places?
- [ ] Is configuration/context centrally managed?
- [ ] Is there a mechanism to reflect updates across the entire system?

## SRP (Single Responsibility Principle)

- [ ] Is each agent focused on a single responsibility?
- [ ] Are responsibility boundaries clear?
- [ ] Is there role overlap between agents?

## Simplicity First

- [ ] Is this the simplest possible solution?
- [ ] Are there unnecessary agents or steps?
- [ ] Could this be achieved with a simpler approach?

## Fail Fast

- [ ] Can errors be detected immediately?
- [ ] Can the system stop appropriately on errors?
- [ ] Are error messages clear?

## Iterative Refinement

- [ ] Is it divided into small steps?
- [ ] Can each step be verified?
- [ ] Is the structure suitable for gradual improvement?

## Feedback Loop

- [ ] Can results be verified at each step?
- [ ] Can feedback be applied to the next step?
- [ ] Is there a structure for improvement cycles?
```

### Quality Principles Check

```markdown
## Transparency

- [ ] Are plans and progress visualized?
- [ ] Is it clear to users what's happening?
- [ ] Are logs being output sufficiently?

## Gate/Checkpoint

- [ ] Is validation performed at each step?
- [ ] Are conditions for proceeding clearly defined?
- [ ] Is handling for validation failures defined?

## DRY (Don't Repeat Yourself)

- [ ] Are common processes being reused?
- [ ] Are prompt templates being utilized?
- [ ] Is there duplication of the same logic?

## ISP (Interface Segregation Principle)

- [ ] Is only the minimum necessary information being passed?
- [ ] Is unnecessary context being included?
- [ ] Is required information for each agent clear?

## Idempotency

- [ ] Is it safe to retry?
- [ ] Does executing the same operation multiple times produce the same result?
- [ ] Are side effects being managed?
```

### Scale & Safety Check

```markdown
## Human-in-the-Loop

- [ ] Are important decisions requiring human confirmation?
- [ ] Is there confirmation before high-risk operations?
- [ ] Is the balance between automation and human judgment appropriate?

## Termination Conditions

- [ ] Is there any possibility of infinite loops?
- [ ] Is a maximum iteration count set?
- [ ] Is a timeout set?

## Error Handling

- [ ] Is error handling missing anywhere?
- [ ] Is there handling for unexpected errors?
- [ ] Are recovery procedures defined?

## Security

- [ ] Is sensitive information being handled appropriately?
- [ ] Are permissions set to minimum?
- [ ] Can audit logs be collected?
```

---

## Anti-Pattern Detection

If any of the following apply, review the design:

```markdown
- [ ] **God Agent**: Is too much responsibility packed into one agent?
      → Split with SRP

- [ ] **Context Overload**: Is excessive context being passed?
      → Minimize with ISP

- [ ] **Silent Failure**: Are errors being ignored and continuing?
      → Stop immediately with Fail Fast

- [ ] **Infinite Loop**: Are there loops without termination conditions?
      → Set maximum iterations

- [ ] **Big Bang**: Trying to build everything at once?
      → Build small with Iterative

- [ ] **Premature Optimization**: Making it more complex than necessary?
      → Apply Simplicity First
```

---

## Review Result Template

```markdown
# Workflow Review Results

## Overview

- **Workflow Name**:
- **Review Date**:
- **Reviewer**:

## Check Results

### Core Principles

| Principle            | Result | Comment |
| -------------------- | ------ | ------- |
| SSOT                 | ✅/❌  |         |
| SRP                  | ✅/❌  |         |
| Simplicity First     | ✅/❌  |         |
| Fail Fast            | ✅/❌  |         |
| Iterative Refinement | ✅/❌  |         |
| Feedback Loop        | ✅/❌  |         |

### Quality Principles

| Principle       | Result | Comment |
| --------------- | ------ | ------- |
| Transparency    | ✅/❌  |         |
| Gate/Checkpoint | ✅/❌  |         |
| DRY             | ✅/❌  |         |
| ISP             | ✅/❌  |         |
| Idempotency     | ✅/❌  |         |

### Anti-Patterns

| Pattern          | Detected | Solution |
| ---------------- | -------- | -------- |
| God Agent        | ✅/❌    |          |
| Context Overload | ✅/❌    |          |
| Silent Failure   | ✅/❌    |          |
| Infinite Loop    | ✅/❌    |          |
| Big Bang         | ✅/❌    |          |

## Improvement Proposals

1.
2.
3.

## Overall Evaluation

- [ ] Approved
- [ ] Conditionally Approved (after minor fixes)
- [ ] Requires Revision
```

---

## Next Steps

After review completion:

1. **All ✅** → Proceed to implementation
2. **Minor ❌** → Re-check after fixes
3. **Major ❌** → Revise design, re-review
