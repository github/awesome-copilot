# Java Service Bus Trigger

Replace the contents of `src/main/java/com/function/` with these files.

## Function.java

```java
package com.function;

import com.microsoft.azure.functions.*;
import com.microsoft.azure.functions.annotation.*;
import java.util.Optional;
import java.util.logging.Logger;

public class Function {
    
    /**
     * Service Bus Queue Trigger - processes messages from the queue.
     * Connection uses UAMI via ServiceBusConnection__fullyQualifiedNamespace + credential + clientId
     */
    @FunctionName("ServiceBusTrigger")
    public void serviceBusTrigger(
            @ServiceBusQueueTrigger(
                name = "message",
                queueName = "%SERVICEBUS_QUEUE_NAME%",
                connection = "ServiceBusConnection"
            ) String message,
            final ExecutionContext context) {
        
        Logger logger = context.getLogger();
        logger.info("Service Bus trigger processed message: " + message);
    }

    /**
     * HTTP endpoint to send messages to Service Bus (for testing).
     */
    @FunctionName("SendMessage")
    public HttpResponseMessage sendMessage(
            @HttpTrigger(
                name = "req",
                methods = {HttpMethod.POST},
                route = "send",
                authLevel = AuthorizationLevel.FUNCTION
            ) HttpRequestMessage<Optional<String>> request,
            @ServiceBusQueueOutput(
                name = "output",
                queueName = "%SERVICEBUS_QUEUE_NAME%",
                connection = "ServiceBusConnection"
            ) OutputBinding<String> output,
            final ExecutionContext context) {
        
        Logger logger = context.getLogger();
        
        String body = request.getBody().orElse("{}");
        output.setValue(body);
        
        logger.info("Sent message to Service Bus: " + body);
        
        return request.createResponseBuilder(HttpStatus.OK)
                .header("Content-Type", "application/json")
                .body("{\"status\": \"sent\", \"data\": " + body + "}")
                .build();
    }

    /**
     * Health check endpoint.
     */
    @FunctionName("HealthCheck")
    public HttpResponseMessage healthCheck(
            @HttpTrigger(
                name = "req",
                methods = {HttpMethod.GET},
                route = "health",
                authLevel = AuthorizationLevel.FUNCTION
            ) HttpRequestMessage<Optional<String>> request,
            final ExecutionContext context) {
        
        String queueName = System.getenv("SERVICEBUS_QUEUE_NAME");
        if (queueName == null) {
            queueName = "not-set";
        }
        
        return request.createResponseBuilder(HttpStatus.OK)
                .header("Content-Type", "application/json")
                .body("{\"status\": \"healthy\", \"queue\": \"" + queueName + "\"}")
                .build();
    }
}
```

## pom.xml additions

Add these dependencies to your `pom.xml`:

```xml
<dependency>
    <groupId>com.microsoft.azure.functions</groupId>
    <artifactId>azure-functions-java-library</artifactId>
    <version>3.1.0</version>
</dependency>
```

## Files to Remove

- Any existing HTTP trigger files from the base template

## Local Testing

Set these in `local.settings.json`:
```json
{
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "java",
    "ServiceBusConnection__fullyQualifiedNamespace": "<namespace>.servicebus.windows.net",
    "SERVICEBUS_QUEUE_NAME": "orders"
  }
}
```

> **Note:** For local development with UAMI, use Azure Identity `DefaultAzureCredential`
> which will use your `az login` credentials. See [auth-best-practices.md](../../../../../../auth-best-practices.md) for production guidance.

## Common Patterns

- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
