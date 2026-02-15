#!/usr/bin/env python3

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
    # Change this to your target folder
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
