---
description: 'WinUI 3 and Windows App SDK coding guidelines. Prevents common UWP API misuse, enforces correct XAML namespaces, threading, windowing, and MVVM patterns for desktop Windows apps.'
applyTo: '**/*.xaml, **/*.cs, **/*.csproj'
---

# WinUI 3 / Windows App SDK

## Critical Rules — NEVER Use Legacy UWP APIs

These UWP patterns are **wrong** for WinUI 3 desktop apps. Always use the Windows App SDK equivalent.

- **NEVER** use `Windows.UI.Popups.MessageDialog`. Use `ContentDialog` with `XamlRoot` set.
- **NEVER** show a `ContentDialog` without setting `dialog.XamlRoot = this.Content.XamlRoot` first.
- **NEVER** use `CoreDispatcher.RunAsync` or `Dispatcher.RunAsync`. Use `DispatcherQueue.TryEnqueue`.
- **NEVER** use `Window.Current`. Track the main window via a static `App.MainWindow` property.
- **NEVER** use `Windows.UI.Xaml.*` namespaces. Use `Microsoft.UI.Xaml.*`.
- **NEVER** use `Windows.UI.Composition`. Use `Microsoft.UI.Composition`.
- **NEVER** use `Windows.UI.Colors`. Use `Microsoft.UI.Colors`.
- **NEVER** use `ApplicationView` or `CoreWindow` for window management. Use `Microsoft.UI.Windowing.AppWindow`.
- **NEVER** use `CoreApplicationViewTitleBar`. Use `AppWindowTitleBar`.
- **NEVER** use `GetForCurrentView()` patterns (e.g., `UIViewSettings.GetForCurrentView()`). These do not exist in desktop WinUI 3. Use `AppWindow` APIs instead.
- **NEVER** use UWP `PrintManager` directly. Use `IPrintManagerInterop` with a window handle.
- **NEVER** use `DataTransferManager` directly for sharing. Use `IDataTransferManagerInterop` with a window handle.
- **NEVER** use UWP `IBackgroundTask`. Use `Microsoft.Windows.AppLifecycle` activation.
- **NEVER** use `WebAuthenticationBroker`. Use `OAuth2Manager` (Windows App SDK 1.7+).

## XAML Patterns

- The default XAML namespace maps to `Microsoft.UI.Xaml`, not `Windows.UI.Xaml`.
- Prefer `{x:Bind}` over `{Binding}` for compiled, type-safe, higher-performance bindings.
- Set `x:DataType` on Page/UserControl elements when using `{x:Bind}`.
- Use `Mode=OneWay` for dynamic values, `Mode=OneTime` for static, `Mode=TwoWay` only for editable inputs.
- Do not bind static constants — set them directly in XAML.

## Threading

- Use `DispatcherQueue.TryEnqueue(() => { ... })` to update UI from background threads.
- `TryEnqueue` returns `bool`, not a `Task` — it is fire-and-forget.
- Check thread access with `DispatcherQueue.HasThreadAccess` before dispatching.
- WinUI 3 uses standard STA (not ASTA). No built-in reentrancy protection — be cautious with async code that pumps messages.

## Windowing

- Get the `AppWindow` from a WinUI 3 `Window` via `WindowNative.GetWindowHandle` → `Win32Interop.GetWindowIdFromWindow` → `AppWindow.GetFromWindowId`.
- Use `AppWindow` for resize, move, title, and presenter operations.
- Custom title bar: use `AppWindow.TitleBar` properties, not `CoreApplicationViewTitleBar`.
- Track the main window as `App.MainWindow` (a static property set in `OnLaunched`).

## Dialogs and Pickers

- **ContentDialog**: Always set `dialog.XamlRoot = this.Content.XamlRoot` before calling `ShowAsync()`.
- **File/Folder Pickers**: Initialize with `WinRT.Interop.InitializeWithWindow.Initialize(picker, hwnd)` where `hwnd` comes from `WindowNative.GetWindowHandle(App.MainWindow)`.
- **Share/Print**: Use COM interop interfaces (`IDataTransferManagerInterop`, `IPrintManagerInterop`) with window handles.

## MVVM and Data Binding

- Prefer `CommunityToolkit.Mvvm` (`[ObservableProperty]`, `[RelayCommand]`) for MVVM infrastructure.
- Use `Microsoft.Extensions.DependencyInjection` for service registration and injection.
- Keep UI (Views) focused on layout and bindings; keep logic in ViewModels and services.
- Use `async`/`await` for I/O and long-running work to keep the UI responsive.

## Project Setup

- Target `net10.0-windows10.0.22621.0` (or appropriate TFM for the project's target SDK).
- Set `<UseWinUI>true</UseWinUI>` in the project file.
- Reference the latest stable `Microsoft.WindowsAppSDK` NuGet package.
- Use `System.Text.Json` with source generators for JSON serialization.

## C# Code Style

- Use file-scoped namespaces.
- Enable nullable reference types. Use `is null` / `is not null` instead of `== null`.
- Prefer pattern matching over `as`/`is` with null checks.
- PascalCase for types, methods, properties. camelCase for private fields.
- Allman brace style (opening brace on its own line).
- Prefer explicit types for built-in types; use `var` only when the type is obvious.

## Accessibility

- Set `AutomationProperties.Name` on all interactive controls.
- Use `AutomationProperties.HeadingLevel` on section headers.
- Hide decorative elements with `AutomationProperties.AccessibilityView="Raw"`.
- Ensure full keyboard navigation (Tab, Enter, Space, arrow keys).
- Meet WCAG color contrast requirements.

## Performance

- Prefer `{x:Bind}` (compiled) over `{Binding}` (reflection-based).
- Use `x:Load` or `x:DeferLoadStrategy` for UI elements that are not immediately needed.
- Use `ItemsRepeater` with virtualization for large lists.
- Avoid deep layout nesting — prefer `Grid` over nested `StackPanel` chains.
- Use `async`/`await` for all I/O; never block the UI thread.

## App Settings (Packaged vs Unpackaged)

- **Packaged apps**: `ApplicationData.Current.LocalSettings` works as expected.
- **Unpackaged apps**: Use a custom settings file (e.g., JSON in `Environment.GetFolderPath(SpecialFolder.LocalApplicationData)`).
- Do not assume `ApplicationData` is always available — check packaging status first.
