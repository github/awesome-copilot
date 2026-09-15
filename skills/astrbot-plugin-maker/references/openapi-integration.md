# AstrBot HTTP API integration

Read this only for a caller that needs HTTP access to an AstrBot server. A normal
in-process plugin uses `Context` and `AstrMessageEvent` directly.

## Choose a version-specific contract

API-key HTTP access was introduced in v4.18.0. See [sources](sources.md) for pinned
v4.28.0 evidence and known documentation differences. The server's own
`/api/v1/openapi.json` and `/api/v1/docs` are preferable to assuming the public
docs match an older installation.

Keep the server origin configurable (local default `http://localhost:6185`).
Keys can be sent as `X-API-Key` or `Authorization: Bearer`; use one scheme
consistently. Load the key from user configuration/environment. A WebUI login
session and a scoped API key have different authorization behavior.

| v4.28.0 canonical operation | Key scope | Response/important input |
| --- | --- | --- |
| `GET /api/v1/im/bots` | `im` | JSON envelope; `data.bot_ids` is a string list |
| `POST /api/v1/im/messages` | `im` | Supply `umo` and `message`; singular `/im/message` is an alias |
| `POST /api/v1/chat` | `chat` | API-key calls need `username`; SSE stream |
| `GET /api/v1/chat/sessions` | `chat` | API-key calls need a `username` query parameter |
| `GET /api/v1/chat/configs` | `chat` | Available configurations for chat |
| `POST /api/v1/files` | `file` | Multipart upload; `/api/v1/file` also exists |
| `GET /api/v1/file?attachment_id=...` | `file` | File bytes or an error response |

This is a small routing aid, not a complete API catalog. For additional endpoints,
read their operation/schema and scope. Never infer pluralization, request bodies,
or response types from a neighboring endpoint.

## Parsing and errors

- `401`: missing/invalid credential. `403`: insufficient scope or another
  authorization condition; tell the user which operation needs which scope.
- Check HTTP status before success parsing. A JSON `status: "error"` envelope
  must also fail even if the transport returned HTTP 200.
- For `/im/bots`, validate `data.bot_ids`; do not require every endpoint's `data`
  to have that shape or even to be a dictionary.
- Chat is `text/event-stream`: consume complete SSE events, handle stream errors
  and cancellation, and inspect the event payload contract for that version.
  Do not call `response.json()` on a successful chat stream.
- Downloads return bytes. Verify status/content type instead of decoding them as
  JSON. Uploads require the actual multipart field names from the target schema.
- Set explicit timeouts, close clients/streams, and surface failures without
  echoing credentials or full response bodies. Do not blindly retry sends/uploads
  after a timeout; the remote operation may have completed.

## Reusable client and tests

The [client template](../assets/openapi_client.py.template) implements only the
read-only bot-ID endpoint. It accepts an owned `httpx.AsyncClient`, sends the key,
checks auth/HTTP/envelope errors, and validates the real endpoint-specific shape.
Use `--with-openapi` with the scaffold generator to include it and
[transport tests](../assets/test_openapi_auth_and_shape.py.template).

Wire the client into the requested handler only when needed; add configurable
origin/key fields, resource cleanup, and a useful user-facing error path. The
example greeting does not call it automatically.

Tests use `httpx.MockTransport` and exercise the production function. They check
the request URL/header, success, 401/403, bad JSON/data, missing keys, server errors,
and timeout propagation. For other endpoints, add tests of their real request and
response contracts, including SSE chunks when relevant. Do not define a substitute
parser or raise the expected exception directly inside the test.
