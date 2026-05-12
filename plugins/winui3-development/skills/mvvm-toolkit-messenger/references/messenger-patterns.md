# Messenger patterns

`CommunityToolkit.Mvvm.Messaging` provides decoupled pub/sub between
ViewModels (or any objects) without forcing a shared reference graph.

## Choosing an implementation

| Type | When to use |
|------|------------|
| `WeakReferenceMessenger.Default` | **Default.** Recipients held weakly — eligible for GC even if still registered. Internal trimming runs during full GCs. No manual `Cleanup()` required. |
| `StrongReferenceMessenger.Default` | Use when profiling shows the messenger is hot and allocation matters. Recipients are pinned until you `Unregister`. Forgetting to unregister leaks them. |
| Custom `IMessenger` instance | Per-window/per-scope messengers (e.g., one per app window). Construct directly and inject through DI. |

`ObservableRecipient`'s parameterless constructor uses
`WeakReferenceMessenger.Default`. Pass a different `IMessenger` to its
constructor to override.

---

## Defining messages

The toolkit ships a few base classes you can inherit from, but any class
works.

### Plain payload

```csharp
public sealed record ThemeChangedMessage(AppTheme NewTheme);
```

### `ValueChangedMessage<T>`

```csharp
using CommunityToolkit.Mvvm.Messaging.Messages;

public sealed class LoggedInUserChangedMessage(User user)
    : ValueChangedMessage<User>(user);
```

Access the payload via `.Value`.

### Empty signal

```csharp
public sealed record RefreshRequestedMessage;
```

Useful for "reload now" or "save now" broadcasts where there is no payload.

---

## Registering recipients

### Lambda style (recommended)

```csharp
WeakReferenceMessenger.Default.Register<MyViewModel, ThemeChangedMessage>(
    this,
    static (recipient, message) => recipient.OnThemeChanged(message.NewTheme));
```

The `static` modifier ensures the lambda doesn't capture `this` (or any
local variable), keeping it allocation-free and preventing accidental strong
references back to the recipient through closure capture.

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

## Sending messages

```csharp
WeakReferenceMessenger.Default.Send(new ThemeChangedMessage(AppTheme.Dark));

// Empty payloads can use the parameterless overload:
WeakReferenceMessenger.Default.Send<RefreshRequestedMessage>();
```

---

## Channels (tokens)

Send/receive over a named channel to scope messages to a sub-system. The
token is any equatable value (commonly `int`, `string`, or `Guid`).

```csharp
const int LeftPaneChannel = 1;
const int RightPaneChannel = 2;

WeakReferenceMessenger.Default.Register<MyViewModel, RefreshRequestedMessage, int>(
    this, LeftPaneChannel,
    static (r, _) => r.RefreshLeft());

WeakReferenceMessenger.Default.Send(new RefreshRequestedMessage(), LeftPaneChannel);
```

Messages sent without a token use the default shared channel and are
**not** delivered to channel-scoped recipients.

---

## Request / reply

For ask-style scenarios where a recipient should provide a value back to
the sender, use the `RequestMessage<T>` family.

### Sync request

```csharp
public sealed class CurrentUserRequest : RequestMessage<User> { }

// Recipient
WeakReferenceMessenger.Default.Register<UserService, CurrentUserRequest>(
    this,
    static (r, m) => m.Reply(r.CurrentUser));

// Caller
User user = WeakReferenceMessenger.Default.Send<CurrentUserRequest>();
```

The implicit conversion from `CurrentUserRequest` to `User` throws if no
recipient called `Reply`. To check first, capture the message:

```csharp
var request = WeakReferenceMessenger.Default.Send<CurrentUserRequest>();
if (request.HasReceivedResponse)
{
    User user = request.Response;
}
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
a `Reply` from every recipient that handles the message:

```csharp
public sealed class OpenDocumentsRequest : CollectionRequestMessage<Document> { }

var responses = WeakReferenceMessenger.Default.Send<OpenDocumentsRequest>();
foreach (Document doc in responses) { /* ... */ }
```

---

## Unregistering

Always unregister when a recipient's lifetime ends. With
`WeakReferenceMessenger`, this is for performance (trimming dead entries);
with `StrongReferenceMessenger`, it's required to avoid leaks.

```csharp
WeakReferenceMessenger.Default.Unregister<ThemeChangedMessage>(this);
WeakReferenceMessenger.Default.Unregister<ThemeChangedMessage, int>(this, LeftPaneChannel);
WeakReferenceMessenger.Default.UnregisterAll(this);
```

`ObservableRecipient.OnDeactivated()` unregisters everything for you when
`IsActive` flips to `false` — set `IsActive = true` in your activation flow
(e.g., page `OnNavigatedTo`) and `IsActive = false` on tear-down.

---

## Lifetime pitfalls

1. **Closure-captured `this`.** Avoid `(r, m) => OnX(m)` lambdas that
   implicitly capture the enclosing `this`. Use `(r, m) => r.OnX(m)` so the
   recipient is passed in instead.
2. **Long-lived strong-ref recipients.** With `StrongReferenceMessenger`,
   forgetting `UnregisterAll` keeps the recipient (and its entire object
   graph) alive forever.
3. **Inherited message types.** A handler registered for `BaseMessage` is
   **not** invoked for `DerivedMessage : BaseMessage`. Register each
   concrete type you want to handle.
4. **Multiple `ObservableRecipient` activations.** Setting `IsActive = true`
   twice without an intermediate deactivation throws — guard the toggle.
5. **UI-thread marshalling.** The messenger is thread-agnostic. If a
   handler updates UI, marshal manually
   (`DispatcherQueue.TryEnqueue` / `Dispatcher.BeginInvoke`).

---

## Multiple messengers

A common architecture is one messenger per window or per scope:

```csharp
services.AddSingleton<IMessenger>(WeakReferenceMessenger.Default);  // app-wide
services.AddScoped<WindowScopedMessenger>();                        // per-window
```

Inject the appropriate `IMessenger` into the ViewModel constructor:

```csharp
public sealed partial class WindowViewModel(IMessenger messenger)
    : ObservableRecipient(messenger) { /* ... */ }
```

This isolates broadcasts to a single window — useful for multi-window
desktop apps (WinUI 3, WPF, MAUI desktop, Avalonia).
