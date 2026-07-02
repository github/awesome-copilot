# teams-dotnet

## purpose

Microsoft Teams SDK for .NET (C#) patterns — app initialization, activity handling, AI integration, and Adaptive Cards for Tier 3 C# projects.

## rules

1. Add the NuGet packages: `Microsoft.Teams.Apps`, `Microsoft.Teams.AI`, `Microsoft.Teams.AI.Models.OpenAI`, and `Microsoft.Teams.Plugins.AspNetCore`. The SDK targets **.NET 8+** and uses the modern minimal API pattern. [teams.net source: Libraries/]
2. Initialize with ASP.NET Core dependency injection: `builder.AddTeams()` registers core Teams services, then `app.UseTeams()` returns the `App` instance for handler registration. When no ClientId is configured, pass `skipAuth: true` to disable auth validation: `builder.AddTeams(skipAuth: true)`. This replaces the TS `Application.create()` pattern. [teams.net source: HostApplicationBuilder.cs]
3. Register activity handlers using fluent methods: `teams.OnMessage(async (context, ct) => { ... })`. Supports pattern matching: `teams.OnMessage(@"^hi$", async (context, ct) => { ... })`. Handlers are checked in registration order — first match wins. [teams.net source: App.cs]
4. All handlers receive `IContext<TActivity>` and `CancellationToken`. Access the activity via `context.Activity`, the API client via `context.Api`, storage via `context.Storage`, and logger via `context.Log`. This replaces the TS `TurnContext` pattern. [teams.net source: Context.cs]
5. Send messages with `await context.Send("text", ct)` or `await context.Reply("reply", ct)`. The `Send` method accepts strings, `ActivityParams`, or `AdaptiveCard` objects. For typing indicators, use `await context.Typing(cancellationToken: ct)`. [teams.net source: Context.cs]
6. Handle Adaptive Card actions with `teams.OnAdaptiveCardAction(async (context, ct) => { ... })`. Return `ActionResponse.Message("text")` from the handler. Access submitted data via `context.Activity.Value?.Action?.Data`. [teams.net source: App.cs]
7. For AI integration, create an `OpenAIChatModel` (from `Microsoft.Teams.AI.Models.OpenAI`) with Azure OpenAI or OpenAI credentials. Create a prompt with `new OpenAIChatPrompt(model)` and call `await prompt.Send(input, ct)`. [teams.net source: OpenAIChatPrompt.cs]
8. Define AI functions using C# attributes: decorate a class with `[Prompt]` and methods with `[Function]`. Parameters use `[Param]`. Or use the fluent API: `prompt.Function("name", "desc", async (string param) => result)`. This replaces TS function-calling with type-safe C# patterns. [teams.net source: Annotations/]
9. Use `IContext` tuple deconstruction for concise handler code: `var (log, api, activity) = context;`. This is idiomatic C# that has no TS equivalent. [teams.net source: Context.cs]
10. For OAuth/SSO, call `await context.SignIn(new OAuthOptions { ConnectionName = "name" }, ct)`. Check `context.IsSignedIn` and access `context.UserGraphToken` for Microsoft Graph calls. Access Graph via `context.UserGraph` (user) or `context.AppGraph` (app-only). [teams.net source: activity_context.py]
11. The SDK uses a **plugin architecture**. `AspNetCorePlugin` handles HTTP ingestion (registered by `AddTeams()`). Add `DevToolsPlugin` for development. Custom plugins implement `IPlugin` with lifecycle hooks (`OnInit`, `OnStart`, `OnActivity`). [teams.net source: IPlugin.cs]
12. Default endpoint is `POST /api/messages` on port 5000 (ASP.NET default) or the `PORT`/`ASPNETCORE_URLS` environment variable. This replaces the TS Express endpoint pattern. [teams.net source: AspNetCorePlugin]

## patterns

### Basic echo bot with ASP.NET Core

```csharp
using Microsoft.Teams.Apps.Activities;
using Microsoft.Teams.Apps.Extensions;
using Microsoft.Teams.Plugins.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);
builder.AddTeams(skipAuth: true);

var app = builder.Build();
var teams = app.UseTeams();

teams.OnMessage(async (context, ct) =>
{
    await context.Send($"Echo: {context.Activity.Text}", ct);
});

app.Run();
```

### AI bot with function calling

```csharp
using Azure.AI.OpenAI;
using System.ClientModel;
using Microsoft.Teams.AI.Models.OpenAI;
using Microsoft.Teams.Apps.Activities;
using Microsoft.Teams.Apps.Extensions;
using Microsoft.Teams.Plugins.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);
builder.AddTeams(skipAuth: true);

var azureClient = new AzureOpenAIClient(
    new Uri(builder.Configuration["AzureOpenAIEndpoint"]!),
    new ApiKeyCredential(builder.Configuration["AzureOpenAIKey"]!)
);
var model = new OpenAIChatModel("gpt-4", azureClient);

var app = builder.Build();
var teams = app.UseTeams();

teams.OnMessage(async (context, ct) =>
{
    await context.Typing(cancellationToken: ct);

    var prompt = new OpenAIChatPrompt(model);
    prompt.Function("get_weather", "Get weather for a location",
        async (string location) => $"Sunny, 72F in {location}");

    var result = await prompt.Send(context.Activity.Text, ct);
    if (result.Content != null)
    {
        await context.Send(result.Content, ct);
    }
});

app.Run();
```

### Attribute-based prompt class

```csharp
using Microsoft.Teams.AI.Annotations;

[Prompt]
[Prompt.Instructions("You are a helpful assistant that can search and summarize.")]
public class AssistantPrompt(IContext<IActivity> context)
{
    [Function]
    [Function.Description("Search the knowledge base")]
    public async Task<string> Search([Param] string query)
    {
        // Call your search API
        return $"Found 3 results for: {query}";
    }

    [Function]
    [Function.Description("Get the current user's name")]
    public string GetUserName()
    {
        return context.Activity.From?.Name ?? "Unknown";
    }
}

// Usage in handler:
teams.OnMessage(async (context, ct) =>
{
    var prompt = OpenAIChatPrompt.From(model, new AssistantPrompt(context));
    var result = await prompt.Send(context.Activity.Text, ct);
    if (result.Content != null)
        await context.Send(result.Content, ct);
});
```

## pitfalls

- **.NET 8+ required**: The SDK uses modern C# features (primary constructors, collection expressions) that require .NET 8 or later.
- **No Slack SDK for C#**: No official Slack SDK exists for .NET. For the Slack side in Tier 3 C# projects, use REST API patterns from `experts/bridge/rest-only-integration-ts.md`.
- **CancellationToken everywhere**: All async methods require passing `CancellationToken`. Forgetting it compiles but prevents graceful shutdown.
- **AddTeams() before Build()**: The `builder.AddTeams()` call must happen before `builder.Build()`. Calling `UseTeams()` without `AddTeams()` throws at startup.
- **Handler registration order matters**: Handlers are checked in order. Put specific patterns (`OnMessage(@"^help$")`) before generic handlers (`OnMessage(...)`) or the generic handler catches everything.
- **ActionResponse return type**: `OnAdaptiveCardAction` handlers must return an `ActionResponse`, not just call `Send`. Returning null causes a 500 error.

## references

- teams.net source: Libraries/Microsoft.Teams.Apps/App.cs
- teams.net source: Libraries/Microsoft.Teams.AI.Models.OpenAI/OpenAIChatPrompt.cs
- teams.net source: Samples/Samples.AI/Program.cs
- teams.net source: Samples/Samples.Echo/Program.cs

## instructions

This expert covers the Microsoft Teams SDK for .NET — the C# equivalent of `@microsoft/teams-ai`. Use it for Tier 3 C# projects that need Teams SDK patterns. C# projects have SDK support for Teams but not Slack. For the Slack side, pair with `experts/bridge/rest-only-integration-ts.md` to implement REST-based Slack integration.

Pair with: `bridge/rest-only-integration-ts.md` for REST-based Slack integration (the unsupported side). TS Teams experts for conceptual architecture reference.

## research

Deep Research prompt:

"Write a micro expert on Microsoft Teams SDK for .NET (C#). Cover ASP.NET Core setup (AddTeams, UseTeams, minimal API), activity handler registration (OnMessage with regex, OnAdaptiveCardAction, OnConversationUpdate), IContext<TActivity> (Send, Reply, Typing, Activity, Api, Storage, Log, SignIn, IsSignedIn), OpenAIChatModel/OpenAIChatPrompt for AI, function calling (attribute-based [Prompt][Function][Param] and fluent API), Adaptive Cards (creating and handling actions), plugin architecture (IPlugin lifecycle), state management (IStorage), and context tuple deconstruction. Source from teams.net Libraries source code and Samples."
