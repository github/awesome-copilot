---
name: logicapps-custom-code-net10-migration
description: 'Migrate Azure Logic Apps Standard local-function custom-code projects from .NET 8 to .NET 10. Use for legacy Logic Apps custom-code workspace upgrades, project/package configuration, custom-worker settings, publication, and integrated VS Code debugging. Not for ordinary .NET applications, standalone Azure Functions, Consumption workflows, or cloud deployment.'
license: MIT
---

# Logic Apps custom code .NET 10 migration

Read [the migration procedure](references/migration.md) before editing. Resolve bundled
files relative to this skill, not the target repository. Python 3.11+ is required only
for the helper; do not install dependencies or start services merely by activating this skill.

## Procedure

1. Establish the solution root, custom-code `.csproj`, and Logic Apps `host.json` root.
   Infer existing names/layout; ask only about ambiguous project selection or effects.
   Read repository instructions and affected configuration, including dirty changes,
   inherited build/package/SDK settings, workspace and tool paths. Do not inspect C#
   contents unless separately authorized to diagnose a build failure.
2. Run the bundled helper in its default dry-run mode:

   ```powershell
   python "<skill root>\scripts\migrate.py" --root "<solution root>"
   ```

   Use `--project "<csproj path>"` to select among multiple custom-code projects.
   The helper resolves `LogicAppFolderToPublish`; it does not require `Functions`
   or `LogicApps` folder names. Read all reported blockers/warnings. It prints no
   settings values and writes nothing in dry-run mode.
   Default edits cover framework/SDK/publication/runtime alignment, not reference
   dependency parity. Preserve absent Worker packages and existing debugger configuration.
   Use `--integrated-debug` only when coordinated launching is requested/needed.
3. For a requested migration, apply the reviewed plan with the same coordinates and
   `--apply`. Do not apply for a comparison/plan-only request. The helper guards changed
   files and rolls back its own completed writes on failure; it is not an atomic
   multi-file transaction or a persistent backup. Preserve unrelated user edits.
4. If the helper refuses central/conditional/imported configuration, newer unreviewed
   SDK targets, or an unfamiliar debugger/layout, do not bypass the guard. Read the
   owning configuration, resolve scope with the user when shared projects are affected,
   and make targeted agent edits using repository tools. Never claim universal helper
   coverage. Repeat the dry run to check idempotency for supported layouts.
5. Validate with the repository's build/analyzers and approved package source. Use the
   exact SDK selected by VS Code, not just PATH. Verify assembly/dependency publication
   and generated local-function metadata. Review custom build/publication hooks and
   obtain separate authorization for any deployment/network effects before building;
   a disposable copy does not neutralize those hooks. Obtain permission for trigger/connector
   effects before host startup or workflow execution. Follow the installed Logic Apps
   runtime skill/procedure when available; otherwise perform ownership-aware VS Code
   launch and verify actual execution, not just debugger attachment.
   If the SDK's directory scan fails on a clean build, rerun the helper dry run/apply
   with `--ensure-output-directory`, then repeat the failed build. Do not introduce
   the guard as a universal framework requirement. Resolve genuine missing-dependency
   errors individually; do not add Worker/HTTP/telemetry packages just to match a sample.
6. Report changed configuration, dry-run/apply/tests, and separate states:
   configuration migrated, build verified, local-function execution verified.
   State blockers plainly. Always report the later deployment prerequisite:
   Azure app settings must carry `LOGIC_APPS_CUSTOMCODE_DOTNETVERSION=net10.0` and
   `FUNCTIONS_INPROC_NET8_ENABLED=1`. Deployment through the Logic Apps extension
   in VS Code copies these settings; pipelines must explicitly include them.
   A local settings file alone does not configure Azure. Do not deploy, change
   Azure app settings, or assert cloud/production support.

## Invariants

- Only upgrade the custom-code library; preserve host .NET 8 configuration.
- Preserve names, workflows, connections, authentication, storage, unrelated dependencies,
  workspace/task conventions, comments and secret exclusions.
- Do not add sample-only HTTP, telemetry or framework references.
- Do not introduce `Program.cs` or an executable worker host. Library `Main()` is
  not automatically executed; source preservation is intent, not verified API compatibility.
- No C# rewrites, SDK installation, restore, host start, Azure mutation or persistent
  secret backups inside the configuration helper.
- Do not silently downgrade packages, rewrite shared package management, suppress
  restore/build errors, copy .NET 10 DLLs to `net472`, or manufacture passing checks.

Installation and test commands are in [README.md](README.md).
Bundled resources include the [migration helper](scripts/migrate.py),
[regression tests](tests/test_migrate.py), and [MIT license](LICENSE).
