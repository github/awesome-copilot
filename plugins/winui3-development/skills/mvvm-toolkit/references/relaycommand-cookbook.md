# RelayCommand cookbook

Recipes for `RelayCommand` / `AsyncRelayCommand` and the `[RelayCommand]`
generator. Defaults to the generator-attribute style; manual constructor
patterns are listed at the bottom for advanced cases.

---

## Sync command

```csharp
[RelayCommand]
private void IncrementCounter() => Counter++;
```

```xml
<Button Command="{x:Bind ViewModel.IncrementCounterCommand}" Content="+1"/>
```

## Sync command with parameter

```csharp
[RelayCommand]
private void RemoveItem(Item item) => Items.Remove(item);
```

```xml
<Button Command="{x:Bind ViewModel.RemoveItemCommand}"
        CommandParameter="{x:Bind Item}" Content="Remove"/>
```

The generator picks `IRelayCommand<Item>` based on the parameter type.

## Sync command with `CanExecute`

```csharp
[ObservableProperty]
[NotifyCanExecuteChangedFor(nameof(SubmitCommand))]
private string? text;

[RelayCommand(CanExecute = nameof(CanSubmit))]
private void Submit() => service.Submit(Text!);

private bool CanSubmit() => !string.IsNullOrWhiteSpace(Text);
```

`[NotifyCanExecuteChangedFor]` raises `CanExecuteChanged` automatically
whenever `Text` changes — without it, the button stays disabled even after
the user types.

---

## Async command

```csharp
[RelayCommand]
private async Task LoadAsync()
{
    Items.Clear();
    foreach (var item in await service.GetItemsAsync())
        Items.Add(item);
}
```

Bind the UI to `LoadCommand.IsRunning` to show a spinner:

```xml
<ProgressRing IsActive="{x:Bind ViewModel.LoadCommand.IsRunning, Mode=OneWay}"/>
```

## Async command with cancellation

```csharp
[RelayCommand(IncludeCancelCommand = true)]
private async Task DownloadAsync(CancellationToken token)
{
    try
    {
        await using var stream = await http.GetStreamAsync(url, token);
        // ...
    }
    catch (OperationCanceledException)
    {
        // Expected — user cancelled.
    }
}
```

```xml
<Button Command="{x:Bind ViewModel.DownloadCommand}" Content="Download"/>
<Button Command="{x:Bind ViewModel.DownloadCancelCommand}" Content="Cancel"/>
```

`DownloadCancelCommand.CanExecute` is automatically wired to
`DownloadCommand.IsRunning`.

## Async command with concurrency

```csharp
[RelayCommand(AllowConcurrentExecutions = true)]
private async Task PingAsync(string host)
{
    await pingService.PingAsync(host);
}
```

Default (`AllowConcurrentExecutions = false`) reports the command as
disabled while a previous execution is pending. Set to `true` for
fire-and-forget patterns where overlapping invocations are safe.

## Async command that surfaces errors to UI

```csharp
[RelayCommand(FlowExceptionsToTaskScheduler = true)]
private async Task SyncAsync(CancellationToken token)
{
    await syncService.SyncAsync(token);
}
```

```xml
<TextBlock Text="{x:Bind ViewModel.SyncCommand.ExecutionTask.Exception, Mode=OneWay}"/>
```

Without `FlowExceptionsToTaskScheduler = true`, an uncaught exception in
`SyncAsync` will crash the app (mirroring sync commands). With it, the
exception is surfaced through `ExecutionTask` and bubbles to
`TaskScheduler.UnobservedTaskException`.

## Showing async command status

```xml
<StackPanel>
    <ProgressRing IsActive="{x:Bind ViewModel.SyncCommand.IsRunning, Mode=OneWay}"/>
    <TextBlock Text="{x:Bind ViewModel.SyncCommand.ExecutionTask.Status, Mode=OneWay}"/>
</StackPanel>
```

Useful properties on `IAsyncRelayCommand`:

| Property | Type | Purpose |
|----------|------|---------|
| `ExecutionTask` | `Task?` | The currently running (or last completed) task |
| `IsRunning` | `bool` | `true` while a task is in flight |
| `CanBeCanceled` | `bool` | `true` if the wrapped method takes a `CancellationToken` |
| `IsCancellationRequested` | `bool` | `true` after `Cancel()` was called for the in-flight task |

Methods:

| Method | Purpose |
|--------|---------|
| `Cancel()` | Signals the active `CancellationToken` |
| `NotifyCanExecuteChanged()` | Re-evaluates `CanExecute` and raises `CanExecuteChanged` |

---

## Forwarding attributes to the generated command property

```csharp
[RelayCommand]
[property: JsonIgnore]
[property: Description("Saves the current document")]
private Task SaveAsync() => repo.SaveAsync(Text!);
```

The generator emits `SaveCommand` with `[JsonIgnore]` and `[Description]`
applied — useful when the VM is serialized.

---

## Manual `RelayCommand` / `AsyncRelayCommand`

Reach for the manual constructors when you need:

- A command composed from multiple methods or dynamically rebuilt
- A `CanExecute` predicate built from external observables
- An ICommand instance held in a field (rare; the generator's lazy property
  is enough for almost every case)

```csharp
public sealed class CounterViewModel : ObservableObject
{
    public CounterViewModel()
    {
        IncrementCommand = new RelayCommand(() => Counter++);
        DecrementCommand = new RelayCommand(() => Counter--, () => Counter > 0);
    }

    [ObservableProperty]
    private int counter;

    public IRelayCommand IncrementCommand { get; }
    public IRelayCommand DecrementCommand { get; }
}
```

```csharp
public sealed class DownloadViewModel : ObservableObject
{
    public DownloadViewModel()
    {
        DownloadCommand = new AsyncRelayCommand(DownloadAsync, () => CanDownload);
    }

    [ObservableProperty]
    private bool canDownload = true;

    public IAsyncRelayCommand DownloadCommand { get; }

    private async Task DownloadAsync()
    {
        CanDownload = false;
        try { await http.DownloadAsync(); }
        finally { CanDownload = true; }
    }
}
```

Trigger `CanExecute` re-evaluation manually with
`SomeCommand.NotifyCanExecuteChanged()`.

---

## `Task.WhenAll` from a single command

```csharp
[RelayCommand]
private async Task SyncAllAsync(CancellationToken token)
{
    var tasks = providers.Select(p => p.SyncAsync(token));
    await Task.WhenAll(tasks);
}
```

If you want individual progress tracking per provider, expose one command
per provider instead.

---

## Common mistakes

1. **`async void` instead of `async Task`.** The generator only wraps
   `Task`-returning methods as `IAsyncRelayCommand`. `async void` becomes a
   sync `RelayCommand` and exceptions are unobserved.
2. **Forgetting `[NotifyCanExecuteChangedFor]`.** The button stays disabled
   even though `CanX()` would now return `true`.
3. **Calling `Cancel()` on a non-cancellable command.** Only commands whose
   wrapped method accepts a `CancellationToken` honor `Cancel()`.
4. **Catching `OperationCanceledException` and rethrowing as a different
   type.** Loses cancellation semantics; `ExecutionTask.IsCanceled` will be
   `false`. Let `OperationCanceledException` propagate (or return).
5. **Awaiting `IAsyncRelayCommand.ExecuteAsync()` from inside another
   `[RelayCommand]`.** Prefer calling the underlying method directly to
   avoid double-wrapping the cancellation/concurrency semantics.
