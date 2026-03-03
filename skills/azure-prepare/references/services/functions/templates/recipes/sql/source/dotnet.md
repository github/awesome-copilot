# C# (.NET) SQL Trigger + Output

## Dependencies

**.csproj:**
```xml
<PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Sql" Version="3.*" />
```

## Source Code

**ToDoItem.cs:**
```csharp
namespace AzureSQL.ToDo;

public class ToDoItem
{
    public string Id { get; set; }
    public string title { get; set; }
    public string url { get; set; }
    public int? order { get; set; }
    public bool? completed { get; set; }
}
```

**sql_trigger.cs:**
```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Extensions.Sql;
using Microsoft.Extensions.Logging;

namespace AzureSQL.ToDo;

public static class ToDoTrigger
{
    [Function("sql_trigger_todo")]
    public static void Run(
        [SqlTrigger("[dbo].[ToDo]", "AZURE_SQL_CONNECTION_STRING_KEY")]
            IReadOnlyList<SqlChange<ToDoItem>> changes,
        FunctionContext context
    )
    {
        var logger = context.GetLogger("ToDoTrigger");
        foreach (SqlChange<ToDoItem> change in changes)
        {
            ToDoItem toDoItem = change.Item;
            logger.LogInformation($"Change operation: {change.Operation}");
            logger.LogInformation(
                $"Id: {toDoItem.Id}, Title: {toDoItem.title}, Url: {toDoItem.url}, Completed: {toDoItem.completed}"
            );
        }
    }
}
```

**sql_output_http_trigger.cs:**
```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Extensions.Sql;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using FromBodyAttribute = Microsoft.Azure.Functions.Worker.Http.FromBodyAttribute;

namespace AzureSQL.ToDo;

public class SqlOutputBindingHttpTrigger
{
    private readonly ILogger _logger;

    public SqlOutputBindingHttpTrigger(ILoggerFactory loggerFactory)
    {
        _logger = loggerFactory.CreateLogger<SqlOutputBindingHttpTrigger>();
    }

    [Function("httptrigger-sql-output")]
    public async Task<OutputType> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = null)] HttpRequestData req,
        [FromBody] ToDoItem toDoItem
    )
    {
        _logger.LogInformation(
            "C# HTTP trigger with SQL Output Binding function processed a request."
        );

        return new OutputType
        {
            ToDoItem = toDoItem,
            HttpResponse = new CreatedResult(req.Url, toDoItem)
        };
    }
}

public class OutputType
{
    [SqlOutput("dbo.ToDo", connectionStringSetting: "AZURE_SQL_CONNECTION_STRING_KEY")]
    public required ToDoItem ToDoItem { get; set; }

    public required IActionResult HttpResponse { get; set; }
}
```

## Files to Remove

- HTTP trigger file from base template

## Test

```bash
curl -X POST "https://<func>.azurewebsites.net/api/httptrigger-sql-output?code=<key>" \
  -H "Content-Type: application/json" \
  -d '{"Id": "1", "title": "Test", "url": "https://example.com", "completed": false}'
```

## Common Patterns

- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
