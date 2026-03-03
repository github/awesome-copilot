# C# (.NET) MCP Tools

## Dependencies

**.csproj:**
```xml
<PackageReference Include="Microsoft.Azure.Functions.Worker" Version="1.*" />
<PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Http" Version="3.*" />
<PackageReference Include="System.Text.Json" Version="8.*" />
```

## Source Code

**McpTools.cs:**
```csharp
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace McpFunctions;

public class McpTools
{
    private readonly ILogger<McpTools> _logger;
    
    private static readonly object[] Tools = new[]
    {
        new {
            name = "get_weather",
            description = "Get weather for a city",
            inputSchema = new {
                type = "object",
                properties = new { city = new { type = "string", description = "City name" } },
                required = new[] { "city" }
            }
        },
        new {
            name = "search_docs",
            description = "Search documentation",
            inputSchema = new {
                type = "object",
                properties = new { query = new { type = "string", description = "Search query" } },
                required = new[] { "query" }
            }
        }
    };

    public McpTools(ILogger<McpTools> logger)
    {
        _logger = logger;
    }

    [Function("mcp")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequestData req)
    {
        var body = await JsonSerializer.DeserializeAsync<JsonElement>(req.Body);
        var method = body.GetProperty("method").GetString();
        var id = body.GetProperty("id").GetInt32();

        var response = req.CreateResponse();
        response.Headers.Add("Content-Type", "application/json");

        if (method == "tools/list")
        {
            var result = new { jsonrpc = "2.0", id, result = new { tools = Tools } };
            await response.WriteAsJsonAsync(result);
            return response;
        }

        if (method == "tools/call")
        {
            var toolParams = body.GetProperty("params");
            var toolName = toolParams.GetProperty("name").GetString();
            var args = toolParams.GetProperty("arguments");

            object toolResult = toolName switch
            {
                "get_weather" => new { temperature = 72, conditions = "sunny", city = args.GetProperty("city").GetString() },
                "search_docs" => new { results = new[] { $"Result for: {args.GetProperty("query").GetString()}" }, count = 1 },
                _ => null
            };

            if (toolResult == null)
            {
                response.StatusCode = System.Net.HttpStatusCode.BadRequest;
                await response.WriteAsJsonAsync(new { jsonrpc = "2.0", id, error = new { code = -32601, message = "Tool not found" } });
                return response;
            }

            var content = new[] { new { type = "text", text = JsonSerializer.Serialize(toolResult) } };
            await response.WriteAsJsonAsync(new { jsonrpc = "2.0", id, result = new { content } });
            return response;
        }

        response.StatusCode = System.Net.HttpStatusCode.BadRequest;
        await response.WriteAsJsonAsync(new { jsonrpc = "2.0", id, error = new { code = -32601, message = "Method not found" } });
        return response;
    }

    [Function("health")]
    public HttpResponseData Health(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
    {
        var response = req.CreateResponse();
        response.Headers.Add("Content-Type", "application/json");
        response.WriteString("{\"status\":\"healthy\",\"type\":\"mcp\"}");
        return response;
    }
}
```

## Files to Remove

- HTTP trigger file from base template
