# Migrating Pester v3 → v4

This is the smallest jump — mostly an assertion-syntax rename. Many suites need only minor changes,
some need none. It is largely script-automatable, but always review the diff and re-run the suite.

Official guide: https://pester.dev/docs/migrations/v3-to-v4

> Heads-up: if your goal is a modern Pester (5 or 6), v3→v4 is only the first step. Do it, get
> green, then continue with [v4-to-v5.md](v4-to-v5.md) and [v5-to-v6.md](v5-to-v6.md).

---

## Change 1 — Dashed `Should` assertion syntax

v4 introduced the parameter-style `Should` syntax. The bareword form still ran in v4 but is
**removed in v5**, so converting now saves a later migration.

```powershell
# v3 (bareword)
It 'checks something' { 10 | Should Be 10 }

# v4+ (dashed)
It 'checks something' { 10 | Should -Be 10 }
```

The rename applies to every operator: `Be`, `BeExactly`, `Match`, `Throw`, `BeNullOrEmpty`,
`Contain`, etc. → `-Be`, `-BeExactly`, `-Match`, `-Throw`, `-BeNullOrEmpty`, …

There is a well-known AST-based converter, `Update-PesterTest` (Chris Dent / Wojciech Sciesinski),
that inserts the dashes safely by parsing the file rather than regexing it:
https://gist.github.com/indented-automation/aeb14825e39dd8849beee44f681fbab3 — it's also reproduced
in the official v3→v4 guide. Review its output, especially for non-UTF-8/ASCII files, where it can
change encoding.

---

## Change 2 — `Contain` → `FileContentMatch`

The `Contain` assertion was renamed to `FileContentMatch` (it tests file **contents**, which the
old name made ambiguous against collection containment).

```powershell
# Should Contain      -> Should -FileContentMatch
# Should Not Contain  -> Should -Not -FileContentMatch
'app.config' | Should -FileContentMatch 'setting'
'app.config' | Should -Not -FileContentMatch 'secret'
```

A simple regex-based migration script from the official guide (verify results — it can produce
false positives):

```powershell
$content = Get-Content -Path $file -Encoding $encoding
$content = $content -replace 'Should\s+\-?Contain',        'Should -FileContentMatch'
$content = $content -replace 'Should\s+\-?Not\s*-?Contain', 'Should -Not -FileContentMatch'
$content = $content -replace 'Assert-VerifiableMocks',      'Assert-VerifiableMock'
$content | Set-Content -Path $file -Encoding $encoding
```

---

## Change 3 — `Assert-VerifiableMocks` → `Assert-VerifiableMock`

The cmdlet was renamed (dropped the trailing `s`). Rename all occurrences.

> In Pester 5 this is *deprecated* and in Pester 6 it is *removed* — when you continue past v4,
> switch to `Should -InvokeVerifiable`. See [v5-to-v6.md](v5-to-v6.md).

---

## Change 4 — Array assertions (watch for edge cases)

`Should` gained array assertions in v4. This is transparent for most tests, but there are edge
cases where an array test that passed under v3 fails under v4. If an array-related test changes
result after the rename, inspect it manually rather than forcing it to pass. Background:
https://github.com/pester/Pester/issues/873.

Mocking also shifted subtly when Pester moved from functions to aliases; there are no required
changes, but if mocked-command behavior looks off, see
https://github.com/pester/Pester/issues/810 and https://github.com/pester/Pester/issues/812.

---

## v3 → v4 checklist

- [ ] Suite runs on v3 first (baseline).
- [ ] All `Should <Operator>` converted to `Should -<Operator>` (prefer the AST converter).
- [ ] `Should Contain` → `Should -FileContentMatch` (and the `-Not` form).
- [ ] `Assert-VerifiableMocks` → `Assert-VerifiableMock`.
- [ ] Array-assertion behavior changes reviewed manually.
- [ ] File encoding preserved by any scripted replacement.
- [ ] Suite green on v4; diff reviewed; committed.
