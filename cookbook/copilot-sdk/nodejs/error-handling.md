# Error Handling Patterns

Handle errors gracefully in your Copilot SDK applications.

> **Runnable example:** [recipe/error-handling.ts](recipe/error-handling.ts)
>
> ```bash
> cd recipe && npm install
> npx tsx error-handling.ts
> # or: npm run error-handling
> ```

## Example scenario

You need to handle various error conditions like connection failures, timeouts, and invalid responses.

## Basic try-catch

```typescript
import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient();

try {
    await client.start();
    const session = await client.createSession({ model: "gpt-5" });

    const response = await session.sendAndWait({ prompt: "Hello!" });
    console.log(response?.data.content);

    await session.destroy();
} catch (error) {
    console.error("Error:", error.message);
} finally {
    await client.stop();
}
```

## Handling specific error types

```typescript
try {
    await client.start();
} catch (error) {
    if (error.message.includes("ENOENT")) {
        console.error("Copilot CLI not found. Please install it first.");
    } else if (error.message.includes("ECONNREFUSED")) {
        console.error("Could not connect to Copilot CLI server.");
    } else {
        console.error("Unexpected error:", error.message);
    }
}
```

## Timeout handling

```typescript
const session = await client.createSession({ model: "gpt-5" });

try {
    // sendAndWait with timeout (in milliseconds)
    const response = await session.sendAndWait(
        { prompt: "Complex question..." },
        30000 // 30 second timeout
    );

    if (response) {
        console.log(response.data.content);
    } else {
        console.log("No response received");
    }
} catch (error) {
    if (error.message.includes("timeout")) {
        console.error("Request timed out");
    }
}
```

## Aborting a request

```typescript
const session = await client.createSession({ model: "gpt-5" });

// Start a request
session.send({ prompt: "Write a very long story..." });

// Abort it after some condition
setTimeout(async () => {
    await session.abort();
    console.log("Request aborted");
}, 5000);
```

## Graceful shutdown

```typescript
process.on("SIGINT", async () => {
    console.log("Shutting down...");

    const errors = await client.stop();
    if (errors.length > 0) {
        console.error("Cleanup errors:", errors);
    }

    process.exit(0);
});
```

## Force stop

```typescript
// If stop() takes too long, force stop
const stopPromise = client.stop();
const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));

try {
    await Promise.race([stopPromise, timeout]);
} catch {
    console.log("Forcing stop...");
    await client.forceStop();
}
```

## Best practices

1. **Always clean up**: Use try-finally to ensure `client.stop()` is called
2. **Handle connection errors**: The CLI might not be installed or running
3. **Set appropriate timeouts**: Long-running requests should have timeouts
4. **Log errors**: Capture error details for debugging
