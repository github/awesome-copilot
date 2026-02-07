#!/usr/bin/env python3

from copilot import CopilotClient

client = CopilotClient()
client.start()

# Create session with a memorable ID
session = client.create_session(
    session_id="user-123-conversation",
    model="gpt-5",
)

session.send(prompt="Let's discuss TypeScript generics")
print(f"Session created: {session.session_id}")

# Destroy session but keep data on disk
session.destroy()
print("Session destroyed (state persisted)")

# Resume the previous session
resumed = client.resume_session("user-123-conversation")
print(f"Resumed: {resumed.session_id}")

resumed.send(prompt="What were we discussing?")

# List sessions
sessions = client.list_sessions()
print("Sessions:", [s["sessionId"] for s in sessions])

# Delete session permanently
client.delete_session("user-123-conversation")
print("Session deleted")

resumed.destroy()
client.stop()
