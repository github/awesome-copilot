# Working with Multiple Sessions

Manage multiple independent conversations simultaneously.

> **Runnable example:** [recipe/multiple_sessions.py](recipe/multiple_sessions.py)
>
> ```bash
> cd recipe && pip install -r requirements.txt
> python multiple_sessions.py
> ```

## Example scenario

You need to run multiple conversations in parallel, each with its own context and history.

## Python

```python
import asyncio
from copilot import CopilotClient, SessionConfig, MessageOptions

async def main():
    client = CopilotClient()
    await client.start()

    # Create multiple independent sessions
    session1 = await client.create_session(SessionConfig(model="gpt-5"))
    session2 = await client.create_session(SessionConfig(model="gpt-5"))
    session3 = await client.create_session(SessionConfig(model="claude-sonnet-4.5"))

    # Each session maintains its own conversation history
    await session1.send(MessageOptions(prompt="You are helping with a Python project"))
    await session2.send(MessageOptions(prompt="You are helping with a TypeScript project"))
    await session3.send(MessageOptions(prompt="You are helping with a Go project"))

    # Follow-up messages stay in their respective contexts
    await session1.send(MessageOptions(prompt="How do I create a virtual environment?"))
    await session2.send(MessageOptions(prompt="How do I set up tsconfig?"))
    await session3.send(MessageOptions(prompt="How do I initialize a module?"))

    # Clean up all sessions
    await session1.destroy()
    await session2.destroy()
    await session3.destroy()
    await client.stop()

if __name__ == "__main__":
    asyncio.run(main())
```

## Custom session IDs

Use custom IDs for easier tracking:

```python
session = await client.create_session(SessionConfig(
    session_id="user-123-chat",
    model="gpt-5"
))

print(session.session_id)  # "user-123-chat"
```

## Listing sessions

```python
sessions = await client.list_sessions()
for session_info in sessions:
    print(f"Session: {session_info.session_id}")
```

## Deleting sessions

```python
# Delete a specific session
await client.delete_session("user-123-chat")
```

## Use cases

- **Multi-user applications**: One session per user
- **Multi-task workflows**: Separate sessions for different tasks
- **A/B testing**: Compare responses from different models
