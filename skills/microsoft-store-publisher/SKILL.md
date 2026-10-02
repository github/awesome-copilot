---
name: "microsoft-store-publisher"
description: "Prepare, validate, submit, and monitor Windows desktop apps in Microsoft Partner Center. Use for MSIX packaging, Store identity, listings, WACK, Partner Center automation, certification, and publishing."
---

# Microsoft Store Publisher

Use this skill when the user wants to publish a Windows application to the
Microsoft Store, create or validate an MSIX, complete a Partner Center
submission, respond to certification findings, or monitor publishing status.

This skill is for Windows desktop applications, including packaged classic
Win32 apps that use `runFullTrust`. It is based on a successful end-to-end
submission using Partner Center, an unsigned Store MSIX, the Windows App
Certification Kit, and browser automation against Partner Center's current web
components.

## Required safeguards

Treat Partner Center as a production publishing system.

1. Never accept the Microsoft Application Developer Agreement or another
   binding agreement without fresh, action-specific user confirmation.
2. Never press **Submit for certification** without fresh, action-specific user
   confirmation after every section is complete and the final package is
   validated.
3. Never cancel certification, delete a submission, change pricing, change
   market availability, publish manually, or send Partner Center feedback
   without confirmation for that exact action.
4. Never enter, retrieve, print, save, or expose passwords, passkeys, tokens,
   recovery codes, MFA codes, or payment information. Let the user complete
   credential and operating-system authentication prompts.
5. Do not use the user's everyday browser profile for automation. Use a
   dedicated persistent profile and let the user authenticate interactively.
6. Do not infer legal, trademark, patent, privacy, export-control, or
   open-source compliance. Identify the concern and state when professional
   review is prudent.
7. Do not claim WACK passed from an exit code alone. Find and read the generated
   report and verify its overall result.
8. Do not upload a package until its identity, publisher, display name,
   architecture, version, and signing state have been inspected.

## Files in this skill

- `references/submission-playbook.md` - complete submission sequence.
- `references/msix-checklist.md` - package and manifest requirements.
- `references/partner-center-dom.md` - known routes, text, roles, custom
  elements, selectors, and automation quirks.
- `references/worked-example.md` - concrete lessons from a successful
  full-trust desktop app submission.
- `scripts/partner-center-control.mjs` - Playwright controller for a dedicated
  Edge profile.
- `scripts/inspect-msix.ps1` - unpack and inspect an MSIX before upload.
- `scripts/invoke-wack.ps1` - run WACK, then find, verify, and save its XML and
  HTML reports.
- `templates/run-full-trust-rationale.md` - restricted-capability explanation.
- `templates/certification-notes.md` - tester instructions.
- `templates/store-listing.md` - listing content worksheet.
- `templates/submission-record.json` - durable identity, package, validation,
  and certification handoff record.

Read the relevant reference before performing that phase. Do not rely on
remembered Partner Center labels because Microsoft changes the UI.

## End-to-end workflow

### 1. Establish scope and readiness

Collect or determine:

- Application name and reserved Store product name.
- Repository and build command.
- Application version and intended MSIX version.
- Supported architectures and minimum Windows version.
- Whether the app is WinUI, UWP, packaged Win32, Electron, Wails, Tauri, .NET,
  or another desktop technology.
- Native executables, helper processes, services, drivers, startup tasks,
  protocol handlers, file associations, codecs, and restricted capabilities.
- Privacy policy, support URL, website, licensing, notices, and corresponding
  source obligations.
- Real device and network requirements for certification.
- The Microsoft account the user wants selected during sign-in.

Inspect the repository before proposing package changes. Search for existing
manifest templates, package scripts, signing scripts, app icons, version
sources, privacy documents, third-party notices, and startup behavior.

### 2. Reserve the product and capture identity

In Partner Center, reserve an available product name. Avoid trademarked terms
in the product name unless the user has a documented right to use them.

After reservation, capture the exact values under:

**Product management > Product identity**

- Store product ID
- Package identity name
- Publisher ID, usually a `CN=...` value
- Publisher display name
- Package family name
- Reserved product display name
- Public Store URL

Never guess these values. The MSIX must use the Partner Center values exactly.

### 3. Build the Store package

Follow `references/msix-checklist.md`.

Important defaults:

- A Microsoft Store submission MSIX should be unsigned. Microsoft signs it
  after certification.
- A package distributed outside the Store must be signed with a certificate
  whose subject exactly matches the manifest publisher.
- The fourth version component must be `0` before Store submission because it
  is reserved for Microsoft.
- The first version component must be nonzero.
- `Package/Properties/DisplayName` must exactly match a reserved product name.
  Matching only the application's visual display name is not sufficient.

Prefer a repeatable build script that:

1. Validates input versions and identity values.
2. Builds or receives the production executable.
3. Stages the manifest, executable, assets, licenses, privacy information,
   notices, and source links.
4. Packs with `makeappx.exe`.
5. Unpacks the generated MSIX into a verification directory.
6. Verifies the unpacked executable hash.
7. Emits a JSON receipt with identity values and SHA-256 hashes.

### 4. Inspect and test the MSIX

Run:

```powershell
.\scripts\inspect-msix.ps1 `
  -PackagePath '<path-to-package.msix>' `
  -ExpectedIdentityName '<Partner Center identity name>' `
  -ExpectedPublisher '<Partner Center publisher ID>' `
  -ExpectedDisplayName '<reserved product name>'
```

The script belongs to this skill directory, not necessarily the application
repository. Resolve its full path before invoking it.

Install and exercise the packaged app under real package identity when
possible. Test:

- First launch and upgrade.
- Startup tasks and persisted settings.
- Helper process launch.
- Tray behavior and clean exit.
- Network discovery and firewall behavior.
- File and registry access under package identity.
- Uninstall and data retention behavior.
- Restricted capability behavior.

### 5. Run WACK

Run:

```powershell
# Run this command from an elevated PowerShell terminal.
.\scripts\invoke-wack.ps1 `
  -PackagePath '<path-to-package.msix>' `
  -ReportPath '<artifact-directory>\WACK-report.xml'
```

The WACK command-line runner requires elevation. The model must not approve the
operating-system authentication prompt for the user.

WACK accepts a report path only when it ends in `.xml`. Any other extension
fails with exit code -1 and `The report output file path should point to a XML
file.` Current kits write the XML report to the requested path and an HTML
rendering of it to `%LOCALAPPDATA%\Microsoft\AppCertKit\<same base name>.htm`.
One earlier run left only an HTML report in that folder and no XML report.

The script:

- Always passes WACK an `.xml` path. A `-ReportPath` ending in `.htm` or
  `.html` names the saved HTML report, and the XML report is saved beside it
  with the same base name.
- Uses the XML report from this run at the requested path, or else the newest
  WACK report in `%LOCALAPPDATA%\Microsoft\AppCertKit`. It skips files from
  earlier runs and the unrelated XML files WACK keeps in that folder, and keeps
  waiting while the report is still an unfinished interim report.
- Pairs the HTML report with the XML report by report time, then saves both
  beside `-ReportPath`.
- Reports the XML `OVERALL_RESULT` the way the HTML report shows it: `PASS` is
  `PASSED`, `FAIL` is `FAILED`, `WARNING` is `PASSED WITH WARNINGS`, and an
  interim report is `INCOMPLETE`. The HTML result is used only when there is
  no XML report.
- Fails when the result is not `PASSED`, not every test ran, the XML and HTML
  reports disagree, `appcert.exe` exited with an error, or the report's
  package identity name or version does not match the package. For a bundle,
  it warns instead, so check the name and version by hand.
- Lists every test that did not pass in `nonPassingTests`, with WACK's
  messages for it. An HTML-only result leaves this list empty.

When it finds a report, the script prints a JSON summary, then throws if
`passed` is `false`. Do not continue to submission unless `passed` is `true`.
`PASSED WITH WARNINGS` is not `PASSED`: fix the tests it names and rerun WACK.
Read every entry in `warnings`. Optional test failures do not block Store
onboarding, but investigate them.

Record the result in the submission record: `overallResult` as `wack.result`,
`xmlReport` as `wack.reportPath`, `kitVersion` as `wack.kitVersion`, and
`reportTime` as `wack.testedAt`. When `resultSource` is `html`, use
`htmlReport` as the report path and copy the kit version and report time from
the HTML report's header.

To parse and verify an existing report without running WACK again:

```powershell
.\scripts\invoke-wack.ps1 `
  -PackagePath '<path-to-package.msix>' `
  -ReportPath '<artifact-directory>\verified-WACK-report.xml' `
  -ExistingReportPath '<existing-WACK-report.xml>'
```

Pass an `.htm` report only when no XML report exists. Given an XML report, the
script looks for the HTML report with the same base name, beside it or in
`%LOCALAPPDATA%\Microsoft\AppCertKit`, and uses it when the report times
match. Given an HTML report, it uses the XML report beside it when the two
match.

### 6. Automate Partner Center carefully

Prefer app-native browser or computer-use tools when they can inspect and act
on the page reliably. Use `scripts/partner-center-control.mjs` as a fallback
when Partner Center web components or file uploads are unreliable.

Setup:

```powershell
Set-Location '<skill-directory>\scripts'
npm install
$env:PARTNER_CENTER_PROFILE = '<dedicated-profile-directory>'
node .\partner-center-control.mjs launch
```

Run `launch` as an attached background process. The user completes Microsoft
authentication in the dedicated Edge window. In a separate command process,
use read-only commands such as:

```powershell
node .\partner-center-control.mjs status
node .\partner-center-control.mjs pages
node .\partner-center-control.mjs text
node .\partner-center-control.mjs anchors
node .\partner-center-control.mjs overview-state
node .\partner-center-control.mjs agreement-state
node .\partner-center-control.mjs button-state "Submit for certification"
```

State-changing controller commands require:

```powershell
$env:PARTNER_CENTER_ALLOW_WRITE = '1'
```

Set it only after the user has authorized the exact action. Remove it after the
action so later commands fail closed.

Read `references/partner-center-dom.md` before using selectors.

### 7. Complete every submission section

Read `references/submission-playbook.md`. Typical sections are:

- Pricing and availability
- Properties
- Age ratings
- Packages
- Store listings
- Submission options
- Additional Testing Information

After saving each section, reload it and verify persistence. Partner Center can
temporarily omit completion states while its APIs are still loading. Wait and
reload before deciding a section is incomplete.

Do not make unsupported marketing or accessibility claims. Use genuine app
screenshots. Describe network, hardware, account, and protected-content
limitations plainly.

For `runFullTrust`, explain the exact native functionality, helper processes,
Windows APIs, startup integration, and why a sandboxed app model is
insufficient. State whether the app uses elevation, services, drivers,
system-wide settings, or a cloud backend.

### 8. Final readiness review

Before asking for submission approval, verify:

- Every Partner Center section says **Complete**.
- The package says **Validated**.
- `invoke-wack.ps1` reported `passed: true` for the final package: the WACK
  overall result is **PASSED**, and the report's identity name and version
  match the package.
- Package identity and display name match Partner Center.
- Package is unsigned for Store submission.
- Privacy, support, website, license, and notices are reachable.
- Certification notes are saved and include reproducible test instructions.
- Restricted capabilities have explanations.
- Publishing timing is what the user intends.
- No known blocker is being hidden.

### 9. Agreement acceptance

If Partner Center displays an updated agreement:

1. Open the agreements page and identify the exact agreement name and version.
2. Tell the user it is a binding legal agreement governing the developer
   account and Store submissions.
3. Ask for explicit approval to accept that exact version.
4. Reinspect the page after approval.
5. Accept only the intended row once.
6. Verify the status changed from `Not Accepted` to an acceptance date.

Do not reuse approval from another agreement or earlier action.

### 10. Submit for certification

When the button is enabled:

1. State that submission sends the product to Microsoft certification and
   whether it will publish automatically if approved.
2. Ask for explicit approval to press **Submit for certification**.
3. Reinspect the button after approval.
4. Click it once.
5. Do not submit the optional feedback survey without separate approval.
6. Verify the overview says **In certification** and shows the certification
   pipeline.

### 11. Monitor and respond

Certification commonly completes within a few hours but can take several
business days. Monitor:

- Submission
- Pre-processing
- Certification
- Publishing

If certification fails, quote the finding exactly, map it to the package,
listing, policy, or test behavior, make the smallest complete correction,
rebuild with a higher package version when required, rerun inspection and
WACK, and obtain fresh submission approval.

If the product is approved, verify the public Store URL from an unauthenticated
context. Do not claim it is live solely because Partner Center says
publishing completed.

## Output standard

Report concrete state:

- Product ID and reserved name.
- Package path, package version, architecture, signing state, and SHA-256.
- WACK result and report path.
- Completed Partner Center sections.
- Agreement name and acceptance state.
- Certification pipeline stage.
- Exact blockers and next action.

Never report a mutation as complete unless the resulting state was read back
from Partner Center or the generated artifact was inspected.

For long-running submissions, copy `templates/submission-record.json` into a
session artifact directory and update it after each meaningful state change.
Do not commit account identifiers, private URLs, credentials, or browser
profile data into the application repository.
