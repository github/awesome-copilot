# Migrating Pester v4 → v5

This is the hard jump. v5 introduced a new runtime that splits a test run into two phases —
**Discovery** and **Run** — and that changes how you must *structure* tests. It is not a pure
find-and-replace. Read this whole file before editing a suite.

Official guide: https://pester.dev/docs/migrations/v4-to-v5 ·
Breaking changes: https://pester.dev/docs/migrations/breaking-changes-in-v5

---

## The one concept that explains everything: Discovery and Run

A v5+ run happens in two passes:

- **Discovery** — Pester executes each `*.Tests.ps1` file top to bottom but only to *find* tests.
  It invokes the `Describe`/`Context` script blocks to collect the tree of `It`s, evaluates `It`
  `-Name` strings and `-TestCases`/`-ForEach` data, and records `BeforeAll`/`It`/etc. script blocks
  **without running them**.
- **Run** — Pester then executes the recorded setups, tests, and teardowns with correct scoping.

**The two rules that make a suite v5-correct:**

1. Put **all** test code inside `It`, `BeforeAll`, `BeforeEach`, `AfterAll`, or `AfterEach`.
2. Put **no** test code directly in `Describe`/`Context` bodies or at the top of the file —
   unless it is meant to build tests, in which case it goes in `BeforeDiscovery`.

Code that sits loose in a `Describe` body or at file top-level runs during **Discovery**, and its
results are usually **not** available during **Run**. This is the root cause of most "it worked in
v4, it's `$null` in v5" bugs.

---

## Fix 1 — Move file setup into `BeforeAll` and use `$PSScriptRoot`

The classic v4 header dot-sources the system-under-test at file scope using
`$MyInvocation.MyCommand.Path`. Both the placement and that variable break in v5.

```powershell
# BEFORE (v4)
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$sut  = (Split-Path -Leaf $MyInvocation.MyCommand.Path).Replace('.Tests.', '.')
. "$here\$sut"

Describe 'Get-Cactus' {
    It 'Returns 🌵' { Get-Cactus | Should -Be '🌵' }
}
```

```powershell
# AFTER (v5+)
BeforeAll {
    # Do NOT use $MyInvocation.MyCommand.Path here.
    . $PSScriptRoot/Get-Cactus.ps1
    # or, by convention from the test file name:
    # . $PSCommandPath.Replace('.Tests.ps1', '.ps1')
}

Describe 'Get-Cactus' {
    It 'Returns 🌵' { Get-Cactus | Should -Be '🌵' }
}
```

Why `$MyInvocation.MyCommand.Path` fails: it returns the path only when evaluated directly in the
script body. Inside *any* function or script block (and `BeforeAll` is a script block) `Path` is
empty. Use `$PSScriptRoot` (the test file's directory) or `$PSCommandPath` (the test file's full
path) instead. `string.Replace('.Tests.ps1','.ps1')` is case-sensitive — keep the `.Tests.ps1`
casing exact.

> `$MyInvocation.MyCommand.Path` is fine *inside your module/product code* — the change only
> affects the test-file header pattern. See
> https://pester.dev/docs/usage/importing-tested-functions#migrating-from-pester-v4.

There is a community migration script that does the BeforeAll wrap for you (review its output):
https://gist.github.com/nohwnd/d488bd14ab4572f92ae77e208f476ada

---

## Fix 2 — Generate tests with `BeforeDiscovery` + `-ForEach`, not loose `foreach`

A very common v4 pattern builds tests from data with a top-level `foreach`. In v5 the data often
isn't defined at Discovery time, so no tests get generated, or the per-item variable is missing
inside `It`.

```powershell
# BROKEN in v5: $files is set in BeforeAll (Run phase), but the foreach runs in Discovery
BeforeAll { $files = Get-ChildItem *.ps1 }
foreach ($file in $files) {
    Describe "$file is correct" {
        It 'has empty line at end' { }
    }
}
```

Two things must change: build the data in `BeforeDiscovery` (so it exists during Discovery), and
pass per-item data into the test with `-ForEach`/`-TestCases` (so `It` can see it during Run):

```powershell
BeforeDiscovery {
    $files = Get-ChildItem *.ps1            # runs during Discovery
}

Describe 'script <_> is correct' -ForEach $files {
    It 'has an empty line at the end' {
        # $_ is the current file here
    }
}
```

Prefer `-ForEach` on the block/`It` over a hand-written `foreach`; it both creates the copies and
makes the current item available. Use `<_>` (or `<Name>` for hashtable items) in the name to
template per-item titles. Reference: https://pester.dev/docs/usage/data-driven-tests.

---

## Fix 3 — `-Skip` and `-TestCases` are evaluated during Discovery

Because filters and data are resolved during Discovery, conditions computed in `BeforeAll` are not
available yet.

```powershell
# DOES NOT skip: $isSkipped is set in BeforeAll (Run), but -Skip is read in Discovery
Describe 'd' {
    BeforeAll { $isSkipped = Get-IsSkipped }
    It 'i' -Skip:$isSkipped { }
}
```

Move cheap skip logic to file scope (it runs on every Discovery) or, better, base it on a static
global like `$IsWindows`:

```powershell
$isSkipped = -not $IsWindows
Describe 'd' {
    It 'i' -Skip:$isSkipped { }
}
```

Keep Discovery-time code cheap — it runs every time the file is discovered, which can be often.

---

## Fix 4 — Variables don't leak from Discovery into the test

Variables defined during Discovery are **not** visible in `BeforeAll/-Each`, `AfterAll/-Each`, or
`It`. If you compute something while generating tests and need it at run time, attach it to the
test via `-ForEach`/`-TestCases`. (`TestDrive` is Run-only and likewise can't be used in
`-ForEach`.)

---

## Fix 5 — `Should -Throw` matches with `-like` wildcards

In v5, `Should -Throw <message>` matches the exception message with `-like`, not `.Contains()`. A
substring that used to match now needs wildcards.

```powershell
# v4: matched a substring
{ throw 'connection failed: timeout' } | Should -Throw 'timeout'
# v5+: use wildcards to match part of the message
{ throw 'connection failed: timeout' } | Should -Throw '*timeout*'
```

---

## Fix 6 — Mocks: scoping, debugging, and `InModuleScope`

- **Scope follows placement.** In v5, mocks (and their call counts) are scoped to where you put
  them — the current block/test — not the entire `Describe`/`Context`. Define the `Mock` in the
  same `BeforeAll`/`It` scope where it applies, and assert counts in that scope.
- **`Assert-VerifiableMocks` was removed.** Use `Should -InvokeVerifiable`. (`Assert-MockCalled`
  and `Assert-VerifiableMock` still exist but are *deprecated* in v5 and **removed in v6** — prefer
  `Should -Invoke` / `Should -InvokeVerifiable` now to save a second migration. See
  [v5-to-v6.md](v5-to-v6.md).)
- **Mocks are debuggable.** v5 no longer rewrites your mock script block, so you can set
  breakpoints inside `-MockWith` and inside `-ParameterFilter`.
- **Avoid `InModuleScope` around `Describe`/`It`.** It loads the module during Discovery (slowing
  it down) and lets you test internals instead of the published surface. Prefer `-ModuleName` on
  `Mock` and on `Should -Invoke`; if you must use `InModuleScope`, keep it inside `It`. See
  https://pester.dev/docs/usage/mocking.

```powershell
# Prefer this over wrapping the whole Describe in InModuleScope
Mock Get-Internal -ModuleName MyModule { 'mocked' }
Should -Invoke Get-Internal -ModuleName MyModule -Times 1 -Exactly
```

---

## Fix 7 — `Invoke-Pester` parameters → `New-PesterConfiguration`

`Invoke-Pester`'s interface was overhauled. v5 kept a **deprecated** compatibility set so v4 calls
mostly still run (with a warning), but you should move to either the **Simple** parameters or the
**Advanced** `-Configuration` object. (v6 removes the legacy set entirely — migrate now.)

**Simple interface** (parameter → config property):

| Simple parameter | Configuration property |
|---|---|
| `-Path` | `Run.Path` |
| `-ExcludePath` | `Run.ExcludePath` |
| `-Tag` | `Filter.Tag` |
| `-ExcludeTag` | `Filter.ExcludeTag` |
| `-FullNameFilter` | `Filter.FullName` |
| `-Output` | `Output.Verbosity` |
| `-CI` | `TestResult.Enabled` + `Run.Exit` (both `$true`) |
| `-PassThru` | `Run.PassThru` |

**Legacy (v4) parameters → config:**

| v4 parameter | Configuration property |
|---|---|
| `-Script` | `Run.Path` (paths only — no hashtables) |
| `-EnableExit` | `Run.Exit` |
| `-TestName` | replaced by `-FullNameFilter` / `Filter.FullName` |
| `-CodeCoverage` | `CodeCoverage.Path` (+ `CodeCoverage.Enabled = $true`) |
| `-CodeCoverageOutputFile` | `CodeCoverage.OutputPath` |
| `-CodeCoverageOutputFileEncoding` | `CodeCoverage.OutputEncoding` |
| `-CodeCoverageOutputFileFormat` | `CodeCoverage.OutputFormat` |
| `-OutputFile` | `TestResult.OutputPath` (+ `TestResult.Enabled = $true`) |
| `-OutputFormat` | `TestResult.OutputFormat` |
| `-Show` / `-Output` | `Output.Verbosity` (see mapping below) |
| `-PesterOption`, `-Strict` | ignored / not available |

`-Show` value → `Output.Verbosity`: `All`/`Default`/`Detailed` → `Detailed`; `Fails`/`Normal` →
`Normal`; `Diagnostic` → `Diagnostic`; `Minimal` → `Minimal`; `None` → `None`.

```powershell
# BEFORE (v4 legacy)
Invoke-Pester -Script ./tests -CodeCoverage ./src/*.ps1 `
    -OutputFile result.xml -OutputFormat NUnitXml -EnableExit

# AFTER (v5 Advanced)
$config = New-PesterConfiguration
$config.Run.Path = './tests'
$config.Run.Exit = $true
$config.CodeCoverage.Enabled = $true
$config.CodeCoverage.Path = './src'
$config.TestResult.Enabled = $true
$config.TestResult.OutputPath = 'result.xml'
$config.TestResult.OutputFormat = 'NUnitXml'
Invoke-Pester -Configuration $config
```

`-Output Diagnostic` is your best friend while migrating — it shows Discovery/Skip/Mock decisions.

---

## The new result object

The v5 result object is much richer and is what Pester uses internally. To keep a v4-era CI
pipeline working, convert it with `ConvertTo-Pester4Result`. For NUnit output use
`ConvertTo-NUnitReport`, or pass `-CI` to enable NUnit output, code coverage, and a failing exit
code in one switch. Each test's `-TestCases`/`-ForEach` item is available on the test object's
`Data` property.

---

## Other removed / changed things in v5

- **PowerShell 2** is no longer supported.
- **Legacy `Should Be`** (no dash) is removed — convert to `Should -Be` ([v3-to-v4.md](v3-to-v4.md)).
- **Gherkin** was removed — stay on Pester v4 if you need it.
- `-Output`/`-Show` reduced to `None`, `Normal`, `Detailed`, `Diagnostic`.
- `-TestName` → `-FullNameFilter`; `-Script` → `-Path` (paths only); `-PesterOption` removed.

---

## v4 → v5 checklist

- [ ] Suite runs green on v4 first (baseline).
- [ ] File import moved into `BeforeAll`; `$MyInvocation.MyCommand.Path` replaced with
      `$PSScriptRoot`/`$PSCommandPath`.
- [ ] No loose code in `Describe`/`Context` bodies or at file top-level; test-generating code moved
      to `BeforeDiscovery`.
- [ ] `foreach`-generated tests converted to `-ForEach`; per-item data passed via `-ForEach`/`-TestCases`.
- [ ] `-Skip:` conditions don't depend on `BeforeAll` variables.
- [ ] `Should -Throw` messages use `-like` wildcards (`*...*`).
- [ ] Mocks defined in the right scope; `Assert-VerifiableMocks` → `Should -InvokeVerifiable`;
      `InModuleScope` removed from around `Describe`/`It` in favor of `-ModuleName`.
- [ ] `Invoke-Pester` call converted to Simple params or `New-PesterConfiguration`.
- [ ] Suite green on v5 with `-Output Detailed`; diff reviewed; committed.
