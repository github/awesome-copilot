#:package GitHub.Copilot.SDK@*

using GitHub.Copilot.SDK;

// Ralph loop: autonomous AI task loop with fresh context per iteration.
//
// Two modes:
//   - "plan": reads PROMPT_plan.md, generates/updates IMPLEMENTATION_PLAN.md
//   - "build": reads PROMPT_build.md, implements tasks, runs tests, commits
//
// Each iteration creates a fresh session so the agent always operates in
// the "smart zone" of its context window. State is shared between
// iterations via files on disk (IMPLEMENTATION_PLAN.md, AGENTS.md, specs/*).
//
// Usage:
//   dotnet run                      # build mode, 50 iterations
//   dotnet run plan                 # planning mode
//   dotnet run 20                   # build mode, 20 iterations
//   dotnet run plan 5               # planning mode, 5 iterations

var mode = args.Contains("plan") ? "plan" : "build";
var maxArg = args.FirstOrDefault(a => int.TryParse(a, out _));
var maxIterations = maxArg != null ? int.Parse(maxArg) : 50;
var promptFile = mode == "plan" ? "PROMPT_plan.md" : "PROMPT_build.md";

var client = new CopilotClient();
await client.StartAsync();

Console.WriteLine(new string('━', 40));
Console.WriteLine($"Mode:   {mode}");
Console.WriteLine($"Prompt: {promptFile}");
Console.WriteLine($"Max:    {maxIterations} iterations");
Console.WriteLine(new string('━', 40));

try
{
    var prompt = await File.ReadAllTextAsync(promptFile);

    for (var i = 1; i <= maxIterations; i++)
    {
        Console.WriteLine($"\n=== Iteration {i}/{maxIterations} ===");

        // Fresh session — each task gets full context budget
        var session = await client.CreateSessionAsync(
            new SessionConfig
            {
                Model = "gpt-5.1-codex-mini",
                // Pin the agent to the project directory
                WorkingDirectory = Environment.CurrentDirectory,
                // Auto-approve tool calls for unattended operation
                OnPermissionRequest = (_, _) => Task.FromResult(
                    new PermissionRequestResult { Kind = "approved" }),
            });

        try
        {
            var done = new TaskCompletionSource<string>();
            session.On(evt =>
            {
                // Log tool usage for visibility
                if (evt is ToolExecutionStartEvent toolStart)
                    Console.WriteLine($"  ⚙ {toolStart.Data.ToolName}");
                else if (evt is AssistantMessageEvent msg)
                    done.TrySetResult(msg.Data.Content);
            });

            await session.SendAsync(new MessageOptions { Prompt = prompt });
            await done.Task;
        }
        finally
        {
            await session.DisposeAsync();
        }

        Console.WriteLine($"\nIteration {i} complete.");
    }

    Console.WriteLine($"\nReached max iterations: {maxIterations}");
}
finally
{
    await client.StopAsync();
}
