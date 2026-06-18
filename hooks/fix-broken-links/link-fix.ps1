#!/usr/bin/env pwsh
# fix-broken-links - link-fix.ps1  (PowerShell 7+ port of link-fix.sh)
#
# After the agent edits files (postToolUse): take the files it just changed,
# extract every http(s) URL, and check each one.
#   • With file paths passed (the edited files, injected from the hook payload, or
#     given on the command line) any URL that is not 200 gets spelling variations
#     (http/https, www, trailing slash) then a Copilot CLI agent hand-off for more
#     alternatives, followed by an interactive menu to replace / remove / skip.
#   • With NO file arguments it only lists the broken links - no alternative
#     lookups and no prompts.
# Generic anchor text is flagged as an SEO note either way.
#
# Pure PowerShell + .NET (Invoke-WebRequest/regex), plus an optional Copilot CLI
# hand-off for suggestions.
# Covers: HTML · Markdown · JS/TS · JSON · CSS · SQL · templates (all via URL scan)
# Trigger: postToolUse

Set-StrictMode -Off
$ProgressPreference = 'SilentlyContinue'   # Invoke-WebRequest is far faster without the bar

# The agent hand-off below invokes `copilot`, which may itself re-fire this hook.
# The child run is marked with this env var; exit immediately if it is present so
# we never recurse.
if ($env:FIX_BROKEN_LINKS_AGENT) { exit 0 }

$LIMIT         = 50
$TIMEOUT       = 10
$UA            = 'Mozilla/5.0 (compatible; fix-broken-links/1.0)'
$AGENT_MODEL   = 'gpt-5-mini'   # small, low-token model for the suggestion hand-off
$AGENT_TIMEOUT = 60             # seconds before giving up on the agent
$WEB_RE  = '\.(html?|xhtml|md|markdown|mdx|js|jsx|ts|tsx|vue|svelte|json|jsonl|css|sql|erb|jinja|j2|twig|ejs|pug|hbs)$'

# Positional args become the file list; the hook payload can also supply them.
$ScriptArgs = [System.Collections.Generic.List[string]]::new()
foreach ($a in $args) { [void]$ScriptArgs.Add([string]$a) }

# ── Hook stdin ────────────────────────────────────────────────────────────────
# When called as a postToolUse hook, extract edited files from the JSON payload
# and inject them as positional args so Get-InputFiles picks them up.
$IsHook = $false
if ($ScriptArgs.Count -eq 0 -and [Console]::IsInputRedirected) {
  $IsHook = $true               # invoked as a hook: stdin carries the tool payload
  $raw = [Console]::In.ReadToEnd()
  if ($raw.Trim()) {
    try {
      $json = $raw | ConvertFrom-Json
      $tool = $json.toolName; if (-not $tool) { $tool = $json.tool_name }
      if ($tool) {
        if ($tool -in 'editFiles','edit','write','str_replace_editor','create_file','multiEdit','applyPatch') {
          # Only the files this edit tool just changed - never a wider repo scan.
          $hookFiles = $json.tool_input.files; if (-not $hookFiles) { $hookFiles = $json.toolInput.files }
          if (-not $hookFiles) { $hookFiles = $json.tool_input.path; if (-not $hookFiles) { $hookFiles = $json.toolInput.path } }
          if ($hookFiles) { foreach ($hf in $hookFiles) { [void]$ScriptArgs.Add([string]$hf) } }
        }
        else {
          # Different tool (bash, read, etc.) - nothing to check
          exit 0
        }
      }
      # No tool context - called manually with piped input, fall through
    } catch { }
  }
}

# A non-empty positional list means the caller passed files: the edited files from
# the hook payload above, or paths given on the command line. Only then do we run
# the full repair flow (look up alternatives, then prompt to fix). With no
# parameters we simply list the broken links - no lookups, no prompts.
$HaveParams = $ScriptArgs.Count -gt 0

# Interactive prompts are only possible when input is a real console; once the
# hook JSON has been read from a redirected stdin we report rather than prompt.
$Interactive = [Environment]::UserInteractive -and -not [Console]::IsInputRedirected

function Read-Answer {
  param([string]$Prompt)
  if (-not $Interactive) { return '' }
  [Console]::Out.Write($Prompt)
  $ans = [Console]::In.ReadLine()
  if ($null -eq $ans) { return '' }
  return $ans
}

# ── Helpers ───────────────────────────────────────────────────────────────────

function Get-HttpStatus {
  param([string]$Url)
  try {
    $resp = Invoke-WebRequest -Uri $Url -MaximumRedirection 5 -TimeoutSec $TIMEOUT `
              -UserAgent $UA -ErrorAction Stop
    return [string][int]$resp.StatusCode
  } catch {
    $resp = $_.Exception.Response
    if ($resp -and $resp.StatusCode) { return [string][int]$resp.StatusCode }
    return 'ERR'
  }
}

# Split a URL into scheme/host/path the same way the bash port does (string ops,
# not [uri], so wildcards and odd paths survive intact).
function Split-Url {
  param([string]$Url)
  $scheme = ($Url -split '://',2)[0]
  $rest   = $Url -replace '^[a-zA-Z][a-zA-Z0-9+.-]*://',''
  $hostName = ($rest -split '/',2)[0]
  if ($rest -eq $hostName) { $path = '' } else { $path = '/' + ($rest -split '/',2)[1] }
  [pscustomobject]@{ Scheme = $scheme; Host = $hostName; Path = $path }
}

# Every http(s) URL in a file, trailing punctuation trimmed, de-duplicated.
function Get-Urls {
  param([string]$File)
  $text = [System.IO.File]::ReadAllText($File)
  [regex]::Matches($text, 'https?://[^"''<> )]+', 'IgnoreCase') |
    ForEach-Object { $_.Value -replace '[.,;:]+$','' } |
    Sort-Object -Unique
}

# Generic anchor text that weakens SEO.
function Get-SeoIssues {
  param([string]$File)
  $text = [System.IO.File]::ReadAllText($File)
  $reA = '<a[^>]*>\s*(click here|click|here|read more|more|this page|this|learn more|see more|view|visit|details|info)\s*</a>'
  $reB = '\[(click here|click|here|read more|more|this page|learn more|see more|details|info)\]\('
  @([regex]::Matches($text, $reA, 'IgnoreCase')) +
  @([regex]::Matches($text, $reB, 'IgnoreCase')) | ForEach-Object { $_.Value }
}

# Try common URL variations; return the first that returns 200, else ''.
function Find-Variation {
  param([string]$Url)
  $p = Split-Url $Url
  $scheme = $p.Scheme; $hostName = $p.Host; $path = $p.Path
  $cands = [System.Collections.Generic.List[string]]::new()
  if ($scheme -eq 'http')  { [void]$cands.Add("https://$hostName$path") }
  if ($scheme -eq 'https') { [void]$cands.Add("http://$hostName$path") }
  if ($hostName -like 'www.*') { [void]$cands.Add("$scheme`://$($hostName.Substring(4))$path") }
  else                         { [void]$cands.Add("$scheme`://www.$hostName$path") }
  if ($path -and $path -notmatch '/$' -and (($path -split '/')[-1]) -notmatch '\.') {
    [void]$cands.Add(($Url -replace '/$','') + '/')
  }
  foreach ($c in $cands) {
    if ($c -eq $Url) { continue }
    if ((Get-HttpStatus $c) -eq '200') { return $c }
  }
  return ''
}

# Hand the broken link to the Copilot CLI agent and let it propose alternatives.
# A deliberately lightweight, low-token hand-off: one non-interactive prompt to a
# small model with no tools enabled (so it answers from its own knowledge - no web
# fetches, no permission prompts, no archive lookups on our side). The model may
# prefix a prose line, so we pull http(s) tokens from anywhere in the output, trim
# trailing punctuation, drop the broken URL itself, and de-duplicate. The call runs
# as a job so it can be capped at $AGENT_TIMEOUT seconds.
function Get-AgentAlts {
  param([string]$Url,[int]$Max)
  if (-not (Get-Command copilot -ErrorAction SilentlyContinue)) { return @() }
  $snappy = $AGENT_TIMEOUT - 5
  $prompt = "In under $snappy seconds, find up to $Max working alternative URLs for the broken link $Url. Hierarchically consider 1. Path and/or page spelling; 2. web.archive.org/wayback; 3. Redirects using redirect destination; 4. The context of the link's text; in order to resolve. Output only the URLs. One per line, and no: prose, numbering, markdown, backticks, special characters, post formatting."
  $out = ''
  try {
    # FIX_BROKEN_LINKS_AGENT marks the child run so a re-entrant hook exits early.
    $job = Start-Job -ScriptBlock {
      param($Prompt, $Model)
      $env:FIX_BROKEN_LINKS_AGENT = '1'
      copilot -p $Prompt -s --no-color --model $Model --available-tools 2>$null
    } -ArgumentList $prompt, $AGENT_MODEL
    # Only read output from a job that completed cleanly; a failed/errored copilot
    # run yields no alternatives.
    if ((Wait-Job $job -Timeout $AGENT_TIMEOUT) -and $job.State -eq 'Completed') {
      $out = (Receive-Job $job -ErrorAction SilentlyContinue | Out-String)
    }
    Remove-Job $job -Force -ErrorAction SilentlyContinue
  } catch { $out = '' }
  if (-not $out) { return @() }

  $seen = @{}
  $result = [System.Collections.Generic.List[string]]::new()
  foreach ($m in [regex]::Matches($out, 'https?://[^\s"''<>)\]]+', 'IgnoreCase')) {
    if ($result.Count -ge $Max) { break }
    $u = $m.Value -replace '[.,;:]+$',''
    $key = $u.ToLower()
    if ($key -eq $Url.ToLower()) { continue }
    if ($seen.ContainsKey($key)) { continue }
    $seen[$key] = $true
    [void]$result.Add($u)
  }
  return ,$result.ToArray()
}

# Up to MAX viable replacement URLs for a broken link, best first:
#   1. a working scheme/www/slash variation (verified live 200)
#   2. alternatives proposed by the Copilot CLI agent (see Get-AgentAlts)
# De-duplicated case-insensitively. The first item is what `r` uses; the rest
# become the numbered alternatives.
function Get-SuggestedAlts {
  param([string]$Url,[int]$Max = 6)
  $seen = @{}
  $out  = [System.Collections.Generic.List[string]]::new()

  $v = Find-Variation $Url
  if ($v) { [void]$out.Add($v); $seen[$v.ToLower()] = $true }

  foreach ($a in (Get-AgentAlts $Url $Max)) {
    if ($out.Count -ge $Max) { break }
    if (-not $a) { continue }
    $key = $a.ToLower()
    if ($seen.ContainsKey($key)) { continue }
    [void]$out.Add($a); $seen[$key] = $true
  }
  return ,$out.ToArray()
}

# Replace a literal URL everywhere in a file (plain string replace, no regex).
function Set-UrlReplacement {
  param([string]$File,[string]$Old,[string]$New)
  $content = [System.IO.File]::ReadAllText($File)
  [System.IO.File]::WriteAllText($File, $content.Replace($Old, $New))
}

# Remove the link wrapper but keep the visible text:
#   <a href="URL">text</a>  ->  text
#   [text](URL)             ->  text
function Remove-LinkWrapper {
  param([string]$File,[string]$Url)
  $content = [System.IO.File]::ReadAllText($File)
  $esc = [regex]::Escape($Url)
  # Each element is parenthesized: the comma operator binds tighter than '+', so
  # without the parens the three concatenations collapse into a single string and
  # the array would hold one bogus pattern instead of three.
  $patterns = @(
    ('<a[^>]*href="' + $esc + '"[^>]*>([^<]*)</a>'),
    ("<a[^>]*href='" + $esc + "'[^>]*>([^<]*)</a>"),
    ('\[([^\]]*)\]\(' + $esc + '[^)]*\)')
  )
  foreach ($pat in $patterns) {
    $content = [regex]::Replace($content, $pat, '$1', 'IgnoreCase')
  }
  [System.IO.File]::WriteAllText($File, $content)
}

# ── File discovery ────────────────────────────────────────────────────────────

function Get-InputFiles {
  if ($ScriptArgs.Count -gt 0) { return $ScriptArgs.ToArray() }
  # Fired as a hook but the payload carried no (web) files: do nothing rather than
  # fall back to scanning unrelated files - the hook only ever checks edited files.
  if ($IsHook) { return @() }
  $out = @()
  if (Get-Command git -ErrorAction SilentlyContinue) {
    git rev-parse --git-dir *> $null
    if ($LASTEXITCODE -eq 0) {
      $out = @(git diff --name-only HEAD 2>$null) + @(git diff --name-only --cached 2>$null)
    }
  }
  if ($out.Count -gt 0) { return $out }
  Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '[\\/](\.git|node_modules|dist|build|\.next|\.venv|__pycache__)[\\/]' } |
    ForEach-Object { Resolve-Path -Relative -LiteralPath $_.FullName }
}

$seenFiles = @{}
$FILES = [System.Collections.Generic.List[string]]::new()
foreach ($f in (Get-InputFiles)) {
  if (-not $f) { continue }
  $f = ([string]$f).Trim()
  if (-not (Test-Path -LiteralPath $f -PathType Leaf)) { continue }
  if ($f -match '[\\/](node_modules|\.git|dist|build)[\\/]') { continue }
  if ($f -notmatch $WEB_RE) { continue }
  if ($seenFiles.ContainsKey($f)) { continue }
  $seenFiles[$f] = $true
  [void]$FILES.Add($f)
}

if ($FILES.Count -eq 0) { exit 0 }

# ── Scan ──────────────────────────────────────────────────────────────────────

$B_FILE   = [System.Collections.Generic.List[string]]::new()
$B_URL    = [System.Collections.Generic.List[string]]::new()
$B_STATUS = [System.Collections.Generic.List[string]]::new()
$B_ALT    = [System.Collections.Generic.List[object]]::new()
$SEO_LINES = [System.Collections.Generic.List[string]]::new()

foreach ($file in $FILES) {
  foreach ($line in (Get-SeoIssues $file)) {
    if ($line) { [void]$SEO_LINES.Add("${file}: $line") }
  }

  $urls = @(Get-Urls $file)
  if ($urls.Count -eq 0) { continue }

  if ($HaveParams -and $urls.Count -gt $LIMIT) {
    $ans = Read-Answer "  $file has $($urls.Count) links (limit $LIMIT). Continue? [Y/n] "
    if ($ans -in 'n','N','no','NO') { continue }
  }

  Write-Host ""
  Write-Host "  Checking $($urls.Count) link(s) in $file ..."
  foreach ($url in $urls) {
    $status = Get-HttpStatus $url
    if ($status -eq '200') { continue }
    Write-Host "    BROKEN ($status) $url"
    # Only look up replacements when files were passed; otherwise just list.
    $alts = @()
    if ($HaveParams) { $alts = Get-SuggestedAlts $url 6 }
    [void]$B_FILE.Add($file)
    [void]$B_URL.Add($url)
    [void]$B_STATUS.Add($status)
    [void]$B_ALT.Add($alts)
  }
}

# ── SEO report ────────────────────────────────────────────────────────────────

if ($SEO_LINES.Count -gt 0) {
  Write-Host ""
  Write-Host "------------------------------------------------------------"
  Write-Host "  SEO anchor issues (consider descriptive link text)"
  foreach ($s in $SEO_LINES) { Write-Host "    $s" }
}

if ($B_URL.Count -eq 0) {
  Write-Host ""
  Write-Host "  No broken links found."
  Write-Host ""
  exit 0
}

# ── Interactive fix ───────────────────────────────────────────────────────────

Write-Host ""
Write-Host "============================================================"
Write-Host "  fix-broken-links report"
Write-Host "============================================================"

$CHANGED = @{}
$n = $B_URL.Count
for ($i = 0; $i -lt $n; $i++) {
  $file   = $B_FILE[$i]
  $url    = $B_URL[$i]
  $status = $B_STATUS[$i]
  $alts   = @($B_ALT[$i])

  Write-Host ""
  Write-Host "  [$($i + 1)] $file"
  Write-Host "    URL : $url"
  $note = ''
  if ($status -in 'ERR','000','TIMEOUT') { $note = '  (unreachable)' }
  Write-Host "    HTTP: $status$note"

  # No file parameters → report-only: list the broken link and move on.
  if (-not $HaveParams) { continue }

  Write-Host ""
  if ($alts.Count -gt 0) {
    Write-Host "    r  Replace -> $($alts[0])"
    for ($k = 1; $k -lt $alts.Count; $k++) {
      Write-Host "    $k  Replace -> $($alts[$k])"
    }
  }
  Write-Host "    d  Remove link, keep text"
  Write-Host "    c  Custom replacement URL"
  Write-Host "    s  Skip"

  if (-not $Interactive) {
    Write-Host "    (no terminal - reporting only)"
    continue
  }

  while ($true) {
    $ch = Read-Answer '  > '
    if ($ch -eq 's' -or $ch -eq '') { break }
    elseif ($ch -eq 'd') {
      Remove-LinkWrapper $file $url; $CHANGED[$file] = $true; Write-Host "    removed"; break
    }
    elseif ($ch -eq 'r') {
      if ($alts.Count -gt 0) {
        Set-UrlReplacement $file $url $alts[0]; $CHANGED[$file] = $true
        Write-Host "    replaced -> $($alts[0])"; break
      }
      Write-Host "    no suggestion available"
    }
    elseif ($ch -match '^[1-9]$') {
      $idx = [int]$ch
      if ($idx -lt $alts.Count) {
        Set-UrlReplacement $file $url $alts[$idx]; $CHANGED[$file] = $true
        Write-Host "    replaced -> $($alts[$idx])"; break
      }
      Write-Host "    invalid choice"
    }
    elseif ($ch -eq 'c') {
      $u = Read-Answer '  URL: '
      if ($u) { Set-UrlReplacement $file $url $u; $CHANGED[$file] = $true; Write-Host "    replaced"; break }
    }
    else {
      Write-Host "    invalid choice"
    }
  }
}

if ($CHANGED.Count -gt 0) {
  Write-Host ""
  Write-Host "  $($CHANGED.Count) file(s) updated:"
  foreach ($f in $CHANGED.Keys) { Write-Host "    $f" }
  Write-Host ""
}
exit 0
