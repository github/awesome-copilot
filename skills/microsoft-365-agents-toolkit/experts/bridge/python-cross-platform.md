# python-cross-platform

## purpose

Unified Python server architecture for dual-platform Slack + Teams bots — combining `slack_bolt` and `microsoft_teams` in a single Python codebase.

## rules

1. Use **FastAPI** as the shared web framework. The Teams Python SDK uses FastAPI internally, and Slack Bolt has an `AsyncSlackRequestHandler` adapter for FastAPI. Both SDKs can share one FastAPI app and one process. [slack_bolt.adapter.fastapi, microsoft_teams.apps]
2. Mount the Slack handler at `/slack/events` and let the Teams SDK handle `/api/messages` (its default). Both endpoints run in the same FastAPI process, each routing to its own SDK. [FastAPI route mounting]
3. Use `AsyncApp` (not sync `App`) for Slack Bolt when combining with Teams, since the Teams SDK is async-only. Mixing sync Slack Bolt with async Teams SDK in one process causes event loop conflicts. [slack_bolt.async_app]
4. Build a **shared service layer** between platforms. Platform handlers call the same business logic — the Slack handler converts Slack payloads to service calls, and the Teams handler converts Teams activities to the same service calls. This mirrors the TS cross-platform architecture pattern. [experts/bridge/cross-platform-architecture-ts.md]
5. For AI features, use a single model client shared between platforms. Both `slack_bolt` handlers and `microsoft_teams` handlers can call the same OpenAI/Azure OpenAI client. Do not duplicate model initialization per platform. [shared service pattern]
6. Handle platform-specific UI by converting between Block Kit (Slack) and Adaptive Cards (Teams) at the adapter layer. The service layer returns platform-agnostic data; each platform adapter formats it for its UI framework. [experts/bridge/block-kit-to-adaptive-cards-ts.md concepts]
7. Use a single `.env` file for both platforms' credentials: `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_APP_TOKEN` (if Socket Mode) for Slack; `CLIENT_ID`, `CLIENT_SECRET` for Teams. Load with `python-dotenv`. [environment config]
8. For local development, use Slack Socket Mode (no public URL needed) alongside the Teams SDK's HTTP endpoint. The Slack `SocketModeHandler` runs in a background thread while FastAPI serves Teams on a port. [slack_bolt.adapter.socket_mode]
9. Store user identity mappings between platforms. A Slack user ID (`U...`) and a Teams user AAD object ID are different identifiers for the same person. Build a mapping table keyed by email or employee ID. [experts/bridge/identity-linking-ts.md concepts]
10. Deploy as a single container or process. Both SDKs share the Python runtime, dependencies, and service layer. Use `uvicorn` to run the FastAPI app, with Slack Socket Mode starting as a background task if needed. [deployment pattern]

## patterns

### Unified FastAPI server with both SDKs

```python
import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from slack_bolt.async_app import AsyncApp
from slack_bolt.adapter.fastapi import AsyncSlackRequestHandler
from microsoft_teams.apps import App as TeamsApp, ActivityContext
from microsoft_teams.api import MessageActivity

# --- Shared service layer ---
async def handle_greeting(user_name: str) -> str:
    return f"Hello, {user_name}! How can I help?"

async def handle_status_request() -> dict:
    return {"api": "healthy", "db": "healthy", "queue": "degraded"}

# --- Slack setup ---
slack_app = AsyncApp(
    token=os.environ["SLACK_BOT_TOKEN"],
    signing_secret=os.environ["SLACK_SIGNING_SECRET"],
)

@slack_app.message("hello")
async def slack_hello(message, say):
    result = await handle_greeting(f"<@{message['user']}>")
    await say(result)

@slack_app.command("/status")
async def slack_status(ack, respond):
    await ack("Checking...")
    status = await handle_status_request()
    await respond(
        f"API: {status['api']} | DB: {status['db']} | Queue: {status['queue']}"
    )

slack_handler = AsyncSlackRequestHandler(slack_app)

# --- Teams setup ---
teams_app = TeamsApp(
    client_id=os.environ.get("CLIENT_ID"),
    client_secret=os.environ.get("CLIENT_SECRET"),
)

@teams_app.on_message_pattern(r"^hello")
async def teams_hello(ctx: ActivityContext[MessageActivity]):
    user_name = ctx.activity.from_property.name or "there"
    result = await handle_greeting(user_name)
    await ctx.send(result)

@teams_app.on_message_pattern(r"^status$")
async def teams_status(ctx: ActivityContext[MessageActivity]):
    status = await handle_status_request()
    await ctx.send(
        f"API: {status['api']} | DB: {status['db']} | Queue: {status['queue']}"
    )

# --- FastAPI combines both ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start Teams SDK in background
    asyncio.create_task(teams_app.start(port=None))
    yield

fastapi_app = FastAPI(lifespan=lifespan)

@fastapi_app.post("/slack/events")
async def slack_events(req: Request):
    return await slack_handler.handle(req)

# Teams registers its own /api/messages route via HttpPlugin
# Mount Teams routes into the shared FastAPI app
fastapi_app.mount("/", teams_app.http.app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(fastapi_app, host="0.0.0.0", port=3000)
```

### Platform adapter pattern for UI conversion

```python
from dataclasses import dataclass
from typing import Any

@dataclass
class StatusCard:
    """Platform-agnostic data structure"""
    title: str
    fields: dict[str, str]
    action_label: str

def to_slack_blocks(card: StatusCard) -> list[dict[str, Any]]:
    """Convert to Slack Block Kit"""
    fields = [
        {"type": "mrkdwn", "text": f"*{k}:* {v}"}
        for k, v in card.fields.items()
    ]
    return [
        {"type": "section", "text": {"type": "mrkdwn", "text": f"*{card.title}*"}},
        {"type": "section", "fields": fields},
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": card.action_label},
                    "action_id": "refresh_status",
                }
            ],
        },
    ]

def to_adaptive_card(card: StatusCard) -> dict[str, Any]:
    """Convert to Teams Adaptive Card"""
    facts = [{"title": k, "value": v} for k, v in card.fields.items()]
    return {
        "type": "AdaptiveCard",
        "version": "1.4",
        "body": [
            {"type": "TextBlock", "text": card.title, "weight": "Bolder"},
            {"type": "FactSet", "facts": facts},
        ],
        "actions": [
            {"type": "Action.Submit", "title": card.action_label}
        ],
    }
```

## pitfalls

- **Event loop conflicts**: Mixing sync Slack `App` with async Teams SDK causes `RuntimeError: This event loop is already running`. Always use `AsyncApp` for Slack when combining with Teams.
- **Port collision**: Both SDKs default to different ports (Slack: 3000, Teams: 3978). When combining, use one port for the shared FastAPI app and configure both SDKs to use it.
- **Double handling**: If both Slack and Teams are mounted on the same FastAPI app, ensure routes don't overlap. Slack uses `/slack/events`, Teams uses `/api/messages` — keep them separate.
- **Python version**: The Teams Python SDK requires **Python 3.12+**. Slack Bolt supports 3.9+. The combined project must use 3.12+ to satisfy both.
- **Credential isolation**: Never mix Slack tokens with Teams credentials. Use clear env var prefixes (`SLACK_*` for Slack, `CLIENT_*` / `AZURE_*` for Teams) to avoid accidental cross-contamination.
- **No Python-specific TS experts**: All architecture and bridging experts (`cross-platform-architecture-ts.md`, `block-kit-to-adaptive-cards-ts.md`, etc.) contain TypeScript code. Use them for design patterns but translate all code to Python.

## references

- https://slack.dev/bolt-python/concepts
- https://slack.dev/bolt-python/concepts/adapters
- teams.py source: packages/apps/src/microsoft_teams/apps/
- experts/bridge/cross-platform-architecture-ts.md (patterns to adapt)
- experts/bridge/block-kit-to-adaptive-cards-ts.md (UI conversion concepts)

## instructions

This expert covers the unified Python server architecture for Tier 2 dual-platform bots. Use it when building a Python bot that serves both Slack and Teams from a single codebase. It covers the FastAPI integration pattern, shared service layer, platform adapters, and deployment model.

Pair with: `slack/bolt-python.md` for Slack-side Python SDK details. `teams/teams-python.md` for Teams-side Python SDK details. `bridge/cross-platform-architecture-ts.md` for architectural patterns (translate to Python). `bridge/block-kit-to-adaptive-cards-ts.md` for UI conversion concepts (translate to Python). `bridge/identity-linking-ts.md` for user mapping concepts.

## research

Deep Research prompt:

"Write a micro expert on building a unified Python server that combines Slack Bolt (slack_bolt AsyncApp) and Microsoft Teams SDK (microsoft_teams) in a single FastAPI application. Cover FastAPI route mounting (/slack/events for Slack, /api/messages for Teams), shared service layer pattern, platform adapter pattern for Block Kit vs Adaptive Cards, environment configuration for both platforms, Socket Mode for local dev alongside HTTP for Teams, async-only requirement, Python 3.12+ version constraint, deployment as single container, and identity mapping between Slack user IDs and Teams AAD object IDs. Source from slack_bolt adapter.fastapi, microsoft_teams.apps HttpPlugin, and cross-platform architecture patterns."
