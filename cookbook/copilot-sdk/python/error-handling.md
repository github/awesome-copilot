# Error Handling Patterns

Handle errors gracefully in your Copilot SDK applications.

> **Runnable example:** [recipe/error_handling.py](recipe/error_handling.py)
>
> ```bash
> cd recipe && pip install -r requirements.txt
> python error_handling.py
> ```

## Example scenario

You need to handle various error conditions like connection failures, timeouts, and invalid responses.

## Basic try-except

```python
import asyncio
from copilot import CopilotClient, SessionConfig, MessageOptions

async def main():
    client = CopilotClient()

    try:
        await client.start()
        session = await client.create_session(SessionConfig(model="gpt-5"))

        response = await session.send_and_wait(MessageOptions(prompt="Hello!"))

        if response:
            print(response.data.content)

        await session.destroy()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await client.stop()

if __name__ == "__main__":
    asyncio.run(main())
```

## Handling specific error types

```python
try:
    await client.start()
except FileNotFoundError:
    print("Copilot CLI not found. Please install it first.")
except ConnectionError:
    print("Could not connect to Copilot CLI server.")
except Exception as e:
    print(f"Unexpected error: {e}")
```

## Timeout handling

```python
session = await client.create_session(SessionConfig(model="gpt-5"))

try:
    # send_and_wait accepts an optional timeout in seconds
    response = await session.send_and_wait(
        MessageOptions(prompt="Complex question..."),
        timeout=30.0
    )
    print("Response received")
except TimeoutError:
    print("Request timed out")
```

## Aborting a request

```python
session = await client.create_session(SessionConfig(model="gpt-5"))

# Start a request (non-blocking send)
await session.send(MessageOptions(prompt="Write a very long story..."))

# Abort it after some condition
await asyncio.sleep(5)
await session.abort()
print("Request aborted")
```

## Graceful shutdown

```python
import signal
import sys

def signal_handler(sig, frame):
    print("\nShutting down...")
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(client.stop())
    except RuntimeError:
        asyncio.run(client.stop())
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
```

## Best practices

1. **Always clean up**: Use try-finally to ensure `await client.stop()` is called
2. **Handle connection errors**: The CLI might not be installed or running
3. **Set appropriate timeouts**: Use the `timeout` parameter on `send_and_wait()`
4. **Log errors**: Capture error details for debugging
