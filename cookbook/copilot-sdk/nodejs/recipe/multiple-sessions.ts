import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient();
await client.start();

// Create multiple independent sessions
const session1 = await client.createSession({ model: "gpt-5" });
const session2 = await client.createSession({ model: "gpt-5" });
const session3 = await client.createSession({ model: "claude-sonnet-4.5" });

console.log("Created 3 independent sessions");

// Each session maintains its own conversation history
await session1.sendAndWait({ prompt: "You are helping with a Python project" });
await session2.sendAndWait({ prompt: "You are helping with a TypeScript project" });
await session3.sendAndWait({ prompt: "You are helping with a Go project" });

console.log("Sent initial context to all sessions");

// Follow-up messages stay in their respective contexts
await session1.sendAndWait({ prompt: "How do I create a virtual environment?" });
await session2.sendAndWait({ prompt: "How do I set up tsconfig?" });
await session3.sendAndWait({ prompt: "How do I initialize a module?" });

console.log("Sent follow-up questions to each session");

// Clean up all sessions
await session1.destroy();
await session2.destroy();
await session3.destroy();
await client.stop();

console.log("All sessions destroyed successfully");
