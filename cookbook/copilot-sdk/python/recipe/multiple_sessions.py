#!/usr/bin/env python3

import asyncio
from copilot import CopilotClient, SessionConfig, MessageOptions

async def main():
    client = CopilotClient()
    await client.start()

    # Create multiple independent sessions
    session1 = await client.create_session(SessionConfig(model="gpt-5"))
    session2 = await client.create_session(SessionConfig(model="gpt-5"))
    session3 = await client.create_session(SessionConfig(model="claude-sonnet-4.5"))

    print("Created 3 independent sessions")

    # Each session maintains its own conversation history
    await session1.send(MessageOptions(prompt="You are helping with a Python project"))
    await session2.send(MessageOptions(prompt="You are helping with a TypeScript project"))
    await session3.send(MessageOptions(prompt="You are helping with a Go project"))

    print("Sent initial context to all sessions")

    # Follow-up messages stay in their respective contexts
    await session1.send(MessageOptions(prompt="How do I create a virtual environment?"))
    await session2.send(MessageOptions(prompt="How do I set up tsconfig?"))
    await session3.send(MessageOptions(prompt="How do I initialize a module?"))

    print("Sent follow-up questions to each session")

    # Clean up all sessions
    await session1.destroy()
    await session2.destroy()
    await session3.destroy()
    await client.stop()

    print("All sessions destroyed successfully")

if __name__ == "__main__":
    asyncio.run(main())
