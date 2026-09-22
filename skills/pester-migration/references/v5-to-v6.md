# Migrating Pester v5 → v6

Pester 6 builds on v5 and is **largely backwards-compatible** — most v5 suites run on v6 with no
changes, and your existing `Should -Be` assertions keep working. The work is fixing a handful of
previously-deprecated behaviors that now throw. This is a low-to-medium effort jump.

Official guide: https://pester.dev/docs/migrations/v5-to-v6

---

## Quick upgrade checklist

For most suites this is low risk. Run through these, then read the details for anything that bites:

1. Run on **Windows PowerShell 5.1** or **PowerShell 7.4+** (older PS is dropped).
2. Check any `-ForEach`/`-TestCases` that can be empty — it now **throws** unless you add
   `-AllowNullOrEmptyForEach`.
3. Remove duplicate `BeforeAll`/`BeforeEach`/`AfterAll`/`AfterEach` in the same block.
4. Replace `Assert-MockCalled` / `Assert-VerifiableMock` with `Should -Invoke` /
   `Should -InvokeVerifiable`.
5. Add a default `Mock` where some calls don't match a `-ParameterFilter` — mocks no longer fall
   through to the real command.
6. If you call `Invoke-Pester` with v4-style params (`-Script`, `-OutputFile`, …), switch to
   `New-PesterConfiguration`.

---

## Breaking changes (symptom → fix)

### PowerShell 5.1 and 7.4+ only
PowerShell 3, 4, 6, and early/unsupported 7 are dropped (all out of support from Microsoft), which
let Pester move its C# to .NET 8 (net462 for Windows PowerShell 5.1).

- **Symptom:** Pester won't import on an older PowerShell.
- **Fix:** Update your machines and CI agents to Windows PowerShell 5.1 or PowerShell 7.4+.

### Discovery and Run now happen per file
In v5 the run had two global phases: discover **every** file, then run every file. In v6 the unit
of work is a single file — Pester discovers a file and runs it before moving to the next. This is
what enables the experimental parallel runner, and serial runs follow the same model.

- **Symptom:** a file that relied on *another* file's discovery-time side effect fails — e.g. a
  module imported at the top of one file, a global variable, a changed working directory, or
  `-ForEach` data defined in a different file.
- **Fix:** make each test file self-contained. Do discovery-time setup in `BeforeDiscovery`, and
  import the modules the file needs in its own `BeforeAll`. For setup every file needs, use
  `Run.BeforeContainer` (config) or a `Pester.BeforeContainer.ps1` at the repo root.

```powershell
BeforeDiscovery {
    $cases = Get-Content "$PSScriptRoot/cases.json" | ConvertFrom-Json
}
Describe 'MyModule' {
    BeforeAll { Import-Module "$PSScriptRoot/MyModule.psm1" }
    It 'handles <Name>' -ForEach $cases { Invoke-Thing $Name | Should -Be 'ok' }
}
```

On-screen output also changes: one `Running tests from N files.` banner, per-file results, then a
single grand total. The old `Starting discovery in N files.` / `Discovery found X tests` framing is
gone for a normal run. The parallel runner (`Run.Parallel`) keeps the same result object with a few
edge cases — see https://pester.dev/docs/usage/result-object#parallel-runner-edge-cases.

### Empty or `$null` `-ForEach` throws
`-ForEach` (or `-TestCases`) given `$null` or `@()` now throws instead of silently skipping. This
catches the common bug of pointing `-ForEach` at a variable that wasn't defined in
`BeforeDiscovery`, or external data that failed to load.

- **Symptom:**
  ```
  Value can not be null or empty array. If this is expected, use -AllowNullOrEmptyForEach
  on this Describe, or set the Run.FailOnNullOrEmptyForEach configuration option to $false ...
  ```
- **Fix:** when the data can legitimately be empty, allow it on that specific block/test:
  ```powershell
  Describe 'Optional cases' -ForEach $cases -AllowNullOrEmptyForEach {
      It 'runs only when there is data' { }
  }
  ```
  You *can* disable the check for the whole run with `Run.FailOnNullOrEmptyForEach = $false`, but
  that brings back the silent skipping it's meant to catch — prefer fixing the data or using
  `-AllowNullOrEmptyForEach` where empty is genuinely expected.

### Duplicate setup/teardown blocks throw
A block may have only one of each `BeforeAll`/`BeforeEach`/`AfterAll`/`AfterEach`. Two of the same
(a common copy-paste bug) was silently allowed in v5; v6 throws.

- **Symptom:** `BeforeAll is already defined in this block. Each block can only have one BeforeAll.`
- **Fix:** combine them into one block:
  ```powershell
  Describe 'd' {
      BeforeAll {
          $a = 1
          $b = 2   # was a second BeforeAll
      }
  }
  ```

### Test names evaluate `<...>` templates as expressions
In v6 the content of every `<...>` token in a `Describe`/`Context`/`It` name is evaluated as a
PowerShell expression in the test's run scope (current `-ForEach` item and its properties, in-scope
variables, arithmetic, method calls). Everything outside `<...>` is kept literal. In v5 only simple
data/variable/property references were substituted.

- **Symptom:** a name containing expression-like content inside `<...>` that used to render
  literally now evaluates.
  ```powershell
  # v5 renders literally: "adds up to <($a + $b)>"; v6 evaluates: "adds up to 3"
  It 'adds up to <($a + $b)>' -ForEach @(@{ a = 1; b = 2 }) { }
  ```
- **Fix (to keep the literal text):** escape the leading `<` with a backtick:
  ```powershell
  It 'adds up to `<($a + $b)`>' -ForEach @(@{ a = 1; b = 2 }) { }
  ```

### `Assert-MockCalled` and `Assert-VerifiableMock` removed
Deprecated in v5, removed in v6.

- **Symptom:** `The term 'Assert-MockCalled' is not recognized ...`
- **Fix:**
  ```powershell
  # Assert-MockCalled     -> Should -Invoke
  # Assert-VerifiableMock -> Should -InvokeVerifiable
  Should -Invoke Get-Thing -Times 1 -Exactly
  Should -InvokeVerifiable
  ```

### Mocks no longer fall through to the real command
In v5, a call to a mocked command that matched none of your `-ParameterFilter` mocks quietly ran
the **real** command. v6 removes that implicit fall-through.

- **Symptom:**
  ```
  No mock for command 'Get-Thing' matched the call: none of the parameter filters matched,
  and there is no default mock to fall back to. Add a default mock ...
  ```
- **Fix:** add a default mock (no `-ParameterFilter`) for the unfiltered calls, or widen a filter:
  ```powershell
  Mock Get-Thing -MockWith { 'default' }                                # everything else
  Mock Get-Thing -ParameterFilter { $Name -eq 'a' } -MockWith { 'a' }   # special case
  ```

### `Set-ItResult -Pending` removed
`Pending` was never fully implemented in v5 and is gone.

- **Symptom:** `Parameter set cannot be resolved using the specified named parameters.`
- **Fix:** use `-Inconclusive` or `-Skipped`, or mark the test with `It … -Skip`:
  ```powershell
  Set-ItResult -Inconclusive -Because 'not implemented yet'
  ```

### Code coverage uses the Profiler tracer by default
Coverage no longer sets a breakpoint on every command; it uses the Profiler's tracer, which is much
faster on large code bases. `CodeCoverage.UseBreakpoints` is no longer experimental and defaults to
`$false`.

- **Symptom:** coverage numbers differ from v5 and you want the old behavior.
- **Fix:** `$config.CodeCoverage.UseBreakpoints = $true`.

### `CodeCoverage.OutputFormat = 'CoverageGutters'` removed
All coverage output is now relative to the repo root (`Run.RepoRoot`, found from the `.git`
directory), so plain `JaCoCo` already works with the Coverage Gutters extension.

- **Symptom:** setting `OutputFormat` to `'CoverageGutters'` throws an invalid-value error.
- **Fix:** use `JaCoCo` (default) or `Cobertura`.

### `Invoke-Pester` legacy (v4) parameters removed
Only the **Simple** set (`-Path`, `-Output`, `-Container`, `-Tag`, …) and the **Advanced** set
(`-Configuration`) remain. The v4-style parameter set is gone.

- **Symptom:** calls like `Invoke-Pester -Script … -OutputFile … -OutputFormat … -EnableExit
  -CodeCoverage …` fail with a parameter-binding error.
- **Fix:** use a configuration object (the full parameter→config map is in the
  "`Invoke-Pester` parameters → `New-PesterConfiguration`" section of [v4-to-v5.md](v4-to-v5.md)):
  ```powershell
  $config = New-PesterConfiguration
  $config.Run.Path = './tests'
  $config.Run.Exit = $true
  $config.TestResult.Enabled  = $true
  $config.TestResult.OutputPath = 'result.xml'
  $config.TestResult.OutputFormat = 'NUnitXml'
  $config.CodeCoverage.Enabled = $true
  $config.CodeCoverage.Path = './src'
  Invoke-Pester -Configuration $config
  ```

> Config convenience in v6: setting **any** non-default option in the `TestResult` or
> `CodeCoverage` section auto-enables that section, so you no longer have to set `.Enabled = $true`
> separately for a report to be written.

---

## New `Should-*` assertions — optional, NOT part of upgrading

v6 adds a new family of assertions — `Should-Be`, `Should-Throw`, `Should-Invoke`, and ~40 more
(note the hyphen: `Should-Be`, a distinct command, vs. the classic `Should -Be`) — with clearer
failure messages. **You do not need to touch your existing `Should -Be` assertions to upgrade**;
they keep working. Treat any `Should -Be` → `Should-Be` rewrite as a separate, later effort, not
part of this migration. Reference: https://pester.dev/docs/commands/Should-Be.

If you do try them: the new assertions take the actual value from the pipeline or `-Actual`. The
pipeline unwraps input (so `@(1)` becomes `1`, `@()` becomes `$null`, and a collection is
re-collected as `[object[]]`, losing types like `[int[]]`). Use `-Actual` when you need the exact
value or concrete collection type.

---

## v5 → v6 checklist

- [ ] Suite runs green on v5 first (baseline).
- [ ] Running on Windows PowerShell 5.1 or PowerShell 7.4+.
- [ ] `-ForEach`/`-TestCases` that can be empty marked `-AllowNullOrEmptyForEach` (or data fixed).
- [ ] Duplicate `Before*`/`After*` blocks combined.
- [ ] `Assert-MockCalled` → `Should -Invoke`; `Assert-VerifiableMock` → `Should -InvokeVerifiable`.
- [ ] Default `Mock` added wherever calls can miss every `-ParameterFilter`.
- [ ] `Set-ItResult -Pending` → `-Inconclusive`/`-Skipped`.
- [ ] `<...>` test-name templates that should stay literal are backtick-escaped.
- [ ] Each test file is self-contained (no reliance on another file's discovery-time state).
- [ ] `Invoke-Pester` legacy params → `New-PesterConfiguration`.
- [ ] Coverage `OutputFormat` is `JaCoCo`/`Cobertura`; `UseBreakpoints` set only if old numbers needed.
- [ ] Suite green on v6; diff reviewed; committed.
