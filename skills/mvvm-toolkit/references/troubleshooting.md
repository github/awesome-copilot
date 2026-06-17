# Troubleshooting

Common errors, diagnostics, and gotchas with `CommunityToolkit.Mvvm` 8.x.

---

## Source-generator diagnostics (`MVVMTK0xxx`)

The generators emit numbered diagnostics. The most common ones:

| Code | Meaning | Fix |
|------|---------|-----|
| `MVVMTK0008` | The containing type (or an enclosing type) is not `partial` | Add `partial` to the class declaration **and** every enclosing type |
| `MVVMTK0016` | `[NotifyCanExecuteChangedFor]` target is not an accessible `IRelayCommand` property | Make sure the target is a `[RelayCommand]`-generated command (or a manually declared `IRelayCommand` property) on the same type |
| `MVVMTK0017` | `[NotifyDataErrorInfo]` used outside `ObservableValidator` | Inherit from `ObservableValidator` or remove the attribute |
| `MVVMTK0018` | `[NotifyPropertyChangedRecipients]` used outside `ObservableRecipient` | Inherit from `ObservableRecipient` or remove the attribute |
| `MVVMTK0030` | `[ObservableProperty]` used in a type that does not implement `INotifyPropertyChanged` (and the class-level `[INotifyPropertyChanged]` / `[ObservableObject]` attributes are also missing) | Inherit from `ObservableObject` or apply `[INotifyPropertyChanged]` / `[ObservableObject]` to the type |
| `MVVMTK0042` | The `[ObservableProperty]` field belongs to a generic type without proper `partial` declarations | Same fix as `MVVMTK0008` (add `partial`) |

Search the full table at:
<https://learn.microsoft.com/en-us/dotnet/communitytoolkit/mvvm/generators/errors/>

---

## "Property name collides with field name"

```text
'SampleViewModel' already contains a definition for 'Name'
```

You named the field with PascalCase:

```csharp
[ObservableProperty]
private string Name;   // ❌ collides with generated property
```

Use lowerCamel (or prefixed) instead:

```csharp
[ObservableProperty]
private string? name;   // ✅ generates Name
```

---

## "Setter never raises `PropertyChanged`"

Possible causes:

1. **Same reference assigned.** The generator uses
   `EqualityComparer<T>.Default.Equals` to detect changes. For reference
   types where you mutated the same instance, the comparer returns `true`
   and notification is skipped. Replace the instance instead of mutating.
2. **Property set to identical value.** Same value → no notification by
   design.
3. **Custom comparer needed.** For value types where default equality is
   wrong, write the property by hand and call
   `SetProperty(ref field, value, comparer)`.

---

## "ContentDialog throws `InvalidOperationException`" (WinUI 3)

Not a toolkit issue, but commonly hit from `[RelayCommand]` async methods.
Set `XamlRoot` before calling `ShowAsync()`. See the
`winui3-migration-guide` skill for details.

---

## Async `[RelayCommand]` swallows exceptions

Default behavior: the wrapped task is awaited and the exception is
rethrown on the synchronization context. If your method is `async void`,
the generator wraps it as a sync `RelayCommand` and exceptions become
unobserved. **Always return `Task` from `[RelayCommand]` methods.**

If the UI binds to `ExecutionTask.Exception` to render errors, opt into
`FlowExceptionsToTaskScheduler = true`:

```csharp
[RelayCommand(FlowExceptionsToTaskScheduler = true)]
private async Task LoadAsync(CancellationToken token) { /* ... */ }
```

---

## Cancellation appears to do nothing

- Ensure the wrapped method declares a `CancellationToken` parameter.
- Pass the token down to the awaited APIs (`HttpClient.GetAsync(url, token)`,
  `Task.Delay(ms, token)`, etc.).
- Catch `OperationCanceledException` so the UI doesn't see an error.

---

## Messenger handler never fires

Checklist:

1. The recipient is registered for the **exact** message type, not a base
   type. Inheritance is **not** considered.
2. The same `IMessenger` instance is used to send and register
   (`WeakReferenceMessenger.Default` vs an injected per-window messenger).
3. The token (channel) matches between sender and receiver.
4. With `WeakReferenceMessenger`, the recipient might already have been
   garbage-collected. Hold a strong reference somewhere (typically the DI
   container does this for singleton VMs).
5. With `ObservableRecipient`, `IsActive` must be `true` — `OnActivated`
   is what registers the `IRecipient<T>` handlers.

---

## `OnActivated` never runs

`ObservableRecipient.OnActivated` is invoked when `IsActive` flips from
`false` to `true`. If you never set `IsActive = true`, no handlers register.
Common pattern:

```csharp
protected override void OnNavigatedTo(NavigationEventArgs e)
{
    base.OnNavigatedTo(e);
    ViewModel.IsActive = true;
}

protected override void OnNavigatedFrom(NavigationEventArgs e)
{
    base.OnNavigatedFrom(e);
    ViewModel.IsActive = false;
}
```

---

## Memory leak with `StrongReferenceMessenger`

Strong-ref recipients are pinned until you call `Unregister`. Either:

- Inherit from `ObservableRecipient` (auto-unregisters in `OnDeactivated`).
- Switch to `WeakReferenceMessenger.Default`.
- Call `messenger.UnregisterAll(this)` in your dispose / tear-down path.

---

## "Cannot inherit from `ObservableValidator` and `ObservableRecipient`"

C# single inheritance — pick one. If you need both:

- Inherit from `ObservableRecipient` (or `ObservableValidator`).
- Inject `IMessenger` (or implement validation) on the side via
  composition.

Or use the class-level `[INotifyPropertyChanged]` / `[ObservableObject]`
attribute on a custom base type that wraps both pieces.

---

## DI container can't construct ViewModel

Symptom: `InvalidOperationException` mentioning "Unable to resolve service
for type 'X' while attempting to activate 'MyViewModel'".

Causes:

- Constructor parameter type wasn't registered. Add `services.AddX(...)`.
- Multiple ambiguous constructors — the container picks the longest one
  whose dependencies are all registered. If two constructors qualify, an
  exception is thrown. Mark one as the canonical constructor or remove the
  ambiguity.
- Scoped service injected into a singleton (in dev mode with scope
  validation). Either change the lifetime or inject `IServiceScopeFactory`
  and resolve from a scope.

---

## XAML cannot resolve namespace

```text
The type 'local:ContactViewModel' was not found.
```

XAML namespace mappings need the assembly to be referenced and the
namespace to match. If the VM lives in a class library, the mapping needs
the assembly name:

```xml
xmlns:vm="using:MyApp.Shared.ViewModels;assembly=MyApp.Shared"
```

(WPF syntax differs slightly: `xmlns:vm="clr-namespace:...;assembly=..."`.)

---

## "Design-time data shows nothing"

Design-time XAML editors instantiate the page without your DI container.
Either:

- Provide a parameterless constructor that bootstraps a design-time VM.
- Use `d:DataContext="{d:DesignInstance Type=vm:ContactViewModel, IsDesignTimeCreatable=True}"`.
- Use a separate design-time view model class with hard-coded sample data.

---

## More

- All `MVVMTK0xxx` errors:
  <https://learn.microsoft.com/en-us/dotnet/communitytoolkit/mvvm/generators/errors/>
- Source: <https://github.com/CommunityToolkit/dotnet>
- Sample app: <https://aka.ms/mvvmtoolkit/samples>
