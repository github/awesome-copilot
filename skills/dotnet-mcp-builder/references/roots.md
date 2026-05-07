# Roots

Roots are filesystem (or URI) locations the **client** advertises to the server, scoping what the server is allowed to look at. Think "open workspace folders" in an IDE — the user has implicitly approved the server reading from these places. The server pulls the list when it needs it.

## When you'd use roots

- Building a tool that scans/edits the user's project. Use roots to know which directories are in scope.
- Resolving relative paths in a way that respects the user's open workspace.
- Restricting file access to the advertised roots (defence in depth).

## Prerequisite

Same as sampling/elicitation: server-to-client request → needs STDIO or stateful HTTP. Plus the client must advertise the `roots` capability.

## Reading roots from a tool

```csharp
using System.ComponentModel;
using System.Text;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

[McpServerToolType]
public class WorkspaceTools
{
    [McpServerTool, Description("Lists the user's project roots.")]
    public static async Task<string> ListProjectRoots(
        IMcpServer server,
        CancellationToken cancellationToken)
    {
        if (server.ClientCapabilities?.Roots is null)
            return "Client does not support roots.";

        var result = await server.RequestRootsAsync(
            new ListRootsRequestParams(),
            cancellationToken);

        var sb = new StringBuilder();
        foreach (var root in result.Roots)
            sb.AppendLine($"- {root.Name ?? root.Uri}: {root.Uri}");

        return sb.ToString();
    }
}
```

`Root` has `Uri` (string, often a `file://...`) and optional `Name` (display label).

## Reacting to root changes

Clients send `notifications/roots/list_changed` when the user opens or closes a workspace folder. Subscribe:

```csharp
builder.Services.Configure<McpServerOptions>(options =>
{
    options.Capabilities ??= new();

    // The client tells us its roots changed; refresh whatever cache we have.
    options.Capabilities.NotificationHandlers ??= [];
    options.Capabilities.NotificationHandlers[NotificationMethods.RootsListChangedNotification] =
        async (notification, ct) =>
        {
            // Trigger your refresh — typically pull RequestRootsAsync again.
        };
});
```

## A useful pattern: cache + refresh

Roots don't change often, but refetching on every tool call is wasteful. Cache them per session and refresh on `roots/list_changed`:

```csharp
public class RootsCache
{
    private IReadOnlyList<Root> _roots = Array.Empty<Root>();

    public IReadOnlyList<Root> Current => _roots;

    public async Task RefreshAsync(IMcpServer server, CancellationToken ct)
    {
        if (server.ClientCapabilities?.Roots is null) return;
        var result = await server.RequestRootsAsync(new ListRootsRequestParams(), ct);
        _roots = result.Roots;
    }
}
```

Register as singleton (per-session in stateful HTTP, naturally singleton in STDIO).

## Validating paths against roots

Defence in depth: even if a tool argument *looks* like a path under a root, validate.

```csharp
public static bool IsUnderAnyRoot(string absolutePath, IReadOnlyList<Root> roots)
{
    foreach (var root in roots)
    {
        if (!Uri.TryCreate(root.Uri, UriKind.Absolute, out var uri)) continue;
        if (!uri.IsFile) continue;
        var rootPath = Path.GetFullPath(uri.LocalPath);
        if (absolutePath.StartsWith(rootPath, StringComparison.OrdinalIgnoreCase))
            return true;
    }
    return false;
}
```

If a tool receives a path outside the advertised roots, refuse with a clear message — don't silently expand scope.
