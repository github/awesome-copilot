# PowerShell — Azure Functions Triggers & Bindings

> **Model**: PowerShell uses `function.json` for binding definitions + `run.ps1` for handler code.
> Each function lives in its own directory: `<FunctionName>/function.json` + `run.ps1`

## Project Structure

```
src/
├── host.json
├── local.settings.json
├── requirements.psd1
├── profile.ps1
├── HttpFunction/
│   ├── function.json
│   └── run.ps1
└── TimerFunction/
    ├── function.json
    └── run.ps1
```

## HTTP Trigger

**function.json:**
```json
{
  "bindings": [
    { "authLevel": "anonymous", "type": "httpTrigger", "direction": "in",
      "name": "Request", "methods": ["get", "post"] },
    { "type": "http", "direction": "out", "name": "Response" }
  ]
}
```

**run.ps1:**
```powershell
param($Request, $TriggerMetadata)
$name = $Request.Query.Name
Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = [HttpStatusCode]::OK
    Body = "Hello, $name!"
})
```

## Blob Storage

**function.json:**
```json
{
  "bindings": [
    { "name": "InputBlob", "type": "blobTrigger", "direction": "in",
      "path": "samples-workitems/{name}", "connection": "AzureWebJobsStorage" },
    { "name": "OutputBlob", "type": "blob", "direction": "out",
      "path": "output/{name}", "connection": "AzureWebJobsStorage" }
  ]
}
```

**run.ps1:**
```powershell
param($InputBlob, $TriggerMetadata)
Write-Host "Blob: $($TriggerMetadata.Name), Size: $($InputBlob.Length)"
Push-OutputBinding -Name OutputBlob -Value $InputBlob
```

## Queue Storage

**function.json:**
```json
{
  "bindings": [
    { "name": "QueueItem", "type": "queueTrigger", "direction": "in",
      "queueName": "myqueue-items", "connection": "AzureWebJobsStorage" },
    { "name": "OutputQueue", "type": "queue", "direction": "out",
      "queueName": "outqueue", "connection": "AzureWebJobsStorage" }
  ]
}
```

**run.ps1:**
```powershell
param($QueueItem, $TriggerMetadata)
Write-Host "Queue message: $QueueItem"
Push-OutputBinding -Name OutputQueue -Value "Processed: $QueueItem"
```

## Timer

**function.json:**
```json
{
  "bindings": [
    { "name": "Timer", "type": "timerTrigger", "direction": "in",
      "schedule": "0 */5 * * * *" }
  ]
}
```

**run.ps1:**
```powershell
param($Timer)
Write-Host "Timer triggered at: $(Get-Date)"
```

## Event Grid

**function.json:**
```json
{
  "bindings": [
    { "name": "EventGridEvent", "type": "eventGridTrigger", "direction": "in" }
  ]
}
```

**run.ps1:**
```powershell
param($EventGridEvent, $TriggerMetadata)
Write-Host "Event: $($EventGridEvent.subject) - $($EventGridEvent.eventType)"
```

## Cosmos DB

**function.json:**
```json
{
  "bindings": [
    { "name": "Documents", "type": "cosmosDBTrigger", "direction": "in",
      "connectionStringSetting": "CosmosDBConnection", "databaseName": "mydb",
      "containerName": "mycontainer", "createLeaseContainerIfNotExists": true },
    { "name": "OutputDoc", "type": "cosmosDB", "direction": "out",
      "connectionStringSetting": "CosmosDBConnection", "databaseName": "mydb",
      "containerName": "outcontainer" }
  ]
}
```

**run.ps1:**
```powershell
param($Documents, $TriggerMetadata)
foreach ($doc in $Documents) {
    Write-Host "Changed doc: $($doc.id)"
}
```

## Service Bus

**function.json:**
```json
{
  "bindings": [
    { "name": "Message", "type": "serviceBusTrigger", "direction": "in",
      "queueName": "myqueue", "connection": "ServiceBusConnection" },
    { "name": "OutputMessage", "type": "serviceBus", "direction": "out",
      "queueName": "outqueue", "connection": "ServiceBusConnection" }
  ]
}
```

**run.ps1:**
```powershell
param($Message, $TriggerMetadata)
Write-Host "Message: $Message"
Push-OutputBinding -Name OutputMessage -Value "Processed: $Message"
```

## Event Hubs

**function.json:**
```json
{
  "bindings": [
    { "name": "Events", "type": "eventHubTrigger", "direction": "in",
      "eventHubName": "myeventhub", "connection": "EventHubConnection",
      "cardinality": "many" }
  ]
}
```

## Table Storage

**function.json:**
```json
{
  "bindings": [
    { "name": "TableEntity", "type": "table", "direction": "in",
      "tableName": "mytable", "partitionKey": "{pk}", "rowKey": "{rk}",
      "connection": "AzureWebJobsStorage" },
    { "name": "TableOut", "type": "table", "direction": "out",
      "tableName": "mytable", "connection": "AzureWebJobsStorage" }
  ]
}
```

## SQL

**function.json:**
```json
{
  "bindings": [
    { "name": "Changes", "type": "sqlTrigger", "direction": "in",
      "tableName": "dbo.MyTable", "connectionStringSetting": "SqlConnection" }
  ]
}
```

## SendGrid

**function.json:**
```json
{
  "bindings": [
    { "name": "Mail", "type": "sendGrid", "direction": "out",
      "apiKey": "SendGridApiKey", "from": "noreply@example.com" }
  ]
}
```

> **Note**: PowerShell always requires `function.json` — it does not support inline binding definitions.

> Full reference: [Azure Functions PowerShell developer guide](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-powershell)
