# Copyright (c) Microsoft. All rights reserved.
"""The bridge: a thin AG-UI endpoint over the Foundry hosted agent.

No LLM, no tools, and no business logic live here — this single file only:
  1. Accepts an AG-UI `RunAgentInput` from the CopilotKit runtime (`route.ts`).
  2. Forwards the turn to the hosted agent's Responses endpoint — its local
     URL via `azd ai agent run` (DIRECT mode), or its deployed platform
     endpoint once you deploy — and translates the streamed Responses events
     into AG-UI SSE events 1:1 (text, tool-call cards).
  3. When the hosted agent pauses on a gated tool (an `mcp_approval_request`),
     surfaces a synthetic `confirm_changes` tool call for the frontend's
     `useHumanInTheLoop` hook, and forwards the human's decision back as an
     `mcp_approval_response` so the gated tool re-executes server-side on
     approve.

Kept as ONE file on purpose: everything here is one concern (translate +
forward), and splitting it into separate "proxy" / "client" modules for a
~250-line starter mostly adds import indirection without adding clarity. If
your bridge grows a lot of domain-specific translation logic, splitting it
back out is a reasonable adaptation — there's nothing wrong with the split,
it just isn't necessary at this size.

An SSE keep-alive comment is emitted periodically so a gateway/proxy in front
of this app doesn't drop the connection while the hosted agent is silently
running a tool.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from collections.abc import AsyncIterator
from typing import Any

import httpx
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
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse
from pydantic import ValidationError

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
logger = logging.getLogger("bridge")

AGENT_NAME = "my-hosted-agent"  # keep this consistent with hosted/responses/agent.py

# --------------------------------------------------------------------------
# Hosted-agent HTTP client — two modes, selected by which env vars are set.
# --------------------------------------------------------------------------
#   DIRECT (local dev): HOSTED_AGENT_DIRECT_URL points at the agent started
#     by `azd ai agent run` (e.g. http://localhost:8088). Talks straight to
#     the local ResponsesHostServer, no auth.
#   PLATFORM (deployed): FOUNDRY_PROJECT_ENDPOINT + HOSTED_AGENT_NAME reach
#     the published Foundry hosted agent's Responses endpoint keyless (Entra
#     / DefaultAzureCredential, audience https://ai.azure.com/.default).
#     Verify this path against a real deployed agent before relying on it —
#     the endpoint URL shape below was correct when last verified but this
#     stack moves fast.
_DIRECT_URL = os.environ.get("HOSTED_AGENT_DIRECT_URL", "http://localhost:8088")
_FOUNDRY_PROJECT_ENDPOINT = os.environ.get("FOUNDRY_PROJECT_ENDPOINT")
_HOSTED_AGENT_NAME = os.environ.get("HOSTED_AGENT_NAME")
_MODEL_DEPLOYMENT = os.environ.get("AZURE_AI_MODEL_DEPLOYMENT_NAME", "gpt-4.1-mini")
_AAD_SCOPE = "https://ai.azure.com/.default"


def _is_platform_mode() -> bool:
    return bool(_FOUNDRY_PROJECT_ENDPOINT and _HOSTED_AGENT_NAME)


async def _get_bearer_token() -> str:
    """Keyless Entra token for the deployed (platform) hosted agent.

    Requesting the `https://ai.azure.com/.default` audience is load-bearing —
    the default Cognitive Services audience 401s ("audience is incorrect").
    """
    from azure.identity.aio import DefaultAzureCredential

    async with DefaultAzureCredential() as cred:
        token = await cred.get_token(_AAD_SCOPE)
        return token.token


def _target_url() -> str:
    if _is_platform_mode():
        # Deployed hosted-agent endpoint shape — confirm this is still
        # current for your azure.ai.agents extension version:
        #   POST {project_endpoint}/agents/{agent_name}/endpoint/protocols/openai/responses
        base = _FOUNDRY_PROJECT_ENDPOINT.rstrip("/")  # type: ignore[union-attr]
        return f"{base}/agents/{_HOSTED_AGENT_NAME}/endpoint/protocols/openai/responses"
    # DIRECT mode: local `azd ai agent run` (ResponsesHostServer) instance.
    return f"{_DIRECT_URL.rstrip('/')}/responses"


async def _stream_responses(
    *, input_items: list[dict[str, Any]], previous_response_id: str | None
) -> AsyncIterator[dict[str, Any]]:
    """POST to the hosted agent's Responses endpoint and yield parsed SSE events."""
    headers = {"Content-Type": "application/json", "Accept": "text/event-stream"}
    # NOTE: deployed agents use Entra isolation; sending a manual
    # `x-ms-user-isolation-key` header causes a 400. Do not add one here.
    if _is_platform_mode():
        headers["Authorization"] = f"Bearer {await _get_bearer_token()}"

    body: dict[str, Any] = {"model": _MODEL_DEPLOYMENT, "input": input_items, "stream": True}
    if previous_response_id:
        body["previous_response_id"] = previous_response_id

    async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0)) as client:
        async with client.stream("POST", _target_url(), headers=headers, json=body) as resp:
            resp.raise_for_status()
            data_lines: list[str] = []
            async for raw_line in resp.aiter_lines():
                line = raw_line.rstrip("\n")
                if line == "":
                    if data_lines:
                        payload = "\n".join(data_lines)
                        data_lines = []
                        if payload.strip():
                            try:
                                yield json.loads(payload)
                            except json.JSONDecodeError:
                                continue
                    continue
                if line.startswith("data:"):
                    data_lines.append(line[len("data:") :].strip())
                # `event: <name>` lines are redundant with the `type` field in
                # the JSON payload, so they're intentionally ignored here.


# --------------------------------------------------------------------------
# Per-thread turn state (in-memory; single replica only — see hosted-deploy.md)
# --------------------------------------------------------------------------
#   last_response_id: the hosted agent's previous response id, so the next
#     turn chains history server-side via `previous_response_id`.
#   pending_approval: the outstanding approval-gated tool call awaiting a
#     human decision (one open approval per thread in this simple version —
#     extend if you need concurrent approvals).
_THREAD_STATE: dict[str, dict[str, Any]] = {}

# The synthetic tool name the frontend's `useHumanInTheLoop` hook listens for.
# This name (and the resolved payload shape below) is a convention YOU define
# and must keep in sync with the frontend — CopilotKit doesn't enforce either.
CONFIRM_CHANGES_TOOL = "confirm_changes"


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


async def _run_turn(run_input: RunAgentInput) -> AsyncIterator[Any]:
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
        input_items = [{"role": "user", "content": [{"type": "input_text", "text": _latest_user_text(messages)}]}]
        previous_response_id = state.get("last_response_id")

    try:
        async for event in _translate_stream(state=state, input_items=input_items, previous_response_id=previous_response_id):
            yield event
    except Exception as exc:  # noqa: BLE001 - surface any hosted-agent error to the UI
        logger.exception("Hosted agent call failed")
        yield RunErrorEvent(message=str(exc))
        return

    yield RunFinishedEvent(thread_id=thread_id, run_id=run_id)


async def _translate_stream(
    *, state: dict[str, Any], input_items: list[dict[str, Any]], previous_response_id: str | None
) -> AsyncIterator[Any]:
    """Translate one Responses stream into AG-UI events; updates thread state."""
    text_started: set[str] = set()

    async for event in _stream_responses(input_items=input_items, previous_response_id=previous_response_id):
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
                yield ToolCallStartEvent(tool_call_id=call_id, tool_call_name=item["name"])
                yield ToolCallArgsEvent(tool_call_id=call_id, delta=item.get("arguments", "") or "{}")
                yield ToolCallEndEvent(tool_call_id=call_id)

            elif item_type == "function_call_output":
                yield ToolCallResultEvent(
                    message_id=str(uuid.uuid4()),
                    tool_call_id=item["call_id"],
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


# --------------------------------------------------------------------------
# FastAPI app
# --------------------------------------------------------------------------
app = FastAPI(title="agent bridge")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOW_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

_API_KEY = os.environ.get("BRIDGE_API_KEY")
_KEEPALIVE_SECONDS = float(os.environ.get("SSE_KEEPALIVE_SECONDS", "10"))


def _sse_event(event) -> str:
    return f"data: {event.model_dump_json(by_alias=True, exclude_none=True)}\n\n"


async def _sse_stream(run_input: RunAgentInput):
    queue: asyncio.Queue = asyncio.Queue()
    DONE = object()

    async def _produce() -> None:
        try:
            async for event in _run_turn(run_input):
                await queue.put(event)
        finally:
            await queue.put(DONE)

    producer = asyncio.create_task(_produce())
    try:
        while True:
            try:
                item = await asyncio.wait_for(queue.get(), timeout=_KEEPALIVE_SECONDS)
            except asyncio.TimeoutError:
                # Keep the connection alive while the hosted agent silently
                # runs a tool (a dropped idle SSE connection is a known trap).
                yield ": ping\n\n"
                continue
            if item is DONE:
                break
            yield _sse_event(item)
    finally:
        producer.cancel()


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "agent": AGENT_NAME}


@app.post("/")
@app.post("/agent")
async def run_agent(request: Request) -> Response:
    if _API_KEY and request.headers.get("x-api-key") != _API_KEY:
        # A plain 401 (not an empty event-stream) — the caller isn't expecting
        # SSE at this point, and a real body makes the failure obvious when
        # debugging instead of looking like a silently-empty successful run.
        return PlainTextResponse("Unauthorized", status_code=401)

    body = await request.json()
    try:
        run_input = RunAgentInput.model_validate(body)
    except ValidationError as exc:
        logger.error("Invalid RunAgentInput: %s", exc)
        raise

    return StreamingResponse(_sse_stream(run_input), media_type="text/event-stream")
