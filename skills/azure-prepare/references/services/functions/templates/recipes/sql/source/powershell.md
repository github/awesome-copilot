# PowerShell SQL Trigger + Output

## Dependencies

**host.json:**
```json
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  }
}
```

## Source Code

**SqlTriggerToDo/function.json:**
```json
{
  "bindings": [
    {
      "name": "changes",
      "type": "sqlTrigger",
      "direction": "in",
      "tableName": "[dbo].[ToDo]",
      "connectionStringSetting": "AZURE_SQL_CONNECTION_STRING_KEY"
    }
  ]
}
```

**SqlTriggerToDo/run.ps1:**
```powershell
param($changes)

Write-Host "SQL trigger function processed $($changes.Count) changes"

foreach ($change in $changes) {
    $item = $change.Item
    Write-Host "Change operation: $($change.Operation)"
    Write-Host "Id: $($item.id), Title: $($item.title), Url: $($item.url), Completed: $($item.completed)"
}
```

**HttpTriggerSqlOutput/function.json:**
```json
{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "Request",
      "methods": ["post"]
    },
    {
      "type": "http",
      "direction": "out",
      "name": "Response"
    },
    {
      "name": "todo",
      "type": "sql",
      "direction": "out",
      "commandText": "dbo.ToDo",
      "connectionStringSetting": "AZURE_SQL_CONNECTION_STRING_KEY"
    }
  ]
}
```

**HttpTriggerSqlOutput/run.ps1:**
```powershell
using namespace System.Net

param($Request, $TriggerMetadata)

Write-Host "HTTP trigger with SQL Output Binding processed a request."

$body = $Request.Body

if (-not $body -or -not $body.title -or -not $body.url) {
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::BadRequest
        Body = '{"error":"Missing required fields: title and url"}'
        ContentType = 'application/json'
    })
    return
}

Push-OutputBinding -Name todo -Value $body

Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = [HttpStatusCode]::Created
    Body = ($body | ConvertTo-Json)
    ContentType = 'application/json'
})
```

**health/function.json:**
```json
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "Request",
      "methods": ["get"]
    },
    {
      "type": "http",
      "direction": "out",
      "name": "Response"
    }
  ]
}
```

**health/run.ps1:**
```powershell
param($Request, $TriggerMetadata)

Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = [HttpStatusCode]::OK
    Body = '{"status":"healthy","trigger":"sql"}'
    ContentType = 'application/json'
})
```

## App Settings Required

```
AZURE_SQL_CONNECTION_STRING_KEY=Server=<server>.database.windows.net;Database=<db>;Authentication=Active Directory Managed Identity;User Id=<uami-client-id>
```

## Common Patterns

- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
