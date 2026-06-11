# Source generators reference

Complete attribute reference for `CommunityToolkit.Mvvm` 8.x source
generators, with the code each one produces.

> **Universal rule.** Every type that uses one of these attributes — and
> every enclosing type, if nested — must be declared `partial`. The
> generators emit a sibling partial class declaration; without `partial`,
> the compiler reports `MVVMTK0008` / `MVVMTK0042`.

---

## `[ObservableProperty]`

Generates an observable property from a private field.

```csharp
using CommunityToolkit.Mvvm.ComponentModel;

public partial class SampleViewModel : ObservableObject
{
    [ObservableProperty]
    private string? name;
}
```

Generated (simplified):

```csharp
public string? Name
{
    get => name;
    set
    {
        if (!EqualityComparer<string?>.Default.Equals(name, value))
        {
            string? oldValue = name;
            OnNameChanging(value);
            OnNameChanging(oldValue, value);
            OnPropertyChanging();
            name = value;
            OnNameChanged(value);
            OnNameChanged(oldValue, value);
            OnPropertyChanged();
        }
    }
}

partial void OnNameChanging(string? value);
partial void OnNameChanging(string? oldValue, string? newValue);
partial void OnNameChanged(string? value);
partial void OnNameChanged(string? oldValue, string? newValue);
```

### Naming

- Field `name` → property `Name`
- Field `_name` → property `Name`
- Field `m_name` → property `Name`
- Field `Name` (PascalCase) → **error** (collides with generated property)

### Hooks

Implement any subset of the partial methods. Unimplemented hooks are
elided by the compiler — zero runtime cost.

```csharp
[ObservableProperty]
private ChildViewModel? selectedItem;

partial void OnSelectedItemChanging(ChildViewModel? oldValue, ChildViewModel? newValue)
{
    if (oldValue is not null) oldValue.IsSelected = false;
    if (newValue is not null) newValue.IsSelected = true;
}
```

The hook methods are `partial` with no body declaration — you cannot add
an explicit accessibility (no `public`/`private`).

---

## `[NotifyPropertyChangedFor(nameof(Other))]`

Raises `PropertyChanged` for additional properties when this field changes.
Stack multiple attributes for multiple targets.

```csharp
[ObservableProperty]
[NotifyPropertyChangedFor(nameof(FullName))]
[NotifyPropertyChangedFor(nameof(Initials))]
private string? firstName;
```

Use it for derived/computed properties:

```csharp
public string FullName => $"{FirstName} {LastName}";
public string Initials => $"{FirstName?[0]}{LastName?[0]}";
```

---

## `[NotifyCanExecuteChangedFor(nameof(MyCommand))]`

Calls `MyCommand.NotifyCanExecuteChanged()` when this field changes. The
target must be an `IRelayCommand` (or `IAsyncRelayCommand`) property.

```csharp
[ObservableProperty]
[NotifyCanExecuteChangedFor(nameof(SaveCommand))]
[NotifyCanExecuteChangedFor(nameof(SubmitCommand))]
private string? name;

[RelayCommand(CanExecute = nameof(CanSave))]
private Task SaveAsync() => repo.SaveAsync(Name!);

private bool CanSave() => !string.IsNullOrWhiteSpace(Name);
```

> **`MVVMTK0016`** is raised if the target is not an accessible
> `IRelayCommand` property in the same type.

---

## `[NotifyDataErrorInfo]`

Only valid in types that inherit from `ObservableValidator`. Adds a
`ValidateProperty(value)` call inside the generated setter, so DataAnnotation
validators run on every assignment.

```csharp
using System.ComponentModel.DataAnnotations;

public partial class RegistrationViewModel : ObservableValidator
{
    [ObservableProperty]
    [NotifyDataErrorInfo]
    [Required, MinLength(2), MaxLength(100)]
    private string? name;

    [ObservableProperty]
    [NotifyDataErrorInfo]
    [Required, EmailAddress]
    private string? email;
}
```

Only attributes that derive from `ValidationAttribute` are forwarded to the
generated property. Other attributes are ignored unless you use
`[property: ]` (see below).

---

## `[NotifyPropertyChangedRecipients]`

Only valid in types that inherit from `ObservableRecipient`. Adds a
`Broadcast(oldValue, newValue)` call after a successful set, sending a
`PropertyChangedMessage<T>` to all recipients of the active `IMessenger`.

```csharp
public partial class SelectionViewModel : ObservableRecipient
{
    [ObservableProperty]
    [NotifyPropertyChangedRecipients]
    private Item? selectedItem;
}
```

Subscribers can listen with:

```csharp
WeakReferenceMessenger.Default.Register<SelectionViewModel, PropertyChangedMessage<Item>>(
    this,
    static (r, m) =>
    {
        if (m.PropertyName == nameof(SelectionViewModel.SelectedItem))
            r.Handle(m.NewValue);
    });
```

---

## `[RelayCommand]`

Generates a lazy `RelayCommand` / `AsyncRelayCommand` from an instance
method. Exposes it via the `IRelayCommand` / `IAsyncRelayCommand` interface.

```csharp
[RelayCommand]
private void Refresh() => Items.Reset();
```

```csharp
private RelayCommand? refreshCommand;
public IRelayCommand RefreshCommand =>
    refreshCommand ??= new RelayCommand(Refresh);
```

### Naming

- `Refresh` → `RefreshCommand`
- `OnRefresh` → `RefreshCommand` (leading `On` stripped)
- `LoadAsync` → `LoadCommand` (trailing `Async` stripped)
- `OnLoadAsync` → `LoadCommand` (both stripped)

### Sync with parameter

```csharp
[RelayCommand]
private void GreetUser(User user) => Console.WriteLine($"Hello {user.Name}");
```

Generates `IRelayCommand<User> GreetUserCommand` (a typed command).

### Async without cancellation

```csharp
[RelayCommand]
private async Task GreetUserAsync()
{
    var user = await users.GetCurrentAsync();
    Console.WriteLine($"Hello {user.Name}");
}
```

Generates `IAsyncRelayCommand GreetUserCommand` backed by
`AsyncRelayCommand`.

### Async with cancellation

```csharp
[RelayCommand]
private async Task GreetUserAsync(CancellationToken token)
{
    try
    {
        var user = await users.GetCurrentAsync(token);
        Console.WriteLine($"Hello {user.Name}");
    }
    catch (OperationCanceledException) { /* expected */ }
}
```

The toolkit propagates a `CancellationToken` to the wrapped method. Calling
`GreetUserCommand.Cancel()` signals it.

### `IncludeCancelCommand = true`

Generates a paired `XxxCancelCommand` whose `CanExecute` is wired to the
underlying async command's `IsRunning` state — bind it to a Cancel button:

```csharp
[RelayCommand(IncludeCancelCommand = true)]
private async Task DownloadAsync(CancellationToken token) { /* ... */ }
```

```xml
<Button Command="{x:Bind ViewModel.DownloadCommand}" Content="Download"/>
<Button Command="{x:Bind ViewModel.DownloadCancelCommand}" Content="Cancel"/>
```

### `CanExecute = nameof(MethodOrProperty)`

```csharp
[RelayCommand(CanExecute = nameof(CanGreetUser))]
private void GreetUser(User? user) => Console.WriteLine($"Hello {user!.Name}");

private bool CanGreetUser(User? user) => user is not null;
```

The `CanExecute` member is invoked initially when the command is bound, and
again every time the command's `NotifyCanExecuteChanged` runs (use
`[NotifyCanExecuteChangedFor]` to wire that automatically when bound state
changes).

### `AllowConcurrentExecutions = true`

Default is `false`: while an invocation is pending, the command reports
itself as not executable. Setting `true` allows queued/parallel invocations.

```csharp
[RelayCommand(AllowConcurrentExecutions = true)]
private async Task PingAsync() { /* fire-and-keep-going */ }
```

When the wrapped method takes a `CancellationToken` and concurrent execution
is **not** allowed, requesting a new execution while one is pending cancels
the prior token first.

### `FlowExceptionsToTaskScheduler = true`

Default is await-and-rethrow (exceptions crash the app, mirroring sync
commands). Setting `true` routes exceptions through `ExecutionTask` and
`TaskScheduler.UnobservedTaskException` instead — useful when the UI binds
to `ExecutionTask.Status` to render error states.

```csharp
[RelayCommand(FlowExceptionsToTaskScheduler = true)]
private async Task LoadAsync(CancellationToken token) { /* ... */ }
```

---

## `[property: SomeAttribute(...)]`

Forwards an attribute onto the generated property (for either
`[ObservableProperty]` fields or `[RelayCommand]` methods).

```csharp
[ObservableProperty]
[property: JsonRequired]
[property: JsonPropertyName("name")]
private string? username;

[RelayCommand]
[property: JsonIgnore]
private void GreetUser(User user) { /* ... */ }
```

Use this for serialization attributes (`[JsonIgnore]`,
`[JsonPropertyName]`, `[XmlElement]`), data attributes (`[Display(Name=...)]`),
or any other attribute that needs to live on the property/command instead of
on the field/method.

---

## `[INotifyPropertyChanged]` (class-level)

Use only when you can't inherit from `ObservableObject` (e.g., the type
already inherits from a different base). Generates the
`INotifyPropertyChanged` plumbing on the type itself.

```csharp
using CommunityToolkit.Mvvm.ComponentModel;

[INotifyPropertyChanged]
public partial class MyControl : UserControl
{
    [ObservableProperty]
    private string? caption;
}
```

Prefer `ObservableObject` (or `ObservableValidator` /
`ObservableRecipient`) inheritance whenever possible. The class-level
attribute exists primarily for inheritance-locked scenarios such as
custom controls and platform base types.

There is also `[ObservableObject]` (class-level) for the same purpose if
you want the full `SetProperty<T>` API surface generated onto the type
without inheritance.
