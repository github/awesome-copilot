# shepherd-task-version: 1.0.5

function Get-GitObjectFormat {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Repository
    )

    $formatOutput = @(& git -C $Repository rev-parse --show-object-format 2>$null)
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0 -or $formatOutput.Count -ne 1) {
        throw "Could not determine the Git object format for '$Repository'."
    }
    $format = ([string]$formatOutput[0]).Trim()
    if ($format -notin @('sha1', 'sha256')) {
        throw "Unsupported Git object format '$format' in '$Repository'."
    }
    return $format
}

function Test-FullGitObjectId {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Repository,

        [Parameter(Mandatory)]
        [string]$ObjectId
    )

    $pattern = switch (Get-GitObjectFormat -Repository $Repository) {
        'sha1' { '^[0-9a-fA-F]{40}$' }
        'sha256' { '^[0-9a-fA-F]{64}$' }
    }
    return $ObjectId -match $pattern
}

function Assert-GitCommitObjectId {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Repository,

        [Parameter(Mandatory)]
        [string]$ObjectId,

        [string]$Name = 'Git object ID'
    )

    $format = Get-GitObjectFormat -Repository $Repository
    if (-not (Test-FullGitObjectId -Repository $Repository -ObjectId $ObjectId)) {
        $expectedLength = if ($format -eq 'sha1') { 40 } else { 64 }
        throw "$Name must be a full $expectedLength-character $format object ID: '$ObjectId'."
    }

    $resolvedOutput = @(& git -C $Repository rev-parse --verify "$ObjectId^{commit}" 2>$null)
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0 -or $resolvedOutput.Count -ne 1) {
        throw "$Name is not an available commit in '$Repository': '$ObjectId'."
    }
    $resolved = ([string]$resolvedOutput[0]).Trim()
    if ($resolved -cne $ObjectId.ToLowerInvariant()) {
        throw "$Name did not resolve to the supplied full object ID: '$ObjectId' resolved as '$resolved'."
    }
    return $resolved
}
