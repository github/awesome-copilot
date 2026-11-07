# Logic Apps custom-code .NET 10 migration skill

## Install

With GitHub CLI 2.90.0 or later (`gh skill` is currently preview), inspect the skill
and install it for Copilot across projects:

```powershell
gh skill preview github/awesome-copilot logicapps-custom-code-net10-migration
gh skill install github/awesome-copilot logicapps-custom-code-net10-migration --agent github-copilot --scope user
```

For a project-scoped installation, use `--scope project` from the target repository.
Installation makes the skill available to the agent; it does not run a migration.

Alternatively, copy this **entire folder** into a supported skills directory. For a personal
installation, use `<user profile>\.copilot\skills\logicapps-custom-code-net10-migration`;
for a project installation, use `.github\skills\logicapps-custom-code-net10-migration`.
Cloning the source repository alone does not install the skill. No plugin or third-party
Python package is required. The package is licensed under MIT.

## Prerequisites

The [November 5 announcement](https://techcommunity.microsoft.com/blog/IntegrationsonAzureBlog/logic-apps-standard-custom-code-now-supports-net-10/4570808)
documents the release prerequisites and migration configuration:

- Azure Logic Apps (Standard) VS Code extension 5.1013.2, or a later version with .NET 10 custom-code support.
- Logic Apps Standard extension bundle 1.194.31.
- VS Code-selected .NET 10 SDK/runtime and the existing .NET 8 host runtime.
- Python 3.11+ for the offline configuration helper and its tests.

## Use

Invoke the installed skill with a request such as:

> Migrate this Logic Apps Standard .NET 8 custom-code workspace to .NET 10 using
> logicapps-custom-code-net10-migration. Preserve the host and function identities.

The helper can also be run directly with Python 3.11+:

```powershell
python ".\scripts\migrate.py" --root "C:\src\MySolution"
python ".\scripts\migrate.py" --root "C:\src\MySolution" --apply
```

Default is dry run. Exit `0` means a valid plan or successful configuration application,
not a passing build/runtime test; exit `1` means a blocker/failure. For multiple projects,
add `--project "C:\src\MySolution\CustomCode\Utilities.csproj"`.

Default migration preserves a missing direct Worker reference, existing logging pins
when no direct Worker is selected, and all debugger configuration. Existing Worker
references are aligned to the reviewed baseline with dependent logging pins adjusted.
Do not interpret the sample dependency set as a universal minimum.

The migration targets `Microsoft.Azure.Workflows.Webjobs.Sdk` **1.4.1** to incorporate
a bug fix for 1.4.0. Confirm that 1.4.1 is available from the approved
NuGet feed before applying the migration or restoring packages. Configuration tests
do not establish package restore, build or runtime compatibility.

Conditional options (include the same options in dry run and apply):

```powershell
python ".\scripts\migrate.py" --root "C:\src\MySolution" --integrated-debug
python ".\scripts\migrate.py" --root "C:\src\MySolution" --integrated-debug --apply
python ".\scripts\migrate.py" --root "C:\src\MySolution" --ensure-output-directory
python ".\scripts\migrate.py" --root "C:\src\MySolution" --ensure-output-directory --apply
```

Use `--integrated-debug` for coordinated workflow/custom-code launching, not merely
because the target framework changes. Use `--ensure-output-directory` only when the SDK
directory scan needs the clean-build workaround. A narrowly recognized existing
broken guard is repaired without the flag. Options can be combined when both apply.

The helper supports direct, unconditional SDK-style project configuration and UTF-8
JSON/JSONC settings (comments and trailing commas are preserved). It resolves the host
from `LogicAppFolderToPublish` and does not assume sample folder or assembly names.
With `--integrated-debug`, it appends an integrated debugger entry while keeping existing
entries, or updates an unambiguous existing integrated launcher. Project XML
whitespace/comments are retained, but XML serializer details such as self-closing tag
spacing can change.

It refuses ambiguous layouts, encrypted local settings, external host roots, conditional
or centrally managed package/property definitions, explicit imports, inherited
`Directory.Build.*`/`Directory.Packages.props`/`global.json`, and unreviewed newer Workflows
SDK targets. Agent-led review is required for these cases; see the bundled procedure.
Missing workspace/task files are reported as manual follow-up, not silently fabricated.

Custom publication hooks and unresolved hook expressions block adding publish-on-build.
Existing build/publication hooks are preserved, not authorized for execution: review
their network/deployment effects before any validation build, even in a disposable copy.

Apply keeps originals in memory for rollback and checks for concurrent changes. There
are no intentional persistent backups, network access, package installs, builds, host
execution or Azure operations. Inspect and back up configuration through your approved
process when required. Do not run concurrently with another editor/host modifying the same files.

**Interrupted-write warning:** temporary files use `.<original filename>.<random>` beside
the original. Forced termination can bypass cleanup and leave credentials in
`.local.settings.json.*`. Before applying, verify that source-control and deployment
exclusions cover these temporary names, not just `local.settings.json`. Inspect for
leftovers before committing or packaging, and remove only confirmed migration-owned
files through your approved secret-handling process without displaying their contents.

Existing access restrictions are copied before temporary files receive configuration
bytes: Windows security descriptors (including inheritance protection and integrity
labels), or Linux ownership, permissions and access-control extended attributes.
Application blocks when metadata cannot be preserved; other POSIX platforms and
encrypted Windows filesystem files require manual migration.

For later deployment, the Azure app settings must include both
`LOGIC_APPS_CUSTOMCODE_DOTNETVERSION=net10.0` and `FUNCTIONS_INPROC_NET8_ENABLED=1`.
The .NET 8 host flag is still required for .NET 10 custom code. The helper requires
that host flag before migration and preserves it.

Deployment through the Logic Apps extension in VS Code copies these settings to Azure.
If deploying through a pipeline, explicitly include both application settings in its
deployment configuration. A local settings file alone does not configure the Azure app.
Verify the deployed runtime separately. The helper reports these prerequisites and
performs no Azure changes.

The skill preserves library output and does not create `Program.cs`: a library `Main()`
does not run automatically. Source/API compatibility remains a build/runtime check.

Run the bundled standard-library tests:

```powershell
python -m unittest discover -s ".\tests" -v
```

The tests exercise synthetic project configurations and failure behavior, not real
workflow execution or production support. The package baseline comes from inspected
Workflows SDK 1.4.0 targets and Worker 2.51.0 package metadata. The updated 1.4.1 target
still requires restore/build/runtime verification. The announcement above
documents .NET 10 custom-code support; verify the selected local/deployed runtime separately.

## Provenance

Adapted from the MIT-licensed
[custom-code-net10 skill at commit 2ee2905](https://github.com/wsilveiranz/custom-code-net10/tree/2ee2905c84b2589972a354f0006a036420770ce0/skills/logicapps-custom-code-net10-migration).
The helper and initial 30 regression tests came from that revision. This contribution
adds review-driven target matching, publication side-effect and access-control safeguards
with additional regression tests.
