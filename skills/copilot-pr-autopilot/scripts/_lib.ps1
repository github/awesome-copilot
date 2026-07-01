# Shared helpers for copilot-pr-autopilot scripts.
# Dot-source with: `. "$PSScriptRoot/_lib.ps1"`
#
# Dot-sourcing runs the prerequisite check below; if `gh` is missing or
# unauthenticated the script halts BEFORE doing any work, with a single
# actionable error message the calling agent can pattern-match on.
#
# Compatibility: Windows PowerShell 5.1+ and PowerShell 7+. Uses only
# `& gh @args 2>$tempFile` for stdout/stderr separation — avoids
# `System.Diagnostics.ProcessStartInfo.ArgumentList` which is .NET
# Core / .NET 5+ only and returns $null on .NET Framework.

# Canonical Copilot Code Review reviewer login regex.
# GraphQL exposes the login as either `copilot-pull-request-reviewer` (when
# referenced via `requestedReviewer.login`) or `copilot-pull-request-reviewer[bot]`
# (when referenced via review `author.login`), so callers must accept both.
# Centralised here so all step scripts (01 / 02 / 10) stay in sync — if the
# canonical login ever changes, change it once.
#
# Namespaced (`CopilotPrAutopilot_` prefix) + read-only because `_lib.ps1` is
# dot-sourced into the caller's scope; a bare name like `$CopilotLoginRegex`
# would risk colliding with caller-side variables. `Set-Variable -Force` lets
# us re-dot-source in the same session without erroring on the read-only flag.
# A back-compat alias `$CopilotReviewerLoginRegex` is preserved so callers
# don't have to type the prefix on every read site (and so older snapshots of
# 01/02/10 keep working).
Set-Variable -Name 'CopilotPrAutopilot_CopilotReviewerLoginRegex' `
    -Value '(?i)^copilot-pull-request-reviewer(\[bot\])?$' `
    -Option ReadOnly -Force -Scope Script
Set-Variable -Name 'CopilotReviewerLoginRegex' `
    -Value $CopilotPrAutopilot_CopilotReviewerLoginRegex `
    -Option ReadOnly -Force -Scope Script

# Prerequisite check: gh CLI installed AND authenticated.
# Fails fast with install/login instructions. Idempotent (once per
# PowerShell session).
function Assert-GhReady {
    if ($script:_GhReady) { return }

    # 1. Installed?
    $cmd = Get-Command gh -ErrorAction SilentlyContinue
    if (-not $cmd) {
        throw @'
copilot-pr-autopilot: prerequisite missing — `gh` CLI is not on PATH.

Install (one of):
  - winget install --id GitHub.cli           (Windows)
  - brew install gh                          (macOS)
  - sudo apt install gh                      (Debian/Ubuntu — see https://cli.github.com for other distros)
  - https://cli.github.com/                  (universal installer + download)

Then `gh auth login` and re-run this command.
'@
    }

    # 2. Authenticated? `gh auth status` exits non-zero when no account
    # is logged in. Capture stderr to a temp file via the `2>` redirect.
    $errFile = [IO.Path]::GetTempFileName()
    try {
        $null = & gh auth status 2>$errFile
        $ec = $LASTEXITCODE
        if ($ec -ne 0) {
            $err = ''
            if (Test-Path -LiteralPath $errFile) {
                $err = (Get-Content -Raw -LiteralPath $errFile -ErrorAction SilentlyContinue)
                if ($null -eq $err) { $err = '' }
            }
            throw @"
copilot-pr-autopilot: prerequisite missing — ``gh`` CLI is not authenticated.

Run:
  gh auth login

Then re-run this command.

``gh auth status`` reported:
  $($err.Trim())
"@
        }
    } finally {
        if (Test-Path -LiteralPath $errFile) {
            Remove-Item -LiteralPath $errFile -ErrorAction SilentlyContinue
        }
    }

    $script:_GhReady = $true
}

# Single-invocation gh wrapper. Captures stdout + stderr separately
# via the `2>` redirect to a temp file. Returns ExitCode/Stdout/Stderr
# so callers never have to re-invoke `gh` just to recover stderr, and
# never feed stderr into `ConvertFrom-Json` on success.
#
# Note on -WhatIf: PowerShell's `2>` redirect goes through Out-File,
# which respects $WhatIfPreference at the caller scope. The bundled
# `10-cleanup-outdated.ps1` therefore uses an explicit `-DryRun`
# switch instead of [CmdletBinding(SupportsShouldProcess)], so this
# helper never sees a leaked WhatIfPreference and never prints
# "Performing the operation Output to File" noise.
function Invoke-Gh {
    param([Parameter(Mandatory)][string[]]$GhArgs)

    # Cross-version safety: Windows PowerShell 5.1's native-command
    # argument passer mangles arguments that contain embedded double-quote
    # characters (long-standing bug, only fully fixed in PS 7.3+ via
    # $PSNativeCommandArgumentPassing). GraphQL queries/mutations routinely
    # embed quoted strings (comments, default values, enum-like literals
    # such as `["copilot-pull-request-reviewer"]`), so passing them as
    # command-line values (`-f field=<body>`) round-trips correctly in
    # pwsh 7 but silently mis-splits under 5.1 (e.g., gh CLI reports
    # "accepts 1 arg(s), received 7" or 'Expected type "number", but it
    # was malformed: "-pull"'). To work identically in both runtimes, any
    # `-f field=<body>` or `-F field=<body>` pair whose body contains `"`
    # is rewritten to `-F field=@<tempfile>` (the body is written to disk
    # first; `gh` reads it from the file and the value never appears on
    # the command line).
    #
    # IMPORTANT typing note (verified live with gh api graphql):
    #   * `gh -F field=@<file>` reads the file content and applies type
    #     inference (digit→Number, true/false→Boolean, null→null, else
    #     String).
    #   * `gh -f field=@<file>` does NOT expand `@<file>` — it sends the
    #     literal string `@<file>` as the value (gh's `-f` skips the @
    #     prefix entirely). So `-f` is NOT a viable tempfile carrier;
    #     the rewrite MUST use `-F`.
    #
    # Safety of the unconditional rewrite-to-`-F`:
    #   * Query bodies (large GraphQL strings) never look like Number /
    #     Boolean / null after inference, so they round-trip as String.
    #   * Reply bodies typed by humans (08-reply-and-resolve) almost
    #     never look like exactly `"true"`, `"false"`, `"null"`, or a
    #     bare digit run — and if they do AND they also contain `"`
    #     (the rewrite trigger), the resulting coercion would be a
    #     loud GraphQL `String!` type error, not silent data loss.
    # Tempfiles are cleaned up in `finally`.
    $rewritten = [System.Collections.Generic.List[string]]::new()
    $tempFiles = [System.Collections.Generic.List[string]]::new()
    for ($i = 0; $i -lt $GhArgs.Count; $i++) {
        $a = $GhArgs[$i]
        # Rewrite both `-f field=<body>` and `-F field=<body>` whose body
        # contains `"` — same PS 5.1 native-arg splitting bug applies to
        # both. The rewrite ALWAYS emits `-F` because `gh -f field=@file`
        # does not expand `@file` (only `-F` does — verified live). The
        # file content is then sent as a String GraphQL variable for any
        # body that doesn't look like a Number/Boolean/null (i.e., every
        # real-world query body and reply body in this skill).
        if (($a -eq '-f' -or $a -eq '-F') -and ($i + 1) -lt $GhArgs.Count) {
            $next = $GhArgs[$i + 1]
            $eqIdx = $next.IndexOf('=')
            if ($eqIdx -gt 0 -and $next.Substring($eqIdx + 1).Contains('"')) {
                $field = $next.Substring(0, $eqIdx)
                $body  = $next.Substring($eqIdx + 1)
                $tf = [IO.Path]::GetTempFileName()
                [void]$tempFiles.Add($tf)
                # UTF-8 without BOM so `gh` reads the body verbatim
                [IO.File]::WriteAllText($tf, $body, [System.Text.UTF8Encoding]::new($false))
                [void]$rewritten.Add('-F')
                [void]$rewritten.Add("$field=@$tf")
                $i++
                continue
            }
        }
        [void]$rewritten.Add($a)
    }

    $errFile = [IO.Path]::GetTempFileName()
    try {
        $finalArgs = $rewritten.ToArray()
        # Localise $ErrorActionPreference to 'Continue' around the native
        # `gh` call. Why: callers set `$ErrorActionPreference = 'Stop'` at
        # script scope, and under PowerShell 5.1 that combination converts
        # any line `gh` writes to stderr into a `NativeCommandError` that
        # aborts the script BEFORE we get to inspect `$LASTEXITCODE`. PS 7+
        # changed native-stderr handling and is unaffected. By keeping the
        # native call at 'Continue' we always return the
        # `@{ExitCode;Stdout;Stderr}` object on both runtimes, so callers
        # see the same structured error and can emit the same actionable
        # message (e.g. the "click UI 🔄" guidance in 01-request-review).
        $prevEAP = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            $out = & gh @finalArgs 2>$errFile
            $ec = $LASTEXITCODE
        } finally {
            $ErrorActionPreference = $prevEAP
        }
        $err = ''
        if (Test-Path -LiteralPath $errFile) {
            $err = (Get-Content -Raw -LiteralPath $errFile -ErrorAction SilentlyContinue)
            if ($null -eq $err) { $err = '' }
        }
        # Preserve gh's stdout content without PowerShell formatting.
        # `Out-String` would append a trailing newline and apply console
        # formatting widths, which can subtly break callers that
        # regex/JSON-parse the result. `& gh` returns one array entry per
        # line (with the line terminator already stripped); we re-join with
        # "`n" and no trailing newline, so the result is content-preserving
        # but normalized to LF (not byte-identical to the original stream).
        # Callers add a trailing newline if they need one.
        $stdout = if ($null -eq $out) { '' }
                  elseif ($out -is [string]) { $out }
                  else { ($out | ForEach-Object { [string]$_ }) -join "`n" }
        [pscustomobject]@{ ExitCode = $ec; Stdout = $stdout; Stderr = $err }
    } finally {
        if (Test-Path -LiteralPath $errFile) {
            Remove-Item -LiteralPath $errFile -ErrorAction SilentlyContinue
        }
        foreach ($tf in $tempFiles) {
            if ($tf -and (Test-Path -LiteralPath $tf)) {
                Remove-Item -LiteralPath $tf -ErrorAction SilentlyContinue
            }
        }
    }
}

# Wrap ConvertFrom-Json so a non-JSON / empty stdout failure carries
# the calling $Context plus trimmed stdout/stderr — without this
# callers see a bare "Unexpected character encountered" exception
# that doesn't say which gh command produced the bad output.
# Centralised so the preview limits + format stay consistent across
# Invoke-GhGraphQL, Resolve-RepoCoords, and any future call sites.
function ConvertFrom-GhJson {
    param(
        [Parameter(Mandatory)][AllowEmptyString()][AllowNull()][string]$Stdout,
        [AllowEmptyString()][AllowNull()][string]$Stderr,
        [Parameter(Mandatory)][string]$Context,
        [int]$PreviewChars = 500
    )
    try {
        # Use -InputObject (not pipeline form `$Stdout | ConvertFrom-Json`):
        # on Windows PowerShell 5.1, returning the pipeline form from inside
        # a function preserves the parsed array as a single object rather
        # than unrolling it. Callers then see `.Count == 1` for a JSON
        # array of N items, and `$result[0]` is the inner array. The
        # parameter form returns the same parsed structure but PowerShell
        # 5.1 unrolls it correctly on function return.
        return (ConvertFrom-Json -InputObject $Stdout -ErrorAction Stop)
    } catch {
        $stdoutPreview = if ($Stdout) { $Stdout.Substring(0, [Math]::Min($PreviewChars, $Stdout.Length)) } else { '(empty)' }
        $stderrPreview = if ($Stderr) { $Stderr.Substring(0, [Math]::Min($PreviewChars, $Stderr.Length)) } else { '(empty)' }
        throw "$Context returned non-JSON: $($_.Exception.Message)`nstdout (<=${PreviewChars} chars): $stdoutPreview`nstderr (<=${PreviewChars} chars): $stderrPreview"
    }
}

# Wrapper around Invoke-Gh for `gh api graphql` that throws on either
# non-zero exit OR a GraphQL `errors` array in the response body.
# Cross-version safety for embedded quotes in queries is handled by
# Invoke-Gh's automatic `-f field=<body-with-quotes>` → tempfile rewrite.
function Invoke-GhGraphQL {
    param(
        [Parameter(Mandatory)][string[]]$GhArgs,
        [Parameter(Mandatory)][string]$Context
    )
    $r = Invoke-Gh -GhArgs (@('api','graphql') + $GhArgs)
    if ($r.ExitCode -ne 0) {
        throw "gh api graphql failed (exit $($r.ExitCode)) [$Context]: $($r.Stderr)"
    }
    $data = ConvertFrom-GhJson -Stdout $r.Stdout -Stderr $r.Stderr -Context "gh api graphql [$Context]"
    if ($data.errors) {
        # Aggregate type + path + extensions.code alongside .message so
        # callers see actionable failures without re-running with extra
        # logging. GitHub commonly returns type=NOT_FOUND / FORBIDDEN /
        # RATE_LIMITED and extensions.code=undefinedField etc.; dropping
        # them turns a clear failure ("FORBIDDEN at /repository/pullRequest")
        # into an opaque message-only string.
        $msgs = ($data.errors | ForEach-Object {
            $parts = New-Object System.Collections.Generic.List[string]
            if ($_.type) { $parts.Add("type=$($_.type)") }
            if ($_.path) { $parts.Add("path=$(($_.path) -join '/')") }
            if ($_.extensions -and $_.extensions.code) { $parts.Add("code=$($_.extensions.code)") }
            $parts.Add("message=$($_.message)")
            ($parts -join ' ')
        }) -join '; '
        throw "GraphQL errors [$Context]: $msgs"
    }
    $data
}

# Auto-resolve owner/repo from gh's local context when caller didn't pass them.
# Both-or-neither contract: passing exactly one of -Owner/-Repo is rejected,
# because mixing a caller-supplied owner with a locally-detected repo (or vice
# versa) silently constructs a non-existent or unintended `<Owner>/<Repo>` pair.
function Resolve-RepoCoords {
    param([string]$Owner, [string]$Repo)
    if ([bool]$Owner -ne [bool]$Repo) {
        throw "Resolve-RepoCoords: pass both -Owner and -Repo, or neither (got Owner='$Owner' Repo='$Repo'). Partial override would silently mix caller and local repo coordinates."
    }
    if ($Owner -and $Repo) { return @{ Owner = $Owner; Repo = $Repo } }
    $r = Invoke-Gh -GhArgs @('repo','view','--json','owner,name')
    if ($r.ExitCode -ne 0) {
        throw "gh repo view failed (exit $($r.ExitCode)): $($r.Stderr). Pass -Owner and -Repo explicitly, or run from inside a gh-detected repo."
    }
    $info = ConvertFrom-GhJson -Stdout $r.Stdout -Stderr $r.Stderr -Context 'gh repo view'
    if (-not ($info -and $info.owner -and $info.owner.login -and $info.name)) {
        throw "gh repo view returned unexpected shape (missing owner.login or name); cannot auto-resolve repo coordinates. Pass -Owner and -Repo explicitly."
    }
    @{ Owner = $info.owner.login; Repo = $info.name }
}

# Format-IsoUtcString — centralise the ISO-8601 UTC normalisation that
# 01-request-review.ps1 (events.created_at), 02-check-review-status.ps1
# (reviews.submittedAt), and 03-list-open-threads.ps1 (comments.createdAt)
# all need to perform. `ConvertFrom-Json` auto-deserialises ISO timestamps
# to `[datetime]`, whose default `.ToString()` is culture-dependent and
# NOT round-trippable as ISO-8601. Calling `.ToUniversalTime().ToString(
# 'yyyy-MM-ddTHH:mm:ssZ')` keeps the on-wire JSON contract identical to
# the value GitHub originally sent. If the value is already a string
# (e.g., gh returned a raw JSON string), we pass it through verbatim. If
# it's null or empty, we return ''.
function Format-IsoUtcString {
    param($Value)
    if ($null -eq $Value) { return '' }
    if ($Value -is [datetime]) { return $Value.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ') }
    return [string]$Value
}

# Run the prerequisite check as a side-effect of dot-sourcing.
Assert-GhReady
