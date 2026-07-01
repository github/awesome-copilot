---
name: pester-should-migration
description: 'Experimental (preview) Pester skill for migrating classic Should -Be (v5) assertion syntax to the new Should-* (v6) assertions (note the hyphen, no space), e.g. `Should -Be` -> `Should-Be`, `Should -Not -Be` -> `Should-NotBe`. Tracks Pester 6, which is still a release candidate, so this guidance may change; verified against Pester 6.0.0-rc2. Use when converting Pester v5 assertions to Pester v6 Should-* operators, modernizing a Pester test suite, or when a user asks to migrate, convert, or rewrite `Should -...` calls in .Tests.ps1 / PowerShell files.'
argument-hint: "File, folder, or test suite to migrate"
---

# Pester `Should -*` → `Should-*` Migration

Convert classic Pester v5 assertions (`Should -Be`, space then parameter) to the
new Pester v6 `Should-*` assertions (`Should-Be`, hyphen, no space).

> **Status: experimental / preview.** Verified against Pester 6.0.0-rc2. The classic
> `Should -Be` style still works in v6, so migrate incrementally and keep the suite green.

> **Companion skill.** This skill covers the *optional* move to the new `Should-*` operators.
> To upgrade a suite across major Pester versions (v3→v4→v5→v6 — the runtime, mocks, and config),
> use the separate **pester-migration** skill. In v6 the classic `Should -Be` keeps working, so
> adopting `Should-*` is independent of any version bump.

## When to Use

- Modernizing a Pester suite to the v6 `Should-*` assertions.
- A user asks to migrate / convert / rewrite `Should -...` calls.
- You want clearer, type-aware failure messages from the new assertions.

## Know This First

- **Both syntaxes work side by side in Pester v6.** Migration is optional and can
  be done one test (or one file) at a time. Nothing breaks if you leave some classic.
- **Requires Pester v6+.** The `Should-*` commands do not exist in v5.
- **Negation is a separate command**, not a `-Not` switch: `Should -Not -Be` →
  `Should-NotBe`. There is no `-Not` parameter on the new assertions.
- **The actual value still comes from the pipeline** (`$x | Should-Be 1`) or from
  `-Actual` (`Should-Be -Actual $x -Expected 1`). `-Because` carries over unchanged.
- **Most renames are mechanical**, but several have behavior changes you must check
  by hand — see [Gotchas](#step-3--check-the-behavioral-gotchas-do-not-skip).

## Procedure

### Step 1 — Find the classic assertions

Search the target for the classic space-separated syntax (the tell is `Should -`,
or `Should` followed by `-Not`):

```
Should -          # any classic operator
Should -Not -     # negated classic operator
Assert-MockCalled # also removed in v6 -> Should-Invoke
```

Limit the scope to PowerShell test files (`*.Tests.ps1`, `*.ps1`).

### Step 2 — Apply the mapping

Most-used conversions (full list in [references/assertion-map.md](references/assertion-map.md)):

| Classic (v5) | New (v6) |
|---|---|
| `$x \| Should -Be 1` | `$x \| Should-Be 1` |
| `$x \| Should -Not -Be 1` | `$x \| Should-NotBe 1` |
| `$x \| Should -BeExactly 'A'` | `$x \| Should-BeString 'A' -CaseSensitive` |
| `$x \| Should -BeGreaterOrEqual 2` | `$x \| Should-BeGreaterThanOrEqual 2` |
| `$x \| Should -BeLessOrEqual 2` | `$x \| Should-BeLessThanOrEqual 2` |
| `$x \| Should -BeLike 'a*'` | `$x \| Should-BeLikeString 'a*'` |
| `$x \| Should -Match 're'` | `$x \| Should-MatchString 're'` |
| `$x \| Should -BeOfType [int]` | `$x \| Should-HaveType ([int])` |
| `$x \| Should -BeNullOrEmpty` | depends — see gotchas (no single equivalent) |
| `$c \| Should -HaveCount 3` | `$c \| Should-BeCollection -Count 3` |
| `$c \| Should -Contain 2` | `$c \| Should-ContainCollection 2` |
| `{ ... } \| Should -Throw 'msg'` | `{ ... } \| Should-Throw -ExceptionMessage 'msg'` |
| `Should -Invoke Get-Thing` | `Should-Invoke Get-Thing` |
| `Should -InvokeVerifiable` | `Should-Invoke -Verifiable` |

### Step 3 — Check the behavioral gotchas (do NOT skip)

These do **not** translate by a plain rename. Read each before converting:

1. **Case sensitivity.** Classic `Should -Be` is case-insensitive on strings; so is
   `Should-Be`. But classic `Should -BeExactly` (case-sensitive) has **no** plain
   equivalent — use `Should-BeString -CaseSensitive`. (`Should-Be` is never
   case-sensitive.) Same pattern for `BeLikeExactly` → `Should-BeLikeString -CaseSensitive`
   and `MatchExactly` → `Should-MatchString -CaseSensitive`.
2. **Truthy vs. true.** Classic `Should -BeTrue` / `-BeFalse` accept any *truthy* /
   *falsy* value (`1`, `'x'`, `0`, `''`, `$null`, `@()`). The new `Should-BeTrue` /
   `Should-BeFalse` are **strict** (exactly `$true` / `$false`). To preserve the old
   loose behavior use `Should-BeTruthy` / `Should-BeFalsy`. Only use the strict ones
   when the value really is a boolean.
3. **`BeNullOrEmpty` has no single equivalent.** Pick by intent: `$null` →
   `Should-BeNull`; empty string → `Should-BeEmptyString`; empty collection →
   `Should-BeCollection -Count 0`; broad "falsy" → `Should-BeFalsy`. The negation
   `Should -Not -BeNullOrEmpty` similarly splits into `Should-NotBeNull` /
   `Should-NotBeEmptyString` / `Should-NotBeWhiteSpaceString`.
4. **Collections.** Classic `Should -Be` also compares arrays; the new `Should-Be` is
   a *value* assertion and **errors** if `-Expected` is a collection ("You provided a
   collection to the -Expected parameter"). Use `Should-BeCollection` to compare arrays.
   `Should -Contain` (single-item membership) → `Should-ContainCollection`. The new
   command also takes a **collection** of expected items and checks they are all present,
   in the right order (`1, 2, 3 | Should-ContainCollection @(1, 2)`). For exact,
   whole-collection equality use `Should-BeCollection` instead.
5. **Pipeline unwrapping.** The pipeline unwraps input: a value assertion sees `@(1)`
   as `1` and `@()` as `$null`, and a typed collection (`[int[]]`) is re-collected as
   `[object[]]`. When the exact value or concrete collection type matters (e.g.
   `Should-HaveType`), pass it with `-Actual` instead of piping.
6. **No `Should-*` equivalent.** `Should -Exist` and the `Should -FileContentMatch*`
   family have no new counterpart. Either keep the classic assertion, or rewrite with
   PowerShell: `Test-Path $p | Should-BeTrue`, `(Get-Content $p -Raw) | Should-MatchString 're'`.
7. **`Should -BeIn` direction.** No `Should-BeIn`. Reverse the operands:
   `$value | Should -BeIn $collection` → `$collection | Should-ContainCollection $value`
   (note the actual/expected swap), or keep the classic form.

### Step 4 — Verify

Run the suite and confirm it's still green — the new messages differ, but passes
must stay passes:

```powershell
Invoke-Pester -Path ./tests
```

If a converted assertion newly fails, re-check the gotchas above (most often #2
truthy/falsy, #3 null-or-empty, or #4 collections).

### Step 5 — (Optional) Enforce the new style

Once a suite is fully migrated, switch off the classic syntax so it can't creep back:

```powershell
$config = New-PesterConfiguration
$config.Should.DisableV5 = $true
```

With this set, any remaining `Should -Be` throws and points at the `Should-Be` form.

## Output

Summarize what changed: files touched, count of assertions converted, any classic
assertions intentionally left (e.g. `Should -Exist`), and any conversions that need
a human decision (truthy/falsy, null-or-empty, collection semantics).

## Reference

- [references/assertion-map.md](references/assertion-map.md) — full operator-by-operator
  table with before/after examples and workarounds.
- Live command reference: `https://pester.dev/docs/commands/Should-Be` (swap in any
  `Should-*` name) for exact parameters and examples.
- Concepts: `https://pester.dev/docs/assertions/should-command` (value vs. collection
  assertions, pipeline vs. `-Actual`).
- v5→v6 upgrade guide: `https://pester.dev/docs/migrations/v5-to-v6`.
