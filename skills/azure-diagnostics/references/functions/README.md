# Function Apps Troubleshooting

## Find Linked App Insights / Log Analytics

### Preferred: Use Azure Resource Graph

A single ARG query returns the App Insights name, instrumentation key, connection string, and Log Analytics workspace for a given function app:

```bash
az graph query -q "
  resources
  | where type =~ 'microsoft.web/sites' and name == '<func-app-name>'
  | project funcName=name, rg=resourceGroup
  | join kind=inner (
      resources
      | where type =~ 'microsoft.insights/components'
      | project appiName=name, rg=resourceGroup,
               instrumentationKey=properties.InstrumentationKey,
               connectionString=properties.ConnectionString,
               workspaceId=properties.WorkspaceResourceId
  ) on rg
  | project funcName, appiName, instrumentationKey, connectionString, workspaceId
" -o json
```

> 💡 **Tip:** This join matches by resource group. If App Insights is in a different resource group, use the CLI fallback below.

### Fallback: CLI Commands

#### Step 1: Get the App Insights connection string from app settings

```bash
az functionapp config appsettings list \
  --name <func-app-name> -g <rg-name> \
  --query "[?name=='APPLICATIONINSIGHTS_CONNECTION_STRING' || name=='APPINSIGHTS_INSTRUMENTATIONKEY']"
```

#### Step 2: Find the App Insights resource by instrumentation key

```bash
az monitor app-insights component show \
  --query "[?instrumentationKey=='<key>'] | [0].{name:name, rg:resourceGroup, workspaceId:workspaceResourceId}"
```

#### Step 3: Find the Log Analytics workspace

```bash
az monitor app-insights component show --app <appinsights-name> -g <rg-name> \
  --query "workspaceResourceId" -o tsv
```

### Confirm logs are flowing

Query App Insights `traces` table to verify the function app is sending telemetry:

```bash
az monitor app-insights query --apps <appinsights-name> -g <rg-name> \
  --analytics-query "traces | where operation_Name != '' | take 1 | project timestamp, operation_Name, message"
```

For `FunctionAppLogs` (available in Log Analytics only, not App Insights), query the workspace directly:

```bash
az monitor log-analytics query -w <workspace-guid> \
  --analytics-query "FunctionAppLogs | where _ResourceId contains '<func-app-name>' | take 5 | project TimeGenerated, FunctionName, Message, Level"
```

> ⚠️ **Classic App Insights:** Some function apps use classic App Insights without a linked Log Analytics workspace (`workspaceId` is null). In this case, `FunctionAppLogs` is **not available** — use the `traces`, `requests`, and `exceptions` tables via `az monitor app-insights query` instead. As a last resort, `az webapp log tail --name <func-app-name> -g <rg-name>` can stream live logs directly.

If results are returned, logs are flowing. If empty, verify the `APPLICATIONINSIGHTS_CONNECTION_STRING` app setting matches this App Insights instance.

> ⚠️ **Always prefer querying App Insights or Log Analytics** for function app logs. `az webapp log tail` can stream live logs directly but App Insights provides richer data, historical queries, and correlation across requests.

> 💡 **Tip:** App Insights logs can be delayed by a few minutes. If you don't see recent data, wait 3-5 minutes and query again.

---

## Check Recent Deployments

Correlate issues with recent deployments by listing deployment history:

```bash
az rest --method get \
  --uri "/subscriptions/<subscription-id>/resourceGroups/<rg-name>/providers/Microsoft.Web/sites/<func-app-name>/deployments?api-version=2023-12-01"
```

Compare deployment timestamps against when errors started appearing in App Insights to identify if a deployment caused the issue.

