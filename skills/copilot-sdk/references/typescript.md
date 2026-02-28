# TypeScript / Node.js Guide

Use this reference when the user explicitly asks for TypeScript or Node.js.

## Prerequisites

- Node.js 18+
- GitHub Copilot CLI installed and authenticated (`copilot --version`)

## Install

```bash
mkdir copilot-demo && cd copilot-demo
npm init -y --init-type module
npm install @github/copilot-sdk tsx
```

## Quick Start

```typescript
import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient();
const session = await client.createSession({ model: "gpt-4.1" });

const response = await session.sendAndWait({ prompt: "What is 2 + 2?" });
console.log(response?.data.content);

await client.stop();
process.exit(0);
```

Run: `npx tsx index.ts`

## Streaming Responses

Enable real-time output for better UX:

```typescript
import { CopilotClient, SessionEvent } from "@github/copilot-sdk";

const client = new CopilotClient();
const session = await client.createSession({
    model: "gpt-4.1",
    streaming: true,
});

session.on((event: SessionEvent) => {
    if (event.type === "assistant.message_delta") {
        process.stdout.write(event.data.deltaContent);
    }
    if (event.type === "session.idle") {
        console.log(); // New line when done
    }
});

await session.sendAndWait({ prompt: "Tell me a short joke" });

await client.stop();
process.exit(0);
```

## Custom Tools

Define tools that Copilot can invoke during reasoning. When you define a tool, you tell Copilot:
1. **What the tool does** (description)
2. **What parameters it needs** (schema)
3. **What code to run** (handler)

```typescript
import { CopilotClient, defineTool, SessionEvent } from "@github/copilot-sdk";

const getWeather = defineTool("get_weather", {
    description: "Get the current weather for a city",
    parameters: {
        type: "object",
        properties: {
            city: { type: "string", description: "The city name" },
        },
        required: ["city"],
    },
    handler: async (args: { city: string }) => {
        const { city } = args;
        // In a real app, call a weather API here
        const conditions = ["sunny", "cloudy", "rainy", "partly cloudy"];
        const temp = Math.floor(Math.random() * 30) + 50;
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        return { city, temperature: `${temp}°F`, condition };
    },
});

const client = new CopilotClient();
const session = await client.createSession({
    model: "gpt-4.1",
    streaming: true,
    tools: [getWeather],
});

session.on((event: SessionEvent) => {
    if (event.type === "assistant.message_delta") {
        process.stdout.write(event.data.deltaContent);
    }
});

await session.sendAndWait({
    prompt: "What's the weather like in Seattle and Tokyo?",
});

await client.stop();
process.exit(0);
```

## Interactive CLI Assistant

Build a complete interactive assistant:

```typescript
import { CopilotClient, defineTool, SessionEvent } from "@github/copilot-sdk";
import * as readline from "readline";

const getWeather = defineTool("get_weather", {
    description: "Get the current weather for a city",
    parameters: {
        type: "object",
        properties: {
            city: { type: "string", description: "The city name" },
        },
        required: ["city"],
    },
    handler: async ({ city }) => {
        const conditions = ["sunny", "cloudy", "rainy", "partly cloudy"];
        const temp = Math.floor(Math.random() * 30) + 50;
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        return { city, temperature: `${temp}°F`, condition };
    },
});

const client = new CopilotClient();
const session = await client.createSession({
    model: "gpt-4.1",
    streaming: true,
    tools: [getWeather],
});

session.on((event: SessionEvent) => {
    if (event.type === "assistant.message_delta") {
        process.stdout.write(event.data.deltaContent);
    }
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

console.log("Weather Assistant (type 'exit' to quit)");
console.log("Try: 'What's the weather in Paris?'\n");

const prompt = () => {
    rl.question("You: ", async (input) => {
        if (input.toLowerCase() === "exit") {
            await client.stop();
            rl.close();
            return;
        }

        process.stdout.write("Assistant: ");
        await session.sendAndWait({ prompt: input });
        console.log("\n");
        prompt();
    });
};

prompt();
```

## MCP Server Integration

Connect to MCP (Model Context Protocol) servers for pre-built tools. Connect to GitHub's MCP server for repository, issue, and PR access:

```typescript
const session = await client.createSession({
    model: "gpt-4.1",
    mcpServers: {
        github: {
            type: "http",
            url: "https://api.githubcopilot.com/mcp/",
        },
    },
});
```

## Custom Agents

Define specialized AI personas for specific tasks:

```typescript
const session = await client.createSession({
    model: "gpt-4.1",
    customAgents: [{
        name: "pr-reviewer",
        displayName: "PR Reviewer",
        description: "Reviews pull requests for best practices",
        prompt: "You are an expert code reviewer. Focus on security, performance, and maintainability.",
    }],
});
```

## System Message

Customize the AI's behavior and personality:

```typescript
const session = await client.createSession({
    model: "gpt-4.1",
    systemMessage: {
        content: "You are a helpful assistant for our engineering team. Always be concise.",
    },
});
```

## External CLI Server

Run the CLI in server mode separately and connect the SDK to it. Useful for debugging, resource sharing, or custom environments.

### Start CLI in Server Mode

```bash
copilot --server --port 4321
```

### Connect SDK to External Server

```typescript
const client = new CopilotClient({
    cliUrl: "localhost:4321"
});

const session = await client.createSession({ model: "gpt-4.1" });
```

## Session Persistence

Save and resume conversations across restarts:

### Create with Custom ID
```typescript
const session = await client.createSession({
    sessionId: "user-123-conversation",
    model: "gpt-4.1"
});
```

### Resume Session
```typescript
const session = await client.resumeSession("user-123-conversation");
await session.send({ prompt: "What did we discuss earlier?" });
```

### List and Delete Sessions
```typescript
const sessions = await client.listSessions();
await client.deleteSession("old-session-id");
```

## Error Handling

```typescript
const client = new CopilotClient();
try {
    const session = await client.createSession({ model: "gpt-4.1" });
    const response = await session.sendAndWait(
        { prompt: "Hello!" },
        30000 // timeout in ms
    );
} catch (error) {
    if (error.code === "ENOENT") {
        console.error("Copilot CLI not installed");
    } else if (error.code === "ECONNREFUSED") {
        console.error("Cannot connect to Copilot server");
    } else {
        console.error("Error:", error.message);
    }
} finally {
    await client.stop();
}
```

## Graceful Shutdown

```typescript
process.on("SIGINT", async () => {
    console.log("Shutting down...");
    await client.stop();
    process.exit(0);
});
```

## Common Patterns

### Multi-turn Conversation
```typescript
const session = await client.createSession({ model: "gpt-4.1" });

await session.sendAndWait({ prompt: "My name is Alice" });
await session.sendAndWait({ prompt: "What's my name?" });
// Response: "Your name is Alice"
```

### File Attachments
```typescript
await session.send({
    prompt: "Analyze this file",
    attachments: [{
        type: "file",
        path: "./data.csv",
        displayName: "Sales Data"
    }]
});
```

### Abort Long Operations
```typescript
const timeoutId = setTimeout(() => {
    session.abort();
}, 60000);

session.on((event) => {
    if (event.type === "session.idle") {
        clearTimeout(timeoutId);
    }
});
```

## Available Models

Query available models at runtime:

```typescript
const models = await client.getModels();
// Returns: ["gpt-4.1", "gpt-4o", "claude-sonnet-4.5", ...]
```

## Samples

- Node.js: https://github.com/github/copilot-sdk/tree/main/nodejs/samples
