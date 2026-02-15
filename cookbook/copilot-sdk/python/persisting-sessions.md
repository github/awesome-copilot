# Session Persistence and Resumption

Save and restore conversation sessions across application restarts.

## Example scenario

You want users to be able to continue a conversation even after closing and reopening your application.

> **Runnable example:** [recipe/persisting_sessions.py](recipe/persisting_sessions.py)
>
> ```bash
> cd recipe && pip install -r requirements.txt
> python persisting_sessions.py
> ```

### Creating a session with a custom ID

```python
import asyncio
from copilot import CopilotClient, SessionConfig, MessageOptions

async def main():
    client = CopilotClient()
    await client.start()

    # Create session with a memorable ID
    session = await client.create_session(SessionConfig(
        session_id="user-123-conversation",
        model="gpt-5",
    ))

    await session.send_and_wait(MessageOptions(prompt="Let's discuss TypeScript generics"))

    # Session ID is preserved
    print(session.session_id)  # "user-123-conversation"

    # Destroy session but keep data on disk
    await session.destroy()
    await client.stop()

if __name__ == "__main__":
    asyncio.run(main())
```

### Resuming a session

```python
client = CopilotClient()
await client.start()

# Resume the previous session
session = await client.resume_session("user-123-conversation")

# Previous context is restored
await session.send_and_wait(MessageOptions(prompt="What were we discussing?"))

await session.destroy()
await client.stop()
```

### Listing available sessions

```python
sessions = await client.list_sessions()
for s in sessions:
    print("Session:", s.session_id)
```

### Deleting a session permanently

```python
# Remove session and all its data from disk
await client.delete_session("user-123-conversation")
```

### Getting session history

```python
messages = await session.get_messages()
for msg in messages:
    print(f"[{msg.type}] {msg.data.content}")
```

## Best practices

1. **Use meaningful session IDs**: Include user ID or context in the session ID
2. **Handle missing sessions**: Check if a session exists before resuming
3. **Clean up old sessions**: Periodically delete sessions that are no longer needed
