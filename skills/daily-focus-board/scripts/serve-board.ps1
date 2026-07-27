# serve-board.ps1 — serve a generated focus board and print the URL.
# Usage: pwsh scripts/serve-board.ps1 [-Dir <folder>] [-File focus-board.html] [-Port 8799]
param(
  [string]$Dir  = (Get-Location).Path,
  [string]$File = "focus-board.html",
  [int]   $Port = 8799
)
$full = Join-Path $Dir $File
if (-not (Test-Path $full)) { Write-Error "Board not found: $full"; exit 1 }
Start-Process -FilePath "python" -ArgumentList @("-m","http.server","$Port","--bind","127.0.0.1","--directory","`"$Dir`"") -WindowStyle Hidden
Start-Sleep -Seconds 2
$url = "http://localhost:$Port/$File"
Write-Host "Focus board: $url"
Start-Process $url   # opens in default browser; in a Copilot-app session, open a browser canvas to this URL instead
