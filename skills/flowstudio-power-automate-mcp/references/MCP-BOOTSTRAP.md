# MCP Bootstrap — Quick Reference

Everything an agent needs to start calling the FlowStudio MCP server.

```
Endpoint:  https://mcp.flowstudio.app/mcp
Protocol:  JSON-RPC 2.0 over HTTP POST
Transport: Streamable HTTP — single POST per request, no SSE, no WebSocket
Auth:      x-api-key header with your FlowStudio key (Authorization: Bearer <key> also works)
```

## Required Headers

```
Content-Type: application/json
x-api-key: <token>
User-Agent: FlowStudio-MCP/1.0    ← required, or Cloudflare blocks you
```

## Step 1 — Discover Tool Bundles

Preferred cold-start call:

```json
POST {"jsonrpc":"2.0","id":1,"method":"tools/call",
      "params":{"name":"list_skills","arguments":{}}}
```

Returns each bundle's `name` and one-line `description` — no tool names. 13
bundles on production as of 2026-11-20 (`discover`, `create-flow`, `build-flow`,
`flow-versions`, `debug-flow`, `monitor-flow`, `diagnose-connection-references`,
`dataverse`, `sharepoint`, `excel`, `sql`, `canvas-app`, `canvas-layout`), plus
`governance` for Pro+ callers (not in Microsoft 365 Copilot). Free — not counted against plan limits.

Then load the relevant schemas:

```json
POST {"jsonrpc":"2.0","id":2,"method":"tools/call",
      "params":{"name":"tool_search","arguments":{"query":"skill:create-flow"}}}
```

Use `query:"select:tool1,tool2"` to load exact tools and keyword search such as
`query:"send email"` when the user intent is ambiguous.

Fallback for very low-level MCP clients:

```json
POST {"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
```

`tools/list` returns all tools with names, descriptions, and input schemas, but
it is heavier and should not be the first choice for agents that know the
FlowStudio meta-tools.

## Step 2 — Call a Tool

```json
POST {"jsonrpc":"2.0","id":1,"method":"tools/call",
      "params":{"name":"<tool_name>","arguments":{...}}}
```

## Response Shape

```
Success    → {"result":{"content":[{"type":"text","text":"<JSON string>"}]}}
Tool error → {"result":{"content":[{"type":"text","text":"Error: <message>"}],"isError":true}}
Protocol   → {"error":{"code":-32602,"message":"<unknown tool name …>"}}
```

Check `result.isError` first: a tool error's text is prose (`Error: …`,
`Microsoft error: …`) or, for an HTTP error from Microsoft, JSON with
`statusCode` and `data`, sometimes with hint text after it. Otherwise parse
`result.content[0].text` as JSON to get the actual data.

## Key Tips

- Tool results are JSON strings inside the text field — **double-parse needed**
- Failures come back with `isError: true` (see above). Some successful replies
  also carry `"error": null`; many (for example `get_live_flow_runs`) have no
  `error` key at all, so a missing key is not a failure
- `environmentName` is required for most tools, but **not** for:
  `list_live_environments`, `list_store_flows`, `list_store_environments`,
  `list_store_makers`, `get_store_maker`, `list_store_power_apps`,
  `list_store_connections`. `list_live_connections` **does** need it
- `environmentName` must be the environment `id` from `list_live_environments`.
  A whole display name or `"Default"` is swapped for the id, with a note in
  `hints`; anything else is refused. `environment` is accepted as another name
  for the same argument
- When in doubt, check the `required` array in each tool's schema from
  `tool_search` (or `tools/list` as a fallback)
