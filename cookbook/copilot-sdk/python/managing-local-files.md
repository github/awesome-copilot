# Grouping Files by Metadata

Use Copilot to intelligently organize files in a folder based on their metadata.

> **Runnable example:** [recipe/managing_local_files.py](recipe/managing_local_files.py)
>
> ```bash
> cd recipe && pip install -r requirements.txt
> python managing_local_files.py
> ```

## Example scenario

You have a folder with many files and want to organize them into subfolders based on metadata like file type, creation date, size, or other attributes. Copilot can analyze the files and suggest or execute a grouping strategy.

## Example code

```python
import asyncio
import os
from copilot import (
    CopilotClient, SessionConfig, MessageOptions,
    SessionEvent, SessionEventType,
)

async def main():
    # Create and start client
    client = CopilotClient()
    await client.start()

    # Create session
    session = await client.create_session(SessionConfig(model="gpt-5"))

    done = asyncio.Event()

    # Event handler
    def handle_event(event: SessionEvent):
        if event.type == SessionEventType.ASSISTANT_MESSAGE:
            print(f"\nCopilot: {event.data.content}")
        elif event.type == SessionEventType.TOOL_EXECUTION_START:
            print(f"  → Running: {event.data.tool_name}")
        elif event.type == SessionEventType.TOOL_EXECUTION_COMPLETE:
            print(f"  ✓ Completed: {event.data.tool_call_id}")
        elif event.type.value == "session.idle":
            done.set()

    session.on(handle_event)

    # Ask Copilot to organize files
    target_folder = os.path.expanduser("~/Downloads")

    await session.send(MessageOptions(prompt=f"""
Analyze the files in "{target_folder}" and organize them into subfolders.

1. First, list all files and their metadata
2. Preview grouping by file extension
3. Create appropriate subfolders (e.g., "images", "documents", "videos")
4. Move each file to its appropriate subfolder

Please confirm before moving any files.
"""))

    await done.wait()

    await session.destroy()
    await client.stop()

if __name__ == "__main__":
    asyncio.run(main())
```

## Grouping strategies

### By file extension

```python
# Groups files like:
# images/   -> .jpg, .png, .gif
# documents/ -> .pdf, .docx, .txt
# videos/   -> .mp4, .avi, .mov
```

### By creation date

```python
# Groups files like:
# 2024-01/ -> files created in January 2024
# 2024-02/ -> files created in February 2024
```

### By file size

```python
# Groups files like:
# tiny-under-1kb/
# small-under-1mb/
# medium-under-100mb/
# large-over-100mb/
```

## Dry-run mode

For safety, you can ask Copilot to only preview changes:

```python
await session.send(MessageOptions(prompt=f"""
Analyze files in "{target_folder}" and show me how you would organize them
by file type. DO NOT move any files - just show me the plan.
"""))
```

## Custom grouping with AI analysis

Let Copilot determine the best grouping based on file content:

```python
await session.send(MessageOptions(prompt=f"""
Look at the files in "{target_folder}" and suggest a logical organization.
Consider:
- File names and what they might contain
- File types and their typical uses
- Date patterns that might indicate projects or events

Propose folder names that are descriptive and useful.
"""))
```

## Safety considerations

1. **Confirm before moving**: Ask Copilot to confirm before executing moves
2. **Handle duplicates**: Consider what happens if a file with the same name exists
3. **Preserve originals**: Consider copying instead of moving for important files
