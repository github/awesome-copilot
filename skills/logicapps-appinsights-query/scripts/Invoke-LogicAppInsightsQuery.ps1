#------------------------------------------------------------
# Copyright (c) Microsoft Corporation.  All rights reserved.
#------------------------------------------------------------

<#
.SYNOPSIS
    Runs a read-only KQL query against the Application Insights resource of a Logic Apps Standard app.

.DESCRIPTION
    Resolves the Application Insights application ID from the Logic App's APPLICATIONINSIGHTS_CONNECTION_STRING
    setting, or uses -AppId directly, then posts the query to the Application Insights query REST API through
    'az rest'. The script never prints the connection string or instrumentation key.

.PARAMETER Query
    The KQL query text. Always include a time filter.

.PARAMETER QueryFile
    A file that holds the KQL query text. Use instead of -Query for long queries.

.PARAMETER AppId
    The Application Insights application ID. Skips Logic App resolution.

.PARAMETER LogicAppName
    The Logic Apps Standard site name. Used to resolve the application ID.

.PARAMETER ResourceGroup
    The resource group of the Logic App.

.PARAMETER Subscription
    The subscription ID or name. Defaults to the active az CLI subscription.

.PARAMETER Timespan
    Optional ISO 8601 timespan, such as PT1H or P1D. Limits the query on the server in addition to KQL filters.

.PARAMETER ResolveOnly
    Prints the resolved application ID and exits without running a query.

.PARAMETER DetectTelemetryMode
    Reports whether the app emits v1, v2, or v2 with PreserveIncomingOperationId telemetry. Reads the configured
    settings when -LogicAppName is given, and samples live rows, because the runtime keeps a stored version.

.PARAMETER LookbackHours
    The number of hours of data that -DetectTelemetryMode samples. Defaults to 24.

.EXAMPLE
    .\Invoke-LogicAppInsightsQuery.ps1 -LogicAppName myapp -ResourceGroup myrg -Query "requests | where timestamp > ago(1h) | take 5"

.EXAMPLE
    .\Invoke-LogicAppInsightsQuery.ps1 -LogicAppName myapp -ResourceGroup myrg -DetectTelemetryMode
#>
[CmdletBinding(DefaultParameterSetName = 'ByApp')]
param(
    [string]$Query,
    [string]$QueryFile,
    [Parameter(ParameterSetName = 'ById', Mandatory = $true)]
    [string]$AppId,
    [Parameter(ParameterSetName = 'ByApp', Mandatory = $true)]
    [string]$LogicAppName,
    [Parameter(ParameterSetName = 'ByApp', Mandatory = $true)]
    [string]$ResourceGroup,
    [string]$Subscription,
    [string]$Timespan,
    [switch]$ResolveOnly,
    [switch]$DetectTelemetryMode,
    [ValidateRange(1, 720)]
    [int]$LookbackHours = 24
)

$ErrorActionPreference = 'Stop'

function Get-SubscriptionArguments {
    if ([string]::IsNullOrWhiteSpace($Subscription)) {
        return @()
    }

    return @('--subscription', $Subscription)
}

function Resolve-AppInsightsAppId {
    $subscriptionArguments = Get-SubscriptionArguments
    $connectionString = az webapp config appsettings list `
        --name $LogicAppName `
        --resource-group $ResourceGroup `
        @subscriptionArguments `
        --query "[?name=='APPLICATIONINSIGHTS_CONNECTION_STRING'].value | [0]" `
        --output tsv

    if ($LASTEXITCODE -ne 0) {
        throw "Could not read app settings for Logic App '$LogicAppName' in resource group '$ResourceGroup'."
    }

    if ([string]::IsNullOrWhiteSpace($connectionString)) {
        throw "Logic App '$LogicAppName' has no APPLICATIONINSIGHTS_CONNECTION_STRING setting. Application Insights is not configured."
    }

    $parts = @{}
    foreach ($segment in $connectionString.Split(';')) {
        $pair = $segment.Split('=', 2)
        if ($pair.Count -eq 2) {
            $parts[$pair[0].Trim()] = $pair[1].Trim()
        }
    }

    if ($parts.ContainsKey('ApplicationId') -and -not [string]::IsNullOrWhiteSpace($parts['ApplicationId'])) {
        return $parts['ApplicationId']
    }

    # NOTE: Older connection strings carry only the instrumentation key, so match it against
    # the components in the subscription without printing the key.
    $instrumentationKey = $parts['InstrumentationKey']
    if ([string]::IsNullOrWhiteSpace($instrumentationKey)) {
        throw "The Application Insights connection string for '$LogicAppName' has neither ApplicationId nor InstrumentationKey."
    }

    $components = az resource list `
        --resource-type 'Microsoft.Insights/components' `
        @subscriptionArguments `
        --query '[].id' `
        --output json | ConvertFrom-Json

    foreach ($componentId in $components) {
        $properties = az resource show --ids $componentId --query 'properties.{appId:AppId, key:InstrumentationKey}' --output json | ConvertFrom-Json
        if ($properties.key -eq $instrumentationKey) {
            return $properties.appId
        }
    }

    throw "No Application Insights component in the subscription matches the instrumentation key of '$LogicAppName'."
}

function Invoke-AppInsightsQuery {
    param(
        [string]$QueryText,
        [string]$QueryTimespan
    )

    $body = @{ query = $QueryText }
    if (-not [string]::IsNullOrWhiteSpace($QueryTimespan)) {
        $body['timespan'] = $QueryTimespan
    }

    # NOTE: az rest rejects a body file that starts with a UTF-8 byte order mark.
    $bodyFile = Join-Path ([System.IO.Path]::GetTempPath()) ("aiquery-{0}.json" -f [guid]::NewGuid())
    [System.IO.File]::WriteAllText($bodyFile, ($body | ConvertTo-Json -Compress), [System.Text.UTF8Encoding]::new($false))

    try {
        $raw = az rest `
            --method post `
            --url "https://api.applicationinsights.io/v1/apps/$AppId/query" `
            --resource 'https://api.applicationinsights.io' `
            --headers 'Content-Type=application/json' `
            --body "@$bodyFile" 2>&1 | Out-String
    }
    finally {
        Remove-Item -Path $bodyFile -ErrorAction SilentlyContinue
    }

    try {
        $response = $raw | ConvertFrom-Json
    }
    catch {
        throw "The query failed: $raw"
    }

    if ($null -eq $response.tables) {
        throw "The query failed: $raw"
    }

    $table = $response.tables[0]
    $columns = $table.columns.name
    foreach ($row in $table.rows) {
        $record = [ordered]@{}
        for ($index = 0; $index -lt $columns.Count; $index++) {
            $record[$columns[$index]] = $row[$index]
        }

        [pscustomobject]$record
    }
}

function Get-ConfiguredTelemetrySettings {
    $settings = [ordered]@{}
    $subscriptionArguments = Get-SubscriptionArguments
    $settingPattern = 'ApplicationInsightTelemetryVersion|PreserveIncomingOperationId'

    $appSettings = az webapp config appsettings list `
        --name $LogicAppName `
        --resource-group $ResourceGroup `
        @subscriptionArguments `
        --output json | ConvertFrom-Json

    foreach ($appSetting in $appSettings | Where-Object { $_.name -match $settingPattern }) {
        $settings["appSetting:$($appSetting.name)"] = $appSetting.value
    }

    $siteId = az webapp show `
        --name $LogicAppName `
        --resource-group $ResourceGroup `
        @subscriptionArguments `
        --query id `
        --output tsv

    # NOTE: host.json is read through the ARM host runtime VFS route so no SCM credentials are needed.
    $hostJsonText = az rest `
        --method get `
        --url "https://management.azure.com$siteId/hostruntime/admin/vfs/host.json" `
        --uri-parameters relativePath=1 api-version=2022-03-01 2>$null | Out-String

    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($hostJsonText)) {
        $settings['hostJson'] = '<unreadable>'
        return $settings
    }

    $workflowSettings = ($hostJsonText | ConvertFrom-Json).extensions.workflow.settings
    if ($null -ne $workflowSettings) {
        foreach ($property in $workflowSettings.PSObject.Properties | Where-Object { $_.Name -match $settingPattern }) {
            $settings["hostJson:$($property.Name)"] = $property.Value
        }
    }

    return $settings
}

function Get-TelemetryMode {
    # NOTE: The mode is decided from the newest 20 workflow rows, because an app that
    # changed modes keeps older rows in the other shape.
    $detectionQuery = @"
let lookback = $($LookbackHours)h;
let rows = requests
| where timestamp > ago(lookback)
| extend runId = tostring(parse_json(tostring(customDimensions.resource)).runId)
| extend isV2 = tostring(customDimensions.Category) startswith "Workflow.Operations" and isnotempty(runId)
| extend isV1 = name endswith ".ActionInvocation" or name endswith ".TriggerInvocation"
| where isV2 or isV1;
let recent = rows
| top 20 by timestamp desc
| summarize
    recentV2Rows = countif(isV2),
    recentV2RunIdMatches = countif(isV2 and operation_Id == runId),
    recentV1Rows = countif(isV1)
| extend joinKey = 1;
rows
| summarize
    v2Rows = countif(isV2),
    v2RunIdMatches = countif(isV2 and operation_Id == runId),
    v1Rows = countif(isV1),
    v2LastSeen = maxif(timestamp, isV2),
    v1LastSeen = maxif(timestamp, isV1)
| extend joinKey = 1
| join kind=inner recent on joinKey
| project-away joinKey, joinKey1
"@

    $sample = Invoke-AppInsightsQuery -QueryText $detectionQuery | Select-Object -First 1
    $recentV2Rows = [long]$sample.recentV2Rows
    $recentV1Rows = [long]$sample.recentV1Rows

    $mode = 'Unknown'
    if ($recentV2Rows -gt 0 -and $recentV2Rows -ge $recentV1Rows) {
        $matchRatio = $sample.recentV2RunIdMatches / $recentV2Rows
        $mode = if ($matchRatio -ge 0.9) { 'v2' } elseif ($matchRatio -le 0.1) { 'v2-preserve' } else { 'v2-mixed' }
    }
    elseif ($recentV1Rows -gt 0) {
        $mode = 'v1'
    }

    $modeChanged = ([long]$sample.v2Rows -gt 0 -and [long]$sample.v1Rows -gt 0) -or
        ([long]$sample.v2Rows -gt 0 -and $sample.v2RunIdMatches -ne $sample.v2Rows -and $sample.v2RunIdMatches -gt 0)

    $runIdExpression = 'coalesce(tostring(parse_json(tostring(customDimensions.resource)).runId), tostring(customDimensions.prop__flowRunSequenceId))'
    $guidance = switch ($mode) {
        'v2' { 'operation_Id equals the run ID. Group and look up runs by operation_Id or by the runId expression.' }
        'v2-preserve' { 'operation_Id comes from the caller traceparent and can span several runs. Group and look up runs by the runId expression only.' }
        'v2-mixed' { 'Recent rows mix run-ID and other operation_Id values. Use the runId expression only.' }
        'v1' { 'Each run has one random operation_Id. Requests carry no run ID; find the run ID in traces (prop__flowRunSequenceId) and join on operation_Id.' }
        default { "No workflow requests in the last $LookbackHours hours. Trigger a run or raise -LookbackHours." }
    }

    $result = [ordered]@{
        Mode = $mode
        Guidance = $guidance
        RunIdExpression = $runIdExpression
        ModeChangedInWindow = $modeChanged
        RecentV2Rows = $recentV2Rows
        RecentV2RowsWhereOperationIdIsRunId = [long]$sample.recentV2RunIdMatches
        RecentV1Rows = $recentV1Rows
        V2RequestRows = [long]$sample.v2Rows
        V2RowsWhereOperationIdIsRunId = [long]$sample.v2RunIdMatches
        V2LastSeen = $sample.v2LastSeen
        V1RequestRows = [long]$sample.v1Rows
        V1LastSeen = $sample.v1LastSeen
        LookbackHours = $LookbackHours
    }

    if ($PSCmdlet.ParameterSetName -eq 'ByApp') {
        $result['ConfiguredSettings'] = Get-ConfiguredTelemetrySettings
    }

    [pscustomobject]$result
}

if ($PSCmdlet.ParameterSetName -eq 'ByApp') {
    $AppId = Resolve-AppInsightsAppId
}

if ($ResolveOnly) {
    Write-Output $AppId
    return
}

if ($DetectTelemetryMode) {
    Get-TelemetryMode
    return
}

if (-not [string]::IsNullOrWhiteSpace($QueryFile)) {
    $Query = Get-Content -Path $QueryFile -Raw
}

if ([string]::IsNullOrWhiteSpace($Query)) {
    throw "Provide -Query, -QueryFile, -DetectTelemetryMode, or -ResolveOnly."
}

Invoke-AppInsightsQuery -QueryText $Query -QueryTimespan $Timespan