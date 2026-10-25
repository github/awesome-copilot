"""Reference hosted agent: GitHub Copilot SDK + Foundry toolbox (tools and skills over MCP).

Reference only: copilot-sdk-foundry.md is the recipe and wins on any conflict. Written against
github-copilot-sdk 1.0.14 and re-checked on 1.0.20; inspect the installed APIs first. Call `run_turn` from the Responses
handler that `azd ai agent init` scaffolds: create one credential and one client at startup and
close them at shutdown, pass the request's `x-agent-foundry-call-id` from the adapter's verified
request-context accessor, and stream the returned tool calls as output items before the message
(foundry-hosted-agent.md). Return a ToolboxError that has a consent_url to the caller as the
answer: the first use of an OAuth connection needs one sign-in per user.

    pip install "github-copilot-sdk[telemetry]" azure-identity

Environment (the agent's `env` in azure.yaml; FOUNDRY_* and AGENT_* are platform-reserved):
  TOOLBOX_ENDPOINT                Consumer URL <project>/toolboxes/<name>/mcp?api-version=v1, mapped
                                  from TOOLBOX_<NAME>_MCP_ENDPOINT; it serves the default version.
  MODEL_API_BASE_URL              The discovered .../openai/v1/ base and its deployment. Required
  AZURE_AI_MODEL_DEPLOYMENT_NAME  when hosted; locally, unset means the Copilot default model.
  COPILOT_OTLP_ENDPOINT           Optional OTLP HTTP receiver for runtime spans.

Skills attached to the toolbox are MCP resources (skill://<name>/SKILL.md) that follow each
skill's default version, so publishing a skill needs no redeploy. For multi-file skills, or
skills outside a toolbox, use the Skills API download in microsoft-foundry. Verify that served
bodies keep their frontmatter; load_skills rebuilds it when missing.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import tempfile
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import httpx
from azure.core.credentials_async import AsyncTokenCredential
from azure.identity.aio import DefaultAzureCredential
from copilot import CopilotClient, SessionEventType, Tool, ToolInvocation, ToolResult
from copilot.generated.rpc import PermissionDecisionApproveOnce, PermissionDecisionReject
from copilot.generated.session_events import PermissionRequestCustomTool, PermissionRequestRead
from copilot.session import ProviderConfig, ProviderTokenArgs
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

log = logging.getLogger("agent")
tracer = trace.get_tracer(__name__)

SCOPE = "https://ai.azure.com/.default"  # model and toolbox audience; cognitiveservices gets 401
TOOLBOX_ENDPOINT = os.environ["TOOLBOX_ENDPOINT"]
MODEL_BASE_URL = os.getenv("MODEL_API_BASE_URL")
MODEL_DEPLOYMENT = os.getenv("AZURE_AI_MODEL_DEPLOYMENT_NAME")
if bool(MODEL_BASE_URL) != bool(MODEL_DEPLOYMENT):
    # One without the other would silently fall back to the Copilot default model.
    raise RuntimeError("Set both MODEL_API_BASE_URL and AZURE_AI_MODEL_DEPLOYMENT_NAME, or neither.")
WRITABLE = Path(tempfile.gettempdir())  # hosted containers are read-only except the temp dir
SKILL_URI = re.compile(r"skill://([A-Za-z0-9_-]+)/SKILL\.md")
TURN_TIMEOUT = 300.0


@dataclass
class ToolCall:
    """One toolbox call, emitted as function_call and function_call_output items."""

    call_id: str
    name: str
    arguments: str
    output: str


@dataclass
class Turn:
    text: str
    tool_calls: list[ToolCall] = field(default_factory=list)


class ToolboxError(RuntimeError):
    """A toolbox JSON-RPC error; `consent_url` is set when a connection needs user consent."""

    def __init__(self, message: str, consent_url: str | None = None) -> None:
        super().__init__(message)
        self.consent_url = consent_url


def _toolbox_error(error: dict[str, Any]) -> ToolboxError:
    message = str(error.get("message", ""))
    if error.get("code") == -32006 and "{" in message:
        try:  # -32006 wraps per-source errors as JSON after a human-readable prefix
            for source in json.loads(message[message.index("{") :]).get("errors", []):
                nested = source.get("error") or {}
                if nested.get("code") == "CONSENT_REQUIRED":
                    url = nested.get("message")
                    name = source.get("name", "A toolbox connection")
                    return ToolboxError(f"{name} needs consent: open {url}, sign in, then retry.", url)
        except (ValueError, AttributeError):
            pass
    return ToolboxError(f"Toolbox error {error.get('code')}: {message or 'unknown'}")


class _Bearer(httpx.Auth):
    """Adds a token to every request; Azure Identity caches and renews it."""

    def __init__(self, credential: AsyncTokenCredential) -> None:
        self._credential = credential

    async def async_auth_flow(self, request: httpx.Request):
        request.headers["Authorization"] = f"Bearer {(await self._credential.get_token(SCOPE)).token}"
        yield request


class McpBridge:
    """Request-scoped JSON-RPC client for the toolbox MCP endpoint; initialize is optional."""

    def __init__(self, credential: AsyncTokenCredential, call_id: str | None) -> None:
        headers = {"Foundry-Features": "Toolboxes=V1Preview"}
        if call_id:  # forward the caller context unchanged; never fabricate one
            headers["x-agent-foundry-call-id"] = call_id
        self._http = httpx.AsyncClient(auth=_Bearer(credential), headers=headers, timeout=60.0)
        self._next_id = 0

    async def __aenter__(self) -> McpBridge:
        return self

    async def __aexit__(self, *_exc: object) -> None:
        await self._http.aclose()

    async def rpc(self, method: str, params: dict[str, Any], target: str = "") -> dict[str, Any]:
        """One JSON-RPC call in an MCP client span that records no arguments or results."""
        self._next_id += 1
        payload = {"jsonrpc": "2.0", "id": self._next_id, "method": method, "params": params}
        name = f"{method} {target}".strip()
        with tracer.start_as_current_span(
            name, record_exception=False, set_status_on_exception=False
        ) as span:
            span.set_attribute("mcp.method.name", method)
            if method == "tools/call":
                span.set_attribute("gen_ai.tool.name", target)
            try:
                response = await self._http.post(TOOLBOX_ENDPOINT, json=payload)
                response.raise_for_status()
                body = response.json()
                if "error" in body:
                    raise _toolbox_error(body["error"])
            except Exception as exc:
                span.set_status(Status(StatusCode.ERROR))
                span.set_attribute("error.type", type(exc).__name__)
                raise
        return body.get("result") or {}


def _call_handler(toolbox: McpBridge, mcp_name: str, calls: list[ToolCall]):
    async def handler(invocation: ToolInvocation) -> ToolResult:
        arguments = invocation.arguments if isinstance(invocation.arguments, dict) else {}
        try:
            result = await toolbox.rpc("tools/call", {"name": mcp_name, "arguments": arguments}, mcp_name)
        except Exception as exc:  # report to the model; it can retry or explain
            output, outcome = str(exc), ToolResult(result_type="failure", error=str(exc))
        else:
            texts = [c.get("text", "") for c in result.get("content", []) if c.get("type") == "text"]
            output = "\n".join(t for t in texts if t) or json.dumps(result)
            failed = bool(result.get("isError"))
            outcome = ToolResult(
                text_result_for_llm=output,
                result_type="failure" if failed else "success",
                error=output if failed else None,
            )
        calls.append(ToolCall(invocation.tool_call_id, mcp_name, json.dumps(arguments), output))
        return outcome

    return handler


def toolbox_tools(toolbox: McpBridge, listed: list[dict[str, Any]], calls: list[ToolCall]) -> list[Tool]:
    """Wrap each tools/list entry as an SDK tool; MCP-sourced names look like label___tool."""
    tools: dict[str, Tool] = {}
    sources: dict[str, str] = {}
    for spec in listed:
        mcp_name = spec["name"]
        name = re.sub(r"[.-]", "_", mcp_name)  # SDK tool names reject dots and hyphens
        if name in sources:
            # Dropping one would silently change the agent's capabilities; rename a tool instead.
            raise ValueError(f"Toolbox tools {sources[name]!r} and {mcp_name!r} both map to {name!r}.")
        sources[name] = mcp_name
        tools[name] = Tool(
            name=name,
            description=spec.get("description") or mcp_name,
            parameters=spec.get("inputSchema") or {"type": "object", "properties": {}},
            handler=_call_handler(toolbox, mcp_name, calls),
        )
    return list(tools.values())


async def load_skills(toolbox: McpBridge, skills_dir: Path) -> list[str]:
    """Write each toolbox skill to <skills_dir>/<name>/SKILL.md for the SDK skill loader."""
    names: list[str] = []
    for resource in (await toolbox.rpc("resources/list", {})).get("resources", []):
        match = SKILL_URI.fullmatch(resource.get("uri", ""))
        if not match:
            continue  # skill://index.json, archives and other resources
        name = match.group(1)
        read = await toolbox.rpc("resources/read", {"uri": resource["uri"]}, name)
        body = "".join(c.get("text", "") for c in read.get("contents", []))
        if not body.lstrip().startswith("---"):
            description = json.dumps(resource.get("description") or name)
            body = f"---\nname: {name}\ndescription: {description}\n---\n\n{body}"
        (skills_dir / name).mkdir(parents=True, exist_ok=True)
        (skills_dir / name / "SKILL.md").write_text(body, encoding="utf-8")
        names.append(name)
    return names


def model_provider(credential: AsyncTokenCredential) -> ProviderConfig:
    async def refresh_token(_request: ProviderTokenArgs) -> str:
        return (await credential.get_token(SCOPE)).token

    return {
        "type": "openai",
        "base_url": MODEL_BASE_URL,
        "wire_api": "responses",
        "bearer_token_provider": refresh_token,
    }


def least_privilege(tool_names: set[str], skills_dir: Path) -> Callable[[Any, Any], Any]:
    """Approve this turn's toolbox tools and reads of its skills; reject everything else."""

    def decide(request: Any, _invocation: Any) -> Any:
        if isinstance(request, PermissionRequestCustomTool) and request.tool_name in tool_names:
            return PermissionDecisionApproveOnce()
        if isinstance(request, PermissionRequestRead):
            if Path(request.resolved_path or request.path).resolve().is_relative_to(skills_dir):
                return PermissionDecisionApproveOnce()
        return PermissionDecisionReject(feedback="Not permitted for this agent.")

    return decide


def log_event(event: Any) -> None:
    """Log safe identifiers only: never prompts, arguments, results or caller context."""
    data = event.data
    if event.type == SessionEventType.SESSION_ERROR:
        log.error(
            "session error type=%s code=%s status=%s request=%s",
            data.error_type, data.error_code, data.status_code, data.service_request_id,
        )
    elif event.type == SessionEventType.TOOL_EXECUTION_START:
        log.info("tool start %s id=%s", data.tool_name, data.tool_call_id)
    elif event.type == SessionEventType.TOOL_EXECUTION_COMPLETE:
        log.info("tool done id=%s success=%s", data.tool_call_id, data.success)


def new_client() -> CopilotClient:
    """One Copilot runtime per process."""
    options: dict[str, Any] = {}
    if not os.access(Path.home(), os.W_OK):  # session state defaults to ~/.copilot
        options["base_directory"] = str(WRITABLE / "copilot")
    if endpoint := os.getenv("COPILOT_OTLP_ENDPOINT"):
        options["telemetry"] = {
            "otlp_endpoint": endpoint,
            "otlp_protocol": "http/protobuf",
            "exporter_type": "otlp-http",
            "capture_content": False,
        }
    return CopilotClient(**options)


async def run_turn(
    client: CopilotClient, credential: AsyncTokenCredential, prompt: str, call_id: str | None = None
) -> Turn:
    """Run one request with its own toolbox connection, skills directory and session."""
    calls: list[ToolCall] = []
    headers = {"x-agent-foundry-call-id": call_id} if call_id else None
    options: dict[str, Any] = {}
    if MODEL_BASE_URL:
        options = {"provider": model_provider(credential), "model": MODEL_DEPLOYMENT}
    async with McpBridge(credential, call_id) as toolbox:
        tools = toolbox_tools(toolbox, (await toolbox.rpc("tools/list", {})).get("tools", []), calls)
        with tempfile.TemporaryDirectory(prefix="turn-", dir=WRITABLE) as workdir:
            skills_dir = Path(workdir).resolve() / "skills"
            await load_skills(toolbox, skills_dir)
            async with await client.create_session(
                **options,
                tools=tools,
                skill_directories=[str(skills_dir)],
                working_directory=workdir,
                on_permission_request=least_privilege({tool.name for tool in tools}, skills_dir),
                on_event=log_event,
            ) as session:
                try:
                    reply = await session.send_and_wait(
                        prompt, request_headers=headers, timeout=TURN_TIMEOUT
                    )
                except TimeoutError:
                    await session.abort()  # the timeout alone leaves the turn running
                    raise
    if reply is None or not reply.data.content:
        raise RuntimeError("The session ended without an assistant message.")
    return Turn(reply.data.content, calls)


async def main() -> None:
    """Local smoke run: `az login`, set TOOLBOX_ENDPOINT, optionally the model pair."""
    logging.basicConfig(level=logging.INFO)
    async with DefaultAzureCredential() as credential, new_client() as client:
        try:
            turn = await run_turn(client, credential, "Which tools and skills can you use? Be brief.")
        except ToolboxError as exc:
            if exc.consent_url is None:
                raise
            print(exc)
            return
        for call in turn.tool_calls:
            print(f"tool {call.name}: {len(call.output)} chars")
        print(turn.text)


if __name__ == "__main__":
    asyncio.run(main())
