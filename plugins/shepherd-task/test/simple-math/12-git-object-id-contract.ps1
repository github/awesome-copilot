# shepherd-task-version: 1.0.5

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$helpers = @(
    (Join-Path $PSScriptRoot 'git-object-id.ps1'),
    (Join-Path $PSScriptRoot '..\simple-math-treatment-control\git-object-id.ps1')
)
$contractRoot = Join-Path ([System.IO.Path]::GetTempPath()) (
    "shepherd-git-object-id-$([guid]::NewGuid().ToString('N'))"
)
New-Item -ItemType Directory -Path $contractRoot | Out-Null

try {
    foreach ($format in @('sha1', 'sha256')) {
        $repository = Join-Path $contractRoot $format
        git init --quiet "--object-format=$format" $repository
        if ($LASTEXITCODE -ne 0) { throw "Could not initialize the $format contract repository." }
        git -C $repository config user.name 'Shepherd Contract'
        git -C $repository config user.email 'shepherd-contract@example.invalid'
        Set-Content -LiteralPath (Join-Path $repository 'README.md') -Value $format -Encoding utf8NoBOM
        git -C $repository add -- README.md
        git -C $repository commit --quiet -m "Create $format contract commit"
        if ($LASTEXITCODE -ne 0) { throw "Could not commit in the $format contract repository." }
        $objectId = (git -C $repository rev-parse HEAD).Trim()

        foreach ($helper in $helpers) {
            . $helper
            if ((Get-GitObjectFormat -Repository $repository) -ne $format) {
                throw "$helper did not report $format."
            }
            if (-not (Test-FullGitObjectId -Repository $repository -ObjectId $objectId)) {
                throw "$helper rejected the full $format object ID."
            }
            $resolved = Assert-GitCommitObjectId `
                -Repository $repository `
                -ObjectId $objectId `
                -Name 'Contract commit'
            if ($resolved -ne $objectId) {
                throw "$helper resolved '$objectId' as '$resolved'."
            }
            $wrongLength = if ($format -eq 'sha1') { 'a' * 64 } else { 'a' * 40 }
            if (Test-FullGitObjectId -Repository $repository -ObjectId $wrongLength) {
                throw "$helper accepted the wrong object-ID length for $format."
            }
        }
    }
}
finally {
    Remove-Item -LiteralPath $contractRoot -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host 'Simple-math Git object-ID contract tests passed.' -ForegroundColor Green
