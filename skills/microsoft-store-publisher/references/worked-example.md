# Worked example: full-trust desktop receiver

This example records decisions and failures from a successful Microsoft Store
submission. It is prior art, not a template to copy without checking the new
application.

## Product and package

- Product: Mirror Me Phone Display
- Store product ID, package identity name, publisher ID, publisher display
  name, and package family name: copied exactly from Partner Center
  **Product identity**. They are specific to one developer account, so they
  are not repeated here. The publisher ID has the form `CN=<GUID>`, and the
  package family name is the identity name, an underscore, and a
  13-character publisher hash.
- Application version: `0.2.4`
- MSIX version: `1.2.4.0`
- Architecture: x64
- Minimum Windows version: `10.0.22000.0`

The application version was below 1.0, but MSIX does not allow a zero first
component. The build mapped `0.2.4` to `1.2.4.0`. The fourth component remained
zero for Store use.

## Package model

The application was a Wails and Win32 desktop app with:

- `packagedClassicApp`
- `mediumIL`
- `runFullTrust`
- A packaged `windows.startupTask`
- A same-executable `--receiver-worker` mode
- Native DNS-SD, Media Foundation, GDI, and WASAPI integration
- No elevation
- No service
- No driver
- No system-wide settings
- No cloud backend

The Store MSIX was intentionally unsigned. Microsoft signs Store packages
after certification.

## First package rejection

The initial upload used the correct application visual name but retained:

```xml
<Properties>
  <DisplayName>MirrorMe</DisplayName>
</Properties>
```

`MirrorMe` was not a reserved Store name. Partner Center rejected the package.

The fix was to parameterize every display-name surface and rebuild with:

```xml
<Properties>
  <DisplayName>Mirror Me Phone Display</DisplayName>
</Properties>
```

The application visual display name and StartupTask display name were changed
to the same reserved name.

Lesson: validate `Package/Properties/DisplayName`, not only
`uap:VisualElements/@DisplayName`.

## Name and trademark decision

Names containing `AirPlay` were considered, but Apple naming guidance made a
protocol trademark in the product name undesirable without permission.

The reserved name avoided the trademark. Compatibility language appeared in
the listing instead:

> Compatible with screen mirroring from AirPlay-enabled devices.

The listing also stated:

> AirPlay is a trademark of Apple Inc. This app is not affiliated with or
> endorsed by Apple.

Lesson: use protocol compatibility language in the description when the
trademark should not appear in the product name.

## Partner Center configuration

Pricing and availability:

- Free
- All current and future markets
- Public and discoverable
- Publish automatically after certification

Properties:

- Primary category: Utilities + tools
- Secondary category: Photo + video
- Personal information use: Yes
- Privacy, website, and support URLs supplied
- Unsupported capability and accessibility claims left disabled

Age rating:

- App type: All Other App Types
- Online content: Yes, because the app displays live content from a paired
  phone
- Seller-curated mature content: No
- User communication: No
- Purchases and rewards: No
- Precise location sharing: No
- Browser behavior: No
- Result: all-ages ratings, including ESRB Everyone and Microsoft 3+

Lesson: displaying external live content can count as online content without
making the app a browser, communications service, or mature-content catalog.

## Full-trust explanation

The explanation covered:

- The Wails and native Win32 desktop architecture
- The same-executable receiver worker
- DNS-SD discovery
- Media Foundation, GDI, and WASAPI
- Packaged startup-task behavior
- Tray and lifecycle integration
- No elevation, driver, service, system-wide setting, or cloud backend

Lesson: name the concrete native behavior and explicitly rule out higher-risk
system integration that the app does not use.

## Store listing

The listing included:

- Concrete connection steps
- Same-network requirement
- Pairing PIN behavior
- Local privacy behavior
- Firewall and multicast requirements
- Protected and DRM content limitations
- Apple trademark attribution
- GPL v3-or-later and corresponding-source information
- Genuine light and dark application screenshots

Two screenshots were resized to a Store-recommended width before upload.

## Screenshot upload quirk

Partner Center created a new hidden file input after every screenshot upload.
Uploading both screenshots through input index `0` targeted or replaced the
first screenshot. The second screenshot had to use the next input index.

Lesson: recount `input[type="file"]` after every upload and use the newly
created input for the next image.

## Certification instructions

The testing notes explained:

- Same-network setup
- iPhone Control Center and Screen Mirroring connection flow
- PIN pairing
- Full-screen and tray behavior
- Packaged StartupTask behavior
- Same-executable worker architecture
- Firewall and multicast requirements
- Protected-content limitations
- Trademark and non-affiliation language

No credentials were required.

## WACK

The WACK command returned exit code zero, but the requested XML report was not
found. The real report was generated as:

```text
%LOCALAPPDATA%\Microsoft\AppCertKit\MirrorMe-WACK-report.htm
```

The HTML report said:

```text
Overall result: PASSED
```

Required and optional tests passed.

Lesson: locate and parse the generated report. Do not trust the process exit
code by itself.

A later submission of another full-trust desktop app used WACK
10.0.26100.8249:

- A report path ending in `.htm` failed with exit code -1 and
  `The report output file path should point to a XML file.`
- A path ending in `.xml` worked. WACK wrote the XML report to that path and an
  HTML rendering to `%LOCALAPPDATA%\Microsoft\AppCertKit\<same base name>.htm`,
  both before it exited.
- The XML root element, `REPORT`, carries `OVERALL_RESULT`, `VERSION` (the kit
  version), `APP_NAME` (the package identity name, not the display name),
  `APP_VERSION`, `PARTIAL_RUN`, and `ReportGenerationTime`. The HTML report
  shows the same report time, which ties the two files together.
- `OVERALL_RESULT` is `PASS`, `FAIL`, or `WARNING`. The HTML report shows these
  as `PASSED`, `FAILED`, and `PASSED WITH WARNINGS`. The original
  `invoke-wack.ps1` read only the first word after `Overall result:`, so it
  would have reported `PASSED WITH WARNINGS` as `PASSED`.
- The optional `Blocked executables` test failed while the overall result was
  still `PASS`. WACK flagged a reference to the process-launch API
  `kernel32.dll!CreateProcessW` and references to blocked executables such as
  `Cmd`, `powershell`, and `REG` in the main executable, and `bash` and `reg`
  in a bundled helper executable. The report says optional tests "are
  informational only and will not be used to evaluate your app during
  Microsoft Store onboarding."
- `%LOCALAPPDATA%\Microsoft\AppCertKit` also held about 30 unrelated XML files,
  such as logs and a task schedule. Only a file whose root element is `REPORT`
  is a WACK report.

Lesson: treat the XML report as the source of truth, match its identity name
and version to the package, and fall back to the HTML report only when no XML
report exists.

## Agreement and final submission

Partner Center required:

- App Developer Agreement - Windows Store
- Version 8.11

The exact agreement was presented to the user as a binding legal agreement.
After explicit approval, the Windows agreement row was accepted and verified
by its acceptance date.

After a reload, every section returned to `Complete`, the package returned to
`Validated`, and **Submit for certification** became enabled.

The user was told that approval would publish the product automatically. After
fresh explicit approval, the button was pressed once. Partner Center changed
to:

```text
In certification
Submission
Pre-processing
Certification
Publishing
```

An optional feedback survey appeared after submission and was left untouched.

## Remaining risks at submission time

- Broad physical-device and network testing was incomplete.
- A rare quit hang had not been conclusively eliminated.
- Legal review of protocol interoperability, trademarks, codec patents, and
  GPL distribution remained prudent.
- `runFullTrust` still required Microsoft's certification approval.

Lesson: passing package validation and WACK does not erase product,
interoperability, legal, or restricted-capability risk.
