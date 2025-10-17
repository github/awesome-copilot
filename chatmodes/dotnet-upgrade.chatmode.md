---
description: 'Perform janitorial tasks on C#/.NET code including cleanup, modernization, and tech debt remediation.'
tools: ['codebase', 'edit/editFiles', 'search', 'runCommands', 'runTasks', 'runTests', 'problems', 'changes', 'usages', 'findTestFiles', 'testFailure', 'terminalLastCommand', 'terminalSelection', 'fetch', 'microsoft.docs.mcp']
---

# .NET Upgrade Collection

.NET Framework upgrade specialist for comprehensive project migration

**Tags:** dotnet, upgrade, migration, framework, modernization

## Collection Usage

### .NET Upgrade Chat Mode

Discover and plan your .NET upgrade journey!

```markdown, upgrade-analysis.prompt.md
---
mode: dotnet-upgrade
title: Analyze current .NET framework versions and create upgrade plan
---
Analyze the repository and list each project's current TargetFramework 
along with the latest available LTS version from Microsoft's release schedule.
Create an upgrade strategy prioritizing least-dependent projects first.
```

The upgrade chat mode automatically adapts to your repository's current .NET version and provides context-aware upgrade guidance to the next stable version.

It will help you:
- Auto-detect current .NET versions across all projects
- Generate optimal upgrade sequences
- Identify breaking changes and modernization opportunities
- Create per-project upgrade flows

---

### .NET Upgrade Instructions

Execute comprehensive .NET framework upgrades with structured guidance!

The instructions provide:
- Sequential upgrade strategies
- Dependency analysis and sequencing
- Framework targeting and code adjustments
- NuGet and dependency management
- CI/CD pipeline updates
- Testing and validation procedures

Use these instructions when implementing upgrade plans to ensure proper execution and validation.

---

### .NET Upgrade Prompts

Quick access to specialized upgrade analysis prompts!

The prompts collection includes ready-to-use queries for:
- Project discovery and assessment
- Upgrade strategy and sequencing
- Framework targeting and code adjustments
- Breaking change analysis
- CI/CD pipeline updates
- Final validation and delivery

Use these prompts for targeted analysis of specific upgrade aspects.

---

## Quick Start
1. Run a discovery pass to enumerate all `*.sln` and `*.csproj` files in the repository.
2. Detect the current .NET version(s) used across projects.
3. Identify the latest available stable .NET version (LTS preferred) — usually `+2` years ahead of the existing version.
4. Generate an upgrade plan to move from current → next stable version (e.g., `net6.0 → net8.0`, or `net7.0 → net9.0`).
5. Upgrade one project at a time, validate builds, update tests, and modify CI/CD accordingly.

---

## Auto-Detect Current .NET Version
To automatically detect the current framework versions across the solution:

```bash
# 1. Check global SDKs installed
dotnet --list-sdks

# 2. Detect project-level TargetFrameworks
find . -name "*.csproj" -exec grep -H "<TargetFramework" {} \;

# 3. Optional: summarize unique framework versions
grep -r "<TargetFramework" **/*.csproj | sed 's/.*<TargetFramework>//;s/<\/TargetFramework>//' | sort | uniq

# 4. Verify runtime environment
dotnet --info | grep "Version"
```

**Chat Prompt:**
> "Analyze the repository and list each project’s current TargetFramework along with the latest available LTS version from Microsoft’s release schedule."

---

## Discovery & Analysis Commands
```bash
# List all projects
dotnet sln list

# Check current target frameworks for each project
grep -H "TargetFramework" **/*.csproj

# Check outdated packages
dotnet list <ProjectName>.csproj package --outdated

# Generate dependency graph
dotnet msbuild <ProjectName>.csproj /t:GenerateRestoreGraphFile /p:RestoreGraphOutputPath=graph.json
```

**Chat Prompt:**
> "Analyze the solution and summarize each project’s current TargetFramework and suggest the appropriate next LTS upgrade version."

---

## Classification Rules
- `TargetFramework` starts with `netcoreapp`, `net5.0+`, `net6.0+`, etc. → **Modern .NET**
- `netstandard*` → **.NET Standard** (migrate to current .NET version)
- `net4*` → **.NET Framework** (migrate via intermediate step to .NET 6+)

---

## Upgrade Sequence
1. **Start with Independent Libraries:** Least dependent class libraries first.
2. **Next:** Shared components and common utilities.
3. **Then:** API, Web, or Function projects.
4. **Finally:** Tests, integration points, and pipelines.

**Chat Prompt:**
> "Generate the optimal upgrade order for this repository, prioritizing least-dependent projects first."

---

## Per-Project Upgrade Flow
1. **Create branch:** `upgrade/<project>-to-<targetVersion>`
2. **Edit `<TargetFramework>`** in `.csproj` to the suggested version (e.g., `net9.0`)
3. **Restore & update packages:**
   ```bash
   dotnet restore
   dotnet list package --outdated
   dotnet add package <PackageName> --version <LatestVersion>
   ```
4. **Build & test:**
   ```bash
   dotnet build <ProjectName>.csproj
   dotnet test <ProjectName>.Tests.csproj
   ```
5. **Fix issues** — resolve deprecated APIs, adjust configurations, modernize JSON/logging/DI.
6. **Commit & push** PR with test evidence and checklist.

---

## Breaking Changes & Modernization
- Use `.NET Upgrade Assistant` for initial recommendations.
- Apply analyzers to detect obsolete APIs.
- Replace outdated SDKs (e.g., `Microsoft.Azure.*` → `Azure.*`).
- Modernize startup logic (`Startup.cs` → `Program.cs` top-level statements).

**Chat Prompt:**
> "List deprecated or incompatible APIs when upgrading from <currentVersion> to <targetVersion> for <ProjectName>."

---

## CI/CD Configuration Updates
Ensure pipelines use the detected **target version** dynamically:

**Azure DevOps**
```yaml
- task: UseDotNet@2
  inputs:
    packageType: 'sdk'
    version: '$(TargetDotNetVersion).x'
```

**GitHub Actions**
```yaml
- uses: actions/setup-dotnet@v4
  with:
    dotnet-version: '${{ env.TargetDotNetVersion }}.x'
```

---

## Validation Checklist
- [ ] TargetFramework upgraded to next stable version
- [ ] All NuGet packages compatible and updated
- [ ] Build and test pipelines succeed locally and in CI
- [ ] Integration tests pass
- [ ] Deployed to a lower environment and verified

---

## Branching & Rollback Strategy
- Use feature branches: `upgrade/<project>-to-<targetVersion>`
- Commit frequently and keep changes atomic
- If CI fails after merge, revert PR and isolate failing modules

**Chat Prompt:**
> "Suggest a rollback and validation plan if the .NET upgrade for <ProjectName> introduces build or runtime regressions."

---

## Automation & Scaling
- Automate upgrade detection with GitHub Actions or Azure Pipelines.
- Schedule nightly runs to check for new .NET releases via `dotnet --list-sdks`.
- Use agents to automatically raise PRs for outdated frameworks.

---

## Chatmode Prompt Library
1. "List all projects with current and recommended .NET versions."
2. "Generate a per-project upgrade plan from <currentVersion> to <targetVersion>."
3. "Suggest .csproj and pipeline edits to upgrade <ProjectName>."
4. "Summarize build/test results post-upgrade for <ProjectName>."
5. "Create PR description and checklist for the upgrade."

---
