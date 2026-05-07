---
name: mvvm-toolkit
description: 'CommunityToolkit.Mvvm (the MVVM Toolkit) reference for ViewModels, source generators ([ObservableProperty], [RelayCommand], [NotifyPropertyChangedFor], [NotifyCanExecuteChangedFor], [NotifyDataErrorInfo], [NotifyPropertyChangedRecipients]), base classes (ObservableObject / ObservableValidator / ObservableRecipient), commands (RelayCommand / AsyncRelayCommand), Messenger (WeakReferenceMessenger / StrongReferenceMessenger / IRecipient<T> / RequestMessage<T>), and Microsoft.Extensions.DependencyInjection integration. Use across WPF, WinUI 3, MAUI, Uno, Avalonia, and any .NET Standard 2.0+ XAML stack.'
---

# CommunityToolkit.Mvvm (MVVM Toolkit)

Use this skill when building or reviewing ViewModels, commands, messaging,
validation, or DI wiring in apps that use `CommunityToolkit.Mvvm` 8.x. The
toolkit is UI-framework-agnostic: it works the same across **WPF, WinUI 3,
UWP, .NET MAUI, Uno Platform, Avalonia, WinForms, and Xamarin**.

> **Quick recap.** Default to `[ObservableProperty]` on private fields in
> `partial` classes, `[RelayCommand]` on instance methods, base class
> `ObservableObject` (or `ObservableValidator` / `ObservableRecipient` when
> you need validation / messaging), `WeakReferenceMessenger.Default` for
> pub/sub, and `Microsoft.Extensions.DependencyInjection` for service +
> ViewModel registration. Resolve dependencies through constructor
> injection — not `Ioc.Default`.

---

## When to use this skill

- Authoring a new ViewModel from scratch
- Refactoring hand-rolled `INotifyPropertyChanged` / `ICommand` boilerplate
- Reviewing PRs that touch `ObservableObject`, `RelayCommand`, or
  `WeakReferenceMessenger`
- Wiring `Microsoft.Extensions.DependencyInjection` into a XAML app
- Diagnosing source-generator errors (`MVVMTK0xxx`), missing `partial`
  modifiers, or weak-reference recipient lifetime issues

---

## Package & setup

Reference the package in your `.csproj`:

```xml
<ItemGroup>
  <PackageReference Include="CommunityToolkit.Mvvm" Version="8.*" />
</ItemGroup>
```

Targets supported by the package itself:

- `netstandard2.0`, `netstandard2.1`, `net6.0` (and newer .NET TFMs through
  multi-targeting). Works on .NET Framework, .NET (Core), .NET Native, Mono.

C# requirements:

- `<LangVersion>` must be high enough to enable source generators (the
  generators ship as a Roslyn analyzer in the same NuGet, no extra package
  reference required).
- Any class that uses `[ObservableProperty]` or `[RelayCommand]` **must be
  `partial`**. If the class is nested, every enclosing type must also be
  declared `partial`.

Namespaces:

```csharp
using CommunityToolkit.Mvvm.ComponentModel;        // ObservableObject, [ObservableProperty], etc.
using CommunityToolkit.Mvvm.Input;                 // [RelayCommand], RelayCommand, AsyncRelayCommand
using CommunityToolkit.Mvvm.Messaging;             // IMessenger, WeakReferenceMessenger
using CommunityToolkit.Mvvm.Messaging.Messages;    // ValueChangedMessage<T>, RequestMessage<T>, etc.
```

---

## Source generators cheat sheet

| Attribute | Applied to | Generates / does | Notes |
|-----------|-----------|------------------|-------|
| `[ObservableProperty]` | private field | Public `INotifyPropertyChanged` property + `OnXxxChanging`/`OnXxxChanged` partial-method hooks | Class **must be `partial`**; field name `name` / `_name` / `m_name` → `Name` |
| `[NotifyPropertyChangedFor(nameof(Other))]` | observable field | Also raises `PropertyChanged` for the listed property when this field changes | Useful for derived/computed properties (e.g. `FullName` from `FirstName`) |
| `[NotifyCanExecuteChangedFor(nameof(MyCommand))]` | observable field | Calls `MyCommand.NotifyCanExecuteChanged()` whenever the field changes | Target must be an `IRelayCommand` property |
| `[NotifyDataErrorInfo]` | observable field on `ObservableValidator` | Calls `ValidateProperty(value)` from the generated setter | Combine with `[Required]`, `[Range]`, `[CustomValidation]`, etc. |
| `[NotifyPropertyChangedRecipients]` | observable field on `ObservableRecipient` | Generates a `Broadcast(oldValue, newValue)` after the change | Sends `PropertyChangedMessage<T>` to subscribers |
| `[RelayCommand]` | instance method | Lazy `RelayCommand` / `AsyncRelayCommand` property exposed as `IRelayCommand` / `IAsyncRelayCommand` | Class **must be `partial`**; method `DoFooAsync` → `DoFooCommand` |
| `[RelayCommand(CanExecute = nameof(CanX))]` | instance method | Wires the command's `CanExecute` to the named method or property | Call `IRelayCommand.NotifyCanExecuteChanged()` (or use `[NotifyCanExecuteChangedFor]`) when the underlying state changes |
| `[RelayCommand(IncludeCancelCommand = true)]` | async method with `CancellationToken` | Also generates `XxxCancelCommand` to signal the token | Bind a "Cancel" button to the cancel command |
| `[RelayCommand(AllowConcurrentExecutions = true)]` | async method | Allows new invocations while an existing one is still pending | Default is `false` (command disables itself while running) |
| `[RelayCommand(FlowExceptionsToTaskScheduler = true)]` | async method | Exceptions surface via `ExecutionTask` and `TaskScheduler.UnobservedTaskException` instead of being awaited and rethrown | Default is await-and-rethrow |
| `[property: SomeAttribute]` | observable field or `[RelayCommand]` method | Forwards `SomeAttribute` onto the generated property | Useful for `[JsonIgnore]`, `[JsonPropertyName]`, etc. |

> **Naming rules to know.** The generator strips a leading `On` and a
> trailing `Async` from the method name when generating a command —
> `OnGreetUserAsync()` becomes `GreetUserCommand`. For `[ObservableProperty]`,
> the field's lowerCamel name becomes UpperCamel; only `_` and `m_` prefixes
> are stripped.

See `references/source-generators.md` for the full attribute reference with
generated-code samples and `references/troubleshooting.md` for common
`MVVMTK0xxx` diagnostics.

---

## ViewModel patterns

### Simple observable property

```csharp
using CommunityToolkit.Mvvm.ComponentModel;

public partial class ContactViewModel : ObservableObject
{
    [ObservableProperty]
    private string? name;

    [ObservableProperty]
    private string? email;
}
```

The generator produces public `Name` and `Email` properties that raise
`PropertyChanging` / `PropertyChanged` and skip change notifications when the
value is unchanged.

### Hooks: `OnXxxChanging` / `OnXxxChanged`

Implement the partial-method hooks (private, no body required if you don't
need them):

```csharp
[ObservableProperty]
private string? name;

partial void OnNameChanging(string? oldValue, string? newValue)
{
    // Validate or veto the change here.
}

partial void OnNameChanged(string? value)
{
    Logger.LogInformation("Name changed to {Name}", value);
}
```

Both single-arg and two-arg overloads (`OnXxxChanging(value)` and
`OnXxxChanging(oldValue, newValue)`) are available. Implement only the ones
you need.

### Dependent properties

```csharp
[ObservableProperty]
[NotifyPropertyChangedFor(nameof(FullName))]
private string? firstName;

[ObservableProperty]
[NotifyPropertyChangedFor(nameof(FullName))]
private string? lastName;

public string FullName => $"{FirstName} {LastName}".Trim();
```

### Dependent commands

```csharp
[ObservableProperty]
[NotifyCanExecuteChangedFor(nameof(SaveCommand))]
private string? name;

[RelayCommand(CanExecute = nameof(CanSave))]
private Task SaveAsync() => repository.SaveAsync(Name!);

private bool CanSave() => !string.IsNullOrWhiteSpace(Name);
```

### Wrapping a non-observable model

When you need a bindable wrapper around a POCO that doesn't implement
`INotifyPropertyChanged`, use the model-aware `SetProperty` overload from
`ObservableObject`:

```csharp
public sealed class ObservableUser(User user) : ObservableObject
{
    public string Name
    {
        get => user.Name;
        set => SetProperty(user.Name, value, user, (u, n) => u.Name = n);
    }
}
```

Pass a static lambda (no captured state) to keep the call allocation-free.

---

## Commands

### `[RelayCommand]` for sync methods

```csharp
[RelayCommand]
private void Refresh() => Items.Reset();
```

Generates `RefreshCommand` exposed as `IRelayCommand`.

### `[RelayCommand]` for async methods

```csharp
[RelayCommand]
private async Task LoadAsync()
{
    Items.Clear();
    foreach (var item in await service.GetItemsAsync())
        Items.Add(item);
}
```

Generates `LoadCommand` (note the `Async` suffix is stripped) exposed as
`IAsyncRelayCommand`. Bind to UI properties such as `IsRunning`,
`ExecutionTask`, and `CanBeCanceled`.

### Cancellable async commands

```csharp
[RelayCommand(IncludeCancelCommand = true)]
private async Task DownloadAsync(CancellationToken token)
{
    await using var stream = await http.GetStreamAsync(url, token);
    // ...
}
```

The toolkit also generates `DownloadCancelCommand` — bind it to a Cancel
button.

### Concurrency and error policies

| Property | Default | When to change |
|----------|---------|----------------|
| `AllowConcurrentExecutions` | `false` | Set `true` if multiple concurrent invocations are safe and desirable. Default disables the command while running. |
| `FlowExceptionsToTaskScheduler` | `false` | Set `true` when the UI binds to `ExecutionTask` and visualizes failures (loading/error states). Default mirrors sync behavior — exceptions crash the app unless caught inside the method. |

### When to use a manual `RelayCommand` / `AsyncRelayCommand`

Most code uses `[RelayCommand]`. Reach for the manual constructors when
you must:

- Own the lifetime of the command across multiple methods or compose it
  dynamically.
- Pass non-trivial `CanExecute` predicates that aren't expressible as a
  single method (e.g., binding to multiple observable sources).

```csharp
public ICommand SaveCommand { get; } =
    new AsyncRelayCommand(SaveAsync, CanSave);
```

See `references/relaycommand-cookbook.md` for sync, async, cancellation,
parallel-task, and error-surfacing recipes.

---

## Base class selection

| Base class | Use when | Adds beyond previous tier |
|-----------|---------|---------------------------|
| `ObservableObject` | Default ViewModel base | `INotifyPropertyChanged`, `INotifyPropertyChanging`, `SetProperty` overloads, `SetPropertyAndNotifyOnCompletion` for `Task` properties |
| `ObservableValidator` | The ViewModel needs `INotifyDataErrorInfo` (forms, settings) | Validation overloads of `SetProperty`, `TrySetProperty`, `ValidateProperty`, `ValidateAllProperties`, `ClearAllErrors` |
| `ObservableRecipient` | The ViewModel needs to send/receive `IMessenger` messages | `Messenger` property, `IsActive`, `OnActivated` / `OnDeactivated`, `Broadcast<T>(old, new, name)` |

You can only inherit from one — `ObservableValidator` and `ObservableRecipient`
both extend `ObservableObject`, so combining them requires composition
(inject `IMessenger` and validate manually).

---

## Messenger

The toolkit ships **two** `IMessenger` implementations:

- `WeakReferenceMessenger.Default` — **the recommended default**. Uses weak
  references to recipients; recipients are eligible for GC even while
  registered. Internal trimming runs during full GCs, so manual `Cleanup()`
  is unnecessary.
- `StrongReferenceMessenger.Default` — faster and less allocation, but
  recipients are pinned for the lifetime of the messenger. **You must
  unregister manually**, or inherit from `ObservableRecipient` (which
  unregisters in `OnDeactivated`).

### Define a message

```csharp
using CommunityToolkit.Mvvm.Messaging.Messages;

public sealed class LoggedInUserChangedMessage(User user)
    : ValueChangedMessage<User>(user);
```

Use `ValueChangedMessage<T>` for one-payload broadcasts. Roll your own type
when you need more fields.

### Send and receive

```csharp
// Recipient
WeakReferenceMessenger.Default.Register<MyViewModel, LoggedInUserChangedMessage>(
    this,
    static (r, m) => r.Handle(m.Value));

// Publisher
WeakReferenceMessenger.Default.Send(new LoggedInUserChangedMessage(user));
```

Always pass the recipient as `r` (don't capture `this` in the lambda). The
`static` modifier prevents accidental closure allocation.

### `IRecipient<TMessage>` style

```csharp
public sealed class MyViewModel : ObservableRecipient,
    IRecipient<LoggedInUserChangedMessage>
{
    public void Receive(LoggedInUserChangedMessage message) { /* ... */ }
}
```

`ObservableRecipient.OnActivated()` calls `Messenger.RegisterAll(this)`
automatically, which subscribes every `IRecipient<T>` interface the type
implements.

### Request/reply

```csharp
public sealed class CurrentUserRequest : RequestMessage<User> { }

// Reply
WeakReferenceMessenger.Default.Register<MyViewModel, CurrentUserRequest>(
    this,
    static (r, m) => m.Reply(r.CurrentUser));

// Ask
User user = WeakReferenceMessenger.Default.Send<CurrentUserRequest>();
```

`AsyncRequestMessage<T>` is the awaitable variant, plus
`CollectionRequestMessage<T>` and `AsyncCollectionRequestMessage<T>` for
multi-recipient fan-in. See `references/messenger-patterns.md`.

### Channels (tokens)

Use a `token` overload to scope messages to a sub-system or window:

```csharp
WeakReferenceMessenger.Default.Register<MyViewModel, MyMessage, int>(this, 42, handler);
WeakReferenceMessenger.Default.Send(new MyMessage(), 42);
```

### Unregistration

Even with `WeakReferenceMessenger`, unregister explicitly when a recipient
is being torn down for performance (avoids dead entries):

```csharp
WeakReferenceMessenger.Default.UnregisterAll(this);
```

`ObservableRecipient.OnDeactivated()` does this for you automatically.

---

## Dependency injection

The MVVM Toolkit deliberately **does not** ship a DI container — it
integrates with `Microsoft.Extensions.DependencyInjection`. Use the .NET
Generic Host or build the `IServiceProvider` directly.

### Recommended composition root

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
                // Services
                services.AddSingleton<IFilesService, FilesService>();
                services.AddSingleton<ISettingsService, SettingsService>();

                // Messenger (optional — defaults are fine for most apps)
                services.AddSingleton<IMessenger>(WeakReferenceMessenger.Default);

                // ViewModels
                services.AddSingleton<ShellViewModel>();
                services.AddTransient<ContactViewModel>();
                services.AddTransient<EditorViewModel>();
            })
            .Build();
    }

    public static T GetService<T>() where T : class
        => ((App)Current).Host.Services.GetRequiredService<T>();
}
```

### Inject through ViewModel constructors

```csharp
public sealed partial class ContactViewModel(
    IFilesService files,
    IMessenger messenger) : ObservableRecipient(messenger)
{
    [ObservableProperty]
    private string? name;

    [RelayCommand]
    private Task SaveAsync() => files.SaveAsync(Name!);
}
```

Constructor injection is the rule. The DI container resolves indirect
dependencies automatically.

### Lifetimes

| Lifetime | Typical use |
|----------|------------|
| `AddSingleton<T>` | Shell / main-window VM, settings, file/HTTP services, single shared messenger |
| `AddTransient<T>` | Per-page or per-document ViewModels (a fresh instance per resolve) |
| `AddScoped<T>` | Mostly for request-scoped server scenarios; rarely needed in XAML apps unless you create explicit scopes |

### Resolving a VM in a View

Avoid `Ioc.Default.GetService<T>()` in user code — it's a service locator
and hides dependencies. Instead, resolve the root VM through DI and let the
constructor cascade pull in everything else:

```csharp
public sealed partial class ContactPage : Page
{
    public ContactPage()
    {
        InitializeComponent();
        DataContext = App.GetService<ContactViewModel>();
    }
}
```

The `Ioc` type still exists for legacy migration scenarios; see
`references/dependency-injection.md` if you must use it.

---

## Validation

Use `ObservableValidator` whenever a ViewModel has user-editable input that
must be checked.

```csharp
using System.ComponentModel.DataAnnotations;
using CommunityToolkit.Mvvm.ComponentModel;

public sealed partial class RegistrationViewModel : ObservableValidator
{
    [ObservableProperty]
    [NotifyDataErrorInfo]
    [Required]
    [MinLength(2), MaxLength(100)]
    private string? name;

    [ObservableProperty]
    [NotifyDataErrorInfo]
    [Required, EmailAddress]
    private string? email;

    [RelayCommand]
    private void Submit()
    {
        ValidateAllProperties();
        if (HasErrors) return;
        // submit
    }
}
```

Other entry points: `TrySetProperty` (set only if validation passes),
`ValidateProperty(value, propertyName)`, `ClearAllErrors()`,
`GetErrors(propertyName)`. Custom validation supports `[CustomValidation]`
methods and custom `ValidationAttribute` subclasses — see
`references/validation.md`.

---

## Common pitfalls (do not do)

1. **Forgetting `partial`.** The generator can't produce a second partial
   declaration if the class isn't `partial`. Compile error
   `MVVMTK0042` / `MVVMTK0008`. Same applies to every enclosing type.
2. **Naming a field with PascalCase.** `[ObservableProperty] private string Name;`
   collides with the generated `Name` property. Use `name`, `_name`, or `m_name`.
3. **Hand-implementing `INotifyPropertyChanged` next to `[ObservableProperty]`.**
   Inherit from `ObservableObject` and let the toolkit do it. Mixing manual
   `RaisePropertyChanged` calls with the generated setter creates duplicate
   notifications.
4. **Capturing `this` in messenger handlers.** Always use the
   `(r, m) => r.Handle(m)` form with `static` so the lambda doesn't allocate
   a closure or pin the recipient.
5. **Using `StrongReferenceMessenger` without `OnDeactivated`.** Strong refs
   leak unless you `UnregisterAll`. Default to `WeakReferenceMessenger` and
   only switch when a profiler shows the messenger is hot.
6. **Calling `Ioc.Default` inside a ViewModel.** Hides dependencies, breaks
   testability, prevents the DI container from validating the graph at
   startup. Inject `IMessenger`, services, and child VMs through the
   constructor.
7. **Returning `async void` from `[RelayCommand]`.** The generator only
   wraps `Task`-returning methods as async commands. `async void` will be
   wrapped as a synchronous `RelayCommand` and exceptions become
   unobserved. Always return `Task`.
8. **Forgetting `[NotifyCanExecuteChangedFor]` on inputs.** Without it, the
   "Save" button stays grey even though `CanSave()` would now return `true`.
9. **Putting `[ObservableProperty]` on a field whose type has no
   `EqualityComparer<T>.Default` semantics that match your intent.** For
   reference types where you mutate-in-place, the setter will see the same
   reference and skip change notifications. Replace the instance instead of
   mutating it.
10. **Using `await ShowAsync()` from inside `[RelayCommand]` without setting
    the `XamlRoot` first** (WinUI 3). Not a toolkit problem per se, but a
    common combination — see the `winui3-migration-guide` skill.

---

## End-to-end mini walkthrough

A two-pane Notes app pattern (mirrors the official WinUI MVVM Toolkit
tutorial). See `references/end-to-end-walkthrough.md` for the full code.

```csharp
public sealed partial class AllNotesViewModel(INotesService notes)
    : ObservableObject
{
    public ObservableCollection<NoteSummary> Notes { get; } = new();

    [RelayCommand]
    private async Task LoadAsync()
    {
        Notes.Clear();
        foreach (var note in await notes.GetAllAsync())
            Notes.Add(note);
    }
}

public sealed partial class NoteViewModel(INotesService notes,
    IMessenger messenger) : ObservableRecipient(messenger)
{
    [ObservableProperty]
    [NotifyCanExecuteChangedFor(nameof(SaveCommand))]
    [NotifyCanExecuteChangedFor(nameof(DeleteCommand))]
    private string? text;

    [ObservableProperty]
    [NotifyCanExecuteChangedFor(nameof(SaveCommand))]
    private string? filename;

    [RelayCommand(CanExecute = nameof(CanSave))]
    private Task SaveAsync()
    {
        Messenger.Send(new NoteSavedMessage(Filename!));
        return notes.SaveAsync(Filename!, Text!);
    }

    [RelayCommand(CanExecute = nameof(CanDelete))]
    private Task DeleteAsync() => notes.DeleteAsync(Filename!);

    private bool CanSave() =>
        !string.IsNullOrWhiteSpace(Filename) && !string.IsNullOrEmpty(Text);

    private bool CanDelete() => !string.IsNullOrWhiteSpace(Filename);
}

public sealed record NoteSavedMessage(string Filename);
```

Wire-up at startup:

```csharp
services.AddSingleton<INotesService, FileSystemNotesService>();
services.AddSingleton<IMessenger>(WeakReferenceMessenger.Default);
services.AddSingleton<AllNotesViewModel>();
services.AddTransient<NoteViewModel>();
```

---

## References

| Topic | Bundled file |
|-------|-------------|
| Every source-generator attribute with examples | [`references/source-generators.md`](references/source-generators.md) |
| Messenger deep dive (request/reply, channels, lifetimes) | [`references/messenger-patterns.md`](references/messenger-patterns.md) |
| Sync, async, cancellable, parallel command recipes | [`references/relaycommand-cookbook.md`](references/relaycommand-cookbook.md) |
| `Microsoft.Extensions.DependencyInjection` integration | [`references/dependency-injection.md`](references/dependency-injection.md) |
| `ObservableValidator` and `INotifyDataErrorInfo` | [`references/validation.md`](references/validation.md) |
| Full WinUI Notes-app walkthrough | [`references/end-to-end-walkthrough.md`](references/end-to-end-walkthrough.md) |
| `MVVMTK0xxx` diagnostics & common build errors | [`references/troubleshooting.md`](references/troubleshooting.md) |

External sources:

- Toolkit docs: <https://learn.microsoft.com/en-us/dotnet/communitytoolkit/mvvm/>
- WinUI MVVM Toolkit tutorial: <https://learn.microsoft.com/en-us/windows/apps/tutorials/winui-mvvm-toolkit/intro>
- DI overview: <https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection>
- Source: <https://github.com/CommunityToolkit/dotnet>
- Samples: <https://github.com/CommunityToolkit/MVVM-Samples>
