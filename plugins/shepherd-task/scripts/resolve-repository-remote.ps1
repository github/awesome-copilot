[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$Repo,

    [string]$Remote
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function ConvertTo-GitHubRepository {
    param([string]$Url)

    $normalized = $Url -replace '\.git$', ''
    if ($normalized -match '^git@github\.com:(.+)$') { return $Matches[1] }
    if ($normalized -match '^https://github\.com/(.+)$') { return $Matches[1] }
    if ($normalized -match '^ssh://git@github\.com/(.+)$') { return $Matches[1] }
    return $null
}

function Get-RemoteRepository {
    param([string]$RemoteName)

    $remoteUrl = (git remote get-url $RemoteName 2>$null | Select-Object -First 1)
    if ($LASTEXITCODE -ne 0 -or -not $remoteUrl) {
        throw "Could not read URL for Git remote '$RemoteName'."
    }
    return ConvertTo-GitHubRepository $remoteUrl.Trim()
}

if ($Remote) {
    $remoteRepo = Get-RemoteRepository $Remote
    if (-not $remoteRepo -or -not $remoteRepo.Equals($Repo, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Git remote '$Remote' does not have a GitHub URL matching '$Repo'."
    }
    Write-Output $Remote
    exit 0
}

$matchingRemotes = @()
$remotes = @(git remote)
if ($LASTEXITCODE -ne 0) {
    throw 'Could not list configured Git remotes.'
}
foreach ($remoteName in $remotes) {
    $remoteRepo = Get-RemoteRepository $remoteName
    if ($remoteRepo -and $remoteRepo.Equals($Repo, [StringComparison]::OrdinalIgnoreCase)) {
        $matchingRemotes += $remoteName
    }
}

if ($matchingRemotes.Count -ne 1) {
    throw "Expected exactly one Git remote whose GitHub URL matches '$Repo'; found $($matchingRemotes.Count)."
}

Write-Output ([string]$matchingRemotes[0])
