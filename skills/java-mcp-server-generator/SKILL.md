---
name: java-mcp-server-generator
description: 'Use this skill when the user wants to create a Model Context Protocol (MCP) server in Java or in a Spring Boot app. Also use it when the user wants AI agents, such as GitHub Copilot or Claude, to use Java code, an API, or a database. Use it even if the user does not say "MCP". The skill makes a Maven or Gradle project with the MCP Java SDK 2.x, tools, JUnit tests, and client configuration. Do not use it for an MCP client or for a server in another language.'
compatibility: 'JDK 17 or later, Maven 3.9 or later or Gradle 9 or later, and network access to download dependencies. The MCP Inspector also uses Node.js.'
---

# Java MCP Server Generator

Create a Model Context Protocol (MCP) server in Java with the official [MCP Java SDK](https://github.com/modelcontextprotocol/java-sdk) 2.x. SDK 2.0.x supports the MCP specification revision [2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) and the earlier revisions. SDK 3.x will add the revision [2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28).

## Workflow

Copy this checklist and track your progress:

- [ ] Step 1: Create the project.
- [ ] Step 2: Write the server.
- [ ] Step 3: Write the tests.
- [ ] Step 4: Build until the tests pass.
- [ ] Step 5: Configure the client.

### Step 1: Create the project

Use Maven by default. If the project uses Gradle or the user asks for Gradle, read [references/gradle.md](references/gradle.md). Use it for Step 1, Step 4, and Step 5.

Make this layout:

```text
project-name/
├── pom.xml
└── src/
    ├── main/java/com/example/McpServerApp.java
    └── test/java/com/example/McpServerAppTest.java
```

Write `pom.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.example</groupId>
  <artifactId>mcp-server-demo</artifactId>
  <version>0.1.0</version>

  <properties>
    <maven.compiler.release>17</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>

  <dependencyManagement>
    <dependencies>
      <dependency>
        <groupId>io.modelcontextprotocol.sdk</groupId>
        <artifactId>mcp-bom</artifactId>
        <version>2.0.1</version>
        <type>pom</type>
        <scope>import</scope>
      </dependency>
      <dependency>
        <groupId>org.junit</groupId>
        <artifactId>junit-bom</artifactId>
        <version>6.1.3</version>
        <type>pom</type>
        <scope>import</scope>
      </dependency>
    </dependencies>
  </dependencyManagement>

  <dependencies>
    <dependency>
      <groupId>io.modelcontextprotocol.sdk</groupId>
      <artifactId>mcp</artifactId>
    </dependency>
    <dependency>
      <groupId>org.slf4j</groupId>
      <artifactId>slf4j-simple</artifactId>
      <version>2.0.17</version>
      <scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-shade-plugin</artifactId>
        <version>3.6.2</version>
        <executions>
          <execution>
            <phase>package</phase>
            <goals>
              <goal>shade</goal>
            </goals>
            <configuration>
              <createDependencyReducedPom>false</createDependencyReducedPom>
              <transformers>
                <transformer implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
                  <mainClass>com.example.McpServerApp</mainClass>
                </transformer>
              </transformers>
            </configuration>
          </execution>
        </executions>
      </plugin>
    </plugins>
  </build>
</project>
```

- The `mcp` artifact contains `mcp-core` and the Jackson 3 JSON mapper `mcp-json-jackson3`.
- `slf4j-simple` writes the SDK logs to stderr.
- The shade plugin makes one executable JAR with all dependencies.

### Step 2: Write the server

Start from this template:

```java
package com.example;

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

    static SyncToolSpecification divideTool() {
        Tool tool = Tool.builder("divide", Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "a", Map.of("type", "number", "description", "Dividend"),
                                "b", Map.of("type", "number", "description", "Divisor")),
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

    public static void main(String[] args) {
        McpServer.sync(new StdioServerTransportProvider(McpJsonDefaults.getMapper()))
                .serverInfo("demo", "0.1.0")
                .capabilities(ServerCapabilities.builder().tools(false).build())
                .tools(divideTool())
                .build();
    }
}
```

Then change the template to match the request of the user:

1. Replace `divideTool()` with the tools that the user asks for. Make one method for each tool.
2. Give each tool a JSON Schema `inputSchema` and a `description`. The description tells the model when to use the tool.
3. When the client must get machine-readable data, add `.outputSchema(Map)` to the tool. Return the data with `CallToolResult.builder().structuredContent(map)`. Also add the same data as text content for older clients.
4. Mark a read-only tool with `.annotations(ToolAnnotations.builder().readOnlyHint(true).build())`. Use `destructiveHint(true)` for a destructive tool.
5. Add resources, resource templates, and prompts only when the user asks for them. Also enable them in `ServerCapabilities`.

Use stdio by default. Read [references/streamable-http.md](references/streamable-http.md) only when the user asks for a remote server, an HTTP server, or Spring Boot.

### Step 3: Write the tests

The test starts the server as a subprocess and connects to it with the SDK client. Write a test for each tool and for each error result:

```java
package com.example;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.util.Map;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import io.modelcontextprotocol.client.McpClient;
import io.modelcontextprotocol.client.McpSyncClient;
import io.modelcontextprotocol.client.transport.ServerParameters;
import io.modelcontextprotocol.client.transport.StdioClientTransport;
import io.modelcontextprotocol.json.McpJsonDefaults;
import io.modelcontextprotocol.spec.McpSchema.CallToolRequest;
import io.modelcontextprotocol.spec.McpSchema.CallToolResult;
import io.modelcontextprotocol.spec.McpSchema.TextContent;

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
    void divide() {
        CallToolResult result = client.callTool(
                CallToolRequest.builder("divide").arguments(Map.of("a", 6, "b", 3)).build());
        assertEquals("2.0", ((TextContent) result.content().get(0)).text());
    }

    @Test
    void divideByZero() {
        CallToolResult result = client.callTool(
                CallToolRequest.builder("divide").arguments(Map.of("a", 1, "b", 0)).build());
        assertTrue(result.isError());
        assertTrue(((TextContent) result.content().get(0)).text().contains("must not be zero"));
    }
}
```

- The test uses the `java` command of the JDK that runs Maven. Do not use the `java` command from `PATH`.
- The test uses the real stdio transport and the real JSON-RPC messages.

### Step 4: Build until the tests pass

1. Run `mvn verify`. This command compiles the code, runs the tests, and makes `target/mcp-server-demo-0.1.0.jar`.
2. If a test fails, read the error. Fix the server or the test.
3. Run `mvn verify` again.
4. Continue only when the build is successful.

### Step 5: Configure the client

For VS Code, write `.vscode/mcp.json`:

```json
{
  "servers": {
    "demo": {
      "type": "stdio",
      "command": "java",
      "args": ["-jar", "/absolute/path/to/project/target/mcp-server-demo-0.1.0.jar"]
    }
  }
}
```

For Claude Desktop, put the same `command` and `args` in `claude_desktop_config.json`, below the `mcpServers` key.

For an HTTP server, use the client configuration in [references/streamable-http.md](references/streamable-http.md).

Tell the user these facts:

- `java -jar target/mcp-server-demo-0.1.0.jar` starts the stdio server. The server waits for a host on stdin. The SDK logs go to stderr.
- To test the server manually, start the MCP Inspector with the same command. The Inspector uses Node.js.

## Gotchas

SDK 2.x changed many patterns of SDK 0.x and 1.x. Do not copy examples from earlier versions. Read the [migration guide](https://github.com/modelcontextprotocol/java-sdk/blob/main/MIGRATION-2.0.md) for the full list.

- Use the builders that take the required fields first: `Tool.builder(name, inputSchema)`, `Resource.builder(uri, name)`, `Prompt.builder(name)`, `TextContent.builder(text)`, and `ReadResourceResult.builder(contents)`. The builders without arguments are deprecated.
- A required field must not be `null`. A `null` value causes an `IllegalArgumentException`.
- Tool names must have 1 to 128 characters: letters, digits, `_`, `-`, and `.`. The server builder rejects an incorrect name with an `IllegalArgumentException`. `addTool()` at runtime does not check the name.
- `inputSchema` and `outputSchema` are `Map<String, Object>` values. The `JsonSchema` record is deprecated.
- The server checks each schema against JSON Schema 2020-12 when you call `build()` or `addTool()`. An incorrect schema causes an `IllegalArgumentException`.
- The SDK validates the tool arguments against `inputSchema`. It also validates `structuredContent` against `outputSchema`. If the validation fails, the client gets a tool result with `isError` set to `true`. Thus, the handler gets only valid arguments.
- If a tool has an `outputSchema`, return `structuredContent` in each successful result. Without it, the SDK returns a tool result with `isError` set to `true`.
- Return `CallToolResult` with `isError(true)` for an error that the model must read.
- Do not throw an exception or an `McpError` for a tool failure. The client gets a JSON-RPC error, not a tool result. Many hosts do not show this error to the model.
- In a stdio server, stdout is the protocol channel. Do not call `System.out.println()`.
- Log with SLF4J to stderr. The default console appender of Logback writes to stdout. If you use Logback, set its target to `System.err`.
- The Spring transports moved to [Spring AI](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-overview.html) 2.0 and later (group `org.springframework.ai`). Do not use the `io.modelcontextprotocol.sdk:mcp-spring-*` artifacts.
- Do not use the deprecated SSE transports. Use Streamable HTTP for a remote server.
- The revision 2026-07-28 deprecates these features ([SEP-2577](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2577)). Do not add them to a new server:
  - **Sampling** (`exchange.createMessage()`): Call the LLM provider API directly.
  - **Protocol logging** (`exchange.loggingNotification()`): Use SLF4J.
  - **Roots** (`exchange.listRoots()`): Get paths from tool arguments, resource URIs, or the server configuration.
