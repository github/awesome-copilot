# Swift MCP Server Generator: extended guide

Sections moved verbatim from [SKILL.md](../SKILL.md) to keep it under 500 lines.

## ToolHandlers.swift Template

```swift
import MCP
import Logging

private let logger = Logger(label: "com.example.mcp-server.tools")

func registerToolHandlers(server: Server) async {
    await server.withMethodHandler(ListTools.self) { _ in
        logger.debug("Listing available tools")
        return .init(tools: getToolDefinitions())
    }
    
    await server.withMethodHandler(CallTool.self) { params in
        logger.info("Tool called", metadata: ["name": .string(params.name)])
        
        switch params.name {
        case "greet":
            return handleGreet(params: params)
            
        case "calculate":
            return handleCalculate(params: params)
            
        default:
            logger.warning("Unknown tool requested", metadata: ["name": .string(params.name)])
            return .init(
                content: [.text("Unknown tool: \(params.name)")],
                isError: true
            )
        }
    }
}

private func handleGreet(params: CallTool.Params) -> CallTool.Result {
    guard let name = params.arguments?["name"]?.stringValue else {
        return .init(
            content: [.text("Missing 'name' parameter")],
            isError: true
        )
    }
    
    let greeting = "Hello, \(name)! Welcome to MCP."
    logger.debug("Generated greeting", metadata: ["name": .string(name)])
    
    return .init(
        content: [.text(greeting)],
        isError: false
    )
}

private func handleCalculate(params: CallTool.Params) -> CallTool.Result {
    guard let operation = params.arguments?["operation"]?.stringValue,
          let a = params.arguments?["a"]?.doubleValue,
          let b = params.arguments?["b"]?.doubleValue else {
        return .init(
            content: [.text("Missing or invalid parameters")],
            isError: true
        )
    }
    
    let result: Double
    switch operation {
    case "add":
        result = a + b
    case "subtract":
        result = a - b
    case "multiply":
        result = a * b
    case "divide":
        guard b != 0 else {
            return .init(
                content: [.text("Division by zero")],
                isError: true
            )
        }
        result = a / b
    default:
        return .init(
            content: [.text("Unknown operation: \(operation)")],
            isError: true
        )
    }
    
    logger.debug("Calculation performed", metadata: [
        "operation": .string(operation),
        "result": .string("\(result)")
    ])
    
    return .init(
        content: [.text("Result: \(result)")],
        isError: false
    )
}
```

## ResourceDefinitions.swift Template

```swift
import MCP

func getResourceDefinitions() -> [Resource] {
    [
        Resource(
            name: "Example Data",
            uri: "resource://data/example",
            description: "Example resource data",
            mimeType: "application/json"
        ),
        Resource(
            name: "Configuration",
            uri: "resource://config",
            description: "Server configuration",
            mimeType: "application/json"
        )
    ]
}
```

## PromptDefinitions.swift Template

```swift
import MCP

func getPromptDefinitions() -> [Prompt] {
    [
        Prompt(
            name: "code-review",
            description: "Generate a code review prompt",
            arguments: [
                .init(name: "language", description: "Programming language", required: true),
                .init(name: "focus", description: "Review focus area", required: false)
            ]
        )
    ]
}
```

## PromptHandlers.swift Template

```swift
import MCP
import Logging

private let logger = Logger(label: "com.example.mcp-server.prompts")

func registerPromptHandlers(server: Server) async {
    await server.withMethodHandler(ListPrompts.self) { params in
        logger.debug("Listing available prompts")
        return .init(prompts: getPromptDefinitions(), nextCursor: nil)
    }
    
    await server.withMethodHandler(GetPrompt.self) { params in
        logger.info("Getting prompt", metadata: ["name": .string(params.name)])
        
        switch params.name {
        case "code-review":
            return handleCodeReviewPrompt(params: params)
            
        default:
            logger.warning("Unknown prompt requested", metadata: ["name": .string(params.name)])
            throw MCPError.invalidParams("Unknown prompt: \(params.name)")
        }
    }
}

private func handleCodeReviewPrompt(params: GetPrompt.Params) -> GetPrompt.Result {
    guard let language = params.arguments?["language"]?.stringValue else {
        return .init(
            description: "Missing language parameter",
            messages: []
        )
    }
    
    let focus = params.arguments?["focus"]?.stringValue ?? "general quality"
    
    let description = "Code review for \(language) with focus on \(focus)"
    let messages: [Prompt.Message] = [
        .user("Please review this \(language) code with focus on \(focus)."),
        .assistant("I'll review the code focusing on \(focus). Please share the code."),
        .user("Here's the code to review: [paste code here]")
    ]
    
    logger.debug("Generated code review prompt", metadata: [
        "language": .string(language),
        "focus": .string(focus)
    ])
    
    return .init(description: description, messages: messages)
}
```
