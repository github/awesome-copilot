---
description: 'CommunityToolkit.Mvvm (MVVM Toolkit) coding conventions for ViewModels, commands, messaging, validation, and DI across WPF, WinUI 3, .NET MAUI, Uno Platform, and Avalonia.'
applyTo: '**/*.cs, **/*.xaml, **/*.csproj'
---

# CommunityToolkit.Mvvm (MVVM Toolkit)

These rules apply whenever a project references `CommunityToolkit.Mvvm`.
For deep reference and end-to-end examples, load the `mvvm-toolkit` skill.

## Package & language

- Reference `CommunityToolkit.Mvvm` 8.x (or newer) in `.csproj`. Do not
  install the legacy `Microsoft.Toolkit.Mvvm` (7.x) for new projects.
- C# `LangVersion` must support source generators (default in modern SDKs).

## ViewModel base class

- Inherit ViewModels from `ObservableObject` by default.
- Use `ObservableValidator` only when the ViewModel needs
  `INotifyDataErrorInfo` (forms, settings, input validation).
- Use `ObservableRecipient` only when the ViewModel sends or receives
  `IMessenger` messages.
- Never hand-implement `INotifyPropertyChanged` when one of the toolkit
  base classes can be used. If the type cannot inherit from a toolkit base
  (e.g., a custom control), apply the class-level `[ObservableObject]` or
  `[INotifyPropertyChanged]` attribute instead.

## Properties

- Declare every type that uses `[ObservableProperty]` as `partial` (and
  every enclosing type, if nested).
- Apply `[ObservableProperty]` to private fields named `name`, `_name`, or
  `m_name` — never PascalCase. Let the generator emit the public property.
- Do not write manual `SetProperty(ref field, value)` boilerplate when the
  field qualifies for `[ObservableProperty]`.
- Use `[NotifyPropertyChangedFor(nameof(Derived))]` to raise change
  notifications for derived/computed properties.
- Use `[NotifyCanExecuteChangedFor(nameof(XxxCommand))]` so commands
  re-evaluate `CanExecute` when their inputs change.
- Implement `OnXxxChanging` / `OnXxxChanged` partial-method hooks for
  side-effects on property changes — do not subscribe to your own
  `PropertyChanged` event.
- Use `[property: SomeAttribute]` to forward an attribute (e.g.,
  `[JsonIgnore]`, `[JsonPropertyName(...)]`) onto the generated property.

## Commands

- Use `[RelayCommand]` on instance methods over manually constructed
  `RelayCommand` / `AsyncRelayCommand` instances.
- `[RelayCommand]` methods must return `void` or `Task` (or `Task<T>`).
  Never use `async void` — exceptions become unobserved.
- For cancellable async work, declare a `CancellationToken` parameter and
  optionally set `IncludeCancelCommand = true` to expose a paired
  `XxxCancelCommand`.
- Use `CanExecute = nameof(...)` plus `[NotifyCanExecuteChangedFor]` on the
  inputs to keep button enable/disable state in sync.
- Default `AllowConcurrentExecutions` to `false` (the default). Only set
  `true` when overlapping invocations are explicitly safe and intended.
- Default error policy is await-and-rethrow. Only set
  `FlowExceptionsToTaskScheduler = true` when the UI binds to
  `ExecutionTask` to render error states.

## Messaging

- Default to `WeakReferenceMessenger.Default`. Only switch to
  `StrongReferenceMessenger.Default` when profiling shows the messenger is
  hot, and document the lifetime guarantees.
- Register handlers with the `(recipient, message)` lambda form using the
  `static` modifier — never capture `this` in the lambda.
- Prefer `IRecipient<TMessage>` interfaces on `ObservableRecipient`
  ViewModels so `RegisterAll(this)` wires everything automatically when
  `IsActive = true`.
- Set `IsActive = true` on activation (e.g., `OnNavigatedTo`) and
  `IsActive = false` on deactivation (e.g., `OnNavigatedFrom`).
- Inheritance is not considered when delivering messages — register each
  concrete message type explicitly.
- Use channel tokens (the `int` / `string` / `Guid` overloads) to scope
  messages to a sub-system or window when more than one consumer would
  otherwise collide.

## Dependency injection

- Use `Microsoft.Extensions.DependencyInjection` for service and ViewModel
  registration. Prefer the .NET Generic Host
  (`Host.CreateDefaultBuilder()`) so configuration, logging, and scope
  validation are wired automatically.
- Register services and ViewModels in the composition root (typically
  `App.xaml.cs`). Resolve the page's root ViewModel from DI in the page
  constructor or via the navigation framework.
- Inject services and child ViewModels through constructors. Do not call
  `Ioc.Default.GetService<T>()` from inside ViewModels, services, or any
  type the DI container can construct.
- Lifetimes:
  - `AddSingleton<T>()` — shell/main-window VMs, settings, file/HTTP
    services, the shared `IMessenger`.
  - `AddTransient<T>()` — per-page or per-document VMs.
  - `AddScoped<T>()` — only with explicit `IServiceScope` usage; rarely
    needed in client apps.
- Register `IMessenger` once
  (`services.AddSingleton<IMessenger>(WeakReferenceMessenger.Default)`)
  and inject it via `ObservableRecipient(messenger)` constructors.

## Validation

- Use `ObservableValidator` plus `[NotifyDataErrorInfo]` and DataAnnotation
  attributes (`[Required]`, `[Range]`, `[EmailAddress]`, `[MinLength]`,
  `[MaxLength]`, `[CustomValidation]`).
- Call `ValidateAllProperties()` before submitting a form; check
  `HasErrors` and bail out if `true`.
- Reset error state with `ClearAllErrors()` after a successful submit or
  when resetting a form.
- For cross-property rules, call `ValidateProperty(value, nameof(Other))`
  from the changed property's `OnXxxChanged` hook.

## XAML

- For WinUI 3 / UWP, prefer `{x:Bind}` (compiled bindings) over
  `{Binding}`. Set `Mode=OneWay` or `Mode=TwoWay` explicitly — `{x:Bind}`
  defaults to `OneTime`.
- Bind `Command="{x:Bind ViewModel.SaveCommand}"` directly to the
  generated command property.
- Bind async-command status (`IsRunning`, `ExecutionTask.Status`,
  `ExecutionTask.Exception`) to surface progress/errors instead of
  blocking the UI thread.

## Things to avoid

- `[ObservableProperty] private string Name;` — PascalCase field collides
  with the generated property; use lowerCamel.
- Manual `RaisePropertyChanged(nameof(X))` calls alongside
  `[ObservableProperty]` — produces duplicate notifications.
- `Ioc.Default.GetService<T>()` from inside a ViewModel constructor —
  hides dependencies, breaks unit tests.
- `StrongReferenceMessenger` without `OnDeactivated` / `UnregisterAll` —
  pins recipients and leaks them.
- Capturing `this` in messenger lambdas — closure allocation and
  lifetime confusion. Always use `(r, m) => r.OnX(m)` with `static`.
- `async void` on `[RelayCommand]` methods — return `Task` instead.
- Mutating the same reference held by an `[ObservableProperty]` field —
  the equality comparer returns `true` and no change notification fires.
  Replace the instance instead.
- Inheriting from both `ObservableValidator` and `ObservableRecipient` —
  not possible; use composition (inject `IMessenger` or implement
  validation manually).
