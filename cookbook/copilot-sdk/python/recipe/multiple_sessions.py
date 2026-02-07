#!/usr/bin/env python3

from copilot import CopilotClient

client = CopilotClient()
client.start()

# Create multiple independent sessions
session1 = client.create_session(model="gpt-5")
session2 = client.create_session(model="gpt-5")
session3 = client.create_session(model="claude-sonnet-4.5")

print("Created 3 independent sessions")

# Each session maintains its own conversation history
session1.send(prompt="You are helping with a Python project")
session2.send(prompt="You are helping with a TypeScript project")
session3.send(prompt="You are helping with a Go project")

print("Sent initial context to all sessions")

# Follow-up messages stay in their respective contexts
session1.send(prompt="How do I create a virtual environment?")
session2.send(prompt="How do I set up tsconfig?")
session3.send(prompt="How do I initialize a module?")

print("Sent follow-up questions to each session")

# Clean up all sessions
session1.destroy()
session2.destroy()
session3.destroy()
client.stop()

print("All sessions destroyed successfully")
