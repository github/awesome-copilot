# teams-python

## purpose

Microsoft Teams SDK for Python patterns — translating TypeScript Teams AI concepts to Python equivalents using `microsoft_teams`.

## rules

1. Install the Teams Python SDK packages: `pip install microsoft-teams-apps microsoft-teams-ai microsoft-teams-openai`. The SDK is modular — `microsoft_teams.apps` for the App framework, `microsoft_teams.ai` for AI/prompts, `microsoft_teams.openai` for OpenAI model integration. [github.com/nicekid1/Microsoft-Teams.ts](https://github.com/nicekid1/Microsoft-Teams.ts)
2. Initialize the App with `App(client_id=..., client_secret=...)` or let it read from `CLIENT_ID` and `CLIENT_SECRET` environment variables. The App class is in `microsoft_teams.apps`. This replaces the TS `Application` class setup. [teams.py source: app.py]
3. Register activity handlers using Python decorators: `@app.on_message`, `@app.on_message_pattern(r"regex")`, `@app.on_conversation_update`, `@app.on_adaptive_card_action`, `@app.on_typing`, `@app.on_message_reaction`. This replaces the TS `app.message()`, `app.activity()` method-call patterns. [teams.py source: activity_handlers.py]
4. All handlers are `async def` and receive an `ActivityContext[T]` parameter, where `T` is the specific activity type (e.g., `MessageActivity`, `ConversationUpdateActivity`). This replaces the TS `TurnContext` pattern. [teams.py source: activity_context.py]
5. Use `await ctx.send(message)` to send a message and `await ctx.reply(message)` to reply in a thread. The `send` method accepts strings, `ActivityParams`, or `AdaptiveCard` objects. This replaces the TS `context.sendActivity()` pattern. [teams.py source: activity_context.py]
6. The App uses **FastAPI** internally (via `HttpPlugin`) with **uvicorn** as the ASGI server. Start with `asyncio.run(app.start(port=3978))`. Default endpoint is `POST /api/messages`. This replaces the TS Express-based setup. [teams.py source: http_plugin.py]
7. For AI integration, create a `ChatPrompt` with an AI model and call `await prompt.send(input, instructions=...)`. The model is typically `OpenAICompletionsAIModel` or `OpenAIResponsesAIModel` from `microsoft_teams.openai`. This replaces the TS `ChatPrompt` / `OpenAIModel` classes. [teams.py source: chat_prompt.py]
8. Define AI functions using `Function[ParamsType]` with **Pydantic models** for parameter schemas. The handler can be sync or async and returns a string. This replaces the TS function-calling pattern with its TypeScript interfaces. [teams.py source: function.py]
9. Access Microsoft Graph via `ctx.user_graph` (user-delegated) or `ctx.app_graph` (app-only). Check `ctx.is_signed_in` before using user Graph. Initiate sign-in with `await ctx.sign_in(SignInOptions(...))`. This replaces the TS `context.graph` patterns. [teams.py source: activity_context.py]
10. Use `ListMemory` from `microsoft_teams.ai` for conversation history in AI prompts. Pass it to `ChatPrompt(model=model, memory=memory)`. Supports `push`, `get_all`, and `set_all` operations. This replaces the TS `MemoryStorage` pattern. [teams.py source: memory.py]
11. Add custom HTTP routes using `@app.http.get("/path")` or `@app.http.post("/path")` — these are FastAPI route decorators exposed through the HttpPlugin. This replaces TS custom Express routes. [teams.py source: http_plugin.py]
12. Use Pydantic `BaseModel` subclasses for typed data throughout (function parameters, API models, card data). This replaces TypeScript interfaces and type definitions. [teams.py patterns]
13. The SDK requires **Python 3.12+** and uses modern Python features (type hints, dataclasses, protocols, `async`/`await`). [teams.py pyproject.toml]

## patterns

### Basic echo bot

```python
import asyncio
from microsoft_teams.apps import App, ActivityContext
from microsoft_teams.api import MessageActivity

app = App()

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    await ctx.reply(f"Echo: {ctx.activity.text}")

if __name__ == "__main__":
    asyncio.run(app.start(port=3978))
```

### AI bot with function calling

```python
import asyncio
from microsoft_teams.apps import App, ActivityContext
from microsoft_teams.api import MessageActivity
from microsoft_teams.ai import ChatPrompt, Function, ListMemory
from microsoft_teams.openai import OpenAICompletionsAIModel
from pydantic import BaseModel

app = App()
model = OpenAICompletionsAIModel(model="gpt-4")
memory = ListMemory()

class SearchParams(BaseModel):
    query: str
    """The search query"""

async def search_handler(params: SearchParams) -> str:
    return f"Results for: {params.query}"

@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]):
    prompt = ChatPrompt(model=model, memory=memory)
    prompt.with_function(Function[SearchParams](
        name="search",
        description="Search for information",
        parameter_schema=SearchParams,
        handler=search_handler,
    ))

    result = await prompt.send(
        input=ctx.activity.text,
        instructions="You are a helpful assistant.",
    )

    if result.response.content:
        await ctx.send(result.response.content)

if __name__ == "__main__":
    asyncio.run(app.start(port=3978))
```

### Adaptive Card handling

```python
import asyncio
from microsoft_teams.apps import App, ActivityContext
from microsoft_teams.api import MessageActivity, MessageSubmitActionInvokeActivity

app = App()

@app.on_message_pattern(r"^card$")
async def send_card(ctx: ActivityContext[MessageActivity]):
    from microsoft_teams.cards import AdaptiveCard
    card = AdaptiveCard()
    card.add_text_block("Feedback Form")
    card.add_text_input("feedback", placeholder="Your feedback")
    card.add_submit_action("Submit")
    await ctx.send(card)

@app.on_message_submit_action
async def handle_card_action(ctx: ActivityContext[MessageSubmitActionInvokeActivity]):
    data = ctx.activity.value
    await ctx.reply(f"Got feedback: {data}")

if __name__ == "__main__":
    asyncio.run(app.start(port=3978))
```

## pitfalls

- **Python 3.12+ required**: The Teams Python SDK uses modern Python features that require 3.12 or later. Earlier versions will fail at import time.
- **All handlers are async**: Unlike Slack Bolt Python which supports sync handlers, Teams Python SDK handlers must all be `async def`. Forgetting `async` or `await` causes runtime errors.
- **Package naming**: Import from `microsoft_teams.apps`, `microsoft_teams.ai`, etc. — not `teams_ai` or `botbuilder`. The namespace is `microsoft_teams`.
- **Port 3978 vs 3000**: Teams SDK defaults to port 3978 (Teams convention), not 3000 (Slack convention). When running both in one process, configure different ports.
- **No sync adapter**: Unlike Slack Bolt which has both sync and async paths, Teams Python SDK is async-only with FastAPI. No Flask adapter exists.

## references

- https://github.com/nicekid1/Microsoft-Teams.ts (Python SDK repo)
- teams.py source: packages/apps/src/microsoft_teams/apps/
- teams.py source: packages/ai/src/microsoft_teams/ai/
- teams.py source: packages/openai/src/microsoft_teams/openai/

## instructions

This expert covers the Microsoft Teams SDK for Python — the Python equivalent of `@microsoft/teams-ai`. Use it when building Teams bots in Python (Tier 2 or standalone), translating TypeScript Teams AI patterns to Python, or setting up the FastAPI-based Teams bot server. All TS Teams experts provide the architectural patterns — this expert provides the Python API mappings.

Pair with: Teams TS experts (conceptual architecture — translate to Python). `bridge/python-cross-platform.md` for unified Python server with both Slack and Teams. `slack/bolt-python.md` for the Slack side of a Python dual-platform bot.

## research

Deep Research prompt:

"Write a micro expert mapping Microsoft Teams AI TypeScript patterns to Python equivalents using the microsoft_teams SDK. Cover App initialization (client_id, client_secret, env vars), decorator-based activity routing (@app.on_message, @app.on_message_pattern, @app.on_adaptive_card_action), ActivityContext[T] parameter (send, reply, stream, sign_in, is_signed_in, user_graph), ChatPrompt with OpenAICompletionsAIModel, Function[Params] with Pydantic BaseModel schemas, ListMemory for conversation history, FastAPI/uvicorn web framework, Adaptive Cards (AdaptiveCard class), custom HTTP routes via app.http, and key differences from TS (async-only, Pydantic vs interfaces, Python 3.12+). Source from teams.py packages source code."
