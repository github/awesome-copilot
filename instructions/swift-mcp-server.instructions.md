---
description: 'Best practices and patterns for building Model Context Protocol (MCP) servers in Swift using the official MCP Swift SDK package.'
applyTo: "**/*.swift, **/Package.swift, **/Package.resolved"
---

# Swift MCP Server Development Guidelines

When building MCP servers in Swift, follow these best practices and patterns using the official Swift SDK.

## Server Setup

Create an MCP server using the `Server` class with capabilities:

```swift
import MCP

let server = Server(
    name: "MyServer",
    version: "1.0.0",
    capabilities: .init(
        prompts: .init(listChanged: true),
        resources: .init(subscribe: true, listChanged: true),
        tools: .init(listChanged: true)
    )
)
```

## Adding Tools

Use `withMethodHandler` to register tool handlers:

```swift
// Register tool list handler
await server.withMethodHandler(ListTools.self) { _ in
    let tools = [
        Tool(
            name: "search",
            description: "Search for information",
            inputSchema: .object([
                "properties": .object([
                    "query": .string("Search query"),
                    "limit": .number("Maximum results")
                ]),
                "required": .array([.string("query")])
            ])
        )
    ]
    return .init(tools: tools)
}

// Register tool call handler
await server.withMethodHandler(CallTool.self) { params in
    switch params.name {
    case "search":
        let query = params.arguments?["query"]?.stringValue ?? ""
        let limit = params.arguments?["limit"]?.intValue ?? 10
        
        // Perform search
        let results = performSearch(query: query, limit: limit)
        
        return .init(
            content: [.text("Found \(results.count) results")],
            isError: false
        )
        
    default:
        return .init(
            content: [.text("Unknown tool")],
            isError: true
        )
    }
}
```

## Adding Resources

Implement resource handlers for data access:

```swift
// Register resource list handler
await server.withMethodHandler(ListResources.self) { params in
    let resources = [
        Resource(
            name: "Data File",
            uri: "resource://data/example.txt",
            description: "Example data file",
            mimeType: "text/plain"
        )
    ]
    return .init(resources: resources, nextCursor: nil)
}

// Register resource read handler
await server.withMethodHandler(ReadResource.self) { params in
    switch params.uri {
    case "resource://data/example.txt":
        let content = loadResourceContent(uri: params.uri)
        return .init(contents: [
            Resource.Content.text(
                content,
                uri: params.uri,
                mimeType: "text/plain"
            )
        ])
        
    default:
        throw MCPError.invalidParams("Unknown resource URI: \(params.uri)")
    }
}

// Register resource subscribe handler
await server.withMethodHandler(ResourceSubscribe.self) { params in
    // Track subscription for notifications
    subscriptions.insert(params.uri)
    print("Client subscribed to \(params.uri)")
    return .init()
}
```

## Adding Prompts

Implement prompt handlers for templated conversations:

```swift
// Register prompt list handler
await server.withMethodHandler(ListPrompts.self) { params in
    let prompts = [
        Prompt(
            name: "analyze",
            description: "Analyze a topic",
            arguments: [
                .init(name: "topic", description: "Topic to analyze", required: true),
                .init(name: "depth", description: "Analysis depth", required: false)
            ]
        )
    ]
    return .init(prompts: prompts, nextCursor: nil)
}

// Register prompt get handler
await server.withMethodHandler(GetPrompt.self) { params in
    switch params.name {
    case "analyze":
        let topic = params.arguments?["topic"]?.stringValue ?? "general"
        let depth = params.arguments?["depth"]?.stringValue ?? "basic"
        
        let description = "Analysis of \(topic) at \(depth) level"
        let messages: [Prompt.Message] = [
            .user("Please analyze this topic: \(topic)"),
            .assistant("I'll provide a \(depth) analysis of \(topic)")
        ]
        
        return .init(description: description, messages: messages)
        
    default:
        throw MCPError.invalidParams("Unknown prompt: \(params.name)")
    }
}
```

## Transport Configuration

### Stdio Transport

For local subprocess communication:

```swift
import MCP
import Logging

let logger = Logger(label: "com.example.mcp-server")
let transport = StdioTransport(logger: logger)

try await server.start(transport: transport)
```

### HTTP Transport (Client Side)

For remote server connections:

```swift
let transport = HTTPClientTransport(
    endpoint: URL(string: "http://localhost:8080")!,
    streaming: true  // Enable Server-Sent Events
)

try await client.connect(transport: transport)
```

## Concurrency and Actors

The server is an actor, ensuring thread-safe access:

```swift
actor ServerState {
    private var subscriptions: Set<String> = []
    private var cache: [String: Any] = [:]
    
    func addSubscription(_ uri: String) {
        subscriptions.insert(uri)
    }
    
    func getSubscriptions() -> Set<String> {
        return subscriptions
    }
}

let state = ServerState()

await server.withMethodHandler(ResourceSubscribe.self) { params in
    await state.addSubscription(params.uri)
    return .init()
}
```

## Error Handling

Use Swift's error handling with `MCPError`:

```swift
await server.withMethodHandler(CallTool.self) { params in
    do {
        guard let query = params.arguments?["query"]?.stringValue else {
            throw MCPError.invalidParams("Missing query parameter")
        }
        
        let result = try performOperation(query: query)
        
        return .init(
            content: [.text(result)],
            isError: false
        )
    } catch let error as MCPError {
        return .init(
            content: [.text(error.localizedDescription)],
            isError: true
        )
    } catch {
        return .init(
            content: [.text("Unexpected error: \(error.localizedDescription)")],
            isError: true
        )
    }
}
```

## JSON Schema with Value Type

Use the `Value` type for JSON schemas:

```swift
let schema = Value.object([
    "type": .string("object"),
    "properties": .object([
        "name": .object([
            "type": .string("string"),
            "description": .string("User's name")
        ]),
        "age": .object([
            "type": .string("integer"),
            "minimum": .number(0),
            "maximum": .number(150)
        ]),
        "email": .object([
            "type": .string("string"),
            "format": .string("email")
        ])
    ]),
    "required": .array([.string("name")])
])
```

## Swift Package Manager Setup

Create your `Package.swift`:

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "MyMCPServer",
    platforms: [
        .macOS(.v13),
        .iOS(.v16)
    ],
    dependencies: [
        .package(
            url: "https://github.com/modelcontextprotocol/swift-sdk.git",
            from: "0.10.0"
        ),
        .package(
            url: "https://github.com/apple/swift-log.git",
            from: "1.5.0"
        )
    ],
    targets: [
        .executableTarget(
            name: "MyMCPServer",
            dependencies: [
                .product(name: "MCP", package: "swift-sdk"),
                .product(name: "Logging", package: "swift-log")
            ]
        )
    ]
)
```

## Graceful Shutdown with ServiceLifecycle

Use Swift Service Lifecycle for proper shutdown:

```swift
import MCP
import ServiceLifecycle
import Logging

struct MCPService: Service {
    let server: Server
    let transport: Transport
    
    func run() async throws {
        try await server.start(transport: transport)
        try await Task.sleep(for: .days(365 * 100))
    }
    
    func shutdown() async throws {
        await server.stop()
    }
}

let logger = Logger(label: "com.example.mcp-server")
let transport = StdioTransport(logger: logger)
let mcpService = MCPService(server: server, transport: transport)

let serviceGroup = ServiceGroup(
    services: [mcpService],
    configuration: .init(
        gracefulShutdownSignals: [.sigterm, .sigint]
    ),
    logger: logger
)

try await serviceGroup.run()
```

## Async/Await Patterns

All server operations use Swift concurrency:

```swift
await server.withMethodHandler(CallTool.self) { params in
    async let result1 = fetchData1()
    async let result2 = fetchData2()
    
    let combined = await "\(result1) and \(result2)"
    
    return .init(
        content: [.text(combined)],
        isError: false
    )
}
```

## Logging

Use swift-log for structured logging:

```swift
import Logging

let logger = Logger(label: "com.example.mcp-server")

await server.withMethodHandler(CallTool.self) { params in
    logger.info("Tool called", metadata: [
        "name": .string(params.name),
        "args": .string("\(params.arguments ?? [:])")
    ])
    
    // Process tool call
    
    logger.debug("Tool completed successfully")
    
    return .init(content: [.text("Result")], isError: false)
}
```

## Testing

Test your server with async/await:

```swift
import XCTest
@testable import MyMCPServer

final class ServerTests: XCTestCase {
    func testToolCall() async throws {
        let server = createTestServer()
        
        // Test tool call logic
        let params = CallTool.Params(
            name: "search",
            arguments: ["query": .string("test")]
        )
        
        // Verify behavior
        XCTAssertNoThrow(try await processToolCall(params))
    }
}
```

## Initialize Hook

Validate client connections with an initialize hook:

```swift
try await server.start(transport: transport) { clientInfo, clientCapabilities in
    // Validate client
    guard clientInfo.name != "BlockedClient" else {
        throw MCPError.invalidRequest("Client not allowed")
    }
    
    // Check capabilities
    if clientCapabilities.sampling == nil {
        logger.warning("Client doesn't support sampling")
    }
    
    logger.info("Client connected", metadata: [
        "name": .string(clientInfo.name),
        "version": .string(clientInfo.version)
    ])
}
```

## Common Patterns

### Content Types

Handle different content types:

```swift
return .init(
    content: [
        .text("Plain text response"),
        .image(imageData, mimeType: "image/png", metadata: [
            "width": 1024,
            "height": 768
        ]),
        .resource(
            uri: "resource://data",
            mimeType: "application/json",
            text: jsonString
        )
    ],
    isError: false
)
```

### Strict Configuration

Use strict mode to fail fast on missing capabilities:

```swift
let client = Client(
    name: "StrictClient",
    version: "1.0.0",
    configuration: .strict
)

// Will throw immediately if capability not available
try await client.listTools()
```

### Request Batching

Send multiple requests efficiently:

```swift
var tasks: [Task<CallTool.Result, Error>] = []

try await client.withBatch { batch in
    for i in 0..<10 {
        tasks.append(
            try await batch.addRequest(
                CallTool.request(.init(
                    name: "process",
                    arguments: ["id": .number(Double(i))]
                ))
            )
        )
    }
}

for (index, task) in tasks.enumerated() {
    let result = try await task.value
    print("\(index): \(result.content)")
}
```
