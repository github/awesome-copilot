# Java MCP Tools

## Dependencies

**pom.xml:**
```xml
<dependency>
    <groupId>com.microsoft.azure.functions</groupId>
    <artifactId>azure-functions-java-library</artifactId>
    <version>3.0.0</version>
</dependency>
<dependency>
    <groupId>com.google.code.gson</groupId>
    <artifactId>gson</artifactId>
    <version>2.10.1</version>
</dependency>
```

## Source Code

**src/main/java/com/function/McpTools.java:**
```java
package com.function;

import com.microsoft.azure.functions.*;
import com.microsoft.azure.functions.annotation.*;
import com.google.gson.*;

import java.util.*;

public class McpTools {

    private static final Gson gson = new Gson();
    
    private static final List<Map<String, Object>> TOOLS = Arrays.asList(
        createTool("get_weather", "Get weather for a city", 
            Map.of("city", Map.of("type", "string", "description", "City name")),
            List.of("city")),
        createTool("search_docs", "Search documentation",
            Map.of("query", Map.of("type", "string", "description", "Search query")),
            List.of("query"))
    );

    private static Map<String, Object> createTool(String name, String description, 
            Map<String, Object> properties, List<String> required) {
        Map<String, Object> tool = new HashMap<>();
        tool.put("name", name);
        tool.put("description", description);
        tool.put("inputSchema", Map.of(
            "type", "object",
            "properties", properties,
            "required", required
        ));
        return tool;
    }

    @FunctionName("mcp")
    public HttpResponseMessage mcp(
            @HttpTrigger(name = "req", methods = {HttpMethod.POST}, authLevel = AuthorizationLevel.FUNCTION)
            HttpRequestMessage<Optional<String>> request,
            final ExecutionContext context) {
        
        JsonObject body = JsonParser.parseString(request.getBody().orElse("{}")).getAsJsonObject();
        String method = body.get("method").getAsString();
        int id = body.get("id").getAsInt();

        if ("tools/list".equals(method)) {
            Map<String, Object> result = Map.of(
                "jsonrpc", "2.0",
                "id", id,
                "result", Map.of("tools", TOOLS)
            );
            return request.createResponseBuilder(HttpStatus.OK)
                    .header("Content-Type", "application/json")
                    .body(gson.toJson(result))
                    .build();
        }

        if ("tools/call".equals(method)) {
            JsonObject params = body.getAsJsonObject("params");
            String toolName = params.get("name").getAsString();
            JsonObject args = params.getAsJsonObject("arguments");

            Object toolResult;
            switch (toolName) {
                case "get_weather":
                    toolResult = Map.of(
                        "temperature", 72,
                        "conditions", "sunny",
                        "city", args.get("city").getAsString()
                    );
                    break;
                case "search_docs":
                    toolResult = Map.of(
                        "results", List.of("Result for: " + args.get("query").getAsString()),
                        "count", 1
                    );
                    break;
                default:
                    return request.createResponseBuilder(HttpStatus.BAD_REQUEST)
                            .body(gson.toJson(Map.of(
                                "jsonrpc", "2.0",
                                "id", id,
                                "error", Map.of("code", -32601, "message", "Tool not found")
                            )))
                            .build();
            }

            Map<String, Object> result = Map.of(
                "jsonrpc", "2.0",
                "id", id,
                "result", Map.of("content", List.of(Map.of(
                    "type", "text",
                    "text", gson.toJson(toolResult)
                )))
            );
            return request.createResponseBuilder(HttpStatus.OK)
                    .header("Content-Type", "application/json")
                    .body(gson.toJson(result))
                    .build();
        }

        return request.createResponseBuilder(HttpStatus.BAD_REQUEST)
                .body(gson.toJson(Map.of(
                    "jsonrpc", "2.0",
                    "id", id,
                    "error", Map.of("code", -32601, "message", "Method not found")
                )))
                .build();
    }

    @FunctionName("health")
    public HttpResponseMessage health(
            @HttpTrigger(name = "req", methods = {HttpMethod.GET}, authLevel = AuthorizationLevel.ANONYMOUS)
            HttpRequestMessage<Optional<String>> request,
            final ExecutionContext context) {
        
        return request.createResponseBuilder(HttpStatus.OK)
                .header("Content-Type", "application/json")
                .body("{\"status\":\"healthy\",\"type\":\"mcp\"}")
                .build();
    }
}
```

## Files to Remove

- Default HTTP trigger Java file

## Storage Flags

```bicep
enableQueue: true   // Required for MCP state management and backplane
```
