# Pester `Should -*` → `Should-*` full assertion map

Complete operator-by-operator mapping from classic Pester v5 assertions to the
Pester v6 `Should-*` assertions. Every signature here was taken from the Pester v6
command reference. For the authoritative, always-current parameters and examples,
open `https://pester.dev/docs/commands/<Name>` (e.g. `.../Should-Be`).

Conventions used below:
- `$x` = the actual value (piped, or passed with `-Actual`).
- A plain rename means: change `Should -Operator` to `Should-Operator` and keep the
  pipeline/arguments. Anything else is called out.

---

## Equality / comparison

| Classic v5 | Pester v6 | Notes |
|---|---|---|
| `$x \| Should -Be 1` | `$x \| Should-Be 1` | Case-insensitive on strings in both (`-eq` semantics). |
| `$x \| Should -Not -Be 1` | `$x \| Should-NotBe 1` | Negation is its own command. |
| `$x \| Should -BeExactly 'A'` | `$x \| Should-BeString 'A' -CaseSensitive` | `Should-Be` is **not** case-sensitive; use `Should-BeString -CaseSensitive`. |
| `$x \| Should -Not -BeExactly 'A'` | `$x \| Should-NotBeString 'A' -CaseSensitive` | |
| `$x \| Should -BeGreaterThan 1` | `$x \| Should-BeGreaterThan 1` | Plain rename. |
| `$x \| Should -BeGreaterOrEqual 1` | `$x \| Should-BeGreaterThanOrEqual 1` | **Renamed** (`...ThanOrEqual`). |
| `$x \| Should -BeLessThan 1` | `$x \| Should-BeLessThan 1` | Plain rename. |
| `$x \| Should -BeLessOrEqual 1` | `$x \| Should-BeLessThanOrEqual 1` | **Renamed** (`...ThanOrEqual`). |

There is no negated comparison command (e.g. no `Should-NotBeGreaterThan`). Invert
the logic with the opposite operator (`Should-BeLessThanOrEqual`) when needed.

---

## Strings (pattern / regex / whitespace)

| Classic v5 | Pester v6 | Notes |
|---|---|---|
| `$x \| Should -BeLike 'a*'` | `$x \| Should-BeLikeString 'a*'` | Wildcard match, case-insensitive default. |
| `$x \| Should -BeLikeExactly 'a*'` | `$x \| Should-BeLikeString 'a*' -CaseSensitive` | |
| `$x \| Should -Not -BeLike 'a*'` | `$x \| Should-NotBeLikeString 'a*'` | |
| `$x \| Should -Match 're'` | `$x \| Should-MatchString 're'` | Regex match, case-insensitive default. |
| `$x \| Should -MatchExactly 're'` | `$x \| Should-MatchString 're' -CaseSensitive` | |
| `$x \| Should -Not -Match 're'` | `$x \| Should-NotMatchString 're'` | |

`Should-BeString` also offers `-IgnoreWhitespace` and `-TrimWhitespace`, plus the
dedicated `Should-BeEmptyString`, `Should-NotBeEmptyString`, and
`Should-NotBeWhiteSpaceString` for empty/whitespace checks (no v5 equivalents — they
replace `BeNullOrEmpty`-style checks on strings).

---

## Boolean / truthiness

Classic `BeTrue`/`BeFalse` are **truthy/falsy** checks. The new same-named commands
are **strict** (`$true`/`$false` only). Choose deliberately:

| Classic v5 | Pester v6 (preserve behavior) | Pester v6 (strict bool) |
|---|---|---|
| `$x \| Should -BeTrue` | `$x \| Should-BeTruthy` | `$x \| Should-BeTrue` |
| `$x \| Should -BeFalse` | `$x \| Should-BeFalsy` | `$x \| Should-BeFalse` |

`Should-BeFalsy` passes for `$false`, `0`, `''`, `$null`, `@()`. If the value under
test is genuinely a boolean, prefer the strict `Should-BeTrue` / `Should-BeFalse`.

---

## Null / empty

`Should -BeNullOrEmpty` collapses several checks into one; v6 splits them. Pick by
what the value actually is:

| Intent | Classic v5 | Pester v6 |
|---|---|---|
| value is `$null` | `$x \| Should -BeNullOrEmpty` | `$x \| Should-BeNull` |
| empty string | `'' \| Should -BeNullOrEmpty` | `'' \| Should-BeEmptyString` |
| empty collection | `@() \| Should -BeNullOrEmpty` | `@() \| Should-BeCollection -Count 0` |
| any falsy value | `$x \| Should -BeNullOrEmpty` | `$x \| Should-BeFalsy` |
| not null | `$x \| Should -Not -BeNullOrEmpty` | `$x \| Should-NotBeNull` |
| not empty string | `$x \| Should -Not -BeNullOrEmpty` | `$x \| Should-NotBeEmptyString` |
| not null/empty/whitespace | `$x \| Should -Not -BeNullOrEmpty` | `$x \| Should-NotBeWhiteSpaceString` |

When in doubt and the type is mixed, `Should-BeFalsy` / `Should-NotBeNull` are the
closest broad equivalents — but a type-specific assertion gives a better message.

---

## Type

| Classic v5 | Pester v6 | Notes |
|---|---|---|
| `$x \| Should -BeOfType [int]` | `$x \| Should-HaveType ([int])` | |
| `$x \| Should -BeOfType 'System.Int32'` | `$x \| Should-HaveType ([System.Int32])` | New form needs a **type literal**, not a string type name. |
| `$x \| Should -Not -BeOfType [int]` | `$x \| Should-NotHaveType ([int])` | |

For a typed collection, pipe-unwrapping turns `[int[]]` into `[object[]]`. Use
`-Actual` to keep the real type: `Should-HaveType -Actual ([int[]](1,2)) -Expected ([int[]])`.

---

## Collections

| Classic v5 | Pester v6 | Notes |
|---|---|---|
| `$c \| Should -Be @(1,2,3)` | `$c \| Should-BeCollection @(1,2,3)` | `Should-Be` errors on a collection `-Expected`; use `Should-BeCollection` for arrays. |
| `$c \| Should -HaveCount 3` | `$c \| Should-BeCollection -Count 3` | |
| `$c \| Should -Contain 2` | `$c \| Should-ContainCollection 2` | Membership. Pass one item, or a collection (`@(1, 2)`) to require several present, in order. |
| `$c \| Should -Not -Contain 2` | `$c \| Should-NotContainCollection 2` | |
| `$v \| Should -BeIn $c` | `$c \| Should-ContainCollection $v` | No `Should-BeIn`; operands swap (actual becomes the collection). |

`Should-ContainCollection` checks that the expected item(s) are present in the actual
collection, in the right order. Pass a single item (`$c | Should-ContainCollection 2`)
or a collection to require several at once (`1, 2, 3 | Should-ContainCollection @(1, 2)`).
For exact, whole-collection equality use `Should-BeCollection`.

New combinator assertions have no v5 equivalent but are handy in migrations:
`$c | Should-All { $_ | Should-BeGreaterThan 0 }` and `$c | Should-Any { ... }`.

---

## Exceptions

| Classic v5 | Pester v6 | Notes |
|---|---|---|
| `{ ... } \| Should -Throw` | `{ ... } \| Should-Throw` | Plain rename. |
| `{ ... } \| Should -Throw 'msg'` | `{ ... } \| Should-Throw -ExceptionMessage 'msg'` | Param **renamed** from `-ExpectedMessage`. `-like` wildcards supported. |
| `{ ... } \| Should -Throw -ErrorId 'X'` | `{ ... } \| Should-Throw -FullyQualifiedErrorId 'X'` | Param **renamed**. |
| `{ ... } \| Should -Throw -ExceptionType ([T])` | `{ ... } \| Should-Throw -ExceptionType ([T])` | Same. |
| `{ ... } \| Should -Not -Throw` | `& { ... }; <no throw assertion needed>` | There is no `Should-NotThrow`; a script block that must not throw simply runs. Assert on its result instead, or keep the classic `Should -Not -Throw`. |

`Should-Throw` adds `-AllowNonTerminatingError` and returns the error record for
further assertions: `$err = { throw 'boom' } | Should-Throw; $err.Exception.Message | Should-BeString '*boom*'`.

---

## Mocks

| Classic v5 | Pester v6 | Notes |
|---|---|---|
| `Should -Invoke Get-Thing` | `Should-Invoke Get-Thing` | Plain rename. |
| `Should -Invoke Get-Thing -Times 2 -Exactly` | `Should-Invoke Get-Thing -Times 2 -Exactly` | Same parameters. |
| `Should -Invoke Get-Thing -ParameterFilter { ... }` | `Should-Invoke Get-Thing -ParameterFilter { ... }` | Same. |
| `Should -Not -Invoke Get-Thing` | `Should-NotInvoke Get-Thing` | Separate command. |
| `Should -InvokeVerifiable` | `Should-Invoke -Verifiable` | Folded into a `-Verifiable` parameter set. |

`Assert-MockCalled` / `Assert-VerifiableMock` were removed in v6 entirely — map them
to `Should-Invoke` / `Should-Invoke -Verifiable` as well.

---

## Command metadata

| Classic v5 | Pester v6 | Notes |
|---|---|---|
| `Get-Command f \| Should -HaveParameter X -Mandatory` | `Get-Command f \| Should-HaveParameter X -Mandatory` | Plain rename. |
| `... \| Should -HaveParameter X -Type String` | `... \| Should-HaveParameter X -Type ([String])` | Prefer a type literal. |
| `... \| Should -HaveParameter X -DefaultValue 8` | `... \| Should-HaveParameter X -DefaultValue 8` | Same. |
| `... \| Should -Not -HaveParameter X` | `... \| Should-NotHaveParameter X` | Separate command. |

---

## No `Should-*` equivalent (keep classic or rewrite)

These v5 operators have **no** new assertion. Leave them as classic `Should -...`
(both syntaxes coexist), or rewrite with PowerShell + a new assertion:

| Classic v5 | Workaround in v6 |
|---|---|
| `$p \| Should -Exist` | `Test-Path $p \| Should-BeTrue` |
| `$p \| Should -FileContentMatch 're'` | `(Get-Content $p -Raw) \| Should-MatchString 're'` |
| `$p \| Should -FileContentMatchExactly 're'` | `(Get-Content $p -Raw) \| Should-MatchString 're' -CaseSensitive` |
| `$p \| Should -FileContentMatchMultiline 're'` | `(Get-Content $p -Raw) \| Should-MatchString 're'` |
| `$p \| Should -FileContentMatchMultilineExactly 're'` | `(Get-Content $p -Raw) \| Should-MatchString 're' -CaseSensitive` |

(With `Get-Content -Raw`, `^` and `$` in the regex match the start/end of the whole
file, matching the multiline operators' behavior.)

---

## New v6 assertions with no v5 counterpart

Worth reaching for when migrating; they often replace awkward classic combinations:

- `Should-BeSame` / `Should-NotBeSame` — reference equality (same instance).
- `Should-BeEquivalent` — recursive, property-by-property object comparison.
- `Should-BeHashtable` — assert hashtable/ordered dict shape, keys, and count.
- `Should-BeBefore` / `Should-BeAfter` — `[datetime]` ordering.
- `Should-BeFasterThan` / `Should-BeSlowerThan` — `[timespan]` / `[scriptblock]` timing.
- `Should-All` / `Should-Any` — run a filter or nested `Should-*` over every item.
