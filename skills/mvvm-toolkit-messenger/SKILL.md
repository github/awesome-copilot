---
name: mvvm-toolkit-messenger
description: 'CommunityToolkit.Mvvm Messenger pub/sub for decoupled communication between ViewModels (or any objects). Covers WeakReferenceMessenger vs StrongReferenceMessenger, IRecipient<TMessage>, RequestMessage<T> / AsyncRequestMessage<T> / CollectionRequestMessage<T>, ValueChangedMessage<T>, channels (tokens), and the ObservableRecipient activation lifecycle. Use across WPF, WinUI 3, .NET MAUI, Uno, and Avalonia.'
---

# CommunityToolkit.Mvvm Messenger

Pub/sub messaging for ViewModels (or any objects) without forcing a shared
reference graph. Part of `CommunityToolkit.Mvvm` 8.x.

> **TL;DR.** Default to `WeakReferenceMessenger.Default`. Register handlers
> with the `(recipient, message)` lambda and the `static` modifier so you
> never capture `this`. Inherit from `ObservableRecipient` and toggle
> `IsActive` at activation/deactivation to get automatic register/unregister.

---

## When to use this skill

- Two or more ViewModels need to react to an event (login, theme change,
  save, navigation) without holding references to each other
- A ViewModel needs to ask another VM for a value (request/reply)
- You're scoping events to a sub-system or window with channel tokens
- Diagnosing "my handler never fires" or weak-reference recipient lifetime
  problems

For source generators, base classes, and commands see the **`mvvm-toolkit`**
skill. For DI wiring (registering an `IMessenger` instance), see
**`mvvm-toolkit-di`**.

---

## Choose an implementation

| Type | When |
|------|------|
| `WeakReferenceMessenger.Default` | **Default.** Recipients held weakly — eligible for GC even while registered. Internal trimming runs during full GCs; no manual `Cleanup()` needed. |
| `StrongReferenceMessenger.Default` | Profiler shows the messenger is hot and allocation matters. Recipients are pinned until you `Unregister`. Forgetting unregistration leaks them. |
| Custom `IMessenger` instance | Per-window/per-scope (e.g., one messenger per app window). Construct directly, inject via DI. |

`ObservableRecipient`'s parameterless constructor uses
`WeakReferenceMessenger.Default`. Pass a different `IMessenger` to its
constructor to override.

---

## Define a message

The toolkit ships base classes; any class works.

```csharp
using CommunityToolkit.Mvvm.Messaging.Messages;

// Single-payload broadcast
public sealed class LoggedInUserChangedMessage(User user)
    : ValueChangedMessage<User>(user);

// Custom shape (records are great for this)
public sealed record ThemeChangedMessage(AppTheme NewTheme);

// Empty signal
public sealed record RefreshRequestedMessage;
```

---

## Register a recipient

### Lambda style (recommended)

```csharp
WeakReferenceMessenger.Default.Register<MyViewModel, ThemeChangedMessage>(
    this,
    static (recipient, message) => recipient.OnThemeChanged(message.NewTheme));
```

The `static` modifier prevents accidental closure allocation and keeps
`this` out of the lambda — use the `recipient` parameter instead.

### `IRecipient<TMessage>` interface style

```csharp
public sealed class MyViewModel : ObservableRecipient,
    IRecipient<ThemeChangedMessage>,
    IRecipient<RefreshRequestedMessage>
{
    public void Receive(ThemeChangedMessage message) { /* ... */ }
    public void Receive(RefreshRequestedMessage message) { /* ... */ }
}
```

`ObservableRecipient.OnActivated()` calls `Messenger.RegisterAll(this)`,
which subscribes every `IRecipient<T>` interface implemented by the type.
If you're not using `ObservableRecipient`, register manually:

```csharp
WeakReferenceMessenger.Default.RegisterAll(this);
```

---

## Send a message

```csharp
WeakReferenceMessenger.Default.Send(new ThemeChangedMessage(AppTheme.Dark));

// Empty payloads use the parameterless overload:
WeakReferenceMessenger.Default.Send<RefreshRequestedMessage>();
```

---

## Channels (tokens)

Scope messages to a sub-system or window with a token (any equatable
value — `int`, `string`, `Guid`):

```csharp
const int LeftPaneChannel = 1;

WeakReferenceMessenger.Default.Register<MyViewModel, RefreshRequestedMessage, int>(
    this, LeftPaneChannel,
    static (r, _) => r.RefreshLeft());

WeakReferenceMessenger.Default.Send(new RefreshRequestedMessage(), LeftPaneChannel);
```

Messages sent without a token use the default shared channel — they are
**not** delivered to channel-scoped recipients.

---

## Request / reply

For ask-style scenarios where a recipient provides a value back to the
sender, use the `RequestMessage<T>` family.

### Sync request

```csharp
public sealed class CurrentUserRequest : RequestMessage<User> { }

WeakReferenceMessenger.Default.Register<UserService, CurrentUserRequest>(
    this,
    static (r, m) => m.Reply(r.CurrentUser));

User user = WeakReferenceMessenger.Default.Send<CurrentUserRequest>();
```

The implicit conversion from `CurrentUserRequest` to `User` throws if no
recipient called `Reply`. Capture the message to check first:

```csharp
var request = WeakReferenceMessenger.Default.Send<CurrentUserRequest>();
if (request.HasReceivedResponse)
    User user = request.Response;
```

### Async request

```csharp
public sealed class CurrentUserRequest : AsyncRequestMessage<User> { }

WeakReferenceMessenger.Default.Register<UserService, CurrentUserRequest>(
    this,
    static (r, m) => m.Reply(r.GetCurrentUserAsync()));

User user = await WeakReferenceMessenger.Default.Send<CurrentUserRequest>();
```

### Collection requests (fan-in)

`CollectionRequestMessage<T>` and `AsyncCollectionRequestMessage<T>` collect
a `Reply` from every responding recipient:

```csharp
public sealed class OpenDocumentsRequest : CollectionRequestMessage<Document> { }

var docs = WeakReferenceMessenger.Default.Send<OpenDocumentsRequest>();
foreach (Document doc in docs) { /* ... */ }
```

---

## Lifecycle

Even with `WeakReferenceMessenger`, unregister explicitly when a recipient
is being torn down — it trims dead entries and improves performance:

```csharp
WeakReferenceMessenger.Default.Unregister<ThemeChangedMessage>(this);
WeakReferenceMessenger.Default.Unregister<ThemeChangedMessage, int>(this, LeftPaneChannel);
WeakReferenceMessenger.Default.UnregisterAll(this);
```

`ObservableRecipient.OnDeactivated()` does this automatically when
`IsActive` flips to `false`. Set it from your activation hook:

```csharp
protected override void OnNavigatedTo(NavigationEventArgs e)
{
    base.OnNavigatedTo(e);
    ViewModel.IsActive = true;
}

protected override void OnNavigatedFrom(NavigationEventArgs e)
{
    ViewModel.IsActive = false;
    base.OnNavigatedFrom(e);
}
```

---

## Common pitfalls

1. **Capturing `this` in the lambda.** `(r, m) => OnX(m)` implicitly
   captures `this`; allocates a closure and confuses lifetime. Always use
   `(r, m) => r.OnX(m)` with `static`.
2. **Strong-ref recipients without `Unregister`.** With
   `StrongReferenceMessenger`, recipients (and their entire object graph)
   stay pinned forever. Either inherit from `ObservableRecipient`
   (auto-unregisters in `OnDeactivated`) or call `UnregisterAll(this)`.
3. **Inherited message types.** A handler registered for `BaseMessage` is
   **not** invoked for `DerivedMessage : BaseMessage`. Register each
   concrete type.
4. **Wrong messenger instance.** Sending via `WeakReferenceMessenger.Default`
   and registering via an injected per-window messenger means the message
   never arrives. Use the same `IMessenger` everywhere (typically inject
   it via `ObservableRecipient(messenger)`).
5. **`OnActivated` never runs.** `ObservableRecipient` only registers
   `IRecipient<T>` handlers when `IsActive` flips from `false` to `true`.
6. **Cross-thread updates.** The messenger is thread-agnostic. If a
   handler updates UI, marshal manually
   (`DispatcherQueue.TryEnqueue` / `Dispatcher.BeginInvoke`).

---

## Multiple messengers (per-window scoping)

```csharp
services.AddSingleton<IMessenger>(WeakReferenceMessenger.Default); // app-wide
services.AddScoped<WindowScopedMessenger>();                       // per-window
```

Inject the appropriate `IMessenger` into the ViewModel constructor:

```csharp
public sealed partial class WindowViewModel(IMessenger messenger)
    : ObservableRecipient(messenger) { }
```

This isolates broadcasts to a single window — useful for multi-window
desktop apps (WinUI 3, WPF, MAUI desktop, Avalonia).

---

## References

| Topic | File |
|-------|------|
| Full deep dive (more channel/lifecycle examples, diagnostics) | [`references/messenger-patterns.md`](references/messenger-patterns.md) |

External:

- Messenger docs: <https://learn.microsoft.com/en-us/dotnet/communitytoolkit/mvvm/messenger>
- `WeakReferenceMessenger` API: <https://learn.microsoft.com/en-us/dotnet/api/communitytoolkit.mvvm.messaging.weakreferencemessenger>
- Source: <https://github.com/CommunityToolkit/dotnet>
