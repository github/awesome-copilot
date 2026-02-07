import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient();
await client.start();

// Create a session with a memorable ID
const session = await client.createSession({
    sessionId: "user-123-conversation",
    model: "gpt-5",
});

await session.sendAndWait({ prompt: "Let's discuss TypeScript generics" });
console.log(`Session created: ${session.sessionId}`);

// Destroy session but keep data on disk
await session.destroy();
console.log("Session destroyed (state persisted)");

// Resume the previous session
const resumed = await client.resumeSession("user-123-conversation");
console.log(`Resumed: ${resumed.sessionId}`);

await resumed.sendAndWait({ prompt: "What were we discussing?" });

// List sessions
const sessions = await client.listSessions();
console.log(
    "Sessions:",
    sessions.map((s) => s.sessionId)
);

// Delete session permanently
await client.deleteSession("user-123-conversation");
console.log("Session deleted");

await resumed.destroy();
await client.stop();
