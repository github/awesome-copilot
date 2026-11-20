# The After Effects C++ SDK

From the After Effects SDK Guide (<https://ae-plugins.docsforadobe.dev/>). The
guide still links the SDK at adobe.io; the current download is on the Adobe
Developer Console, linked from <https://developer.adobe.com/after-effects/>.

## Releases

| SDK | Date | Note |
| --- | --- | --- |
| 25.2 | February 2025 | |
| 25.6 | September 2025 | Windows on Arm |
| 26.5 | September 2026 | |
| 27.0 update | October 2026 | For the After Effects beta only |

## Plugin types

| Type | For |
| --- | --- |
| Effect | Processing pixels (and audio) as an effect in the Effects menu |
| AEGP (After Effects General Plugin) | Menu commands, hooks, idle-time work, scripting from native code |
| AEIO | Importing and exporting file formats |
| Artisan | 3D rendering |
| BlitHook | Output to external hardware |

## Entry points

Effect, as the guide gives it; the name can be anything the PiPL declares, and
the samples use `EffectMain`:

```cpp
PF_Err EffectMain(
    PF_Cmd       cmd,
    PF_InData   *in_data,
    PF_OutData  *out_data,
    PF_ParamDef *params[],
    PF_LayerDef *output,
    void        *extra);
```

It switches on `cmd`: `PF_Cmd_ABOUT`, `PF_Cmd_GLOBAL_SETUP`,
`PF_Cmd_PARAMS_SETUP`, `PF_Cmd_RENDER`, and the SmartFX and GPU selectors
below.

AEGP, declared in the PiPL and named `EntryPointFunc` in the samples:

```cpp
A_Err EntryPointFunc(
    struct SPBasicSuite *pica_basicP,
    A_long               major_versionL,
    A_long               minor_versionL,
    AEGP_PluginID        aegp_plugin_id,
    AEGP_GlobalRefcon   *global_refconP);
```

## PiPL resources

- Every plugin carries a PiPL describing it. The out flags in the PiPL
  (`AE_Effect_Global_OutFlags`) must match the ones `PF_Cmd_GLOBAL_SETUP`
  sets.
- Windows: the sample projects' custom build steps process the
  cross-platform `.r` file into an `.rc` file. The guide names both
  `pipltool.exe` and `cnvtpipl.exe` for this; follow the sample's build step.
- macOS: Rez compiles the `.r` file.

## Files and install locations

- Windows: a DLL with the `.aex` extension. macOS: a `.plugin` bundle.
- Installers:
  - Windows: read `HKLM\SOFTWARE\Adobe\After Effects\<version>\CommonPluginInstallPath`
    for the shared folder, or `PluginInstallPath` for After Effects only.
  - macOS: `/Library/Application Support/Adobe/Common/Plug-ins/7.0/MediaCore/`
    (7.0 for every Creative Cloud version), or
    `/Applications/Adobe After Effects <year>/Plug-ins/` for After Effects
    only.
- Development: `C:\Program Files\Adobe\Common\Plug-ins\7.0\MediaCore\` on
  Windows, which the guide recommends for development only, and
  `~/Library/Application Support/Adobe/Common/Plug-ins/7.0/MediaCore/` on
  macOS.
- After Effects scans 10 folder levels deep and skips folders whose names end
  in a closing parenthesis or start with `~` (Windows) or `¬` (macOS).
- macOS 15 and later refuse unsigned plugins. For local development an ad hoc
  signature works: `codesign --force --deep --sign - <plugin>`.
- Native ARM builds of After Effects, on Windows on Arm and Apple Silicon,
  load only plugins compiled natively for ARM.

## Multi-Frame Rendering

`PF_OutFlag2_SUPPORTS_THREADED_RENDERING`: "Effects must be thread-safe before
this flag is set." Thread-safe means:

- no static or global state that two renders could race on;
- no writes to `in_data->global_data` or to sequence data at render time;
  read sequence data through `PF_EffectSequenceDataSuite1`, and use
  `PF_OutFlag2_MUTABLE_RENDER_SEQUENCE_DATA_SLOWER` or the Compute Cache when
  render-time state is unavoidable;
- no mutex held while calling back into the host.

Sequence setup, resetup and setdown, smart pre-render, render and smart
render can all arrive on several threads at once. The guide warns that
effects compiled with the June 2020 SDK do not get Multi-Frame Rendering, and
that an effect setting `PF_OutFlag2_SEQUENCE_DATA_NEEDS_FLATTENING` must also
set `PF_OutFlag2_SUPPORTS_GET_FLATTENED_SEQUENCE_DATA`.

## SmartFX and GPU

- `PF_OutFlag2_SUPPORTS_SMART_RENDER` brings `PF_Cmd_SMART_PRE_RENDER` and
  `PF_Cmd_SMART_RENDER`, where the effect asks for only the input region it
  needs.
- GPU: `PF_Cmd_GPU_DEVICE_SETUP` sets one or both of the
  `PF_OutFlag2_SUPPORTS_GPU_RENDER_Fxx` flags (the guide documents
  `PF_OutFlag2_SUPPORTS_GPU_RENDER_F32`, new in 16.0); rendering arrives as
  `PF_Cmd_SMART_RENDER_GPU`, and `PF_Cmd_GPU_DEVICE_SETDOWN` releases the
  device. DirectX rendering also needs
  `PF_OutFlag2_SUPPORTS_DIRECTX_RENDERING`.

## AEGP suites a bridge uses

```cpp
/* AEGP_UtilitySuite6 */
A_Err AEGP_ExecuteScript(
    AEGP_PluginID   inPlugin_id,
    const A_char   *inScriptZ,
    const A_Boolean platform_encodingB,
    AEGP_MemHandle *outResultPH0,
    AEGP_MemHandle *outErrStringPH0);

/* AEGP_RegisterSuite5 */
A_Err AEGP_RegisterIdleHook(
    AEGP_PluginID aegp_plugin_id,
    AEGP_IdleHook idle_hook_func,
    AEGP_IdleRefcon refconP);
```

- The script may be UTF-8, or the application encoding when
  `platform_encodingB` is true. The value of the script's last line comes back
  in `outResultPH0`; both out handles are optional, and the plugin frees them.
- "AEGP supports no threading at all." Everything happens on the main thread,
  in a callback or the idle hook, which After Effects calls "sporadically".
  The one call safe from another thread is
  `AEGP_CauseIdleRoutinesToBeCalled()`, so a socket thread queues the work and
  calls it to wake the idle hook.

## Build tools

The guide's only explicit statement (Visual Studio 2019, Xcode 11 and 12) is
out of date. Requirements stated elsewhere in it:

- Universal macOS binaries need Xcode 12.2 or later.
- Windows on Arm builds need Visual Studio 17.4 or later.
- The GPU sample needs Boost, CUDA and DXC; the 27.0 sample uses CUDA 12.8 on
  x64 and CUDA 13.4 on ARM64.

Open the sample projects from the SDK release you build against, and match
their toolchain.
