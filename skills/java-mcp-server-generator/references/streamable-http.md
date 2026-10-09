# Streamable HTTP Servers

Use this transport only for a remote server. A local server uses stdio.

## Servlet server

`HttpServletStreamableServerTransportProvider` is a Jakarta Servlet. It is in the `mcp` artifact. Add a servlet container to `pom.xml`, for example embedded Tomcat:

```xml
<dependency>
  <groupId>org.apache.tomcat.embed</groupId>
  <artifactId>tomcat-embed-core</artifactId>
  <version>11.0.26</version>
</dependency>
```

In Gradle, add `implementation("org.apache.tomcat.embed:tomcat-embed-core:11.0.26")`.

Replace the `main` method in `McpServerApp.java`:

```java
public static void main(String[] args) throws Exception {
    int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));

    HttpServletStreamableServerTransportProvider transport = HttpServletStreamableServerTransportProvider.builder()
            .jsonMapper(McpJsonDefaults.getMapper())
            .mcpEndpoint("/mcp")
            .securityValidator(DefaultServerTransportSecurityValidator.builder()
                    .allowedHost("localhost:" + port)
                    .allowedHost("127.0.0.1:" + port)
                    .allowedOrigin("http://localhost:*")
                    .build())
            .build();

    McpServer.sync(transport)
            .serverInfo("demo", "0.1.0")
            .capabilities(ServerCapabilities.builder().tools(false).build())
            .tools(divideTool())
            .build();

    Tomcat tomcat = new Tomcat();
    tomcat.setPort(port);
    tomcat.getConnector();
    Context context = tomcat.addContext("", null);
    Tomcat.addServlet(context, "mcp", transport).setAsyncSupported(true);
    context.addServletMappingDecoded("/mcp", "mcp");
    tomcat.start();
    tomcat.getServer().await();
}
```

Add these imports: `org.apache.catalina.Context`, `org.apache.catalina.startup.Tomcat`, `io.modelcontextprotocol.server.transport.DefaultServerTransportSecurityValidator`, and `io.modelcontextprotocol.server.transport.HttpServletStreamableServerTransportProvider`. Remove the import of `StdioServerTransportProvider`.

Clients connect to `http://HOST:PORT/mcp`. For VS Code, write `.vscode/mcp.json`:

```json
{
  "servers": {
    "demo": {
      "type": "http",
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

## Spring Boot server

Use the MCP starters of [Spring AI](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-server-boot-starter-docs.html) 2.0 or later. Spring AI 2.0 uses Spring Boot 4. Use `spring-boot-starter-parent` 4.0.x. Import `org.springframework.ai:spring-ai-bom` version 2.0.1 and add `spring-ai-starter-mcp-server-webmvc`. For WebFlux, add `spring-ai-starter-mcp-server-webflux`.

Write the tools as annotated methods on a Spring bean:

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

The annotations are in `org.springframework.ai.mcp.annotation`. Set the server identity and the transport in `application.properties`:

```properties
spring.ai.mcp.server.name=demo
spring.ai.mcp.server.version=0.1.0
spring.ai.mcp.server.protocol=STREAMABLE
```

The starter serves the endpoint at `/mcp`.

## Gotchas

- The HTTP transports do not check the `Host` and `Origin` headers by default. This also applies to the Spring AI starters. Without a check, a malicious web page can use DNS rebinding to call a local server. Always set `securityValidator(DefaultServerTransportSecurityValidator.builder()...build())`. The validator rejects an unknown `Origin` with HTTP 403 and an unknown `Host` with HTTP 421.
- In Spring AI, declare your own `WebMvcStreamableServerTransportProvider` bean to set the validator. The starter then does not make its own bean:

  ```java
  @Bean
  WebMvcStreamableServerTransportProvider webMvcStreamableServerTransportProvider() {
      return WebMvcStreamableServerTransportProvider.builder()
              .jsonMapper(McpJsonDefaults.getMapper())
              .mcpEndpoint("/mcp")
              .securityValidator(DefaultServerTransportSecurityValidator.builder()
                      .allowedHost("localhost:8080")
                      .allowedOrigin("http://localhost:*")
                      .build())
              .build();
  }
  ```

- For WebFlux, declare a `WebFluxStreamableServerTransportProvider` bean in the same way. Its builder uses `messageEndpoint("/mcp")`, not `mcpEndpoint`.
- Embedded Tomcat listens on all network interfaces. For a public host, add its name to `allowedHost`. Put authentication in front of the server.
- The SDK has no authorization. For a remote server, add authorization in a servlet filter or with Spring Security.
- `HttpServletStatelessServerTransport` makes a server without sessions. Use it with `McpServer.sync(transport)` when more than one replica must answer the requests. A stateless server cannot send requests to the client. Also set `securityValidator` on its builder.
- For browser clients, add CORS to the servlet container. Allow the `Mcp-*` request headers. Expose the `Mcp-Session-Id` response header.
