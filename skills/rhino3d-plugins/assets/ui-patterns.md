# UI Patterns

**What this is.** Ready-to-adapt UI code for Rhino plugins: Eto tabbed panels, modal/semi-modal/
modeless dialogs, Options and Document Properties pages, layout idioms, the Windows-only dock bar
and drag-drop patterns, and the Grasshopper component pair.

**When to reach for it.** When you need to put a UI in front of the user and want the shape that
actually works on both platforms. Eto.Forms is the cross-platform toolkit Rhino 8/9 use for their
own dialogs — it is the only way to write one UI that runs on Windows and Mac. WinForms and WPF
still work, but they are Windows-only and force a `net*-windows` TFM.

All type names and GUIDs below are placeholders. **Regenerate every GUID** — see the warning in §1.

---

## Contents

1. [GUIDs in UI code — regenerate every one](#1-guids-in-ui-code--regenerate-every-one)
2. [Which UI surface to use](#2-which-ui-surface-to-use)
3. [Eto tabbed panel (`IPanel` + `Panels.RegisterPanel`)](#3-eto-tabbed-panel-ipanel--panelsregisterpanel)
4. [Eto modal dialog — `Dialog<T>` + `ShowModal`](#4-eto-modal-dialog--dialogt--showmodal)
5. [Semi-modal and modeless variants](#5-semi-modal-and-modeless-variants)
6. [`Rhino.UI.Forms.CommandDialog`](#6-rhinouiformscommanddialog)
7. [Options / Document Properties pages](#7-options--document-properties-pages)
8. [Layout: DynamicLayout vs TableLayout vs StackLayout](#8-layout-dynamiclayout-vs-tablelayout-vs-stacklayout)
9. [Windows-only: dock bars (WinForms + WPF)](#9-windows-only-dock-bars-winforms--wpf)
10. [Windows-only: drag source and `RhinoDropTarget`](#10-windows-only-drag-source-and-rhinodroptarget)
11. [Grasshopper: `GH_Component` + `GH_AssemblyInfo`](#11-grasshopper-gh_component--gh_assemblyinfo)

---

## 1. GUIDs in UI code — regenerate every one

Every `[Guid]` and every `ComponentGuid` in this file is
`00000000-0000-0000-0000-000000000000`. **Generate a fresh GUID for each one.** Never copy a GUID
out of a McNeel sample, a template, or this document — a duplicate makes two types claim one
identity, and the failure is silent.

| Slot | Consequence of a collision | Consequence of changing it later |
|---|---|---|
| Panel class `[Guid]` (the panel id) | The wrong panel opens | The user's saved sidebar layout forgets your panel |
| Dock bar `BarId` constant | The wrong bar shows | Saved dock layout forgets your bar |
| `UserData` subclass `[Guid]` | Data deserializes into the wrong type | Every `.3dm` already written silently drops your data |
| Render content `[Guid]` | Content registration conflict | Existing scenes lose your content |
| GH `ComponentGuid` | GH cannot tell your components apart | **Every saved `.gh` file using the component is orphaned** |

---

## 2. Which UI surface to use

| Surface | Cross-platform | Modeless | Use for |
|---|---|---|---|
| **`Rhino.UI.Panels`** (tabbed sidebar) | Yes | Yes | Persistent tool UI that lives alongside Layers/Properties. The default choice for anything modeless. |
| **Eto `Dialog<T>`** via `ShowModal` | Yes | No | Ask-then-act: settings for one command run. |
| **Eto `Dialog<T>`** via `ShowSemiModal` | Yes | Partly | Modal to Rhino, but the user can still pick in the viewport. |
| **Eto `Form`** with `Owner` | Windows in practice | Yes | Modeless tool windows. **Not currently supported on Mac** — use a Panel instead. |
| **`Rhino.UI.Forms.CommandDialog`** | Yes | No | A dialog with Rhino's standard chrome, with less boilerplate. |
| **`OptionsDialogPage`** | Yes | Platform-dependent | Preferences that belong in Options or Document Properties. |
| **`RhinoWindows.Controls.DockBar`** | **Windows only** | Yes | Legacy floating/dockable toolbar windows. Prefer Panels for new work. |

**Panels and dock bars are different systems, not variants of one.** `Rhino.UI.Panels` is portable
and lives in the tabbed sidebar; `RhinoWindows.Controls.DockBar` is a Windows-only floating window
in the separate `RhinoWindows` package.

---

## 3. Eto tabbed panel (`IPanel` + `Panels.RegisterPanel`)

The workhorse. A `Panel` subclass implementing `IPanel`, carrying its own `[Guid]`, registered once
and then opened/closed by id.

```csharp
using Eto.Drawing; using Eto.Forms; using Rhino.UI;

namespace MyPlugin.Views
{
  /// <summary>
  /// The class GUID is REQUIRED and IS the panel id. Generate a fresh one;
  /// never reuse a GUID from a sample.
  /// </summary>
  [System.Runtime.InteropServices.Guid("00000000-0000-0000-0000-000000000000")]
  public class MyPanel : Panel, IPanel
  {
    readonly uint m_document_sn;

    /// <summary>Everything else keys off this.</summary>
    public static System.Guid PanelId => typeof(MyPanel).GUID;

    /// Rhino constructs this reflectively. Supported constructor signatures include
    /// parameterless, (uint documentSerialNumber), (RhinoDoc), and
    /// (Guid runtimeId, RhinoDoc). This example uses the serial-number form.
    /// </summary>
    public MyPanel(uint documentSerialNumber)
    {
      m_document_sn = documentSerialNumber;
      Title = "My Panel";

      var helloButton = new Button { Text = "Hello..." };
      helloButton.Click += (sender, e) => OnHelloButton();
      var infoLabel = new Label { Text = $"Document serial number: {documentSerialNumber}" };

      var layout = new DynamicLayout { DefaultSpacing = new Size(5, 5), Padding = new Padding(10) };
      layout.AddSeparateRow(helloButton, null);   // trailing null = stretchy spacer
      layout.AddSeparateRow(infoLabel, null);
      layout.Add(null);                           // trailing null row absorbs vertical slack
      Content = layout;
    }

    public string Title { get; }

    // Use the Rhino common message box and NOT Eto.Forms.MessageBox. The Eto
    // version expects a top-level Eto Window as the owner and will cause
    // problems on the Mac: a docked panel is a child of some Rhino container
    // and has no top-level Eto Window.
    protected void OnHelloButton() => Dialogs.ShowMessage("Hello Rhino!", Title);

    /// <summary>A child dialog CAN be shown modally from inside a panel.</summary>
    protected void OnChildButton() => new MyHelloWorldDialog().ShowModal(this);

    #region IPanel methods — all three are required

    // Panel tab became visible. On Mac this also fires for a document panel when
    // a new document becomes active: the previous document's panel is hidden and
    // the new one shown. Start timers / attach event handlers here.
    public void PanelShown(uint documentSerialNumber, ShowPanelReason reason) { }

    // Mirror of PanelShown. Stop timers, detach expensive event handlers.
    public void PanelHidden(uint documentSerialNumber, ShowPanelReason reason) { }

    // The document or the panel container is closing. Persist panel state here.
    public void PanelClosing(uint documentSerialNumber, bool onCloseDocument) { }

    #endregion
  }
}
```

### Registration and show/hide

Register **before** anything tries to open the panel. Either `PlugIn.OnLoad` or a command's
constructor works — commands are constructed once when the plugin loads.

```csharp
// In PlugIn.OnLoad, or in the command's constructor:
Panels.RegisterPanel(
  MyPluginPlugin.Instance,       // the owning plug-in instance
  typeof(Views.MyPanel),        // the panel type
  "My Panel",                   // caption on the tab
  Properties.Resources.MyPanelIcon);

// There is also a PanelType overload for a system-wide (rather than
// per-document) panel:
//   Panels.RegisterPanel(this, typeof(MyPanel), "My Panel", icon, PanelType.System);

// Elsewhere — driving it from a command:
System.Guid panelId = Views.MyPanel.PanelId;
bool visible = Panels.IsPanelVisible(panelId);
Panels.OpenPanel(panelId);
Panels.ClosePanel(panelId);
```

A show/hide/toggle command is the standard command-line-option idiom around those three calls:
`AddOption` returns an index, and you compare it against `go.Option().Index`.

```csharp
var go = new GetOption();
go.SetCommandPrompt(visible ? "Panel is visible. New value" : "Panel is hidden. New value");
int hideIndex = go.AddOption("Hide");
int showIndex = go.AddOption("Show");
int toggleIndex = go.AddOption("Toggle");
go.Get();
if (go.CommandResult() != Result.Success) return go.CommandResult();
var option = go.Option();
// The user pressed Enter without choosing. The command ran correctly and there is
// nothing to do, so this is Nothing — not Failure. Returning Failure here makes a
// working command look broken in the command history and in any calling script.
if (null == option) return Result.Nothing;
// ...compare option.Index against hideIndex / showIndex / toggleIndex...
```

### Rules that are easy to get wrong

- The panel class **must** carry a `[Guid]` attribute — that GUID *is* the panel id.
- The constructor must be parameterless, `(uint documentSerialNumber)`, `(RhinoDoc)`, or
  `(Guid runtimeId, RhinoDoc)`. Rhino constructs it reflectively; other signatures fail silently.
- `RegisterPanel` must run before `OpenPanel`.
- A panel that selects objects has to handle the ones that cannot be selected. `Objects.Select`
  is a no-op on a locked or hidden object and returns without complaint, so a row click appears
  to do nothing and the panel looks broken. Test `obj.IsSelectable(true, false, false, false)`
  first and tell the user why the object did not highlight.
- Inside a panel use `Rhino.UI.Dialogs.ShowMessage`, **never** `Eto.Forms.MessageBox`.
- Prefer `RhinoEtoApp.MainWindowForDocument(doc)` over `RhinoEtoApp.MainWindow` when you need a
  parent window, especially on Mac where multiple documents mean multiple main windows. Avoid
  `RhinoDoc.ActiveDoc` in UI code — take the document from the serial number you were handed.

### Useful `Rhino.UI` extension methods on Eto controls

| Extension | Does |
|---|---|
| `UseRhinoStyle()` | Applies Rhino styling; follows the user's Dark/Light mode |
| `RestorePosition()` / `SavePosition()` | Remembers a window's position across sessions |
| `GetRhinoDoc()` | The `RhinoDoc` a control belongs to |
| `LocalizeAndRestore()` | Localization + position restore in one call |
| `PushPickButton()` | Hides the form while the user picks in the viewport |
| `ToEto()` / `ToSD()` | Convert between `System.Drawing` and `Eto.Drawing` types |

---

## 4. Eto modal dialog — `Dialog<T>` + `ShowModal`

```csharp
using Eto.Drawing;
using Eto.Forms;
using Rhino.UI;              // for RestorePosition / SavePosition
using System;
using System.ComponentModel;

namespace MyPlugin.Views
{
  class MyModalDialog : Dialog<DialogResult>
  {
    public MyModalDialog()
    {
      Padding = new Padding(5);
      Resizable = false;
      Title = "My Dialog";
      WindowStyle = WindowStyle.Default;

      // What Result holds if the user closes with the window's X button.
      Result = DialogResult.Cancel;

      var helloButton = new Button { Text = "Hello" };
      helloButton.Click += (sender, e) => OnHelloButton();

      // DefaultButton fires on Enter; AbortButton fires on Escape.
      DefaultButton = new Button { Text = "OK" };
      DefaultButton.Click += (sender, e) => Close(DialogResult.Ok);

      AbortButton = new Button { Text = "Cancel" };
      AbortButton.Click += (sender, e) => Close(DialogResult.Cancel);

      // null cells are stretchy spacers: (null, x, null) centres, (x, null)
      // left-aligns, (null, x, y) right-aligns.
      Content = new TableLayout
      {
        Padding = new Padding(5), Spacing = new Size(5, 5),
        Rows =
        {
          new TableRow(new TableLayout { Spacing = new Size(5, 5),
            Rows = { new TableRow(null, helloButton, null) } }),
          new TableRow(new TableLayout { Spacing = new Size(5, 5),
            Rows = { new TableRow(null, DefaultButton, AbortButton) } })
        }
      };
    }

    // Rhino.UI extensions — remember the window position across sessions.
    protected override void OnLoadComplete(EventArgs e)
    {
      base.OnLoadComplete(e);
      this.RestorePosition();
    }

    protected override void OnClosing(CancelEventArgs e)
    {
      this.SavePosition();
      base.OnClosing(e);
    }

    // A top-level dialog DOES have an Eto Window, so Eto's MessageBox is fine
    // here. Inside a docked Panel it is not — see §3.
    protected void OnHelloButton()
      => MessageBox.Show(this, "Hello Rhino!", Title, MessageBoxButtons.OK);
  }
}
```

Showing it from a command:

```csharp
protected override Result RunCommand(RhinoDoc doc, RunMode mode)
{
  // Never show a dialog in scripted mode — fall back to command-line prompts.
  if (mode != RunMode.Interactive)
  {
    RhinoApp.WriteLine($"Scriptable version of {EnglishName} not implemented.");
    return Result.Cancel;
  }

  var dialog = new Views.MyModalDialog();
  Eto.Forms.DialogResult rc = dialog.ShowModal(RhinoEtoApp.MainWindowForDocument(doc));

  return rc == Eto.Forms.DialogResult.Ok ? Result.Success : Result.Cancel;
}
```

To return your own data rather than a `DialogResult`, derive from `Dialog<MyArgs>` and set `Result`
to a populated instance before `Close()`, or expose a `Results` property the caller reads after
`ShowModal` returns true.

---

## 5. Semi-modal and modeless variants

### Semi-modal — modal to Rhino, but the user can still pick in the viewport

```csharp
var dialog = new Views.MySemiModalDialog();
Eto.Forms.DialogResult rc = dialog.ShowSemiModal(doc, RhinoEtoApp.MainWindow);
```

Note it takes the `RhinoDoc` as well as the parent window. This is what you want for a dialog that
prompts "pick a curve" mid-flow.

### Modeless form — **must** set `Owner`

> **WARNING: modeless Eto forms are not currently supported on Mac.** For cross-platform modeless
> UI, use a Panel (§3) instead.

The class is an ordinary `Eto.Forms.Form` — build `Content` exactly as in §4, and use the same
`OnLoadComplete` / `OnClosing` overrides for `RestorePosition()` / `SavePosition()`. What matters is
how you show it:

```csharp
// Hold the reference somewhere (a static or plug-in field) so it is not
// garbage-collected. This pattern is Windows-only; always set Owner so the form stays
// associated with Rhino. Use a Panel for modeless UI on Mac.
Form = new Views.MyModelessForm { Owner = RhinoEtoApp.MainWindow };
Form.Show();
```

---

## 6. `Rhino.UI.Forms.CommandDialog`

A Rhino-supplied Eto `Dialog` base carrying Rhino's standard chrome, so you write only content.

```csharp
using Eto.Drawing; using Eto.Forms; using Rhino.UI.Forms;

class MyHelloWorldDialog : CommandDialog
{
  public MyHelloWorldDialog()
  {
    Padding = new Padding(10);
    Title = "Hello World";
    Resizable = false;
    Content = new StackLayout
    {
      Spacing = 6,
      Items = { new Label { Text = "This is a child dialog..." } }
    };
  }
}
```

Show it the same way as any Eto dialog: `dialog.ShowModal(parent)`. From inside a panel, pass the
panel itself as the parent.

---

## 7. Options / Document Properties pages

### Registration

Override on your `PlugIn` subclass and add pages to the supplied list:

```csharp
using System.Collections.Generic;
using Rhino;
using Rhino.UI;

public class MyPluginPlugin : Rhino.PlugIns.PlugIn
{
  /// <summary>Application-level Options (plug-in settings, follow the user).</summary>
  protected override void OptionsDialogPages(List<OptionsDialogPage> pages)
  {
    pages.Add(new Views.MyOptionsPage());
  }

  /// <summary>
  /// Per-document Document Properties (settings that travel in the .3dm).
  /// Do NOT reuse MyOptionsPage here -- it persists through the global
  /// PlugIn.Settings, so the "per-document" page would silently edit user
  /// preferences instead. Register a separate document-aware page that takes
  /// the supplied doc (or its serial number) and persists through document
  /// user data -- see rule 7 and "Which list to register in" below.
  /// </summary>
  protected override void DocumentPropertiesDialogPages(RhinoDoc doc, List<OptionsDialogPage> pages)
    => pages.Add(new Views.MyDocPropertiesPage(doc.RuntimeSerialNumber));

  /// <summary>Object Properties panel pages, for completeness.</summary>
  protected override void ObjectPropertiesPages(ObjectPropertiesPageCollection collection)
    => collection.Add(new Views.MyPropertiesPage());
}
```

`OptionsDialogPage` derives from `StackedDialogPage`, which supplies the lifecycle. The UI can be
WinForms (Windows), WPF (Windows) or **Eto (both)** — use Eto if the plugin is cross-platform.

### The page + control pair

Keep the page thin and put the UI in a separate control, so `PageControl` can cache exactly one
instance.

```csharp
using Eto.Drawing;
using Eto.Forms;
using Rhino.UI;

namespace MyPlugin.Views
{
  class MyOptionsPage : OptionsDialogPage
  {
    private MyOptionsPageControl m_control;

    // "My Plugin" is the label in the Options tree. Do NOT initialize UI or read
    // settings in this constructor — the page object is created long before it
    // is shown, and possibly without ever being shown.
    public MyOptionsPage() : base("My Plugin") { }

    /// <summary>
    /// Referenced the FIRST time the page is displayed. Return the one and only
    /// page control — create it lazily and cache it. Never build a new control
    /// per call.
    /// </summary>
    public override object PageControl
      => m_control ?? (m_control = new MyOptionsPageControl());

    public override System.Drawing.Image PageImage => Properties.Resources.MyPageIcon;

    public override bool OnActivate(bool active) => m_control == null || m_control.OnActivate(active);
    public override bool OnApply() => m_control == null || m_control.OnApply();
    public override void OnCancel() => m_control?.OnCancel();
    public override void OnDefaults() => m_control?.OnDefaults();
  }

  class MyOptionsPageControl : Panel
  {
    private readonly CheckBox m_check = new CheckBox { Text = "Enable the thing" };

    // Snapshot of the settings as they were when the page was activated, so
    // OnCancel can restore them (Windows only — see the platform contract).
    private bool m_original_flag;

    public MyOptionsPageControl()
    {
      var layout = new DynamicLayout { DefaultSpacing = new Size(5, 5), Padding = new Padding(10) };
      layout.AddSeparateRow(m_check, null);
      layout.Add(null);
      Content = layout;
    }

    /// <summary>
    /// active == true when this becomes the current, visible page. THIS is where
    /// you read settings into the controls — not the constructor. Snapshot the
    /// originals here too. Called with false when the page stops being current.
    /// </summary>
    public bool OnActivate(bool active)
    {
      if (active)
      {
        m_original_flag = MyPluginPlugin.Instance.Settings.GetBool("EnableTheThing", false);
        m_check.Checked = m_original_flag;
      }
      return true;
    }

    /// <summary>
    /// Commit the queued changes. MUST be authoritative and idempotent — on Mac
    /// this is the only callback that ever fires (see below).
    /// </summary>
    public bool OnApply()
    {
      MyPluginPlugin.Instance.Settings.SetBool("EnableTheThing", m_check.Checked ?? false);
      return true;
    }

    /// <summary>Restore the snapshot. WINDOWS ONLY — never called on Mac.</summary>
    public void OnCancel()
      => MyPluginPlugin.Instance.Settings.SetBool("EnableTheThing", m_original_flag);

    /// <summary>Restore Defaults button.</summary>
    public void OnDefaults() => m_check.Checked = false;
  }
}
```

### The platform contract — the part that bites

|  | **Windows** | **Mac** |
|---|---|---|
| The dialog | One **modal** Options / Document Properties dialog (`Options`, `DocumentProperties` commands) | Two **modeless** windows: *Rhinoceros > Preferences* and *File > Settings*. Never really closed — only hidden and shown |
| Page list queried | **Every time** the dialog is displayed | Preferences: the **first time only, never again**. File Settings: first time, plus **each time a new document is created** (per-document page lists) |
| `PageControl` | Created the first time the page is made current | Same, per document instance |
| `OnActivate(true)` | Page becomes current | Page becomes active, **or** the window becomes active with a page already active |
| `OnActivate(false)` | Page stops being current | Active page changes, **or** the window is deactivated/hidden |
| `OnApply` | After `OnActivate(false)` | At those same two moments — **applying happens on window deactivation**, not on an OK button |
| `OnCancel` | Called for **every** page displayed while the dialog was open | **NEVER CALLED** |

### Practical rules distilled

1. **Because Mac never calls `OnCancel` and applies on window deactivation, treat `OnApply` as the
   single source of truth and make it idempotent.** Never design a page whose correctness depends on
   `OnCancel` firing.
2. Snapshot originals in `OnActivate(true)` so `OnCancel` has something to restore on Windows.
3. Initialize in `OnActivate`, never in the constructor.
4. Return one cached control from `PageControl`.
5. Live-preview changes are fine, but queue the authoritative write for `OnApply`.
6. Because Windows re-queries the page list on every open, page objects are throwaway — persist in
   settings, not in fields, and keep them cheap to construct.
7. A document page must read its state from the document it is handed, never from a static field —
   Mac re-queries per document.

### Which list to register in

- **`OptionsDialogPages`** — preferences that follow the user across all files: API endpoints, UI
  toggles, default units. Persist with `PlugIn.Settings`
  (`GetBool/SetBool/GetString/SetString/GetDouble/SetDouble`) — survives documents and sessions with
  no plumbing.
- **`DocumentPropertiesDialogPages`** — data belonging to *this .3dm* that must travel with the
  file: per-model tolerances, layer-mapping tables, analysis parameters. Persist as plug-in user
  data on the document, and mark the document modified so the user is prompted to save.

---

## 8. Layout: DynamicLayout vs TableLayout vs StackLayout

| Layout | Style | Best for |
|---|---|---|
| **`DynamicLayout`** | Imperative, row at a time: `AddRow`, `AddSeparateRow`, `Add(null)` | Forms you are building in code and iterating on. The pragmatic default. |
| **`TableLayout`** | Declarative grid: `Rows = { new TableRow(...) }` | Precise alignment — button rows, label/field grids. |
| **`StackLayout`** | Single-direction stacking: `Items`, `Spacing`, `Orientation` | Simple vertical or horizontal runs. |

### The `null` stretchy-spacer idiom

This is the one Eto trick worth memorising. **A `null` cell is a spacer that absorbs all leftover
space.** Its position controls alignment:

```csharp
// Left-aligned: spacer on the right
Rows = { new TableRow(button, null) }

// Right-aligned: spacer on the left
Rows = { new TableRow(null, DefaultButton, AbortButton) }

// Centred: spacers on both sides
Rows = { new TableRow(null, button, null) }

// DynamicLayout: a trailing Add(null) row absorbs vertical slack,
// pinning your content to the top instead of stretching it.
layout.AddSeparateRow(helloButton, null);
layout.AddSeparateRow(infoLabel, null);
layout.Add(null);
```

Without the trailing `Add(null)`, `DynamicLayout` distributes vertical space across your rows and
the controls float apart. Nesting a `TableLayout` inside a `DynamicLayout` row (or vice versa) is
normal and is how the McNeel samples build button bars.

---

## 9. Windows-only: dock bars (WinForms + WPF)

> **Windows-only.** Requires the `RhinoWindows` package and a `net*-windows` TFM. Panels (§3) are
> the cross-platform equivalent and the better choice for new work. Dock bars exist for Windows-only
> legacy UI.

```csharp
using Rhino.PlugIns;
using RhinoWindows.Controls;
using System;

namespace MyPlugin
{
  public class MyDockBarPlugIn : Rhino.PlugIns.PlugIn
  {
    private WinFormsDockBar m_winforms_bar;
    private WpfDockBar m_wpf_bar;

    public MyDockBarPlugIn() { Instance = this; }
    public static MyDockBarPlugIn Instance { get; private set; }

    protected override LoadReturnCode OnLoad(ref string errorMessage)
    {
      // Note Visible = false: construction and display are separate steps.
      var options = new DockBarCreateOptions
      {
        DockLocation = DockBarDockLocation.Right,
        DockStyle    = DockBarDockStyle.Any,
        Visible      = false,
        FloatPoint   = new System.Drawing.Point(100, 100)
      };
      m_winforms_bar = new WinFormsDockBar(); m_winforms_bar.Create(options);
      m_wpf_bar = new WpfDockBar();           m_wpf_bar.Create(options);

      return base.OnLoad(ref errorMessage);
    }
  }

  /// <summary>Hosting a WinForms UserControl — it goes in directly.</summary>
  internal class WinFormsDockBar : DockBar
  {
    // Hand-minted GUID constant. REGENERATE — do not copy.
    public static Guid BarId => new Guid("{00000000-0000-0000-0000-000000000000}");
    public WinFormsDockBar() : base(MyDockBarPlugIn.Instance, BarId, "WinForms")
      => SetContentControl(new MyWinFormPanel());
  }

  /// <summary>Hosting a WPF UserControl — must be wrapped in a WpfHost.</summary>
  internal class WpfDockBar : DockBar
  {
    public static Guid BarId => new Guid("{00000000-0000-0000-0000-000000000000}");  // REGENERATE
    public WpfDockBar() : base(MyDockBarPlugIn.Instance, BarId, "WPF")
      => SetContentControl(new WpfHost(new MyWpfPanel(), null));
  }
}
```

Showing them from a command:

```csharp
protected override Result RunCommand(RhinoDoc doc, RunMode mode)
{
  RhinoWindows.Controls.DockBar.Show(WinFormsDockBar.BarId, false);
  RhinoWindows.Controls.DockBar.Show(WpfDockBar.BarId, false);
  return Result.Success;
}
```

The hosted controls are ordinary WinForms / WPF `UserControl`s — nothing Rhino-specific about them;
add them with your IDE's normal templates. The point of the pattern is the hosting, not the content.

The `.csproj` needs `UseWindowsForms` **and** `UseWPF` both true to host both in one assembly, plus
the `RhinoWindows` PackageReference — see the Windows-only csproj in the project template file.

---

## 10. Windows-only: drag source and `RhinoDropTarget`

> **Windows-only.** `RhinoDropTarget` lives in `RhinoWindows.Forms`.

Two halves: a control that *starts* a drag, and a drop target that receives drops anywhere in Rhino
— on a view, on an object, on a sub-object, or on a layer in the Layers panel.

### The drag source (a WinForms panel)

```csharp
// Panel identity is the control's own type GUID. REGENERATE.
[Guid("00000000-0000-0000-0000-000000000000")]
public partial class MyDragPanel : UserControl
{
  private bool m_dragging;
  private int m_drag_item_index = -1;

  public static Guid PanelId => typeof(MyDragPanel).GUID;
  public MyDragPanel() { InitializeComponent(); }

  private void OnListBoxMouseDown(object sender, MouseEventArgs e)
    => m_drag_item_index = m_listbox.IndexFromPoint(e.Location);

  private void OnListBoxMouseMove(object sender, MouseEventArgs e)
  {
    int itemIndex = m_listbox.IndexFromPoint(e.Location);

    // Start dragging only once the cursor has moved OFF the pressed item.
    // m_dragging is a re-entrancy guard — DoDragDrop pumps messages.
    if (m_drag_item_index < 0 || m_dragging || itemIndex == m_drag_item_index) return;

    m_dragging = true;
    // Passing `this` makes the whole control the drag payload; the drop side
    // recovers it with dataObject.GetData(typeof(MyDragPanel)).
    m_listbox.DoDragDrop(this, DragDropEffects.All);
    m_dragging = false;
    m_drag_item_index = -1;
  }

  public string DropString =>
    m_drag_item_index < 0 ? "<empty>" : m_listbox.Items[m_drag_item_index] as string;
}
```

### The drop target

```csharp
using Rhino; using Rhino.Display; using Rhino.DocObjects;
using RhinoWindows.Forms; using System.Drawing; using System.Windows.Forms;

internal class MyDropTarget : RhinoDropTarget
{
  public MyDropTarget()
  {
    Enable = true;
    AllowDropOnLayer = true;
    AllowDropOnObject = true;
    AllowDropOnRhinoView = true;
    AllowDropOnSubObject = true;
  }

  /// <summary>The gate: is this payload interesting at all? Return false and
  /// Rhino stops asking about this drag.</summary>
  protected override bool SupportDataObject(DataObject data)
    => !string.IsNullOrEmpty(DropString(data));

  // One OnDropOn* override per target kind; OnDropOnSubObject also exists.
  protected override bool OnDropOnLayer(RhinoDoc doc, Layer layer, DataObject dataObject,
                                        DragDropEffects dropEffect, Point point)
  {
    RhinoApp.WriteLine($"Dropped {DropString(dataObject)} on layer {layer.Name}");
    return true;
  }

  protected override bool OnDropOnRhinoView(RhinoView rhinoView, DataObject dataObject,
                                            DragDropEffects dropEffect, Point point) => true;

  protected override bool OnDropOnObject(ObjRef objRef, RhinoView rhinoView, DataObject dataObject,
                                         DragDropEffects dropEffect, Point point) => true;

  // The drag payload was the control itself, so recover it by type.
  private string DropString(DataObject dataObject)
    => (dataObject?.GetData(typeof(MyDragPanel)) as MyDragPanel)?.DropString;
}
```

### Wiring both up in `OnLoad`

```csharp
private MyDropTarget m_drop_target = null!;

protected override LoadReturnCode OnLoad(ref string errorMessage)
{
  m_drop_target = new MyDropTarget();

  Panels.RegisterPanel(this, typeof(MyDragPanel), "My Panel", null);

  // First-run-only auto-open: read default-true, immediately write false, act.
  // The panel shows itself once on install and never nags again.
  if (Settings.GetBool("DisplayPanelByDefault", true))
  {
    Settings.SetBool("DisplayPanelByDefault", false);
    Panels.OpenPanel(MyDragPanel.PanelId);
  }

  return base.OnLoad(ref errorMessage);
}
```

---

## 11. Grasshopper: `GH_Component` + `GH_AssemblyInfo`

### `GH_AssemblyInfo` — one per `.gha`

Provides the library-level metadata Grasshopper shows in the ribbon.

```csharp
using Grasshopper.Kernel;
using System;
using System.Drawing;

namespace MyPluginGh
{
  public class MyPluginGhInfo : GH_AssemblyInfo
  {
    public override string Name => "MyPluginGh";
    public override Bitmap Icon => Properties.Resources.MyPluginGh_24x24;
    public override string Description => "Grasshopper components for MyPlugin.";
    public override string AuthorName => "My Company";
    public override string AuthorContact => "support@example.invalid";

    // Library id. Fresh GUID, stable forever. REGENERATE.
    public override Guid Id => new Guid("00000000-0000-0000-0000-000000000000");
  }
}
```

### `GH_Component`

```csharp
using System;
using Grasshopper.Kernel;
using Grasshopper.Kernel.Types;
using Rhino;
using Rhino.Geometry;

namespace MyPluginGh.Components
{
  public class MyRectangleComponent : GH_Component
  {
    // base(name, nickname, description, category, subCategory)
    // category = the ribbon tab, subCategory = the panel within it.
    public MyRectangleComponent()
      : base("Rectangle Center", "CRect", "Create a center rectangle on a plane",
             "MyPlugin", "Geometry") { }

    protected override void RegisterInputParams(GH_Component.GH_InputParamManager pManager)
    {
      // Add*Parameter(name, nickname, description, access, [defaultValue])
      // A default value makes the input optional.
      pManager.AddPlaneParameter ("Plane",  "P", "Rectangle base plane",     GH_ParamAccess.item, Plane.WorldXY);
      pManager.AddNumberParameter("X Size", "X", "Size in plane X direction", GH_ParamAccess.item, 1.0);
      pManager.AddNumberParameter("Y Size", "Y", "Size in plane Y direction", GH_ParamAccess.item, 1.0);
    }

    protected override void RegisterOutputParams(GH_Component.GH_OutputParamManager pManager)
    {
      pManager.AddGenericParameter("Rectangle", "R", "Rectangle",              GH_ParamAccess.item);
      pManager.AddNumberParameter ("Length",    "L", "Length of the boundary", GH_ParamAccess.item);
    }

    protected override void SolveInstance(IGH_DataAccess DA)
    {
      var plane = Plane.Unset;
      var x = RhinoMath.UnsetValue;
      var y = RhinoMath.UnsetValue;

      // GetData returns false when the input is missing -> bail out quietly.
      if (!DA.GetData(0, ref plane)) return;
      if (!DA.GetData(1, ref x)) return;
      if (!DA.GetData(2, ref y)) return;

      if (!plane.IsValid ||
          !RhinoMath.IsValidDouble(x) ||
          !RhinoMath.IsValidDouble(y)) return;

      if (Math.Abs(x) < 1e-12 || Math.Abs(y) < 1e-12)
      {
        // Warning / Error / Remark — this is how a component talks to the user.
        AddRuntimeMessage(GH_RuntimeMessageLevel.Warning, "Rectangle dimensions cannot be zero.");
        return;
      }

      var rect = new Rectangle3d(plane, new Interval(-x * 0.5, x * 0.5),
                                        new Interval(-y * 0.5, y * 0.5));
      DA.SetData(0, new GH_Rectangle(rect));
      DA.SetData(1, rect.Circumference);
    }

    /// <summary>Ribbon sub-tab position; flags are OR-able.</summary>
    public override GH_Exposure Exposure => GH_Exposure.primary;

    protected override System.Drawing.Bitmap Icon => Properties.Resources.MyRectangle_24x24;

    // =======================================================================
    // ComponentGuid MUST be unique and MUST NEVER CHANGE once released.
    // Grasshopper uses it to reconnect components inside saved .gh files.
    // Change it and every existing definition using this component is orphaned
    // — the user sees a red placeholder with no wires.
    // REGENERATE for a NEW component; freeze it thereafter.
    // =======================================================================
    public override Guid ComponentGuid => new Guid("00000000-0000-0000-0000-000000000000");
  }
}
```

### `GH_ParamAccess` ↔ `DA` method correspondence

The access mode you declare in `RegisterInputParams` **must** match the `DA` method you call in
`SolveInstance`. Mismatching them is the most common GH component bug.

| Declared access | Read with | Write with | `SolveInstance` runs |
|---|---|---|---|
| `GH_ParamAccess.item` | `DA.GetData(i, ref value)` | `DA.SetData(i, value)` | once per item — GH does the data-tree iteration for you |
| `GH_ParamAccess.list` | `DA.GetDataList(i, list)` | `DA.SetDataList(i, list)` | once per branch |
| `GH_ParamAccess.tree` | `DA.GetDataTree(i, out tree)` | `DA.SetDataTree(i, tree)` | once for the whole tree — you handle the structure |

```csharp
var curves = new List<Curve>();                                   // list access
if (!DA.GetDataList(0, curves)) return;
if (!DA.GetDataTree(0, out GH_Structure<GH_Number> tree)) return; // tree access
```

Use `item` unless you genuinely need a whole branch or the whole tree at once — GH's automatic data
matching is usually what the user expects.

### Two last details

- **`GH_Exposure` values:** `primary`, `secondary`, `tertiary`, `quarternary` (McNeel's spelling),
  `quinary`, `senary`, `septenary`, `hidden`, `obscure`. They are flags, so
  `GH_Exposure.quarternary | GH_Exposure.obscure` is legal — that places the component in the fourth
  group but keeps it out of the default ribbon.
- **Icons** are 24×24 PNGs embedded through a `.resx`. On .NET 7+ that requires
  `<GenerateResourceUsePreserializedResources>true</GenerateResourceUsePreserializedResources>`
  **and** the `System.Resources.Extensions` package — both, or neither works.
