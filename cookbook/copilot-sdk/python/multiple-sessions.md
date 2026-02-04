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
from copilot import CopilotClient

client = CopilotClient()
client.start()

# Create multiple independent sessions
session1 = client.create_session(model="gpt-5")
session2 = client.create_session(model="gpt-5")
session3 = client.create_session(model="claude-sonnet-4.5")

# Each session maintains its own conversation history
session1.send(prompt="You are helping with a Python project")
session2.send(prompt="You are helping with a TypeScript project")
session3.send(prompt="You are helping with a Go project")

# Follow-up messages stay in their respective contexts
session1.send(prompt="How do I create a virtual environment?")
session2.send(prompt="How do I set up tsconfig?")
session3.send(prompt="How do I initialize a module?")

# Clean up all sessions
session1.destroy()
session2.destroy()
session3.destroy()
client.stop()
```

## Custom session IDs

Use custom IDs for easier tracking:

```python
session = client.create_session(
    session_id="user-123-chat",
    model="gpt-5"
)

print(session.session_id)  # "user-123-chat"
```

## Listing sessions

```python
sessions = client.list_sessions()
for session_info in sessions:
    print(f"Session: {session_info['sessionId']}")
```

## Deleting sessions

```python
# Delete a specific session
client.delete_session("user-123-chat")
```

## Use cases

- **Multi-user applications**: One session per user
- **Multi-task workflows**: Separate sessions for different tasks
- **A/B testing**: Compare responses from different models
