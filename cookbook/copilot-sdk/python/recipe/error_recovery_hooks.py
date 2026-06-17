"""
Error Recovery Hooks
====================
Demonstrates how to classify tool results and SDK errors, then use hooks
to keep the LLM investigating instead of giving up on failure.

Run:
    python error_recovery_hooks.py

Requirements:
    pip install copilot-sdk
"""

import asyncio
from enum import Enum

from copilot import CopilotClient, SubprocessConfig


# ---------------------------------------------------------------------------
# Classification enums
# ---------------------------------------------------------------------------

class ToolResultCategory(str, Enum):
    SHELL_ERROR = "shell_error"
    PERMISSION_DENIED = "permission_denied"
    NORMAL = "normal"


class SDKErrorCategory(str, Enum):
    CLIENT_ERROR = "client_error"       # 4xx — not retryable
    TRANSIENT = "transient"             # 5xx / timeout
    NON_RECOVERABLE = "non_recoverable"


# ---------------------------------------------------------------------------
# Detection phrases — extend these for your domain
# ---------------------------------------------------------------------------

PERMISSION_DENIAL_PHRASES = [
    "permission denied",
    "access denied",
    "not permitted",
    "operation not allowed",
    "eacces",
    "eperm",
    "403 forbidden",
]

SHELL_ERROR_PHRASES = [
    "command not found",
    "no such file or directory",
    "exit code",
    "errno",
    "traceback",
]


# ---------------------------------------------------------------------------
# Continuation messages appended to failed tool results
# ---------------------------------------------------------------------------

CONTINUATION_MESSAGES = {
    ToolResultCategory.SHELL_ERROR: (
        "\n\n[SYSTEM NOTE: This command encountered an error. "
        "This does NOT mean you should stop. Retry with different "
        "arguments, try a different tool, or move on.]"
    ),
    ToolResultCategory.PERMISSION_DENIED: (
        "\n\n[SYSTEM NOTE: Permission was denied for this specific "
        "action. Continue using alternative approaches.]"
    ),
}


# ---------------------------------------------------------------------------
# Classifiers
# ---------------------------------------------------------------------------

def classify_tool_result(tool_name: str, result_text: str) -> ToolResultCategory:
    """Classify a tool's output into a failure category."""
    result_lower = result_text.lower()

    if any(phrase in result_lower for phrase in PERMISSION_DENIAL_PHRASES):
        return ToolResultCategory.PERMISSION_DENIED

    if any(phrase in result_lower for phrase in SHELL_ERROR_PHRASES):
        return ToolResultCategory.SHELL_ERROR

    return ToolResultCategory.NORMAL


def classify_sdk_error(error_msg: str, recoverable: bool) -> SDKErrorCategory:
    """Classify an SDK-level error for retry/skip decisions."""
    error_lower = error_msg.lower()

    if any(kw in error_lower for kw in ("timeout", "503", "502", "429", "retry")):
        return SDKErrorCategory.TRANSIENT

    if any(kw in error_lower for kw in ("401", "403", "404", "400", "422")):
        return SDKErrorCategory.CLIENT_ERROR

    return SDKErrorCategory.TRANSIENT if recoverable else SDKErrorCategory.NON_RECOVERABLE


# ---------------------------------------------------------------------------
# SDK Hooks
# ---------------------------------------------------------------------------

def on_post_tool_use(input_data, env):
    """Append continuation hints to failed tool results."""
    tool_name = input_data.get("toolName", "")
    result = str(input_data.get("toolResult", ""))

    category = classify_tool_result(tool_name, result)
    print(f"  [hook] {tool_name} -> {category.value}")

    if category in CONTINUATION_MESSAGES:
        return {"toolResult": result + CONTINUATION_MESSAGES[category]}
    return None


def on_error_occurred(input_data, env):
    """Retry transient errors, skip non-recoverable ones gracefully."""
    error_msg = input_data.get("error", "")
    recoverable = input_data.get("recoverable", False)

    category = classify_sdk_error(error_msg, recoverable)
    print(f"  [hook] SDK error -> {category.value}: {error_msg[:80]}")

    if category == SDKErrorCategory.TRANSIENT:
        return {"errorHandling": "retry", "retryCount": 2}
    return {
        "errorHandling": "skip",
        "userNotification": "Error occurred — continuing investigation.",
    }


# ---------------------------------------------------------------------------
# Demo: standalone classification test
# ---------------------------------------------------------------------------

def demo_classification():
    """Show classification working on sample outputs."""
    samples = [
        ("bash", "ls: cannot access '/root': Permission denied"),
        ("bash", "grep: command not found"),
        ("read_file", '{"lines": ["INFO startup complete"]}'),
        ("bash", "cat: /etc/shadow: Operation not permitted"),
    ]

    print("Classification demo:")
    print("-" * 60)
    for tool, output in samples:
        cat = classify_tool_result(tool, output)
        print(f"  {tool:15s} | {cat.value:20s} | {output[:50]}")
    print()

    error_samples = [
        ("Connection timeout after 30s", True),
        ("HTTP 503 Service Unavailable", True),
        ("HTTP 404 Not Found", False),
        ("Unexpected server error", False),
    ]

    print("SDK error classification demo:")
    print("-" * 60)
    for msg, recoverable in error_samples:
        cat = classify_sdk_error(msg, recoverable)
        print(f"  recoverable={recoverable!s:5s} | {cat.value:20s} | {msg}")


# ---------------------------------------------------------------------------
# Demo: wired into a real session
# ---------------------------------------------------------------------------

async def demo_with_session():
    """Create a session with hooks registered (requires Copilot auth)."""
    client = CopilotClient(
        SubprocessConfig(log_level="info", use_stdio=True),
        auto_start=True,
    )
    await client.start()

    try:
        session = await client.create_session(
            hooks={
                "on_post_tool_use": on_post_tool_use,
                "on_error_occurred": on_error_occurred,
            }
        )
        # Send a prompt that's likely to trigger tool use
        response = await session.send_message(
            "List the files in /tmp and then try to read /etc/shadow. "
            "If you can't read it, explain why and move on."
        )
        print(f"\nAgent response:\n{response}")
    finally:
        await client.stop()


if __name__ == "__main__":
    # Always run the standalone demo
    demo_classification()

    # Uncomment to test with a live session:
    # asyncio.run(demo_with_session())
