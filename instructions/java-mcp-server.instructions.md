---
description: 'Instructions for building Model Context Protocol (MCP) servers in Java with the MCP Java SDK 2.x'
applyTo: '**/*.java, **/pom.xml, **/build.gradle, **/build.gradle.kts'
---

# Java MCP Server Development

These instructions apply to the [MCP Java SDK](https://github.com/modelcontextprotocol/java-sdk) 2.x. SDK 2.0.x supports the MCP specification revision [2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) and the earlier revisions. SDK 3.x will add the revision [2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28).

## Instructions

- Import the BOM `io.modelcontextprotocol.sdk:mcp-bom:2.0.1` and add the `io.modelcontextprotocol.sdk:mcp` artifact.
- In Gradle, import the BOM with `implementation(platform("io.modelcontextprotocol.sdk:mcp-bom:2.0.1"))`. Also add `testRuntimeOnly("org.junit.platform:junit-platform-launcher")`. Without it, the `test` task fails.
- The `mcp` artifact contains `mcp-core` and the Jackson 3 JSON mapper `mcp-json-jackson3`.
- Do not use code from SDK 0.x or 1.x. Read the [migration guide](https://github.com/modelcontextprotocol/java-sdk/blob/main/MIGRATION-2.0.md) when you update a server.
- The packages are `io.modelcontextprotocol.server`, `io.modelcontextprotocol.spec`, and `io.modelcontextprotocol.json`. The protocol types are nested in `McpSchema`.
- Make a server with `McpServer.sync(transport)` or `McpServer.async(transport)`. Set `serverInfo(name, version)` and `capabilities(...)`, and then call `build()`.
- Use the sync server for most servers. Use the async server with Project Reactor (`Mono`) only when the tool code does not block a thread.
- For stdio transport, use `new StdioServerTransportProvider(McpJsonDefaults.getMapper())`.
- Enable only the capabilities that the server uses: `ServerCapabilities.builder().tools(false).resources(false, true).prompts(true).completions().build()`. `tools(listChanged)` and `prompts(listChanged)` enable list change notifications. `resources(subscribe, listChanged)` also enables resource subscriptions.
- Register tools with `SyncToolSpecification.builder().tool(tool).callHandler((exchange, request) -> ...)`. The handler gets the arguments as a `Map` from `request.arguments()`.
- Use the builders that take the required fields first: `Tool.builder(name, inputSchema)`, `Resource.builder(uri, name)`, `ResourceTemplate.builder(uriTemplate, name)`, `Prompt.builder(name)`, `TextContent.builder(text)`, and `ReadResourceResult.builder(contents)`. The builders without arguments are deprecated.
- A required field must not be `null`. A `null` value causes an `IllegalArgumentException`.
- Tool names must have 1 to 128 characters: letters, digits, `_`, `-`, and `.`. The server builder rejects an incorrect name with an `IllegalArgumentException`. `addTool()` at runtime does not check the name.
- Give `inputSchema` and `outputSchema` as `Map<String, Object>` values. The `JsonSchema` record is deprecated.
- The server checks each schema against JSON Schema 2020-12 when you call `build()` or `addTool()`. An incorrect schema causes an `IllegalArgumentException`.
- The SDK validates the arguments against `inputSchema` before it calls the handler. It also validates `structuredContent` against `outputSchema`. If the validation fails, the client gets a tool result with `isError` set to `true`.
- If a tool has an `outputSchema`, return `structuredContent` in each successful result. Without it, the SDK returns a tool result with `isError` set to `true`.
- For machine-readable output, set `outputSchema` on the tool and return `CallToolResult.builder().structuredContent(map)`. Also add the same data as text content for older clients.
- Set tool hints with `ToolAnnotations.builder().readOnlyHint(true).build()`. Use `destructiveHint(true)` for a destructive tool.
- Return `CallToolResult.builder().addTextContent(message).isError(true).build()` for an error that the model must read.
- Do not throw an exception or an `McpError` for a tool failure. The client gets a JSON-RPC error, not a tool result. Many hosts do not show this error to the model.
- Use `McpError.builder(McpSchema.ErrorCodes.INVALID_PARAMS).message(...).build()` only for a protocol error, for example an unknown resource URI.
- Register resources with `SyncResourceSpecification`, resource templates with `SyncResourceTemplateSpecification`, prompts with `SyncPromptSpecification`, and completions with `SyncCompletionSpecification`.
- Define resource templates with RFC 6570 URI templates, for example `users://{id}`.
- Report progress with `exchange.progressNotification(...)` only when `request.progressToken()` is not `null`.
- Get user input with `exchange.createElicitation(ElicitFormRequest.builder(message, requestedSchema).build())`. First, make sure that `exchange.getClientCapabilities().elicitation()` is not `null`.
- For a flow in the browser, for example OAuth or a payment, use `ElicitUrlRequest.builder(message, url, elicitationId)`. First, make sure that `exchange.getClientCapabilities().elicitation().url()` is not `null`. Do not send credentials in a form elicitation.
- Do not use sampling (`exchange.createMessage()`). The revision 2026-07-28 deprecates it. Call the LLM provider API directly.
- Do not use protocol logging (`exchange.loggingNotification()`). The revision 2026-07-28 deprecates it. Log with SLF4J.
- Do not use roots (`exchange.listRoots()`). The revision 2026-07-28 deprecates it. Get paths from tool arguments, resource URIs, or the server configuration.
- Add or remove tools at runtime with `server.addTool(...)` and `server.removeTool(name)`. Then call `server.notifyToolsListChanged()`.
- In a stdio server, stdout is the protocol channel. Do not call `System.out.println()`. Use `slf4j-simple` (it writes to stderr), or set the target of the Logback console appender to `System.err`.
- For a remote server, use Streamable HTTP. The SSE transports are deprecated.
- For a servlet container, use `HttpServletStreamableServerTransportProvider`. For a server without sessions, use `HttpServletStatelessServerTransport`.
- The HTTP transports do not check the `Host` and `Origin` headers by default. Always set `securityValidator(DefaultServerTransportSecurityValidator.builder()...build())`. This also applies to the Spring AI starters.
- The SDK has no authorization. For a remote server, add authorization in a servlet filter or with Spring Security.
- For Spring Boot, use the MCP starters of [Spring AI](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-overview.html) 2.0 or later, for example `spring-ai-starter-mcp-server-webmvc`. Do not use the `io.modelcontextprotocol.sdk:mcp-spring-*` artifacts.
- In Spring AI, write tools as bean methods with `@McpTool` and `@McpToolParam` (from `org.springframework.ai.mcp.annotation`).
- For browser clients, configure CORS. Allow the `Mcp-*` request headers. Expose the `Mcp-Session-Id` response header.
- Package a stdio server as one executable JAR with the `maven-shade-plugin`. In Gradle, use the `application` plugin and the start script from `installDist`. Do not use `./gradlew run` as the client command.
- Test a server with `McpClient.sync(new StdioClientTransport(params, McpJsonDefaults.getMapper()))`. The SDK has no in-memory transport.
- Test servers manually with the MCP Inspector.

## Best Practices

- Give each tool one responsibility.
- Write clear tool descriptions. The description tells the model when to use the tool.
- Add a `description` to each property in `inputSchema`.
- Put each tool specification in its own method. This keeps the tools easy to test.
- In the async server, do not block the event loop. Run code that blocks with `Mono.fromCallable(...).subscribeOn(Schedulers.boundedElastic())`.
- Use environment variables for configuration.
- Be careful when a tool gives access to the file system or the network.

## Common Patterns

The snippets do not show all imports. The protocol types are nested in `io.modelcontextprotocol.spec.McpSchema`. `Mono` is in `reactor.core.publisher`, and `Schedulers` is in `reactor.core.scheduler`.

### Basic Server Setup (stdio)

```java
import java.util.List;
import java.util.Map;

import io.modelcontextprotocol.json.McpJsonDefaults;
import io.modelcontextprotocol.server.McpServer;
import io.modelcontextprotocol.server.McpServerFeatures.SyncToolSpecification;
import io.modelcontextprotocol.server.transport.StdioServerTransportProvider;
import io.modelcontextprotocol.spec.McpSchema.CallToolResult;
import io.modelcontextprotocol.spec.McpSchema.ServerCapabilities;
import io.modelcontextprotocol.spec.McpSchema.Tool;

public final class McpServerApp {

    static SyncToolSpecification addTool() {
        Tool tool = Tool.builder("add", Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "a", Map.of("type", "integer", "description", "First number"),
                                "b", Map.of("type", "integer", "description", "Second number")),
                        "required", List.of("a", "b")))
                .description("Add two integers.")
                .build();

        return SyncToolSpecification.builder()
                .tool(tool)
                .callHandler((exchange, request) -> {
                    long a = ((Number) request.arguments().get("a")).longValue();
                    long b = ((Number) request.arguments().get("b")).longValue();
                    return CallToolResult.builder().addTextContent(String.valueOf(a + b)).build();
                })
                .build();
    }

    public static void main(String[] args) {
        McpServer.sync(new StdioServerTransportProvider(McpJsonDefaults.getMapper()))
                .serverInfo("my-server", "0.1.0")
                .capabilities(ServerCapabilities.builder().tools(false).build())
                .tools(addTool())
                .build();
    }
}
```

### Tool with Structured Output

```java
static SyncToolSpecification wordCountTool() {
    Tool tool = Tool.builder("word_count", Map.of(
                    "type", "object",
                    "properties", Map.of("text", Map.of("type", "string")),
                    "required", List.of("text")))
            .description("Count the words in a text.")
            .outputSchema(Map.of(
                    "type", "object",
                    "properties", Map.of("words", Map.of("type", "integer")),
                    "required", List.of("words")))
            .annotations(ToolAnnotations.builder().readOnlyHint(true).build())
            .build();

    return SyncToolSpecification.builder()
            .tool(tool)
            .callHandler((exchange, request) -> {
                String text = (String) request.arguments().get("text");
                int words = text.isBlank() ? 0 : text.trim().split("\\s+").length;
                return CallToolResult.builder()
                        .addTextContent("{\"words\":" + words + "}")
                        .structuredContent(Map.of("words", words))
                        .build();
            })
            .build();
}
```

### Error Handling

```java
static SyncToolSpecification divideTool() {
    Tool tool = Tool.builder("divide", Map.of(
                    "type", "object",
                    "properties", Map.of("a", Map.of("type", "number"), "b", Map.of("type", "number")),
                    "required", List.of("a", "b")))
            .description("Divide a by b.")
            .build();

    return SyncToolSpecification.builder()
            .tool(tool)
            .callHandler((exchange, request) -> {
                double a = ((Number) request.arguments().get("a")).doubleValue();
                double b = ((Number) request.arguments().get("b")).doubleValue();
                if (b == 0) {
                    return CallToolResult.builder().addTextContent("b must not be zero.").isError(true).build();
                }
                return CallToolResult.builder().addTextContent(String.valueOf(a / b)).build();
            })
            .build();
}
```

### Resources and Resource Templates

```java
static SyncResourceSpecification configResource() {
    return new SyncResourceSpecification(
            Resource.builder("config://app", "app-config").mimeType("application/json").build(),
            (exchange, request) -> ReadResourceResult.builder(List.of(
                    TextResourceContents.builder(request.uri(), "{\"debug\":false}")
                            .mimeType("application/json")
                            .build()))
                    .build());
}

static SyncResourceTemplateSpecification userResource() {
    return new SyncResourceTemplateSpecification(
            ResourceTemplate.builder("users://{id}", "user").build(),
            (exchange, request) -> {
                String id = request.uri().substring("users://".length());
                return ReadResourceResult.builder(List.of(
                        TextResourceContents.builder(request.uri(), "User " + id).build()))
                        .build();
            });
}
```

Register them with `.resources(configResource())` and `.resourceTemplates(userResource())`.

### Prompt with Completion

```java
static SyncPromptSpecification reviewPrompt() {
    Prompt prompt = Prompt.builder("code-review")
            .description("Review code in a language.")
            .arguments(List.of(PromptArgument.builder("language").required(true).build()))
            .build();

    return new SyncPromptSpecification(prompt, (exchange, request) -> GetPromptResult.builder(List.of(
                    PromptMessage.builder(Role.USER,
                            TextContent.builder("Review this " + request.arguments().get("language") + " code.").build())
                            .build()))
            .build());
}

static SyncCompletionSpecification languageCompletion() {
    List<String> languages = List.of("java", "kotlin", "scala");
    return new SyncCompletionSpecification(new PromptReference("code-review"),
            (exchange, request) -> new CompleteResult(new CompleteResult.CompleteCompletion(
                    languages.stream().filter(l -> l.startsWith(request.argument().value())).toList(), null, false)));
}
```

Register them with `.prompts(reviewPrompt())` and `.completions(languageCompletion())`.

### Async Tool with Progress

```java
static AsyncToolSpecification lookupTool() {
    Tool tool = Tool.builder("lookup", Map.of(
                    "type", "object",
                    "properties", Map.of("query", Map.of("type", "string")),
                    "required", List.of("query")))
            .description("Look up a query in a slow backend.")
            .build();

    return AsyncToolSpecification.builder()
            .tool(tool)
            .callHandler((exchange, request) -> {
                Object token = request.progressToken();
                Mono<Void> progress = token == null ? Mono.empty()
                        : exchange.progressNotification(
                                ProgressNotification.builder(token, 0.5).total(1.0).message("Halfway").build());
                return progress.then(Mono.fromCallable(() -> slowLookup((String) request.arguments().get("query")))
                        .subscribeOn(Schedulers.boundedElastic())
                        .map(text -> CallToolResult.builder().addTextContent(text).build()));
            })
            .build();
}
```

Register it on `McpServer.async(transport)`.

### Streamable HTTP Server (Servlet)

```java
HttpServletStreamableServerTransportProvider transport = HttpServletStreamableServerTransportProvider.builder()
        .jsonMapper(McpJsonDefaults.getMapper())
        .mcpEndpoint("/mcp")
        .securityValidator(DefaultServerTransportSecurityValidator.builder()
                .allowedHost("localhost:8080")
                .allowedOrigin("http://localhost:*")
                .build())
        .build();

McpServer.sync(transport)
        .serverInfo("my-server", "0.1.0")
        .capabilities(ServerCapabilities.builder().tools(false).build())
        .tools(addTool())
        .build();
```

The transport is a Jakarta Servlet. Register it in a servlet container at `/mcp` with async support.

### Spring AI Tool

```java
@Component
class CalculatorTools {

    @McpTool(name = "add", description = "Add two integers")
    public int add(@McpToolParam(description = "First number") int a,
            @McpToolParam(description = "Second number") int b) {
        return a + b;
    }
}
```

### Integration Test

```java
class McpServerAppTest {

    private static McpSyncClient client;

    @BeforeAll
    static void startServer() {
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        ServerParameters server = ServerParameters.builder(java)
                .args("-cp", System.getProperty("java.class.path"), McpServerApp.class.getName())
                .build();
        client = McpClient.sync(new StdioClientTransport(server, McpJsonDefaults.getMapper())).build();
        client.initialize();
    }

    @AfterAll
    static void stopServer() {
        client.close();
    }

    @Test
    void add() {
        CallToolResult result = client.callTool(
                CallToolRequest.builder("add").arguments(Map.of("a", 2, "b", 3)).build());
        assertEquals("5", ((TextContent) result.content().get(0)).text());
    }
}
```
