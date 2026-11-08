# Required migration procedure

## Recognize and scope the project

The custom code is an SDK-style **library** with a Workflows SDK package and
`LogicAppFolderToPublish`. The destination contains `host.json` with the
`Microsoft.Azure.Functions.ExtensionBundle.Workflows` bundle and local
`APP_KIND=workflowapp` settings. These checks prevent ordinary .NET/Functions upgrades.
Do not assume that a folder named Functions contains a standalone Function app.

Inspect workspace roots, existing tasks and effective tool settings. Check inherited
`global.json`, `Directory.Build.*`, central package management and imported/conditional
properties before edits. Multiple projects or shared SDK/package files need explicit
selection and impact review. The helper intentionally stops rather than guessing.

The [November 5 announcement](https://techcommunity.microsoft.com/blog/IntegrationsonAzureBlog/logic-apps-standard-custom-code-now-supports-net-10/4570808)
documents .NET 10 custom-code support with VS Code extension 5.1013.2 and Logic Apps
Standard extension bundle 1.194.31. Verify these release prerequisites before migration.

Do not display local settings, payloads or credential-bearing diffs. The helper reports
filenames and change categories, never local setting values. Its temporary writes may
contain local settings; normal completion removes them after replacement rather than
keeping persistent backups. Forced termination can bypass cleanup and leave files named
`.<original filename>.<random>`, including credential-bearing `.local.settings.json.*`.
Before applying, verify source-control and deployment exclusions cover those names;
an exclusion matching only `local.settings.json` is insufficient. Inspect for leftovers
before committing or packaging and remove only confirmed migration-owned files through
the approved secret-handling process, without displaying their contents. Preserve
existing ignore rules; the helper does not add exclusions automatically.

Before any validation build, inspect custom targets, publication dependencies and
repository build tasks for network/deployment effects. The helper refuses to introduce
publish-on-build when custom publication hooks or unresolved hook expressions exist.
It preserves an existing publish-on-build hook but reports custom publication hooks;
preservation is not permission to run them. Review or disable external effects through
a separately authorized change before building, including in a disposable copy.

Replacement writes preserve Windows ownership, group, discretionary ACLs, integrity labels
and ACL inheritance protection, or Linux ownership, mode and access-control extended
attributes. Access restrictions are applied before configuration bytes enter the temporary
file. Unreadable/unwritable access metadata, encrypted Windows filesystem files and other
POSIX platforms block application rather than fall back to mode-only replacement.

## Required configuration alignment

| Configuration | Change |
|---|---|
| `TargetFramework` | `net8`/`net8.0` to `net10.0`; library identity/layout unchanged |
| Workflows SDK | Upgrade to `1.4.1`; review newer targets before adopting |
| Worker SDK | At least reviewed `2.0.7`; preserve already newer stable versions |
| `CopyLocalLockFileAssemblies` | `true` |
| Publish on build | Preserve existing hook; block insertion when custom publication hooks need side-effect review |
| Host `Values.LOGIC_APPS_CUSTOMCODE_DOTNETVERSION` | Exactly `net10.0` |
| Host `Values.FUNCTIONS_INPROC_NET8_ENABLED` | Keep `1`; still required for the host, and a helper prerequisite |
| Functions editor deploy path | Replace only a `net8`/`net8.0` path component |

Versions here are a selected migration baseline, not an independently established universal minimum.
Workflows SDK 1.4.1 replaces the buggy 1.4.0 release. Verify availability from the approved
NuGet feed before applying the migration or restoring. Restore/build/runtime validation
of 1.4.1 is still required.

## Conditional dependencies, build safeguards and debugging

If Worker is already directly referenced, the helper aligns it to reviewed `2.51.0`
while preserving newer stable versions. It does not add a missing Worker reference solely
because the framework changes. Add dependencies only when application/build evidence
requires them; source preservation does not establish compatibility.

Worker Core 2.51.0 depends on Microsoft.Extensions.Hosting 10.0.0. When a direct Worker
reference is selected, the helper raises existing direct Logging/Logging.Abstractions
pins below `10.0.0`, preserving newer versions. Without a direct Worker reference, it
preserves logging pins. Preserve dependencies rather than indiscriminately deleting them.
Other direct framework-family pins can also cause restore conflicts: inspect actual
restore diagnostics and align only affected dependencies. Do not blanket-upgrade packages
with independent versioning, such as Microsoft.Extensions.Azure.

Do not add ApplicationInsights.WorkerService, Http.AspNetCore or an ASP.NET Core framework
reference solely for this migration. Existing application requirements remain intact.

Add this guard **only if a clean build fails because the function-JSON scan directory
is missing**, using helper flag `--ensure-output-directory`. The failure was observed
with Workflows SDK 1.4.0; do not assume 1.4.1 requires the workaround.

```xml
<Target Name="EnsureOutputDirectory" BeforeTargets="DeleteFunctionJsonFoldersTarget">
  <MakeDir Directories="$(MSBuildProjectDirectory)\bin\$(Configuration)\$(TargetFramework)"
           Condition="!Exists('$(MSBuildProjectDirectory)\bin\$(Configuration)\$(TargetFramework)')" />
</Target>
```

`FindFunctionJsonFolders` is a task, not a target. The helper repairs the known ineffective
hook only when its contents match that narrow workaround; it refuses conflicting custom
targets. Repairing an existing guard preserves its intended safeguard; a missing guard
is not inserted by default. It leaves unrelated custom targets, including dead sample copy targets, alone
and reports misleading `net472` targets for review.

## Preserve host and workspace configuration

Do not alter existing `FUNCTIONS_WORKER_RUNTIME=dotnet`,
`FUNCTIONS_INPROC_NET8_ENABLED=1`, `APP_KIND=workflowapp`, or multi-language worker
settings. Do not add an in-process .NET 10 flag or set the Logic Apps host to
`dotnet-isolated`. Preserve host.json, connections, authentication, workflow definitions,
ignore rules, design-time settings and workspace/task names.

Do not add `Program.cs` or convert the library into a standalone worker host. A `Main()`
method is not automatically executed with `OutputType=Library`. Preserve existing
implementations/workflows unless separately authorized source changes are required by
actual diagnostics; do not promise they compile or execute unchanged before testing.

The helper preserves source project paths and machine-specific Node configuration.
If moving the solution, explicitly update `ProjectDirectoryPath` in runtime and
design-time settings and verify the Node executable. Relocation is not an implicit
side effect of a target-framework migration.

The helper leaves all debugger configuration unchanged by default. If coordinated
workflow/custom-code launching is requested/needed, use `--integrated-debug` in dry run
and apply. This adds a `logicapp` launch entry with both runtimes `coreclr` and
`isCodeless=true`, retaining old attach configurations. An existing integrated entry for
the default `coreclr` host is updated without overwriting unrelated properties; ambiguous
multiple candidates require manual selection. Select that entry for coordinated debugging.
The difference between the compared projects is not a universal .NET 10 requirement.

The Functions deployment path is not the Logic Apps publication path. Shared missing
predeploy tasks need separate review if deployment is requested; no deployment is authorized
by this skill. Preserve `-nodeReuse:false` and managed Node/.NET PATH conventions.

## Verification gates

1. Inspect the **resolved VS Code-selected** .NET and Core Tools executables. Verify SDK
   10, .NET 10 runtime, existing .NET 8 host runtime, and any already-required ASP.NET
   runtime. Review effective user/workspace/folder tool settings; do not inject literal
   environment-variable expressions into settings and assume universal expansion.
2. Restore using an explicit approved NuGet configuration/source. Respect organizational
   proxy policy; do not substitute nuget.org, install an SDK or accept new licensing
   terms without the applicable authorization. The helper never restores.
3. Run the smallest repository build/analyzer command using that executable. For example:

   ```powershell
   & $dotnet restore $project --configfile $approvedNuGetConfig
   if ($LASTEXITCODE -ne 0) { throw 'Restore failed.' }
   & $dotnet build $project --configuration Debug --no-restore -nodeReuse:false
   if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
   ```

   Resolve genuine package/API failures; do not suppress warnings, exclude functions or
   rewrite C# without separately authorized source changes.
4. Test a clean build in a safe disposable copy. SDK cleanup removes `lib\custom`; do
   not clean another active host's output. If the SDK scan directory is missing, review
   and apply `--ensure-output-directory`, then repeat the failed build. Do not use this
   flag to mask unrelated failures. Confirm `<host>\lib\custom\net10.0` contains
   the **original** project assembly/dependencies and generated per-function metadata
   is present under `<host>\lib\custom`. Inspect language/library references and function
   identities. `Functions\bin` and standalone `functions.metadata` alone are insufficient.
5. Confirm safe local trigger/connection effects before starting the host. Open the
   existing multi-root workspace, run the custom-code build task, launch the integrated
   debugger if chosen (otherwise preserve a working launch/attach route), and verify
   host readiness and function discovery. Execute an appropriate
   existing workflow through its supported trigger and inspect actual local-function
   results; use original identities and non-sensitive fixtures.
6. Stop only task-owned sessions/services after verification unless asked to retain them.
   Report configuration, build and execution evidence separately, including skipped checks.

## Later deployment prerequisite (report only)

For Azure execution, the deployed Logic Apps **application settings** must carry both
`LOGIC_APPS_CUSTOMCODE_DOTNETVERSION=net10.0` and `FUNCTIONS_INPROC_NET8_ENABLED=1`.
The .NET 8 host flag remains required even though the custom code targets .NET 10.

Deployment through the Logic Apps extension in VS Code copies these settings to Azure.
Pipeline deployments must explicitly include both application settings. A local settings
file alone does not configure the Azure app. Report these prerequisites even for
local-only migration, distinguishing them from completed local changes.

Verify that the intended deployed runtime supports .NET 10 custom code separately.
Do not change Azure resources or deployment/IaC settings as a side effect of this skill.
Any such mutation needs a separately scoped and authorized task with target/environment
verification. Generated assemblies and metadata establish neither cloud support nor a
successful local/deployed run.

The helper has no universal package/host support guarantee. Newer Workflows SDK behavior,
other layouts and deployed-host support need current authoritative validation. The
announcement above documents .NET 10 support; package versions remain a reviewed
baseline, and the intended runtime configuration and execution still require verification.
