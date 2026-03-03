# PowerShell Durable Functions

## Dependencies

**requirements.psd1:**
```powershell
@{
    'Az.Accounts' = '2.*'
}
```

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

**HttpStart/function.json:**
```json
{
  "bindings": [
    {
      "authLevel": "function",
      "name": "Request",
      "type": "httpTrigger",
      "direction": "in",
      "methods": ["post"]
    },
    {
      "name": "$return",
      "type": "http",
      "direction": "out"
    },
    {
      "name": "starter",
      "type": "durableClient",
      "direction": "in"
    }
  ]
}
```

**HttpStart/run.ps1:**
```powershell
using namespace System.Net

param($Request, $TriggerMetadata)

$InstanceId = Start-DurableOrchestration -FunctionName 'HelloOrchestrator'
Write-Host "Started orchestration with ID = '$InstanceId'"

$Response = New-DurableOrchestrationCheckStatusResponse -Request $Request -InstanceId $InstanceId
Push-OutputBinding -Name Response -Value $Response
```

**HelloOrchestrator/function.json:**
```json
{
  "bindings": [
    {
      "name": "Context",
      "type": "orchestrationTrigger",
      "direction": "in"
    }
  ]
}
```

**HelloOrchestrator/run.ps1:**
```powershell
param($Context)

$outputs = @()
$outputs += Invoke-DurableActivity -FunctionName 'SayHello' -Input 'Seattle'
$outputs += Invoke-DurableActivity -FunctionName 'SayHello' -Input 'Tokyo'
$outputs += Invoke-DurableActivity -FunctionName 'SayHello' -Input 'London'

return $outputs
```

**SayHello/function.json:**
```json
{
  "bindings": [
    {
      "name": "name",
      "type": "activityTrigger",
      "direction": "in"
    }
  ]
}
```

**SayHello/run.ps1:**
```powershell
param($name)

Write-Host "Saying hello to $name"
return "Hello $name"
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
    Body = '{"status":"healthy","type":"durable"}'
    ContentType = 'application/json'
})
```

## Storage Flags Required

```bicep
enableQueue: true   // Required for Durable task hub
enableTable: true   // Required for Durable orchestration history
```
