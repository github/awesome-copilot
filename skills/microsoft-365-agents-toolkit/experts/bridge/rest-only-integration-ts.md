# rest-only-integration-ts

## purpose

Raw HTTP integration patterns for Teams and Slack without native SDKs — Bot Framework REST API for Teams, Slack Events API + Web API for Slack. For Java, C#, Go, or any language that lacks an official Bolt or Teams SDK.

## rules

1. **Use the Bot Framework REST API for Teams when no SDK is available.** The REST API is language-agnostic. Authenticate via Azure AD OAuth2 client credentials, then POST activities to the Bot Connector service URL.
2. **Use the Slack Events API + Web API for Slack when no Bolt SDK is available.** Receive events via HTTP POST webhooks (with signature verification), respond via `chat.postMessage` and other Web API methods.
3. **Verify Slack request signatures manually.** Compute `HMAC-SHA256` of `v0:{timestamp}:{request_body}` using your signing secret. Compare against the `X-Slack-Signature` header. Reject if timestamp is older than 5 minutes.
4. **Verify Teams JWT tokens manually.** Validate the `Authorization: Bearer <token>` header against Azure AD's OpenID configuration. Check `iss`, `aud` (your app ID), and token expiration. Use your platform's JWT library.
5. **Acquire Bot Framework tokens via Azure AD.** POST to `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token` with `client_id`, `client_secret`, and `scope=https://api.botframework.com/.default`.
6. **Send Teams messages via the Bot Connector API.** POST to `{serviceUrl}/v3/conversations/{conversationId}/activities` with the activity JSON and a `Bearer` token. The `serviceUrl` comes from the inbound activity.
7. **Send Slack messages via the Web API.** POST to `https://slack.com/api/chat.postMessage` with `Authorization: Bearer xoxb-...` and a JSON body containing `channel`, `text`, and optionally `blocks`.
8. **Acknowledge Slack events within 3 seconds.** Return HTTP 200 immediately, then process async. For interactions (actions, commands, shortcuts), return a JSON body or empty 200 to acknowledge.
9. **Handle the Slack URL verification challenge.** When Slack sends `{ type: "url_verification", challenge: "..." }`, respond with `{ challenge: "..." }` and HTTP 200. This only happens once during setup.
10. **Return HTTP 200/201 for Teams webhook POSTs.** The Bot Framework expects a 200 response. For invoke activities, return a JSON body with `{ status: 200, body: ... }`.
11. **Store the `serviceUrl` from Teams activities.** Each inbound activity includes a `serviceUrl` that may change. Use it for subsequent API calls to that conversation. Cache per conversation.
12. **Use `response_url` for Slack interaction responses.** Actions, commands, and shortcuts include a `response_url`. POST to it within 30 minutes with `{ text, response_type }` for follow-up messages without needing the Web API.

## patterns

### Slack signature verification (pseudocode, any language)

```
function verifySlackSignature(signingSecret, timestamp, body, signature):
    if abs(now() - timestamp) > 300:  // 5 minutes
        return false
    basestring = "v0:" + timestamp + ":" + body
    computed = "v0=" + hmac_sha256(signingSecret, basestring)
    return timingSafeCompare(computed, signature)

// HTTP handler:
timestamp = request.headers["X-Slack-Request-Timestamp"]
signature = request.headers["X-Slack-Signature"]
if not verifySlackSignature(SECRET, timestamp, rawBody, signature):
    return 401
```

### Teams token acquisition (HTTP, any language)

```
POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id={appId}
&client_secret={appPassword}
&scope=https://api.botframework.com/.default
&grant_type=client_credentials

Response: { "access_token": "eyJ...", "expires_in": 3600 }
```

### Send a Teams message (HTTP, any language)

```
POST {serviceUrl}/v3/conversations/{conversationId}/activities
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "type": "message",
  "text": "Hello from a REST client!",
  "from": { "id": "{botAppId}", "name": "My Bot" }
}
```

### Send a Slack message (HTTP, any language)

```
POST https://slack.com/api/chat.postMessage
Authorization: Bearer xoxb-your-token
Content-Type: application/json

{
  "channel": "C123ABC",
  "text": "Hello from a REST client!",
  "blocks": [
    {
      "type": "section",
      "text": { "type": "mrkdwn", "text": "Hello from a REST client!" }
    }
  ]
}
```

### Slack event webhook handler (pseudocode)

```
function handleSlackEvent(request):
    verifySignature(request)
    body = parseJSON(request.body)

    if body.type == "url_verification":
        return { challenge: body.challenge }

    if body.type == "event_callback":
        event = body.event
        // Process event async...
        return 200  // acknowledge immediately

    if body.type == "interactive":
        // action, shortcut, or view_submission
        return 200  // ack, then use response_url for follow-up
```

### Teams JWT validation (pseudocode)

```
function validateTeamsJWT(authHeader, appId):
    token = authHeader.replace("Bearer ", "")
    // Fetch keys from https://login.botframework.com/v1/.well-known/openidconfiguration
    claims = jwt_verify(token, publicKeys)
    assert claims.aud == appId
    assert claims.iss starts with "https://api.botframework.com"
    assert claims.exp > now()
    return claims
```

## pitfalls

- **Slack signature uses raw body, not parsed JSON.** You must verify against the exact bytes received, not a re-serialized JSON string. Many frameworks parse the body before your handler — use middleware to capture the raw body.
- **Teams `serviceUrl` varies by region.** Don't hardcode it. The URL may be `https://smba.trafficmanager.net/...` or `https://emea.ng.msg.teams.microsoft.com/...` depending on the tenant's region.
- **Bot Framework tokens expire after 1 hour.** Cache the token and refresh before expiry. Don't acquire a new token for every outbound message — this adds latency and hits rate limits.
- **Slack's `response_url` expires after 30 minutes.** If you need to update a message later, use `chat.update` with the message `ts` instead.
- **Teams proactive messaging requires a conversation reference.** You can't just POST to a user ID — you need the `conversationId` and `serviceUrl` from a previous inbound activity. Store these on first contact.
- **No Adaptive Card support via REST without the schema.** You must construct the full Adaptive Card JSON yourself. Use the Adaptive Card Designer (https://adaptivecards.io/designer/) to prototype, then embed the JSON in your API calls.
- **Slack interactive payload is form-encoded, not JSON.** Actions, shortcuts, and view submissions arrive as `application/x-www-form-urlencoded` with a `payload` field containing JSON. Parse the `payload` field, not the raw body.

## references

- Bot Framework REST API: https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-api-reference
- Slack Events API: https://api.slack.com/events-api
- Slack Web API: https://api.slack.com/web
- Slack request verification: https://api.slack.com/authentication/verifying-requests-from-slack
- Azure AD token endpoint: https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow
- Adaptive Card Designer: https://adaptivecards.io/designer/

## instructions

Use this expert when integrating with Teams or Slack from a language that lacks a native SDK (Java for Teams, C# for Slack, Go, Ruby, etc.), or when building a lightweight integration that doesn't warrant a full SDK dependency. The patterns use pseudocode that's translatable to any language.

Pair with: `cross-platform-architecture-ts.md` (if also using TS for one platform), `../teams/runtime.app-init-ts.md` (for TS Teams SDK comparison), `../slack/runtime.bolt-foundations-ts.md` (for TS Slack SDK comparison).

## research

Deep Research prompt:

"Document raw HTTP integration patterns for Microsoft Teams Bot Framework and Slack without native SDKs. Cover: Bot Framework REST Connector API (POST activities, GET conversations), Azure AD client credentials OAuth2 token acquisition, JWT validation for inbound webhooks, Slack Events API webhook setup (URL verification challenge, event_callback processing), Slack Web API methods (chat.postMessage, chat.update, views.open), Slack request signature verification (HMAC-SHA256, timing-safe comparison, timestamp validation), response_url for interaction follow-ups, Adaptive Card JSON construction for REST, Block Kit JSON construction for REST, serviceUrl caching for Teams, and rate limiting considerations."
