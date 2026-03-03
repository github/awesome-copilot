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
- Set `x:DataType` on `DataTemplate` elements when using `{x:Bind}` — this is required for compiled bindings in templates. On Page/UserControl, `x:DataType` enables compile-time binding validation but is not strictly required if the DataContext does not change.
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
- **NativeAOT:** Under Native AOT compilation, `{Binding}` (reflection-based) does not work at all. Only `{x:Bind}` (compiled bindings) is supported. If the project uses NativeAOT, use `{x:Bind}` exclusively.
- Use `x:Load` or `x:DeferLoadStrategy` for UI elements that are not immediately needed.
- Use `ItemsRepeater` with virtualization for large lists.
- Avoid deep layout nesting — prefer `Grid` over nested `StackPanel` chains.
- Use `async`/`await` for all I/O; never block the UI thread.

## App Settings (Packaged vs Unpackaged)

- **Packaged apps**: `ApplicationData.Current.LocalSettings` works as expected.
- **Unpackaged apps**: Use a custom settings file (e.g., JSON in `Environment.GetFolderPath(SpecialFolder.LocalApplicationData)`).
- Do not assume `ApplicationData` is always available — check packaging status first.

## Typography

- **Always** use built-in TextBlock styles (`CaptionTextBlockStyle`, `BodyTextBlockStyle`, `BodyStrongTextBlockStyle`, `SubtitleTextBlockStyle`, `TitleTextBlockStyle`, `TitleLargeTextBlockStyle`, `DisplayTextBlockStyle`).
- Prefer using the built-in TextBlock styles over hardcoding `FontSize`, `FontWeight`, or `FontFamily`.
- Font: Segoe UI Variable is the default — do not change it.
- Use sentence casing for all UI text.


## Theming & Colors

- **Always** use `{ThemeResource}` for brushes and colors to support Light, Dark, and High Contrast themes automatically.
- **Never** hardcode color values (`#FFFFFF`, `Colors.White`, etc.) for UI elements. Use theme resources like `TextFillColorPrimaryBrush`, `CardBackgroundFillColorDefaultBrush`, `CardStrokeColorDefaultBrush`.
- Use `SystemAccentColor` (and `Light1`–`Light3`, `Dark1`–`Dark3` variants) for the user's accent color palette.
- For borders: use `CardStrokeColorDefaultBrush` or `ControlStrokeColorDefaultBrush`.

## Spacing & Layout

- Use a **4px grid system**: all margins, padding, and spacing values must be multiples of 4px.
- Standard spacing: 4 (compact), 8 (controls), 12 (small gutters), 16 (content padding), 24 (large gutters).
- Prefer `Grid` over deeply nested `StackPanel` chains for performance.
- Use `Auto` for content-sized rows/columns, `*` for proportional sizing. Avoid fixed pixel sizes.
- Use `VisualStateManager` with `AdaptiveTrigger` for responsive layouts at breakpoints (640px, 1008px).
- Use `ControlCornerRadius` (4px) for small controls and `OverlayCornerRadius` (8px) for cards, dialogs, flyouts.

## Materials & Elevation

- Use **Mica** (`MicaBackdrop`) for the app window backdrop. Requires transparent layers above to show through.
- Use **Acrylic** for transient surfaces only (flyouts, menus, navigation panes).
- Use `LayerFillColorDefaultBrush` for content layers above Mica.
- Use `ThemeShadow` with Z-axis `Translation` for elevation. Cards: 4–8 px, Flyouts: 32 px, Dialogs: 128 px.

## Motion & Transitions

- Use built-in theme transitions (`EntranceThemeTransition`, `RepositionThemeTransition`, `ContentThemeTransition`, `AddDeleteThemeTransition`).
- Avoid custom storyboard animations when a built-in transition exists.

## Control Selection

- Use `NavigationView` for primary app navigation (not custom sidebars).
- Use `InfoBar` for persistent in-app notifications (not custom banners).
- Use `TeachingTip` for contextual guidance (not custom popups).
- Use `NumberBox` for numeric input (not TextBox with manual validation).
- Use `ToggleSwitch` for on/off settings (not CheckBox).
- Use `ItemsView` as the modern collection control for displaying data with built-in selection, virtualization, and layout flexibility.
- Use `ListView`/`GridView` for standard virtualized lists and grids, especially when built-in selection support is needed.
- Use `ItemsRepeater` only for fully custom virtualizing layouts where you need complete control over rendering and do not need built-in selection or interaction handling.
- Use `Expander` for collapsible sections (not custom visibility toggling).

## Error Handling

- Always wrap `async void` event handlers in try/catch to prevent unhandled crashes.
- Use `InfoBar` (with `Severity = Error`) for user-facing error messages, not `ContentDialog` for routine errors.
- Handle `App.UnhandledException` for logging and graceful recovery.

## Testing

- **NEVER** use a plain MSTest or xUnit project for tests that instantiate WinUI 3 XAML types. Use a **Unit Test App (WinUI in Desktop)** project, which provides the Xaml runtime and UI thread.
- Use `[TestMethod]` for pure logic tests. Use `[UITestMethod]` for any test that creates or interacts with `Microsoft.UI.Xaml` types (controls, pages, user controls).
- Place testable business logic in a **Class Library (WinUI in Desktop)** project, separate from the main app.
- Build the solution before running tests to enable Visual Studio test discovery.

## Resources & Localization

- Store user-facing strings in `Resources.resw` files, not in code or XAML literals.
- Use `x:Uid` in XAML for localized text binding.
- Use DPI-qualified image assets (`logo.scale-200.png`); reference without scale qualifier (`ms-appx:///Assets/logo.png`).
