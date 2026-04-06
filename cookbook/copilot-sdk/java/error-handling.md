# Error Handling Patterns

Handle errors gracefully in your Copilot SDK applications.

> **Runnable example:** [recipe/ErrorHandling.java](recipe/ErrorHandling.java)
>
> ```bash
> jbang recipe/ErrorHandling.java
> ```

## Example scenario

You need to handle various error conditions like connection failures, timeouts, and invalid responses.

## Basic try-with-resources

Java's `try-with-resources` ensures the client is always cleaned up, even when exceptions occur.

```java
//DEPS com.github:copilot-sdk-java:0.2.1-java.1

import com.github.copilot.sdk.*;
import com.github.copilot.sdk.json.*;

public class BasicErrorHandling {
    public static void main(String[] args) {
        try (var client = new CopilotClient()) {
            client.start().get();
            var session = client.createSession(
                new SessionConfig()
                    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
                    .setModel("gpt-5")).get();

            var response = session.sendAndWait(
                new MessageOptions().setPrompt("Hello!")).get();
            System.out.println(response.getData().content());

            session.close();
        } catch (Exception ex) {
            System.err.println("Error: " + ex.getMessage());
        }
    }
}
```

## Handling specific error types

Every `CompletableFuture.get()` call wraps failures in `ExecutionException`. Unwrap the cause to inspect the real error.

```java
import java.io.IOException;
import java.util.concurrent.ExecutionException;

try (var client = new CopilotClient()) {
    client.start().get();
} catch (ExecutionException ex) {
    var cause = ex.getCause();
    if (cause instanceof IOException) {
        System.err.println("Copilot CLI not found or could not connect: " + cause.getMessage());
    } else {
        System.err.println("Unexpected error: " + cause.getMessage());
    }
} catch (InterruptedException ex) {
    Thread.currentThread().interrupt();
    System.err.println("Interrupted while starting client.");
}
```

## Timeout handling

Use the overloaded `get(timeout, unit)` on `CompletableFuture` to enforce time limits.

```java
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

var session = client.createSession(
    new SessionConfig()
        .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
        .setModel("gpt-5")).get();

try {
    var response = session.sendAndWait(
        new MessageOptions().setPrompt("Complex question..."))
        .get(30, TimeUnit.SECONDS);

    System.out.println(response.getData().content());
} catch (TimeoutException ex) {
    System.err.println("Request timed out after 30 seconds.");
    session.abort().get();
}
```

## Aborting a request

Cancel an in-flight request by calling `session.abort()`.

```java
var session = client.createSession(
    new SessionConfig()
        .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
        .setModel("gpt-5")).get();

// Start a request without waiting
session.send(new MessageOptions().setPrompt("Write a very long story..."));

// Abort after some condition
Thread.sleep(5000);
session.abort().get();
System.out.println("Request aborted.");
```

## Graceful shutdown

Use a JVM shutdown hook to clean up when the process is interrupted.

```java
var client = new CopilotClient();
client.start().get();

Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    System.out.println("Shutting down...");
    try {
        client.close();
    } catch (Exception ex) {
        System.err.println("Cleanup error: " + ex.getMessage());
    }
}));
```

## Try-with-resources (nested)

When working with multiple sessions, nest `try-with-resources` blocks to guarantee each resource is closed.

```java
try (var client = new CopilotClient()) {
    client.start().get();

    try (var session = client.createSession(
            new SessionConfig()
                .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
                .setModel("gpt-5")).get()) {

        session.sendAndWait(
            new MessageOptions().setPrompt("Hello!")).get();
    } // session is closed here

} // client is closed here
```

## Handling tool errors

When defining tools, return an error result to signal a failure back to the model instead of throwing.

```java
import com.github.copilot.sdk.json.ToolResultObject;

session.addTool(
    ToolDefinition.builder()
        .name("read_file")
        .description("Read a file from disk")
        .parameter("path", "string", "File path", true)
        .build(),
    (args) -> {
        try {
            var content = java.nio.file.Files.readString(
                java.nio.file.Path.of(args.get("path").toString()));
            return ToolResultObject.success(content);
        } catch (IOException ex) {
            return ToolResultObject.error("Failed to read file: " + ex.getMessage());
        }
    }
);
```

## Best practices

1. **Use try-with-resources**: Always wrap `CopilotClient` (and sessions, if `AutoCloseable`) in try-with-resources to guarantee cleanup.
2. **Unwrap `ExecutionException`**: Call `getCause()` to inspect the real error — the outer `ExecutionException` is just a `CompletableFuture` wrapper.
3. **Restore interrupt flag**: When catching `InterruptedException`, call `Thread.currentThread().interrupt()` to preserve the interrupted status.
4. **Set timeouts**: Use `get(timeout, TimeUnit)` instead of bare `get()` for any call that could block indefinitely.
5. **Return tool errors, don't throw**: Use `ToolResultObject.error()` so the model can recover gracefully.
6. **Log errors**: Capture error details for debugging — consider a logging framework like SLF4J for production applications.
