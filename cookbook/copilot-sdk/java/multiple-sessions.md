# Working with Multiple Sessions

Manage multiple independent conversations simultaneously.

> **Runnable example:** [recipe/MultipleSessions.java](recipe/MultipleSessions.java)
>
> ```bash
> jbang recipe/MultipleSessions.java
> ```

## Example scenario

You need to run multiple conversations in parallel, each with its own context and history.

## Java

```java
///usr/bin/env jbang "$0" "$@" ; exit $?
//DEPS com.github:copilot-sdk-java:0.2.1-java.1

import com.github.copilot.sdk.*;
import com.github.copilot.sdk.json.*;

public class MultipleSessions {
    public static void main(String[] args) throws Exception {
        try (var client = new CopilotClient()) {
            client.start().get();

            // Create multiple independent sessions
            var session1 = client.createSession(new SessionConfig()
                .setModel("gpt-5")
                .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)).get();
            var session2 = client.createSession(new SessionConfig()
                .setModel("gpt-5")
                .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)).get();
            var session3 = client.createSession(new SessionConfig()
                .setModel("claude-sonnet-4.5")
                .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)).get();

            // Each session maintains its own conversation history
            session1.sendAndWait(new MessageOptions().setPrompt("You are helping with a Python project")).get();
            session2.sendAndWait(new MessageOptions().setPrompt("You are helping with a TypeScript project")).get();
            session3.sendAndWait(new MessageOptions().setPrompt("You are helping with a Go project")).get();

            // Follow-up messages stay in their respective contexts
            session1.sendAndWait(new MessageOptions().setPrompt("How do I create a virtual environment?")).get();
            session2.sendAndWait(new MessageOptions().setPrompt("How do I set up tsconfig?")).get();
            session3.sendAndWait(new MessageOptions().setPrompt("How do I initialize a module?")).get();

            // Clean up all sessions
            session1.close();
            session2.close();
            session3.close();
        }
    }
}
```

## Custom session IDs

Use custom IDs for easier tracking:

```java
var session = client.createSession(new SessionConfig()
    .setSessionId("user-123-chat")
    .setModel("gpt-5")
    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)).get();

System.out.println(session.getSessionId()); // "user-123-chat"
```

## Listing sessions

```java
var sessions = client.listSessions().get();
System.out.println(sessions);
// [SessionInfo{sessionId="user-123-chat", ...}, ...]
```

## Deleting sessions

```java
// Delete a specific session
client.deleteSession("user-123-chat").get();
```

## Managing session lifecycle with CompletableFuture

Create and message sessions in parallel using `CompletableFuture.allOf`:

```java
import java.util.concurrent.CompletableFuture;

// Create all sessions in parallel
var f1 = client.createSession(new SessionConfig()
    .setModel("gpt-5")
    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL));
var f2 = client.createSession(new SessionConfig()
    .setModel("gpt-5")
    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL));
var f3 = client.createSession(new SessionConfig()
    .setModel("claude-sonnet-4.5")
    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL));

CompletableFuture.allOf(f1, f2, f3).get();

var s1 = f1.get();
var s2 = f2.get();
var s3 = f3.get();

// Send messages in parallel
CompletableFuture.allOf(
    s1.sendAndWait(new MessageOptions().setPrompt("Explain Java records")),
    s2.sendAndWait(new MessageOptions().setPrompt("Explain sealed classes")),
    s3.sendAndWait(new MessageOptions().setPrompt("Explain pattern matching"))
).get();
```

## Providing a custom Executor

Supply your own thread pool for parallel session work:

```java
import java.util.concurrent.Executors;

var executor = Executors.newFixedThreadPool(4);

var client = new CopilotClient(new CopilotClientOptions()
    .setExecutor(executor));
client.start().get();

// Sessions now run on the custom executor
var session = client.createSession(new SessionConfig()
    .setModel("gpt-5")
    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)).get();

session.sendAndWait(new MessageOptions().setPrompt("Hello!")).get();

session.close();
client.stop().get();
executor.shutdown();
```

## Use cases

- **Multi-user applications**: One session per user
- **Multi-task workflows**: Separate sessions for different tasks
- **A/B testing**: Compare responses from different models
