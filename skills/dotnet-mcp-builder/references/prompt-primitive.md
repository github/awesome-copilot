# Prompts

Prompts are reusable, parameterised message templates that the user (not the LLM) typically picks from a list — think "slash commands" in a chat client. The server defines them; the host renders them as menus.

## Anatomy of a prompt

```csharp
using System.ComponentModel;
using Microsoft.Extensions.AI;
using ModelContextProtocol.Server;

[McpServerPromptType]
public class CodePrompts
{
    [McpServerPrompt, Description("Generates a code review prompt.")]
    public static IEnumerable<ChatMessage> CodeReview(
        [Description("The programming language")] string language,
        [Description("The code to review")] string code) =>
        [
            new(ChatRole.User,
                $"Please review the following {language} code:\n\n```{language}\n{code}\n```"),
            new(ChatRole.Assistant,
                "I'll review the code for correctness, style, and potential improvements.")
        ];
}
```

Register it:

```csharp
.WithPrompts<CodePrompts>()
// or
.WithPromptsFromAssembly()
```

## Return types

| Return type | Result |
|---|---|
| `ChatMessage` | Single message. |
| `IEnumerable<ChatMessage>` | Conversation seed. |
| `PromptMessage` / `IEnumerable<PromptMessage>` | Lower-level — use when you need full control over content blocks (embedded resources, multiple typed blocks per message). |
| `GetPromptResult` | Full control — set `Messages` and `Description`. |

`ChatMessage`/`ChatRole` come from `Microsoft.Extensions.AI`. They're the high-level shape and what you should use 90% of the time. Drop down to `PromptMessage`/`ContentBlock` only when you need embedded resources or fine-grained content typing.

## Arguments

Every parameter (after the special ones the SDK strips out — `IMcpServer`, `CancellationToken`, etc.) becomes a prompt argument visible to the user when they pick the prompt. Use `[Description]` on each to explain what the user should supply.

To mark an argument optional, give it a default value:

```csharp
[McpServerPrompt, Description("…")]
public static ChatMessage Greeting(
    [Description("Their preferred greeting style")] string style = "casual")
    => new(ChatRole.User, $"Greet me in a {style} style.");
```

## Image and file content

For prompts that include images:

```csharp
[McpServerPrompt, Description("Asks the model to analyze an image.")]
public static IEnumerable<ChatMessage> AnalyzeImage(
    [Description("Instructions for the analysis")] string instructions)
{
    byte[] imageBytes = LoadSampleImage();
    return new[]
    {
        new ChatMessage(ChatRole.User, new AIContent[]
        {
            new TextContent($"Please analyze this image: {instructions}"),
            new DataContent(imageBytes, "image/png")
        })
    };
}
```

For embedded text resources (e.g. seeding the conversation with a document the user picked):

```csharp
[McpServerPrompt, Description("Reviews a referenced document.")]
public static IEnumerable<PromptMessage> ReviewDocument(
    [Description("The document ID to review")] string documentId)
{
    string content = LoadDocument(documentId);
    return new[]
    {
        new PromptMessage
        {
            Role = Role.User,
            Content = new TextContentBlock { Text = "Please review the following document:" }
        },
        new PromptMessage
        {
            Role = Role.User,
            Content = new EmbeddedResourceBlock
            {
                Resource = new TextResourceContents
                {
                    Uri = $"docs://documents/{documentId}",
                    MimeType = "text/plain",
                    Text = content
                }
            }
        }
    };
}
```

## Async prompts

Prompts can be async — useful when you need to look up data to build the messages:

```csharp
[McpServerPrompt, Description("Drafts a release-notes prompt.")]
public static async Task<IEnumerable<ChatMessage>> ReleaseNotes(
    string repo,
    string fromTag,
    string toTag,
    IGitHubClient github,
    CancellationToken ct)
{
    var commits = await github.GetCommitsBetweenAsync(repo, fromTag, toTag, ct);
    var summary = string.Join("\n", commits.Select(c => $"- {c.Message}"));
    return new[]
    {
        new ChatMessage(ChatRole.User,
            $"Draft release notes for {repo} {fromTag}→{toTag} from these commits:\n{summary}")
    };
}
```

## Notifying clients of prompt changes

```csharp
await server.SendNotificationAsync(
    NotificationMethods.PromptListChangedNotification,
    new PromptListChangedNotificationParams(),
    cancellationToken);
```

## When to use prompts vs. tools

- **Prompt:** the *user* triggers it from a menu, supplying any required arguments. The output is messages, not data. Good for "/summarize", "/code-review", "/draft-email".
- **Tool:** the *LLM* triggers it (often without explicit user action) to fetch or change data. Good for "get_weather", "create_issue".

If both apply (the user wants a slash command that triggers the same logic the LLM could call), expose both — the same DTO/service can back both.
