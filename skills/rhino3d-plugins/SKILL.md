---
name: rhino3d-plugins
description: 'Rhino3D plugin and script development with the RhinoCommon SDK — .rhp plugins and commands, Grasshopper .gha components, Eto panels, dialogs and options pages, user data and document persistence, display conduits, render engine integration, Python scripting, and yak packaging.'
---

# Rhino3D Plugins

Use this skill whenever Rhino, Rhino3D, Rhinoceros, RhinoCommon, Grasshopper, McNeel,
`Eto.Forms`, `rhinoscriptsyntax`, `rhino3dm`, `Rhino.Inside`, `Rhino.Compute`, or a
`.rhp | .gha | .gh | .3dm | .yak` file comes up — and also when the user is writing code
against NURBS curves, Breps, SubD, meshes, layers, blocks, or document objects in a Rhino
context, even if they never say "plugin". See below on when to use.

## When to use

- For a new plugin, component, or script
- For editing or debugging an existing one
- For "why won't my plugin load" or "my command doesn't appear" and Rhino files are used
- For a boolean, join, or offset that silently returns null or an empty array
- For porting between Rhino 7, 8, and 9

## RhinoCommon SDK

RhinoCommon is the cross-platform .NET SDK for Rhino. A plugin is an ordinary .NET assembly
renamed to `.rhp`, loaded into Rhino's process, hosting `Command` classes that Rhino invokes
by name. Grasshopper is itself a plugin; its components live in `.gha` assemblies.

Three things make Rhino work differ from ordinary .NET work, and most mistakes trace back to
one of them. First, `Rhino.Geometry` types wrap unmanaged C++ memory, so ownership and copy
semantics are load-bearing rather than incidental. Second, Rhino is a tolerance-driven
modeler: geometric operations take a tolerance argument and fail *quietly* — returning null
or an empty array — when it is wrong. Third, its APIs are full of paired calls where the
second half is invisible: set an attribute and `CommitChanges`, set a colour and set
`ColorSource`, modify the document and `Redraw`, add an option and `EnablePreSelect`. When
something fails silently, look for a missing companion call before rewriting the logic.

## Scope the work, then set up the project

### Decide what you are building

Settle these before writing code, because they determine the project file, and the project
file is what decides whether the plugin loads at all.

| Question | Why it changes what you write |
|---|---|
| Rhino version? | Decides the target framework and the yak distribution tag. |
| Windows only, or Mac too? | Eto for cross-platform UI; WinForms/WPF force `net*-windows` and Windows-only. |
| `.rhp` plugin or `.gha` component? | Different base classes, different loader, different `TargetExt`. |
| One command, or a shipped product? | A product needs a stable GUID, an icon, a manifest, and a release pipeline from day one. |
| C# or Python? | A compiled `.rhp` means C#. A script in the Rhino editor means Python — very capable, but a script is not a command: no `RhinoDoc` is handed to it (reach the document through `scriptcontext.doc`), and the registration surface (`PlugIn.OnLoad`, `Panels.RegisterPanel`, `OptionsDialogPages`) is written against the compiled plugin lifecycle. |

Version matrix as of August 2026:

| | Rhino 7 | Rhino 8 | Rhino 9 (beta) |
|---|---|---|---|
| Hosted runtime | .NET Framework 4.8 (Win) / Mono (Mac) | .NET 8 from 8.20 on; .NET 7 in 8.19 and earlier. .NET Framework 4.8 is still selectable on Windows | .NET 10 |
| Recommended plugin TFM | `net48` | `net8.0` | `net10.0` — see caveat |
| Yak tag | `rh7` | `rh8` | `rh9` |

Yak tags also take an optional `_<minor>` form (`rh8_0`, `rh9_0`) that encodes a
service-release minimum.

**Rhino 8 shifted its runtime mid-life, so check the service release before picking a TFM.**
Rhino 8.20 and later default to .NET 8; 8.19 and earlier default to .NET 7. McNeel's current
recommendation is `net8.0`, with `net48` marked a deprecated path to avoid for new work. The
asymmetry that decides it: a `net7.0` assembly rolls forward onto a .NET 8 host, but a
`net8.0` assembly will **not** load on a .NET 7 host. So target `net8.0` unless the plugin
has to run on 8.19-era installs, in which case `net7.0` reaches both. Add `net48` as a second
target only when supporting users who still run Rhino 8 in .NET Framework mode. Rhino 8 also
accepts `/netcore-7` and `/netcore-8` to pin a specific runtime, which is how you reproduce a
user's environment when a plugin loads for you and not for them.

The Rhino 9 target framework is genuinely unsettled, and saying so plainly beats guessing.
McNeel's migration guide says target `net10.0`. A McNeel staffer on the forum said the Rhino
9 RhinoCommon NuGet targets net8.0 and initially recommended net8.0 as the plugin target,
then deferred to the migration guide. The RhinoCommon 9 beta package ships `lib/net8.0` and
`lib/net48`. The samples repo branch 9 uses `net9.0;net48`. These mostly reconcile — Rhino 9
hosts .NET 10 and RhinoCommon is compiled for net8.0, so a sub-net10 assembly should still
load — but whether McNeel hard-requires `net10.0` at RTM is not established, and yak's `rh9`
auto-tagging is documented only for .NET 10 plugins. Recommend `net10.0` and say why, rather
than silently copying `net9.0` out of the samples repo. When it matters to a release, have
the user build against the Rhino 9 beta, run `yak spec` then `yak build`, and read the
distribution tag off the resulting `.yak` filename — that tag is what decides whether the
package installs.

If the user hasn't said which Rhino version they're on, ask rather than assuming. Guessing
wrong produces a plugin that builds cleanly and then never appears in Rhino, which is a
miserable failure mode to debug.

### Project setup that actually loads

`assets/plugin-project-template.md` has the complete, annotated scaffolding: three `.csproj`
variants, `AssemblyInfo.cs`, `launchSettings.json`, the minimal PlugIn and Command classes,
`manifest.yml`, and the yak pipeline. Copy from there rather than reconstructing it — the
settings are individually unmemorable and collectively load-bearing.

```bash
dotnet new install Rhino.Templates
dotnet new rhino --version 8      # or: dotnet new grasshopper, dotnet new ghcomponent
```

Four project settings account for most "it built and Rhino ignores it" reports:

- **`<TargetExt>.rhp</TargetExt>`** (`.gha` for Grasshopper). This one property turns a class
  library into a Rhino plugin — it renames the build output, replacing the old
  post-build-rename hack. Rhino discovers plugins by that extension; on Mac it scans
  `MacPlugIns/` recursively for `*.rhp`.
- **`ExcludeAssets="runtime"` on the RhinoCommon package reference.** Without it a copy of
  `RhinoCommon.dll` lands next to your `.rhp` and shadows the one Rhino already loaded,
  producing `MissingMethodException` or `TypeLoadException` at load time. Same for
  `Grasshopper` and `RhinoWindows`.
- **`<EnableDynamicLoading>true</EnableDynamicLoading>`** whenever the plugin has third-party
  NuGet dependencies, so the dependency graph resolves inside Rhino's host process. Skipping
  it produces the "works on my machine, not the user's" variant.
- **`[assembly: Guid("…")]` in `Properties/AssemblyInfo.cs` is the plugin's identity.**
  Generate a fresh one per plugin and never change it after release — changing it makes Rhino
  treat the build as an entirely different plugin, losing settings, licensing, and command
  registration. Keeping a hand-written `AssemblyInfo.cs` also requires
  `<GenerateAssemblyInfo>false</GenerateAssemblyInfo>`, or the build fails on duplicate
  attributes (CS0579).

Package references: the NuGet packages that actually exist are `RhinoCommon`, `RhinoWindows`,
`Grasshopper`, and `Eto.Forms`. **`Rhino.UI` is a namespace inside the RhinoCommon package,
not a package** — adding a `Rhino.UI` PackageReference fails restore with NU1101. Eto ships
inside RhinoCommon too, so a plugin needs no separate Eto reference.

Never copy a GUID out of sample code. This applies to plugin ids, `UserData` subclasses,
panel classes, render content classes, and Grasshopper `ComponentGuid`s alike. Two plugins
sharing an id conflict in ways that look like random command disappearance.

Every new plugin also gets a `README.md`, and its first section after the title is always
`## Build and Install`, containing `### Build` and `### Install to Rhino` (drag-and-drop,
manual copy, and yak). Build-and-install is what a user needs first, so it goes top-most —
features, usage, and internals come after.

### The debug loop

Use `launchSettings.json` profiles that launch `Rhino.exe` directly, plus `/nosplash`. On
**Rhino 8 for Windows** the runtime is selectable, so add `/netcore` (for the .NET build) or
`/netfx` (for the `net48` build) and keep one profile per target framework — the IDE picks
the debug engine from the project's TFM, so a `net48`-only project can never break in a
`/netcore` Rhino. `/netcore-7` and `/netcore-8` pin a specific .NET version, which is how you
reproduce "it loads here but not on their machine" when the two machines are on different
Rhino 8 service releases. Rhino 9 and Rhino for Mac host a single runtime and need none of
these; on Mac the switch prefix is `-` rather than `/`.

Setting `RHINO_PACKAGE_DIRS` to the build output is what McNeel's own sample launch profiles
do, and it makes Rhino load the fresh binary with no install step. It is undocumented —
confirm on first use that `_PlugInManager` shows the plugin loading from your build path.

There is no hot reload for `.rhp`: once loaded, the assembly is pinned for the life of the
process, so close Rhino before rebuilding. Grasshopper is the exception —
`GrasshopperReloadAssemblies` reloads `.gha` files in place, provided *Preferences > Solver >
Memory load \*.GHA assemblies using COFF byte arrays* is enabled. Turn that on before
starting component work.

When a plugin won't load, `_PlugInManager` answers the first question: listed but not loaded
means a runtime failure (breakpoint `OnLoad`); not listed at all means Rhino never found the
file. Dragging the `.rhp` onto the Rhino window separates a packaging problem from a plugin
problem — if drag-and-drop works and the installed copy doesn't, the package layout or the
distribution tag is wrong. `assets/plugin-project-template.md` carries a fuller
symptom-to-cause table. And since the loaded assembly is pinned, a rebuild while Rhino is
running compiles fine and then fails on the final copy (MSB3027, "file is locked by Rhino") —
that is Rhino holding the old `.rhp`, not a build bug. Closing Rhino releases it, but note
the loop: a plugin installed straight from the build output with `LoadTime.AtStartup`
re-locks that file at every Rhino launch, so "just rebuild" never works while any Rhino is
open. Give the build script the standard escape hatch — Windows refuses to delete or
overwrite a loaded assembly but **allows renaming it** — so before building, try `del` on the
output `.rhp`, and when it survives, `ren` it aside (`MyPlugin.rhp.locked-%RANDOM%`); clean up
stale `.locked-*` files on later runs (they delete once that Rhino has exited). The build
then succeeds with Rhino still running, and the new binary loads on the next Rhino restart.

### Compile-time traps

Errors that recur when writing plugin code that has never been compiled against RhinoCommon:

- RhinoCommon mixes public and protected virtuals on the same base classes, and an override
  must match the base member's access exactly (CS0507). `PlugIn.LoadTime` and
  `Command.EnglishName` are **public**; `PlugIn.OnLoad` and `Command.RunCommand` are
  **protected**. Don't copy the modifier from the override above it — check the base.
- `SaveFileDialog` / `OpenFileDialog` exist in both `Eto.Forms` and `Rhino.UI` — with both
  namespaces imported the bare name is ambiguous (CS0104); fully qualify one.
- `ObjectEnumeratorSettings` has no `VisibleObjects` member. Filter with
  `HiddenObjects = false` and `VisibleFilter = true` instead.
- `Mesh.CreateFromBrep` returns `Mesh[]`; `Mesh.CreateFromSurface` returns a single `Mesh`.
  Mixing them up is a CS0029 at best and a dropped-geometry bug at worst.
- `DynamicLayout.Add(control, xscale, yscale)` takes `bool?` scale flags, not numbers.
- With `<Nullable>enable</Nullable>`, UI fields assigned in an `InitializeComponent`-style
  helper trip CS8618. Initialize them `= null!` — the `required` modifier does not fit
  types Rhino constructs reflectively (panels, pages, UserData).
- `TcpListener` lives in `System.Net.Sockets`, which is never pulled in transitively by
  RhinoCommon code — add the `using` when writing a localhost server.

## Plugin and command anatomy

A plugin is a `Rhino.PlugIns.PlugIn` subclass; commands are separate `Rhino.Commands.Command`
subclasses. Rhino creates exactly one instance of each, so the singleton-in-a-static-property
pattern is safe and is what the templates generate.

```csharp
public class MyPlugin : Rhino.PlugIns.PlugIn
{
  public MyPlugin() { if (Instance == null) Instance = this; }
  public static MyPlugin Instance { get; private set; }

  protected override LoadReturnCode OnLoad(ref string errorMessage)
  {
    // Register panels, render content, event watchers here.
    return LoadReturnCode.Success;
  }
}

public class MyCommand : Rhino.Commands.Command
{
  public override string EnglishName => "MyCommand";

  protected override Result RunCommand(RhinoDoc doc, RunMode mode)
  {
    return Result.Success;
  }
}
```

`OnLoad` throwing, or returning anything but `LoadReturnCode.Success`, is the most common
self-inflicted load failure. Guard it, set `errorMessage`, and reserve failure for genuinely
fatal conditions.

By default a plugin loads on demand, the first time one of its commands is typed. Override
`public override PlugInLoadTime LoadTime => PlugInLoadTime.AtStartup;` when it must be
running before that — to register panels, display modes, render content, or document event
watchers. Note the `public`: the base member is public, and writing `protected override` (the
modifier the neighboring `OnLoad` override uses) fails with CS0507.

`EnglishName` must be unique across everything installed; a collision means the command
simply will not work. `RunMode.Scripted` means the command was driven by a script or macro
rather than typed — suppress dialogs and read values from the command line instead, or the
script hangs on a modal window nobody is there to close.

The `Result` values carry distinct meanings: `Success` (did work), `Cancel` (user aborted or
gave invalid input), `Failure` (should have worked, didn't), and `Nothing` (ran correctly,
nothing to do — a degenerate input, an empty selection). Reaching for `Failure` where
`Nothing` belongs makes a command look broken when it isn't.

**Specialized plugin types.** These derive from `PlugIn` and can still host commands:
`RenderPlugIn` (a render engine — two mandatory overrides, `Render` and `RenderWindow`),
`FileImportPlugIn` / `FileExportPlugIn` (new formats in the Open and Save dialogs — you
declare the extensions and filters, Rhino routes matching files to you), and
`DigitizerPlugIn` (3D digitizing hardware). Separately, and *not* a `PlugIn` subclass,
`Rhino.Runtime.Skin` rebrands the whole application: a plain class library inheriting
`Rhino.Runtime.Skin`, Windows only, with its own `.rhs` extension and deployment story.

Render engine integration is a substantial subsystem in its own right. The compressed map:
a full engine implements **two paths**. The modal path is your `Render` override wiring a
`RenderPipeline` subclass (the bridge Rhino drives) to an `AsyncRenderContext` subclass (owns
the render thread). The interactive path registers a `RealtimeDisplayModeClassInfo` whose
`RealtimeDisplayMode.StartRenderer` starts the engine as a viewport display mode. Both write
pixels by opening a channel on a `RenderWindow` and calling `channel.SetValue(x, y, Color4f)`.
Scene data reaches the engine through `Rhino.Render.ChangeQueue` — use it rather than walking
the document; it flattens blocks into mesh data plus `MeshInstance` records (one mesh, many
instances). The hard rules: `ChangeQueue.CreateWorld()` runs on the **main** thread and
rendering on a worker; always `using` the render-window channel so it commits; call
`RenderWindow.EndAsyncRender(Completed)` when a modal render finishes or Rhino never learns it
ended; and the viewport-thread callbacks (`IsRendererStarted`, `IsCompleted`, …) must answer
from cheap flags and never block — call `SignalRedraw()` when a pass completes.

**Running other Rhino commands.** `RhinoApp.RunScript` requires
`[CommandStyle(Style.ScriptRunner)]` on the command class, and it invalidates every reference
and pointer you hold into Rhino's runtime database — using one afterwards will probably crash
Rhino. Prefer calling RhinoCommon directly; if you must script, re-fetch objects by id after
the call rather than holding references across it. Command strings take `_` to make the name
localization-proof and `-` to suppress dialogs: `"_-Line 0,0,0 10,10,10"`.

## Working with the document

`RhinoDoc` is the model. Objects live in `doc.Objects`; everything else lives in a table —
`doc.Layers`, `doc.Materials`, `doc.Groups`, `doc.InstanceDefinitions`, `doc.NamedViews`,
`doc.DimStyles`, `doc.HatchPatterns`, `doc.Views`, `doc.Strings`.

The two kinds of table report success differently, and conflating them produces bugs that
survive review:

```csharp
Guid id = doc.Objects.AddCircle(circle);   // Guid.Empty means failure
if (id == Guid.Empty) return Result.Failure;

int index = doc.Layers.Add(layer);         // a negative index means failure
if (index < 0) return Result.Failure;

doc.Views.Redraw();
```

Attribute edits go through a copy, so they only take effect after `CommitChanges()`:

```csharp
var obj = doc.Objects.FindId(id);
obj.Attributes.Name = "widget";
obj.Attributes.ObjectColor = Color.Red;
obj.Attributes.ColorSource = ObjectColorSource.ColorFromObject;  // or the color won't show
obj.CommitChanges();
```

Setting `ObjectColor` without `ColorSource` is a frequent and invisible failure — the
attribute is stored, the object still draws in its layer colour. The alternative route is
`doc.Objects.ModifyAttributes(objref, attributes, quiet)`. Building an `ObjectAttributes` up
front and passing it to the `Add*` call avoids the round trip entirely.

Redraw is manual: call `doc.Views.Redraw()` after modifying the document or changing
selection, or `view.Redraw()` when you worked on one specific view. Wrap multi-step edits in
`doc.BeginUndoRecord(name)` / `EndUndoRecord(serial)` so the user gets one undo step instead
of a dozen. Prefer `doc.Objects.Replace(id, newGeometry)` and
`doc.Objects.Transform(objref, xform, deleteOriginal)` over delete-then-add, so undo and
object history stay intact.

These idioms — the two return conventions, `CommitChanges`, `ColorSource`, manual redraw,
undo records — carry over unchanged to every other table: materials, textures, annotations,
dimensions, hatches, blocks, groups, named views, layouts, and clipping planes.

## Geometry that behaves

Two rules prevent most geometry bugs.

**Structs copy; classes alias.** `Point3d`, `Vector3d`, `Plane`, `Line`, `Circle`,
`Transform`, `BoundingBox`, `Interval` and friends are value types — passing one to a method
that mutates it changes nothing at the call site. Everything deriving from `GeometryBase`
(`Curve`, `Surface`, `Brep`, `Mesh`, `SubD`, `Extrusion`) is a reference type — mutating one
you received *does* affect the caller's object, so call `DuplicateCurve()` /
`DuplicateBrep()` / `Duplicate()` before modifying geometry you did not create. Structs also
cannot be null; they carry `Unset` sentinels (`Point3d.Unset`, `Vector3d.Unset`) and are
tested with `IsValid`, never against null.

**Tolerance comes from the document, never from a literal.** Use
`doc.ModelAbsoluteTolerance` and `doc.ModelAngleToleranceRadians`. Most boolean, join,
offset, and fillet operations return an *array* rather than a single object, and failure
shows up as either `null` or a zero-length array — check both. When one comes back empty,
suspect the tolerance before suspecting the input geometry.

The abstract bases can't be instantiated, so creation goes through static factories:
`Curve.CreateInterpolatedCurve`, `Curve.CreateControlPointCurve`, `NurbsCurve.Create`,
`Surface.CreateExtrusion`, `Mesh.CreateFromBrep`, `Brep.CreateFromBox`,
`Brep.CreateBooleanUnion`.

Lightweight primitives are cheap to compute with. `doc.Objects` has direct overloads for the
common ones (`AddLine`, `AddCircle`, `AddArc`, `AddSphere`, `AddPolyline`); anything else has
to be promoted first — `Circle.ToNurbsCurve()`, `Cylinder.ToBrep(true, true)`,
`Cone.ToBrep(capBottom)`, `Torus.ToRevSurface()`, `BoundingBox.ToBrep()` — and then added
with `AddCurve` / `AddSurface` / `AddBrep`.

A few sharp edges worth knowing before you hit them:

- An object that looks like a polysurface may be an `Extrusion` (Rhino's memory optimization
  for boxes and pipes). Call `ToBrep()` when a Brep-only API is involved, and include
  `ObjectType.Extrusion` in selection filters.
- `Mesh.Vertices` holds single-precision `Point3f`, not `Point3d`. After hand-building a
  mesh, call `mesh.Normals.ComputeNormals()` then `mesh.Compact()` — note the normals call
  hangs off the `Normals` collection, not off `Mesh` itself.
- `curve.PointAt(t)` takes a curve parameter, not a normalized 0–1 value. For "halfway", use
  `curve.Domain.ParameterAt(0.5)` or `PointAtNormalizedLength`.
- `GeometryBase` wraps unmanaged memory. Dispose transient heavy geometry in loops; never
  dispose geometry the document owns or geometry obtained from an `ObjRef` — that is a
  classic crash-on-next-redraw.


## Getting input from the user

Two layers. `Rhino.Input.RhinoGet` is the one-shot convenience layer — `GetOneObject`,
`GetMultipleObjects`, `GetPoint`, `GetString`, `GetInteger`. Use it when you need no options
and no custom behaviour. `Rhino.Input.Custom` (`GetObject`, `GetPoint`, `GetNumber`,
`GetOption`, `GetTransform`) is the real interface: prompts, geometry filters, command-line
options, dynamic drawing, and control over pre- and post-selection.

The custom getters have their own error idiom — return the getter's result, not a literal:

```csharp
if (gp.CommandResult() != Result.Success) return gp.CommandResult();
```

`ObjectType` is a bit-flag enum combined with `|`. The trap: `ObjectType.Surface` alone does
**not** accept a polysurface — you need `ObjectType.PolysrfFilter` or `ObjectType.Brep`
alongside it.

Picking with live command-line options is the pattern people get wrong most often, so it is
worth spelling out. Configure the getter **once, outside** the loop — adding options inside
duplicates them on every pass.

```csharp
using Rhino.Input.Custom;   // GetObject, GetResult, OptionInteger

var density = new OptionInteger(300, 200, 900);   // default, min, max

var go = new GetObject();
go.SetCommandPrompt("Select surfaces, polysurfaces, or meshes");
go.GeometryFilter = ObjectType.Surface | ObjectType.PolysrfFilter | ObjectType.Mesh;
go.AddOptionInteger("Density", ref density);
go.GroupSelect = true;
go.SubObjectSelect = false;
go.EnableClearObjectsOnEntry(false);
go.EnableUnselectObjectsOnExit(false);
go.DeselectAllBeforePostSelect = false;

bool hadPreselected = false;

for (;;)
{
  GetResult res = go.GetMultiple(1, 0);           // min 1, 0 = unlimited

  if (res == GetResult.Option)
  {
    go.EnablePreSelect(false, true);              // or the next call returns GetResult.Object
    continue;
  }
  if (res != GetResult.Object) return Result.Cancel;

  if (go.ObjectsWerePreselected)
  {
    hadPreselected = true;
    go.EnablePreSelect(false, true);
    continue;
  }
  break;
}

if (hadPreselected)                               // mixed pre/post — make it all look the same
{
  for (int i = 0; i < go.ObjectCount; i++)
    go.Object(i).Object()?.Select(false);
  doc.Views.Redraw();
}

int value = density.CurrentValue;                 // options are read after the loop
```

`EnablePreSelect(false, true)` after every option click is the load-bearing line — without
it, `GetMultiple` returns immediately with `GetResult.Object` and the pick ends. Option
objects are passed by `ref` and updated in place, so read `CurrentValue` after the loop, not
inside it. The trailing cleanup matters because a command that mixes pre-selected and
post-selected objects otherwise leaves half the selection highlighted and half not.

For selection by layer, group, or name, skip the getter entirely: iterate
`doc.Objects.GetObjectList(settings)` or `doc.Objects.FindByLayer(layer)` and call
`obj.Select(true)` on the matches, then redraw.

## Building UI

Eto.Forms is the cross-platform toolkit Rhino 8/9 use for their own UI, and the only way to
write one implementation that runs on Windows and Mac. WinForms and WPF still work but force
a `net*-windows` target framework and Windows-only distribution. Choose Eto unless the plugin
is deliberately Windows-only. `assets/ui-patterns.md` has complete, adaptable implementations
of everything below.

**Drawing in the viewport** is a separate axis from Eto. A `Rhino.Display.DisplayConduit`
hooks the display pipeline and draws every frame in every viewport until you disable it —
the right tool for previews, analysis overlays, and custom widgets that must outlive a single
getter. Override `CalculateBoundingBox` as well as the draw method, or your geometry gets
clipped out of frame. For preview that only needs to last the length of one pick,
`GetPoint.DynamicDraw` is cheaper.

**Tabbed panels** have a registration contract that fails silently when broken. The panel
class must be **public** and carry a `[Guid]` attribute, which *is* the panel id. Rhino
constructs it reflectively, looking for a constructor that takes — in this order of
preference — a `RhinoDoc`, a `uint documentSerialNumber`, or no arguments.
`Panels.RegisterPanel(plugIn, type, caption, icon)` must run before `Panels.OpenPanel`; the
command constructor or `PlugIn.OnLoad` are both fine places for it. Inside a docked panel use
`Rhino.UI.Dialogs.ShowMessage`, not `Eto.Forms.MessageBox`: a panel is a child of a Rhino
container and has no top-level Eto window, which breaks the Eto message box on Mac.

**Dialogs.** `Dialog<T>` with `ShowModal(RhinoEtoApp.MainWindowForDocument(doc))` for modal;
`ShowSemiModal` when the user still needs to pick in the viewport; a modeless `Form` needs
`Owner` set or it disappears behind Rhino on Mac. Prefer `MainWindowForDocument(doc)` over
`MainWindow` — on Mac, multiple documents mean multiple main windows. (Most published samples
still use `MainWindow`; the per-document form is what the current Eto guide recommends.)

**Options pages** register through `PlugIn.OptionsDialogPages()` (application preferences) or
`PlugIn.DocumentPropertiesDialogPages()` (settings that belong to this `.3dm`). The lifecycle
differs by platform in a way that dictates the design: on Windows the dialog is modal and
`OnCancel` fires; on Mac the window is modeless, applies on deactivation, and **never calls
`OnCancel` at all**. So make `OnApply` authoritative and idempotent, initialize in
`OnActivate(true)` rather than the constructor, and return one cached control from
`PageControl`. Because Mac re-queries the document page list per document, a document page
must read its state from the document it is handed and never from a static field.

**Grasshopper components** subclass `GH_Component`: `RegisterInputParams`,
`RegisterOutputParams`, `SolveInstance`, plus `ComponentGuid`, `Exposure`, and `Icon`. The
`GH_ParamAccess` you declare (`item` / `list` / `tree`) must match the `DA.GetData` /
`GetDataList` / `GetDataTree` call you make. `ComponentGuid` must never change once released
— Grasshopper uses it to reconnect components in saved definitions, and changing it orphans
every `.gh` file that uses the component.

## Persistence and shipping

Four persistence mechanisms, distinguished by scope. Picking the wrong one is the usual
reason data "disappears" between sessions.

| Mechanism | Scope | Serialization | Use for |
|---|---|---|---|
| `PlugIn.Settings` (`PersistentSettings`) | user profile, all documents | automatic, XML | preferences, endpoints, UI toggles |
| User strings / `UserDictionary` | one object, or the document | automatic | **the default choice** for per-object data |
| Custom `UserData` subclass | one `CommonObject` | you write it | strongly typed data with duplicate and transform semantics |
| Document user data | whole `.3dm` | you write it | plugin-wide state that belongs to the model |

Prefer user strings and `UserDictionary` unless there is a specific reason not to. Rhino
serializes them for you, and Grasshopper, scripts, and other plugins can read them — a custom
`UserData` class is opaque to anyone without your assembly.

A `UserData` subclass needs a `[Guid]` attribute, a public parameterless constructor (Rhino
instantiates it when reading files), and overrides of `Description`, `ShouldWrite`, `Read`,
`Write`, and `OnDuplicate`. `ShouldWrite` returning `true` unconditionally bloats every file
the plugin touches; gate it on there actually being something to save. Transformations of the
parent object are tracked for you.

Document user data rides on three `PlugIn` overrides — `ShouldCallWriteDocument`,
`WriteDocument`, `ReadDocument`. Rhino writes your plugin's identification into the file, and
opening that file loads your plugin to read it back. Use
`Rhino.Collections.ArchivableDictionary` with `archive.WriteDictionary` / `ReadDictionary`
rather than hand-rolled chunks; it makes versioning across future file formats far less
painful. `scripts/persistence-and-userdata.md` has all four with working code.

**Shipping.** Rhino's package manager is yak. A `.yak` file is a zip containing a
`manifest.yml` (name, version, authors, description, and optionally url, keywords, icon) plus
the binaries. `yak spec` writes a skeleton manifest from your assembly metadata — which is
why filling in `<Version>`, `<Title>`, `<Description>`, and `<Company>` in the `.csproj` is
not cosmetic. The pipeline is `dotnet build -c Release` → assemble a `dist` folder (one
subfolder per target framework for multi-targeted plugins, `manifest.yml` at the top level) →
`yak build` → push to the test server (it resets daily) to smoke-test → `yak push` to ship.
Versions are immutable; a bad one gets `yak yank`, not an overwrite. The distribution tag
(`rh8`, `rh9`) is inferred from the SDK you built against, and a package tagged for one major
version will not install on another. Users installing a package need to restart Rhino before
it loads — "I installed it and nothing happened" is almost always that.

## Python and Rhino outside Rhino

Grasshopper component authoring is covered under Building UI, and the `.gha` project settings
are in the setup section above. This section is the scripting and out-of-process story.

Three Python layers, and idiomatic scripts mix them freely: `rhinoscriptsyntax`
(RhinoScript-style functions that take and return GUIDs and handle the document plumbing),
`scriptcontext` (`sc.doc` is the active document, `sc.sticky` persists state between runs,
`sc.escape_test()` handles Esc), and `Rhino` itself.

The differences from C# that actually cause bugs: `out` parameters come back as extra values
in a tuple (`rc, objref = RhinoGet.GetOneObject(...)`, `b, t = curve.ClosestPoint(pt)`) —
this is the single most common porting error; events wire with `+=` to a plain
`(sender, args)` function; generics need explicit construction (`List[Point3d]()`); enums are
fully qualified, and `ObjectType.None` must be reached via `System.Enum.Parse` because `None`
is a Python keyword; there is no `doc` parameter handed to a script, so you reach the document
through `sc.doc`; and redraw is manual. Rhino 8's script editor hosts both IronPython 2.7 and
CPython 3; Rhino 9 ships an upgraded Python runtime with PEP 723 inline dependencies, custom
package sources, and `git+` pip support — check which runtimes it offers rather than assuming
IronPython is still there. Write CPython 3 for anything new, and expect pythonnet to be
stricter than IronPython about implicit conversions and tuple shapes when porting old scripts.

Two more Python essentials, compressed. Script dependencies declare inline — `# r: requests`
(optionally pinned, `# r: numpy==1.26.4`) at the top of a CPython 3 script, or a full PEP 723
`# /// script` block; Rhino installs them on first run. And the `rs.coerce*` family
(`rs.coercecurve`, `rs.coercebrep`, `rs.coercemesh`, `rs.coerce3dpoint`, …) is the bridge
between layers — it turns the GUID a `rhinoscriptsyntax` call returns into the RhinoCommon
object the `Rhino.Geometry` APIs want.

**Rhino.Inside** embeds the Rhino engine in another host process (Revit, AutoCAD, a console
app, Jupyter). The startup pattern is exacting: `RhinoInside.Resolver.Initialize()` in a
**static** constructor before any RhinoCommon type is touched, `[STAThread]`, and
`using (new RhinoCore(args))`. **Rhino.Compute** is the opposite arrangement — a REST service
running Rhino headlessly, called from JavaScript, Python, or C#; a plugin can add its own
endpoints with `Rhino.Runtime.HostUtils.RegisterComputeEndpoint`. For geometry and file IO
without Rhino at all, `rhino3dm` exposes a *subset* of the same geometry class names
(`Point3d`, `NurbsCurve`, `Brep`, `Mesh`) plus `File3dm`, with the same API shape, but no
`RhinoDoc`, no commands, no display pipeline, and no `Rhino.Input` — code written against
pure `Rhino.Geometry` often ports; anything touching the document does not. Inside a plugin,
`RhinoDoc.CreateHeadless` gives you a document with no UI; dispose it.

Two Compute-client gotchas worth keeping: inputs to a Grasshopper definition are
*double-encoded* — `Encode()` gives a dict, and the framework wants that dict serialized
again as a JSON **string**, wrapped in named DataTrees whose names must match the definition's
input params. And on the way back, the branch path key (`'{0}'` vs `'{0;0}'`) depends on the
definition's data structure — walk `InnerTree` generically rather than hard-coding it.

## Web viewers from plugin output

When a plugin generates a web page that displays the model (three.js or similar), two rules
prevent the most common broken-preview reports.

**three.js loads as ES modules now.** The `build/three.min.js` UMD script is deprecated from
r150 and the non-module `examples/js/` directory is **gone** — a page that loads
`examples/js/controls/OrbitControls.js` gets no such script, and `THREE.OrbitControls` is not
a constructor. Generate an import map plus a module script instead:

```html
<script type="importmap">
{ "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/" } }
</script>
<script type="module">
  import * as THREE from 'three';
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
  // new OrbitControls(camera, renderer.domElement) — not THREE.OrbitControls
</script>
```

Module scripts run after parsing, so no `DOMContentLoaded` guard is needed. Wrap the viewer's
init in try/catch and write the failure into the page — a thrown init otherwise leaves a
permanent "Loading…" with the real error only in the console.

**Rhino is Z-up; three.js is Y-up.** A model exported in Rhino coordinates and dropped into a
default three.js scene displays lying on its side, as if viewed from Rhino's Right view. Never
fix this by rotating the geometry or baking a transform into the export — that corrupts the
coordinates for everything overlaid later (dimensions, labels, picked points). Fix the
*camera*: `camera.up.set(0, 0, 1)` **before** constructing OrbitControls (or set
`THREE.Object3D.DEFAULT_UP` globally), and rotate Y-up-convention helpers into the XY ground
plane (`gridHelper.rotation.x = Math.PI / 2`). The exported data then stays in true model
coordinates end to end.

**Match the host application's navigation, not the library default.** Viewer libraries ship
web-style controls (left-drag orbits, right-drag pans); to a CAD user that mapping reads as
broken, because in Rhino the left button selects, the **right button orbits**,
**Shift+right-drag pans**, and the **wheel zooms toward the cursor**. With OrbitControls,
`mouseButtons = { LEFT: null, MIDDLE: PAN, RIGHT: ROTATE }` plus `zoomToCursor = true` is the
**complete** recipe: OrbitControls already pans *natively* when Ctrl, Meta, or Shift is held
on the ROTATE-mapped button. Do **not** add your own keydown/keyup remap of the button to
`PAN` on top — the built-in modifier check flips a PAN-mapped button back to rotate while a
modifier is held, so the two mechanisms cancel each other and Shift+drag rotates while
Ctrl+drag mysteriously pans.

Wheel zoom: implement it yourself rather than tuning OrbitControls'. OrbitControls (through
r166) applies a **fixed step per wheel event** — the scroll delta's magnitude is ignored —
so the same flick moves a few percent on a notched wheel and teleports the camera on a
free-spinning wheel or trackpad, and no `zoomSpeed` value is right for both. Field-tested
recipe: set `enableZoom = false` and attach your own non-passive `wheel` handler that scales
the camera-to-target distance **delta-proportionally** —
`dist *= Math.exp(e.deltaY * 0.0005)` — clamped to the model's bounding box (~0.05× to ~10×
the max dimension). Multiplicative steps are size-invariant, the many small deltas of a flick
sum smoothly, the orbit target never moves, and the clamps mean the camera can neither enter
the model nor lose it. Pair it with a **visible Reset View button** (plus double-click) that
restores the initial camera and target — a hidden gesture alone is not discoverable by the
user who just lost the model. The same principle generalizes: a viewer generated for users of
some host application should feel like that application.

**Materials in a generated viewer.** Export each object's material with
`rhinoObj.GetMaterial(true)` — it resolves the object/layer/parent `MaterialSource` chain for
you; never re-implement that switch. A Rhino `Material` maps to a workable PBR approximation:
`DiffuseColor` → color, `Transparency` → `1 - opacity`, `Shine / Material.MaxShine` →
`1 - roughness`, `Reflectivity` → a small metalness factor. For a display-mode toggle
(render preview vs. flat layer color — a cheap, high-value feature), build both materials per
object up front, park them on `mesh.userData`, and swap `mesh.material` on toggle — do not
rebuild materials on every switch.

**Page toggles hide, they never destroy.** Every show/hide control in a generated page flips
a CSS class (or `display`) on an element that keeps its content — never hide by clearing
`innerHTML`, removing nodes, or re-running the populate function. Populate the panel **once**
from the model data at startup; keep toggling and populating as two separate functions. A
control that both builds and shows produces the signature bug: the data displays initially,
then the first toggle wipes it and re-showing has nothing left to restore. After wiring any
toggle, check that the state round-trips — hide then show must render content identical to
first load.

**Export the model as a file format, not raw data.** Never serialize geometry into the page as
raw vertex/face dumps (inline JSON) unless the user explicitly asks for it — it balloons the
HTML to hundreds of thousands of lines and is opaque to every other tool. Default to **STL**
for web viewing and 3D-print use (three.js `STLLoader` addon reads it), and pick the best
format when the use case demands more: **GLB** when materials must survive, **.3dm** with the
`Rhino3dmLoader` addon when layers, materials, and annotations must survive with full
fidelity. Serve the binary next to the page over localhost; for a standalone single-file HTML
export, embed it base64-encoded. Small metadata (layer names and colors, dimension text) may
stay as compact inline JSON — the ban is on raw geometry, and on `WriteIndented` payloads
generally.

**Writing those formats from plugin code.** `RhinoDoc.WriteFile` writes **`.3dm` only** —
every other extension goes through `RhinoDoc.Export(path)` / `ExportSelected(path)`, which
route to the installed file-export plugin for that extension (or through scripting
`_-Export`, which operates on the *current selection* and needs
`[CommandStyle(Style.ScriptRunner)]`). Three reliability rules, learned from "Failed to
export model" reports that carried no clue why:

- These APIs return a bare `bool` with **no failure reason**. Never collapse that into a
  generic "export failed" message — report the target path, the format, and the object or
  selection count, so the user's report tells you which precondition broke.
- The STL exporter writes only mesh data and, when scripted, can stall or fail on meshing and
  options prompts. For geometry the plugin has already meshed (a web viewer, a print
  pipeline), skip the export plugin entirely and write **binary STL directly**: an 80-byte
  header, a uint32 triangle count, then 50 bytes per triangle (12-byte normal, three 12-byte
  vertices, a zero ushort). About thirty lines, no dialogs, no dependency on exporter state.
- Export, `RunScript`, and all document access belong on Rhino's **UI thread**. A panel that
  offloads work with `Task.Run` must marshal back with `RhinoApp.InvokeOnUiThread(...)`
  before touching the document or an exporter — off the main thread these fail
  unpredictably, usually as that same reasonless `false`.

---

**Reference material in this skill.** This is the lightweight edition — three bundled files,
all Markdown you read, not code you run. Open them on demand rather than up front.

- **`assets/plugin-project-template.md`** — material to copy into the user's project: the
  three `.csproj` variants, `AssemblyInfo.cs`, `launchSettings.json`, the minimal PlugIn and
  Command classes, `manifest.yml`, the yak pipeline, and the load-failure symptom table. Open
  it for any project setup, debugging-setup, or packaging work.
- **`assets/ui-patterns.md`** — complete adaptable implementations of the UI surfaces: Eto
  panels, modal/semi-modal/modeless dialogs, options and document-properties pages, layout
  idioms, Windows-only dock bars and drag-drop, and Grasshopper components. Open it before
  writing any UI registration code — the contracts fail silently when broken.
- **`scripts/persistence-and-userdata.md`** — working C# and Python code for all four
  persistence mechanisms, including the full custom `UserData` subclass and document user
  data via `ArchivableDictionary`. Open it before hand-writing persistence code.

A caution that used to ride on a larger recipe collection and still applies: several of
McNeel's published samples are broken as published — Python-2 syntax that will not run,
missing `Result` returns, an "Add NURBS Circle" whose control points do not describe a
circle. The bundled files are corrected against those samples (the persistence file ends with
a "Corrections applied" section); when working from a McNeel sample directly, compile-check it
rather than trusting it.

When the bundled files don't cover something, the RhinoCommon API documentation and the
McNeel Discourse forum are authoritative — the forum in particular is where Rhino 9 answers
land first, and the version matrix above will go stale before those do. What not to do is
reconstruct project settings, GUIDs, or sample code from memory: the settings are easy to get
subtly wrong, and the published samples they would come from have known bugs.

Recurring theme, worth restating: when something in Rhino fails silently, the cause is almost
always a missing companion call rather than a wrong API. `Tolerance`, `CommitChanges`,
`ColorSource`, `Redraw`, `RegisterPanel`, `EnablePreSelect`, `ExcludeAssets`.

One last thing, about your own output. Rhino plugin code almost never gets compiled where you
are writing it — there is usually no RhinoCommon to build against and no Rhino to load it. Say
so when you hand code over. "This builds and runs" and "I could not build this here, so the
first `dotnet build` is the real check" are very different promises, and the second one is the
true one. Naming the specific things you could not verify — an overload you inferred, a
Grasshopper component name that has changed between versions — is more useful to the user than
a general disclaimer, and it costs a sentence.
