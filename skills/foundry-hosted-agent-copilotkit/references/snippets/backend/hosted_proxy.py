# Copyright (c) Microsoft. All rights reserved.
"""HostedProxyAgent — forwards each AG-UI turn to the Foundry hosted agent and
translates the Responses stream into native AG-UI SSE events.

This is one way to implement the bridge the skill calls for (see
architecture.md strategy 2 — hand-rolled AG-UI translation): the native
`add_agent_framework_fastapi_endpoint(FoundryAgent(...))` path resolves an
approval decision LOCALLY and never forwards it as an `mcp_approval_response`,
so an approved gated tool never re-executes server-side. This proxy exists
purely to close that one gap: it forwards the human's decision to the hosted
agent so the tool re-executes there, and otherwise just translates Responses
events to AG-UI 1:1.

Per-thread state (in-memory; single replica only — see hosted-deploy.md):
  - last_response_id: the hosted agent's previous `response_id`, so the next
    turn chains history server-side via `previous_response_id`.
  - pending_approval: the outstanding approval-gated tool call awaiting a
    human decision (a thread can only have one open approval at a time in
    this simple version — extend if you need concurrent approvals).
"""

from __future__ import annotations

import json
import logging
import uuid
from collections.abc import AsyncIterator
from typing import Any

from ag_ui.core import (
    RunAgentInput,
    RunErrorEvent,
    RunFinishedEvent,
    RunStartedEvent,
    TextMessageContentEvent,
    TextMessageEndEvent,
    TextMessageStartEvent,
    ToolCallArgsEvent,
    ToolCallEndEvent,
    ToolCallResultEvent,
    ToolCallStartEvent,
    ToolMessage,
    UserMessage,
)

from hosted_client import stream_responses

logger = logging.getLogger(__name__)

# The synthetic tool name the frontend's `useHumanInTheLoop` hook listens for.
# This name (and the resolved payload shape below) is a convention YOU define
# and must keep in sync with the frontend — CopilotKit doesn't enforce either.
CONFIRM_CHANGES_TOOL = "confirm_changes"

# thread_id -> {"last_response_id": str | None, "pending_approval": dict | None}
_THREAD_STATE: dict[str, dict[str, Any]] = {}


def _thread_state(thread_id: str) -> dict[str, Any]:
    return _THREAD_STATE.setdefault(thread_id, {"last_response_id": None, "pending_approval": None})


def _latest_user_text(messages: list[Any]) -> str:
    """The most recent user message's text (a fresh turn, not an approval)."""
    for msg in reversed(messages):
        if isinstance(msg, UserMessage):
            content = msg.content
            if isinstance(content, str):
                return content
            if isinstance(content, list):
                parts = [getattr(p, "text", "") for p in content if getattr(p, "type", None) == "text"]
                return "\n".join(p for p in parts if p)
    return ""


def _find_approval_decision(messages: list[Any], pending: dict[str, Any] | None) -> bool | None:
    """Detect a `confirm_changes` resolution from the frontend.

    `useHumanInTheLoop.respond({accepted, steps})` round-trips as a ToolMessage
    whose `tool_call_id` matches the pending confirm_changes call and whose
    content is `{"accepted": bool, "steps": [...]}` — this exact shape is a
    convention this snippet defines; pick your own and keep both sides
    consistent if you change it.
    """
    if not pending:
        return None
    for msg in reversed(messages):
        if isinstance(msg, ToolMessage) and msg.tool_call_id == pending.get("tool_call_id"):
            try:
                parsed = json.loads(msg.content) if isinstance(msg.content, str) else msg.content
            except (json.JSONDecodeError, TypeError):
                continue
            if isinstance(parsed, dict) and "accepted" in parsed:
                return bool(parsed["accepted"])
    return None


async def run_turn(run_input: RunAgentInput) -> AsyncIterator[Any]:
    """Run one AG-UI turn against the hosted agent; yields AG-UI events."""
    thread_id = run_input.thread_id
    run_id = run_input.run_id
    state = _thread_state(thread_id)
    messages = run_input.messages

    yield RunStartedEvent(thread_id=thread_id, run_id=run_id)

    pending = state.get("pending_approval")
    decision = _find_approval_decision(messages, pending)

    if decision is not None and pending is not None:
        input_items: list[dict[str, Any]] = [
            {
                "type": "mcp_approval_response",
                "approval_request_id": pending["approval_request_id"],
                "approve": decision,
            }
        ]
        previous_response_id = pending["response_id"]
        state["pending_approval"] = None
    else:
        text = _latest_user_text(messages)
        input_items = [{"role": "user", "content": [{"type": "input_text", "text": text}]}]
        previous_response_id = state.get("last_response_id")

    try:
        async for event in _translate_stream(
            state=state,
            input_items=input_items,
            previous_response_id=previous_response_id,
        ):
            yield event
    except Exception as exc:  # noqa: BLE001 - surface any hosted-agent error to the UI
        logger.exception("Hosted agent call failed")
        yield RunErrorEvent(message=str(exc))
        return

    yield RunFinishedEvent(thread_id=thread_id, run_id=run_id)


async def _translate_stream(
    *,
    state: dict[str, Any],
    input_items: list[dict[str, Any]],
    previous_response_id: str | None,
) -> AsyncIterator[Any]:
    """Translate one Responses stream into AG-UI events; updates thread state."""
    text_started: set[str] = set()

    async for event in stream_responses(input_items=input_items, previous_response_id=previous_response_id):
        etype = event.get("type")

        if etype == "response.output_text.delta":
            item_id = event["item_id"]
            delta = event.get("delta", "")
            if item_id not in text_started:
                text_started.add(item_id)
                yield TextMessageStartEvent(message_id=item_id, role="assistant")
            if delta:
                yield TextMessageContentEvent(message_id=item_id, delta=delta)

        elif etype == "response.output_item.done":
            item = event.get("item", {})
            item_type = item.get("type")

            if item_type == "message" and item.get("id") in text_started:
                yield TextMessageEndEvent(message_id=item["id"])

            elif item_type == "function_call":
                call_id = item["call_id"]
                name = item["name"]
                yield ToolCallStartEvent(tool_call_id=call_id, tool_call_name=name)
                yield ToolCallArgsEvent(tool_call_id=call_id, delta=item.get("arguments", "") or "{}")
                yield ToolCallEndEvent(tool_call_id=call_id)

            elif item_type == "function_call_output":
                call_id = item["call_id"]
                yield ToolCallResultEvent(
                    message_id=str(uuid.uuid4()),
                    tool_call_id=call_id,
                    content=str(item.get("output", "")),
                    role="tool",
                )

            elif item_type == "mcp_approval_request":
                # The gated tool paused. Surface it as the synthetic
                # `confirm_changes` tool call the frontend's
                # useHumanInTheLoop hook renders and resolves.
                function_name = item["name"]
                function_arguments = item.get("arguments", "{}")
                tool_call_id = str(uuid.uuid4())
                args_payload = json.dumps(
                    {
                        "function_name": function_name,
                        "function_arguments": function_arguments,
                        "steps": [
                            {
                                "description": (
                                    f"Call {function_name} with arguments {function_arguments}. "
                                    "This is a consequential action and needs your explicit approval."
                                )
                            }
                        ],
                    }
                )
                yield ToolCallStartEvent(tool_call_id=tool_call_id, tool_call_name=CONFIRM_CHANGES_TOOL)
                yield ToolCallArgsEvent(tool_call_id=tool_call_id, delta=args_payload)
                yield ToolCallEndEvent(tool_call_id=tool_call_id)

                state["pending_approval"] = {
                    "tool_call_id": tool_call_id,
                    "approval_request_id": item["id"],
                    "function_name": function_name,
                    "function_arguments": function_arguments,
                    # Filled in once `response.completed` arrives below — an
                    # mcp_approval_response must chain off the response.id
                    # that CONTAINS the approval request.
                    "response_id": None,
                }

        elif etype == "response.completed":
            response = event.get("response", {})
            response_id = response.get("response_id") or response.get("id")
            state["last_response_id"] = response_id
            if state.get("pending_approval") is not None and state["pending_approval"].get("response_id") is None:
                state["pending_approval"]["response_id"] = response_id

        elif etype == "error":
            raise RuntimeError(event.get("message") or "hosted agent returned an error event")
