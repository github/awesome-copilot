# Running Queries

This page explains how to send KQL to the Application Insights data for a Logic Apps
Standard app. All paths are read-only.

| Path | Needs | Use when |
|------|-------|----------|
| [Helper script](#helper-script) | `az` CLI | Default. Resolves the app, runs the query, and detects the telemetry mode. |
| [`az rest`](#az-rest) | `az` CLI | PowerShell is not available, or you want the raw API response. |
| [`az monitor app-insights query`](#az-monitor-app-insights-query) | `application-insights` extension | You already use the extension. |
| [`az monitor log-analytics query`](#az-monitor-log-analytics-query) | `log-analytics` extension and workspace access | You only have rights on the Log Analytics workspace. |

Sign in first with `az login`, and select the subscription with
`az account set --subscription <id>` or pass `-Subscription`.

## Helper Script

`scripts/Invoke-LogicAppInsightsQuery.ps1` finds the Application Insights resource
from the app's `APPLICATIONINSIGHTS_CONNECTION_STRING` setting, reads its application
ID, and posts the query to the Application Insights query API. It never prints the
connection string or instrumentation key.

```powershell
# Resolve from the Logic App.
.\scripts\Invoke-LogicAppInsightsQuery.ps1 `
    -LogicAppName myapp `
    -ResourceGroup myrg `
    -Query "requests | where timestamp > ago(1h) | take 5"

# Use a known application ID and a query file.
.\scripts\Invoke-LogicAppInsightsQuery.ps1 -AppId <appId> -QueryFile .\failed-runs.kql

# Print only the application ID.
.\scripts\Invoke-LogicAppInsightsQuery.ps1 -LogicAppName myapp -ResourceGroup myrg -ResolveOnly
```

| Parameter | Meaning |
|-----------|---------|
| `-LogicAppName`, `-ResourceGroup` | The Logic App. The script resolves the application ID. |
| `-AppId` | The Application Insights application ID. Skips resolution and the app settings read. |
| `-Subscription` | Subscription ID or name. Defaults to the active `az` subscription. |
| `-Query`, `-QueryFile` | The KQL text. Use a file for long or multi-line queries. |
| `-Timespan` | Optional ISO 8601 window, such as `PT1H` or `P1D`. See [Time windows](#time-windows). |
| `-ResolveOnly` | Prints the application ID and exits. |
| `-DetectTelemetryMode` | Reports the telemetry mode. See below. |
| `-LookbackHours` | Hours of data that mode detection samples. 1 to 720, default 24. |

The script returns one PowerShell object per row, with the KQL column names as
properties. Pipe the result to `Format-Table` or `ConvertTo-Json`. When the API rejects
the query, the script throws `The query failed: ...` with the service error, which
usually names the bad column or syntax.

## Detect the Telemetry Mode

Run this before you write any query about runs. The mode decides how to find a run ID.

```powershell
.\scripts\Invoke-LogicAppInsightsQuery.ps1 -LogicAppName myapp -ResourceGroup myrg -DetectTelemetryMode
```

The script samples the newest 20 workflow request rows in the lookback window.

| `Mode` | Meaning | How to group by run |
|--------|---------|---------------------|
| `v2` | `operation_Id` equals the run ID on most recent rows | `operation_Id` or the run ID expression |
| `v2-preserve` | v2 with `PreserveIncomingOperationId`. `operation_Id` comes from the caller and can span runs. | The run ID expression only |
| `v2-mixed` | Recent rows mix both shapes, usually because the setting changed | The run ID expression only |
| `v1` | Legacy telemetry. One random `operation_Id` per run. Requests have no run ID. | `prop__flowRunSequenceId` in traces, then join on `operation_Id` |
| `Unknown` | No workflow requests in the window | Trigger a run or raise `-LookbackHours` |

Other output fields:

| Field | Meaning |
|-------|---------|
| `Guidance` | One-line advice for the mode |
| `RunIdExpression` | A KQL expression that returns the run ID in both v1 and v2 rows |
| `ModeChangedInWindow` | `True` when the window holds rows of more than one shape. Older rows may need the other shape. |
| `RecentV2Rows`, `RecentV2RowsWhereOperationIdIsRunId`, `RecentV1Rows` | Counts from the newest 20 rows. These decide the mode. |
| `V2RequestRows`, `V2RowsWhereOperationIdIsRunId`, `V1RequestRows` | Counts for the whole window |
| `V2LastSeen`, `V1LastSeen` | Newest row of each shape |
| `ConfiguredSettings` | Only with `-LogicAppName`. The `ApplicationInsightTelemetryVersion` and `PreserveIncomingOperationId` values from app settings (`appSetting:`) and `host.json` (`hostJson:`). `hostJson = <unreadable>` means the caller cannot read the file. |

Trust the live rows over `ConfiguredSettings`. The runtime stores the version it last
used, so an app that ran v1 keeps emitting v1 after the setting is removed. It switches
back only when v2 is set explicitly. When the two disagree, report both.

## az rest

This is the call the helper makes. Use it when you already know the application ID.

```powershell
$appId = az monitor app-insights component show `
    --app <componentName> `
    --resource-group <rg> `
    --query appId `
    --output tsv

@{ query = "requests | where timestamp > ago(1h) | summarize count() by success"; timespan = "PT1H" } |
    ConvertTo-Json -Compress |
    Set-Content -Path query.json -Encoding ascii

az rest `
    --method post `
    --url "https://api.applicationinsights.io/v1/apps/$appId/query" `
    --resource "https://api.applicationinsights.io" `
    --body "@query.json"
```

The `component show` call needs the `application-insights` extension. Without it, use
the helper's `-ResolveOnly`.

Notes:

- Keep the body in a file. Inline JSON breaks on quotes in most shells.
- `--resource` sets the token audience explicitly. Recent `az` versions infer it, but
  passing it does no harm.
- The response is `{ "tables": [ { "columns": [...], "rows": [[...]] } ] }`. Match
  each row value to its column by position.

## az monitor app-insights query

Install the extension once:

```powershell
az extension add --name application-insights
```

In an unattended shell, install the extension first. Otherwise `az` asks for
confirmation and fails when no one can answer.

```powershell
az monitor app-insights query `
    --app <componentName> `
    --resource-group <rg> `
    --analytics-query "requests | where timestamp > ago(1d) | summarize count() by success" `
    --offset 1d
```

`--app` also accepts the application ID, in which case you can omit
`--resource-group`. The output has the same shape as the `az rest` response.

Always pass `--offset` or `--start-time` and `--end-time`. The command defaults to the
last hour, and that window silently cuts any longer KQL filter. See
[Time windows](#time-windows).

## az monitor log-analytics query

Most Logic Apps Standard apps send Application Insights data to a Log Analytics
workspace. Query the workspace when you have rights there but not on the Application
Insights resource.

```powershell
az extension add --name log-analytics

$workspaceId = az monitor app-insights component show `
    --app <componentName> `
    --resource-group <rg> `
    --query workspaceResourceId `
    --output tsv

$customerId = az monitor log-analytics workspace show --ids $workspaceId --query customerId --output tsv

az monitor log-analytics query `
    --workspace $customerId `
    --analytics-query "AppRequests | where _ResourceId endswith '/components/<componentName>' | summarize count() by Success" `
    --timespan P1D
```

Rules for workspace queries:

- Use the workspace table and column names: `AppRequests`, `AppTraces`,
  `AppExceptions`, `AppDependencies`, `TimeGenerated`, `OperationId`, `Properties`,
  and so on. See the mapping in
  [telemetry-schema.md](telemetry-schema.md#workspace-based-tables).
- Filter by `_ResourceId` or `AppRoleName` on every query. Several Application
  Insights resources often share one workspace. In testing, a shared workspace returned
  1,700 request rows, of which only 204 came from the target app.
- The output is a flat list of row objects, not the `tables` shape.

## Time Windows

Each path can apply a server-side window on top of the KQL filter. The service uses the
overlap of the two, so the shorter window wins.

| Path | Server window | Default |
|------|---------------|---------|
| Helper, `az rest` | `-Timespan`, or `timespan` in the body | None |
| `az monitor app-insights query` | `--offset`, or `--start-time` and `--end-time` | Last hour |
| `az monitor log-analytics query` | `--timespan` | None |

In testing, the same query with `ago(1d)` returned 204 rows with `--offset 1d` and
132 rows with the default. Put the window in KQL with `let lookback = ...;` and set the
server window to the same length or omit it.

## Permissions

| Action | Role |
|--------|------|
| Query the Application Insights resource | Reader or Monitoring Reader on the resource |
| Query the workspace | Log Analytics Reader on the workspace |
| Resolve the resource from the Logic App | `Microsoft.Web/sites/config/list/action` on the app, which Website Contributor includes. Plain Reader is not enough. |
| Read `host.json` during mode detection | Access to the app's host runtime API, which Website Contributor includes |

If you can query but cannot read app settings, pass `-AppId` to the helper. Mode
detection still works from the live rows, without `ConfiguredSettings`.

## Ingestion Delay

New rows take about 2 to 5 minutes to appear. If a run that just finished is missing,
wait and run the query again before you conclude that the runtime did not log it.
