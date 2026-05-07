# Dependency injection

The MVVM Toolkit deliberately ships **no DI container of its own** — it
integrates with `Microsoft.Extensions.DependencyInjection`, the same
container used by ASP.NET Core, Worker services, and the .NET Generic Host.

> **Default to constructor injection.** Resolve services and child
> ViewModels through the constructor of the type that needs them. Avoid the
> service-locator pattern (`Ioc.Default.GetService<T>()`) in user code.

---

## Recommended composition root (Generic Host)

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

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

- `appsettings.json` configuration binding via `Microsoft.Extensions.Configuration`
- Built-in logging via `Microsoft.Extensions.Logging`
- Hosted services (`IHostedService`) for background work
- Scope validation in development builds

> On WPF and Windows Forms, integrate the host lifetime with the
> application lifetime — see
> [Use the .NET Generic Host in a WPF app](https://learn.microsoft.com/en-us/dotnet/desktop/wpf/app-development/how-to-use-host-builder).

---

## Composition root (no Generic Host)

When you don't need configuration/logging/hosting, build the provider
directly:

```csharp
public partial class App : Application
{
    public IServiceProvider Services { get; }

    public App()
    {
        var services = new ServiceCollection();
        services.AddSingleton<IFilesService, FilesService>();
        services.AddTransient<ContactViewModel>();
        Services = services.BuildServiceProvider();
    }

    public static T GetService<T>() where T : class =>
        ((App)Current).Services.GetRequiredService<T>();
}
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

- Dependencies are explicit and visible at the call site.
- Unit tests inject fakes/mocks without resorting to runtime tricks.
- The DI container validates the dependency graph at startup
  (with `BuildServiceProvider(validateScopes: true)` in dev).
- No hidden runtime failures — missing registrations throw immediately.

---

## Lifetimes

| Lifetime | Method | Typical use in XAML apps |
|----------|--------|--------------------------|
| Singleton | `AddSingleton<T>` | Shell/main-window VM, settings, file/HTTP services, the shared `IMessenger`, app-wide caches |
| Transient | `AddTransient<T>` | Per-page or per-document ViewModels (a fresh instance every resolve) |
| Scoped | `AddScoped<T>` | Rarely needed in client apps; useful when you create explicit `IServiceScope`s (per-window scopes, per-request scopes for embedded HTTP) |

```csharp
services.AddSingleton<ShellViewModel>();      // 1 instance for app lifetime
services.AddTransient<NoteViewModel>();        // new instance per resolve
services.AddScoped<DialogService>();           // 1 per scope (rare)
```

---

## Resolving in a View

Resolve the root ViewModel for the page in code-behind, then let it pull
its own dependencies:

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
`{Binding Xxx}` against the `DataContext`.

For navigation frameworks (WinUI 3 `Frame.Navigate`, MAUI Shell, Prism,
MVVMCross), let the framework resolve the page and the page resolves its
ViewModel from DI. Avoid creating ViewModels manually.

---

## `IMessenger` registration

The toolkit provides two implementations. Register the one you want once,
and inject `IMessenger` everywhere:

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

Multiple messengers (e.g., one per window) are also valid — register them
with keyed services or as scoped instances.

---

## Keyed services (.NET 8+)

Useful when you have multiple implementations of the same interface and
want to choose one by key:

```csharp
services.AddKeyedSingleton<IExporter, CsvExporter>("csv");
services.AddKeyedSingleton<IExporter, JsonExporter>("json");

public sealed partial class ExportViewModel(
    [FromKeyedServices("csv")] IExporter csvExporter,
    [FromKeyedServices("json")] IExporter jsonExporter)
    : ObservableObject
{ /* ... */ }
```

---

## Testing seams

Constructor-injected dependencies are trivial to swap in tests. With
`Moq` (or `NSubstitute` / `FakeItEasy`):

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

If you find yourself needing to mock `Ioc.Default` or static state, the
ViewModel is using a service locator — refactor to constructor injection
instead.

---

## Legacy: `Ioc.Default`

The toolkit ships `CommunityToolkit.Mvvm.DependencyInjection.Ioc` for cases
where constructor injection is impossible (e.g., a XAML-instantiated
ViewModel for design-time data, a `ValueConverter`, a control template).

Setup:

```csharp
Ioc.Default.ConfigureServices(
    new ServiceCollection()
        .AddSingleton<IFilesService, FilesService>()
        .AddTransient<ContactViewModel>()
        .BuildServiceProvider());
```

Resolve:

```csharp
var files = Ioc.Default.GetRequiredService<IFilesService>();
```

Treat this as an escape hatch only. Inside ViewModels, services, and any
class you can pass through DI, prefer constructor injection.

---

## Common mistakes

1. **Resolving children from inside a ViewModel constructor via `Ioc`.**
   Hides the dependency. Inject the child VM (or a factory) through the
   constructor instead.
2. **Registering everything as singleton.** A "per-document" ViewModel
   registered as singleton becomes shared state across all documents — a
   subtle data-corruption bug. Use `AddTransient` for per-instance VMs.
3. **Building multiple `ServiceProvider` instances.** Each
   `BuildServiceProvider()` is a fresh container — singletons aren't
   shared. Build once at startup, then reuse.
4. **Capturing the `IServiceProvider` itself in long-lived objects.**
   Indicates a service-locator pattern. Inject the specific dependencies
   you need.
5. **Forgetting to wire scope validation in development.** Use
   `Host.CreateDefaultBuilder()` (which sets `ValidateScopes` and
   `ValidateOnBuild` in development) so registration mistakes fail at
   startup, not at first use.
