# MSIX checklist

## Identity

- Reserve the product name before the final Store build.
- Copy the package identity name and publisher ID from Partner Center.
- Use the exact publisher string, including the complete `CN=...` value.
- Set `Package/Properties/DisplayName` to an exact reserved product name.
- Keep the application visual display name and startup-task display name
  consistent with the reserved product name.
- Do not reuse a development identity for Store upload.

## Version

- Use four numeric components.
- The first component must be nonzero.
- Each component must fit the MSIX version range.
- The fourth component must be `0` before Store upload.
- Every replacement package must have a version greater than the version
  already associated with the product.
- Keep the application-visible version and package version mapping documented.

## Packaging

- Target only device families the app supports.
- Declare the correct processor architecture.
- Set a realistic minimum Windows version.
- Use `packagedClassicApp` and `mediumIL` for packaged classic Win32 apps when
  appropriate.
- Declare only capabilities the app actually needs.
- Include valid Store and application icons at every declared path.
- Include privacy information, license terms, third-party notices, and
  corresponding-source information when applicable.
- Package production binaries, not debug builds.
- Do not include private symbols, credentials, test data, caches, logs, or
  development configuration.

## Full-trust desktop apps

- Declare `rescap:Capability Name="runFullTrust"` only when necessary.
- Explain the exact Win32 functionality that requires full trust.
- Document helper executables and command-line modes.
- Avoid elevation unless essential.
- Avoid services, drivers, and system-wide changes when user-level behavior is
  sufficient.
- For startup behavior, prefer a packaged `windows.startupTask` and the Windows
  StartupTask API over registry startup entries.
- Test the startup task under real package identity.

## Signing

- Leave a Microsoft Store submission package unsigned.
- Microsoft signs the package after certification.
- Sign packages distributed outside the Store.
- For external signing, the certificate subject must exactly match the
  manifest publisher.
- Inspect the final package signing state before upload.

## Verification

- Unpack the final MSIX with `makeappx.exe`.
- Parse the unpacked `AppxManifest.xml`.
- Verify identity, publisher, version, architecture, display name, target
  device family, executable, trust level, capabilities, and extensions.
- Compare the unpacked executable SHA-256 to the package input.
- Record the MSIX SHA-256.
- Install and launch under package identity.
- Exercise startup, tray, helper process, networking, update, and uninstall
  behavior.
- Run WACK and read the generated report.

## Common rejection causes

- `Package/Properties/DisplayName` does not match a reserved name.
- Package uses a development identity.
- Version is not greater than an existing package version.
- Store package is signed with the wrong publisher certificate.
- Restricted capability is unexplained.
- Listing promises behavior the package does not provide.
- Certification instructions omit required hardware, network, or pairing
  steps.
- Privacy declaration conflicts with actual data handling.
- Screenshots are mockups rather than genuine app screens.
