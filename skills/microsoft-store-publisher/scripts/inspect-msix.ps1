[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$PackagePath,
    [string]$ExpectedIdentityName = "",
    [string]$ExpectedPublisher = "",
    [string]$ExpectedDisplayName = "",
    [string]$ExpectedArchitecture = "",
    [switch]$RequireUnsigned
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-WindowsSdkTool([string]$Name) {
    $sdkRoot = Join-Path ${env:ProgramFiles(x86)} "Windows Kits\10\bin"
    $candidates = @(
        Get-ChildItem -LiteralPath $sdkRoot -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match '^\d+\.\d+\.\d+\.\d+$' } |
            Sort-Object { [version]$_.Name } -Descending |
            ForEach-Object { Join-Path $_.FullName "x64\$Name" } |
            Where-Object { Test-Path -LiteralPath $_ }
    )
    if (-not $candidates.Count) {
        throw "$Name was not found. Install the Windows 11 SDK."
    }
    return $candidates[0]
}

$resolvedPackage = (Resolve-Path -LiteralPath $PackagePath).Path
$makeAppx = Resolve-WindowsSdkTool "makeappx.exe"
$verificationRoot = Join-Path $env:TEMP (
    "microsoft-store-publisher\" + [Guid]::NewGuid().ToString("N")
)

New-Item -ItemType Directory -Path $verificationRoot -Force | Out-Null
try {
    & $makeAppx unpack /p $resolvedPackage /d $verificationRoot /o | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "makeappx.exe failed with exit code $LASTEXITCODE."
    }

    $manifestPath = Join-Path $verificationRoot "AppxManifest.xml"
    if (-not (Test-Path -LiteralPath $manifestPath)) {
        throw "The unpacked package does not contain AppxManifest.xml."
    }

    [xml]$manifest = Get-Content -LiteralPath $manifestPath -Raw
    $namespaces = [Xml.XmlNamespaceManager]::new($manifest.NameTable)
    $namespaces.AddNamespace(
        "f",
        "http://schemas.microsoft.com/appx/manifest/foundation/windows10"
    )
    $namespaces.AddNamespace(
        "uap",
        "http://schemas.microsoft.com/appx/manifest/uap/windows10"
    )
    $namespaces.AddNamespace(
        "uap10",
        "http://schemas.microsoft.com/appx/manifest/uap/windows10/10"
    )
    $namespaces.AddNamespace(
        "rescap",
        "http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
    )

    $identity = $manifest.SelectSingleNode("/f:Package/f:Identity", $namespaces)
    $properties = $manifest.SelectSingleNode("/f:Package/f:Properties", $namespaces)
    $application = $manifest.SelectSingleNode(
        "/f:Package/f:Applications/f:Application",
        $namespaces
    )
    $visualElements = $manifest.SelectSingleNode(
        "/f:Package/f:Applications/f:Application/uap:VisualElements",
        $namespaces
    )
    $targetFamilies = @(
        $manifest.SelectNodes(
            "/f:Package/f:Dependencies/f:TargetDeviceFamily",
            $namespaces
        )
    )
    $capabilities = @(
        $manifest.SelectNodes("/f:Package/f:Capabilities/*", $namespaces) |
            ForEach-Object { $_.Name }
    )

    if (-not $identity -or -not $properties -or -not $application) {
        throw "The manifest is missing identity, properties, or application data."
    }

    $displayName = [string]$properties.DisplayName
    $visualDisplayName = if ($visualElements) {
        [string]$visualElements.DisplayName
    } else {
        ""
    }
    $signature = Get-AuthenticodeSignature -LiteralPath $resolvedPackage
    $errors = [Collections.Generic.List[string]]::new()

    if ($ExpectedIdentityName -and $identity.Name -ne $ExpectedIdentityName) {
        $errors.Add(
            "Identity name '$($identity.Name)' does not match '$ExpectedIdentityName'."
        )
    }
    if ($ExpectedPublisher -and $identity.Publisher -ne $ExpectedPublisher) {
        $errors.Add(
            "Publisher '$($identity.Publisher)' does not match '$ExpectedPublisher'."
        )
    }
    if ($ExpectedDisplayName -and $displayName -ne $ExpectedDisplayName) {
        $errors.Add(
            "Package display name '$displayName' does not match '$ExpectedDisplayName'."
        )
    }
    if (
        $ExpectedDisplayName -and
        $visualDisplayName -and
        $visualDisplayName -ne $ExpectedDisplayName
    ) {
        $errors.Add(
            "Visual display name '$visualDisplayName' does not match '$ExpectedDisplayName'."
        )
    }
    if (
        $ExpectedArchitecture -and
        $identity.ProcessorArchitecture -ne $ExpectedArchitecture
    ) {
        $errors.Add(
            "Architecture '$($identity.ProcessorArchitecture)' does not match '$ExpectedArchitecture'."
        )
    }
    if ($RequireUnsigned -and $signature.Status -ne "NotSigned") {
        $errors.Add(
            "Store submission package must be unsigned, but signature status is '$($signature.Status)'."
        )
    }

    $version = [version]$identity.Version
    if ($version.Major -eq 0) {
        $errors.Add("The first MSIX version component must be nonzero.")
    }
    if ($version.Revision -ne 0) {
        $errors.Add("The fourth MSIX version component must be 0 for Store submission.")
    }

    $result = [ordered]@{
        package = $resolvedPackage
        packageSha256 = (
            Get-FileHash -LiteralPath $resolvedPackage -Algorithm SHA256
        ).Hash.ToLowerInvariant()
        identityName = [string]$identity.Name
        publisher = [string]$identity.Publisher
        version = [string]$identity.Version
        architecture = [string]$identity.ProcessorArchitecture
        displayName = $displayName
        visualDisplayName = $visualDisplayName
        applicationId = [string]$application.Id
        executable = [string]$application.Executable
        runtimeBehavior = [string]$application.RuntimeBehavior
        trustLevel = [string]$application.TrustLevel
        targetDeviceFamilies = @(
            $targetFamilies | ForEach-Object {
                [ordered]@{
                    name = [string]$_.Name
                    minVersion = [string]$_.MinVersion
                    maxVersionTested = [string]$_.MaxVersionTested
                }
            }
        )
        capabilities = $capabilities
        signatureStatus = [string]$signature.Status
        errors = @($errors)
        passed = $errors.Count -eq 0
    }

    $result | ConvertTo-Json -Depth 8
    if ($errors.Count) {
        throw "MSIX inspection failed with $($errors.Count) error(s)."
    }
} finally {
    if (Test-Path -LiteralPath $verificationRoot) {
        Remove-Item -LiteralPath $verificationRoot -Recurse -Force
    }
}
