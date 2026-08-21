---
name: system-commandline-cli
description: "Use this skill when adding, modifying, or reviewing CLI commands in a .NET project built with System.CommandLine. Triggers include: creating a new CLI command, adding options or arguments, wiring command handlers, registering subcommands, building command groups, or any architecture decision about CLI command structure. Also use when the user mentions 'System.CommandLine', 'CommandBase', 'SetAction', 'ParseResult', 'RootCommand', 'subcommand', or asks to add a verb to the CLI. Do NOT use for general C# coding, web APIs, UI work, or non-CLI projects."
---

# System.CommandLine CLI Developer Skill

You are working on a .NET CLI application built with **System.CommandLine v2.x.x**, targeting **.NET 8 or later** or any **.NET Standard 2.0** implementation, including **.NET Framework 4.6.1 or later** and **.NET Core 2.0 or later**.
Follow these rules and patterns strictly when creating or modifying CLI commands.

---

## Architecture Overview

```
<CLI Project>/
├── Program.cs                       # Entry point and command invocation
└── Commands/
    ├── CommandBase.cs               # Base class for all commands
    ├── GlobalOptions.cs             # Defines global options for the CLI
    ├── RootCommand.cs               # Registers top-level commands
    └── <Group>/                     # One folder per command group
        ├── <Group>Command.cs        # Parent command that registers its children
        └── <Group><Verb>Command.cs  # Leaf command with its handler
```


---

## RULE 1 — Prefer a Project-Specific Command Base Class

Prefer defining a project-specific abstract `CommandBase` that inherits from `System.CommandLine.Command`. Concrete commands should inherit from this base class so shared behavior and conventions remain centralized.

```csharp
internal abstract class CommandBase : Command
{
    protected CommandBase(string name, string? description = null)
        : base(name, description)
    {
    }
}

internal sealed class MyCommand : CommandBase
{
    public MyCommand()
        : base("command-name", "Help text shown in --help")
    {
        this.SetAction(CommandHandler);
    }

    private async Task<int> CommandHandler(
        ParseResult parseResult,
        CancellationToken cancellationToken)
    {
        // implementation
        return 0;
    }
}
```

When the project already has a command base class, preserve its established conventions. Otherwise, introduce one when commands need shared behavior; simple applications may inherit from `Command` directly when a base class adds no meaningful value.

---

## RULE 2 — Options and Arguments

### Defining Options

```csharp
private readonly Option<string> _myOption;

// In constructor:
_myOption = new Option<string>("--my-option")
{
    Description = "Clear description of what this option does",
    Required = true,   // or false
};
_myOption.Aliases.Add("-m");       // Add a short alias
this.Options.Add(_myOption);
```

### Defining Arguments (positional)

```csharp
private readonly Argument<string> _fileArgument;

// In constructor:
_fileArgument = new Argument<string>("file")
{
    Description = "Path to the input file"
};
this.Arguments.Add(_fileArgument);
```

### Reading Values in Handlers

```csharp
// Required option/argument — use GetValue:
var value = parseResult.GetValue(_myOption);
```

---

## RULE 3 — Command Handler Pattern

Handlers are **async methods** wired via `SetAction`:

```csharp
this.SetAction(CommandHandler);

private async Task<int> CommandHandler(ParseResult parseResult, CancellationToken cancellationToken)
{
    // 1. Read option/argument values
    // 2. Load session settings (if needed)
    // 3. Validate configuration early — fail fast with clear error
    // 4. Execute business logic
    // 5. Output results with Console

    return 0; // or non-zero exit code
}
```

---

## RULE 4 — Command Group (Parent with Subcommands)

A **group command** registers children but does **not** call `SetAction`:

```csharp
internal class MyGroupCommand : CommandBase
{
    public MyGroupCommand()
        : base("mygroup", "Manages my-group resources")
    {
        this.Subcommands.Add(new MyGroupListCommand());
        this.Subcommands.Add(new MyGroupCreateCommand());
        this.Subcommands.Add(new MyGroupDeleteCommand());
    }
}
```

A command may define both an action and subcommands when the direct invocation has meaningful behavior.

---

## RULE 5 — Registration

- **Top-level commands** → register in `RootCommand.cs`:
  ```csharp
  this.Subcommands.Add(new MyGroupCommand());
  ```

- **Subcommands** → register inside the parent command's constructor:
  ```csharp
  this.Subcommands.Add(new MyGroupCreateCommand());
  ```

---

## RULE 6 — User Confirmation for Destructive Operations

```csharp
Console.WriteLine("Are you sure you want to delete X? This action cannot be undone. (yes/no)");
var confirmation = Console.ReadLine();
if (confirmation?.ToLower() != "yes" && confirmation?.ToLower() != "y")
{
    Console.WriteLine("Operation cancelled.");
    return 0;
}
```

---

## RULE 7 — Command Logic

The logic of each command should be in one or more **service classes** that implement interfaces.
The command receives interfaces through **dependency injection (DI)**, not concrete implementations.
The command handler should not contain business logic.
The command handler should be thin, responsible only for:
1. Parsing input
2. Validating configuration
3. Calling the service method
4. Outputting results

Service class should be injected in the command constructor via DI, not instantiated directly.

---

## RULE 8 — Dependency Injection

Services are registered in `Program.cs`:

```csharp
serviceCollection.TryAddSingleton<IMyService, MyServiceImpl>();
```

Add a convenience extension in `ServiceProviderExtensions.cs`:

```csharp
public static IMyService GetMyService(this ServiceProvider provider)
    => provider.GetRequiredService<IMyService>();
```

---

## RULE 9 — Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| CLI command name | lowercase kebab-case | `agent create`, `set show` |
| Command class | PascalCase + `Command` suffix | `AgentCreateCommand` |
| Option field | `_camelCaseOption` (private readonly) | `_projectNameOption` |
| Option long name | `--kebab-case` | `--project-name` |
| Option short alias | `-x` (1-2 chars) | `-p`, `-id`, `-md` |
| Argument field | `_camelCaseArgument` | `_fileArgument` |
| Namespace | `MyProject.Commands.<Group>` | `MyProject.Commands.Agent` |
| Folder | `Commands/<Group>/` | `Commands/Agent/` |

---

## RULE 10 — Visibility

- All command classes are `internal`.

---

## RULE 11 — Global Options and Validation

Define options shared by the entire command tree once in `GlobalOptions.cs`. Reuse the same
`Option<T>` instance when registering, validating, and reading the option.

```csharp
internal static class GlobalOptions
{
    public static readonly Option<string> EndpointOption = CreateEndpointOption();

    private static Option<string> CreateEndpointOption()
    {
        var option = new Option<string>(...);

        // add option description, aliases, and Required flag
        // Add validation to the option's Validators collection

        return option;
    }
}
```

### Using Global Options in a Command

Expose repeated parsing or conversion through protected `CommandBase` helpers:

```csharp
/// <summary>Resolves the validated endpoint from the global option.</summary>
protected Uri GetEndpoint(ParseResult parseResult)
{
    var baseUrl = parseResult.GetValue(GlobalOptions.EndpointOption)!;
    return new Uri(baseUrl);
}

/// <summary>Resolves the optional key from the global option.</summary>
protected string? GetKey(ParseResult parseResult)
    => parseResult.GetValue(GlobalOptions.KeyOption);
```

Consume those helpers from the leaf command's handler. The command must not add the global options to its own
`Options` collection; recursive registration on the root already makes them available in its `ParseResult`.

```csharp
private async Task<int> CommandHandler(
    ParseResult parseResult,
    CancellationToken cancellationToken)
{
    var endpoint = GetEndpoint(parseResult);
    var key = GetKey(parseResult);

    ...

    return 0;
}
```

Read a global option directly in a leaf handler only when no shared conversion or fallback logic is needed.
Always use the static `GlobalOptions` symbol; never create a second `Option<T>` with the same aliases.

Follow these requirements:

1. Set `Recursive = true` so the option is accepted for every descendant command.
2. Add each global option exactly once to `RootCommand.Options`; do not duplicate it on leaf commands.
3. Read values through the shared symbol, for example
   `parseResult.GetValue(GlobalOptions.Endpoint)`, preferably behind a `CommandBase` helper.
4. Add validation to the option's `Validators` collection so invalid input becomes a parse error and
   the command handler is not invoked. Do not rely on exceptions from `new Uri(...)` or downstream services.
5. Validate endpoint options as nonblank absolute `http` or `https` URIs. Reject unsupported schemes,
   relative URIs, query strings, and fragments because appending a fixed endpoint path would change their meaning.
6. For optional secret options such as `--key`, allow omission but reject an explicitly supplied blank or
   whitespace-only value. Validate the value without logging, displaying, trimming, or otherwise mutating it.
7. Keep validation separate from derivation.
8. Use stable, actionable validation messages that name the option and the accepted format.
9. Test global options through the root parser, including the default, explicit valid values, invalid values,
   and placement before and after a representative subcommand. Verify invalid input prevents handler execution.

---

## RULE 12 — Checklist for New Commands

When creating a new command, verify:

1. ✅ Inherits from the project’s command base class when one exists or provides meaningful shared behavior
2. ✅ Constructor passes `name`, `description` to base
3. ✅ All options have `Description`, `Required`
4. ✅ Handler wired via `this.SetAction(CommandHandler)`
5. ✅ Handler signature: `async Task<int> CommandHandler(ParseResult, CancellationToken)`
6. ✅ Command registered in parent (RootCommand or group command)
7. ✅ Class is `internal`
8. ✅ File placed in `Commands/<Group>/` folder
9. ✅ Namespace matches folder: `MyProject.CLI.Commands.<Group>`
