# Troubleshooting

## Authentication Issues

If the OAuth flow doesn't start automatically:

1. Restart your MCP client
2. Verify URL is exactly `https://loadout.aident.ai/mcp`
3. Check that your browser can reach loadout.aident.ai

## "Missing required integrations"

The skill needs integrations you haven't connected:

1. Run `vault` with `{ "action": "status" }` to see what's connected
2. Run `vault` with `{ "action": "connect", "integrationId": "<id>" }` for the missing integration
3. Authorize in browser when prompted
4. Retry the operation

## "Tools not appearing"

1. Restart your MCP client
2. Verify the URL in your configuration file
3. Re-authenticate if token expired (client should handle automatically)

## "Connection timeout"

- Check firewall allows outbound HTTPS to `app.aident.ai`
- Configure proxy in MCP client if needed
- Try disconnecting VPN temporarily

## REST API: 401 Unauthorized

Your access token has expired (1 hour TTL). If you have a credential file, delete it and re-authenticate:

```bash
rm ~/.aident/credentials.json
```

The agent will automatically initiate a new OOB flow on the next request.

If using manual curl, refresh the token:

```bash
curl -X POST ${AIDENT_BASE_URL:-https://app.aident.ai}/api/mcp/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&client_id=CLIENT_ID&refresh_token=REFRESH_TOKEN"
```

## REST API: 400 Bad Request

Check your request body format. Expected:

```json
{ "tool": "tool_name", "arguments": {} }
```

## OOB Token Page: "No Token Available"

The token display is one-time and expires after 5 minutes. Start a new authorization flow to get a fresh token.

## Credential File Issues

Tokens are persisted to `~/.aident/credentials.json`. If you experience auth problems:

**Force re-authentication:**

```bash
rm ~/.aident/credentials.json
```

**Check file permissions:**

```bash
ls -la ~/.aident/credentials.json
```

The file should be readable by your user. If not: `chmod 600 ~/.aident/credentials.json`.

**Verify contents:**
The file should contain `base_url`, `client_id`, and `access_token`. If any field is empty or the JSON is malformed, delete the file and re-authenticate.

## Support

- Email: help@aident.ai
- Discord: https://discord.gg/hxtEYHuW26
- Documentation: https://docs.aident.ai
