import { CopilotClient } from "@github/copilot-sdk";
import * as os from "node:os";
import * as path from "node:path";

// Create and start client
const client = new CopilotClient();
await client.start();

// Create session
const session = await client.createSession({
    model: "gpt-5",
});

// Event handler
session.on((event) => {
    switch (event.type) {
        case "assistant.message":
            console.log(`\nCopilot: ${event.data.content}`);
            break;
        case "tool.execution_start":
            console.log(`  → Running: ${event.data.toolName} ${event.data.toolCallId}`);
            break;
        case "tool.execution_complete":
            console.log(`  ✓ Completed: ${event.data.toolCallId}`);
            break;
    }
});

// Ask Copilot to organize files
// Change this to your target folder
const targetFolder = path.join(os.homedir(), "Downloads");

await session.sendAndWait({
    prompt: `
Analyze the files in "${targetFolder}" and organize them into subfolders.

1. First, list all files and their metadata
2. Preview grouping by file extension
3. Create appropriate subfolders (e.g., "images", "documents", "videos")
4. Move each file to its appropriate subfolder

Please confirm before moving any files.
`,
});

await session.destroy();
await client.stop();
