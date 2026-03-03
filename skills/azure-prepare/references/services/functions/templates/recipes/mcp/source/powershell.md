# PowerShell MCP Tools

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

**mcp/function.json:**
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
    }
  ]
}
```

**mcp/run.ps1:**
```powershell
using namespace System.Net

param($Request, $TriggerMetadata)

$body = $Request.Body
$method = $body.method
$id = $body.id

$tools = @(
    @{
        name = "get_weather"
        description = "Get weather for a city"
        inputSchema = @{
            type = "object"
            properties = @{
                city = @{ type = "string"; description = "City name" }
            }
            required = @("city")
        }
    },
    @{
        name = "search_docs"
        description = "Search documentation"
        inputSchema = @{
            type = "object"
            properties = @{
                query = @{ type = "string"; description = "Search query" }
            }
            required = @("query")
        }
    }
)

if ($method -eq "tools/list") {
    $result = @{
        jsonrpc = "2.0"
        id = $id
        result = @{ tools = $tools }
    }
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::OK
        Body = ($result | ConvertTo-Json -Depth 10)
        ContentType = 'application/json'
    })
    return
}

if ($method -eq "tools/call") {
    $toolName = $body.params.name
    $args = $body.params.arguments
    
    $toolResult = switch ($toolName) {
        "get_weather" {
            @{ temperature = 72; conditions = "sunny"; city = $args.city }
        }
        "search_docs" {
            @{ results = @("Result for: $($args.query)"); count = 1 }
        }
        default {
            Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
                StatusCode = [HttpStatusCode]::BadRequest
                Body = (@{ jsonrpc = "2.0"; id = $id; error = @{ code = -32601; message = "Tool not found" } } | ConvertTo-Json)
                ContentType = 'application/json'
            })
            return
        }
    }
    
    $result = @{
        jsonrpc = "2.0"
        id = $id
        result = @{
            content = @(
                @{ type = "text"; text = ($toolResult | ConvertTo-Json) }
            )
        }
    }
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::OK
        Body = ($result | ConvertTo-Json -Depth 10)
        ContentType = 'application/json'
    })
    return
}

Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = [HttpStatusCode]::BadRequest
    Body = (@{ jsonrpc = "2.0"; id = $id; error = @{ code = -32601; message = "Method not found" } } | ConvertTo-Json)
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
    Body = '{"status":"healthy","type":"mcp"}'
    ContentType = 'application/json'
})
```

## Storage Flags

```bicep
enableQueue: true   // Required for MCP state management and backplane
```
