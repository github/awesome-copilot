# Java Durable Functions

## Dependencies

**pom.xml:**
```xml
<dependency>
    <groupId>com.microsoft</groupId>
    <artifactId>durabletask-azure-functions</artifactId>
    <version>1.0.0</version>
</dependency>
<dependency>
    <groupId>com.microsoft.azure.functions</groupId>
    <artifactId>azure-functions-java-library</artifactId>
    <version>3.0.0</version>
</dependency>
```

## Source Code

**src/main/java/com/function/DurableFunctions.java:**
```java
package com.function;

import com.microsoft.azure.functions.*;
import com.microsoft.azure.functions.annotation.*;
import com.microsoft.durabletask.*;
import com.microsoft.durabletask.azurefunctions.*;

import java.util.*;

public class DurableFunctions {

    @FunctionName("HttpStart")
    public HttpResponseMessage httpStart(
            @HttpTrigger(name = "req", methods = {HttpMethod.POST}, authLevel = AuthorizationLevel.FUNCTION)
            HttpRequestMessage<Optional<String>> request,
            @DurableClientInput(name = "durableContext") DurableClientContext durableContext,
            final ExecutionContext context) {
        
        context.getLogger().info("Starting orchestration...");
        
        String instanceId = durableContext.getClient().scheduleNewOrchestrationInstance("HelloOrchestrator");
        context.getLogger().info("Created orchestration with ID: " + instanceId);
        
        return durableContext.createCheckStatusResponse(request, instanceId);
    }

    @FunctionName("HelloOrchestrator")
    public List<String> helloOrchestrator(
            @DurableOrchestrationTrigger(name = "ctx") TaskOrchestrationContext ctx) {
        
        List<String> results = new ArrayList<>();
        results.add(ctx.callActivity("SayHello", "Seattle", String.class).await());
        results.add(ctx.callActivity("SayHello", "Tokyo", String.class).await());
        results.add(ctx.callActivity("SayHello", "London", String.class).await());
        return results;
    }

    @FunctionName("SayHello")
    public String sayHello(
            @DurableActivityTrigger(name = "name") String name,
            final ExecutionContext context) {
        context.getLogger().info("Saying hello to: " + name);
        return "Hello " + name;
    }

    @FunctionName("health")
    public HttpResponseMessage health(
            @HttpTrigger(name = "req", methods = {HttpMethod.GET}, authLevel = AuthorizationLevel.ANONYMOUS)
            HttpRequestMessage<Optional<String>> request,
            final ExecutionContext context) {
        
        return request.createResponseBuilder(HttpStatus.OK)
                .header("Content-Type", "application/json")
                .body("{\"status\":\"healthy\",\"type\":\"durable\"}")
                .build();
    }
}
```

## Files to Remove

- Default HTTP trigger Java file

## Storage Flags Required

```bicep
enableQueue: true   // Required for Durable task hub
enableTable: true   // Required for Durable orchestration history
```
