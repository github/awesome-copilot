# Streamable HTTP Servers

Use this transport only for a remote server. A local server uses stdio.

## Run the server

Replace `mcp.run()` in `server.py`:

```python
import os

if __name__ == "__main__":
    mcp.run(
        transport="streamable-http",
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "8000")),
    )
```

Clients connect to `http://HOST:PORT/mcp`. For VS Code, write `.vscode/mcp.json`:

```json
{
  "servers": {
    "demo": {
      "type": "http",
      "url": "http://localhost:8000/mcp"
    }
  }
}
```

## Mount the server in an ASGI app

1. Use `mcp.streamable_http_app()` to mount the server in a Starlette or FastAPI app.
2. Give the transport options to `streamable_http_app()`. This method has no `port` option.
3. Make the lifespan of the host app enter `mcp.session_manager.run()`.

## Gotchas

- Requests on the 2026-07-28 revision have no session. Any replica can answer a request.
- `stateless_http=True` changes only how the server serves clients of earlier revisions.
- `json_response=True` sends one JSON body for each request. In this mode, the server cannot send progress notifications during the request.
- If you do not set `transport_security`, the SDK checks the `Host` and `Origin` headers only when the host is `127.0.0.1`, `localhost`, or `::1`. For all other hosts, for example `0.0.0.0` or a public host name, the server does no check. For these hosts, give `transport_security=TransportSecuritySettings(allowed_hosts=[...], allowed_origins=[...])` (from `mcp.server.transport_security`) to `run()` or `streamable_http_app()`.
- For browser clients, add CORS to the host app. Allow the `Mcp-*` request headers. Expose the `Mcp-Session-Id` response header.
- For more than one worker, set `request_state_security=RequestStateSecurity(keys=[...])` (from `mcp.server.mcpserver`) on `MCPServer`. Use the same keys and the same server name on all workers.
