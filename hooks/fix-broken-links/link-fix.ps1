#!/usr/bin/env pwsh
# fix-broken-links — link-fix.ps1  (PowerShell 7+ port of link-fix.sh)
#
# Before each Copilot prompt: find changed web files, extract every http(s) URL,
# and check each one. For any URL that does not return 200, try spelling
# variations (http/https, www, trailing slash), then Wayback Machine sibling
# pages / snapshots, and present an interactive menu to replace (with up to five
# alternatives), remove (keep anchor text), or skip. Generic anchor text is
# flagged as an SEO note.
#
# Pure PowerShell + .NET (Invoke-WebRequest/regex). No external tools required.
# Covers: HTML · Markdown · JS/TS · JSON · CSS · SQL · templates (all via URL scan)
# Trigger: postToolUse / userPromptSubmitted

Set-StrictMode -Off
$ProgressPreference = 'SilentlyContinue'   # Invoke-WebRequest is far faster without the bar

$LIMIT   = 50
$TIMEOUT = 10
$UA      = 'Mozilla/5.0 (compatible; fix-broken-links/1.0)'
$WEB_RE  = '\.(html?|xhtml|md|markdown|mdx|js|jsx|ts|tsx|vue|svelte|json|jsonl|css|sql|erb|jinja|j2|twig|ejs|pug|hbs)$'

# Positional args become the file list; the hook payload can also supply them.
$ScriptArgs = [System.Collections.Generic.List[string]]::new()
foreach ($a in $args) { [void]$ScriptArgs.Add([string]$a) }

# ── Hook stdin ────────────────────────────────────────────────────────────────
# When called as a postToolUse hook, extract edited files from the JSON payload
# and inject them as positional args so Get-InputFiles picks them up.
if ($ScriptArgs.Count -eq 0 -and [Console]::IsInputRedirected) {
  $raw = [Console]::In.ReadToEnd()
  if ($raw.Trim()) {
    try {
      $json = $raw | ConvertFrom-Json
      $tool = $json.toolName; if (-not $tool) { $tool = $json.tool_name }
      if ($tool) {
        if ($tool -in 'editFiles','write','str_replace_editor','create_file') {
          $hookFiles = $json.tool_input.files; if (-not $hookFiles) { $hookFiles = $json.toolInput.files }
          if ($hookFiles) { foreach ($hf in $hookFiles) { [void]$ScriptArgs.Add([string]$hf) } }
        }
        else {
          # Different tool (bash, read, etc.) — nothing to check
          exit 0
        }
      }
      # No tool context — called as userPromptSubmitted or manually, fall through
    } catch { }
  }
}

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
              -UserAgent $UA -SkipHttpErrorCheck -ErrorAction Stop
    return [string][int]$resp.StatusCode
  } catch {
    return '000'
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

# Look up a working replacement in the Wayback Machine, using the broken URL as
# the lookup key; return the closest archived snapshot URL or ''.
function Get-WaybackSnapshot {
  param([string]$Url)
  try {
    $enc = [uri]::EscapeDataString($Url)
    $r = Invoke-RestMethod -Uri "http://archive.org/wayback/available?url=$enc" `
           -TimeoutSec 8 -UserAgent $UA -ErrorAction Stop
    $snap = $r.archived_snapshots.closest
    if ($snap -and $snap.url) { return [string]$snap.url }
  } catch { }
  return ''
}

# Longest common prefix length (in characters) of two strings, case-sensitive.
function Get-LcpLen {
  param([string]$A,[string]$B)
  $n = [Math]::Min($A.Length, $B.Length)
  $i = 0
  while ($i -lt $n -and $A[$i] -ceq $B[$i]) { $i++ }
  return $i
}

# Archived sibling pages living in the same directory as the broken URL. Queries
# the Wayback CDX API with a path wildcard, keeps only captures the archive
# served at status 200, strips query strings and trailing slashes, dedupes.
# This is how a misspelled link finds its correct neighbour.
function Get-CdxSiblings {
  param([string]$Url)
  $p = Split-Url $Url
  if (-not $p.Path) { return @() }                 # host only, no siblings
  $dir = $p.Path -replace '/[^/]*$',''
  if (-not $dir) { return @() }                    # top-level page, skip
  $prefix = "$($p.Host)$dir/*"
  $cdxUrl = "http://web.archive.org/cdx/search/cdx?url=$prefix&output=text&fl=original&filter=statuscode:200&collapse=urlkey&limit=200"
  # The CDX API rate-limits bursts and returns an empty body when throttled;
  # retry a couple of times before giving up so a transient blip isn't fatal.
  $body = ''
  foreach ($try in 1..3) {
    try {
      $resp = Invoke-WebRequest -Uri $cdxUrl -TimeoutSec 12 -UserAgent $UA `
                -SkipHttpErrorCheck -ErrorAction Stop
      $body = [string]$resp.Content
    } catch { $body = '' }
    if ($body) { break }
    Start-Sleep -Seconds 1
  }
  if (-not $body) { return @() }
  $body -split "`r?`n" |
    ForEach-Object { ($_ -replace '\?.*$','') -replace '/$','' } |
    Where-Object { $_ } |
    Sort-Object -Unique
}

# Up to MAX viable replacement URLs for a broken link, best first:
#   1. a working scheme/www/slash variation (verified live 200)
#   2. archived sibling pages whose final path segment most resembles the broken
#      one — ranked by shared-prefix length, then re-checked live (200 only)
#   3. the closest archived snapshot, only if nothing live was found
# De-duplicated case-insensitively. The first item is what `r` uses; the rest
# become the numbered alternatives.
function Get-SuggestedAlts {
  param([string]$Url,[int]$Max = 6)
  $seg = ($Url -split '/')[-1]; $seg = ($seg -split '\?')[0]
  $seen = @{}
  $out  = [System.Collections.Generic.List[string]]::new()

  $v = Find-Variation $Url
  if ($v) { [void]$out.Add($v); $seen[$v.ToLower()] = $true }

  $ranked = Get-CdxSiblings $Url |
    Where-Object { $_ -and $_ -ne $Url } |
    ForEach-Object { [pscustomobject]@{ Score = (Get-LcpLen $seg (($_ -split '/')[-1])); Url = $_ } } |
    Sort-Object -Property Score -Descending

  $checks = 0
  foreach ($r in $ranked) {
    if ($out.Count -ge $Max) { break }
    if ($checks -ge 10) { break }
    $key = $r.Url.ToLower()
    if ($seen.ContainsKey($key)) { continue }
    $checks++
    if ((Get-HttpStatus $r.Url) -ne '200') { continue }
    [void]$out.Add($r.Url); $seen[$key] = $true
  }

  if ($out.Count -eq 0) {
    $w = Get-WaybackSnapshot $Url
    if ($w) { [void]$out.Add($w) }
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
  $patterns = @(
    '<a[^>]*href="' + $esc + '"[^>]*>([^<]*)</a>',
    "<a[^>]*href='" + $esc + "'[^>]*>([^<]*)</a>",
    '\[([^\]]*)\]\(' + $esc + '[^)]*\)'
  )
  foreach ($pat in $patterns) {
    $content = [regex]::Replace($content, $pat, '$1', 'IgnoreCase')
  }
  [System.IO.File]::WriteAllText($File, $content)
}

# ── File discovery ────────────────────────────────────────────────────────────

function Get-InputFiles {
  if ($ScriptArgs.Count -gt 0) { return $ScriptArgs.ToArray() }
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

  if ($urls.Count -gt $LIMIT) {
    $ans = Read-Answer "  $file has $($urls.Count) links (limit $LIMIT). Continue? [Y/n] "
    if ($ans -in 'n','N','no','NO') { continue }
  }

  Write-Host ""
  Write-Host "  Checking $($urls.Count) link(s) in $file ..."
  foreach ($url in $urls) {
    $status = Get-HttpStatus $url
    if ($status -eq '200') { continue }
    Write-Host "    BROKEN ($status) $url"
    $alts = Get-SuggestedAlts $url 6
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
    Write-Host "    (no terminal — reporting only)"
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
