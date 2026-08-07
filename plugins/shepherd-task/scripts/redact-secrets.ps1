<#
.SYNOPSIS
    Redact secret-bearing fields from shepherd JSONL logs.

.PARAMETER LogDirectory
    A path relative to the current working directory containing .json* files.

    Use "-" to redact JSONL received on stdin and write JSONL to stdout.

.EXAMPLE
    ./redact-secrets.ps1 shepherd-tasks-20260803-1550
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$LogDirectory
)

$ErrorActionPreference = "Stop"

$sensitiveKeyPattern = '(?i)(password|passwd|secret|token|api[-_]?key|authorization|credential|private[-_]?key|access[-_]?key|client[-_]?secret|connection[-_]?string)'
$contentKeyPattern = '(?i)^(content|encryptedContent|reasoningOpaque|arguments|result|error|prompt|toolRequests|userContent|assistantContent|toolCompleteResultContent)$'
$secretStringPattern = '[A-Za-z0-9+/]{20,}[+/][A-Za-z0-9+/]{20,}={0,2}'

function Redact-String {
    param([string]$Value)

    $result = $Value -replace '(?i)bearer\s+[A-Za-z0-9._~+/-]+', 'Bearer [REDACTED]'
    $result = $result -replace 'gh[opsu]_[A-Za-z0-9_]+|sk-[A-Za-z0-9_-]+|xox[baprs]-[A-Za-z0-9-]+|AIza[0-9A-Za-z_-]+', '[REDACTED]'
    $result -replace $secretStringPattern, '[REDACTED]'
}

function Redact-JsonValue {
    param(
        [AllowNull()]
        [object]$Value,
        [string]$Key
    )

    if ($null -eq $Value) {
        return $null
    }
    if ($Key -match $sensitiveKeyPattern -or $Key -match $contentKeyPattern) {
        return '[REDACTED]'
    }
    if ($Value -is [string]) {
        return Redact-String $Value
    }
    if ($Value -is [System.Collections.IDictionary]) {
        $result = [ordered]@{}
        foreach ($entry in $Value.GetEnumerator()) {
            $result[$entry.Key] = Redact-JsonValue $entry.Value ([string]$entry.Key)
        }
        return [pscustomobject]$result
    }
    if ($Value -is [System.Collections.IEnumerable] -and $Value -isnot [string]) {
        return @($Value | ForEach-Object { Redact-JsonValue $_ $Key })
    }
    if ($Value -is [pscustomobject]) {
        $result = [ordered]@{}
        foreach ($property in $Value.PSObject.Properties) {
            $result[$property.Name] = Redact-JsonValue $property.Value $property.Name
        }
        return [pscustomobject]$result
    }
    return $Value
}

function Redact-File {
    param([System.IO.FileInfo]$File)

    $temporaryPath = "$($File.FullName).redact.$([guid]::NewGuid().ToString('N'))"
    try {
        $output = [System.Collections.Generic.List[string]]::new()
        foreach ($line in [System.IO.File]::ReadLines($File.FullName)) {
            if ([string]::IsNullOrWhiteSpace($line)) {
                $output.Add('')
                continue
            }
            try {
                $json = $line | ConvertFrom-Json -Depth 100
            } catch {
                throw "Invalid JSONL in $($File.FullName)"
            }
            $output.Add((Redact-JsonValue $json '' | ConvertTo-Json -Compress -Depth 100))
        }
        [System.IO.File]::WriteAllLines($temporaryPath, $output)
        $originalMode = $File.Mode
        Move-Item -LiteralPath $temporaryPath -Destination $File.FullName -Force
        $replacement = Get-Item -LiteralPath $File.FullName
        $replacement.Mode = $originalMode
        Write-Output "Redacted $($File.FullName)"
    } catch {
        Remove-Item -LiteralPath $temporaryPath -Force -ErrorAction SilentlyContinue
        throw
    }
}

if ($LogDirectory -eq '-') {
    foreach ($line in [Console]::In.ReadToEnd() -split "\r?\n") {
        if ([string]::IsNullOrEmpty($line)) {
            [Console]::Out.WriteLine()
            continue
        }
        try {
            $json = $line | ConvertFrom-Json -Depth 100
        } catch {
            throw "Invalid JSONL received on stdin"
        }
        [Console]::Out.WriteLine((Redact-JsonValue $json '' | ConvertTo-Json -Compress -Depth 100))
    }
    exit 0
}

if (-not (Test-Path -LiteralPath $LogDirectory -PathType Container)) {
    throw "Log directory not found: $LogDirectory"
}

$files = Get-ChildItem -LiteralPath $LogDirectory -File -Recurse |
    Where-Object { $_.Name -like '*.json*' }
if ($files.Count -eq 0) {
    throw "No .json* files found in $LogDirectory"
}

foreach ($file in $files) {
    Redact-File $file
}
