# Java Timer Trigger

Replace the contents of `src/main/java/com/function/` with this file.

## Function.java

```java
package com.function;

import com.microsoft.azure.functions.*;
import com.microsoft.azure.functions.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

public class Function {
    
    /**
     * Timer trigger - runs on the schedule defined in TIMER_SCHEDULE.
     * Default: every 5 minutes (0 *&#47;5 * * * *)
     */
    @FunctionName("TimerTrigger")
    public void timerTrigger(
            @TimerTrigger(
                name = "timer",
                schedule = "%TIMER_SCHEDULE%"
            ) String timerInfo,
            final ExecutionContext context) {
        
        String utcTimestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME);
        context.getLogger().info("Timer trigger executed at " + utcTimestamp);
        
        // Add your scheduled task logic here
        // Examples:
        // - Call an external API
        // - Process queued items
        // - Generate reports
        // - Clean up old data
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
        
        String schedule = System.getenv("TIMER_SCHEDULE");
        if (schedule == null) schedule = "not-set";
        
        return request.createResponseBuilder(HttpStatus.OK)
                .header("Content-Type", "application/json")
                .body("{\"status\":\"healthy\",\"schedule\":\"" + schedule + "\"}")
                .build();
    }
}
```

## pom.xml additions

```xml
<dependency>
    <groupId>com.microsoft.azure.functions</groupId>
    <artifactId>azure-functions-java-library</artifactId>
    <version>3.1.0</version>
</dependency>
```

## Local Testing

Set these in `local.settings.json`:
```json
{
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "java",
    "TIMER_SCHEDULE": "0 */5 * * * *"
  }
}
```

## Common Patterns

- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
