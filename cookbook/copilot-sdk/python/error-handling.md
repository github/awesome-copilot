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
from copilot import CopilotClient

client = CopilotClient()

try:
    client.start()
    session = client.create_session(model="gpt-5")

    response = None
    def handle_message(event):
        nonlocal response
        if event["type"] == "assistant.message":
            response = event["data"]["content"]

    session.on(handle_message)
    session.send(prompt="Hello!")
    session.wait_for_idle()

    if response:
        print(response)

    session.destroy()
except Exception as e:
    print(f"Error: {e}")
finally:
    client.stop()
```

## Handling specific error types

```python
import subprocess

try:
    client.start()
except FileNotFoundError:
    print("Copilot CLI not found. Please install it first.")
except ConnectionError:
    print("Could not connect to Copilot CLI server.")
except Exception as e:
    print(f"Unexpected error: {e}")
```

## Timeout handling

```python
import signal
from contextlib import contextmanager

@contextmanager
def timeout(seconds):
    def timeout_handler(signum, frame):
        raise TimeoutError("Request timed out")

    old_handler = signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(seconds)
    try:
        yield
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_handler)

session = client.create_session(model="gpt-5")

try:
    session.send(prompt="Complex question...")

    # Wait with timeout (30 seconds)
    with timeout(30):
        session.wait_for_idle()

    print("Response received")
except TimeoutError:
    print("Request timed out")
```

## Aborting a request

```python
import threading

session = client.create_session(model="gpt-5")

# Start a request
session.send(prompt="Write a very long story...")

# Abort it after some condition
def abort_later():
    import time
    time.sleep(5)
    session.abort()
    print("Request aborted")

threading.Thread(target=abort_later).start()
```

## Graceful shutdown

```python
import signal
import sys

def signal_handler(sig, frame):
    print("\nShutting down...")
    errors = client.stop()
    if errors:
        print(f"Cleanup errors: {errors}")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
```

## Context manager for automatic cleanup

```python
from copilot import CopilotClient

with CopilotClient() as client:
    client.start()
    session = client.create_session(model="gpt-5")

    # ... do work ...

    # client.stop() is automatically called when exiting context
```

## Best practices

1. **Always clean up**: Use try-finally or context managers to ensure `stop()` is called
2. **Handle connection errors**: The CLI might not be installed or running
3. **Set appropriate timeouts**: Long-running requests should have timeouts
4. **Log errors**: Capture error details for debugging
