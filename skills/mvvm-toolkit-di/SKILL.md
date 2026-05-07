---
name: mvvm-toolkit-di
description: 'Wire CommunityToolkit.Mvvm ViewModels into Microsoft.Extensions.DependencyInjection. Covers the .NET Generic Host composition root, constructor injection, service lifetimes (Singleton / Transient / Scoped), IMessenger registration, resolving ViewModels in Views, keyed services, testing seams, and the legacy Ioc.Default escape hatch. Use across WPF, WinUI 3, .NET MAUI, Uno, and Avalonia.'
---

# CommunityToolkit.Mvvm + `Microsoft.Extensions.DependencyInjection`

The MVVM Toolkit deliberately ships **no DI container** — it composes with
`Microsoft.Extensions.DependencyInjection`, the same container ASP.NET
Core, Worker services, and the .NET Generic Host use.

> **TL;DR.** Build the service provider once at startup (prefer
> `Host.CreateDefaultBuilder()`). Register services and ViewModels.
> Inject through constructors. Avoid `Ioc.Default.GetService<T>()`
> in user code.

---

## When to use this skill

- Standing up the composition root for a new XAML app (WPF, WinUI 3,
  MAUI, Uno, Avalonia)
- Choosing service/VM lifetimes
- Wiring `IMessenger` once and injecting it into `ObservableRecipient`
  ViewModels
- Resolving a page's ViewModel without coupling to a service locator
- Diagnosing "Unable to resolve service for type X while attempting to
  activate Y"

For source generators and ViewModel patterns see the **`mvvm-toolkit`**
skill. For Messenger pub/sub see **`mvvm-toolkit-messenger`**.

---

## Recommended composition root (Generic Host)

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using CommunityToolkit.Mvvm.Messaging;

public partial class App : Application
{
    public IHost Host { get; }

    public App()
    {
        Host = Microsoft.Extensions.Hosting.Host
            .CreateDefaultBuilder()
            .ConfigureServices((_, services) =>
            {
                services.AddSingleton<IFilesService, FilesService>();
                services.AddSingleton<ISettingsService, SettingsService>();
                services.AddSingleton<IMessenger>(WeakReferenceMessenger.Default);

                services.AddSingleton<ShellViewModel>();
                services.AddTransient<ContactViewModel>();
                services.AddTransient<EditorViewModel>();
            })
            .Build();
    }

    public static T GetService<T>() where T : class =>
        ((App)Current).Host.Services.GetRequiredService<T>();
}
```

Generic Host benefits:

- `appsettings.json` binding via `Microsoft.Extensions.Configuration`
- Logging via `Microsoft.Extensions.Logging`
- Hosted services (`IHostedService`) for background work
- Scope validation in development builds

> WPF and Windows Forms must integrate the host lifetime with the app
> lifetime — see
> [Use the .NET Generic Host in a WPF app](https://learn.microsoft.com/en-us/dotnet/desktop/wpf/app-development/how-to-use-host-builder).

### Without Generic Host

When you only need a service container and want zero extra dependencies:

```csharp
var services = new ServiceCollection();
services.AddSingleton<IFilesService, FilesService>();
services.AddTransient<ContactViewModel>();
ServiceProvider provider = services.BuildServiceProvider();
```

---

## Constructor injection

Inject services and child ViewModels through the constructor:

```csharp
public sealed partial class ContactViewModel(
    IFilesService files,
    IMessenger messenger,
    ILogger<ContactViewModel> logger)
    : ObservableRecipient(messenger)
{
    [ObservableProperty]
    private string? name;

    [RelayCommand]
    private async Task SaveAsync()
    {
        logger.LogInformation("Saving {Name}", Name);
        await files.SaveAsync(Name!);
    }
}
```

Why constructor injection beats a service locator:

- Dependencies are explicit and visible at the call site
- Unit tests inject fakes/mocks directly
- The DI container validates the dependency graph at startup
- Missing registrations throw immediately, not at first use

---

## Lifetimes

| Lifetime | Method | Typical use in XAML apps |
|----------|--------|--------------------------|
| Singleton | `AddSingleton<T>` | Shell/main-window VM, settings, file/HTTP services, the shared `IMessenger`, app-wide caches |
| Transient | `AddTransient<T>` | Per-page or per-document ViewModels (a fresh instance every resolve) |
| Scoped | `AddScoped<T>` | Rarely needed in client apps; useful with explicit `IServiceScope` (e.g., per-window scopes) |

```csharp
services.AddSingleton<ShellViewModel>();   // 1 instance for app lifetime
services.AddTransient<NoteViewModel>();    // new instance per resolve
services.AddScoped<DialogService>();       // 1 per scope (rare)
```

---

## Resolving in a View

Resolve the page's root ViewModel in code-behind, then let it pull its
own dependencies:

```csharp
public sealed partial class ContactPage : Page
{
    public ContactViewModel ViewModel { get; }

    public ContactPage()
    {
        ViewModel = App.GetService<ContactViewModel>();
        InitializeComponent();
    }
}
```

Bind in XAML with `{x:Bind ViewModel.Xxx}` (compiled bindings) or
`{Binding Xxx}` against `DataContext`.

For navigation frameworks (WinUI 3 `Frame.Navigate`, MAUI Shell, Prism,
MVVMCross), let the framework resolve the page and the page resolves its
ViewModel from DI. Don't `new` ViewModels manually.

---

## `IMessenger` registration

Register the messenger you want once, inject `IMessenger` everywhere:

```csharp
services.AddSingleton<IMessenger>(WeakReferenceMessenger.Default);
// or
services.AddSingleton<IMessenger>(StrongReferenceMessenger.Default);
```

Then:

```csharp
public sealed partial class MyViewModel(IMessenger messenger)
    : ObservableRecipient(messenger) { }
```

For per-window messengers, register with keyed services or as scoped
instances and inject into per-window ViewModels.

See the **`mvvm-toolkit-messenger`** skill for the messenger surface area.

---

## Keyed services (.NET 8+)

Resolve different implementations of the same interface by key:

```csharp
services.AddKeyedSingleton<IExporter, CsvExporter>("csv");
services.AddKeyedSingleton<IExporter, JsonExporter>("json");

public sealed partial class ExportViewModel(
    [FromKeyedServices("csv")] IExporter csvExporter,
    [FromKeyedServices("json")] IExporter jsonExporter)
    : ObservableObject { /* ... */ }
```

---

## Testing seams

Constructor-injected dependencies are trivial to swap in tests. With
`Moq`:

```csharp
[Fact]
public async Task Save_calls_files_service()
{
    var files = new Mock<IFilesService>();
    var messenger = new WeakReferenceMessenger();
    var logger = NullLogger<ContactViewModel>.Instance;

    var vm = new ContactViewModel(files.Object, messenger, logger)
    {
        Name = "Ada"
    };

    await vm.SaveCommand.ExecuteAsync(null);

    files.Verify(f => f.SaveAsync("Ada"), Times.Once);
}
```

If you're mocking `Ioc.Default` or static state, the ViewModel is using a
service locator — refactor to constructor injection.

---

## Legacy: `Ioc.Default`

`CommunityToolkit.Mvvm.DependencyInjection.Ioc` is an escape hatch for
cases where constructor injection is impossible — XAML-instantiated VMs
for design-time data, `ValueConverter`s, control templates.

```csharp
Ioc.Default.ConfigureServices(
    new ServiceCollection()
        .AddSingleton<IFilesService, FilesService>()
        .AddTransient<ContactViewModel>()
        .BuildServiceProvider());

var files = Ioc.Default.GetRequiredService<IFilesService>();
```

Treat it as the last resort. Inside ViewModels, services, and any class
the DI container can construct, prefer constructor injection.

---

## Common pitfalls

1. **`Ioc.Default.GetService<T>()` inside a VM constructor.** Hides the
   dependency, breaks unit tests, prevents startup graph validation.
2. **Everything `Singleton`.** A "per-document" VM registered as singleton
   becomes shared state across all documents — subtle data corruption.
   Use `AddTransient` for per-instance VMs.
3. **Multiple `BuildServiceProvider()` calls.** Each call is a fresh
   container — singletons aren't shared. Build once at startup.
4. **Capturing `IServiceProvider` in long-lived objects.** Indicates a
   service-locator pattern. Inject the specific dependencies you need.
5. **No scope validation in development.** Use `Host.CreateDefaultBuilder()`
   (which sets `ValidateScopes` and `ValidateOnBuild` in development) so
   registration mistakes fail at startup, not at first use.
6. **Resolving scoped services from the root provider.** They're
   effectively promoted to singleton lifetime — the warning is silent
   without scope validation. Either change the lifetime or resolve from
   an explicit `IServiceScope`.

---

## References

| Topic | File |
|-------|------|
| Full deep dive (Generic Host setup, lifetimes, keyed services, testing patterns, legacy Ioc) | [`references/dependency-injection.md`](references/dependency-injection.md) |

External:

- DI overview: <https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection>
- DI usage: <https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection-usage>
- MVVM Toolkit Ioc page: <https://learn.microsoft.com/en-us/dotnet/communitytoolkit/mvvm/ioc>
- Generic Host: <https://learn.microsoft.com/en-us/dotnet/core/extensions/generic-host>
