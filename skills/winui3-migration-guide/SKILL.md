---
name: winui3-migration-guide
description: 'UWP-to-WinUI 3 migration reference. Maps legacy UWP APIs to correct Windows App SDK equivalents with before/after code snippets. Covers namespace changes, threading (CoreDispatcher to DispatcherQueue), windowing (CoreWindow to AppWindow), dialogs, pickers, sharing, printing, background tasks, and the most common Copilot code generation mistakes.'
---

# WinUI 3 Migration Guide

Use this skill when migrating UWP apps to WinUI 3 / Windows App SDK, or when verifying that generated code uses correct WinUI 3 APIs instead of legacy UWP patterns.

---

## Namespace Changes

All `Windows.UI.Xaml.*` namespaces move to `Microsoft.UI.Xaml.*`:

| UWP Namespace | WinUI 3 Namespace |
|--------------|-------------------|
| `Windows.UI.Xaml` | `Microsoft.UI.Xaml` |
| `Windows.UI.Xaml.Controls` | `Microsoft.UI.Xaml.Controls` |
| `Windows.UI.Xaml.Media` | `Microsoft.UI.Xaml.Media` |
| `Windows.UI.Xaml.Input` | `Microsoft.UI.Xaml.Input` |
| `Windows.UI.Xaml.Data` | `Microsoft.UI.Xaml.Data` |
| `Windows.UI.Xaml.Navigation` | `Microsoft.UI.Xaml.Navigation` |
| `Windows.UI.Xaml.Shapes` | `Microsoft.UI.Xaml.Shapes` |
| `Windows.UI.Composition` | `Microsoft.UI.Composition` |
| `Windows.UI.Input` | `Microsoft.UI.Input` |
| `Windows.UI.Colors` | `Microsoft.UI.Colors` |
| `Windows.UI.Text` | `Microsoft.UI.Text` |
| `Windows.UI.Core` | `Microsoft.UI.Dispatching` (for dispatcher) |

---

## Top 3 Most Common Copilot Mistakes

### 1. ContentDialog Without XamlRoot

```csharp
// ❌ WRONG — Throws InvalidOperationException in WinUI 3
var dialog = new ContentDialog
{
    Title = "Error",
    Content = "Something went wrong.",
    CloseButtonText = "OK"
};
await dialog.ShowAsync();
```

```csharp
// ✅ CORRECT — Set XamlRoot before showing
var dialog = new ContentDialog
{
    Title = "Error",
    Content = "Something went wrong.",
    CloseButtonText = "OK",
    XamlRoot = this.Content.XamlRoot  // Required in WinUI 3
};
await dialog.ShowAsync();
```

### 2. MessageDialog Instead of ContentDialog

```csharp
// ❌ WRONG — UWP API, not available in WinUI 3 desktop
var dialog = new Windows.UI.Popups.MessageDialog("Are you sure?", "Confirm");
await dialog.ShowAsync();
```

```csharp
// ✅ CORRECT — Use ContentDialog
var dialog = new ContentDialog
{
    Title = "Confirm",
    Content = "Are you sure?",
    PrimaryButtonText = "Yes",
    CloseButtonText = "No",
    XamlRoot = this.Content.XamlRoot
};
var result = await dialog.ShowAsync();
if (result == ContentDialogResult.Primary)
{
    // User confirmed
}
```

### 3. CoreDispatcher Instead of DispatcherQueue

```csharp
// ❌ WRONG — CoreDispatcher does not exist in WinUI 3
await Dispatcher.RunAsync(CoreDispatcherPriority.Normal, () =>
{
    StatusText.Text = "Done";
});
```

```csharp
// ✅ CORRECT — Use DispatcherQueue
DispatcherQueue.TryEnqueue(() =>
{
    StatusText.Text = "Done";
});

// With priority:
DispatcherQueue.TryEnqueue(DispatcherQueuePriority.High, () =>
{
    ProgressBar.Value = 100;
});
```

---

## Windowing Migration

### Window Reference

```csharp
// ❌ WRONG — Window.Current does not exist in WinUI 3
var currentWindow = Window.Current;
```

```csharp
// ✅ CORRECT — Use a static property in App
public partial class App : Application
{
    public static Window MainWindow { get; private set; }

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        MainWindow = new MainWindow();
        MainWindow.Activate();
    }
}
// Access anywhere: App.MainWindow
```

### Window Management

| UWP API | WinUI 3 API |
|---------|-------------|
| `ApplicationView.TryResizeView()` | `AppWindow.Resize()` |
| `AppWindow.TryCreateAsync()` | `AppWindow.Create()` |
| `AppWindow.TryShowAsync()` | `AppWindow.Show()` |
| `AppWindow.TryConsolidateAsync()` | `AppWindow.Destroy()` |
| `AppWindow.RequestMoveXxx()` | `AppWindow.Move()` |
| `AppWindow.GetPlacement()` | `AppWindow.Position` property |
| `AppWindow.RequestPresentation()` | `AppWindow.SetPresenter()` |

### Title Bar

| UWP API | WinUI 3 API |
|---------|-------------|
| `CoreApplicationViewTitleBar` | `AppWindowTitleBar` |
| `CoreApplicationView.TitleBar.ExtendViewIntoTitleBar` | `AppWindow.TitleBar.ExtendsContentIntoTitleBar` |

---

## Dialogs and Pickers Migration

### File/Folder Pickers

```csharp
// ❌ WRONG — UWP style, no window handle
var picker = new FileOpenPicker();
picker.FileTypeFilter.Add(".txt");
var file = await picker.PickSingleFileAsync();
```

```csharp
// ✅ CORRECT — Initialize with window handle
var picker = new FileOpenPicker();
var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(App.MainWindow);
WinRT.Interop.InitializeWithWindow.Initialize(picker, hwnd);
picker.FileTypeFilter.Add(".txt");
var file = await picker.PickSingleFileAsync();
```

## Threading Migration

| UWP Pattern | WinUI 3 Equivalent |
|-------------|-------------------|
| `CoreDispatcher.RunAsync(priority, callback)` | `DispatcherQueue.TryEnqueue(priority, callback)` |
| `Dispatcher.HasThreadAccess` | `DispatcherQueue.HasThreadAccess` |
| `CoreDispatcher.ProcessEvents()` | No equivalent — restructure async code |
| `CoreWindow.GetForCurrentThread()` | Not available — use `DispatcherQueue.GetForCurrentThread()` |

**Key difference**: UWP uses ASTA (Application STA) with built-in reentrancy blocking. WinUI 3 uses standard STA without this protection. Watch for reentrancy issues when async code pumps messages.

---

## Background Tasks Migration

```csharp
// ❌ WRONG — UWP IBackgroundTask
public sealed class MyTask : IBackgroundTask
{
    public void Run(IBackgroundTaskInstance taskInstance) { }
}
```

```csharp
// ✅ CORRECT — Windows App SDK AppLifecycle
using Microsoft.Windows.AppLifecycle;

// Register for activation
var args = AppInstance.GetCurrent().GetActivatedEventArgs();
if (args.Kind == ExtendedActivationKind.AppNotification)
{
    // Handle background activation
}
```

---

## App Settings Migration

| Scenario | Packaged App | Unpackaged App |
|----------|-------------|----------------|
| Simple settings | `ApplicationData.Current.LocalSettings` | JSON file in `LocalApplicationData` |
| Local file storage | `ApplicationData.Current.LocalFolder` | `Environment.GetFolderPath(SpecialFolder.LocalApplicationData)` |

---

## GetForCurrentView() Replacements

All `GetForCurrentView()` patterns are unavailable in WinUI 3 desktop apps:

| UWP API | WinUI 3 Replacement |
|---------|-------------------|
| `UIViewSettings.GetForCurrentView()` | Use `AppWindow` properties |
| `ApplicationView.GetForCurrentView()` | `AppWindow.GetFromWindowId(windowId)` |
| `DisplayInformation.GetForCurrentView()` | Win32 `GetDpiForWindow()` or `XamlRoot.RasterizationScale` |
| `CoreApplication.GetCurrentView()` | Not available — track windows manually |
| `SystemNavigationManager.GetForCurrentView()` | Handle back navigation in `NavigationView` directly |

---

## Testing Migration

UWP unit test projects do not work with WinUI 3. You must migrate to the WinUI 3 test project templates.

| UWP | WinUI 3 |
|-----|---------|
| Unit Test App (Universal Windows) | **Unit Test App (WinUI in Desktop)** |
| Standard MSTest project with UWP types | Must use WinUI test app for Xaml runtime |
| `[TestMethod]` for all tests | `[TestMethod]` for logic, `[UITestMethod]` for XAML/UI tests |
| Class Library (Universal Windows) | **Class Library (WinUI in Desktop)** |

```csharp
// ✅ WinUI 3 unit test — use [UITestMethod] for any XAML interaction
[UITestMethod]
public void TestMyControl()
{
    var control = new MyLibrary.MyUserControl();
    Assert.AreEqual(expected, control.MyProperty);
}
```

**Key:** The `[UITestMethod]` attribute tells the test runner to execute the test on the XAML UI thread, which is required for instantiating any `Microsoft.UI.Xaml` type.

---

## Migration Checklist

1. [ ] Replace all `Windows.UI.Xaml.*` using directives with `Microsoft.UI.Xaml.*`
2. [ ] Replace `Windows.UI.Colors` with `Microsoft.UI.Colors`
3. [ ] Replace `CoreDispatcher.RunAsync` with `DispatcherQueue.TryEnqueue`
4. [ ] Replace `Window.Current` with `App.MainWindow` static property
5. [ ] Add `XamlRoot` to all `ContentDialog` instances
6. [ ] Initialize all pickers with `InitializeWithWindow.Initialize(picker, hwnd)`
7. [ ] Replace `MessageDialog` with `ContentDialog`
8. [ ] Replace `ApplicationView`/`CoreWindow` with `AppWindow`
9. [ ] Replace `CoreApplicationViewTitleBar` with `AppWindowTitleBar`
10. [ ] Replace all `GetForCurrentView()` calls with `AppWindow` equivalents
11. [ ] Update interop for Share and Print managers
12. [ ] Replace `IBackgroundTask` with `AppLifecycle` activation
13. [ ] Update project file: TFM to `net10.0-windows10.0.22621.0`, add `<UseWinUI>true</UseWinUI>`
14. [ ] Migrate unit tests to **Unit Test App (WinUI in Desktop)** project; use `[UITestMethod]` for XAML tests
15. [ ] Test both packaged and unpackaged configurations
