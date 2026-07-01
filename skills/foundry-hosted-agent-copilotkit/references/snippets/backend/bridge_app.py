# Copyright (c) Microsoft. All rights reserved.
"""The bridge: a thin AG-UI endpoint over the Foundry hosted agent.

No LLM, no tools, and no business logic live here — this process only:
  1. Accepts an AG-UI `RunAgentInput` from the CopilotKit runtime (`route.ts`).
  2. Forwards the turn to the hosted agent (`hosted_proxy.run_turn`, which
     talks to `hosted_client`), in DIRECT mode locally (`azd ai agent run`)
     or platform mode once deployed.
  3. Streams back native AG-UI SSE events (text, tool-call cards, an
     approval-request card) and forwards the human's approve/reject decision
     as an `mcp_approval_response` so the gated tool re-executes server-side
     on approve.

An SSE keep-alive comment is emitted periodically so a gateway/proxy in front
of this app doesn't drop the connection while the hosted agent is silently
running a tool.
"""

from __future__ import annotations

import asyncio
import logging
import os

from ag_ui.core import RunAgentInput
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import ValidationError

from hosted_proxy import run_turn

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
logger = logging.getLogger("bridge")

AGENT_NAME = "my-hosted-agent"  # keep this consistent with src/agent.py AGENT_NAME

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
            async for event in run_turn(run_input):
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
async def run_agent(request: Request) -> StreamingResponse:
    if _API_KEY:
        provided = request.headers.get("x-api-key")
        if provided != _API_KEY:
            return StreamingResponse(iter([]), status_code=401)

    body = await request.json()
    try:
        run_input = RunAgentInput.model_validate(body)
    except ValidationError as exc:
        logger.error("Invalid RunAgentInput: %s", exc)
        raise

    return StreamingResponse(_sse_stream(run_input), media_type="text/event-stream")
