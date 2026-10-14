# Microsoft Store submission playbook

## Before Partner Center

1. Finish product behavior and package-specific integration.
2. Test the application on supported Windows versions and architectures.
3. Prepare:
   - Privacy policy
   - Support URL
   - Product website
   - License
   - Third-party notices
   - Corresponding-source information where required
   - Genuine screenshots
   - App icons
   - Certification instructions
4. Identify features that affect policy or review:
   - Full trust
   - Startup tasks
   - Background behavior
   - Local network access
   - Accounts
   - Personal information
   - Purchases
   - User-generated or externally displayed content
   - Mature content
   - Location
   - Generative AI

## Product creation

1. Check candidate names.
2. Reserve the final name.
3. Capture product identity values.
4. Rebuild the MSIX with those exact values.
5. Inspect the package.
6. Run WACK.

If a name uses another company's product or protocol trademark, stop and
review the trademark owner's naming guidance. Prefer compatibility language in
the description over using the trademark in the product name.

## Pricing and availability

Decide and verify:

- Free or paid.
- Markets.
- Public discoverability.
- Release timing.
- Automatic or manual publishing after certification.
- Organizational licensing if relevant.

Saving pricing or market changes affects commercial availability. Obtain user
approval for the exact settings before saving if the user has not already
specified them.

## Properties

Choose categories based on actual function. Supply:

- Privacy policy URL
- Website
- Support URL
- Personal-information declaration
- Hardware and feature declarations

Do not select accessibility certification, removable storage, OneDrive backup,
game recording, mixed reality, pen, purchases, or generative AI unless the app
really supports and has tested that claim.

## Age ratings

Answer based on the app's behavior, not the intended audience.

An app that displays live content from another paired device may need to say it
accesses online content even if it does not curate a content catalog. That does
not automatically mean the seller provides mature content, communication,
purchases, rewards, precise location sharing, or unrestricted web browsing.

Accepting IARC terms is a legal action. Obtain fresh user approval immediately
before acceptance.

## Packages

1. Upload the final unsigned Store MSIX.
2. Wait for validation.
3. Verify:
   - Filename
   - Package version
   - Architecture
   - Device family
   - Minimum OS
   - Validation state
4. Resolve every blocking error.
5. Explain every restricted-capability warning.

If Partner Center rejects the package display name, inspect
`Package/Properties/DisplayName`. It must match a reserved name exactly.

## Submission options

Set publishing timing and explain restricted capabilities.

A useful full-trust explanation names:

- The app's desktop technology.
- Native Windows APIs used.
- Helper process architecture.
- Startup and tray integration.
- Whether elevation, services, drivers, system-wide settings, and cloud
  services are used.

Use `templates/run-full-trust-rationale.md`.

## Store listing

Provide:

- Product description with concrete behavior.
- Connection or setup steps.
- Feature list.
- Short title.
- Developer name.
- Search keywords.
- Privacy behavior.
- Hardware and network requirements.
- Known limitations, including DRM or protected content.
- Trademark attribution and non-affiliation statements where appropriate.
- License and source information.
- Genuine screenshots with readable dimensions.

Do not invent awards, metrics, customer quotes, compatibility, accessibility,
or security claims.

## Additional Testing Information

Write instructions that a Microsoft tester can execute without guessing:

- Required Windows version and architecture.
- Required physical hardware.
- Same-network or firewall requirements.
- Exact connection flow.
- Pairing or PIN steps.
- Expected windows, tray icons, notifications, audio, and full-screen behavior.
- Startup behavior.
- Helper process behavior.
- Protected-content limitations.
- Whether credentials are required.
- How to find logs if testing fails.

Use `templates/certification-notes.md`.

## Final submission

1. Reload overview.
2. Verify every section is complete.
3. Verify the package is validated.
4. Verify WACK passed.
5. Handle updated agreements with separate approval.
6. Reload overview again.
7. Verify **Submit for certification** is enabled.
8. Tell the user automatic publishing consequences.
9. Obtain fresh approval.
10. Submit once.
11. Verify **In certification**.

## After submission

Monitor Partner Center and the public Store page. Certification may include:

- Pre-processing
- Package security checks
- Technical compliance
- Content compliance
- Restricted-capability review
- Publishing

When approved, verify the public URL anonymously. When rejected, preserve the
finding text and any report attachments before editing the next submission.
