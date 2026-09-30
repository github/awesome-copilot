[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$PackagePath,
    [string]$ReportPath = "",
    [string]$ExistingReportPath = "",
    [int]$ReportWaitSeconds = 60
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# WACK rejects a -reportoutputpath that does not end in .xml. It writes the XML
# report to the requested path and an HTML rendering of it to
# %LOCALAPPDATA%\Microsoft\AppCertKit\<xml base name>.htm. The XML report is
# authoritative. The HTML report is only a fallback when no XML report exists.
$kitDirectory = Join-Path $env:LOCALAPPDATA "Microsoft\AppCertKit"
$htmlExtensions = @(".htm", ".html")
# The English strings results.xsl shows for each OVERALL_RESULT value.
$resultNames = @{
    PASS = "PASSED"
    FAIL = "FAILED"
    WARNING = "PASSED WITH WARNINGS"
}
$knownResults = @($resultNames.Values) + "INCOMPLETE"

function Resolve-AppCert {
    $candidates = @(
        @(
            (Join-Path ${env:ProgramFiles(x86)} "Windows Kits\10\App Certification Kit\appcert.exe"),
            (Join-Path $env:ProgramFiles "Windows Kits\10\App Certification Kit\appcert.exe")
        ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
    )
    if (-not $candidates.Count) {
        throw "appcert.exe was not found. Install the Windows App Certification Kit."
    }
    return $candidates[0]
}

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator
    )
}

function Read-XmlDocument($Source) {
    $settings = [Xml.XmlReaderSettings]::new()
    $settings.DtdProcessing = [Xml.DtdProcessing]::Ignore
    $settings.XmlResolver = $null
    $reader = [Xml.XmlReader]::Create($Source, $settings)
    try {
        $document = [Xml.XmlDocument]::new()
        $document.Load($reader)
        return $document
    } finally {
        $reader.Dispose()
    }
}

function Get-PackageIdentity([string]$Path) {
    if ([IO.Path]::GetExtension($Path) -notin @(".msix", ".appx")) {
        return $null
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($Path)
    try {
        $entry = $archive.GetEntry("AppxManifest.xml")
        if ($null -eq $entry) {
            throw "The package does not contain AppxManifest.xml."
        }
        $stream = $entry.Open()
        try {
            $manifest = Read-XmlDocument $stream
        } finally {
            $stream.Dispose()
        }
    } finally {
        $archive.Dispose()
    }
    $identity = $manifest.DocumentElement.SelectSingleNode(
        "*[local-name()='Identity']"
    )
    if ($null -eq $identity) {
        throw "AppxManifest.xml does not contain an Identity element."
    }
    return [pscustomobject]@{
        Name = $identity.GetAttribute("Name")
        Version = $identity.GetAttribute("Version")
    }
}

function Read-WackXmlReport([string]$Path) {
    try {
        $stream = [IO.File]::OpenRead($Path)
        try {
            $document = Read-XmlDocument $stream
        } finally {
            $stream.Dispose()
        }
    } catch {
        return $null
    }
    $root = $document.DocumentElement
    if (
        $null -eq $root -or
        $root.LocalName -ne "REPORT" -or
        -not $root.HasAttribute("OVERALL_RESULT")
    ) {
        return $null
    }

    $rawResult = $root.GetAttribute("OVERALL_RESULT")
    # results.xsl treats a report without VALIDATION_TYPE as an unfinished
    # interim report.
    $overallResult = if (-not $root.HasAttribute("VALIDATION_TYPE")) {
        "INCOMPLETE"
    } elseif ($resultNames.ContainsKey($rawResult)) {
        $resultNames[$rawResult]
    } else {
        $rawResult
    }

    $nonPassingTests = @(
        foreach ($test in $root.SelectNodes("REQUIREMENTS/REQUIREMENT/TEST")) {
            $resultNode = $test.SelectSingleNode("RESULT")
            $testResult = if ($null -ne $resultNode) {
                $resultNode.InnerText.Trim()
            } else {
                ""
            }
            if ($testResult -eq "PASS") {
                continue
            }
            [ordered]@{
                requirement = $test.ParentNode.GetAttribute("TITLE")
                test = $test.GetAttribute("NAME")
                result = $testResult
                optional = $test.GetAttribute("OPTIONAL") -eq "TRUE"
                messages = @(
                    foreach ($message in $test.SelectNodes("MESSAGES/MESSAGE")) {
                        $message.GetAttribute("TEXT")
                    }
                )
            }
        }
    )

    return [pscustomobject]@{
        Path = $Path
        OverallResult = $overallResult
        AppName = $root.GetAttribute("APP_NAME")
        AppVersion = $root.GetAttribute("APP_VERSION")
        KitVersion = $root.GetAttribute("VERSION")
        KitIsLatest = $root.GetAttribute("LATEST_VERSION") -ne "FALSE"
        PartialRun = $root.GetAttribute("PARTIAL_RUN") -eq "TRUE"
        ReportTime = $root.GetAttribute("ReportGenerationTime")
        NonPassingTests = $nonPassingTests
    }
}

function Read-WackHtmlReport([string]$Path) {
    try {
        $content = [IO.File]::ReadAllText($Path)
    } catch {
        return $null
    }
    $overall = [regex]::Match(
        $content,
        '(?is)<div[^>]*\bclass="overall"[^>]*>(.*?)</div>'
    )
    if (-not $overall.Success) {
        return $null
    }
    $label = [regex]::Match(
        $overall.Groups[1].Value,
        '(?is)<span[^>]*>(.*?)</span>'
    )
    if (-not $label.Success) {
        return $null
    }
    $text = [regex]::Replace($label.Groups[1].Value, '<[^>]+>', ' ')
    $text = ([Net.WebUtility]::HtmlDecode($text) -replace '\s+', ' ').Trim()
    $overallResult = if ($text -like "Incomplete*") {
        "INCOMPLETE"
    } else {
        $text.ToUpperInvariant()
    }
    $version = [regex]::Match(
        $content,
        '(?is)<dt>\s*App version:\s*</dt>\s*<dd[^>]*>\s*([^<]*?)\s*</dd>'
    )
    return [pscustomobject]@{
        Path = $Path
        Content = $content
        OverallResult = $overallResult
        # Only English reports are recognized. Localized labels are not.
        Recognized = $overallResult -in $knownResults
        AppVersion = if ($version.Success) { $version.Groups[1].Value } else { "" }
    }
}

# WACK copies ReportGenerationTime into the HTML report, which ties an HTML
# report to the XML report it was rendered from.
function Test-ReportPair($XmlReport, $HtmlReport) {
    return [bool](
        $XmlReport.ReportTime -and
        $HtmlReport.Content.Contains($XmlReport.ReportTime)
    )
}

function Test-NewFile([string]$Path, [datetime]$Since) {
    return (
        (Test-Path -LiteralPath $Path -PathType Leaf) -and
        (Get-Item -LiteralPath $Path).LastWriteTime -ge $Since
    )
}

function Get-NewKitFiles([string[]]$Extensions, [datetime]$Since) {
    if (-not (Test-Path -LiteralPath $kitDirectory -PathType Container)) {
        return
    }
    Get-ChildItem -LiteralPath $kitDirectory -File -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Extension -in $Extensions -and $_.LastWriteTime -ge $Since
        } |
        Sort-Object LastWriteTime -Descending |
        ForEach-Object { $_.FullName }
}

function Find-WackXmlReport([string]$RequestedPath, [datetime]$Since) {
    $candidates = [Collections.Generic.List[string]]::new()
    if (Test-NewFile $RequestedPath $Since) {
        $candidates.Add($RequestedPath)
    }
    # AppCertKit holds many unrelated XML files, so each one is checked for a
    # REPORT root element.
    foreach ($path in @(Get-NewKitFiles @(".xml") $Since)) {
        $candidates.Add($path)
    }
    foreach ($candidate in $candidates) {
        $report = Read-WackXmlReport $candidate
        if ($null -ne $report) {
            return $report
        }
    }
    return $null
}

function Find-WackHtmlReport(
    [string]$XmlPath,
    [datetime]$Since,
    $XmlReport,
    [switch]$SearchKitDirectory
) {
    $baseName = [IO.Path]::GetFileNameWithoutExtension($XmlPath)
    $candidates = [Collections.Generic.List[string]]::new()
    foreach ($extension in $htmlExtensions) {
        $paths = @(
            [IO.Path]::ChangeExtension($XmlPath, $extension),
            (Join-Path $kitDirectory ($baseName + $extension))
        )
        foreach ($path in $paths) {
            if (Test-NewFile $path $Since) {
                $candidates.Add($path)
            }
        }
    }
    if ($SearchKitDirectory) {
        foreach ($path in @(Get-NewKitFiles $htmlExtensions $Since)) {
            $candidates.Add($path)
        }
    }
    foreach ($candidate in $candidates) {
        $report = Read-WackHtmlReport $candidate
        if (
            $null -ne $report -and
            ($null -eq $XmlReport -or (Test-ReportPair $XmlReport $report))
        ) {
            return $report
        }
    }
    return $null
}

function Save-Report([string]$Source, [string]$Destination) {
    # Skip the copy when the destination already holds the same report. This
    # also covers a source and destination that are the same file.
    if (
        -not (Test-Path -LiteralPath $Destination -PathType Leaf) -or
        (Get-FileHash -LiteralPath $Source).Hash -ne
            (Get-FileHash -LiteralPath $Destination).Hash
    ) {
        [IO.File]::Copy($Source, $Destination, $true)
    }
    return $Destination
}

$resolvedPackage = (Resolve-Path -LiteralPath $PackagePath).ProviderPath
if (-not $ReportPath) {
    $ReportPath = [IO.Path]::Combine(
        [IO.Path]::GetDirectoryName($resolvedPackage),
        [IO.Path]::GetFileNameWithoutExtension($resolvedPackage) +
            "-WACK-report.xml"
    )
}
# Relative paths are resolved against the current PowerShell location.
$ReportPath = [IO.Path]::GetFullPath(
    $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath(
        $ReportPath
    )
)
$reportExtension = [IO.Path]::GetExtension($ReportPath).ToLowerInvariant()
if ($reportExtension -ne ".xml" -and $reportExtension -notin $htmlExtensions) {
    throw "ReportPath must end in .xml, .htm, or .html."
}
# WACK always receives the .xml path. The HTML copy is saved beside it.
$xmlPath = [IO.Path]::ChangeExtension($ReportPath, ".xml")
$htmlPath = if ($reportExtension -eq ".xml") {
    [IO.Path]::ChangeExtension($ReportPath, ".htm")
} else {
    $ReportPath
}
[void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($ReportPath))

$appCert = $null
$exitCode = $null
$xmlReport = $null
$htmlReport = $null
$warnings = [Collections.Generic.List[string]]::new()
$errors = [Collections.Generic.List[string]]::new()

if ($ExistingReportPath) {
    $existingReport = (Resolve-Path -LiteralPath $ExistingReportPath).ProviderPath
    $existingExtension = [IO.Path]::GetExtension($existingReport).ToLowerInvariant()
    if ($existingExtension -eq ".xml") {
        $xmlReport = Read-WackXmlReport $existingReport
        if ($null -eq $xmlReport) {
            throw "'$existingReport' is not a WACK XML report."
        }
        $htmlReport = Find-WackHtmlReport $existingReport ([datetime]::MinValue) $xmlReport
    } elseif ($existingExtension -in $htmlExtensions) {
        $htmlReport = Read-WackHtmlReport $existingReport
        if ($null -eq $htmlReport) {
            throw "'$existingReport' is not a WACK HTML report."
        }
        $siblingXml = [IO.Path]::ChangeExtension($existingReport, ".xml")
        if (Test-Path -LiteralPath $siblingXml -PathType Leaf) {
            $candidate = Read-WackXmlReport $siblingXml
            if ($null -ne $candidate -and (Test-ReportPair $candidate $htmlReport)) {
                $xmlReport = $candidate
            } else {
                $warnings.Add(
                    "Ignored '$siblingXml' because it is not the XML report for this HTML report."
                )
            }
        }
    } else {
        throw "ExistingReportPath must be a WACK .xml, .htm, or .html report."
    }
} else {
    if (-not (Test-IsAdministrator)) {
        throw (
            "The WACK command-line runner requires an elevated PowerShell process. " +
            "Ask the user to open an elevated terminal, then run this script there. " +
            "Do not attempt to approve the operating-system authentication prompt."
        )
    }

    $appCert = Resolve-AppCert
    & $appCert reset | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "appcert.exe reset failed with exit code $LASTEXITCODE."
    }

    # Reports older than this run are ignored. The margin covers file-system
    # timestamp granularity.
    $startedAt = (Get-Date).AddSeconds(-5)
    & $appCert test `
        -appxpackagepath $resolvedPackage `
        -reportoutputpath $xmlPath |
        Out-Host
    $exitCode = $LASTEXITCODE

    # After a failed run, look for a report once instead of waiting for one.
    $waitSeconds = if ($exitCode -eq 0) { $ReportWaitSeconds } else { 0 }
    $deadline = (Get-Date).AddSeconds($waitSeconds)
    $htmlGraceStarted = $false
    while ($true) {
        # An interim report can still be replaced by the final one.
        if ($null -eq $xmlReport -or $xmlReport.OverallResult -eq "INCOMPLETE") {
            $latestXmlReport = Find-WackXmlReport $xmlPath $startedAt
            if ($null -ne $latestXmlReport) {
                $xmlReport = $latestXmlReport
            }
        }
        $htmlSearchPath = if ($null -ne $xmlReport) { $xmlReport.Path } else { $xmlPath }
        $htmlReport = Find-WackHtmlReport $htmlSearchPath $startedAt $xmlReport -SearchKitDirectory
        $xmlFinished = $null -ne $xmlReport -and $xmlReport.OverallResult -ne "INCOMPLETE"
        if ($xmlFinished -and $null -ne $htmlReport) {
            break
        }
        if ($xmlFinished -and -not $htmlGraceStarted) {
            # The XML report decides the result, so the HTML report only gets
            # a short grace period.
            $htmlGraceStarted = $true
            $graceDeadline = (Get-Date).AddSeconds(10)
            if ($graceDeadline -lt $deadline) {
                $deadline = $graceDeadline
            }
        }
        if ((Get-Date) -ge $deadline) {
            break
        }
        Start-Sleep -Seconds 2
    }

    if ($null -eq $xmlReport -and $null -eq $htmlReport) {
        if ($exitCode -ne 0) {
            throw "appcert.exe test failed with exit code $exitCode and produced no report."
        }
        throw (
            "WACK returned success but no report was found at '$xmlPath' or under " +
            "'$kitDirectory'."
        )
    }
    if ($exitCode -ne 0) {
        $errors.Add("appcert.exe test exited with code $exitCode.")
    }
}

if ($null -ne $xmlReport) {
    $overallResult = $xmlReport.OverallResult
    $resultSource = "xml"
    $reportAppName = $xmlReport.AppName
    $reportAppVersion = $xmlReport.AppVersion
    $nonPassingTests = @($xmlReport.NonPassingTests)
    if ($xmlReport.PartialRun) {
        $errors.Add("Not all WACK tests ran (PARTIAL_RUN is TRUE).")
    }
    if (-not $xmlReport.KitIsLatest) {
        $warnings.Add(
            "WACK $($xmlReport.KitVersion) is not the latest version, and WACK warns " +
            "that the Store submission may fail. Update the kit and rerun it."
        )
    }
    if ($null -eq $htmlReport) {
        $warnings.Add(
            "No HTML report from the same WACK run was found. The XML report decides the result."
        )
    } elseif ($htmlReport.Recognized -and $htmlReport.OverallResult -ne $overallResult) {
        $errors.Add(
            "The XML report says $overallResult, but the HTML report says " +
            "$($htmlReport.OverallResult)."
        )
    }
} else {
    $overallResult = $htmlReport.OverallResult
    $resultSource = "html"
    $reportAppName = $null
    $reportAppVersion = $htmlReport.AppVersion
    $nonPassingTests = @()
    $warnings.Add(
        "No XML report was found. The result comes from the HTML report, and " +
        "individual test results are not listed."
    )
}

if ($overallResult -ne "PASSED") {
    $errors.Add("WACK overall result is '$overallResult'.")
}

$optionalFailures = @($nonPassingTests | Where-Object { $_.optional }).Count
if ($optionalFailures) {
    $warnings.Add(
        "$optionalFailures optional test(s) did not pass. Optional tests do not " +
        "block Store onboarding, but investigate them."
    )
}
$requiredFailures = $nonPassingTests.Count - $optionalFailures
if ($requiredFailures) {
    $warnings.Add(
        "$requiredFailures required test(s) did not pass. Review nonPassingTests."
    )
}

$packageIdentity = $null
try {
    $packageIdentity = Get-PackageIdentity $resolvedPackage
    if ($null -eq $packageIdentity) {
        $warnings.Add(
            "Only .msix and .appx packages are matched to the report. Check the " +
            "report's app name and version by hand."
        )
    }
} catch {
    $warnings.Add(
        "The package identity could not be read, so the report was not matched " +
        "to the package: $($_.Exception.Message)"
    )
}
if ($null -ne $packageIdentity) {
    if ($reportAppName -and $reportAppName -ne $packageIdentity.Name) {
        $errors.Add(
            "The report is for '$reportAppName', but the package identity is " +
            "'$($packageIdentity.Name)'."
        )
    }
    if (-not $reportAppVersion) {
        $warnings.Add(
            "The report's app version could not be read, so it was not matched " +
            "to the package version."
        )
    } elseif ($reportAppVersion -ne $packageIdentity.Version) {
        $errors.Add(
            "The report is for version $reportAppVersion, but the package is " +
            "version $($packageIdentity.Version)."
        )
    }
}

$savedXmlReport = if ($null -ne $xmlReport) {
    Save-Report $xmlReport.Path $xmlPath
} else {
    $null
}
$savedHtmlReport = if ($null -ne $htmlReport) {
    Save-Report $htmlReport.Path $htmlPath
} else {
    $null
}
$unsavedPaths = @()
if ($null -eq $savedXmlReport) {
    $unsavedPaths += $xmlPath
}
if ($null -eq $savedHtmlReport) {
    $unsavedPaths += $htmlPath
}
foreach ($unsavedPath in $unsavedPaths) {
    if (Test-Path -LiteralPath $unsavedPath -PathType Leaf) {
        $warnings.Add(
            "'$unsavedPath' already existed and was not replaced. It is not part " +
            "of this result."
        )
    }
}

$result = [ordered]@{
    package = $resolvedPackage
    packageSha256 = (
        Get-FileHash -LiteralPath $resolvedPackage -Algorithm SHA256
    ).Hash.ToLowerInvariant()
    packageIdentityName = if ($null -ne $packageIdentity) { $packageIdentity.Name } else { $null }
    packageVersion = if ($null -ne $packageIdentity) { $packageIdentity.Version } else { $null }
    appCert = $appCert
    exitCode = $exitCode
    overallResult = $overallResult
    resultSource = $resultSource
    reportAppName = $reportAppName
    reportAppVersion = $reportAppVersion
    kitVersion = if ($null -ne $xmlReport) { $xmlReport.KitVersion } else { $null }
    reportTime = if ($null -ne $xmlReport) { $xmlReport.ReportTime } else { $null }
    xmlReport = $savedXmlReport
    htmlReport = $savedHtmlReport
    sourceXmlReport = if ($null -ne $xmlReport) { $xmlReport.Path } else { $null }
    sourceHtmlReport = if ($null -ne $htmlReport) { $htmlReport.Path } else { $null }
    nonPassingTests = $nonPassingTests
    warnings = @($warnings)
    errors = @($errors)
    passed = $errors.Count -eq 0
}
$result | ConvertTo-Json -Depth 6

if ($errors.Count) {
    $reviewPath = if ($savedXmlReport) { $savedXmlReport } else { $savedHtmlReport }
    throw "WACK verification failed. $($errors -join ' ') Review '$reviewPath'."
}
