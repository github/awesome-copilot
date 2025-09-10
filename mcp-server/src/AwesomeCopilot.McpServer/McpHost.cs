using AwesomeCopilot.McpServer.Prompts;
using AwesomeCopilot.McpServer.Services;
using AwesomeCopilot.McpServer.Tools;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

var options = new JsonSerializerOptions
{
  PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
  WriteIndented = true,
  AllowTrailingCommas = true,
  PropertyNameCaseInsensitive = true,
  TypeInfoResolver = AwesomeCopilot.McpServer.Json.SourceGenerationContext.Default
};

builder.Services.AddSingleton(options);
builder.Services.AddHttpClient<IMetadataService, MetadataService>();

builder.Services.AddMcpServer()
  .WithHttpTransport(o => o.Stateless = true)
  .WithPrompts<MetadataPrompt>(options)
  .WithTools<MetadataTool>(options);

var app = builder.Build();

app.MapDefaultEndpoints();

app.UseHttpsRedirection();

app.MapMcp("/mcp");

await app.RunAsync();
