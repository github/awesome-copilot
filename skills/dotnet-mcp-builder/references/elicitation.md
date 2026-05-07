# Elicitation

Elicitation lets a tool **ask the user for input mid-execution**, via the client. The LLM doesn't see the question; the client surfaces it directly to the user. This turns one-shot tool calls into interactive flows — collecting confirmation, missing parameters, credentials (URL mode), etc.

> **Spec version:** 2025-11-25. URL mode is the newer addition (originally 2025-06-18 had only form mode).

## Two modes

| Mode | What it does | When to use |
|---|---|---|
| **Form (in-band)** | Server sends a JSON Schema; client renders a form; user submits values back through the same MCP channel. | Confirmations, missing parameters, structured choices. |
| **URL (out-of-band)** | Server sends a URL; client opens it in a browser; user completes the flow there; server checks state separately. | OAuth, payments, anything the MCP channel must not see. |

## Prerequisite: stateful transport

Elicitation requires the server to send a request *to* the client and wait for a response. That only works on:
- STDIO (always).
- Stateful HTTP (`options.Stateless = false`).

In stateless HTTP, `ElicitAsync` will throw — there's no transport channel back.

## Form mode — full example

```csharp
using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

[McpServerToolType]
public class BookingTools
{
    [McpServerTool, Description("Books a meeting room. Asks the user for confirmation.")]
    public static async Task<string> BookRoom(
        IMcpServer server,
        [Description("Room name")] string room,
        [Description("Start time (ISO 8601)")] DateTime start,
        CancellationToken ct)
    {
        var elicit = await server.ElicitAsync(new ElicitRequestParams
        {
            Message = $"Confirm booking '{room}' at {start:HH:mm}?",
            RequestedSchema = new ElicitRequestParams.RequestSchema
            {
                Properties = new Dictionary<string, ElicitRequestParams.PrimitiveSchemaDefinition>
                {
                    ["confirm"] = new ElicitRequestParams.BooleanSchema
                    {
                        Description = "Confirm the booking",
                        Default = true
                    },
                    ["notes"] = new ElicitRequestParams.StringSchema
                    {
                        Description = "Optional notes for the booking"
                    }
                }
            }
        }, ct);

        if (elicit.Action != "accept")
            return "Booking cancelled by user.";

        var confirmed = elicit.Content?["confirm"].GetBoolean() ?? false;
        var notes     = elicit.Content?["notes"].GetString() ?? "";

        if (!confirmed)
            return "User declined to confirm.";

        // …perform the booking…
        return $"Booked '{room}' at {start:O}. Notes: {notes}";
    }
}
```

### Schema primitive types

You can build a `RequestedSchema` from these:

| Type | C# class | Notes |
|---|---|---|
| String | `StringSchema` | `Default`, `Description`. Add JSON-Schema validation at server side if you need it. |
| Number | `NumberSchema` | Use for ints and floats. |
| Boolean | `BooleanSchema` | Renders as a checkbox / toggle. |
| Single-select enum (untitled) | `UntitledSingleSelectEnumSchema` | List of values; client renders as dropdown/radio. |
| Single-select enum (titled) | `TitledSingleSelectEnumSchema` | Each value has a display title. |
| Multi-select enum | `UntitledMultiSelectEnumSchema` / `TitledMultiSelectEnumSchema` | Multi-select dropdown / checkbox group. |

Each accepts `Description` and `Default`.

### Response shape

`ElicitResult`:
- `Action` — `"accept"`, `"reject"`, or `"cancel"`. Always check this first.
- `Content` — `Dictionary<string, JsonElement>?` with the user's submitted values. `null` if the user rejected/cancelled.

Always handle the non-accept paths:

```csharp
if (elicit.Action == "cancel")
    return "User cancelled. No changes made.";
if (elicit.Action == "reject")
    return "User declined.";
// Action == "accept" → safe to read elicit.Content
```

## URL mode — full example

URL mode is for flows where the user must complete something **outside** the MCP channel — typically OAuth.

```csharp
[McpServerTool, Description("Connects the user's GitHub account.")]
public static async Task<string> ConnectGitHub(
    IMcpServer server,
    IOAuthService oauth,
    CancellationToken ct)
{
    var elicitationId = Guid.NewGuid().ToString();
    var authUrl = oauth.BuildAuthorizationUrl(state: elicitationId);

    var result = await server.ElicitAsync(new ElicitRequestParams
    {
        Mode = "url",
        ElicitationId = elicitationId,
        Url = authUrl,
        Message = "Please authorize access to GitHub in the browser window that just opened."
    }, ct);

    if (result.Action != "accept")
        return "Authorization cancelled.";

    // The user has come back. Look up the persisted token by elicitationId.
    var token = await oauth.GetTokenByStateAsync(elicitationId, ct);
    return token is not null ? "Connected." : "Authorization did not complete.";
}
```

### `UrlElicitationRequiredException`

When a tool is *blocked* on auth (rather than walking the user through it), throw `UrlElicitationRequiredException`. The client surfaces the URL to the user and the call fails cleanly. Useful for retry-after-auth patterns:

```csharp
if (!oauth.HasValidToken)
{
    var id = Guid.NewGuid().ToString();
    throw new UrlElicitationRequiredException(
        "Authorization required",
        new[]
        {
            new ElicitRequestParams
            {
                Mode = "url",
                ElicitationId = id,
                Url = oauth.BuildAuthorizationUrl(state: id),
                Message = "Sign in to continue."
            }
        });
}
```

## When NOT to use elicitation

- **Trivial confirmations the LLM can ask in natural language.** If you can phrase "Should I do X?" in your tool's docstring and let the LLM ask, that's lower friction than a modal form.
- **Branching that the LLM should reason about.** Don't replace the LLM's judgment with a form — only elicit for things the LLM literally cannot decide (user secrets, real-time consent, picking from a list only the user knows).
- **Stateless deployments.** Doesn't work — see prerequisite above.

## Client capability check

Don't blindly call `ElicitAsync`. Check first:

```csharp
if (server.ClientCapabilities?.Elicitation is null)
    return "This client doesn't support elicitation; please pass the value as an argument.";

var elicit = await server.ElicitAsync(...);
```

This degrades gracefully on older clients.
