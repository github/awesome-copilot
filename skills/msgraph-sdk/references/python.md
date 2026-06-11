# Microsoft Graph SDK for Python

Use this reference when the target project is written in Python.

## Authoritative sources

- SDK repository: <https://github.com/microsoftgraph/msgraph-sdk-python>
- Samples: <https://github.com/microsoftgraph/msgraph-training-python>
- SDK changelog: <https://github.com/microsoftgraph/msgraph-sdk-python/blob/main/CHANGELOG.md>

## Packages

```bash
pip install msgraph-sdk azure-identity
```

Or in `requirements.txt` / `pyproject.toml`:

```
msgraph-sdk>=1.0.0
azure-identity>=1.15.0
```

## Client setup

### Managed Identity (Azure-hosted apps — preferred)

```python
from azure.identity.aio import DefaultAzureCredential
from msgraph import GraphServiceClient

credential = DefaultAzureCredential()
graph_client = GraphServiceClient(credential)
```

The Python SDK is async-first (`asyncio`). Use `azure.identity.aio` (async variants), not `azure.identity`.

### Client credentials (app-only / daemon)

```python
import os
from azure.identity.aio import ClientSecretCredential
from msgraph import GraphServiceClient

credential = ClientSecretCredential(
    tenant_id=os.environ["AZURE_TENANT_ID"],
    client_id=os.environ["AZURE_CLIENT_ID"],
    client_secret=os.environ["AZURE_CLIENT_SECRET"],
)

graph_client = GraphServiceClient(credential)
```

Prefer `CertificateCredential` over `ClientSecretCredential` in production.

### On-Behalf-Of (OBO) — agent / API acting as the signed-in user

```python
from azure.identity.aio import OnBehalfOfCredential

# incoming_token is the bearer token from the caller
credential = OnBehalfOfCredential(
    tenant_id=os.environ["AZURE_TENANT_ID"],
    client_id=os.environ["AZURE_CLIENT_ID"],
    client_secret=os.environ["AZURE_CLIENT_SECRET"],
    user_assertion=incoming_token,
)

graph_client = GraphServiceClient(credential)
```

Construct a new `GraphServiceClient` per request for OBO — the credential is user-scoped.

### Device code (CLI / local dev)

```python
from azure.identity.aio import DeviceCodeCredential

credential = DeviceCodeCredential(
    client_id=os.environ["AZURE_CLIENT_ID"],
    tenant_id=os.environ["AZURE_TENANT_ID"],
)
graph_client = GraphServiceClient(credential, scopes=["User.Read", "Mail.Read"])
```

## Common call patterns

All Graph SDK calls in Python are async. Always run inside an async context.

### Get a resource with field selection

```python
import asyncio
from msgraph.generated.me.me_request_builder import MeRequestBuilder
from kiota_abstractions.base_request_configuration import RequestConfiguration

async def get_my_profile():
    query_params = MeRequestBuilder.MeRequestBuilderGetQueryParameters(
        select=["displayName", "mail", "jobTitle"]
    )
    config = RequestConfiguration(query_parameters=query_params)
    user = await graph_client.me.get(request_configuration=config)
    return user

asyncio.run(get_my_profile())
```

### List messages with filter and select

```python
from msgraph.generated.me.messages.messages_request_builder import MessagesRequestBuilder

async def get_unread_messages():
    query_params = MessagesRequestBuilder.MessagesRequestBuilderGetQueryParameters(
        filter="isRead eq false",
        select=["subject", "from", "receivedDateTime"],
        top=25,
        orderby=["receivedDateTime desc"],
    )
    config = RequestConfiguration(query_parameters=query_params)
    result = await graph_client.me.messages.get(request_configuration=config)
    return result
```

### Pagination with PageIterator

```python
from msgraph.generated.models.message import Message
from msgraph.core import PageIterator

async def get_all_messages():
    first_page = await graph_client.me.messages.get()
    all_messages: list[Message] = []

    async def process_message(message: Message) -> bool:
        all_messages.append(message)
        return True  # return False to stop early

    page_iterator = PageIterator(
        response=first_page,
        request_adapter=graph_client.request_adapter,
        constructor=Message,
    )
    await page_iterator.iterate(callback=process_message)
    return all_messages
```

### Send an email

```python
from msgraph.generated.models.message import Message
from msgraph.generated.models.item_body import ItemBody
from msgraph.generated.models.body_type import BodyType
from msgraph.generated.models.recipient import Recipient
from msgraph.generated.models.email_address import EmailAddress
from msgraph.generated.me.send_mail.send_mail_post_request_body import SendMailPostRequestBody

async def send_email():
    body = SendMailPostRequestBody(
        message=Message(
            subject="Hello from Graph",
            body=ItemBody(content_type=BodyType.Text, content="Test message"),
            to_recipients=[
                Recipient(email_address=EmailAddress(address="user@contoso.com"))
            ],
        )
    )
    await graph_client.me.send_mail.post(body)
```

### Post a Teams channel message

```python
from msgraph.generated.models.chat_message import ChatMessage
from msgraph.generated.models.item_body import ItemBody
from msgraph.generated.models.body_type import BodyType

async def post_channel_message(team_id: str, channel_id: str):
    message = ChatMessage(
        body=ItemBody(content_type=BodyType.Html, content="<b>Hello from Graph!</b>")
    )
    await graph_client.teams.by_team_id(team_id).channels.by_channel_id(channel_id).messages.post(message)
```

## Batch requests

```python
from kiota_http.middleware.options import ResponseHandlerOption
import json

async def batch_example():
    batch_body = {
        "requests": [
            {"id": "1", "method": "GET", "url": "/me"},
            {"id": "2", "method": "GET", "url": "/me/messages?$top=5&$select=subject"},
        ]
    }
    # Use the raw HTTP client for batch
    response = await graph_client.request_adapter.send_primitive_async(
        # Alternatively, use the requests library with a token from the credential
    )
```

For batch in Python, it's often simpler to use `httpx` with an acquired token when the batch helper is not yet fully supported:

```python
import httpx
from azure.identity.aio import ClientSecretCredential

async def batch_with_httpx(credential):
    token = await credential.get_token("https://graph.microsoft.com/.default")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://graph.microsoft.com/v1.0/$batch",
            headers={"Authorization": f"Bearer {token.token}"},
            json={
                "requests": [
                    {"id": "1", "method": "GET", "url": "/me"},
                    {"id": "2", "method": "GET", "url": "/me/messages?$top=5"},
                ]
            },
        )
    return response.json()
```

## Delta queries

```python
async def delta_sync(stored_delta_link: str | None = None):
    if stored_delta_link:
        # Use delta link directly
        response = await graph_client.request_adapter.send_async(...)
    else:
        response = await graph_client.users.delta.get()

    users = []
    async def collect(user):
        users.append(user)
        return True

    page_iterator = PageIterator(response=response, request_adapter=graph_client.request_adapter, constructor=...)
    await page_iterator.iterate(callback=collect)

    delta_link = page_iterator.delta_link  # store this for next run
    return users, delta_link
```

## Throttling / retry

The SDK's HTTP transport handles 429 retry automatically when using the default `GraphClientFactory`. For explicit control:

```python
import asyncio
import httpx

async def call_with_retry(graph_client, call_fn, max_retries=5):
    for attempt in range(max_retries):
        try:
            return await call_fn()
        except Exception as e:
            if "429" in str(e):
                retry_after = int(getattr(e, "retry_after", 10))
                await asyncio.sleep(retry_after)
            else:
                raise
```

## Python-specific guidance

- The Python Graph SDK is **async-first** — use `asyncio.run()` or an async framework (FastAPI, aiohttp).
- Always use `azure.identity.aio` (not `azure.identity`) for async contexts.
- Close credentials when done: `await credential.close()` or use as async context managers.
- Python SDK model classes use `snake_case` for properties (Graph JSON uses `camelCase` — the SDK maps automatically).
- Use `asyncio.gather()` for concurrent but independent Graph calls (mind throttling limits).
- For FastAPI: use lifespan events to init `GraphServiceClient` once and close the credential on shutdown.

```python
# FastAPI integration example
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    credential = DefaultAzureCredential()
    app.state.graph_client = GraphServiceClient(credential)
    yield
    await credential.close()

app = FastAPI(lifespan=lifespan)
```
