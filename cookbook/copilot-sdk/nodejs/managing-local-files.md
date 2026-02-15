# Grouping Files by Metadata

Use Copilot to intelligently organize files in a folder based on their metadata.

> **Runnable example:** [recipe/managing-local-files.ts](recipe/managing-local-files.ts)
>
> ```bash
> cd recipe && npm install
> npx tsx managing-local-files.ts
> # or: npm run managing-local-files
> ```

## Example scenario

You have a folder with many files and want to organize them into subfolders based on metadata like file type, creation date, size, or other attributes. Copilot can analyze the files and suggest or execute a grouping strategy.

## Example code

```typescript
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
```

## Grouping strategies

### By file extension

```typescript
// Groups files like:
// images/   -> .jpg, .png, .gif
// documents/ -> .pdf, .docx, .txt
// videos/   -> .mp4, .avi, .mov
```

### By creation date

```typescript
// Groups files like:
// 2024-01/ -> files created in January 2024
// 2024-02/ -> files created in February 2024
```

### By file size

```typescript
// Groups files like:
// tiny-under-1kb/
// small-under-1mb/
// medium-under-100mb/
// large-over-100mb/
```

## Dry-run mode

For safety, you can ask Copilot to only preview changes:

```typescript
await session.sendAndWait({
    prompt: `
Analyze files in "${targetFolder}" and show me how you would organize them
by file type. DO NOT move any files - just show me the plan.
`,
});
```

## Custom grouping with AI analysis

Let Copilot determine the best grouping based on file content:

```typescript
await session.sendAndWait({
    prompt: `
Look at the files in "${targetFolder}" and suggest a logical organization.
Consider:
- File names and what they might contain
- File types and their typical uses
- Date patterns that might indicate projects or events

Propose folder names that are descriptive and useful.
`,
});
```

## Safety considerations

1. **Confirm before moving**: Ask Copilot to confirm before executing moves
2. **Handle duplicates**: Consider what happens if a file with the same name exists
3. **Preserve originals**: Consider copying instead of moving for important files
