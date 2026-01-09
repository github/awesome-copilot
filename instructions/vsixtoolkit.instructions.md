---
description: 'Guidelines for Visual Studio extension (VSIX) development using Community.VisualStudio.Toolkit'
applyTo: '**/*.cs, **/*.vsct, **/*.xaml, **/source.extension.vsixmanifest'
---

# Visual Studio Extension Development with Community.VisualStudio.Toolkit

## Scope

**These instructions apply ONLY to Visual Studio extensions using `Community.VisualStudio.Toolkit`.**

Verify the project uses the toolkit by checking for:
- `Community.VisualStudio.Toolkit.*` NuGet package reference
- `ToolkitPackage` base class (not raw `AsyncPackage`)
- `BaseCommand<T>` pattern for commands

**If the project uses raw VSSDK (`AsyncPackage` directly) or the new `VisualStudio.Extensibility` model, do not apply these instructions.**

## Goals

- Generate async-first, thread-safe extension code
- Use toolkit abstractions (`VS.*` helpers, `BaseCommand<T>`, `BaseOptionModel<T>`)
- Ensure all UI respects Visual Studio themes
- Follow VSSDK and VSTHRD analyzer rules
- Produce testable, maintainable extension code

## Example Prompt Behaviors

### ✅ Good Suggestions
- "Create a command that opens the current file's containing folder using `BaseCommand<T>`"
- "Add an options page with a boolean setting using `BaseOptionModel<T>`"
- "Write a tagger provider for C# files that highlights TODO comments"
- "Show a status bar progress indicator while processing files"

### ❌ Avoid
- Suggesting raw `AsyncPackage` instead of `ToolkitPackage`
- Using `OleMenuCommandService` directly instead of `BaseCommand<T>`
- Creating WPF elements without switching to UI thread first
- Using `.Result`, `.Wait()`, or `Task.Run` for UI work
- Hardcoding colors instead of using VS theme colors

## Project Structure

```
src/
├── Commands/           # Command handlers (menu items, toolbar buttons)
├── Options/            # Settings/options pages
├── Services/           # Business logic and services
├── Tagging/            # ITagger implementations (syntax highlighting, outlining)
├── Adornments/         # Editor adornments (IntraTextAdornment, margins)
├── QuickInfo/          # QuickInfo/tooltip providers
├── SuggestedActions/   # Light bulb actions
├── Handlers/           # Event handlers (format document, paste, etc.)
├── Resources/          # Images, icons, license files
├── source.extension.vsixmanifest  # Extension manifest
├── VSCommandTable.vsct            # Command definitions (menus, buttons)
├── VSCommandTable.cs              # Auto-generated command IDs
└── *Package.cs                    # Main package class
```

## Community.VisualStudio.Toolkit Patterns

### Global Usings

Extensions using the toolkit should have these global usings in the Package file:

```csharp
global using System;
global using Community.VisualStudio.Toolkit;
global using Microsoft.VisualStudio.Shell;
global using Task = System.Threading.Tasks.Task;
```

### Package Class

```csharp
[PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
[InstalledProductRegistration(Vsix.Name, Vsix.Description, Vsix.Version)]
[ProvideMenuResource("Menus.ctmenu", 1)]
[Guid(PackageGuids.YourExtensionString)]
[ProvideOptionPage(typeof(OptionsProvider.GeneralOptions), Vsix.Name, "General", 0, 0, true, SupportsProfiles = true)]
public sealed class YourPackage : ToolkitPackage
{
    protected override async Task InitializeAsync(CancellationToken cancellationToken, IProgress<ServiceProgressData> progress)
    {
        await this.RegisterCommandsAsync();
    }
}
```

### Commands

Commands use the `[Command]` attribute and inherit from `BaseCommand<T>`:

```csharp
[Command(PackageIds.YourCommandId)]
internal sealed class YourCommand : BaseCommand<YourCommand>
{
    protected override async Task ExecuteAsync(OleMenuCmdEventArgs e)
    {
        // Command implementation
    }

    // Optional: Control command state (enabled, checked, visible)
    protected override void BeforeQueryStatus(EventArgs e)
    {
        Command.Checked = someCondition;
        Command.Enabled = anotherCondition;
    }
}
```

### Options Pages

```csharp
internal partial class OptionsProvider
{
    [ComVisible(true)]
    public class GeneralOptions : BaseOptionPage<General> { }
}

public class General : BaseOptionModel<General>
{
    [Category("Category Name")]
    [DisplayName("Setting Name")]
    [Description("Description of the setting.")]
    [DefaultValue(true)]
    public bool MySetting { get; set; } = true;
}
```

## MEF Components

### Tagger Providers

Use `[Export]` and appropriate `[ContentType]` attributes:

```csharp
[Export(typeof(IViewTaggerProvider))]
[ContentType("CSharp")]
[ContentType("Basic")]
[TagType(typeof(IntraTextAdornmentTag))]
[TextViewRole(PredefinedTextViewRoles.Document)]
internal sealed class YourTaggerProvider : IViewTaggerProvider
{
    [Import]
    internal IOutliningManagerService OutliningManagerService { get; set; }

    public ITagger<T> CreateTagger<T>(ITextView textView, ITextBuffer buffer) where T : ITag
    {
        if (textView == null || !(textView is IWpfTextView wpfTextView))
            return null;

        if (textView.TextBuffer != buffer)
            return null;

        return wpfTextView.Properties.GetOrCreateSingletonProperty(
            () => new YourTagger(wpfTextView)) as ITagger<T>;
    }
}
```

### QuickInfo Sources

```csharp
[Export(typeof(IAsyncQuickInfoSourceProvider))]
[Name("YourQuickInfo")]
[ContentType("code")]
[Order(Before = "Default Quick Info Presenter")]
internal sealed class YourQuickInfoSourceProvider : IAsyncQuickInfoSourceProvider
{
    public IAsyncQuickInfoSource TryCreateQuickInfoSource(ITextBuffer textBuffer)
    {
        return textBuffer.Properties.GetOrCreateSingletonProperty(
            () => new YourQuickInfoSource(textBuffer));
    }
}
```

### Suggested Actions (Light Bulb)

```csharp
[Export(typeof(ISuggestedActionsSourceProvider))]
[Name("Your Suggested Actions")]
[ContentType("text")]
internal sealed class YourSuggestedActionsSourceProvider : ISuggestedActionsSourceProvider
{
    public ISuggestedActionsSource CreateSuggestedActionsSource(ITextView textView, ITextBuffer textBuffer)
    {
        return new YourSuggestedActionsSource(textView, textBuffer);
    }
}
```

## Threading Guidelines

### Always switch to UI thread for WPF operations

```csharp
await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);
// Now safe to create/modify WPF elements
```

### Background work

```csharp
ThreadHelper.JoinableTaskFactory.RunAsync(async () =>
{
    await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
    await VS.Commands.ExecuteAsync("View.TaskList");
});
```

## VSSDK & Threading Analyzer Rules

Extensions should enforce these analyzer rules. Add to `.editorconfig`:

```ini
dotnet_diagnostic.VSSDK*.severity = error
dotnet_diagnostic.VSTHRD*.severity = error
```

### Performance Rules
| ID | Rule | Fix |
|----|------|-----|
| **VSSDK001** | Derive from `AsyncPackage` | Use `ToolkitPackage` (derives from AsyncPackage) |
| **VSSDK002** | `AllowsBackgroundLoading = true` | Add to `[PackageRegistration]` |

### Threading Rules (VSTHRD)
| ID | Rule | Fix |
|----|------|-----|
| **VSTHRD001** | Avoid `.Wait()` | Use `await` |
| **VSTHRD002** | Avoid `JoinableTaskFactory.Run` | Use `RunAsync` or `await` |
| **VSTHRD010** | COM calls require UI thread | `await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync()` |
| **VSTHRD100** | No `async void` | Use `async Task` |
| **VSTHRD110** | Observe async results | `await task;` or suppress with pragma |

## Visual Studio Theming

**All UI must respect VS themes (Light, Dark, Blue, High Contrast)**

### WPF Theming with Environment Colors

```xml
<!-- MyControl.xaml -->
<UserControl x:Class="MyExt.MyControl"
             xmlns:vsui="clr-namespace:Microsoft.VisualStudio.PlatformUI;assembly=Microsoft.VisualStudio.Shell.15.0">
    <Grid Background="{DynamicResource {x:Static vsui:EnvironmentColors.ToolWindowBackgroundBrushKey}}">
        <TextBlock Foreground="{DynamicResource {x:Static vsui:EnvironmentColors.ToolWindowTextBrushKey}}"
                   Text="Hello, themed world!" />
    </Grid>
</UserControl>
```

### Toolkit Auto-Theming (Recommended)

The toolkit provides automatic theming for WPF UserControls:

```xml
<UserControl x:Class="MyExt.MyUserControl"
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
             xmlns:toolkit="clr-namespace:Community.VisualStudio.Toolkit;assembly=Community.VisualStudio.Toolkit"
             toolkit:Themes.UseVsTheme="True">
    <!-- Controls automatically get VS styling -->
</UserControl>
```

For dialog windows, use `DialogWindow`:

```xml
<platform:DialogWindow
    x:Class="MyExt.MyDialog"
    xmlns:platform="clr-namespace:Microsoft.VisualStudio.PlatformUI;assembly=Microsoft.VisualStudio.Shell.15.0"
    xmlns:toolkit="clr-namespace:Community.VisualStudio.Toolkit;assembly=Community.VisualStudio.Toolkit"
    toolkit:Themes.UseVsTheme="True">
</platform:DialogWindow>
```

### Common Theme Color Tokens

| Category | Token | Usage |
|----------|-------|-------|
| **Background** | `EnvironmentColors.ToolWindowBackgroundBrushKey` | Window/panel background |
| **Foreground** | `EnvironmentColors.ToolWindowTextBrushKey` | Text |
| **Command Bar** | `EnvironmentColors.CommandBarTextActiveBrushKey` | Menu items |
| **Links** | `EnvironmentColors.ControlLinkTextBrushKey` | Hyperlinks |

### Theme-Aware Icons

Use `KnownMonikers` from the VS Image Catalog for theme-aware icons:

```csharp
public ImageMoniker IconMoniker => KnownMonikers.Settings;
```

In VSCT:
```xml
<Icon guid="ImageCatalogGuid" id="Settings"/>
<CommandFlag>IconIsMoniker</CommandFlag>
```

## Common VS SDK APIs

### VS Helper Methods (Community.VisualStudio.Toolkit)

```csharp
// Status bar
await VS.StatusBar.ShowMessageAsync("Message");
await VS.StatusBar.ShowProgressAsync("Working...", currentStep, totalSteps);

// Solution/Projects
Solution solution = await VS.Solutions.GetCurrentSolutionAsync();
IEnumerable<SolutionItem> items = await VS.Solutions.GetActiveItemsAsync();
bool isOpen = await VS.Solutions.IsOpenAsync();

// Documents
DocumentView docView = await VS.Documents.GetActiveDocumentViewAsync();
string text = docView?.TextBuffer?.CurrentSnapshot.GetText();
await VS.Documents.OpenAsync(fileName);
await VS.Documents.OpenInPreviewTabAsync(fileName);

// Commands
await VS.Commands.ExecuteAsync("View.TaskList");

// Settings
await VS.Settings.OpenAsync<OptionsProvider.GeneralOptions>();

// Messages
await VS.MessageBox.ShowAsync("Title", "Message");
await VS.MessageBox.ShowErrorAsync("Extension Name", ex.ToString());

// Events
VS.Events.SolutionEvents.OnAfterOpenProject += OnAfterOpenProject;
VS.Events.DocumentEvents.Saved += OnDocumentSaved;
```

### Working with Settings

```csharp
// Read settings synchronously
var value = General.Instance.MyOption;

// Read settings asynchronously
var general = await General.GetLiveInstanceAsync();
var value = general.MyOption;

// Write settings
General.Instance.MyOption = newValue;
General.Instance.Save();

// Or async
general.MyOption = newValue;
await general.SaveAsync();

// Listen for settings changes
General.Saved += OnSettingsSaved;
```

### Text Buffer Operations

```csharp
// Get snapshot
ITextSnapshot snapshot = textBuffer.CurrentSnapshot;

// Get line
ITextSnapshotLine line = snapshot.GetLineFromLineNumber(lineNumber);
string lineText = line.GetText();

// Create tracking span
ITrackingSpan trackingSpan = snapshot.CreateTrackingSpan(span, SpanTrackingMode.EdgeInclusive);

// Edit buffer
using (ITextEdit edit = textBuffer.CreateEdit())
{
    edit.Replace(span, newText);
    edit.Apply();
}

// Insert at caret position
DocumentView docView = await VS.Documents.GetActiveDocumentViewAsync();
if (docView?.TextView != null)
{
    SnapshotPoint position = docView.TextView.Caret.Position.BufferPosition;
    docView.TextBuffer?.Insert(position, "text to insert");
}
```

## VSCT Command Table

### Menu/Command Structure

```xml
<Commands package="YourPackage">
  <Menus>
    <Menu guid="YourPackage" id="SubMenu" type="Menu">
      <Parent guid="YourPackage" id="MenuGroup"/>
      <Strings>
        <ButtonText>Menu Name</ButtonText>
        <CommandName>Menu Name</CommandName>
        <CanonicalName>.YourExtension.MenuName</CanonicalName>
      </Strings>
    </Menu>
  </Menus>

  <Groups>
    <Group guid="YourPackage" id="MenuGroup" priority="0x0600">
      <Parent guid="guidSHLMainMenu" id="IDM_VS_CTXT_CODEWIN"/>
    </Group>
  </Groups>

  <Buttons>
    <Button guid="YourPackage" id="CommandId" type="Button">
      <Parent guid="YourPackage" id="MenuGroup"/>
      <Icon guid="ImageCatalogGuid" id="Settings"/>
      <CommandFlag>IconIsMoniker</CommandFlag>
      <CommandFlag>DynamicVisibility</CommandFlag>
      <Strings>
        <ButtonText>Command Name</ButtonText>
        <CanonicalName>.YourExtension.CommandName</CanonicalName>
      </Strings>
    </Button>
  </Buttons>
</Commands>

<Symbols>
  <GuidSymbol name="YourPackage" value="{guid-here}">
    <IDSymbol name="MenuGroup" value="0x0001"/>
    <IDSymbol name="CommandId" value="0x0100"/>
  </GuidSymbol>
</Symbols>
```

## Best Practices

### 1. Performance

- Check file/buffer size before processing large documents
- Use `NormalizedSnapshotSpanCollection` for efficient span operations
- Cache parsed results when possible
- Use `ConfigureAwait(false)` in library code

```csharp
// Skip large files
if (buffer.CurrentSnapshot.Length > 150000)
    return null;
```

### 2. Error Handling

- Wrap external operations in try-catch
- Log errors appropriately
- Never let exceptions crash VS

```csharp
try
{
    // Operation
}
catch (Exception ex)
{
    await ex.LogAsync();
}
```

### 3. Disposable Resources

- Implement `IDisposable` on taggers and other long-lived objects
- Unsubscribe from events in Dispose

```csharp
public void Dispose()
{
    if (!_isDisposed)
    {
        _buffer.Changed -= OnBufferChanged;
        _isDisposed = true;
    }
}
```

### 4. Content Types

Common content types for `[ContentType]` attribute:
- `"text"` - All text files
- `"code"` - All code files
- `"CSharp"` - C# files
- `"Basic"` - VB.NET files
- `"CSS"`, `"LESS"`, `"SCSS"` - Style files
- `"TypeScript"`, `"JavaScript"` - Script files
- `"HTML"`, `"HTMLX"` - HTML files
- `"XML"` - XML files
- `"JSON"` - JSON files

### 5. Images and Icons

Use `KnownMonikers` from the VS Image Catalog:

```csharp
public ImageMoniker IconMoniker => KnownMonikers.Settings;
```

In VSCT:
```xml
<Icon guid="ImageCatalogGuid" id="Settings"/>
<CommandFlag>IconIsMoniker</CommandFlag>
```

## Testing

- Use `[VsTestMethod]` for tests requiring VS context
- Mock VS services when possible
- Test business logic separately from VS integration

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Blocking UI thread | Always use `async`/`await` |
| Creating WPF on background thread | Call `SwitchToMainThreadAsync()` first |
| Ignoring cancellation tokens | Pass them through async chains |
| VSCommandTable.cs mismatch | Regenerate after VSCT changes |
| Hardcoded GUIDs | Use `PackageGuids` and `PackageIds` constants |
| Swallowing exceptions | Log with `await ex.LogAsync()` |
| Missing DynamicVisibility | Required for `BeforeQueryStatus` to work |
| Using `.Result`, `.Wait()` | Causes deadlocks; always `await` |
| Hardcoded colors | Use VS theme colors (`EnvironmentColors`) |
| `async void` methods | Use `async Task` instead |

## Validation

Build and verify the extension:

```bash
msbuild /t:rebuild
```

Ensure analyzers are enabled in `.editorconfig`:

```ini
dotnet_diagnostic.VSSDK*.severity = error
dotnet_diagnostic.VSTHRD*.severity = error
```

Test in VS Experimental Instance before release.

## NuGet Packages

| Package | Purpose |
|---------|---------|
| `Community.VisualStudio.Toolkit.17` | Simplifies VS extension development |
| `Microsoft.VisualStudio.SDK` | Core VS SDK |
| `Microsoft.VSSDK.BuildTools` | Build tools for VSIX |
| `Microsoft.VisualStudio.Threading.Analyzers` | Threading analyzers |
| `Microsoft.VisualStudio.SDK.Analyzers` | VSSDK analyzers |

## Resources

- [Community.VisualStudio.Toolkit](https://github.com/VsixCommunity/Community.VisualStudio.Toolkit)
- [VS Extensibility Docs](https://learn.microsoft.com/en-us/visualstudio/extensibility/)
- [VSIX Community Samples](https://github.com/VsixCommunity/Samples)

## README and Marketplace Presentation

A good README works on both GitHub and the VS Marketplace. The Marketplace uses the README.md as the extension's description page.

### README Structure

```markdown
[marketplace]: https://marketplace.visualstudio.com/items?itemName=Publisher.ExtensionName
[repo]: https://github.com/user/repo

# Extension Name

[![Build](https://github.com/user/repo/actions/workflows/build.yaml/badge.svg)](...)
[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/Publisher.ExtensionName)][marketplace]
[![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/Publisher.ExtensionName)][marketplace]

Download this extension from the [Visual Studio Marketplace][marketplace]
or get the [CI build](http://vsixgallery.com/extension/ExtensionId/).

--------------------------------------

**Hook line that sells the extension in one sentence.**

![Screenshot](art/screenshot.png)

## Features

### Feature 1
Description with screenshot...

## How to Use
...

## License
[Apache 2.0](LICENSE)
```

### README Best Practices

| Element | Guideline |
|---------|-----------|
| **Title** | Use the same name as `DisplayName` in vsixmanifest |
| **Hook line** | Bold, one-sentence value proposition immediately after badges |
| **Screenshots** | Place in `/art` folder, use relative paths (`art/image.png`) |
| **Image sizes** | Keep under 1MB, 800-1200px wide for clarity |
| **Badges** | Version, downloads, rating, build status |
| **Feature sections** | Use H3 (`###`) with screenshots for each major feature |
| **Keyboard shortcuts** | Format as **Ctrl+M, Ctrl+C** (bold) |
| **Tables** | Great for comparing options or listing features |
| **Links** | Use reference-style links at top for cleaner markdown |

### VSIX Manifest (source.extension.vsixmanifest)

```xml
<Metadata>
  <Identity Id="ExtensionName.guid-here" Version="1.0.0" Language="en-US" Publisher="Your Name" />
  <DisplayName>Extension Name</DisplayName>
  <Description xml:space="preserve">Short, compelling description under 200 chars. This appears in search results and the extension tile.</Description>
  <MoreInfo>https://github.com/user/repo</MoreInfo>
  <License>Resources\LICENSE.txt</License>
  <Icon>Resources\Icon.png</Icon>
  <PreviewImage>Resources\Preview.png</PreviewImage>
  <Tags>keyword1, keyword2, keyword3</Tags>
</Metadata>
```

### Manifest Best Practices

| Element | Guideline |
|---------|-----------|
| **DisplayName** | 3-5 words, no "for Visual Studio" (implied) |
| **Description** | Under 200 chars, focus on value not features. Appears in search tiles |
| **Tags** | 5-10 relevant keywords, comma-separated, helps discoverability |
| **Icon** | 128x128 or 256x256 PNG, simple design visible at small sizes |
| **PreviewImage** | 200x200 PNG, can be same as Icon or a feature screenshot |
| **MoreInfo** | Link to GitHub repo for documentation and issues |

### Writing Tips

1. **Lead with benefits, not features** - "Stop wrestling with XML comments" beats "XML comment formatter"
2. **Show, don't tell** - Screenshots are more convincing than descriptions
3. **Use consistent terminology** - Match terms between README, manifest, and UI
4. **Keep the description scannable** - Short paragraphs, bullet points, tables
5. **Include keyboard shortcuts** - Users love productivity tips
6. **Add a "Why" section** - Explain the problem before the solution
