---
name: pester-migration
description: 'Experimental (preview) Pester migration skill for upgrading PowerShell Pester test suites across major versions — v3→v4, v4→v5, and v5→v6. The v5→v6 path tracks Pester 6, which is still a release candidate, so that guidance may change. Covers the Discovery/Run two-phase model, moving setup into BeforeAll, $PSScriptRoot vs $MyInvocation, mock changes (Assert-MockCalled → Should -Invoke, removed fall-through), Invoke-Pester parameters → PesterConfiguration, data-driven -ForEach/-TestCases, and the v6 breaking changes. Use when the user asks to upgrade, migrate, or modernize Pester tests, fix *.Tests.ps1 files that broke after bumping the Pester version, or convert legacy Should / Invoke-Pester syntax.'
---

# Pester Migration

> **Experimental / preview.** The **v5→v6** guidance tracks Pester 6 while it is a release
> candidate and may change; verify against the current
> [release notes](https://github.com/pester/Pester/releases). v3→v4 and v4→v5 cover stable releases.

Pester is the test framework for PowerShell. Test files end in `*.Tests.ps1` and use
`Describe` / `Context` / `It` blocks with `Should` assertions. This skill upgrades an existing
suite from one major Pester version to the next and gets it green again.

> **Mental model:** each major jump has a different character. **v3→v4** is mostly a syntax
> rename. **v4→v5** is a *fundamental runtime change* (the Discovery/Run split) and is the hard
> one. **v5→v6** is largely backwards-compatible — a handful of previously-deprecated things now
> throw. Migrate **one major at a time**; never skip a version.

Detailed, symptom-driven guides live in `references/` — load the one(s) for the jump you are doing.

## References

| Reference | When to load |
|---|---|
| [v3-to-v4.md](references/v3-to-v4.md) | `Should Be` → `Should -Be`, `Contain` → `FileContentMatch`, `Assert-VerifiableMocks` → `Assert-VerifiableMock`, array-assertion edge cases. |
| [v4-to-v5.md](references/v4-to-v5.md) | The big one. Discovery/Run phases, `BeforeAll` setup, `$PSScriptRoot`, `BeforeDiscovery`, `-ForEach`, mock scoping, `Should -Throw` wildcards, `Invoke-Pester` → `New-PesterConfiguration`. |
| [v5-to-v6.md](references/v5-to-v6.md) | PowerShell 5.1/7.4+ only, per-file discovery+run, empty `-ForEach` throws, duplicate setup blocks throw, name `<...>` templates evaluate, `Assert-MockCalled` removed, mocks no longer fall through, code-coverage tracer, legacy `Invoke-Pester` params removed. |

Canonical source: the official migration guides at https://pester.dev/docs/migrations/ — this skill
mirrors them. When in doubt, prefer the website.

## Step 0 — Detect where you are and where you're going

Find the installed version(s) and the version the **tests** were written for. These can differ.

```powershell
# Installed Pester version(s) on this machine
Get-Module Pester -ListAvailable | Select-Object Name, Version, Path

# Version currently imported in the session
(Get-Module Pester).Version
```

Tell the source version from the **test code** with these heuristics:

| You see in `*.Tests.ps1` / build scripts | Suite was written for |
|---|---|
| `Should Be` / `Should Contain` (no dash) | v3 or earlier → start at [v3-to-v4](references/v3-to-v4.md) |
| `$MyInvocation.MyCommand.Path` + dot-source at the **top** of the file; arbitrary code directly under `Describe` | v4 → [v4-to-v5](references/v4-to-v5.md) |
| `Assert-MockCalled`, `Assert-VerifiableMock`, `Set-ItResult -Pending` | v4 / early-v5 (these are **removed in v6**) |
| `Invoke-Pester -Script … -OutputFile … -CodeCoverage …` (legacy params) | v4 invocation → map to config |
| `BeforeAll { . $PSScriptRoot/… }`, `New-PesterConfiguration`, `Should -Invoke` | already v5-style → [v5-to-v6](references/v5-to-v6.md) |

Install the target version when ready:

```powershell
# Latest stable v5 — pin the major so this keeps installing v5 even after v6 goes GA
Install-Module Pester -MaximumVersion 5.99.99 -Force

# Pester 6 (currently a release candidate — needs -AllowPrerelease)
Install-Module Pester -AllowPrerelease -Force
```

> On **Windows PowerShell 5.1** the OS ships a Microsoft-signed built-in Pester 3 that PowerShellGet
> won't overwrite with the differently-signed newer Pester — add `-SkipPublisherCheck` there to
> install side-by-side. Not needed on PowerShell 7+. See
> https://pester.dev/docs/introduction/installation.

## Migration workflow

Run this loop for each major jump. **Do not jump two majors at once** — go v4→v5, then v5→v6.

1. **Baseline.** Run the suite on the **current** version first and record pass/fail. You need a
   known-good (or known) starting point so you can tell migration regressions apart from
   pre-existing failures.
   ```powershell
   # Bare Invoke-Pester works on every major; exact parameters differ
   # (v3/v4: -Script/-OutputFile; v5+/v6: -Path/-Output).
   Invoke-Pester
   ```
2. **Read the reference** for this jump (table above) so you know the full scope before editing.
3. **Edit file by file.** Apply the mechanical changes (see per-jump cheat sheets below and in the
   reference). Keep changes small and reviewable — one file or one concern at a time.
4. **Switch versions** with `Install-Module` (Step 0), then re-import: `Remove-Module Pester;
   Import-Module Pester` (or start a fresh session).
5. **Run and fix.** Re-run with `-Output Detailed`; use `-Output Diagnostic` (v4→v5) or read the
   explicit v6 error messages to locate problems. Match each failure to the **symptom → fix**
   tables in the reference.
6. **Green, diff, commit.** Re-run until the result matches the baseline (or better). Review the
   diff, then commit. Migrating in small commits makes regressions trivial to bisect.

## What actually changes (scope per jump)

| Jump | Difficulty | Nature |
|---|---|---|
| v3 → v4 | Low | Assertion-syntax rename (`Should -Be`). Largely script-automatable. |
| v4 → v5 | **High** | New two-phase runtime. Test **structure** changes: setup must move into `BeforeAll`, discovery-time code into `BeforeDiscovery`, file location via `$PSScriptRoot`. Not a pure find-replace. |
| v5 → v6 | Low–Medium | Backwards-compatible runtime; deprecated features now throw. Mostly small, targeted fixes. Your `Should -Be` assertions keep working unchanged. |

## Quick cheat sheets

### v4 → v5 (most common fixes)
```powershell
# 1. Move file import into BeforeAll, use $PSScriptRoot (NOT $MyInvocation.MyCommand.Path)
# BEFORE
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$here\Get-Thing.ps1"
# AFTER
BeforeAll { . $PSScriptRoot/Get-Thing.ps1 }

# 2. Any code that DISCOVERS/generates tests must be in BeforeDiscovery
BeforeDiscovery { $cases = Get-Content $PSScriptRoot/cases.json | ConvertFrom-Json }

# 3. Should -Throw matches with -like wildcards, not .Contains
{ throw 'a long message' } | Should -Throw '*long*'

# 4. Invoke-Pester legacy params → New-PesterConfiguration (see reference for full map)
```
Full details, scoping rules, and the parameter→config table: [references/v4-to-v5.md](references/v4-to-v5.md).

### v5 → v6 (most common fixes)
```powershell
# 1. Mock assertions: removed verbs — rename (old -> new):
#    Assert-MockCalled     -> Should -Invoke
#    Assert-VerifiableMock -> Should -InvokeVerifiable
Should -Invoke Get-Thing -Times 1 -Exactly
Should -InvokeVerifiable

# 2. Add a default mock — unmatched calls no longer run the real command
Mock Get-Thing { 'default' }
Mock Get-Thing -ParameterFilter { $Name -eq 'a' } -MockWith { 'a' }

# 3. Empty/$null -ForEach now throws; allow it only where empty is expected
Describe 'Optional' -ForEach $cases -AllowNullOrEmptyForEach { }

# 4. Combine duplicate BeforeAll/BeforeEach/AfterAll/AfterEach in the same block into one
```
Full breaking-change list with symptoms and fixes: [references/v5-to-v6.md](references/v5-to-v6.md).

## Safety rules

- **Tests are the spec.** Migration must not change what a test asserts — only how the suite is
  structured and invoked. If a test starts passing/failing differently for any reason other than a
  documented breaking change, investigate before accepting it.
- **Automated migration scripts produce false positives.** The community scripts (linked in the
  references) help with `Should` syntax and dot-sourcing, but always review the diff and re-run the
  suite afterward. Never bulk-edit and commit unchecked.
- **Mind file encoding** when scripting replacements over `*.Tests.ps1` — preserve the original
  encoding (UTF-8 vs ASCII) so you don't mangle non-ASCII test names.
- **Work on a branch, commit per file/concern.** Small commits keep `git bisect` useful if a
  migrated test goes red later.
