# Copyright (c) Microsoft. All rights reserved.
"""Streaming Responses driver for the Foundry hosted agent.

Two modes, selected by which env vars are set:
  - DIRECT (local dev): HOSTED_AGENT_DIRECT_URL points at the agent started by
    `azd ai agent run` (e.g. http://localhost:8088). Talks straight to the
    local ResponsesHostServer, no auth.
  - PLATFORM (deployed): FOUNDRY_PROJECT_ENDPOINT + HOSTED_AGENT_NAME reach the
    published Foundry hosted agent's Responses endpoint keyless (Entra /
    DefaultAzureCredential, audience https://ai.azure.com/.default). Verify
    this path against a real deployed agent before relying on it — the
    endpoint URL shape below was correct when last verified but this stack
    moves fast.

Both modes speak the same OpenAI Responses streaming wire format (SSE:
`event: <type>` / `data: <json>`), so the parsing logic below is shared.
"""

from __future__ import annotations

import json
import os
from collections.abc import AsyncIterator
from typing import Any

import httpx

_DIRECT_URL = os.environ.get("HOSTED_AGENT_DIRECT_URL", "http://localhost:8088")
_FOUNDRY_PROJECT_ENDPOINT = os.environ.get("FOUNDRY_PROJECT_ENDPOINT")
_HOSTED_AGENT_NAME = os.environ.get("HOSTED_AGENT_NAME")
_MODEL_DEPLOYMENT = os.environ.get("AZURE_AI_MODEL_DEPLOYMENT_NAME", "gpt-4.1-mini")

_AAD_SCOPE = "https://ai.azure.com/.default"


def is_platform_mode() -> bool:
    """True once the app is pointed at a deployed hosted agent."""
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


def _target_url() -> tuple[str, dict[str, str]]:
    """Resolve the Responses endpoint + headers for the current mode."""
    if is_platform_mode():
        # Deployed hosted-agent endpoint shape — confirm this is still
        # current for your azure.ai.agents extension version:
        #   POST {project_endpoint}/agents/{agent_name}/endpoint/protocols/openai/responses
        base = _FOUNDRY_PROJECT_ENDPOINT.rstrip("/")  # type: ignore[union-attr]
        url = f"{base}/agents/{_HOSTED_AGENT_NAME}/endpoint/protocols/openai/responses"
        return url, {}
    # DIRECT mode: local `azd ai agent run` (ResponsesHostServer) instance.
    return f"{_DIRECT_URL.rstrip('/')}/responses", {}


async def stream_responses(
    *,
    input_items: list[dict[str, Any]],
    previous_response_id: str | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """POST to the hosted agent's Responses endpoint and yield parsed SSE events.

    Each yielded item is the parsed JSON payload of one `data:` line (the
    OpenAI Responses streaming event envelope: {"type": ..., ...}).
    """
    url, base_headers = _target_url()
    headers = {"Content-Type": "application/json", "Accept": "text/event-stream", **base_headers}

    # NOTE: deployed agents use Entra isolation; sending a manual
    # `x-ms-user-isolation-key` header causes a 400. Do not add one here.
    if is_platform_mode():
        headers["Authorization"] = f"Bearer {await _get_bearer_token()}"

    body: dict[str, Any] = {
        "model": _MODEL_DEPLOYMENT,
        "input": input_items,
        "stream": True,
    }
    if previous_response_id:
        body["previous_response_id"] = previous_response_id

    async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0)) as client:
        async with client.stream("POST", url, headers=headers, json=body) as resp:
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
