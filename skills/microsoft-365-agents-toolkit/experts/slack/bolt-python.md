# bolt-python

## purpose

Slack Bolt for Python SDK patterns — translating TypeScript Bolt concepts to Python equivalents using `slack_bolt`.

## rules

1. Import the sync App from `slack_bolt` or the async App from `slack_bolt.async_app`. Use `AsyncApp` for FastAPI or any async framework; use sync `App` for Flask or Django. [slack.dev/bolt-python/concepts](https://slack.dev/bolt-python/concepts)
2. Initialize the App with `token` and `signing_secret`, or let Bolt auto-load from `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` environment variables. Unlike TS Bolt, Python Bolt reads env vars automatically when no args are passed. [slack.dev/bolt-python/tutorial/getting-started](https://slack.dev/bolt-python/tutorial/getting-started)
3. Register listeners using decorator syntax: `@app.message("pattern")`, `@app.command("/cmd")`, `@app.action("action_id")`, `@app.shortcut("callback_id")`, `@app.view("callback_id")`, `@app.event("event_type")`, `@app.options("action_id")`. This replaces the TS method-call pattern. [slack.dev/bolt-python/concepts](https://slack.dev/bolt-python/concepts)
4. Python Bolt uses **argument injection** — handlers declare only the parameters they need (`ack`, `say`, `respond`, `client`, `body`, `event`, `command`, `action`, `shortcut`, `view`, `context`, `logger`). Bolt inspects the function signature and injects matching values. This replaces the TS destructured context object. [slack.dev/bolt-python/concepts/listener-functions](https://slack.dev/bolt-python/concepts/listener-functions)
5. Use `ack()` the same way as TS. For view submissions, pass `response_action="errors"` and `errors={"block_id": "message"}` as keyword arguments instead of the TS object form `ack({ response_action: 'errors', errors })`. [slack.dev/bolt-python/concepts/acknowledge](https://slack.dev/bolt-python/concepts/acknowledge)
6. Use `client` (a `WebClient` instance from `slack_sdk`) for API calls. Method names use **snake_case**: `client.chat_postMessage()`, `client.views_open()`, `client.users_info()`, `client.files_upload_v2()`. This maps directly from the TS camelCase equivalents. [slack.dev/python-slack-sdk/web](https://slack.dev/python-slack-sdk/web)
7. Pass keyword arguments to API methods, not request configurators. TS uses `client.chat.postMessage({ channel, text })`. Python uses `client.chat_postMessage(channel=channel, text=text)`. No nested method namespaces — methods are flat on the client. [slack.dev/python-slack-sdk/web](https://slack.dev/python-slack-sdk/web)
8. For Socket Mode, use `SocketModeHandler` from `slack_bolt.adapter.socket_mode`. Pass the `App` and `app_token`. Call `handler.start()` to block. This replaces the TS `socketMode: true` constructor option. [slack.dev/bolt-python/concepts/socket-mode](https://slack.dev/bolt-python/concepts/socket-mode)
9. For Flask, wrap the App with `SlackRequestHandler` from `slack_bolt.adapter.flask`. For FastAPI, use `AsyncSlackRequestHandler` from `slack_bolt.adapter.fastapi` with `AsyncApp`. Django, Bottle, Sanic, Tornado, Starlette, and ASGI adapters also exist. [slack.dev/bolt-python/concepts/adapters](https://slack.dev/bolt-python/concepts/adapters)
10. Use regex patterns with `re.compile()`: `@app.message(re.compile(r"^hello"))`. Same capability as TS RegExp patterns but uses Python's `re` module. [slack.dev/bolt-python/concepts/message-listening](https://slack.dev/bolt-python/concepts/message-listening)
11. Access event data through the injected `event` or `body` dict — these are plain Python dicts, not typed objects. Use `event["user"]`, `body["trigger_id"]`, `view["state"]["values"]`. No TypeScript interfaces — rely on Slack API documentation for field shapes. [api.slack.com/events](https://api.slack.com/events)
12. For middleware, use `@app.middleware` decorator or pass `middleware=[fn]` to individual listeners. Middleware functions receive injected args including `next` (or `next_` to avoid shadowing the builtin). Call `next()` to continue the chain. [slack.dev/bolt-python/concepts/middleware](https://slack.dev/bolt-python/concepts/middleware)
13. Both sync and async Apps support the same listener types. Async handlers must use `async def` and `await` all utility calls (`await ack()`, `await say()`, `await client.chat_postMessage()`). Sync handlers use regular `def` and direct calls. [slack.dev/bolt-python/concepts/async](https://slack.dev/bolt-python/concepts/async)

## patterns

### Basic app with message, command, and action handlers

```python
import os
import re
from slack_bolt import App

app = App(
    token=os.environ["SLACK_BOT_TOKEN"],
    signing_secret=os.environ["SLACK_SIGNING_SECRET"],
)

@app.message(re.compile(r"^hello"))
def handle_hello(message, say):
    say(f"Hey <@{message['user']}>!")

@app.command("/status")
def handle_status(ack, command, respond):
    ack("Checking status...")
    status = get_system_status()
    respond(response_type="in_channel", text=f"Status: {status}")

@app.action("approve_button")
def handle_approve(ack, body, client):
    ack()
    client.chat_update(
        channel=body["channel"]["id"],
        ts=body["message"]["ts"],
        text=f"Approved by <@{body['user']['id']}>",
    )

if __name__ == "__main__":
    app.start(port=3000)
```

### Async app with FastAPI

```python
import os
from slack_bolt.async_app import AsyncApp
from slack_bolt.adapter.fastapi import AsyncSlackRequestHandler
from fastapi import FastAPI, Request

app = AsyncApp(
    token=os.environ["SLACK_BOT_TOKEN"],
    signing_secret=os.environ["SLACK_SIGNING_SECRET"],
)

@app.command("/ticket")
async def handle_ticket(ack, command, client):
    await ack()
    await client.views_open(
        trigger_id=command["trigger_id"],
        view={
            "type": "modal",
            "callback_id": "ticket_modal",
            "title": {"type": "plain_text", "text": "Create Ticket"},
            "submit": {"type": "plain_text", "text": "Create"},
            "blocks": [
                {
                    "type": "input",
                    "block_id": "title_block",
                    "label": {"type": "plain_text", "text": "Title"},
                    "element": {
                        "type": "plain_text_input",
                        "action_id": "title_input",
                    },
                }
            ],
        },
    )

@app.view("ticket_modal")
async def handle_submission(ack, view, client):
    title = view["state"]["values"]["title_block"]["title_input"]["value"]
    if len(title) < 3:
        await ack(response_action="errors", errors={"title_block": "Too short"})
        return
    await ack()

fastapi_app = FastAPI()
handler = AsyncSlackRequestHandler(app)

@fastapi_app.post("/slack/events")
async def slack_events(req: Request):
    return await handler.handle(req)
```

### Socket Mode

```python
import os
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

app = App(token=os.environ["SLACK_BOT_TOKEN"])

@app.event("app_mention")
def handle_mention(event, say):
    say(f"You mentioned me! <@{event['user']}>")

if __name__ == "__main__":
    handler = SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"])
    handler.start()
```

## pitfalls

- **Using `next` instead of `next_` in middleware**: `next` shadows Python's builtin. Use `next_` as the parameter name to avoid confusion. Both work for injection.
- **Forgetting `await` in async handlers**: Unlike sync App where `say("text")` works directly, async App requires `await say("text")`. Missing `await` silently drops the call.
- **Dict access vs typed objects**: Python payloads are plain dicts. `event["user"]` not `event.user`. KeyError on missing fields — use `.get("key")` for optional fields.
- **Method name casing**: Python SDK uses `snake_case` for API methods (`chat_postMessage` not `chatPostMessage`, `views_open` not `viewsOpen`). The TS camelCase habit causes `AttributeError`.
- **Flask vs FastAPI mismatch**: Using sync `App` with FastAPI's async handler or `AsyncApp` with Flask causes runtime errors. Match sync/async consistently.

## references

- https://slack.dev/bolt-python/concepts
- https://slack.dev/bolt-python/tutorial/getting-started
- https://slack.dev/python-slack-sdk/web
- https://github.com/slackapi/bolt-python

## instructions

This expert covers Slack Bolt for Python — the Python equivalent of `@slack/bolt`. Use it when building Slack apps in Python (Tier 2 or standalone), translating TypeScript Bolt patterns to Python, or setting up Python web framework adapters (Flask, FastAPI, Django). All TS Bolt experts (`runtime.bolt-foundations-ts.md`, `runtime.ack-rules-ts.md`, etc.) provide the architectural patterns — this expert provides the Python API mappings.

Pair with: `runtime.bolt-foundations-ts.md` for conceptual architecture (translate to Python). `bolt-oauth-distribution-ts.md` for OAuth concepts (translate to Python). `bridge/python-cross-platform.md` for unified Python server with both Slack and Teams.

## research

Deep Research prompt:

"Write a micro expert mapping Slack Bolt TypeScript patterns to Python equivalents using slack_bolt. Cover App initialization (sync vs async), decorator-based listener registration (@app.message, @app.command, @app.action, @app.shortcut, @app.view, @app.event), argument injection (ack, say, respond, client, body, context, logger), WebClient snake_case methods (chat_postMessage, views_open), Socket Mode setup (SocketModeHandler), web framework adapters (Flask SlackRequestHandler, FastAPI AsyncSlackRequestHandler), middleware patterns, regex matching with re.compile(), and key differences from TS (dict access, no types, sync/async split). Source from bolt-python source code and slack.dev docs."
