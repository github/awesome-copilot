[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$resolver = Join-Path $PSScriptRoot '..' '..' 'scripts' 'resolve-repository-remote.ps1'
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "shepherd-remote-$([guid]::NewGuid().ToString('N'))"

function Assert-Remote {
    param(
        [string]$Expected,
        [string]$Repo,
        [string]$Remote
    )

    $arguments = @{ Repo = $Repo }
    if ($Remote) { $arguments.Remote = $Remote }
    $actual = & $resolver @arguments
    if ($actual -ne $Expected) {
        throw "Expected remote '$Expected', got '$actual'."
    }
}

function Assert-Failure {
    param(
        [string]$ExpectedMessage,
        [string]$Repo,
        [string]$Remote
    )

    try {
        $arguments = @{ Repo = $Repo }
        if ($Remote) { $arguments.Remote = $Remote }
        & $resolver @arguments
    }
    catch {
        if (-not $_.Exception.Message.Contains($ExpectedMessage)) {
            throw "Expected failure containing '$ExpectedMessage', got '$($_.Exception.Message)'."
        }
        return
    }
    throw 'Expected resolver failure.'
}

try {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    git -C $tempDir init --quiet
    Push-Location $tempDir

    git remote add origin https://github.com/example/project.git
    Assert-Remote -Expected origin -Repo example/project
    Assert-Remote -Expected origin -Repo example/project -Remote origin
    $freshOutput = @(
        & pwsh -NoLogo -NoProfile -File $resolver `
            -Repo example/project `
            -Remote origin 2>&1
    )
    if ($LASTEXITCODE -ne 0 -or ($freshOutput -join "`n").Trim() -ne 'origin') {
        throw "Fresh-process remote resolution failed: $($freshOutput -join [Environment]::NewLine)"
    }

    git remote rename origin upstream
    Assert-Remote -Expected upstream -Repo example/project

    Assert-Failure -ExpectedMessage 'found 0' -Repo other/project
    Assert-Failure -ExpectedMessage 'Could not read URL' -Repo example/project -Remote missing

    git remote add origin git@github.com:example/project.git
    Assert-Failure -ExpectedMessage 'found 2' -Repo example/project
    Assert-Failure -ExpectedMessage 'does not have a GitHub URL matching' -Repo other/project -Remote origin

    Write-Host 'Repository remote resolution tests passed.'
}
finally {
    Pop-Location -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}
