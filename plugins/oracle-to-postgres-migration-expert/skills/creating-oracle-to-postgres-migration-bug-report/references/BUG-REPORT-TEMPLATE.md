# Bug Report Template

Use this template when creating bug reports for Oracle-to-PostgreSQL migration defects.

## Filename Format

```
BUG_REPORT_<DescriptiveSlug>.md
```

## Template Structure

```markdown
# Bug Report: <Title>

**Status:** ✅ RESOLVED | ⛔ UNRESOLVED | ⏳ IN PROGRESS
**Component:** <High-level component/endpoint and key method(s)>
**Test:** <Related automated test names>
**Severity:** Low | Medium | High | Critical

---

## Problem

<Observable incorrect behavior. State expected behavior (Oracle baseline)
versus actual behavior (PostgreSQL). Be specific and factual.>

## Scenario

<Ordered steps to reproduce the defect. Include:
1. Prerequisites and seed data
2. Exact operation or API call
3. Expected result (Oracle)
4. Actual result (PostgreSQL)>

## Root Cause

<Minimal, concrete technical cause. Reference the specific Oracle/PostgreSQL
behavioral difference (e.g., empty string vs NULL, type coercion strictness).>

## Solution

<Changes made or required. Be explicit about data access layer changes,
tracking flags, and any client code modifications. Note whether changes
are already applied or still needed.>

## Validation

<Bullet list of passing tests or manual checks that confirm the fix:
- Re-run reproduction steps on both Oracle and PostgreSQL
- Compare row/column outputs
- Check error handling parity>

## Files Modified

<Bullet list with relative file paths and short purpose for each change:
- `src/DataAccess/FooRepository.cs` — Added explicit NULL check for empty string parameter>

## Notes / Next Steps

<Follow-ups, environment caveats, risks, or dependencies on other fixes.>
```

## Status Values

| Status | Meaning |
|--------|---------|
| ✅ RESOLVED | Defect has been fixed and verified |
| ⛔ UNRESOLVED | Defect has not been addressed yet |
| ⏳ IN PROGRESS | Defect is being investigated or fix is underway |

## Style Rules

- Keep wording concise and factual
- Use present or past tense consistently
- Prefer bullets and numbered lists for steps and validation
- Call out data layer nuances (tracking, padding, constraints) explicitly
- Keep to existing runtime/language versions; avoid speculative fixes
- Include minimal SQL excerpts and logs as evidence; omit sensitive data
