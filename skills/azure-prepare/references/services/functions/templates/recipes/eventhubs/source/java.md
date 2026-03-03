# Java Event Hub Trigger

## Source Code

Replace the HTTP trigger class with:

```java
package com.function;

import com.microsoft.azure.functions.*;
import com.microsoft.azure.functions.annotation.*;

import java.util.Optional;

public class EventHubFunctions {

    /**
     * Event Hub Trigger - processes events from Event Hub
     */
    @FunctionName("EventHubTrigger")
    public void eventHubTrigger(
            @EventHubTrigger(
                name = "events",
                eventHubName = "%EVENTHUB_NAME%",
                connection = "EventHubConnection",
                consumerGroup = "%EVENTHUB_CONSUMER_GROUP%",
                cardinality = Cardinality.MANY
            ) String[] events,
            final ExecutionContext context) {
        
        for (String event : events) {
            context.getLogger().info("Event Hub trigger processed event: " + event);
        }
    }

    /**
     * HTTP endpoint to send events to Event Hub
     */
    @FunctionName("SendEvent")
    public HttpResponseMessage sendEvent(
            @HttpTrigger(
                name = "req",
                methods = {HttpMethod.POST},
                authLevel = AuthorizationLevel.FUNCTION,
                route = "send"
            ) HttpRequestMessage<Optional<String>> request,
            @EventHubOutput(
                name = "outputEvent",
                eventHubName = "%EVENTHUB_NAME%",
                connection = "EventHubConnection"
            ) OutputBinding<String> outputEvent,
            final ExecutionContext context) {
        
        String body = request.getBody().orElse("{\"message\": \"Hello Event Hub!\"}");
        
        outputEvent.setValue(body);
        context.getLogger().info("Sent event to Event Hub: " + body);
        
        return request.createResponseBuilder(HttpStatus.OK)
            .header("Content-Type", "application/json")
            .body("{\"status\": \"sent\", \"data\": " + body + "}")
            .build();
    }

    /**
     * Health check endpoint
     */
    @FunctionName("HealthCheck")
    public HttpResponseMessage healthCheck(
            @HttpTrigger(
                name = "req",
                methods = {HttpMethod.GET},
                authLevel = AuthorizationLevel.ANONYMOUS,
                route = "health"
            ) HttpRequestMessage<Optional<String>> request,
            final ExecutionContext context) {
        
        return request.createResponseBuilder(HttpStatus.OK)
            .body("OK")
            .build();
    }
}
```

## Files to Remove

- `Function.java` or any HTTP function files from base template

## Package Dependencies

Add to `pom.xml`:

```xml
<dependency>
    <groupId>com.microsoft.azure.functions</groupId>
    <artifactId>azure-functions-java-library</artifactId>
    <version>3.1.0</version>
</dependency>
```

## Configuration Notes

- `%EVENTHUB_NAME%` - Reads from app setting at runtime
- `%EVENTHUB_CONSUMER_GROUP%` - Reads from app setting at runtime
- `connection = "EventHubConnection"` - Uses settings prefixed with `EventHubConnection__`
- `cardinality = Cardinality.MANY` - Batch processing for better throughput

## Common Patterns

- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
