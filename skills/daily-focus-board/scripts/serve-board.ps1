# serve-board.ps1 — serve a generated focus board and print the URL.
# Usage: pwsh scripts/serve-board.ps1 [-Dir <folder>] [-File focus-board.html] [-Port 8799]
param(
  [string]$Dir  = (Get-Location).Path,
  [string]$File = "focus-board.html",
  [int]   $Port = 8799
)
$full = Join-Path $Dir $File
if (-not (Test-Path $full)) { Write-Error "Board not found: $full"; exit 1 }
try {
  if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) {
    Write-Error "Port $Port is already in use — choose another with -Port or stop the existing server."; exit 1
  }
} catch { }  # Get-NetTCPConnection may be unavailable on some platforms; skip the pre-check there.
$proc = Start-Process -FilePath "python" -ArgumentList @("-m","http.server","$Port","--bind","127.0.0.1","--directory","`"$Dir`"") -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 2
if ($proc.HasExited) {
  Write-Error "The server exited on startup (code $($proc.ExitCode)) — is Python installed and the port free?"; exit 1
}
$url = "http://localhost:$Port/$File"
Write-Host "Focus board: $url"
Write-Host "Server PID $($proc.Id) — stop it with: Stop-Process -Id $($proc.Id)"
Start-Process $url   # opens in default browser; in a Copilot-app session, open a browser canvas to this URL instead
