#!/usr/bin/env python3

import asyncio
from copilot import CopilotClient, SessionConfig, MessageOptions, PermissionHandler

async def main():
    client = CopilotClient()
    await client.start()

    # Create session with a memorable ID
    session = await client.create_session(SessionConfig(
        session_id="user-123-conversation",
        model="gpt-5",
        on_permission_request=PermissionHandler.approve_all))

    await session.send_and_wait(MessageOptions(prompt="Let's discuss TypeScript generics"))
    print(f"Session created: {session.session_id}")

    # Destroy session but keep data on disk
    await session.destroy()
    print("Session destroyed (state persisted)")

    # Resume the previous session
    resumed = await client.resume_session("user-123-conversation", on_permission_request=PermissionHandler.approve_all)
    print(f"Resumed: {resumed.session_id}")

    await resumed.send_and_wait(MessageOptions(prompt="What were we discussing?"))

    # List sessions
    sessions = await client.list_sessions()
    print("Sessions:", [s.session_id for s in sessions])

    # Delete session permanently
    await client.delete_session("user-123-conversation")
    print("Session deleted")

    await resumed.destroy()
    await client.stop()

if __name__ == "__main__":
    asyncio.run(main())
