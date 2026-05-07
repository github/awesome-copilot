# Resources

Resources are server-exposed "things" identified by a URI. Hosts list them so the user can pick which ones to attach to the conversation; tools and prompts can also reference them via `EmbeddedResourceBlock`. Think files, database rows, API objects, settings — anything addressable.

Two flavours:
- **Static resource** — a fixed URI (`config://app/settings`). Useful for singletons.
- **Resource template** — a URI with placeholders (`docs://articles/{id}`). The host (or LLM) substitutes parameters; your method receives them.

## Static resource

```csharp
using System.ComponentModel;
using System.Text.Json;
using ModelContextProtocol.Server;

[McpServerResourceType]
public class AppResources
{
    [McpServerResource(
        UriTemplate = "config://app/settings",
        Name = "App Settings",
        MimeType = "application/json")]
    [Description("Returns application configuration settings.")]
    public static string GetSettings() =>
        JsonSerializer.Serialize(new { theme = "dark", language = "en" });
}
```

Register:

```csharp
.WithResources<AppResources>()
// or
.WithResourcesFromAssembly()
```

## Templated resource

The placeholders in `UriTemplate` map by name to method parameters. Anything not a placeholder follows the same DI rules as tools (`IMcpServer`, `CancellationToken`, services).

```csharp
[McpServerResourceType]
public class DocumentResources
{
    [McpServerResource(
        UriTemplate = "docs://articles/{id}",
        Name = "Article",
        MimeType = "text/markdown")]
    [Description("Returns an article by its ID.")]
    public static ResourceContents GetArticle(string id)
    {
        string? content = LoadArticle(id);
        if (content is null)
            throw new McpException($"Article not found: {id}");

        return new TextResourceContents
        {
            Uri = $"docs://articles/{id}",
            MimeType = "text/markdown",
            Text = content
        };
    }
}
```

## Return types

| Return | Result |
|---|---|
| `string` | Wrapped in `TextResourceContents` with the URI from the template and the declared `MimeType`. |
| `byte[]` | Wrapped in `BlobResourceContents`. |
| `TextResourceContents` | Returned as-is — set `Uri`, `MimeType`, `Text`. |
| `BlobResourceContents` | Returned as-is — use `BlobResourceContents.FromBytes(...)`. |
| `IEnumerable<ResourceContents>` | Multi-part resource. |

### Binary resource

```csharp
[McpServerResource(
    UriTemplate = "images://photos/{id}",
    Name = "Photo",
    MimeType = "image/png")]
public static BlobResourceContents GetPhoto(int id)
{
    byte[] data = LoadPhoto(id);
    return BlobResourceContents.FromBytes(data, $"images://photos/{id}", "image/png");
}
```

### Pointing at the file system

A common pattern is exposing files from disk. Be careful about path traversal — never trust the URI verbatim.

```csharp
[McpServerResource(
    UriTemplate = "file://workspace/{*relativePath}",
    Name = "Workspace file")]
public static TextResourceContents ReadFile(string relativePath, IOptions<WorkspaceOptions> opts)
{
    var root = opts.Value.RootPath;
    var fullPath = Path.GetFullPath(Path.Combine(root, relativePath));
    if (!fullPath.StartsWith(root, StringComparison.Ordinal))
        throw new McpException("Path traversal blocked.");

    return new TextResourceContents
    {
        Uri = $"file://workspace/{relativePath.Replace("\\", "/")}",
        MimeType = "text/plain",
        Text = File.ReadAllText(fullPath)
    };
}
```

## Listing dynamic resources

Attribute-based discovery covers the common case (one method per template). When you need to **enumerate** resources that don't fit a template — say, "list every file in the workspace" — implement a low-level handler in `McpServerOptions.Capabilities.Resources`:

```csharp
builder.Services.Configure<McpServerOptions>(options =>
{
    options.Capabilities ??= new();
    options.Capabilities.Resources ??= new();

    options.Capabilities.Resources.ListResourcesHandler = (ctx, ct) =>
    {
        var resources = Directory
            .EnumerateFiles(WorkspaceRoot, "*.*", SearchOption.AllDirectories)
            .Select(path => new Resource
            {
                Uri = "file://workspace/" + Path.GetRelativePath(WorkspaceRoot, path).Replace('\\', '/'),
                Name = Path.GetFileName(path),
                MimeType = "text/plain"
            })
            .ToList();

        return ValueTask.FromResult(new ListResourcesResult { Resources = resources });
    };
});
```

You can mix attribute-based and handler-based — the SDK merges both.

## Resource subscriptions (server-pushed updates)

If a client subscribes to a resource and it changes, push a notification:

```csharp
await server.SendNotificationAsync(
    NotificationMethods.ResourceUpdatedNotification,
    new ResourceUpdatedNotificationParams { Uri = "docs://articles/42" },
    cancellationToken);
```

For wholesale list changes:

```csharp
await server.SendNotificationAsync(
    NotificationMethods.ResourceListChangedNotification,
    new ResourceListChangedNotificationParams(),
    cancellationToken);
```

Both require a stateful transport.

## Reading resources from a client

```csharp
ReadResourceResult result = await client.ReadResourceAsync("config://app/settings");
foreach (var content in result.Contents)
{
    if (content is TextResourceContents text)
        Console.WriteLine($"[{text.MimeType}] {text.Text}");
    else if (content is BlobResourceContents blob)
        File.WriteAllBytes("out.bin", blob.DecodedData.ToArray());
}
```

## Resources vs. tools — when to pick which

- **Resource:** the user (or LLM) wants to *attach context* to the conversation. Read-only, addressable, listable. The host controls when/whether to load it. Ideal for documents, configs, schemas.
- **Tool:** the LLM wants to *do something* (which may include reading data). Side-effects, actions, parameters that don't fit a URI.

If you have something the LLM might want to *search* over, expose both: a `search_articles` tool and `docs://articles/{id}` resource template. The tool returns a list of URIs; the host fetches the content via the resource.
