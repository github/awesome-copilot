# CEP Extensions for After Effects

From Adobe's CEP 12 HTML Extension Cookbook and the CEP-Resources repository
(<https://github.com/Adobe-CEP/CEP-Resources>). Use the `CEP_12.x` folder for
After Effects 25.x and 26.x.

## Versions

| After Effects | CEP |
| --- | --- |
| 16 and 17 | 9 |
| 17.1.4 | 10 |
| 18.4 | 11 |
| 25.0 | 12 |
| 26.0 | 12 (`CEPHtmlEngine.exe` 12.0.1 in the installation; no Adobe table lists it) |

CEP 12 bundles Node.js 17.7.1, Chromium 99 and Node-WebKit 0.62.1. The CSXS
key number in the debug settings below follows the CEP major version.

## Layout

```text
com.acme.demo-panel/
 ├ CSXS/
 │  └ manifest.xml
 ├ index.html
 ├ js/
 │  ├ CSInterface.js       copied from CEP-Resources for the CEP version
 │  └ main.js
 ├ jsx/
 │  └ host.jsx            ExtendScript the panel calls
 └ .debug                 development only
```

The manifest declares the extension bundle and ID, the host (`AEFT` with a
version range), the CSXS version it requires, the main path, the script path,
the panel's geometry, and any `<CEFCommandLine>` parameters. This minimal
manifest loaded in After Effects 26.0: the panel opened from Window >
Extensions > Acme Demo, and an `evalScript` round trip returned. Take anything
more, such as `<CEFCommandLine>` or a minimum size, from the cookbook's sample.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ExtensionManifest xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   ExtensionBundleId="com.acme.demo-panel"
                   ExtensionBundleVersion="1.0.0"
                   Version="12.0">
  <ExtensionList>
    <Extension Id="com.acme.demo-panel.main" Version="1.0.0"/>
  </ExtensionList>
  <ExecutionEnvironment>
    <HostList>
      <Host Name="AEFT" Version="[25.0,99.9]"/>
    </HostList>
    <LocaleList>
      <Locale Code="All"/>
    </LocaleList>
    <RequiredRuntimeList>
      <RequiredRuntime Name="CSXS" Version="12.0"/>
    </RequiredRuntimeList>
  </ExecutionEnvironment>
  <DispatchInfoList>
    <Extension Id="com.acme.demo-panel.main">
      <DispatchInfo>
        <Resources>
          <MainPath>./index.html</MainPath>
          <ScriptPath>./jsx/host.jsx</ScriptPath>
        </Resources>
        <Lifecycle>
          <AutoVisible>true</AutoVisible>
        </Lifecycle>
        <UI>
          <Type>Panel</Type>
          <Menu>Acme Demo</Menu>
          <Geometry>
            <Size><Height>300</Height><Width>320</Width></Size>
          </Geometry>
        </UI>
      </DispatchInfo>
    </Extension>
  </DispatchInfoList>
</ExtensionManifest>
```

- `Version="[25.0,99.9]"` covers 25.x and later; the brackets are inclusive.
- `<Menu>` is the entry under Window > Extensions. A script can open the panel,
  for example in a test: `app.executeCommand(app.findMenuCommandId("Acme Demo"))`
  worked in 26.0.

## Calling After Effects

```js
var csInterface = new CSInterface();
csInterface.evalScript("acmeDescribeProject()", function (result) {
    if (result === "EvalScript error.") {
        showError("After Effects could not run the script.");
        return;
    }
    var data = JSON.parse(result);   /* the panel side has JSON; ExtendScript does not */
    render(data);
});
```

- `evalScript(script, callback)` runs in After Effects' ExtendScript engine
  on its main thread. The callback is optional and receives a string; a
  failure arrives as `"EvalScript error."`.
- The host script returns a string. Build JSON there with `json2.js`, since
  ExtendScript has no native `JSON`.
- Pass arguments as data. Serialize them in the panel and parse them in the
  host script; never paste user text into the script string.

## Node.js in the panel

```xml
<Resources>
  <MainPath>./index.html</MainPath>
  <ScriptPath>./jsx/host.jsx</ScriptPath>
  <CEFCommandLine>
    <Parameter>--enable-nodejs</Parameter>
    <Parameter>--mixed-context</Parameter>
  </CEFCommandLine>
</Resources>
```

`--enable-nodejs` has been supported since CEP 6.1 and `--mixed-context` since
CEP 7.0. `--remote-debugging-port` in `<CEFCommandLine>` is filtered out; use
a `.debug` file instead.

## Install folders

| Scope | Windows | macOS |
| --- | --- | --- |
| Per user | `C:\Users\<user>\AppData\Roaming\Adobe\CEP\extensions` | `~/Library/Application Support/Adobe/CEP/extensions` |
| All users | `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions` and, since CEP 6.1, `C:\Program Files\Common Files\Adobe\CEP\extensions` | `/Library/Application Support/Adobe/CEP/extensions` |

CEP looks in the application's own folder, then the all-users folder, then
the per-user folder. With two copies of one bundle ID, the higher version
wins. A `#` anywhere in the path stops an extension from loading.

## Development settings

Unsigned extensions load only in debug mode, set per CEP version:

```bat
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f
```

```bash
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
killall cfprefsd   # macOS caches the plist until this, or a log out
```

A `.debug` file in the extension root opens Chrome DevTools on a port between
1024 and 65534:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ExtensionList>
  <Extension Id="com.acme.demo-panel.main">
    <HostList>
      <Host Name="AEFT" Port="8088"/>
    </HostList>
  </Extension>
</ExtensionList>
```

The `Extension Id` is the extension's ID from the manifest, not the bundle ID.
Then open `http://localhost:8088/` in Chrome. The cookbook's sample `.debug`
has no `AEFT` entry; add it.

## Signing and installing

```bat
ZXPSignCmd -selfSignedCert US CA "Acme Corp" "Acme Corp" <password> acme-cert.p12
ZXPSignCmd -sign com.acme.demo-panel com.acme.demo-panel.zxp acme-cert.p12 <password> -tsa <timestamp-url>
ZXPSignCmd -verify com.acme.demo-panel.zxp -certinfo
```

- Always timestamp, and sign on the platform the extension will run on.
- A symlink inside the extension breaks the signature check after
  installation.
- Install with the Unified Plugin Installer Agent, which ships with the
  Creative Cloud desktop app:
  - Windows: `"C:\Program Files\Common Files\Adobe\Adobe Desktop Common\RemoteComponents\UPI\UnifiedPluginInstallerAgent\UnifiedPluginInstallerAgent.exe" /install com.acme.demo-panel.zxp`
  - macOS: `"/Library/Application Support/Adobe/Adobe Desktop Common/RemoteComponents/UPI/UnifiedPluginInstallerAgent/UnifiedPluginInstallerAgent.app/Contents/MacOS/UnifiedPluginInstallerAgent" --install com.acme.demo-panel.zxp`
- `ExManCmd` is not supported by Creative Cloud 2022 apps and later, even
  though older guides still show it.
- aescripts' ZXP Installer is a front end that uses UPIA.

## After Effects specifics

- Panel size cannot be changed from code in After Effects.
- `evalScript` blocks After Effects while the script runs. Break long work
  into steps, or move it to a render queue.
- The panel shares After Effects' ExtendScript global namespace with every
  other script; prefix the host script's globals.
- Keep the host script inside the extension folder: name it in `<ScriptPath>`,
  or `$.evalFile` a path below the extension folder. A path that climbs out with
  `..` from `getSystemPath('extension')` is collapsed before a junction is
  followed, so a development install linked into the CEP extensions folder
  looks for the file there. In 26.0 the panel's `evalScript` call then came
  back as an empty string, not `EvalScript error.`
