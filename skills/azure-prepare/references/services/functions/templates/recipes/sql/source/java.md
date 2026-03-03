# Java SQL Trigger + Output

## Dependencies

**pom.xml:**
```xml
<dependency>
    <groupId>com.microsoft.azure.functions</groupId>
    <artifactId>azure-functions-java-library</artifactId>
    <version>3.0.0</version>
</dependency>
<dependency>
    <groupId>com.microsoft.azure.functions</groupId>
    <artifactId>azure-functions-java-library-sql</artifactId>
    <version>2.0.0</version>
</dependency>
```

## Source Code

**src/main/java/com/function/ToDoItem.java:**
```java
package com.function;

public class ToDoItem {
    public String id;
    public String title;
    public String url;
    public Integer order;
    public Boolean completed;
}
```

**src/main/java/com/function/SqlFunctions.java:**
```java
package com.function;

import com.microsoft.azure.functions.*;
import com.microsoft.azure.functions.annotation.*;
import com.microsoft.azure.functions.sql.annotation.*;

import java.util.Optional;

public class SqlFunctions {

    @FunctionName("SqlTriggerToDo")
    public void sqlTrigger(
            @SqlTrigger(
                name = "changes",
                tableName = "[dbo].[ToDo]",
                connectionStringSetting = "AZURE_SQL_CONNECTION_STRING_KEY")
            SqlChangeItem<ToDoItem>[] changes,
            final ExecutionContext context) {
        
        context.getLogger().info("SQL trigger function processed " + changes.length + " changes");
        
        for (SqlChangeItem<ToDoItem> change : changes) {
            ToDoItem item = change.getItem();
            context.getLogger().info("Change operation: " + change.getOperation());
            context.getLogger().info(String.format("Id: %s, Title: %s, Url: %s, Completed: %s",
                item.id, item.title, item.url, item.completed));
        }
    }

    @FunctionName("HttpTriggerSqlOutput")
    public HttpResponseMessage httpTriggerSqlOutput(
            @HttpTrigger(
                name = "req",
                methods = {HttpMethod.POST},
                authLevel = AuthorizationLevel.FUNCTION)
            HttpRequestMessage<Optional<ToDoItem>> request,
            @SqlOutput(
                name = "todo",
                commandText = "dbo.ToDo",
                connectionStringSetting = "AZURE_SQL_CONNECTION_STRING_KEY")
            OutputBinding<ToDoItem> output,
            final ExecutionContext context) {
        
        context.getLogger().info("HTTP trigger with SQL Output Binding processed a request.");
        
        ToDoItem item = request.getBody().orElse(null);
        if (item == null || item.title == null || item.url == null) {
            return request.createResponseBuilder(HttpStatus.BAD_REQUEST)
                    .body("{\"error\":\"Missing required fields: title and url\"}")
                    .build();
        }
        
        output.setValue(item);
        
        return request.createResponseBuilder(HttpStatus.CREATED)
                .header("Content-Type", "application/json")
                .body(item)
                .build();
    }

    @FunctionName("health")
    public HttpResponseMessage health(
            @HttpTrigger(name = "req", methods = {HttpMethod.GET}, authLevel = AuthorizationLevel.ANONYMOUS)
            HttpRequestMessage<Optional<String>> request,
            final ExecutionContext context) {
        
        return request.createResponseBuilder(HttpStatus.OK)
                .header("Content-Type", "application/json")
                .body("{\"status\":\"healthy\",\"trigger\":\"sql\"}")
                .build();
    }
}
```

## Files to Remove

- Default HTTP trigger Java file

## App Settings Required

```
AZURE_SQL_CONNECTION_STRING_KEY=Server=<server>.database.windows.net;Database=<db>;Authentication=Active Directory Managed Identity;User Id=<uami-client-id>
```

## Common Patterns

- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
