---
applyTo: '**.java, **/pom.xml'
description: 'This file provides guidance on building Java applications using GitHub Copilot SDK for Java.'
name: 'GitHub Copilot SDK Java Instructions'
---

## Core Principles

- The SDK is in public preview and may have breaking changes
- Requires Java 17 or later
- Requires GitHub Copilot CLI installed and in PATH
- Uses `CompletableFuture` for all async operations
- Implements `AutoCloseable` for resource cleanup (try-with-resources)

## Installation

### Maven

```xml
<dependency>
    <groupId>com.github</groupId>
    <artifactId>copilot-sdk-java</artifactId>
    <version>${copilot-sdk-java.version}</version>
</dependency>
```

### Gradle

```groovy
implementation "com.github:copilot-sdk-java:${copilotSdkJavaVersion}"
```

## Client Initialization

### Basic Client Setup

```java
try (var client = new CopilotClient()) {
    client.start().get();
    // Use client...
}
```

### Client Configuration Options

When creating a CopilotClient, use `CopilotClientOptions`:

- `cliPath` - Path to CLI executable (default: "copilot" from PATH)
- `cliArgs` - Extra arguments prepended before SDK-managed flags
- `cliUrl` - URL of existing CLI server (e.g., "localhost:8080"). When provided, client won't spawn a process
- `port` - Server port (default: 0 for random, only when `useStdio` is false)
- `useStdio` - Use stdio transport instead of TCP (default: true)
- `logLevel` - Log level: "error", "warn", "info", "debug", "trace" (default: "info")
- `autoStart` - Auto-start server on first request (default: true)
- `autoRestart` - Auto-restart on crash (default: true)
- `cwd` - Working directory for the CLI process
- `environment` - Environment variables for the CLI process
- `gitHubToken` - GitHub token for authentication
- `useLoggedInUser` - Use logged-in `gh` CLI auth (default: true unless token provided)
- `onListModels` - Custom model list handler for BYOK scenarios

```java
var options = new CopilotClientOptions()
    .setCliPath("/path/to/copilot")
    .setLogLevel("debug")
    .setAutoStart(true)
    .setAutoRestart(true)
    .setGitHubToken(System.getenv("GITHUB_TOKEN"));

try (var client = new CopilotClient(options)) {
    client.start().get();
    // Use client...
}
```

### Manual Server Control

For explicit control:
```java
var client = new CopilotClient(new CopilotClientOptions().setAutoStart(false));
client.start().get();
// Use client...
client.stop().get();
```

Use `forceStop()` when `stop()` takes too long.

## Session Management

### Creating Sessions

Use `SessionConfig` for configuration. The permission handler is **required**:

```java
var session = client.createSession(new SessionConfig()
    .setModel("gpt-5")
    .setStreaming(true)
    .setTools(List.of(...))
    .setSystemMessage(new SystemMessageConfig()
        .setMode(SystemMessageMode.APPEND)
        .setContent("Custom instructions"))
    .setAvailableTools(List.of("tool1", "tool2"))
    .setExcludedTools(List.of("tool3"))
    .setProvider(new ProviderConfig().setType("openai"))
    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
).get();
```

### Session Config Options

- `sessionId` - Custom session ID
- `clientName` - Application name
- `model` - Model name ("gpt-5", "claude-sonnet-4.5", etc.)
- `reasoningEffort` - "low", "medium", "high", "xhigh"
- `tools` - Custom tools exposed to the CLI
- `systemMessage` - System message customization
- `availableTools` - Allowlist of tool names
- `excludedTools` - Blocklist of tool names
- `provider` - Custom API provider configuration (BYOK)
- `streaming` - Enable streaming response chunks (default: false)
- `workingDirectory` - Session working directory
- `mcpServers` - MCP server configurations
- `customAgents` - Custom agent configurations
- `agent` - Pre-select agent by name
- `infiniteSessions` - Infinite sessions configuration
- `skillDirectories` - Skill SKILL.md directories
- `disabledSkills` - Skills to disable
- `configDir` - Config directory path
- `hooks` - Session lifecycle hooks
- `onPermissionRequest` - **REQUIRED** permission handler
- `onUserInputRequest` - User input handler
- `onEvent` - Event handler registered before session creation

All setters return `SessionConfig` for method chaining.

### Resuming Sessions

```java
var session = client.resumeSession(sessionId, new ResumeSessionConfig()
    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
).get();
```

### Session Operations

- `session.getSessionId()` - Get session identifier
- `session.send(prompt)` / `session.send(MessageOptions)` - Send message, returns message ID
- `session.sendAndWait(prompt)` / `session.sendAndWait(MessageOptions)` - Send and wait for response (60s timeout)
- `session.sendAndWait(options, timeoutMs)` - Send and wait with custom timeout
- `session.abort()` - Abort current processing
- `session.getMessages()` - Get all events/messages
- `session.setModel(modelId)` - Switch to a different model
- `session.log(message)` / `session.log(message, "warning", false)` / `session.log(message, "error", false)` - Log to session timeline with level `"info"`, `"warning"`, or `"error"`
- `session.close()` - Clean up resources

## Event Handling

### Event Subscription Pattern

Use `CompletableFuture` for waiting on session events:

```java
var done = new CompletableFuture<Void>();

session.on(event -> {
    if (event instanceof AssistantMessageEvent msg) {
        System.out.println(msg.getData().content());
    } else if (event instanceof SessionIdleEvent) {
        done.complete(null);
    }
});

session.send(new MessageOptions().setPrompt("Hello"));
done.get();
```

### Type-Safe Event Handling

Use the typed `on()` overload for compile-time safety:

```java
session.on(AssistantMessageEvent.class, msg -> {
    System.out.println(msg.getData().content());
});

session.on(SessionIdleEvent.class, idle -> {
    done.complete(null);
});
```

### Unsubscribing from Events

The `on()` method returns a `Closeable`:

```java
var subscription = session.on(event -> { /* handler */ });
// Later...
subscription.close();
```

### Event Types

Use pattern matching (Java 17+) for event handling:

```java
session.on(event -> {
    if (event instanceof UserMessageEvent userMsg) {
        // Handle user message
    } else if (event instanceof AssistantMessageEvent assistantMsg) {
        System.out.println(assistantMsg.getData().content());
    } else if (event instanceof AssistantMessageDeltaEvent delta) {
        System.out.print(delta.getData().deltaContent());
    } else if (event instanceof ToolExecutionStartEvent toolStart) {
        // Tool execution started
    } else if (event instanceof ToolExecutionCompleteEvent toolComplete) {
        // Tool execution completed
    } else if (event instanceof SessionStartEvent start) {
        // Session started
    } else if (event instanceof SessionIdleEvent idle) {
        // Session is idle (processing complete)
    } else if (event instanceof SessionErrorEvent error) {
        System.err.println("Error: " + error.getData().message());
    }
});
```

### Event Error Handling

Control how errors in event handlers are handled:

```java
// Set a custom error handler
session.setEventErrorHandler(ex -> {
    logger.error("Event handler error", ex);
});

// Or set the error propagation policy
session.setEventErrorPolicy(EventErrorPolicy.SUPPRESS_AND_LOG_ERRORS);
```

## Streaming Responses

### Enabling Streaming

Set `streaming(true)` in SessionConfig:

```java
var session = client.createSession(new SessionConfig()
    .setModel("gpt-5")
    .setStreaming(true)
    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
).get();
```

### Handling Streaming Events

Handle both delta events (incremental) and final events:

```java
var done = new CompletableFuture<Void>();

session.on(event -> {
    switch (event) {
        case AssistantMessageDeltaEvent delta ->
            // Incremental text chunk
            System.out.print(delta.getData().deltaContent());
        case AssistantReasoningDeltaEvent reasoningDelta ->
            // Incremental reasoning chunk (model-dependent)
            System.out.print(reasoningDelta.getData().deltaContent());
        case AssistantMessageEvent msg ->
            // Final complete message
            System.out.println("\n--- Final ---\n" + msg.getData().content());
        case AssistantReasoningEvent reasoning ->
            // Final reasoning content
            System.out.println("--- Reasoning ---\n" + reasoning.getData().content());
        case SessionIdleEvent idle ->
            done.complete(null);
        default -> { }
    }
});

session.send(new MessageOptions().setPrompt("Tell me a story"));
done.get();
```

Note: Final events (`AssistantMessageEvent`, `AssistantReasoningEvent`) are ALWAYS sent regardless of streaming setting.

## Custom Tools

### Defining Tools

Use `ToolDefinition.create()` with JSON Schema parameters and a `ToolHandler`:

```java
var tool = ToolDefinition.create(
    "get_weather",
    "Get weather for a location",
    Map.of(
        "type", "object",
        "properties", Map.of(
            "location", Map.of("type", "string", "description", "City name")
        ),
        "required", List.of("location")
    ),
    invocation -> {
        String location = (String) invocation.getArguments().get("location");
        return CompletableFuture.completedFuture("Sunny in " + location);
    }
);

var session = client.createSession(new SessionConfig()
    .setModel("gpt-5")
    .setTools(List.of(tool))
    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
).get();
```

### Type-Safe Tool Arguments

Use `getArgumentsAs()` for deserialization into a typed record or class:

```java
record WeatherArgs(String location, String unit) {}

var tool = ToolDefinition.create(
    "get_weather",
    "Get weather for a location",
    Map.of(
        "type", "object",
        "properties", Map.of(
            "location", Map.of("type", "string"),
            "unit", Map.of("type", "string", "enum", List.of("celsius", "fahrenheit"))
        ),
        "required", List.of("location")
    ),
    invocation -> {
        var args = invocation.getArgumentsAs(WeatherArgs.class);
        return CompletableFuture.completedFuture(
            Map.of("temp", 72, "unit", args.unit(), "location", args.location())
        );
    }
);
```

### Overriding Built-In Tools

```java
var override = ToolDefinition.createOverride(
    "built_in_tool_name",
    "Custom description",
    Map.of("type", "object", "properties", Map.of(...)),
    invocation -> CompletableFuture.completedFuture("custom result")
);
```

### Tool Return Types

- Return any JSON-serializable value (String, Map, List, record, POJO)
- The SDK automatically serializes the return value and sends it back to the CLI

### Tool Execution Flow

When Copilot invokes a tool, the client automatically:
1. Deserializes the arguments
2. Runs your handler function
3. Serializes the return value
4. Responds to the CLI

## Permission Handling

### Required Permission Handler

A permission handler is **mandatory** when creating or resuming sessions:

```java
// Approve all requests (for development/testing)
new SessionConfig()
    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)

// Custom permission logic
new SessionConfig()
    .setOnPermissionRequest((request, invocation) -> {
        if ("dangerous-action".equals(request.getKind())) {
            return CompletableFuture.completedFuture(
                new PermissionRequestResult().setKind(PermissionRequestResultKind.DENIED)
            );
        }
        return CompletableFuture.completedFuture(
            new PermissionRequestResult().setKind(PermissionRequestResultKind.APPROVED)
        );
    })
```

## User Input Handling

Handle user input requests from the agent:

```java
new SessionConfig()
    .setOnUserInputRequest((request, invocation) -> {
        System.out.println("Agent asks: " + request.getQuestion());
        String answer = scanner.nextLine();
        return CompletableFuture.completedFuture(
            new UserInputResponse()
                .setAnswer(answer)
                .setWasFreeform(true)
        );
    })
```

## System Message Customization

### Append Mode (Default - Preserves Guardrails)

```java
var session = client.createSession(new SessionConfig()
    .setModel("gpt-5")
    .setSystemMessage(new SystemMessageConfig()
        .setMode(SystemMessageMode.APPEND)
        .setContent("""
            <workflow_rules>
            - Always check for security vulnerabilities
            - Suggest performance improvements when applicable
            </workflow_rules>
            """))
    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
).get();
```

### Replace Mode (Full Control - Removes Guardrails)

```java
var session = client.createSession(new SessionConfig()
    .setModel("gpt-5")
    .setSystemMessage(new SystemMessageConfig()
        .setMode(SystemMessageMode.REPLACE)
        .setContent("You are a helpful assistant."))
    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
).get();
```

## File Attachments

Attach files to messages using `Attachment`:

```java
session.send(new MessageOptions()
    .setPrompt("Analyze this file")
    .setAttachments(List.of(
        new Attachment("file", "/path/to/file.java", "My File")
    ))
);
```

## Message Delivery Modes

Use the `mode` property in `MessageOptions`:

- `"enqueue"` - Queue message for processing (default)
- `"immediate"` - Process message immediately

```java
session.send(new MessageOptions()
    .setPrompt("...")
    .setMode("enqueue")
);
```

## Convenience: Send and Wait

Use `sendAndWait()` to send a message and block until the assistant responds:

```java
// With default 60-second timeout
AssistantMessageEvent response = session.sendAndWait("What is 2+2?").get();
System.out.println(response.getData().content());

// With custom timeout
AssistantMessageEvent response = session.sendAndWait(
    new MessageOptions().setPrompt("Write a long story"),
    120_000  // 120 seconds
).get();
```

## Multiple Sessions

Sessions are independent and can run concurrently:

```java
var session1 = client.createSession(new SessionConfig()
    .setModel("gpt-5")
    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
).get();

var session2 = client.createSession(new SessionConfig()
    .setModel("claude-sonnet-4.5")
    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
).get();

session1.send(new MessageOptions().setPrompt("Hello from session 1"));
session2.send(new MessageOptions().setPrompt("Hello from session 2"));
```

## Bring Your Own Key (BYOK)

Use custom API providers via `ProviderConfig`:

```java
// OpenAI
var session = client.createSession(new SessionConfig()
    .setProvider(new ProviderConfig()
        .setType("openai")
        .setBaseUrl("https://api.openai.com/v1")
        .setApiKey("sk-..."))
    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
).get();

// Azure OpenAI
var session = client.createSession(new SessionConfig()
    .setProvider(new ProviderConfig()
        .setType("azure")
        .setAzure(new AzureOptions()
            .setEndpoint("https://my-resource.openai.azure.com")
            .setDeployment("gpt-4"))
        .setBearerToken("..."))
    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
).get();
```

## Session Lifecycle Management

### Listing Sessions

```java
var sessions = client.listSessions().get();
for (var metadata : sessions) {
    System.out.println("Session: " + metadata.getSessionId());
}
```

### Deleting Sessions

```java
client.deleteSession(sessionId).get();
```

### Checking Connection State

```java
var state = client.getState();
```

### Lifecycle Event Subscription

```java
AutoCloseable subscription = client.onLifecycle(event -> {
    System.out.println("Lifecycle event: " + event);
});
// Later...
subscription.close();
```

## Error Handling

### Standard Exception Handling

```java
try {
    var session = client.createSession(new SessionConfig()
        .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
    ).get();
    session.sendAndWait("Hello").get();
} catch (ExecutionException ex) {
    Throwable cause = ex.getCause();
    System.err.println("Error: " + cause.getMessage());
} catch (Exception ex) {
    System.err.println("Error: " + ex.getMessage());
}
```

### Session Error Events

Monitor `SessionErrorEvent` for runtime errors:

```java
session.on(SessionErrorEvent.class, error -> {
    System.err.println("Session Error: " + error.getData().message());
});
```

## Connectivity Testing

Use `ping()` to verify server connectivity:

```java
var response = client.ping("test message").get();
```

## Status and Authentication

```java
// Get CLI version and protocol info
var status = client.getStatus().get();

// Check authentication status
var authStatus = client.getAuthStatus().get();

// List available models
var models = client.listModels().get();
```

## Resource Cleanup

### Automatic Cleanup with try-with-resources

ALWAYS use try-with-resources for automatic disposal:

```java
try (var client = new CopilotClient()) {
    client.start().get();
    try (var session = client.createSession(new SessionConfig()
            .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)).get()) {
        // Use session...
    }
}
// Resources automatically cleaned up
```

### Manual Cleanup

If not using try-with-resources:

```java
var client = new CopilotClient();
try {
    client.start().get();
    // Use client...
} finally {
    client.stop().get();
}
```

## Best Practices

1. **Always use try-with-resources** for `CopilotClient` and `CopilotSession`
2. **Always provide a permission handler** - it is required for `createSession` and `resumeSession`
3. **Use `CompletableFuture`** properly - call `.get()` to block, or chain with `.thenApply()`/`.thenCompose()`
4. **Use `sendAndWait()`** for simple request-response patterns instead of manual event handling
5. **Handle `SessionErrorEvent`** for robust error handling
6. **Use pattern matching** (switch with sealed types) for event handling
7. **Enable streaming** for better UX in interactive scenarios
8. **Close event subscriptions** (`Closeable`) when no longer needed
9. **Use `SystemMessageMode.APPEND`** to preserve safety guardrails
10. **Provide descriptive tool names and descriptions** for better model understanding
11. **Handle both delta and final events** when streaming is enabled
12. **Use `getArgumentsAs()`** for type-safe tool argument deserialization

## Common Patterns

### Simple Query-Response

```java
try (var client = new CopilotClient()) {
    client.start().get();

    try (var session = client.createSession(new SessionConfig()
            .setModel("gpt-5")
            .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)).get()) {

        var response = session.sendAndWait("What is 2+2?").get();
        System.out.println(response.getData().content());
    }
}
```

### Event-Driven Conversation

```java
try (var client = new CopilotClient()) {
    client.start().get();

    try (var session = client.createSession(new SessionConfig()
            .setModel("gpt-5")
            .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)).get()) {

        var done = new CompletableFuture<Void>();

        session.on(AssistantMessageEvent.class, msg ->
            System.out.println(msg.getData().content()));

        session.on(SessionIdleEvent.class, idle ->
            done.complete(null));

        session.send(new MessageOptions().setPrompt("What is 2+2?"));
        done.get();
    }
}
```

### Multi-Turn Conversation

```java
try (var session = client.createSession(new SessionConfig()
        .setModel("gpt-5")
        .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)).get()) {

    var response1 = session.sendAndWait("What is the capital of France?").get();
    System.out.println(response1.getData().content());

    var response2 = session.sendAndWait("What is its population?").get();
    System.out.println(response2.getData().content());
}
```

### Tool with Complex Return Type

```java
record UserInfo(String id, String name, String email, String role) {}

var tool = ToolDefinition.create(
    "get_user",
    "Retrieve user information",
    Map.of(
        "type", "object",
        "properties", Map.of(
            "userId", Map.of("type", "string", "description", "User ID")
        ),
        "required", List.of("userId")
    ),
    invocation -> {
        String userId = (String) invocation.getArguments().get("userId");
        return CompletableFuture.completedFuture(
            new UserInfo(userId, "John Doe", "john@example.com", "Developer")
        );
    }
);
```

### Session Hooks

```java
var session = client.createSession(new SessionConfig()
    .setModel("gpt-5")
    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
    .setHooks(new SessionHooks()
        .setOnPreToolUse((input, invocation) -> {
            System.out.println("About to execute tool: " + input);
            var decision = new PreToolUseHookOutput().setKind("allow");
            return CompletableFuture.completedFuture(decision);
        })
        .setOnPostToolUse((output, invocation) -> {
            System.out.println("Tool execution complete: " + output);
            return CompletableFuture.completedFuture(null);
        }))
).get();
```
