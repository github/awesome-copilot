# Error Recovery Hooks

Keep the LLM investigating when tools fail instead of giving up with a partial result.

## Problem

When a shell command returns an error or a file operation hits a permission denial, the LLM tends to stop and apologize rather than trying a different approach. This produces incomplete results in agentic workflows where resilience matters.

## Solution

Use the SDK's hooks system (`on_post_tool_use`, `on_error_occurred`) to classify tool results by category and append continuation instructions that nudge the LLM to keep going.

```python
from enum import Enum


class ToolResultCategory(str, Enum):
    SHELL_ERROR = "shell_error"
    PERMISSION_DENIED = "permission_denied"
    NORMAL = "normal"


class SDKErrorCategory(str, Enum):
    CLIENT_ERROR = "client_error"       # 4xx — not retryable
    TRANSIENT = "transient"             # 5xx / timeout
    NON_RECOVERABLE = "non_recoverable"


# Phrases that signal permission issues in tool output
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


def classify_tool_result(tool_name: str, result_text: str) -> ToolResultCategory:
    result_lower = result_text.lower()
    if any(phrase in result_lower for phrase in PERMISSION_DENIAL_PHRASES):
        return ToolResultCategory.PERMISSION_DENIED
    if any(phrase in result_lower for phrase in SHELL_ERROR_PHRASES):
        return ToolResultCategory.SHELL_ERROR
    return ToolResultCategory.NORMAL


def classify_sdk_error(error_msg: str, recoverable: bool) -> SDKErrorCategory:
    error_lower = error_msg.lower()
    if any(kw in error_lower for kw in ("timeout", "503", "502", "429", "retry")):
        return SDKErrorCategory.TRANSIENT
    if any(kw in error_lower for kw in ("401", "403", "404", "400", "422")):
        return SDKErrorCategory.CLIENT_ERROR
    return SDKErrorCategory.TRANSIENT if recoverable else SDKErrorCategory.NON_RECOVERABLE
```

## Hook Registration

Wire the classifiers into the SDK's hook system:

```python
def on_post_tool_use(input_data, env):
    """Append continuation hints to failed tool results."""
    tool_name = input_data.get("toolName", "")
    result = str(input_data.get("toolResult", ""))
    category = classify_tool_result(tool_name, result)
    if category in CONTINUATION_MESSAGES:
        return {"toolResult": result + CONTINUATION_MESSAGES[category]}
    return None


def on_error_occurred(input_data, env):
    """Retry transient errors, skip non-recoverable ones gracefully."""
    error_msg = input_data.get("error", "")
    recoverable = input_data.get("recoverable", False)
    category = classify_sdk_error(error_msg, recoverable)
    if category == SDKErrorCategory.TRANSIENT:
        return {"errorHandling": "retry", "retryCount": 2}
    return {
        "errorHandling": "skip",
        "userNotification": "Error occurred — continuing investigation.",
    }
```

## Tips

- **Tune the phrase lists** for your domain — add patterns from your actual tool output.
- **Log classified categories** so you can track how often each failure mode fires and whether the LLM actually recovers.
- **Cap continuation depth** — if the same tool fails 3+ times in a row, let the LLM give up rather than looping.
- The `SYSTEM NOTE` framing works well because the LLM treats it as authoritative instruction rather than user commentary.

## Runnable Example

See [`recipe/error_recovery_hooks.py`](recipe/error_recovery_hooks.py) for a complete working example.
