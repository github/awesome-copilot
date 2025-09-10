var builder = DistributedApplication.CreateBuilder(args);

var mcpServer = builder.AddProject<Projects.AwesomeCopilot_McpServer>("mcp-server");

builder.AddMcpInspector("mcp-inspector")
  .WithMcpServer(mcpServer)
  .WithEnvironment("NODE_OPTIONS", "--use-system-ca");

builder.Build().Run();
