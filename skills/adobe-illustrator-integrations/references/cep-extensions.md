# CEP Extensions for Illustrator

A CEP extension is an HTML and JavaScript panel that runs inside Illustrator in an embedded Chromium (CEF) and calls ExtendScript in the host application. Illustrator 2026 (30.x) ships CEP 12.1, so the runtime is `CSXS` 12 and debug settings live under `CSXS.12`. Check the version your Illustrator ships with: the `CEPHtmlEngine` folder in the install has a versioned `CEPHtmlEngine.exe` on Windows.

CEP is on its way out (Marketplace stops new CEP submissions for Illustrator in December 2028, CEP is disabled by default from December 2028, and removed from December 2029). Keep the drawing logic in plain ExtendScript so it moves to UXP later.

## Folder Layout

```text
com.example.gridtool/
  CSXS/
    manifest.xml        Extension, host, runtime, and panel definition
  index.html            Panel UI
  css/panel.css
  js/
    CSInterface.js      From Adobe-CEP/CEP-Resources/CEP_12.x (do not edit)
    panel.js            UI logic; calls the host through CSInterface
  jsx/
    host.jsx            ExtendScript loaded into Illustrator (ScriptPath)
  assets/               Icons and files the host script places
  .debug                Development only; remove before packaging
```

Get `CSInterface.js` from the `CEP_12.x` folder of [Adobe-CEP/CEP-Resources](https://github.com/Adobe-CEP/CEP-Resources). `CEPEngine_extensions.js` is built into CEP and must not be bundled.

## manifest.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ExtensionManifest xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   ExtensionBundleId="com.example.gridtool"
                   ExtensionBundleVersion="1.0.0"
                   Version="12.0">
  <ExtensionList>
    <Extension Id="com.example.gridtool.panel" Version="1.0.0"/>
  </ExtensionList>
  <ExecutionEnvironment>
    <HostList>
      <!-- Illustrator 2025 (29.x) through any later 2x/3x release; [ ] are inclusive -->
      <Host Name="ILST" Version="[29.0,99.9]"/>
    </HostList>
    <LocaleList>
      <Locale Code="All"/>
    </LocaleList>
    <RequiredRuntimeList>
      <RequiredRuntime Name="CSXS" Version="12.0"/>
    </RequiredRuntimeList>
  </ExecutionEnvironment>
  <DispatchInfoList>
    <Extension Id="com.example.gridtool.panel">
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
          <Menu>Grid Tool</Menu>
          <Geometry>
            <Size><Height>520</Height><Width>320</Width></Size>
            <MinSize><Height>360</Height><Width>260</Width></MinSize>
          </Geometry>
        </UI>
      </DispatchInfo>
    </Extension>
  </DispatchInfoList>
</ExtensionManifest>
```

- `Host Name="ILST"` is Illustrator. A range in `[` `]` is inclusive; `)` makes the upper bound exclusive.
- `Menu` is the name under Window > Extensions.
- `Type` can also be `ModalDialog` or `Modeless` for dialog-style windows.
- Lower `RequiredRuntime` only if older Illustrator versions must load the panel, and test on each.

## Panel to Host Calls

The panel runs modern JavaScript in Chromium. The host runs ExtendScript, which is ES3: no `let`, `const`, arrow functions, template literals, or built-in `JSON`.

`js/panel.js`:

```javascript
const cs = new CSInterface();

function drawGrid(settings) {
  // JSON.stringify output is a valid ES3 object literal; escape U+2028 and U+2029,
  // which are legal in JSON strings but not in ES3 string literals.
  const literal = JSON.stringify(settings)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return new Promise((resolve) => {
    cs.evalScript(`gridTool.draw(${literal})`, (result) => {
      if (result === 'EvalScript error.') {
        resolve({ ok: false, message: 'Host script error. Check jsx/host.jsx for ES3 syntax.' });
        return;
      }
      resolve(parseHostResult(result));
    });
  });
}

function parseHostResult(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    return { ok: false, message: String(text) };
  }
}
```

`jsx/host.jsx`:

```javascript
// ES3 only. Every public function returns a string the panel can JSON.parse.
var gridTool = (function () {
  // JSON string literal: escapes backslash, quote, and every control character.
  function quote(value) {
    return '"' + String(value).replace(/[\\"\u0000-\u001f]/g, function (ch) {
      if (ch === '\\' || ch === '"') { return '\\' + ch; }
      return '\\u' + ('000' + ch.charCodeAt(0).toString(16)).slice(-4);
    }) + '"';
  }

  function result(ok, message) {
    return '{"ok":' + (ok ? 'true' : 'false') + ',"message":' + quote(message) + '}';
  }

  function toInt(value, min, max) {
    if (typeof value !== 'number' && typeof value !== 'string') { return null; }
    var n = Number(value);
    if (!isFinite(n) || Math.floor(n) !== n || n < min || n > max) { return null; }
    return n;
  }

  function draw(settings) {
    try {
      if (!settings) { return result(false, 'No settings received.'); }
      var rows = toInt(settings.rows, 1, 20);
      var cols = toInt(settings.cols, 1, 10);
      if (rows === null || cols === null) { return result(false, 'Rows must be 1 to 20 and columns 1 to 10.'); }

      var doc = app.documents.length ? app.activeDocument : app.documents.add();
      var layer = doc.layers.add();
      layer.name = 'Grid Tool';
      // Drawing code goes here (see the adobe-illustrator-scripting skill).
      return result(true, 'Drew ' + rows + ' x ' + cols + '.');
    } catch (e) {
      return result(false, 'Line ' + e.line + ': ' + e.message);
    }
  }

  return { draw: draw };
}());
```

Rules that prevent most panel bugs:

- Validate in the panel for fast feedback and again in the host, which must never throw past `evalScript`.
- Return strings from the host. Objects come back as `[object Object]`.
- `EvalScript error.` means the host script failed to compile or threw; test the `.jsx` on its own first.
- Paths to files bundled with the extension: get the extension folder in the panel with `cs.getSystemPath(SystemPath.EXTENSION)` and pass it to the host.

## Development Mode

Unsigned extensions load only when `PlayerDebugMode` is set for the CSXS version the app uses.

Windows (per user, string value):

```bat
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f
```

macOS:

```bash
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
```

Restart Illustrator afterwards (on macOS, log out and back in if the setting does not take). Set it on development machines only, and remove it with `reg delete "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /f` or `defaults delete com.adobe.CSXS.12 PlayerDebugMode`.

## Install Folders

| Scope | Windows | macOS |
| --- | --- | --- |
| Current user | `C:\Users\<user>\AppData\Roaming\Adobe\CEP\extensions\` | `~/Library/Application Support/Adobe/CEP/extensions/` |
| All users | `C:\Program Files\Common Files\Adobe\CEP\extensions\` (also `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\`) | `/Library/Application Support/Adobe/CEP/extensions/` |

During development, copy or link the extension folder into the per-user folder. Writing to the all-users folders needs administrator rights.

## Debugging

Add `.debug` at the extension root:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ExtensionList>
  <Extension Id="com.example.gridtool.panel">
    <HostList>
      <Host Name="ILST" Port="8088"/>
    </HostList>
  </Extension>
</ExtensionList>
```

Open the panel, then browse to `http://localhost:8088` in a Chromium browser for DevTools. Ports must be between 1024 and 65534 and unique per extension. Debug the host `.jsx` separately with the VS Code ExtendScript Debugger.

## Packaging and Signing

Get `ZXPSignCmd` from the `ZXPSignCMD` folder of [Adobe-CEP/CEP-Resources](https://github.com/Adobe-CEP/CEP-Resources).

```bash
# Self-signed certificate for testing (keep the .p12 and its password out of the repo)
ZXPSignCmd -selfSignedCert US CA "Acme Corp" "Acme Grid Tool" "$CERT_PASSWORD" acme-cert.p12

# Sign with a timestamp so the signature outlives the certificate
ZXPSignCmd -sign com.example.gridtool gridtool-1.0.0.zxp acme-cert.p12 "$CERT_PASSWORD" -tsa http://time.certum.pl/

# Check the package
ZXPSignCmd -verify gridtool-1.0.0.zxp -certinfo
```

Before signing: remove `.debug`, `node_modules` you do not need, `.DS_Store` files, and symlinks (replace them with real files). Adobe's November 2024 known issue: sign the ZXP on the OS it is meant for (macOS ZXPs on macOS, Windows ZXPs on Windows).

## Installing a ZXP

Adobe's Unified Plugin Installer Agent (UPIA) ships with the Creative Cloud desktop app.

Windows:

```bat
"C:\Program Files\Common Files\Adobe\Adobe Desktop Common\RemoteComponents\UPI\UnifiedPluginInstallerAgent\UnifiedPluginInstallerAgent.exe" /install "C:\Users\<user>\Downloads\gridtool-1.0.0.zxp"
"...\UnifiedPluginInstallerAgent.exe" /list all
"...\UnifiedPluginInstallerAgent.exe" /remove com.example.gridtool
```

macOS: the agent lives under `/Library/Application Support/Adobe/Adobe Desktop Common/RemoteComponents/UPI/UnifiedPluginInstallerAgent/`. Run its binary with `/help` first to see the option syntax for your version.

Extension Manager CC and `ExManCmd` are end of life; use UPIA or the Adobe Marketplace instead.

## Distribution

- Adobe Marketplace (Adobe Exchange) through the Developer Distribution portal: [Developer Distribution guides](https://developer.adobe.com/developer-distribution/creative-cloud/docs/guides/)
- Direct download of the signed ZXP, with UPIA install steps in the docs (see publishing-docs.md)

## Common Problems

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Panel missing from Window > Extensions | Host range excludes this Illustrator version, or the folder is not in an extensions folder | Widen `Host Version`, check the folder path and `ExtensionBundleId` (in Photoshop, CEP panels are under Window > Extensions (Legacy)) |
| Panel is blank or will not load | Unsigned and `PlayerDebugMode` not set for this CSXS version | Set it under the right `CSXS.<n>` key, or sign the ZXP |
| `EvalScript error.` | Host `.jsx` syntax error (often ES5+ syntax) or an uncaught throw | Run `host.jsx` alone, keep it ES3, wrap entry points in `try` |
| Host returns `undefined` | Function name wrong, or `ScriptPath` not loaded | Check `ScriptPath`, call `$.evalFile` on load as a fallback |
| ZXP installs but panel is blank | Signature problem (symlinks, signed on the other OS) | Re-sign on the target OS without symlinks |
