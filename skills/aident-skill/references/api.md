# OpenAPI Reference

Use the OpenAPI surface when an agent host needs raw HTTPS instead of the CLI or MCP. The CLI and MCP servers are wrappers around the same package operations.

## Base URLs

```text
https://app.aident.ai/api/openapi/loadout.json
https://app.aident.ai/api/openapi/loadout/operations
https://app.aident.ai/api/openapi/loadout/{operationId}
```

Use `AIDENT_BASE_URL` to target another Aident deployment:

```bash
export AIDENT_BASE_URL=https://your-server.example.com
```

## Getting A Token

Tokens are persisted to `~/.aident/credentials.json` after `aident login`. For direct HTTPS scripts, export the access token as `AIDENT_TOKEN`.

OAuth endpoints remain under the MCP OAuth namespace because MCP and OpenAPI use the same Aident OAuth server:

```text
POST /api/mcp/oauth/register
GET  /api/mcp/oauth/authorize
POST /api/mcp/oauth/token
POST /api/mcp/oauth/revoke
```

## Discover Operations

Fetch the Loadout OpenAPI document:

```bash
curl -H "Authorization: Bearer $AIDENT_TOKEN" \
  "${AIDENT_BASE_URL:-https://app.aident.ai}/api/openapi/loadout.json"
```

Fetch compact operation metadata:

```bash
curl -H "Authorization: Bearer $AIDENT_TOKEN" \
  "${AIDENT_BASE_URL:-https://app.aident.ai}/api/openapi/loadout/operations"
```

Operation IDs are stable and package-prefixed. Common Loadout operations:

| Operation ID                            | CLI equivalent                         |
| --------------------------------------- | -------------------------------------- |
| `loadout_capabilities_search`           | `aident capabilities search`           |
| `loadout_capabilities_get`              | `aident capabilities get`              |
| `loadout_capabilities_execute`          | `aident capabilities execute`          |
| `loadout_vault_status`                  | `aident vault status`                  |
| `loadout_vault_connect`                 | `aident vault connect`                 |
| `loadout_vault_disconnect`              | `aident vault disconnect`              |
| `loadout_audit_recent`                  | `aident audit recent`                  |
| `loadout_audit_summary`                 | `aident audit summary`                 |

Use `loadout_capabilities_search` with `types: ["integration"]` to discover integrations; Loadout does not expose a
separate public integrations-list operation.

## Execute Operations

POST the command arguments directly to the operation URL.

```bash
curl -X POST "${AIDENT_BASE_URL:-https://app.aident.ai}/api/openapi/loadout/loadout_capabilities_search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AIDENT_TOKEN" \
  -d '{ "query": "send email", "limit": 5 }'
```

Execute a capability:

```bash
curl -X POST "${AIDENT_BASE_URL:-https://app.aident.ai}/api/openapi/loadout/loadout_capabilities_execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AIDENT_TOKEN" \
  -d '{
    "name": "gmail_tools.gmail_send_email",
    "input": { "to": "team@example.com", "subject": "Notes", "body": "..." }
  }'
```

Check Vault connection status:

```bash
curl -X POST "${AIDENT_BASE_URL:-https://app.aident.ai}/api/openapi/loadout/loadout_vault_status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AIDENT_TOKEN" \
  -d '{}'
```

Audit recent Loadout action calls:

```bash
curl -X POST "${AIDENT_BASE_URL:-https://app.aident.ai}/api/openapi/loadout/loadout_audit_summary" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AIDENT_TOKEN" \
  -d '{ "limit": 50 }'
```

## Error Handling

| HTTP Status | Meaning                                                              |
| ----------- | -------------------------------------------------------------------- |
| 200         | Success. Check the returned `success` field.                         |
| 400         | Invalid request body or unsupported operation.                       |
| 401         | Invalid or expired token. Reauthenticate or refresh.                 |
| 403         | Authenticated account lacks the required package or operation scope. |
| 426         | CLI/client version is too old for this server.                       |
| 500         | Operation execution error. Check the returned `error` field.         |

## Advanced Overrides

| Variable          | Purpose                                                  |
| ----------------- | -------------------------------------------------------- |
| `AIDENT_TOKEN`    | Skip credential file and use this Bearer token directly. |
| `AIDENT_BASE_URL` | Override the default server (`https://app.aident.ai`).   |

## Rate Limits

Standard rate limits apply. If rate limited, wait and retry with exponential backoff.
