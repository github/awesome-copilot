param (
    [Parameter(Mandatory=$true)]
    [string]$InputPath,

    [string]$Output,

    [string]$Include,

    [string]$Exclude
)

# Valid fields
$ValidFields = @("timestamp", "app", "level", "endpoint", "contextPath", "event", "user", "class", "function", "rowId", "body")

# Function to check if a field is valid
function Test-ValidField {
    param([string]$Field)
    return $ValidFields -contains $Field
}

# Verify that -Include and -Exclude are not both used
if ($Include -and $Exclude) {
    Write-Error "Error: -Include and -Exclude cannot be used together."
    exit 1
}

# Initialize field variables
$IncludeFields = $null
$ExcludeFields = $null

# Validate fields provided in Include/Exclude
if ($Include) {
    $IncludeFields = $Include -split "," | ForEach-Object { $_.Trim() }
    foreach ($field in $IncludeFields) {
        if (-not (Test-ValidField $field)) {
            Write-Error "Error: Invalid field '$field'. Valid fields: $($ValidFields -join ', ')"
            exit 1
        }
    }
}

if ($Exclude) {
    $ExcludeFields = $Exclude -split "," | ForEach-Object { $_.Trim() }
    foreach ($field in $ExcludeFields) {
        if (-not (Test-ValidField $field)) {
            Write-Error "Error: Invalid field '$field'. Valid fields: $($ValidFields -join ', ')"
            exit 1
        }
    }
}

# Check that the input file exists
if (-not (Test-Path $InputPath)) {
    Write-Error "Error: File $InputPath does not exist."
    exit 1
}
# Read the file and normalize line endings
# Group raw lines into log entries where a new entry starts with a timestamp.
$raw = Get-Content -Path $InputPath -Raw
$raw = $raw -replace "`r`n","`n" -replace "`r","`n"
$lines = $raw -split "`n"

$entryTexts = @()
$buffer = ""
$skippedLines = 0

foreach ($line in $lines) {
    if ($line -eq $null) { continue }
    if ($line.Trim().Length -eq 0) { continue }

    if ($line -match '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}') {
        if ($buffer -ne "") { $entryTexts += $buffer }
        $buffer = $line
    } else {
        # Continuation line: attach to current buffer if present, otherwise skip
        if ($buffer -eq "") {
            $skippedLines++
            continue
        } else {
            $buffer += "`n" + $line
        }
    }
}

if ($buffer -ne "") { $entryTexts += $buffer }

$entries = @()
$processed = 0
$skippedMalformed = 0

foreach ($entryText in $entryTexts) {
    $parts = $entryText -split '\|'
    if ($parts.Count -ge 12) {
        # Trim only the first 11 fields; preserve the body (may contain pipes/newlines)
        for ($i=0; $i -le 10; $i++) { $parts[$i] = $parts[$i].Trim() }

        $body = ($parts[11..($parts.Count - 1)] -join '|')

        $entry = @{
            timestamp   = $parts[0]
            app         = $parts[1]
            level       = $parts[2]
            endpoint    = $parts[4]
            contextPath = $parts[5]
            event       = $parts[6]
            user        = $parts[7]
            class       = $parts[8]
            function    = $parts[9]
            rowId       = $parts[10]
            body        = $body
        }

        # Apply include/exclude filters
        if ($IncludeFields -and $IncludeFields.Count -gt 0) {
            $filteredEntry = @{}
            foreach ($field in $IncludeFields) {
                if ($entry.ContainsKey($field)) {
                    $filteredEntry[$field] = $entry[$field]
                } else {
                    $filteredEntry[$field] = $null
                }
            }
            $entry = $filteredEntry
        }
        elseif ($ExcludeFields -and $ExcludeFields.Count -gt 0) {
            foreach ($field in $ExcludeFields) {
                if ($entry.ContainsKey($field)) {
                    $entry.PSObject.Properties.Remove($field)
                }
            }
        }

        $entries += $entry
        $processed++
    } else {
        $skippedMalformed++
    }
}

$skipped = $skippedLines + $skippedMalformed

# Convert to JSON (compact)
$json = $entries | ConvertTo-Json -Depth 10 -Compress

# Write output
if ($Output) {
    Set-Content -Path $Output -Value $json -Encoding UTF8
    Write-Host "Output written to $Output"
} else {
    $json
}

Write-Host "Processed: $processed entries, Skipped: $skipped entries"