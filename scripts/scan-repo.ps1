param(
  [string]$RepoPath = '.'
)

Push-Location $RepoPath
if (!(Test-Path reports)) { New-Item -ItemType Directory -Path reports > $null }

# Run the built-in acquire-codebase-knowledge scan and save JSON output
python .\skills\acquire-codebase-knowledge\scripts\scan.py | Out-File -Encoding utf8 reports\acquire_scan.json
if ($?) { Write-Output "Scan complete: reports\acquire_scan.json" } else { Write-Error "Scan failed" }

Pop-Location
