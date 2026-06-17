# MCP Apps (interactive UI)

[MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview) is the official extension that lets a tool return an **interactive UI** rendered in a sandboxed iframe inside the host (Claude, Claude Desktop, VS Code Copilot, Goose, Postman, MCPJam). Typical use cases: charts, dashboards, multi-step forms, 3D viewers, real-time monitors, PDF/video viewers.

> **Important:** as of early 2026, the C# SDK does **not** ship a typed convenience layer for MCP Apps (tracked in [csharp-sdk#1431](https://github.com/modelcontextprotocol/csharp-sdk/issues/1431)). You implement the spec by hand: serve a `ui://` resource and emit the right `_meta` on the tool. It's not hard — just untyped. This page shows you the pattern.

## How it works (short version)

1. You register a **resource** at a `ui://` URI returning an HTML bundle.
2. You register a **tool** whose definition includes `_meta.ui.resourceUri` pointing to that URI.
3. When the LLM calls the tool, the host fetches the UI resource and renders it in a sandboxed iframe in the chat.
4. The HTML talks to the host over `postMessage` JSON-RPC (use `@modelcontextprotocol/ext-apps` from the bundle, or hand-roll it).
5. The app can call back into your MCP server (any tool), update the model context, etc.

The full protocol spec is at [`@modelcontextprotocol/ext-apps`](https://github.com/modelcontextprotocol/ext-apps).

## Step 1: Serve the UI resource

Bundle your HTML/JS/CSS into a single string (or load from `wwwroot`). Serve it at a `ui://` URI.

```csharp
using System.ComponentModel;
using System.IO;
using System.Reflection;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

[McpServerResourceType]
public static class ChartUiResource
{
    [McpServerResource(
        UriTemplate = "ui://charts/interactive",
        Name = "Interactive chart",
        MimeType = "text/html+skybridge")]   // see "MIME type" note below
    [Description("UI bundle for the interactive chart MCP App.")]
    public static TextResourceContents GetUi()
    {
        // Load a bundled HTML/JS file from embedded resources or wwwroot.
        var html = LoadEmbeddedString("MyMcpServer.AppUi.chart.html");

        return new TextResourceContents
        {
            Uri = "ui://charts/interactive",
            MimeType = "text/html+skybridge",
            Text = html
        };
    }

    private static string LoadEmbeddedString(string resourceName)
    {
        var asm = Assembly.GetExecutingAssembly();
        using var stream = asm.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Missing embedded resource {resourceName}");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
```

**MIME type note:** the spec uses `text/html+skybridge` for app HTML so hosts can distinguish UI bundles from regular `text/html` previews. Use that, even though plain `text/html` may work today on lenient hosts.

## Step 2: Emit `_meta` on the tool

The C# SDK's `[McpServerTool]` doesn't expose `_meta` in the attribute today, so set it via the lower-level `Tool` definition. Do this once at startup:

```csharp
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using System.Text.Json;
using System.Text.Json.Nodes;

builder.Services.Configure<McpServerOptions>(options =>
{
    options.Capabilities ??= new();
    options.Capabilities.Tools ??= new();

    // Define the tool manually so we can attach _meta.
    var visualizeTool = new Tool
    {
        Name = "visualize_data",
        Description = "Visualize the user's data as an interactive chart.",
        InputSchema = JsonDocument.Parse("""
            {
              "type": "object",
              "properties": {
                "datasetId": { "type": "string", "description": "Dataset to visualize." }
              },
              "required": ["datasetId"]
            }
            """).RootElement,
        Meta = new JsonObject
        {
            ["ui"] = new JsonObject
            {
                ["resourceUri"] = "ui://charts/interactive"
                // Optionally:
                // ["csp"] = new JsonObject { ["default-src"] = "'self' https://cdn.example.com" },
                // ["permissions"] = new JsonArray("clipboard-write")
            }
        }
    };

    // Implement the call handler that returns the data the UI will render.
    options.Capabilities.Tools.ToolCollection ??= new();
    options.Capabilities.Tools.ToolCollection.Add(McpServerTool.Create(
        async (CallToolRequestParams req, CancellationToken ct) =>
        {
            var args = req.Arguments ?? new();
            var datasetId = args["datasetId"]!.GetValue<string>();
            var data = await LoadDataset(datasetId, ct);
            return new CallToolResult
            {
                Content = [new TextContentBlock { Text = JsonSerializer.Serialize(data) }],
                StructuredContent = JsonSerializer.SerializeToNode(data)
            };
        },
        visualizeTool));
});
```

If you don't need full structured content, the tool can return *just* JSON in a text block — the UI fetches it via `app.callServerTool(...)` after rendering.

### Backwards compatibility key

Some older hosts expect `_meta["ui/resourceUri"]` instead of `_meta.ui.resourceUri`. Set both for safety:

```csharp
Meta = new JsonObject
{
    ["ui"] = new JsonObject { ["resourceUri"] = "ui://charts/interactive" },
    ["ui/resourceUri"] = "ui://charts/interactive"   // legacy
}
```

## Step 3: The HTML bundle

A minimum viable bundle: vanilla JS using `@modelcontextprotocol/ext-apps`. The simplest build is a single self-contained HTML file.

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Chart</title>
    <style>body { font-family: system-ui; margin: 0; }</style>
  </head>
  <body>
    <div id="root">Loading…</div>
    <script type="module">
      import { App } from "https://esm.sh/@modelcontextprotocol/ext-apps@1";

      const app = new App();
      await app.connect();

      // Fetch the data we need from the server.
      const resp = await app.callServerTool({
        name: "visualize_data",
        arguments: { datasetId: "default" }
      });

      const data = JSON.parse(resp.content[0].text);
      document.getElementById("root").textContent =
        `Loaded ${data.points.length} data points.`;

      // Tell the model what just happened (becomes part of its context).
      await app.updateModelContext({
        content: [{ type: "text", text: "User opened the chart UI." }]
      });
    </script>
  </body>
</html>
```

**Tip:** for non-trivial UIs, build with Vite (React/Vue/Svelte/Solid — any of the [official starter templates](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples)) and have the build emit a single inlined HTML you embed as a project resource.

## Project layout

A pragmatic layout for an MCP App in .NET:

```
MyMcpServer/
├── Program.cs
├── Tools/
│   └── VisualizeDataTool.cs       # (or registered via Configure as above)
├── Resources/
│   └── ChartUiResource.cs         # serves the ui:// resource
├── AppUi/
│   ├── chart.html                 # bundled UI (Embedded Resource)
│   └── package.json + src/...     # if you build with Vite, output to chart.html
└── MyMcpServer.csproj
```

In the csproj:

```xml
<ItemGroup>
  <EmbeddedResource Include="AppUi\chart.html" />
</ItemGroup>
```

Read it via `Assembly.GetManifestResourceStream("MyMcpServer.AppUi.chart.html")`.

## Testing locally

1. Run your MCP server (STDIO or HTTP).
2. Use a host that supports MCP Apps — Claude Desktop or VS Code Copilot Chat are the easiest.
3. Trigger the tool via the LLM. The UI renders inline.

For pure-UI iteration, [MCP Inspector](https://github.com/modelcontextprotocol/inspector) shows resource contents but does not fully render apps; for that, point Claude Desktop at your dev server.

## Pitfalls

- **Wrong MIME type.** Use `text/html+skybridge`. Plain `text/html` may still work but isn't future-proof.
- **CSP too tight or too loose.** If your UI loads from a CDN, declare it in `Meta["ui"]["csp"]` on the `Tool` definition (this serialises to `_meta.ui.csp` on the wire). Otherwise the iframe sandbox blocks it.
- **Forgetting `Tool.Meta` on the tool.** Without the `Meta` property containing the `ui.resourceUri` entry, the host treats your tool as a regular text-returning tool. The UI never appears.
- **Trying to use browser APIs outside the sandbox.** No cookies, no localStorage from the parent. Use `app.updateModelContext` and tool calls for state.

## Future-proofing

When the C# SDK ships its typed MCP Apps helpers (issue [#1431](https://github.com/modelcontextprotocol/csharp-sdk/issues/1431)), you'll likely be able to replace the manual `Configure` block with an attribute or fluent builder. The serving of `ui://` resources won't change. Keep your UI HTML as embedded resources so the migration is mechanical.
