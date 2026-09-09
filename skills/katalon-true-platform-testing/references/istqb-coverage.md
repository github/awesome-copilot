# Coverage Guide (ISTQB techniques as reference)

Use this guide before writing or importing test cases. ISTQB is the **reference toolkit** for designing coverage here, not the deliverable: the output is plain platform test cases designed *using* these techniques, not "ISTQB cases" certified against the standard. The goal is enough risk-based coverage, not maximum case count.

## Technique Selection

- Equivalence Partitioning: use for valid/invalid classes such as product categories, brands, stock states, payment methods, account roles, and form input classes.
- Boundary Value Analysis: use for numeric or ordered values such as price range, quantity, pagination, character limits, dates, and timeout thresholds.
- Decision Table Testing: use when outcomes depend on combinations of conditions, such as selected variant + stock + quantity, checkout field validity, shipping eligibility, or payment availability.
- State Transition Testing: use when behavior depends on prior state, such as empty cart -> item added -> quantity updated -> removed, checkout step progression, or execution TODO -> IN_TESTING -> PASSED/FAILED.
- Use Case / Scenario Testing: use for end-to-end journeys that represent user goals, such as browse -> select variant -> add to cart -> checkout.
- Error Guessing / Checklist-Based Testing: use for likely failures based on domain knowledge, such as broken images, stale cart totals, invalid email, unavailable product, duplicate submission, or navigation loss.
- Pairwise / Combinatorial Testing: use when many variables interact, such as browser x device x category x filter x sort, while preserving explicitly high-risk combinations.

## Minimum Coverage Expectations

For each requirement, identify:

- At least one happy-path scenario.
- At least one negative or validation scenario when user input or branching exists.
- Boundary cases for numeric/date/range fields.
- State transitions for multi-step workflows.
- Role/permission coverage when roles exist.
- Data setup and cleanup assumptions.
- Requirement-to-test traceability.

## Coverage Output Format

Before importing tests, prepare a short coverage note:

```text
Coverage Techniques:
- Use case testing: ...
- Equivalence partitions: ...
- Boundary values: ...
- Decision table/state transition: ...
- Error guessing risks: ...

Selected Test Cases:
- P0: ...
- P1: ...
- P2: ...

Deferred / Not Covered:
- ...
Reason:
- ...
```

## Case Granularity

- Keep each case **atomic in scope**: one validation condition / one acceptance-criteria line per case, so a failure pinpoints the exact rule and each requirement line maps 1:1 to a result.
- Atomic does not mean a single step. Every case is a **complete, runnable flow**: precondition/navigation -> enter surrounding valid data -> perform the action under test -> verify the result. Avoid lone-step cases like "count the columns"; include the steps to reach and exercise that state so the case executes on its own (including under Run with AI).
- Cover the happy-path flow **and** its edge cases for every feature: main success flow plus boundary and negative variants. Do not stop at the positive path.
- Quote expected error/UI strings verbatim from the requirement, including source typos; flag suspected typos separately rather than correcting them in the expected result.

## Practical Rules

- Do not create redundant tests that exercise the same partition and same expected behavior.
- Prefer fewer strong tests over many shallow tests.
- Mark P0 for revenue, checkout, account, data-loss, or broken-entry-point risks.
- Mark P1 for important catalog, filter, sort, and traceability behaviors.
- Mark P2 for cosmetic, footer, secondary navigation, or low-risk edge cases.
- If a test is primarily exploratory or visual, say so and include what evidence is needed.
