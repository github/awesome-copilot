# .NET Upgrade Prompts

## Purpose
Prompts for analyzing, planning, executing, and validating framework upgrades for multi-project .NET solutions — including .NET Core, .NET Framework, and .NET Standard migrations.

## Prompts

### Project Discovery & Assessment
- Identify all projects in the solution and classify them by type (`.NET Framework`, `.NET Core`, `.NET Standard`).
- Analyze each `.csproj` for its current `TargetFramework` and SDK usage.
- Review external and internal dependencies for framework compatibility.
- Determine the upgrade complexity based on dependency graph depth.
- Identify legacy `packages.config` projects needing migration to `PackageReference`.

### Upgrade Strategy & Sequencing
- Recommend a project upgrade order from least to most dependent components.
- Suggest how to isolate class library upgrades before API or Azure Function migrations.
- Propose an incremental upgrade strategy with rollback checkpoints.
- Evaluate the use of **Upgrade Assistant** or **manual upgrades** based on project structure.
- Generate an upgrade checklist for tracking build, test, and deployment readiness.

### Framework Targeting & Code Adjustments
- Suggest the correct `TargetFramework` for each project (e.g., `net8.0`).
- Review and update deprecated SDK or build configurations.
- Identify code patterns needing modernization (e.g., `WebHostBuilder` → `HostBuilder`).
- Suggest replacements for deprecated .NET APIs and third-party libraries.
- Recommend conversion of synchronous calls to async where appropriate.

### NuGet & Dependency Management
- Analyze outdated or incompatible NuGet packages and suggest compatible versions.
- Identify third-party libraries that lack .NET 8 support and provide migration paths.
- Recommend strategies for handling shared dependency upgrades across projects.
- Evaluate usage of legacy packages and suggest alternatives in Microsoft-supported namespaces.
- Review transitive dependencies and potential version conflicts after upgrade.

### CI/CD & Build Pipeline Updates
- Analyze YAML build definitions for SDK version pinning and recommend updates.
- Suggest modifications for `UseDotNet@2` and `NuGetToolInstaller` tasks.
- Generate updated build pipeline snippets for .NET 8 migration.
- Recommend validation builds on feature branches before merging to main.
- Identify opportunities to automate test and build verification in CI pipelines.

### Testing & Validation
- Propose validation checks to ensure the upgraded solution builds and runs successfully.
- Recommend automated test execution for unit and integration suites post-upgrade.
- Generate prompts to verify logging, telemetry, and service connectivity.
- Suggest strategies for verifying backward compatibility and runtime behavior.
- Recommend UAT deployment verification steps before production rollout.

### Breaking Change Analysis
- Identify deprecated APIs or removed namespaces between target versions.
- Suggest automated scanning using `.NET Upgrade Assistant` and API Analyzer.
- Recommend replacement APIs or libraries for known breaking areas.
- Review configuration changes such as `Startup.cs` → `Program.cs` refactoring.
- Suggest regression testing prompts focused on upgraded API endpoints or services.

### Version Control & Commit Strategy
- Recommend branching strategy for safe upgrade with rollback capability.
- Generate commit templates for partial and complete project upgrades.
- Suggest best practices for creating structured PRs (`Upgrade to .NET [Version]`).
- Identify tagging strategies for PRs involving breaking changes.
- Recommend peer review focus areas (build, test, and dependency validation).

### Documentation & Communication
- Suggest how to document each project’s framework change in the PR.
- Propose automated release note generation summarizing upgrades and test results.
- Recommend communicating version upgrades and migration timelines to consumers.
- Generate documentation prompts for dependency updates and validation results.
- Suggest maintaining an upgrade summary dashboard or markdown checklist.

### Tools & Automation
- Recommend when and how to use:
  - `.NET Upgrade Assistant`
  - `dotnet list package --outdated`
  - `dotnet migrate`
  - `graph.json` dependency visualization
- Generate scripts or prompts for analyzing dependency graphs before upgrading.
- Propose AI-assisted prompts for Copilot to identify upgrade issues automatically.
- Suggest how to validate automation output across multiple repositories.

### Final Validation & Delivery
- Generate prompts to confirm the final upgraded solution passes all validation checks.
- Suggest production deployment verification steps post-upgrade.
- Recommend generating final test results and build artifacts.
- Create a checklist summarizing completion across projects (builds/tests/deployment).
- Generate a release note summarizing framework changes and CI/CD updates.
