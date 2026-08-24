# Plugin Project Template

**What this is.** Copy-paste scaffolding for a new Rhino plugin: the `dotnet new` path, three
annotated `.csproj` variants, `AssemblyInfo.cs`, `launchSettings.json`, the minimal `PlugIn` +
`Command` pair, and the yak packaging/release commands.

**When to reach for it.** Whenever you are standing up a new `.rhp` or `.gha`, adding a second
target framework to an existing one, wiring up F5 debugging, or preparing a release. Every
identifier in here is a placeholder — `MyPlugin`, `MyPluginCommand`,
`00000000-0000-0000-0000-000000000000` — meant to be replaced.

---

## Contents

1. [GUID discipline — read before copying anything](#1-guid-discipline--read-before-copying-anything)
2. [Scaffolding with `dotnet new`](#2-scaffolding-with-dotnet-new)
3. [Choosing target frameworks (the honest picture)](#3-choosing-target-frameworks-the-honest-picture)
4. [`.csproj` A — cross-platform plugin (Eto UI)](#4-csproj-a--cross-platform-plugin-eto-ui)
5. [`.csproj` B — Windows-only plugin (WPF / WinForms)](#5-csproj-b--windows-only-plugin-wpf--winforms)
6. [`.csproj` C — Grasshopper assembly (`.gha`)](#6-csproj-c--grasshopper-assembly-gha)
7. [Property reference — why each line is there](#7-property-reference--why-each-line-is-there)
8. [`Properties/AssemblyInfo.cs`](#8-propertiesassemblyinfocs)
9. [`Properties/launchSettings.json` and debugging](#9-propertieslaunchsettingsjson-and-debugging)
10. [The minimal PlugIn and Command classes](#10-the-minimal-plugin-and-command-classes)
11. [`manifest.yml` and the yak release pipeline](#11-manifestyml-and-the-yak-release-pipeline)
12. [Load-failure checklist](#12-load-failure-checklist)

---

## 1. GUID discipline — read before copying anything

**Never copy a GUID out of a sample, a template, or this file.** Generate a fresh one for every
slot. A duplicated GUID makes two different plugins claim the same identity, and the symptom is
usually "my commands disappeared" or "the other plugin stopped loading" — not an error message.

GUIDs are load-bearing in at least five distinct roles, and each needs its own fresh value:

| Slot | Where it lives | What breaks if it collides or changes |
|---|---|---|
| **Plugin id** | `[assembly: Guid(...)]` in `AssemblyInfo.cs` | Collision = two plugins fight over one identity. Change after release = Rhino sees a brand-new plugin, losing settings, license registration and command registration. |
| **Panel id** | `[Guid(...)]` on the panel control class (`typeof(X).GUID`) | Collision = the wrong panel opens. Change = user's saved panel layout forgets your panel. |
| **Dock bar id** (Windows-only) | Hand-minted `static Guid BarId` constant | Same as panel. |
| **`UserData` / `UserDictionary` class id** | `[Guid(...)]` on the `UserData` subclass | Collision = user data deserializes into the wrong type. Change = every `.3dm` already written silently drops your data. |
| **Render content id** | `[Guid(...)]` on `RenderContent` subclasses | Collision = content type registration conflicts. |
| **GH `ComponentGuid`** | `public override Guid ComponentGuid` | Change = every saved `.gh` file that used the component is orphaned. |

How to generate one:

```bash
# .NET (any platform)
dotnet run --project - <<< 'System.Console.WriteLine(System.Guid.NewGuid());'   # or:
uuidgen                       # macOS / Linux
powershell -c "[guid]::NewGuid()"   # Windows
python3 -c "import uuid; print(uuid.uuid4())"
```

Visual Studio's *Tools > Create GUID* and Rider's `Guid` live template do the same thing.

**Rule of thumb:** a GUID is minted once, at the moment you create the type, and is then frozen
forever. Put a comment next to every one saying so.

---

## 2. Scaffolding with `dotnet new`

Install McNeel's templates from NuGet — package name **`Rhino.Templates`**:

```bash
# Installs and then lists all templates it added
dotnet new install Rhino.Templates

# Pin a version if you need reproducible scaffolding
dotnet new install Rhino.Templates::8.16.2

# See what the templates accept
dotnet new rhino --help
dotnet new grasshopper --help
```

Create the projects:

```bash
mkdir MyPlugin && cd MyPlugin

# RhinoCommon plugin (.rhp). --version is the template's "lowest Rhino major version",
# NOT dotnet new's own --version flag. -sample adds boilerplate command code.
dotnet new rhino --version 8 -sample -n MyPlugin

# Grasshopper assembly (.gha)
dotnet new grasshopper --version 8 -sample -n MyPluginGh

# Add one more GH_Component file to an existing GH project
dotnet new ghcomponent -n MyNewComponent

dotnet build
```

Confirmed template short names: `rhino`, `grasshopper`, `ghcomponent`. Others may exist (the
Visual Studio extension advertises Zoo and C++ wizards) — run `dotnet new list rhino` to see what
your installed version actually ships.

### Generated file trees

`dotnet new rhino` (left) and `dotnet new grasshopper` (right):

```
MyPlugin/                                MyPluginGh/
├── MyPlugin.sln                         ├── MyPluginGh.sln
└── MyPlugin/                            └── MyPluginGh/
    ├── MyPlugin.csproj                      ├── MyPluginGh.csproj
    ├── Properties/                          ├── Properties/launchSettings.json
    │   ├── AssemblyInfo.cs   (1)            ├── MyPluginGhComponent.cs   : GH_Component
    │   └── launchSettings.json (2)          └── MyPluginGhInfo.cs        : GH_AssemblyInfo
    ├── EmbeddedResources/
    │   └── plugin-utility.ico  (3)      (1) PlugInDescription attributes + [assembly: Guid]
    ├── MyPluginPlugin.cs     (4)        (2) debug profiles, Rhino.exe as external program
    └── MyPluginCommand.cs    (5)        (3) plugin icon, embedded
                                         (4) : Rhino.PlugIns.PlugIn, singleton Instance
                                         (5) : Rhino.Commands.Command, EnglishName + RunCommand
```

**The template does not generate a `manifest.yml`.** That comes later, from `yak spec` run against
your build output — see §11.

**After scaffolding, immediately:** open `Properties/AssemblyInfo.cs` and replace the generated
`[assembly: Guid]` with a freshly generated one if you copied the project from anywhere.

### IDE notes

- **Windows / Visual Studio** — install the *.NET desktop development* workload, plus the individual
  components for the .NET runtime you target and, if you multi-target `net48`, the *.NET Framework
  4.8 SDK* and *targeting pack*. For Rhino 9, VS 2026 plus the .NET 10 SDK.
- **macOS** — VS Code with the *C# Dev Kit* extension, or Rider. Visual Studio for Mac is
  discontinued. Use the `dotnet new` CLI path above and debug from *Run and Debug*.
- **Rider** — reads `Properties/launchSettings.json` profiles directly; set the profile runtime to
  ".NET / .NET Core". A common setup is a Multi-Launch configuration that publishes to a folder and
  then launches Rhino. Rider is stricter than Visual Studio about JSON: a stray trailing comma in
  the generated `launchSettings.json` will fail to parse — delete it.

---

## 3. Choosing target frameworks (the honest picture)

Rhino 8's half of this is settled; Rhino 9's genuinely is not. Keep the two apart, and do not
present the Rhino 9 number as fact. Here is what is true, as of August 2026.

McNeel's *Moving to .NET Core* guide gives the recommended target directly:

| Rhino version | Recommended target | Notes |
|---|---|---|
| Rhino 7 | `net48` | .NET Framework or Mono |
| Rhino 8 (Windows/Mac, .NET Core) | `net8.0` | Default from Rhino 8.20 |
| Rhino 8 (Windows, .NET Framework) | `net48` | Deprecated path, avoid for new work |
| Rhino 9 (Windows/Mac) | `net10.0` | .NET Framework deprecated, but still works |

And what the surrounding tooling looks like:

| | Rhino 7 | Rhino 8 | Rhino 9 (beta) |
|---|---|---|---|
| .NET runtime Rhino hosts | .NET Framework 4.8 (Win) / Mono (Mac) | .NET 8 from 8.20 on, .NET Core 7 in 8.19 and earlier; .NET Framework 4.8 also selectable on Windows | .NET 10 |
| `RhinoCommon` nupkg `lib/` folders | `net48` | `net48`, `net7.0` (a `net8.0` project consumes the `net7.0` lib fine — the package's folder name is not the recommended plugin target) | `net48`, `net8.0` |
| Yak distribution tag | `rh7` | `rh8` / `rh8_0` | `rh9` / `rh9_0` |

**Rhino 8 shifted its runtime mid-life, so the service release matters.** Rhino 8.20 installs and
defaults to using .NET 8.0.14 or later; 8.19 and older default to .NET Core 7. The asymmetry that
decides the target: a `net7.0` assembly rolls forward onto a .NET 8 host, but a `net8.0` assembly
will **not** load on a .NET 7 host.

So, for Rhino 8:

- **`net8.0` is the recommendation** — McNeel's current guidance, and what 8.20 and later host.
- **`net7.0` is the compatibility choice**, and only that: pick it when the plugin must also run on
  8.19-era installs, since it reaches both runtimes at the cost of building against the older SDK.
- **`net48` is a second target only** for users still running Rhino 8 in .NET Framework mode. It is
  a deprecated path, not the default other half of a pair — add it when you know you have those
  users, not reflexively.

Rhino 8 accepts `/netcore-7` and `/netcore-8` to pin a specific .NET version, which is how you
reproduce a user's service release locally when a plugin loads for you and not for them (see §9).

**Rhino 9 is not settled.** Several sources say different things:

1. McNeel's official *Moving to .NET Core* migration guide says target **`net10.0`** for Rhino 9,
   and that .NET Framework is deprecated.
2. The **RhinoCommon 9 beta NuGet package itself** ships only `lib/net8.0` and `lib/net48` — so
   RhinoCommon is compiled for net8.0.
3. The **samples repo, branch `9`**, uses **`net9.0`** / `net9.0-windows` + `net48`.
4. A McNeel staffer on the forum said net8.0 was fine, then later pointed developers at the guide
   (which says net10.0).

**How to reconcile it:** Rhino 9 hosts the .NET 10 runtime. RhinoCommon is compiled for `net8.0`,
and net8/net9/net10 assemblies can all reference a net8.0 library. So all three plugin TFMs load
today. The direction of travel is net10: yak was updated to auto-tag .NET 10 plugins as `rh9`, and
`yak spec` was taught to inspect `net10.0/` folders.

**Recommendation:**

- Targeting Rhino 8 only → `<TargetFramework>net8.0</TargetFramework>`. Drop to
  `<TargetFramework>net7.0</TargetFramework>` if 8.19-era installs are in scope, and add `net48`
  as a second TFM (`<TargetFrameworks>net8.0;net48</TargetFrameworks>`) only for users still
  running Rhino 8 in .NET Framework mode.
- Targeting Rhino 9 → `<TargetFramework>net10.0</TargetFramework>`, because that is what the
  official guide and yak's tag inference are aligned on.
- Supporting both from one repo → build two configurations, or one project with
  `net8.0;net10.0` (plus `net48` only if you need the .NET Framework leg) and ship separate yak
  packages per Rhino major version (the `rh8` and `rh9` distribution tags are separate packages
  regardless).
- **Do not blindly copy `net9.0` from the samples repo.** That branch is a mid-beta snapshot, not
  shipping guidance.

**Still unverified:** whether Rhino 9 at RTM will hard-reject sub-net10 plugin assemblies, and
whether yak recognises `net8.0/` or `net9.0/` package folders. Settle it locally by building against
the Rhino 9 beta and running `yak spec` on the output directory to see which tag it infers.

Add `-windows` to a TFM (`net8.0-windows`, `net10.0-windows`) **only** when the project uses
WinForms, WPF, or the `RhinoWindows` package. That makes the whole assembly Windows-only.

---

## 4. `.csproj` A — cross-platform plugin (Eto UI)

The default choice. Runs on Windows and Mac, UI written in Eto.Forms.

This section comes in two halves: the core, which every `.rhp` needs, and a set of conditional
additions. Copy the core, then add only the blocks whose trigger condition you actually meet.

### 4a. The core — this alone builds a loadable `.rhp`

Nothing here is optional. A one-command plugin with no UI and no icon needs exactly this and
nothing more.

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <!-- Rhino 8: net8.0   Rhino 9: net10.0   (see §3) -->
    <TargetFramework>net8.0</TargetFramework>

    <!-- THE property that makes this a Rhino plugin instead of a class library.
         Renames the build output MyPlugin.dll -> MyPlugin.rhp. Replaces the old
         post-build rename hack. -->
    <TargetExt>.rhp</TargetExt>

    <!-- Emits a .deps.json next to the output and copies non-framework
         dependencies into the output folder, so the plugin can still resolve
         its own dependency graph once Rhino loads it dynamically. -->
    <EnableDynamicLoading>true</EnableDynamicLoading>

    <!-- We hand-write Properties/AssemblyInfo.cs (for [assembly: Guid] and the
         PlugInDescription attributes). Without this the SDK generates its own
         assembly attributes too and you get CS0579 duplicate-attribute errors.

         IMPORTANT: this also switches OFF the SDK's translation of <Version>,
         <Title>, <Description>, <Company> and <Copyright> into assembly
         attributes. Those MSBuild properties become inert. Declare the metadata
         in AssemblyInfo.cs instead — see §8. Setting both is the contradiction to
         watch for: a csproj carrying GenerateAssemblyInfo=false AND a <Version>
         block looks correct and silently ships an assembly with no version for
         `yak spec` to read. -->
    <!-- See §4a: this also makes <Version>/<Title>/<Description>/<Company>
         inert. Declare that metadata in AssemblyInfo.cs instead. -->
    <GenerateAssemblyInfo>false</GenerateAssemblyInfo>

    <RootNamespace>MyPlugin</RootNamespace>
    <AssemblyName>MyPlugin</AssemblyName>
  </PropertyGroup>

  <ItemGroup>
    <!-- ExcludeAssets="runtime" = compile against RhinoCommon, but DO NOT copy
         RhinoCommon.dll into the output folder. Rhino already has it loaded.
         A stale RhinoCommon.dll sitting next to your .rhp shadows Rhino's own
         and produces MissingMethodException / TypeLoadException at load time.
         This is the single most common self-inflicted load failure. -->
    <!-- Pin deliberately: this version becomes the service-release FLOOR for who can
         load your plugin, and yak derives the distribution tag from it. Use the
         oldest 8.x that has the APIs you actually call, not the newest available. -->
    <PackageReference Include="RhinoCommon" Version="8.0.23304.9001" ExcludeAssets="runtime" />
  </ItemGroup>

</Project>
```

There is no `<OutputPath>` here on purpose: the SDK default puts the build in
`bin/<Configuration>/<tfm>/`, which keeps Debug and Release apart. Overriding it with a flat
folder makes the two configurations overwrite each other, and then `dotnet build -c Release`
followed by a copy out of that folder packages whichever build ran last. Every path in §9 and
§11 assumes the default layout.

**Pin the RhinoCommon version deliberately.** A floating `8.*` resolves to the newest package on
the build machine, which silently raises the service-release floor every time you restore, and
makes two developers' builds differ. Rhino requires the plugin's `RhinoSdkVersion` to match and its
`RhinoSdkServiceRelease` to be no newer than the running Rhino, so building against a very recent
service release narrows who can load your plugin.

### 4b. Add these only if

| Trigger | Add |
|---|---|
| Embedding a plugin icon, or using any `.resx` | the icon block below |
| Calling `System.Drawing` types from your own code | the `System.Drawing.Common` reference |
| WinForms, WPF, or the `RhinoWindows` package | the `-windows` TFM — see §5 |
| Supporting Rhino 8 users still in .NET Framework mode | the `net48` second target |
| Third-party NuGet dependencies | nothing — `EnableDynamicLoading` is already in the core for exactly this |

**Icon or `.resx`.** `GenerateResourceUsePreserializedResources`, the
`System.Resources.Extensions` package, and the `EmbeddedResource` item are one unit — with any of
the three missing, icon resources fail to build or the icon comes out blank. The manifest resource
name that `[PlugInDescription(DescriptionType.Icon, ...)]` takes is derived from this item's path
(see §8).

```xml
  <PropertyGroup>
    <!-- Required on .NET 7+ to embed System.Drawing.Bitmap / Icon in a .resx. -->
    <GenerateResourceUsePreserializedResources>true</GenerateResourceUsePreserializedResources>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="System.Resources.Extensions" Version="8.0.0" ExcludeAssets="runtime" />
  </ItemGroup>

  <!-- If you also keep a Properties\Resources.resx with a generated designer
       file, your IDE writes the matching <Compile Update="...Designer.cs"> /
       <EmbeddedResource Update="...resx"> pair for you. -->
  <ItemGroup>
    <EmbeddedResource Include="Resources\**\*" />
  </ItemGroup>
```

**`System.Drawing` in your own code.** Only when you construct `Bitmap`, `Icon`, `Color` or
similar yourself. RhinoCommon's own surface does not require you to reference the package.

```xml
  <ItemGroup>
    <PackageReference Include="System.Drawing.Common" Version="8.0.0" ExcludeAssets="runtime" />
  </ItemGroup>
```

**A `net48` second target.** Add it when you know you have users running Rhino 8 in .NET Framework
mode, not reflexively — it is a deprecated path (§3).

```xml
  <PropertyGroup>
    <!-- Plural TargetFrameworks, replacing the singular TargetFramework. -->
    <TargetFrameworks>net8.0;net48</TargetFrameworks>

    <!-- NU1701: "package was restored using .NETFramework, may not be fully
         compatible" — expected and harmless on the net48 leg. -->
    <NoWarn>NU1701</NoWarn>
  </PropertyGroup>
```

**Take only what applies.** An unused property or package reference is not free: it is another
line the next reader has to evaluate before touching the file, and a dead
`<EmbeddedResource Include="Resources\**\*" />` glob silently changes what the build does on the
day someone adds a `Resources/` folder for something unrelated.

---

## 5. `.csproj` B — Windows-only plugin (WPF / WinForms)

**Windows-only.** Use this only when you need WPF, WinForms, dock bars, `RhinoDropTarget`, or
anything else in the `RhinoWindows` package. The `-windows` TFM suffix is what unlocks those.

This is §4's core with three changes, not a separate scaffold. Start from §4a, apply the diff
below, and take the conditional blocks from §4b as they apply — the same triggers hold here.

```xml
  <PropertyGroup>
    <!-- 1. The -windows suffix is required for UseWPF / UseWindowsForms and for
         the RhinoWindows package. It also makes the assembly Windows-only.
         Rhino 8: net8.0-windows (net7.0-windows if 8.19-era installs matter).
         Rhino 9: net10.0-windows. Add ;net48 only for the .NET Framework leg. -->
    <TargetFramework>net8.0-windows</TargetFramework>

    <!-- 2. Set whichever toolkits you actually use. Both may be true in one
         assembly; neither belongs in a project that has to run on Mac. -->
    <UseWindowsForms>true</UseWindowsForms>
    <UseWPF>true</UseWPF>
  </PropertyGroup>

  <ItemGroup>
    <!-- 3. RhinoWindows is a SEPARATE package from RhinoCommon. Dock bars,
         RhinoDropTarget and WPF/WinForms hosting live here, not in RhinoCommon.
         Same ExcludeAssets rule: Rhino supplies it at run time. -->
    <PackageReference Include="RhinoWindows" Version="8.0.23304.9001" ExcludeAssets="runtime" />
  </ItemGroup>
```

`UseWindowsForms` pulls in `System.Drawing` implicitly, so a WinForms project does not need the
`System.Drawing.Common` reference from §4b. A WPF-only project that touches `Bitmap` or `Icon`
still does.

Windows projects often want `<NoWarn>NU1701;NETSDK1086</NoWarn>` once a `net48` leg or a
`FrameworkReference` is in play — add it when the warnings actually appear, not before.

If you want one plugin that ships Windows-specific UI *and* runs on Mac, split it: a cross-platform
core project plus a Windows-only satellite, or guard the Windows code behind
`#if NET48 || NET7_0_WINDOWS`. Do not put `UseWPF` in a cross-platform project.

---

## 6. `.csproj` C — Grasshopper assembly (`.gha`)

A `.gha` is an ordinary .NET assembly loaded by **Grasshopper** (which is itself a `.rhp`), not by
Rhino's plugin loader. It references the **`Grasshopper`** package, which transitively brings
RhinoCommon. You can ship a `.rhp` and a `.gha` from one solution and put both in one yak package.

### 6a. The core

`Deterministic=false` and `GenerateAssemblyInfo=false` are part of the core here rather than
optional extras: Grasshopper projects conventionally carry a `1.0.*` wildcard assembly version,
which deterministic builds reject, and the wildcard lives in a hand-written `AssemblyInfo.cs`.

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <!-- Same choice as §3: net8.0 for Rhino 8, net10.0 for Rhino 9. -->
    <TargetFramework>net8.0</TargetFramework>

    <!-- .gha, not .rhp — this is what Grasshopper's loader looks for. -->
    <TargetExt>.gha</TargetExt>

    <EnableDynamicLoading>true</EnableDynamicLoading>

    <!-- As in §4a, this makes <Version>/<Title>/<Description>/<Company> inert.
         Put that metadata in AssemblyInfo.cs instead — do not set both. -->
    <GenerateAssemblyInfo>false</GenerateAssemblyInfo>

    <!-- Allows wildcard assembly versions like 1.0.*. Every McNeel Grasshopper
         sample sets this; deterministic builds forbid the wildcard. -->
    <Deterministic>false</Deterministic>

    <RootNamespace>MyPluginGh</RootNamespace>
    <AssemblyName>MyPluginGh</AssemblyName>
  </PropertyGroup>

  <ItemGroup>
    <!-- Grasshopper brings RhinoCommon transitively. Same ExcludeAssets rule:
         Grasshopper.dll and RhinoCommon.dll must not be copied to output. -->
    <PackageReference Include="Grasshopper" Version="8.0.23304.9001" ExcludeAssets="runtime" />
  </ItemGroup>

</Project>
```

No `<OutputPath>` here either, for the reason given in §4a.

### 6b. Add these only if

§4b's triggers apply unchanged. Two are worth calling out for `.gha` work:

**Component icons.** Most shipped components have them, so this is the usual first addition rather
than a rare one — but a component whose `Icon` override returns null needs none of it. Icons are
24×24 PNGs embedded through a `.resx`, which on .NET 7+ means the property *and* the package from
§4b, plus the files themselves:

```xml
  <ItemGroup>
    <!-- 24x24 PNG icons, one per component plus one for the library -->
    <None Include="Resources\MyPluginGh_24x24.png" />
    <None Include="Resources\MyComponent_24x24.png" />
  </ItemGroup>
```

**Warning noise.** `NETSDK1086` ("FrameworkReference included but not used") is common in `.gha`
projects, and `NU1701` appears once a `net48` leg exists. Silence them when you see them:

```xml
  <PropertyGroup>
    <NoWarn>NU1701;NETSDK1086</NoWarn>
  </PropertyGroup>
```

**Development quality-of-life:** turn on *Grasshopper > File > Preferences > Solver > "Memory load
\*.GHA assemblies using COFF byte arrays"*. That enables the `GrasshopperReloadAssemblies` command,
which reloads `.gha` files without restarting Rhino. There is no `.rhp` equivalent — for `.rhp`
work you close Rhino and rebuild.

---

## 7. Property reference — why each line is there

| Property | Effect | When you need it |
|---|---|---|
| `<TargetExt>.rhp</TargetExt>` | Renames the output from `.dll`. **This single property is what turns a class library into a Rhino plugin.** | Every `.rhp`. Use `.gha` for Grasshopper. |
| `ExcludeAssets="runtime"` on `RhinoCommon` / `Grasshopper` / `RhinoWindows` | Reference at compile time, do not copy the DLL to output. Rhino supplies these at run time. | Always. A stale `RhinoCommon.dll` next to your `.rhp` shadows Rhino's own copy and causes `MissingMethodException` / `TypeLoadException` at load. |
| `<EnableDynamicLoading>true` | Generates `.deps.json` and copies non-framework dependencies to output so the host can resolve your dependency graph. | Any plugin with third-party NuGet references. Cheap enough to always set. |
| `<GenerateAssemblyInfo>false` | Stops the SDK auto-generating assembly attributes. | Whenever you keep a hand-written `Properties/AssemblyInfo.cs`. Without it: CS0579 duplicate attributes. |
| `<Deterministic>false` | Permits `1.0.*` wildcard assembly versions. | Grasshopper projects, and anywhere you use a wildcard version. |
| `<GenerateResourceUsePreserializedResources>true` **+** `System.Resources.Extensions` package | Together they let `.resx` embed `System.Drawing.Bitmap` / `Icon` on .NET Core. | Any project with icon resources on .NET 7+. Both, or neither works. Leave both out of a plugin with no icon and no `.resx`. |
| `<OutputPath>` | Overrides the default `bin/<Configuration>/<tfm>/` output layout. | Leave it unset. A flat override such as `../bin/` makes Debug and Release write to the same folder, so a release copied out of it may be whatever build ran last. |
| `IncludeAssets="compile;build"` | Stricter alternative to `ExcludeAssets="runtime"` — pull in only ref assemblies and build targets. | When you want to be certain nothing from the package reaches output. |
| `Private="false"` | Old-style `<Reference>` equivalent of `ExcludeAssets="runtime"` ("do not copy local"). | Only with direct `<Reference>` items, not `<PackageReference>`. |
| `<NoWarn>NU1701` | Silences the "restored using .NETFramework" warning. | The `net48` leg of a multi-target build. |
| `<NoWarn>NETSDK1086` | Silences "FrameworkReference included but not used". | `.gha` projects. |
| `<AppendTargetFrameworkToOutputPath>false` | Output lands directly in `OutputPath` instead of `OutputPath/<tfm>/`. | **Do not set this on a multi-target project** — the two TFMs overwrite each other, and yak's multi-target layout wants per-TFM folders. Leave it unset: §11's copy paths and the debug profiles in §9 both assume the default per-TFM output. |
| `<Version>` `<Title>` `<Description>` `<Company>` `<Copyright>` | Populate assembly metadata — but ONLY when `GenerateAssemblyInfo` is left at its default `true`. | Never alongside `GenerateAssemblyInfo=false`, where they are silently inert. With a hand-written `AssemblyInfo.cs`, put the same metadata in assembly attributes there instead; `yak spec` reads the compiled assembly either way. |

---

## 8. `Properties/AssemblyInfo.cs`

The plugin's identity GUID is the **assembly** GUID. It is not a `PlugInDescription`.

```csharp
using Rhino.PlugIns;
using System.Reflection;
using System.Runtime.InteropServices;

// Plug-in Description Attributes - all optional. These surface in Rhino under
// Options > Plug-ins > (select plugin) > Details.
[assembly: PlugInDescription(DescriptionType.Organization, "My Company")]
[assembly: PlugInDescription(DescriptionType.Address, "1 Example Street\r\nCity, ST 00000")]
[assembly: PlugInDescription(DescriptionType.Country, "United States")]
[assembly: PlugInDescription(DescriptionType.Email, "support@example.invalid")]
[assembly: PlugInDescription(DescriptionType.Phone, "000-000-0000")]
[assembly: PlugInDescription(DescriptionType.Fax, "000-000-0000")]
[assembly: PlugInDescription(DescriptionType.WebSite, "REPLACE-WITH-YOUR-SITE")]
[assembly: PlugInDescription(DescriptionType.UpdateUrl, "REPLACE-WITH-YOUR-UPDATE-FEED")]

// DescriptionType.Icon takes a MANIFEST RESOURCE NAME, i.e.
//   <RootNamespace>.<FolderPath>.<file.ico>
// matching the <EmbeddedResource Include="Resources\**\*" /> item from the
// icon block in §4b. Omit the whole DescriptionType.Icon attribute if the
// plugin ships no icon; get the string wrong and you get a blank icon with NO
// error message.
[assembly: PlugInDescription(DescriptionType.Icon, "MyPlugin.Resources.MyPlugin.ico")]

// Standard assembly metadata. AssemblyTitle becomes the plug-in title in Rhino.
[assembly: AssemblyTitle("MyPlugin")]
[assembly: AssemblyDescription("What MyPlugin does, in one sentence.")]
[assembly: AssemblyCompany("My Company")]
[assembly: AssemblyProduct("MyPlugin")]
[assembly: AssemblyCopyright("Copyright © 2026, My Company")]
[assembly: AssemblyConfiguration("")]
[assembly: AssemblyTrademark("")]
[assembly: AssemblyCulture("")]

// Types in this assembly are not visible to COM unless you say otherwise.
// Set true (or mark individual types [ComVisible(true)]) only if you expose a
// scripting object through PlugIn.GetPlugInObject().
[assembly: ComVisible(false)]

// ===========================================================================
// THIS GUID IS THE PLUG-IN ID.
//   * Generate a FRESH one for this plugin. Never copy from a sample or template.
//   * Never change it after release: Rhino would treat the build as a different
//     plugin and lose settings, license registration and command registration.
//   * External automation looks your plugin up by this exact value.
// ===========================================================================
[assembly: Guid("00000000-0000-0000-0000-000000000000")]  // <-- REGENERATE

// Because the .csproj sets GenerateAssemblyInfo=false, THIS FILE is the only place
// the assembly's metadata comes from — the MSBuild <Version>/<Title>/<Company>
// properties are inert. yak spec reads the compiled assembly, so anything you leave
// out here comes back as a blank in manifest.yml.
[assembly: AssemblyTitle("MyPlugin")]
[assembly: AssemblyDescription("What MyPlugin does, in one sentence.")]
[assembly: AssemblyCompany("My Company")]
[assembly: AssemblyProduct("MyPlugin")]
[assembly: AssemblyCopyright("Copyright © 2026, My Company")]

// yak spec reads AssemblyInformationalVersion first, then AssemblyVersion.
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]
[assembly: AssemblyInformationalVersion("1.0.0")]
```

Remember `<GenerateAssemblyInfo>false</GenerateAssemblyInfo>` in the `.csproj`, or this file
collides with the SDK-generated one — and remember that the same switch is what moves the
metadata above out of the `.csproj` and into here.

---

## 9. `Properties/launchSettings.json` and debugging

### The `RHINO_PACKAGE_DIRS` profile (recommended)

`RHINO_PACKAGE_DIRS` points Rhino at extra package directories to scan at startup, so it loads your
plugin straight out of the build folder — no install step, no polluting the user's real package
folder. Build, F5, Rhino comes up with the fresh binary.

`$(ProjectDir)$(OutputPath)` resolves to the SDK default `bin\Debug\<tfm>\` under a debug build, so
these profiles pick up the Debug binary and never a stale Release one — which is why §4a leaves
`OutputPath` alone.

**Windows:**

```json
{
  "profiles": {
    "Rhino 8 (netcore)": {
      "commandName": "Executable",
      "executablePath": "C:\\Program Files\\Rhino 8\\System\\Rhino.exe",
      "commandLineArgs": "/netcore /nosplash",
      "environmentVariables": {
        "RHINO_PACKAGE_DIRS": "$(ProjectDir)$(OutputPath)\\"
      }
    },
    "Rhino 8 (netcore-7, reproduce an 8.19-era install)": {
      "commandName": "Executable",
      "executablePath": "C:\\Program Files\\Rhino 8\\System\\Rhino.exe",
      "commandLineArgs": "/netcore-7 /nosplash",
      "environmentVariables": {
        "RHINO_PACKAGE_DIRS": "$(ProjectDir)$(OutputPath)\\"
      }
    },
    "Rhino 8 (netfx, only if you ship a net48 leg)": {
      "commandName": "Executable",
      "executablePath": "C:\\Program Files\\Rhino 8\\System\\Rhino.exe",
      "commandLineArgs": "/netfx /nosplash",
      "environmentVariables": {
        "RHINO_PACKAGE_DIRS": "$(ProjectDir)$(OutputPath)\\"
      }
    },
    "Rhino 9": {
      "commandName": "Executable",
      "executablePath": "C:\\Program Files\\Rhino 9\\System\\Rhino.exe",
      "commandLineArgs": "/nosplash /runscript=\"_-MyPluginCommand\"",
      "environmentVariables": {
        "RHINO_PACKAGE_DIRS": "$(ProjectDir)$(OutputPath)\\"
      }
    }
  }
}
```

**macOS** — same shape, with three differences: switches take a `-` prefix instead of `/`, there is
no runtime switch at all (Mac hosts only .NET Core, so no `/netcore` vs `/netfx`), and the path
separator in `RHINO_PACKAGE_DIRS` is `/`. `commandName` is often `"Project"` rather than
`"Executable"`, depending on the IDE.

```json
"Rhino 8 (Mac)": {
  "commandName": "Executable",
  "executablePath": "/Applications/Rhino 8.app/Contents/MacOS/Rhinoceros",
  "commandLineArgs": "-nosplash",
  "environmentVariables": { "RHINO_PACKAGE_DIRS": "$(ProjectDir)$(OutputPath)/" }
}
```

### `/netcore` vs `/netfx` — and pinning a .NET version

Rhino 8 on Windows can host **either** the .NET Core runtime or .NET Framework 4.8, and you choose
per launch:

| Switch (Windows) | Effect |
|---|---|
| `/netcore` | Host the .NET Core runtime — whichever version this service release defaults to (.NET 8 from 8.20 on, .NET 7 in 8.19 and earlier). Required to debug a `net7.0`/`net8.0` build. |
| `/netcore-8` | Host .NET 8 specifically. |
| `/netcore-7` | Host .NET Core 7 specifically — how you reproduce an 8.19-era install without downgrading Rhino. A `net8.0` build will not load here; a `net7.0` build will. |
| `/netfx` | Host .NET Framework 4.8. Required to debug the `net48` build. Deprecated path — only relevant if you ship a `net48` leg. |
| `/nosplash` | Skip the splash screen — noticeably faster debug launches. |
| `/runscript="_-MyPluginCommand"` | Run a command at startup so F5 lands directly in your code. Escape the quotes for JSON. |
| `/safemode` | Start without loading plugins — how you recover from a plugin that crashes Rhino at load. |

The `/netcore-7` and `/netcore-8` switches are the debugging tool for the one Rhino 8 asymmetry
that bites: `net7.0` rolls forward onto a .NET 8 host, but `net8.0` will **not** load on a .NET 7
host. When a plugin loads for you and not for a user, launching with `/netcore-7` is the fastest
way to find out whether that is why.

Visual Studio picks the debug engine from the project's target framework. A `net48`-only project
gets the .NET Framework debugger and **cannot break** inside a `/netcore` Rhino, and vice versa.
If you do multi-target, keep one launch profile per TFM — that is the supported setup.

**Mac:** switches take a `-` prefix (`-nosplash`), and there is only one runtime, so `/netfx`,
`/netcore*` and the `net48` TFM are Windows-only concerns.

**Rhino 9:** hosts a single runtime (.NET 10), so `/netcore` vs `/netfx` no longer applies.

### Other debugging facts worth knowing

- **`_PlugInManager`** (or *Tools > Options > Plug-ins*) lists every registered plugin, its file
  path, and load state. First place to look. Listed but not loaded = runtime failure. Not listed at
  all = Rhino never found the file.
- **Drag a `.rhp` onto the Rhino window** to load and register it ad-hoc. If drag-and-drop works but
  the installed copy does not, your package layout or distribution tag is wrong — that one test
  separates a packaging problem from a plugin problem.
- **No unload.** Once Rhino loads a `.rhp`, the assembly is locked in an `AssemblyLoadContext` for
  the life of the process. Rebuilding while Rhino is open gives `MSB3021 / file in use`. Close Rhino
  first, or build to a staging folder.
- Newly installed or uninstalled yak packages are only scanned at Rhino startup. "I installed it and
  nothing happened" is almost always "restart Rhino".
- There is no current `RhinoDebug` tool to install for Rhino 8/9. The old mono-based VS Code debug
  adapter is Rhino 6/7-era and obsolete. Modern setup is: multi-target, `launchSettings.json`
  profiles, and the standard .NET debugger in VS / VS Code / Rider.

---

## 10. The minimal PlugIn and Command classes

### `MyPluginPlugin.cs`

```csharp
using Rhino;
using Rhino.PlugIns;

namespace MyPlugin
{
  /// <summary>
  /// Every RhinoCommon .rhp assembly must have one and ONLY one PlugIn-derived
  /// class. Do not create instances of this class yourself — Rhino does it.
  /// See also the PlugInDescription attributes in Properties/AssemblyInfo.cs.
  /// </summary>
  public class MyPluginPlugin : PlugIn
  {
    // Rhino creates exactly one instance of each plug-in class, so it is safe
    // to capture it in a static property.
    public MyPluginPlugin() { Instance = this; }

    /// <summary>Gets the only instance of the plug-in.</summary>
    public static MyPluginPlugin Instance { get; private set; }

    /// <summary>
    /// OnLoad is the universal registration point: panels, dock bars, event
    /// handlers, drop targets and Compute endpoints all register here.
    ///
    /// Returning anything other than LoadReturnCode.Success — or throwing —
    /// is the #1 cause of "unable to load plug-in: initialization failed".
    /// Catch your own exceptions, set errorMessage, and only fail when the
    /// failure is genuinely fatal.
    /// </summary>
    protected override LoadReturnCode OnLoad(ref string errorMessage)
    {
      try
      {
        // Panels.RegisterPanel(this, typeof(MyPanel), "My Panel", icon);
        return LoadReturnCode.Success;
      }
      catch (System.Exception ex)
      {
        errorMessage = ex.Message;
        return LoadReturnCode.ErrorShowDialog;
      }
    }

    // Persistent plug-in settings come free, no plumbing required:
    //   Settings.GetBool("Key", defaultValue) / Settings.SetBool("Key", value)
    //   Settings.GetString / SetString / GetDouble / SetDouble
    // A nice reusable idiom — show a panel once on first install and never nag:
    //   if (Settings.GetBool("DisplayPanelByDefault", true))
    //   {
    //     Settings.SetBool("DisplayPanelByDefault", false);
    //     Panels.OpenPanel(MyPanel.PanelId);
    //   }
  }
}
```

By default Rhino loads plugins lazily, when one of their commands is first run. If your plugin must
be alive before that — a server-side plugin registering endpoints, or one that must watch document
events from startup — override:

```csharp
public override PlugInLoadTime LoadTime => PlugInLoadTime.AtStartup;
```

### `MyPluginCommand.cs`

```csharp
using Rhino;
using Rhino.Commands;

namespace MyPlugin
{
  public class MyPluginCommand : Command
  {
    // Rhino creates exactly one instance of each command class defined in a
    // plug-in, so it is safe to store a reference in a static property.
    public MyPluginCommand() { Instance = this; }

    /// <summary>The only instance of this command.</summary>
    public static MyPluginCommand Instance { get; private set; }

    /// <summary>The command name as typed on the Rhino command line.</summary>
    public override string EnglishName => "MyPluginCommand";

    protected override Result RunCommand(RhinoDoc doc, RunMode mode)
    {
      // mode is RunMode.Interactive (user typed it) or RunMode.Scripted
      // (called from a script / -dash prefix). Never show a dialog in
      // Scripted mode — fall back to command-line prompts.
      return Result.Success;
    }
  }
}
```

To hide a command from the command list — for example a do-nothing loader command that an external
automation client runs to force the plugin into memory:

```csharp
using System.Runtime.InteropServices;

// Both GUIDs below must be freshly generated.
[Guid("00000000-0000-0000-0000-000000000000"), CommandStyle(Style.Hidden)]
public class MyPluginLoaderCommand : Command { /* ... */ }
```

---

## 11. `manifest.yml` and the yak release pipeline

### What yak is

Yak is Rhino's package manager. A `.yak` file is **a ZIP archive with a `.yak` extension**
containing a top-level `manifest.yml` plus your `.rhp` / `.gha` / `.ghpy` and support files. Users
install from inside Rhino with the **`_PackageManager`** command.

`yak` lives inside the Rhino installation:

| Platform | Path |
|---|---|
| Windows | `C:\Program Files\Rhino 8\System\Yak.exe` |
| macOS | `/Applications/Rhino 8.app/Contents/Resources/bin/yak` |

Substitute `Rhino 9` / `Rhino 9.app` for Rhino 9.

### `manifest.yml`

```yaml
# Required. Letters, numbers, dashes and underscores only.
# Case is locked at first upload; later pushes are case-insensitive.
name: my-plugin

# Required. SemVer 2.0.0 (1.1.0-beta) or Microsoft 4-digit (1.2.3.4).
# The literal string $version can be used here and substituted at build time.
version: 1.0.0

# Required. One author per line.
authors:
  - Your Name
  - Another Contributor

# Required. Single line, or a YAML folded block as below.
description: >
  One or two sentences describing what MyPlugin does and who it is for.
  This is what users read in the Package Manager listing.

# Optional. Homepage or repository.
url: "REPLACE-WITH-YOUR-PROJECT-PAGE"

# Optional. Search terms — Rhino 9's Package Manager searches these plus
# author and description.
keywords:
  - geometry
  - my-plugin

# Optional. PNG or JPEG in the package root. 64x64 recommended; keep it small.
icon: icon.png
```

### Package layout

Filename convention: **`<name>-<version>-<distribution>-<platform>.yak`**, for example
`my-plugin-1.0.0-rh8_0-any.yak`.

- **Distribution tag** — `rh<major>` or `rh<major>_<minor>`, or `any`. **Inferred by yak** from the
  RhinoCommon / C++ SDK version you built against; you do not set it by hand. An `rh8`-tagged
  package will not install on Rhino 9 — you must rebuild against the Rhino 9 SDK to get an `rh9`
  tag.
- **Platform** — `win`, `mac`, or `any`. Override with `yak build --platform win|mac|any`.

Single-target layout on the left; multi-target on the right — `manifest.yml` stays at the
top level either way, and per-TFM folders hold the binaries, each with its own icon and misc files.
The multi-target example shows a Rhino 8 package that also carries a `net48` leg for users still
running in .NET Framework mode; a plain `net8.0`-only package uses the single-target layout.

```
dist/                          dist/
├── manifest.yml               ├── manifest.yml
├── icon.png                   ├── net48/
├── MyPlugin.rhp               │   ├── icon.png
└── misc/                      │   ├── MyPlugin.rhp
    ├── README.md              │   └── misc/{LICENSE.txt,README.md}
    └── LICENSE.txt            └── net8.0/
                                   ├── icon.png
                                   ├── MyPlugin.rhp
                                   └── misc/{LICENSE.txt,README.md}
```

For Rhino 9, `yak spec` was updated to inspect **`net10.0/`** folders. Whether it also treats a
`net8.0/` or `net9.0/` folder as an `rh9` payload is unverified — check locally before relying on
it. (For a Rhino 8 package, a `net8.0/` folder is just the ordinary per-TFM layout and carries no
such uncertainty.)

### The release pipeline

```bash
# 0. Set YAK once so the commands below are readable.
#    Windows:  set YAK="C:\Program Files\Rhino 8\System\Yak.exe"
#    macOS:    YAK="/Applications/Rhino 8.app/Contents/Resources/bin/yak"

# 1. Build every target, Release configuration.
dotnet build -c Release

# 2a. Single-TFM plugin (the common case): the whole payload sits at the top
#     level of dist/. Paths below are the SDK default layout §4a relies on —
#     bin/<Configuration>/<tfm>/ — so Release here is genuinely the Release build.
mkdir -p dist
cp bin/Release/net8.0/MyPlugin.rhp dist/
cp icon.png dist/

# 2b. Multi-target instead: a net8.0 leg for Rhino 8.20+ and a net48 leg for
#     users still running Rhino 8 in .NET Framework mode, one folder each.
mkdir -p dist/net48 dist/net8.0
cp bin/Release/net48/MyPlugin.rhp  dist/net48/
cp bin/Release/net8.0/MyPlugin.rhp dist/net8.0/
cp icon.png dist/net48/ && cp icon.png dist/net8.0/

# 3. Generate the manifest ONCE, then keep it in source control and edit by hand.
#    yak spec gleans name/version/authors/description from the assembly metadata
#    you set in the .csproj. Version comes from AssemblyInformationalVersion,
#    falling back to AssemblyVersion.
cd dist
"$YAK" spec

# 4. Package. yak infers the rh* distribution tag from the RhinoCommon version.
"$YAK" build
#   -> my-plugin-1.0.0-rh8_0-any.yak

# 5. Smoke-test on the TEST server first. It resets daily, so it is safe to
#    burn version numbers there. TEST_SOURCE is the https URL of the host
#    test.yak.rhino3d.com; the default source is the public host yak.rhino3d.com.
"$YAK" push   --source "$TEST_SOURCE" my-plugin-1.0.0-rh8_0-any.yak
"$YAK" search --source "$TEST_SOURCE" --all --prerelease my-plugin

# 6. Ship to the public server.
"$YAK" login          # browser OAuth, token cached ~30 days
"$YAK" login --ci     # non-expiring API key, for CI pipelines
"$YAK" push my-plugin-1.0.0-rh8_0-any.yak
"$YAK" search --all --prerelease my-plugin   # verify it is listed
```

### CLI reference

```
yak build [--platform win|mac|any]
yak spec
yak login [--ci] [-s|--source URL]
yak push [--source=URL] <filename>
yak search [--prerelease] [-a|--all] [-s|--source URL] <query>
yak install [--source=URL] <package> [<version>]
yak list
yak uninstall <package>
yak yank <package> <version>
yak unyank <package> <version>
yak owner add|remove|list [--source=URL] <package> [<email>]
```

**Versions are immutable.** You cannot delete or overwrite a published version. `yak yank` unlists
a bad one, but the number is spent forever. This is exactly why the test server exists — push there
first, every time.

Only package owners can push updates; the first publisher becomes owner automatically. Add
co-owners with `yak owner add`.

---

## 12. Load-failure checklist

| Symptom | Cause | Fix |
|---|---|---|
| "Unable to load plug-in: initialization failed" | `PlugIn.OnLoad` threw, or returned something other than `LoadReturnCode.Success`. | Wrap `OnLoad` in try/catch, set `errorMessage`, return `Success` unless genuinely fatal. Breakpoint it. |
| Plugin silently absent from `_PlugInManager` | Wrong runtime — `net48` build in a `/netcore` Rhino or vice versa; or the yak distribution tag does not match (`rh8` package on Rhino 9). | Match `/netcore` ↔ `net7.0`/`net8.0` and `/netfx` ↔ `net48`. Rebuild against the right SDK for the right `rh*` tag. |
| Loads for you, silently absent for a colleague — both on "Rhino 8" | Different service releases, therefore different .NET majors. 8.20 and later host .NET 8; 8.19 and earlier host .NET 7, and a `net8.0` assembly will not load on a .NET 7 host (a `net7.0` one loads on both). | Reproduce it locally without downgrading Rhino: launch with `/netcore-7` to become their machine, `/netcore-8` to become yours. Then either drop the plugin to `net7.0` or require 8.20+ via the `rh8_<minor>` distribution tag. Ask them for `Help > About` before guessing. |
| `MissingMethodException` / `TypeLoadException` at load | A stale `RhinoCommon.dll` shipped next to your `.rhp`, shadowing Rhino's own. | `ExcludeAssets="runtime"` on the RhinoCommon / Grasshopper / RhinoWindows `PackageReference`. |
| Loads on your machine, not the user's | Missing dependency DLLs — you referenced a NuGet package but did not ship its output. | `<EnableDynamicLoading>true</EnableDynamicLoading>` and include the emitted DLLs + `.deps.json` in the package. |
| Two plugins conflict, commands vanish | Duplicate `[assembly: Guid]` — a template project copied without regenerating. | Generate a fresh GUID. See §1. |
| Was working, "unable to load" after reinstall | Leftover files or registration from a previous install pointing at a deleted path. | Uninstall in `_PlugInManager`, delete the stale folder, reinstall. |
| Downloaded `.rhp` will not load (Windows-only) | The file is "blocked" — mark-of-the-web alternate data stream after download. | Right-click > Properties > Unblock, or `Unblock-File` in PowerShell. |
| `MSB3021 / file in use` when rebuilding | Rhino has the assembly locked; there is no unload. | Close Rhino before rebuilding, or build to a staging folder. |
| Version mismatch error | Rhino requires `RhinoSdkVersion` to match exactly and its own `RhinoSdkServiceRelease` to be at least the plugin's. | Rebuild against a matching (or older) RhinoCommon. |
