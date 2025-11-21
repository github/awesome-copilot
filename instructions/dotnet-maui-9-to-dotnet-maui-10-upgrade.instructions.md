---
description: 'Instructions for upgrading .NET MAUI applications from version 9 to version 10, including breaking changes, deprecated APIs, and migration strategies for ListView to CollectionView.'
applyTo: '**/*.csproj, **/*.cs, **/*.xaml'
---

# Upgrading from .NET MAUI 9 to .NET MAUI 10

This guide helps you upgrade your .NET MAUI application from .NET 9 to .NET 10 by focusing on the critical breaking changes and obsolete APIs that require code updates.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Update Target Framework](#update-target-framework)
3. [Breaking Changes (P0 - Must Fix)](#breaking-changes-p0---must-fix)
   - [MessagingCenter Made Internal](#messagingcenter-made-internal)
   - [ListView and TableView Deprecated](#listview-and-tableview-deprecated)
4. [Deprecated APIs (P1 - Fix Soon)](#deprecated-apis-p1---fix-soon)
   - [Animation Methods](#1-animation-methods)
   - [DisplayAlert and DisplayActionSheet](#2-displayalert-and-displayactionsheet)
   - [Page.IsBusy](#3-pageisbusy)
   - [MediaPicker APIs](#4-mediapicker-apis)
5. [Recommended Changes (P2)](#recommended-changes-p2)
6. [Bulk Migration Tools](#bulk-migration-tools)
7. [Testing Your Upgrade](#testing-your-upgrade)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

**Five-Step Upgrade Process:**

1. **Update TargetFramework** to `net10.0`
2. **Update CommunityToolkit.Maui** to 12.3.0+ (if you use it) - REQUIRED
3. **Fix breaking changes** - MessagingCenter (P0)
4. **Migrate ListView/TableView to CollectionView** (P0 - CRITICAL)
5. **Fix deprecated APIs** - Animation methods, DisplayAlert, IsBusy, MediaPicker (P1)

> ⚠️ **Major Breaking Changes**: 
> - CommunityToolkit.Maui **must** be version 12.3.0 or later
> - ListView and TableView are now obsolete (most significant migration effort)

---

## Update Target Framework

### Single Platform

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
  </PropertyGroup>
</Project>
```

### Multi-Platform

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFrameworks>net10.0-android;net10.0-ios;net10.0-maccatalyst;net10.0-windows10.0.19041.0</TargetFrameworks>
  </PropertyGroup>
</Project>
```

### Optional: Linux Compatibility (GitHub Copilot, WSL, etc.)

> 💡 **For Linux Development**: If you're building on Linux (e.g., GitHub Codespaces, WSL, or using GitHub Copilot), you can make your project compile on Linux by conditionally excluding iOS/Mac Catalyst targets:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <!-- Start with Android (always supported) -->
    <TargetFrameworks>net10.0-android</TargetFrameworks>
    
    <!-- Add iOS/Mac Catalyst only when NOT on Linux -->
    <TargetFrameworks Condition="!$([MSBuild]::IsOSPlatform('linux'))">$(TargetFrameworks);net10.0-ios;net10.0-maccatalyst</TargetFrameworks>
    
    <!-- Add Windows only when on Windows -->
    <TargetFrameworks Condition="$([MSBuild]::IsOSPlatform('windows'))">$(TargetFrameworks);net10.0-windows10.0.19041.0</TargetFrameworks>
  </PropertyGroup>
</Project>
```

**Benefits:**
- ✅ Compiles successfully on Linux (no iOS/Mac tools required)
- ✅ Works with GitHub Codespaces and Copilot
- ✅ Automatically includes correct targets based on build OS
- ✅ No changes needed when switching between OS environments

**Reference:** [dotnet/maui#32186](https://github.com/dotnet/maui/pull/32186)

### Update Required NuGet Packages

> ⚠️ **CRITICAL**: If you use CommunityToolkit.Maui, you **must** update to version 12.3.0 or later. Earlier versions are not compatible with .NET 10 and will cause compilation errors.

```bash
# Update CommunityToolkit.Maui (if you use it)
dotnet add package CommunityToolkit.Maui --version 12.3.0

# Update other common packages to .NET 10 compatible versions
dotnet add package Microsoft.Maui.Controls --version 10.0.0
```

**Check all your NuGet packages:**
```bash
# List all packages and check for updates
dotnet list package --outdated

# Update all packages to latest compatible versions
dotnet list package --outdated | grep ">" | cut -d '>' -f 1 | xargs -I {} dotnet add package {}
```

---

## Breaking Changes (P0 - Must Fix)

### MessagingCenter Made Internal

**Status:** 🚨 **BREAKING** - `MessagingCenter` is now `internal` and cannot be accessed.

**Error You'll See:**
```
error CS0122: 'MessagingCenter' is inaccessible due to its protection level
```

**Migration Required:**

#### Step 1: Install CommunityToolkit.Mvvm

```bash
dotnet add package CommunityToolkit.Mvvm --version 8.3.0
```

#### Step 2: Define Message Classes

```csharp
// OLD: No message class needed
MessagingCenter.Send(this, "UserLoggedIn", userData);

// NEW: Create a message class
public class UserLoggedInMessage
{
    public UserData Data { get; set; }
    
    public UserLoggedInMessage(UserData data)
    {
        Data = data;
    }
}
```

#### Step 3: Update Send Calls

```csharp
// ❌ OLD (Broken in .NET 10)
using Microsoft.Maui.Controls;

MessagingCenter.Send(this, "UserLoggedIn", userData);
MessagingCenter.Send<App, string>(this, "StatusChanged", "Active");

// ✅ NEW (Required)
using CommunityToolkit.Mvvm.Messaging;

WeakReferenceMessenger.Default.Send(new UserLoggedInMessage(userData));
WeakReferenceMessenger.Default.Send(new StatusChangedMessage("Active"));
```

#### Step 4: Update Subscribe Calls

```csharp
// ❌ OLD (Broken in .NET 10)
MessagingCenter.Subscribe<App, UserData>(this, "UserLoggedIn", (sender, data) =>
{
    // Handle message
    CurrentUser = data;
});

// ✅ NEW (Required)
WeakReferenceMessenger.Default.Register<UserLoggedInMessage>(this, (recipient, message) =>
{
    // Handle message
    CurrentUser = message.Data;
});
```

#### ⚠️ Important Behavioral Difference: Duplicate Subscriptions

**WeakReferenceMessenger** throws an `InvalidOperationException` if you try to register the same message type multiple times on the same recipient (MessagingCenter allowed this):

```csharp
// ❌ This THROWS InvalidOperationException in WeakReferenceMessenger
WeakReferenceMessenger.Default.Register<UserLoggedInMessage>(this, (r, m) => Handler1(m));
WeakReferenceMessenger.Default.Register<UserLoggedInMessage>(this, (r, m) => Handler2(m)); // ❌ THROWS!

// ✅ Solution 1: Unregister before re-registering
WeakReferenceMessenger.Default.Unregister<UserLoggedInMessage>(this);
WeakReferenceMessenger.Default.Register<UserLoggedInMessage>(this, (r, m) => Handler1(m));

// ✅ Solution 2: Handle multiple actions in one registration
WeakReferenceMessenger.Default.Register<UserLoggedInMessage>(this, (r, m) => 
{
    Handler1(m);
    Handler2(m);
});
```

**Why this matters:** If your code subscribes to the same message in multiple places (e.g., in a page constructor and in `OnAppearing`), you'll get a runtime crash.

#### Step 5: Unregister When Done

```csharp
// ❌ OLD
MessagingCenter.Unsubscribe<App, UserData>(this, "UserLoggedIn");

// ✅ NEW (CRITICAL - prevents memory leaks)
WeakReferenceMessenger.Default.Unregister<UserLoggedInMessage>(this);

// Or unregister all messages for this recipient
WeakReferenceMessenger.Default.UnregisterAll(this);
```

#### Complete Before/After Example

**Before (.NET 9):**
```csharp
// Sender
public class LoginViewModel
{
    public async Task LoginAsync()
    {
        var user = await AuthService.LoginAsync(username, password);
        MessagingCenter.Send(this, "UserLoggedIn", user);
    }
}

// Receiver
public partial class MainPage : ContentPage
{
    public MainPage()
    {
        InitializeComponent();
        
        MessagingCenter.Subscribe<LoginViewModel, User>(this, "UserLoggedIn", (sender, user) =>
        {
            WelcomeLabel.Text = $"Welcome, {user.Name}!";
        });
    }
    
    protected override void OnDisappearing()
    {
        base.OnDisappearing();
        MessagingCenter.Unsubscribe<LoginViewModel, User>(this, "UserLoggedIn");
    }
}
```

**After (.NET 10):**
```csharp
// 1. Define message
public class UserLoggedInMessage
{
    public User User { get; }
    
    public UserLoggedInMessage(User user)
    {
        User = user;
    }
}

// 2. Sender
public class LoginViewModel
{
    public async Task LoginAsync()
    {
        var user = await AuthService.LoginAsync(username, password);
        WeakReferenceMessenger.Default.Send(new UserLoggedInMessage(user));
    }
}

// 3. Receiver
public partial class MainPage : ContentPage
{
    public MainPage()
    {
        InitializeComponent();
        
        WeakReferenceMessenger.Default.Register<UserLoggedInMessage>(this, (recipient, message) =>
        {
            WelcomeLabel.Text = $"Welcome, {message.User.Name}!";
        });
    }
    
    protected override void OnDisappearing()
    {
        base.OnDisappearing();
        WeakReferenceMessenger.Default.UnregisterAll(this);
    }
}
```

**Key Differences:**
- ✅ Type-safe message classes
- ✅ No magic strings
- ✅ Better IntelliSense support
- ✅ Easier to refactor
- ⚠️ **Must remember to unregister!**

---

### ListView and TableView Deprecated

**Status:** 🚨 **DEPRECATED (P0)** - `ListView`, `TableView`, and all Cell types are now obsolete. Migrate to `CollectionView`.

**Warning You'll See:**
```
warning CS0618: 'ListView' is obsolete: 'ListView is deprecated. Please use CollectionView instead.'
warning CS0618: 'TableView' is obsolete: 'Please use CollectionView instead.'
warning CS0618: 'TextCell' is obsolete: 'The controls which use TextCell (ListView and TableView) are obsolete. Please use CollectionView instead.'
```

**Obsolete Types:**
- `ListView` → `CollectionView`
- `TableView` → `CollectionView` (for settings pages, consider vertical StackLayout with BindableLayout)
- `TextCell` → Custom DataTemplate with Label(s)
- `ImageCell` → Custom DataTemplate with Image + Label(s)
- `EntryCell` → Custom DataTemplate with Entry
- `SwitchCell` → Custom DataTemplate with Switch
- `ViewCell` → DataTemplate

**Impact:** This is a **MAJOR** breaking change. ListView and TableView are among the most commonly used controls in MAUI apps.

#### Why This Takes Time

Converting ListView/TableView to CollectionView is not a simple find-replace:

1. **Different event model** - `ItemSelected` → `SelectionChanged` with different arguments
2. **Different grouping** - GroupDisplayBinding no longer exists
3. **Context actions** - Must convert to SwipeView
4. **Item sizing** - `HasUnevenRows` handled differently
5. **Platform-specific code** - iOS/Android ListView platform configurations need removal
6. **Testing required** - CollectionView virtualizes differently, may affect performance

#### Migration Strategy

**Step 1: Inventory Your ListViews**

```bash
# Find all ListView/TableView usages
grep -r "ListView\|TableView" --include="*.xaml" --include="*.cs" .
```

**Step 2: Basic ListView → CollectionView**

**Before (ListView):**
```xaml
<ListView ItemsSource="{Binding Items}"
          ItemSelected="OnItemSelected"
          HasUnevenRows="True">
    <ListView.ItemTemplate>
        <DataTemplate>
            <TextCell Text="{Binding Title}"
                     Detail="{Binding Description}" />
        </DataTemplate>
    </ListView.ItemTemplate>
</ListView>
```

**After (CollectionView):**
```xaml
<CollectionView ItemsSource="{Binding Items}"
                SelectionMode="Single"
                SelectionChanged="OnSelectionChanged">
    <CollectionView.ItemTemplate>
        <DataTemplate>
            <VerticalStackLayout Padding="10">
                <Label Text="{Binding Title}" 
                       FontAttributes="Bold" />
                <Label Text="{Binding Description}"
                       FontSize="12"
                       TextColor="{StaticResource Gray600}" />
            </VerticalStackLayout>
        </DataTemplate>
    </CollectionView.ItemTemplate>
</CollectionView>
```

> ⚠️ **Note:** CollectionView has `SelectionMode="None"` by default (selection disabled). You must explicitly set `SelectionMode="Single"` or `SelectionMode="Multiple"` to enable selection.

**Code-behind changes:**
```csharp
// ❌ OLD (ListView)
void OnItemSelected(object sender, SelectedItemChangedEventArgs e)
{
    if (e.SelectedItem == null)
        return;
        
    var item = (MyItem)e.SelectedItem;
    // Handle selection
    
    // Deselect
    ((ListView)sender).SelectedItem = null;
}

// ✅ NEW (CollectionView)
void OnSelectionChanged(object sender, SelectionChangedEventArgs e)
{
    if (e.CurrentSelection.Count == 0)
        return;
        
    var item = (MyItem)e.CurrentSelection.FirstOrDefault();
    // Handle selection
    
    // Deselect (optional)
    ((CollectionView)sender).SelectedItem = null;
}
```

**Step 3: Grouped ListView → Grouped CollectionView**

**Before (Grouped ListView):**
```xaml
<ListView ItemsSource="{Binding GroupedItems}"
          IsGroupingEnabled="True"
          GroupDisplayBinding="{Binding Key}">
    <ListView.ItemTemplate>
        <DataTemplate>
            <TextCell Text="{Binding Name}" />
        </DataTemplate>
    </ListView.ItemTemplate>
</ListView>
```

**After (Grouped CollectionView):**
```xaml
<CollectionView ItemsSource="{Binding GroupedItems}"
                IsGrouped="true">
    <CollectionView.GroupHeaderTemplate>
        <DataTemplate>
            <Label Text="{Binding Key}"
                   FontAttributes="Bold"
                   BackgroundColor="{StaticResource Gray100}"
                   Padding="10,5" />
        </DataTemplate>
    </CollectionView.GroupHeaderTemplate>
    
    <CollectionView.ItemTemplate>
        <DataTemplate>
            <VerticalStackLayout Padding="20,10">
                <Label Text="{Binding Name}" />
            </VerticalStackLayout>
        </DataTemplate>
    </CollectionView.ItemTemplate>
</CollectionView>
```

**Step 4: Context Actions → SwipeView**

> ⚠️ **Platform Note:** SwipeView requires touch input. On Windows desktop, it only works with touch screens, not with mouse/trackpad. Consider providing alternative UI for desktop scenarios (e.g., buttons, right-click menu).

**Before (ListView with ContextActions):**
```xaml
<ListView.ItemTemplate>
    <DataTemplate>
        <ViewCell>
            <ViewCell.ContextActions>
                <MenuItem Text="Delete" 
                         IsDestructive="True"
                         Command="{Binding Source={RelativeSource AncestorType={x:Type local:MyPage}}, Path=DeleteCommand}"
                         CommandParameter="{Binding .}" />
            </ViewCell.ContextActions>
            
            <Label Text="{Binding Title}" Padding="10" />
        </ViewCell>
    </DataTemplate>
</ListView.ItemTemplate>
```

**After (CollectionView with SwipeView):**
```xaml
<CollectionView.ItemTemplate>
    <DataTemplate>
        <SwipeView>
            <SwipeView.RightItems>
                <SwipeItems>
                    <SwipeItem Text="Delete"
                              BackgroundColor="Red"
                              Command="{Binding Source={RelativeSource AncestorType={x:Type local:MyPage}}, Path=DeleteCommand}"
                              CommandParameter="{Binding .}" />
                </SwipeItems>
            </SwipeView.RightItems>
            
            <VerticalStackLayout Padding="10">
                <Label Text="{Binding Title}" />
            </VerticalStackLayout>
        </SwipeView>
    </DataTemplate>
</CollectionView.ItemTemplate>
```

**Step 5: TableView for Settings → Alternative Approaches**

TableView is commonly used for settings pages. Here are modern alternatives:

**Option 1: CollectionView with Grouped Data**
```xaml
<CollectionView ItemsSource="{Binding SettingGroups}"
                IsGrouped="true"
                SelectionMode="None">
    <CollectionView.GroupHeaderTemplate>
        <DataTemplate>
            <Label Text="{Binding Title}" 
                   FontAttributes="Bold"
                   Margin="10,15,10,5" />
        </DataTemplate>
    </CollectionView.GroupHeaderTemplate>
    
    <CollectionView.ItemTemplate>
        <DataTemplate>
            <Grid Padding="15,10" ColumnDefinitions="*,Auto">
                <Label Text="{Binding Title}" 
                       VerticalOptions="Center" />
                <Switch Grid.Column="1" 
                        IsToggled="{Binding IsEnabled}"
                        IsVisible="{Binding ShowSwitch}" />
            </Grid>
        </DataTemplate>
    </CollectionView.ItemTemplate>
</CollectionView>
```

**Option 2: Vertical StackLayout (for small settings lists)**
```xaml
<ScrollView>
    <VerticalStackLayout BindableLayout.ItemsSource="{Binding Settings}"
                        Spacing="10"
                        Padding="15">
        <BindableLayout.ItemTemplate>
            <DataTemplate>
                <Border StrokeThickness="0"
                       BackgroundColor="{StaticResource Gray100}"
                       Padding="15,10">
                    <Grid ColumnDefinitions="*,Auto">
                        <Label Text="{Binding Title}" 
                              VerticalOptions="Center" />
                        <Switch Grid.Column="1" 
                               IsToggled="{Binding IsEnabled}" />
                    </Grid>
                </Border>
            </DataTemplate>
        </BindableLayout.ItemTemplate>
    </VerticalStackLayout>
</ScrollView>
```

**Step 6: Remove Platform-Specific ListView Code**

If you used platform-specific ListView features, remove them:

```csharp
// ❌ OLD - Remove these using statements (NOW OBSOLETE IN .NET 10)
using Microsoft.Maui.Controls.PlatformConfiguration;
using Microsoft.Maui.Controls.PlatformConfiguration.iOSSpecific;
using Microsoft.Maui.Controls.PlatformConfiguration.AndroidSpecific;

// ❌ OLD - Remove ListView platform configurations (NOW OBSOLETE IN .NET 10)
myListView.On<iOS>().SetSeparatorStyle(SeparatorStyle.FullWidth);
myListView.On<Android>().IsFastScrollEnabled();

// ❌ OLD - Remove Cell platform configurations (NOW OBSOLETE IN .NET 10)
viewCell.On<iOS>().SetDefaultBackgroundColor(Colors.White);
viewCell.On<Android>().SetIsContextActionsLegacyModeEnabled(false);
```

**Migration:** CollectionView does not have platform-specific configurations in the same way. If you need platform-specific styling:

```csharp
// ✅ NEW - Use conditional compilation
#if IOS
var backgroundColor = Colors.White;
#elif ANDROID
var backgroundColor = Colors.Transparent;
#endif

var grid = new Grid
{
    BackgroundColor = backgroundColor,
    // ... rest of cell content
};
```

Or in XAML:
```xaml
<CollectionView.ItemTemplate>
    <DataTemplate>
        <Grid>
            <Grid.BackgroundColor>
                <OnPlatform x:TypeArguments="Color">
                    <On Platform="iOS" Value="White" />
                    <On Platform="Android" Value="Transparent" />
                </OnPlatform>
            </Grid.BackgroundColor>
            <!-- Cell content -->
        </Grid>
    </DataTemplate>
</CollectionView.ItemTemplate>
```

#### Common Patterns & Pitfalls

**1. Empty View**
```xaml
<!-- CollectionView has built-in EmptyView support -->
<CollectionView ItemsSource="{Binding Items}">
    <CollectionView.EmptyView>
        <ContentView>
            <VerticalStackLayout Padding="50" VerticalOptions="Center">
                <Label Text="No items found" 
                       HorizontalTextAlignment="Center" />
            </VerticalStackLayout>
        </ContentView>
    </CollectionView.EmptyView>
    <!-- ... -->
</CollectionView>
```

**2. Pull to Refresh**
```xaml
<RefreshView IsRefreshing="{Binding IsRefreshing}"
             Command="{Binding RefreshCommand}">
    <CollectionView ItemsSource="{Binding Items}">
        <!-- ... -->
    </CollectionView>
</RefreshView>
```

**3. Item Spacing**
```xaml
<!-- Use ItemsLayout for spacing -->
<CollectionView ItemsSource="{Binding Items}">
    <CollectionView.ItemsLayout>
        <LinearItemsLayout Orientation="Vertical" 
                          ItemSpacing="10" />
    </CollectionView.ItemsLayout>
    <!-- ... -->
</CollectionView>
```

**4. Header and Footer**
```xaml
<CollectionView ItemsSource="{Binding Items}">
    <CollectionView.Header>
        <Label Text="My List" 
               FontSize="24" 
               Padding="10" />
    </CollectionView.Header>
    
    <CollectionView.Footer>
        <Label Text="End of list" 
               Padding="10" 
               HorizontalTextAlignment="Center" />
    </CollectionView.Footer>
    
    <!-- ItemTemplate -->
</CollectionView>
```

**5. Load More / Infinite Scroll**
```xaml
<CollectionView ItemsSource="{Binding Items}"
                RemainingItemsThreshold="5"
                RemainingItemsThresholdReachedCommand="{Binding LoadMoreCommand}">
    <!-- ItemTemplate -->
</CollectionView>
```

**6. Item Sizing Optimization**

CollectionView uses `ItemSizingStrategy` to control item measurement:

```xaml
<!-- Default: Each item measured individually (like HasUnevenRows="True") -->
<CollectionView ItemSizingStrategy="MeasureAllItems">
    <!-- ... -->
</CollectionView>

<!-- Performance: Only first item measured, rest use same height -->
<CollectionView ItemSizingStrategy="MeasureFirstItem">
    <!-- Use this when all items have similar heights -->
</CollectionView>
```

> 💡 **Performance Tip:** If your list items have consistent heights, use `ItemSizingStrategy="MeasureFirstItem"` for better performance with large lists.

#### .NET 10 Handler Changes (iOS/Mac Catalyst)

> ℹ️ **.NET 10 uses new optimized CollectionView and CarouselView handlers** on iOS and Mac Catalyst by default, providing improved performance and stability.

**If you previously opted-in to the new handlers in .NET 9**, you should now **REMOVE** this code:

```csharp
// ❌ REMOVE THIS in .NET 10 (these handlers are now default)
#if IOS || MACCATALYST
builder.ConfigureMauiHandlers(handlers =>
{
    handlers.AddHandler<CollectionView, CollectionViewHandler2>();
    handlers.AddHandler<CarouselView, CarouselViewHandler2>();
});
#endif
```

The optimized handlers are used automatically in .NET 10 - no configuration needed!

**Only if you experience issues**, you can revert to the legacy handler:

```csharp
// In MauiProgram.cs - only if needed
#if IOS || MACCATALYST
builder.ConfigureMauiHandlers(handlers =>
{
    handlers.AddHandler<Microsoft.Maui.Controls.CollectionView, 
                        Microsoft.Maui.Controls.Handlers.Items.CollectionViewHandler>();
});
#endif
```

However, Microsoft recommends using the new default handlers for best results.

#### Testing Checklist

After migration, test these scenarios:

- [ ] **Item selection** works correctly
- [ ] **Grouped lists** display with proper headers
- [ ] **Swipe actions** (if used) work on both iOS and Android
- [ ] **Empty view** appears when list is empty
- [ ] **Pull to refresh** works (if used)
- [ ] **Scroll performance** is acceptable (especially for large lists)
- [ ] **Item sizing** is correct (CollectionView auto-sizes by default)
- [ ] **Selection visual state** shows/hides correctly
- [ ] **Data binding** updates the list correctly
- [ ] **Navigation** from list items works

#### Migration Complexity Factors

ListView to CollectionView migration is complex because:
- Each ListView may have unique behaviors
- Platform-specific code needs updating
- Extensive testing required
- Context actions need SwipeView conversion
- Grouped lists need template updates
- ViewModel changes may be needed

#### Quick Reference: ListView vs CollectionView

| Feature | ListView | CollectionView |
|---------|----------|----------------|
| **Selection Event** | `ItemSelected` | `SelectionChanged` |
| **Selection Args** | `SelectedItemChangedEventArgs` | `SelectionChangedEventArgs` |
| **Getting Selected** | `e.SelectedItem` | `e.CurrentSelection.FirstOrDefault()` |
| **Context Menus** | `ContextActions` | `SwipeView` |
| **Grouping** | `IsGroupingEnabled="True"` | `IsGrouped="true"` |
| **Group Header** | `GroupDisplayBinding` | `GroupHeaderTemplate` |
| **Even Rows** | `HasUnevenRows="False"` | Auto-sizes (default) |
| **Empty State** | Manual | `EmptyView` property |
| **Cells** | TextCell, ImageCell, etc. | Custom DataTemplate |

---

## Deprecated APIs (P1 - Fix Soon)

These APIs still work in .NET 10 but show compiler warnings. They will be removed in future versions.

### 1. Animation Methods

**Status:** ⚠️ **DEPRECATED** - All sync animation methods replaced with async versions.

**Warning You'll See:**
```
warning CS0618: 'ViewExtensions.FadeTo(VisualElement, double, uint, Easing)' is obsolete: 'Please use FadeToAsync instead.'
```

**Migration Table:**

| Old Method | New Method | Example |
|-----------|-----------|---------|
| `FadeTo()` | `FadeToAsync()` | `await view.FadeToAsync(0, 500);` |
| `ScaleTo()` | `ScaleToAsync()` | `await view.ScaleToAsync(1.5, 300);` |
| `TranslateTo()` | `TranslateToAsync()` | `await view.TranslateToAsync(100, 100, 250);` |
| `RotateTo()` | `RotateToAsync()` | `await view.RotateToAsync(360, 500);` |
| `RotateXTo()` | `RotateXToAsync()` | `await view.RotateXToAsync(45, 300);` |
| `RotateYTo()` | `RotateYToAsync()` | `await view.RotateYToAsync(45, 300);` |
| `ScaleXTo()` | `ScaleXToAsync()` | `await view.ScaleXToAsync(2.0, 300);` |
| `ScaleYTo()` | `ScaleYToAsync()` | `await view.ScaleYToAsync(2.0, 300);` |
| `RelRotateTo()` | `RelRotateToAsync()` | `await view.RelRotateToAsync(90, 300);` |
| `RelScaleTo()` | `RelScaleToAsync()` | `await view.RelScaleToAsync(0.5, 300);` |
| `LayoutTo()` | `LayoutToAsync()` | See special note below |

#### Migration Examples

**Simple Animation:**
```csharp
// ❌ OLD (Deprecated)
await myButton.FadeTo(0, 500);
await myButton.ScaleTo(1.5, 300);
await myButton.TranslateTo(100, 100, 250);

// ✅ NEW (Required)
await myButton.FadeToAsync(0, 500);
await myButton.ScaleToAsync(1.5, 300);
await myButton.TranslateToAsync(100, 100, 250);
```

**Sequential Animations:**
```csharp
// ❌ OLD
await image.FadeTo(0, 300);
await image.ScaleTo(0.5, 300);
await image.FadeTo(1, 300);

// ✅ NEW
await image.FadeToAsync(0, 300);
await image.ScaleToAsync(0.5, 300);
await image.FadeToAsync(1, 300);
```

**Parallel Animations:**
```csharp
// ❌ OLD
await Task.WhenAll(
    image.FadeTo(0, 300),
    image.ScaleTo(0.5, 300),
    image.RotateTo(360, 300)
);

// ✅ NEW
await Task.WhenAll(
    image.FadeToAsync(0, 300),
    image.ScaleToAsync(0.5, 300),
    image.RotateToAsync(360, 300)
);
```

**With Cancellation:**
```csharp
// NEW: Async methods support cancellation
CancellationTokenSource cts = new();

try
{
    await view.FadeToAsync(0, 2000);
}
catch (TaskCanceledException)
{
    // Animation was cancelled
}

// Cancel from elsewhere
cts.Cancel();
```

#### Special Case: LayoutTo

`LayoutToAsync()` is deprecated with a special message: "Use Translation to animate layout changes."

```csharp
// ❌ OLD (Deprecated)
await view.LayoutToAsync(new Rect(100, 100, 200, 200), 250);

// ✅ NEW (Use TranslateToAsync instead)
await view.TranslateToAsync(100, 100, 250);

// Or animate Translation properties directly
var animation = new Animation(v => view.TranslationX = v, 0, 100);
animation.Commit(view, "MoveX", length: 250);
```

---

### 2. DisplayAlert and DisplayActionSheet

**Status:** ⚠️ **DEPRECATED** - Sync methods replaced with async versions.

**Warning You'll See:**
```
warning CS0618: 'Page.DisplayAlert(string, string, string)' is obsolete: 'Use DisplayAlertAsync instead'
```

#### Migration Examples

**DisplayAlert:**
```csharp
// ❌ OLD (Deprecated)
await DisplayAlert("Success", "Data saved successfully", "OK");
await DisplayAlert("Error", "Failed to save", "Cancel");
bool result = await DisplayAlert("Confirm", "Delete this item?", "Yes", "No");

// ✅ NEW (Required)
await DisplayAlertAsync("Success", "Data saved successfully", "OK");
await DisplayAlertAsync("Error", "Failed to save", "Cancel");
bool result = await DisplayAlertAsync("Confirm", "Delete this item?", "Yes", "No");
```

**DisplayActionSheet:**
```csharp
// ❌ OLD (Deprecated)
string action = await DisplayActionSheet(
    "Choose an action",
    "Cancel",
    "Delete",
    "Edit", "Share", "Duplicate"
);

// ✅ NEW (Required)
string action = await DisplayActionSheetAsync(
    "Choose an action",
    "Cancel",
    "Delete",
    "Edit", "Share", "Duplicate"
);
```

**In ViewModels (with IDispatcher):**
```csharp
// If you're calling from a ViewModel, you'll need access to a Page
public class MyViewModel
{
    private readonly IDispatcher _dispatcher;
    private readonly Page _page;
    
    public MyViewModel(IDispatcher dispatcher, Page page)
    {
        _dispatcher = dispatcher;
        _page = page;
    }
    
    public async Task ShowAlertAsync()
    {
        await _dispatcher.DispatchAsync(async () =>
        {
            await _page.DisplayAlertAsync("Info", "Message from ViewModel", "OK");
        });
    }
}
```

---

### 3. Page.IsBusy

**Status:** ⚠️ **DEPRECATED** - Property will be removed in .NET 11.

**Warning You'll See:**
```
warning CS0618: 'Page.IsBusy' is obsolete: 'Page.IsBusy has been deprecated and will be removed in .NET 11'
```

**Why It's Deprecated:**
- Inconsistent behavior across platforms
- Limited customization options
- Doesn't work well with modern MVVM patterns

#### Migration Examples

**Simple Page:**
```xaml
<!-- ❌ OLD (Deprecated) -->
<ContentPage IsBusy="{Binding IsLoading}">
    <StackLayout>
        <Label Text="Content here" />
    </StackLayout>
</ContentPage>

<!-- ✅ NEW (Recommended) -->
<ContentPage>
    <Grid>
        <!-- Main content -->
        <StackLayout>
            <Label Text="Content here" />
        </StackLayout>
        
        <!-- Loading indicator overlay -->
        <ActivityIndicator IsRunning="{Binding IsLoading}"
                          IsVisible="{Binding IsLoading}"
                          Color="{StaticResource Primary}"
                          VerticalOptions="Center"
                          HorizontalOptions="Center" />
    </Grid>
</ContentPage>
```

**With Loading Overlay:**
```xaml
<!-- ✅ Better: Custom loading overlay -->
<ContentPage>
    <Grid>
        <!-- Main content -->
        <ScrollView>
            <VerticalStackLayout Padding="20">
                <Label Text="Your content here" />
            </VerticalStackLayout>
        </ScrollView>
        
        <!-- Loading overlay -->
        <Grid IsVisible="{Binding IsLoading}"
              BackgroundColor="#80000000">
            <VerticalStackLayout VerticalOptions="Center"
                               HorizontalOptions="Center"
                               Spacing="10">
                <ActivityIndicator IsRunning="True"
                                 Color="White" />
                <Label Text="Loading..."
                       TextColor="White" />
            </VerticalStackLayout>
        </Grid>
    </Grid>
</ContentPage>
```

**In Code-Behind:**
```csharp
// ❌ OLD (Deprecated)
public partial class MyPage : ContentPage
{
    async Task LoadDataAsync()
    {
        IsBusy = true;
        try
        {
            await LoadDataFromServerAsync();
        }
        finally
        {
            IsBusy = false;
        }
    }
}

// ✅ NEW (Recommended)
public partial class MyPage : ContentPage
{
    async Task LoadDataAsync()
    {
        LoadingIndicator.IsVisible = true;
        LoadingIndicator.IsRunning = true;
        try
        {
            await LoadDataFromServerAsync();
        }
        finally
        {
            LoadingIndicator.IsVisible = false;
            LoadingIndicator.IsRunning = false;
        }
    }
}
```

**In ViewModel:**
```csharp
public class MyViewModel : INotifyPropertyChanged
{
    private bool _isLoading;
    public bool IsLoading
    {
        get => _isLoading;
        set
        {
            _isLoading = value;
            OnPropertyChanged();
        }
    }
    
    public async Task LoadDataAsync()
    {
        IsLoading = true;
        try
        {
            await LoadDataFromServerAsync();
        }
        finally
        {
            IsLoading = false;
        }
    }
}
```

---

### 4. MediaPicker APIs

**Status:** ⚠️ **DEPRECATED** - Single-selection methods replaced with multi-selection variants.

**Warning You'll See:**
```
warning CS0618: 'MediaPicker.PickPhotoAsync(MediaPickerOptions)' is obsolete: 'Switch to PickPhotosAsync which also allows multiple selections.'
warning CS0618: 'MediaPicker.PickVideoAsync(MediaPickerOptions)' is obsolete: 'Switch to PickVideosAsync which also allows multiple selections.'
```

**What Changed:**
- `PickPhotoAsync()` → `PickPhotosAsync()` (returns `List<FileResult>`)
- `PickVideoAsync()` → `PickVideosAsync()` (returns `List<FileResult>`)
- New `SelectionLimit` property on `MediaPickerOptions` (default: 1)
- Old methods still work but are marked obsolete

**Key Behavior:**
- **Default behavior preserved:** `SelectionLimit = 1` (single selection)
- Set `SelectionLimit = 0` for unlimited multi-select
- Set `SelectionLimit > 1` for specific limits

**Platform Notes:**
- ✅ **iOS:** Selection limit enforced by native picker UI
- ⚠️ **Android:** Not all custom pickers honor `SelectionLimit` - be aware!
- ⚠️ **Windows:** `SelectionLimit` not supported - implement your own validation

#### Migration Examples

**Simple Photo Picker (maintain single-selection behavior):**
```csharp
// ❌ OLD (Deprecated)
var photo = await MediaPicker.PickPhotoAsync(new MediaPickerOptions
{
    Title = "Pick a photo"
});

if (photo != null)
{
    var stream = await photo.OpenReadAsync();
    MyImage.Source = ImageSource.FromStream(() => stream);
}

// ✅ NEW (maintains same behavior - picks only 1 photo)
var photos = await MediaPicker.PickPhotosAsync(new MediaPickerOptions
{
    Title = "Pick a photo",
    SelectionLimit = 1  // Explicit: only 1 photo
});

var photo = photos.FirstOrDefault();
if (photo != null)
{
    var stream = await photo.OpenReadAsync();
    MyImage.Source = ImageSource.FromStream(() => stream);
}
```

**Simple Video Picker (maintain single-selection behavior):**
```csharp
// ❌ OLD (Deprecated)
var video = await MediaPicker.PickVideoAsync(new MediaPickerOptions
{
    Title = "Pick a video"
});

if (video != null)
{
    VideoPlayer.Source = video.FullPath;
}

// ✅ NEW (maintains same behavior - picks only 1 video)
var videos = await MediaPicker.PickVideosAsync(new MediaPickerOptions
{
    Title = "Pick a video",
    SelectionLimit = 1  // Explicit: only 1 video
});

var video = videos.FirstOrDefault();
if (video != null)
{
    VideoPlayer.Source = video.FullPath;
}
```

**Photo Picker without Options (uses defaults):**
```csharp
// ❌ OLD (Deprecated)
var photo = await MediaPicker.PickPhotoAsync();

// ✅ NEW (default SelectionLimit = 1, so same behavior)
var photos = await MediaPicker.PickPhotosAsync();
var photo = photos.FirstOrDefault();
```

**Multi-Photo Selection (new capability):**
```csharp
// ✅ NEW: Pick up to 5 photos
var photos = await MediaPicker.PickPhotosAsync(new MediaPickerOptions
{
    Title = "Pick up to 5 photos",
    SelectionLimit = 5
});

foreach (var photo in photos)
{
    var stream = await photo.OpenReadAsync();
    // Process each photo
}

// ✅ NEW: Unlimited selection
var allPhotos = await MediaPicker.PickPhotosAsync(new MediaPickerOptions
{
    Title = "Pick photos",
    SelectionLimit = 0  // No limit
});
```

**Multi-Video Selection (new capability):**
```csharp
// ✅ NEW: Pick up to 3 videos
var videos = await MediaPicker.PickVideosAsync(new MediaPickerOptions
{
    Title = "Pick up to 3 videos",
    SelectionLimit = 3
});

foreach (var video in videos)
{
    // Process each video
    Console.WriteLine($"Selected: {video.FileName}");
}
```

**Handling Empty Results:**
```csharp
// NEW: Returns empty list if user cancels (not null)
var photos = await MediaPicker.PickPhotosAsync(new MediaPickerOptions
{
    SelectionLimit = 1
});

// ✅ Check for empty list
if (photos.Count == 0)
{
    await DisplayAlertAsync("Cancelled", "No photo selected", "OK");
    return;
}

var photo = photos.First();
// Process photo...
```

**With Try-Catch (same as before):**
```csharp
try
{
    var photos = await MediaPicker.PickPhotosAsync(new MediaPickerOptions
    {
        Title = "Pick a photo",
        SelectionLimit = 1
    });
    
    if (photos.Count > 0)
    {
        await ProcessPhotoAsync(photos.First());
    }
}
catch (PermissionException)
{
    await DisplayAlertAsync("Permission Denied", "Camera access required", "OK");
}
catch (Exception ex)
{
    await DisplayAlertAsync("Error", $"Failed to pick photo: {ex.Message}", "OK");
}
```

#### Migration Checklist

When migrating to the new MediaPicker APIs:

- [ ] Replace `PickPhotoAsync()` with `PickPhotosAsync()`
- [ ] Replace `PickVideoAsync()` with `PickVideosAsync()`
- [ ] Set `SelectionLimit = 1` to maintain single-selection behavior
- [ ] Change `FileResult?` to `List<FileResult>` (or use `.FirstOrDefault()`)
- [ ] Update null checks to empty list checks (`photos.Count == 0`)
- [ ] Test on Android - ensure custom pickers respect limit (or add validation)
- [ ] Test on Windows - add your own limit validation if needed
- [ ] Consider if multi-select would improve your UX (optional)

#### Platform-Specific Validation (Windows & Android)

```csharp
// ✅ Recommended: Validate selection limit on platforms that don't enforce it
var photos = await MediaPicker.PickPhotosAsync(new MediaPickerOptions
{
    Title = "Pick up to 5 photos",
    SelectionLimit = 5
});

// On Windows and some Android pickers, the limit might not be enforced
if (photos.Count > 5)
{
    await DisplayAlertAsync(
        "Too Many Photos", 
        $"Please select up to 5 photos. You selected {photos.Count}.", 
        "OK"
    );
    return;
}

// Continue processing...
```

#### Capture Methods (unchanged)

**Note:** Capture methods (`CapturePhotoAsync`, `CaptureVideoAsync`) are **NOT** deprecated and remain unchanged:

```csharp
// ✅ These still work as-is (no changes needed)
var photo = await MediaPicker.CapturePhotoAsync();
var video = await MediaPicker.CaptureVideoAsync();
```

#### Quick Migration Pattern

**For all existing single-selection code, use this pattern:**

```csharp
// ❌ OLD
var photo = await MediaPicker.PickPhotoAsync(options);
if (photo != null)
{
    // Process photo
}

// ✅ NEW (drop-in replacement)
var photos = await MediaPicker.PickPhotosAsync(options ?? new MediaPickerOptions { SelectionLimit = 1 });
var photo = photos.FirstOrDefault();
if (photo != null)
{
    // Process photo (same code as before)
}
```

---

## Recommended Changes (P2)

These changes are recommended but not required immediately. Consider migrating during your next refactoring cycle.

### Application.MainPage

**Status:** ⚠️ **DEPRECATED** - Property will be removed in future version.

**Warning You'll See:**
```
warning CS0618: 'Application.MainPage' is obsolete: 'This property is deprecated. Initialize your application by overriding Application.CreateWindow...'
```

#### Migration Example

```csharp
// ❌ OLD (Deprecated)
public partial class App : Application
{
    public App()
    {
        InitializeComponent();
        MainPage = new AppShell();
    }
    
    // Changing page later
    public void SwitchToLoginPage()
    {
        MainPage = new LoginPage();
    }
}

// ✅ NEW (Recommended)
public partial class App : Application
{
    public App()
    {
        InitializeComponent();
    }
    
    protected override Window CreateWindow(IActivationState? activationState)
    {
        return new Window(new AppShell());
    }
    
    // Changing page later
    public void SwitchToLoginPage()
    {
        if (Windows.Count > 0)
        {
            Windows[0].Page = new LoginPage();
        }
    }
}
```

**Benefits of CreateWindow:**
- Better multi-window support
- More explicit initialization
- Cleaner separation of concerns
- Works better with Shell

---

## Bulk Migration Tools

Use these find/replace patterns to quickly update your codebase.

### Visual Studio / VS Code

**Regex Mode - Find/Replace**

#### Animation Methods

```regex
Find:    \.FadeTo\(
Replace: .FadeToAsync(

Find:    \.ScaleTo\(
Replace: .ScaleToAsync(

Find:    \.TranslateTo\(
Replace: .TranslateToAsync(

Find:    \.RotateTo\(
Replace: .RotateToAsync(

Find:    \.RotateXTo\(
Replace: .RotateXToAsync(

Find:    \.RotateYTo\(
Replace: .RotateYToAsync(

Find:    \.ScaleXTo\(
Replace: .ScaleXToAsync(

Find:    \.ScaleYTo\(
Replace: .ScaleYToAsync(

Find:    \.RelRotateTo\(
Replace: .RelRotateToAsync(

Find:    \.RelScaleTo\(
Replace: .RelScaleToAsync(
```

#### Display Methods

```regex
Find:    DisplayAlert\(
Replace: DisplayAlertAsync(

Find:    DisplayActionSheet\(
Replace: DisplayActionSheetAsync(
```

#### MediaPicker Methods

**⚠️ Note:** MediaPicker migration requires manual code changes due to return type changes (`FileResult?` → `List<FileResult>`). Use these searches to find instances:

```bash
# Find PickPhotoAsync usages
grep -rn "PickPhotoAsync" --include="*.cs" .

# Find PickVideoAsync usages
grep -rn "PickVideoAsync" --include="*.cs" .
```

**Manual Migration Pattern:**
```csharp
// Find: await MediaPicker.PickPhotoAsync(
// Replace with:
var photos = await MediaPicker.PickPhotosAsync(new MediaPickerOptions { SelectionLimit = 1 });
var photo = photos.FirstOrDefault();

// Find: await MediaPicker.PickVideoAsync(
// Replace with:
var videos = await MediaPicker.PickVideosAsync(new MediaPickerOptions { SelectionLimit = 1 });
var video = videos.FirstOrDefault();
```

#### ListView/TableView Detection (Manual Migration Required)

**⚠️ Note:** ListView/TableView migration CANNOT be automated. Use these searches to find instances:

```bash
# Find all ListView usages in XAML
grep -r "<ListView" --include="*.xaml" .

# Find all TableView usages in XAML
grep -r "<TableView" --include="*.xaml" .

# Find ListView in C# code
grep -r "new ListView\|ListView " --include="*.cs" .

# Find Cell types in XAML
grep -r "TextCell\|ImageCell\|EntryCell\|SwitchCell\|ViewCell" --include="*.xaml" .

# Find ItemSelected handlers (need to change to SelectionChanged)
grep -r "ItemSelected=" --include="*.xaml" .
grep -r "ItemSelected\s*\+=" --include="*.cs" .

# Find ContextActions (need to change to SwipeView)
grep -r "ContextActions" --include="*.xaml" .

# Find platform-specific ListView code (needs removal)
grep -r "PlatformConfiguration.*ListView" --include="*.cs" .
```

**Create a Migration Inventory:**
```bash
# Generate a report of all ListView/TableView instances
echo "=== ListView/TableView Migration Inventory ===" > migration-report.txt
echo "" >> migration-report.txt
echo "XAML ListView instances:" >> migration-report.txt
grep -rn "<ListView" --include="*.xaml" . >> migration-report.txt
echo "" >> migration-report.txt
echo "XAML TableView instances:" >> migration-report.txt
grep -rn "<TableView" --include="*.xaml" . >> migration-report.txt
echo "" >> migration-report.txt
echo "ItemSelected handlers:" >> migration-report.txt
grep -rn "ItemSelected" --include="*.xaml" --include="*.cs" . >> migration-report.txt
echo "" >> migration-report.txt
cat migration-report.txt
```

### PowerShell Script

```powershell
# Replace animation methods in all .cs files
Get-ChildItem -Path . -Recurse -Filter *.cs | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    
    # Animation methods
    $content = $content -replace '\.FadeTo\(', '.FadeToAsync('
    $content = $content -replace '\.ScaleTo\(', '.ScaleToAsync('
    $content = $content -replace '\.TranslateTo\(', '.TranslateToAsync('
    $content = $content -replace '\.RotateTo\(', '.RotateToAsync('
    $content = $content -replace '\.RotateXTo\(', '.RotateXToAsync('
    $content = $content -replace '\.RotateYTo\(', '.RotateYToAsync('
    $content = $content -replace '\.ScaleXTo\(', '.ScaleXToAsync('
    $content = $content -replace '\.ScaleYTo\(', '.ScaleYToAsync('
    $content = $content -replace '\.RelRotateTo\(', '.RelRotateToAsync('
    $content = $content -replace '\.RelScaleTo\(', '.RelScaleToAsync('
    
    # Display methods
    $content = $content -replace 'DisplayAlert\(', 'DisplayAlertAsync('
    $content = $content -replace 'DisplayActionSheet\(', 'DisplayActionSheetAsync('
    
    Set-Content $_.FullName $content
}

Write-Host "✅ Migration complete!"
```

---

## Testing Your Upgrade

### Build Validation

```bash
# Clean solution
dotnet clean

# Restore packages
dotnet restore

# Build for each platform
dotnet build -f net10.0-android -c Release
dotnet build -f net10.0-ios -c Release
dotnet build -f net10.0-maccatalyst -c Release
dotnet build -f net10.0-windows -c Release

# Check for warnings
dotnet build --no-incremental 2>&1 | grep -i "warning CS0618"
```

### Enable Warnings as Errors (Temporary)

```xml
<!-- Add to your .csproj to catch all obsolete API usage -->
<PropertyGroup>
  <WarningsAsErrors>CS0618</WarningsAsErrors>
</PropertyGroup>
```

### Test Checklist

- [ ] App launches successfully on all platforms
- [ ] All animations work correctly
- [ ] Dialogs (alerts/action sheets) display properly
- [ ] Loading indicators work (if you used IsBusy)
- [ ] Inter-component communication works (MessagingCenter replacement)
- [ ] No CS0618 warnings in build output
- [ ] No runtime exceptions related to obsolete APIs

---

## Troubleshooting

### Error: 'MessagingCenter' is inaccessible due to its protection level

**Cause:** MessagingCenter is now internal in .NET 10.

**Solution:**
1. Install `CommunityToolkit.Mvvm` package
2. Replace with `WeakReferenceMessenger` (see [MessagingCenter section](#messagingcenter-made-internal))
3. Create message classes for each message type
4. Don't forget to unregister!

---

### Warning: Animation method is obsolete

**Cause:** Using sync animation methods (`FadeTo`, `ScaleTo`, etc.)

**Quick Fix:**
```bash
# Use PowerShell script from Bulk Migration Tools section
# Or use Find/Replace patterns
```

**Manual Fix:**
Add `Async` to the end of each animation method call:
- `FadeTo` → `FadeToAsync`
- `ScaleTo` → `ScaleToAsync`
- etc.

---

### Page.IsBusy doesn't work anymore

**Cause:** IsBusy still works but is deprecated.

**Solution:** Replace with explicit ActivityIndicator (see [IsBusy section](#3-pageisbusy))

---

### Build fails with "Target framework 'net10.0' not found"

**Cause:** .NET 10 SDK not installed or not latest version.

**Solution:**
```bash
# Check SDK version
dotnet --version  # Should be 10.0.100 or later

# Install .NET 10 SDK from:
# https://dotnet.microsoft.com/download/dotnet/10.0

# Update workloads
dotnet workload update
```

---

### MessagingCenter migration breaks existing code

**Common Issues:**

1. **Forgot to unregister:**
   ```csharp
   // ⚠️ Memory leak if you don't unregister
   protected override void OnDisappearing()
   {
       base.OnDisappearing();
       WeakReferenceMessenger.Default.UnregisterAll(this);
   }
   ```

2. **Wrong message type:**
   ```csharp
   // ❌ Wrong
   WeakReferenceMessenger.Default.Register<UserLoggedIn>(this, handler);
   WeakReferenceMessenger.Default.Send(new UserData());  // Wrong type!
   
   // ✅ Correct
   WeakReferenceMessenger.Default.Register<UserLoggedInMessage>(this, handler);
   WeakReferenceMessenger.Default.Send(new UserLoggedInMessage(userData));
   ```

3. **Recipient parameter confusion:**
   ```csharp
   // The recipient parameter is the object that registered (this)
   WeakReferenceMessenger.Default.Register<MyMessage>(this, (recipient, message) =>
   {
       // recipient == this
       // message == the message that was sent
   });
   ```

---

### Warning: MediaPicker methods are obsolete

**Cause:** Using deprecated `PickPhotoAsync` or `PickVideoAsync` methods.

**Solution:** Migrate to `PickPhotosAsync` or `PickVideosAsync`:

```csharp
// ❌ OLD
var photo = await MediaPicker.PickPhotoAsync(options);

// ✅ NEW (maintain single-selection)
var photos = await MediaPicker.PickPhotosAsync(new MediaPickerOptions 
{ 
    Title = options?.Title,
    SelectionLimit = 1 
});
var photo = photos.FirstOrDefault();
```

**Key Changes:**
- Return type changes from `FileResult?` to `List<FileResult>`
- Use `.FirstOrDefault()` to get single result
- Set `SelectionLimit = 1` to maintain old behavior
- Check `photos.Count == 0` instead of `photo == null`

---

### MediaPicker returns more items than SelectionLimit

**Cause:** Windows and some Android custom pickers don't enforce `SelectionLimit`.

**Solution:** Add manual validation:

```csharp
var photos = await MediaPicker.PickPhotosAsync(new MediaPickerOptions
{
    SelectionLimit = 5
});

if (photos.Count > 5)
{
    await DisplayAlertAsync("Error", "Too many photos selected", "OK");
    return;
}
```

---

### Animation doesn't complete after migration

**Cause:** Forgetting `await` keyword.

```csharp
// ❌ Wrong - animation runs but code continues immediately
view.FadeToAsync(0, 500);
DoSomethingElse();

// ✅ Correct - wait for animation to complete
await view.FadeToAsync(0, 500);
DoSomethingElse();
```

---

### Warning: ListView/TableView/TextCell is obsolete

**Cause:** Using deprecated ListView, TableView, or Cell types.

**Solution:** Migrate to CollectionView (see [ListView and TableView section](#listview-and-tableview-deprecated))

**Quick Decision Guide:**
- **Simple list** → CollectionView with custom DataTemplate
- **Settings page with <20 items** → VerticalStackLayout with BindableLayout
- **Settings page with 20+ items** → Grouped CollectionView
- **Grouped data list** → CollectionView with `IsGrouped="True"`

---

### CollectionView doesn't have SelectedItem event

**Cause:** CollectionView uses `SelectionChanged` instead of `ItemSelected`.

**Solution:**
```csharp
// ❌ OLD (ListView)
void OnItemSelected(object sender, SelectedItemChangedEventArgs e)
{
    var item = e.SelectedItem as MyItem;
}

// ✅ NEW (CollectionView)
void OnSelectionChanged(object sender, SelectionChangedEventArgs e)
{
    var item = e.CurrentSelection.FirstOrDefault() as MyItem;
}
```

---

### Platform-specific ListView configuration is obsolete

**Cause:** Using `Microsoft.Maui.Controls.PlatformConfiguration.*Specific.ListView` extensions.

**Error:**
```
warning CS0618: 'ListView' is obsolete: 'With the deprecation of ListView, this class is obsolete. Please use CollectionView instead.'
```

**Solution:**
1. Remove platform-specific ListView using statements:
   ```csharp
   // ❌ Remove these
   using Microsoft.Maui.Controls.PlatformConfiguration;
   using Microsoft.Maui.Controls.PlatformConfiguration.iOSSpecific;
   using Microsoft.Maui.Controls.PlatformConfiguration.AndroidSpecific;
   ```

2. Remove platform-specific ListView calls:
   ```csharp
   // ❌ Remove these
   myListView.On<iOS>().SetSeparatorStyle(SeparatorStyle.FullWidth);
   myListView.On<Android>().IsFastScrollEnabled();
   viewCell.On<iOS>().SetDefaultBackgroundColor(Colors.White);
   ```

3. CollectionView has different platform customization options - consult CollectionView docs for alternatives.

---

### CollectionView performance issues after ListView migration

**Common Causes:**

1. **Not using DataTemplate caching:**
   ```xaml
   <!-- ❌ Bad performance -->
   <CollectionView.ItemTemplate>
       <DataTemplate>
           <ComplexView />
       </DataTemplate>
   </CollectionView.ItemTemplate>
   
   <!-- ✅ Better - use simpler templates -->
   <CollectionView.ItemTemplate>
       <DataTemplate>
           <VerticalStackLayout Padding="10">
               <Label Text="{Binding Title}" />
           </VerticalStackLayout>
       </DataTemplate>
   </CollectionView.ItemTemplate>
   ```

2. **Complex nested layouts:**
   - Avoid deeply nested layouts in ItemTemplate
   - Use Grid instead of StackLayout when possible
   - Consider FlexLayout for complex layouts

3. **Images not being cached:**
   ```xaml
   <Image Source="{Binding ImageUrl}"
          Aspect="AspectFill"
          HeightRequest="80"
          WidthRequest="80">
       <Image.Behaviors>
           <!-- Add caching behavior if needed -->
       </Image.Behaviors>
   </Image>
   ```

---

## Quick Reference Card

### Priority Checklist

**Must Fix (P0 - Breaking/Critical):**
- [ ] Replace `MessagingCenter` with `WeakReferenceMessenger`
- [ ] Migrate `ListView` to `CollectionView`
- [ ] Migrate `TableView` to `CollectionView` or `BindableLayout`
- [ ] Replace `TextCell`, `ImageCell`, etc. with custom DataTemplates
- [ ] Convert `ContextActions` to `SwipeView`
- [ ] Remove platform-specific ListView configurations

**Should Fix (P1 - Deprecated):**
- [ ] Update animation methods: add `Async` suffix
- [ ] Update `DisplayAlert` → `DisplayAlertAsync`
- [ ] Update `DisplayActionSheet` → `DisplayActionSheetAsync`  
- [ ] Replace `Page.IsBusy` with `ActivityIndicator`
- [ ] Replace `PickPhotoAsync` → `PickPhotosAsync` (with `SelectionLimit = 1`)
- [ ] Replace `PickVideoAsync` → `PickVideosAsync` (with `SelectionLimit = 1`)

**Nice to Have (P2):**
- [ ] Migrate `Application.MainPage` to `CreateWindow`

### Common Patterns

```csharp
// Animation
await view.FadeToAsync(0, 500);

// Alert
await DisplayAlertAsync("Title", "Message", "OK");

// Messaging
WeakReferenceMessenger.Default.Send(new MyMessage());
WeakReferenceMessenger.Default.Register<MyMessage>(this, (r, m) => { });
WeakReferenceMessenger.Default.UnregisterAll(this);

// Loading
IsLoading = true;
try { await LoadAsync(); }
finally { IsLoading = false; }
```

---

## Additional Resources

- **Official Docs:** https://learn.microsoft.com/dotnet/maui/
- **Migration Guide:** https://learn.microsoft.com/dotnet/maui/migration/
- **GitHub Issues:** https://github.com/dotnet/maui/issues
- **CommunityToolkit.Mvvm:** https://learn.microsoft.com/dotnet/communitytoolkit/mvvm/

---

**Document Version:** 2.0  
**Last Updated:** November 2025  
**Applies To:** .NET MAUI 10.0.100 and later
