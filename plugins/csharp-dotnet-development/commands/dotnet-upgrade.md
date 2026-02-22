---
name: ".NET Upgrade Analysis Prompts"
description: "Ready-to-use prompts for comprehensive .NET framework upgrade analysis and execution"
---
  # Project Discovery & Assessment
  - name: "Project Classification Analysis"
    prompt: "Identify all projects in the solution and classify them by type (`.NET Framework`, `.NET Core`, `.NET Standard`). Analyze each `.csproj` for its current `TargetFramework` and SDK usage."

  - name: "Dependency Compatibility Review"
    prompt: "Review external and internal dependencies for framework compatibility. Determine the upgrade complexity based on dependency graph depth."

  - name: "Legacy Package Detection"
    prompt: "Identify legacy `packages.config` projects needing migration to `PackageReference` format."

  # Upgrade Strategy & Sequencing
  - name: "Project Upgrade Ordering"
    prompt: "Recommend a project upgrade order from least to most dependent components. Suggest how to isolate class library upgrades before API or Azure Function migrations."

  - name: "Incremental Strategy Planning"
    prompt: "Propose an incremental upgrade strategy with rollback checkpoints. Evaluate the use of **Upgrade Assistant** or **manual upgrades** based on project structure."

  - name: "Progress Tracking Setup"
    prompt: "Generate an upgrade checklist for tracking build, test, and deployment readiness across all projects."

  # Framework Targeting & Code Adjustments
  - name: "Target Framework Selection"
    prompt: "Suggest the correct `TargetFramework` for each project (e.g., `net8.0`). Review and update deprecated SDK or build configurations."

  - name: "Code Modernization Analysis"
    prompt: "Identify code patterns needing modernization (e.g., `WebHostBuilder` → `HostBuilder`). Suggest replacements for deprecated .NET APIs and third-party libraries."

  - name: "Async Pattern Conversion"
    prompt: "Recommend conversion of synchronous calls to async where appropriate for improved performance and scalability."

  # NuGet & Dependency Management
  - name: "Package Compatibility Analysis"
    prompt: "Analyze outdated or incompatible NuGet packages and suggest compatible versions. Identify third-party libraries that lack .NET 8 support and provide migration paths."

  - name: "Shared Dependency Strategy"
    prompt: "Recommend strategies for handling shared dependency upgrades across projects. Evaluate usage of legacy packages and suggest alternatives in Microsoft-supported namespaces."

  - name: "Transitive Dependency Review"
    prompt: "Review transitive dependencies and potential version conflicts after upgrade. Suggest resolution strategies for dependency conflicts."

  # CI/CD & Build Pipeline Updates
  - name: "Pipeline Configuration Analysis"
    prompt: "Analyze YAML build definitions for SDK version pinning and recommend updates. Suggest modifications for `UseDotNet@2` and `NuGetToolInstaller` tasks."

  - name: "Build Pipeline Modernization"
    prompt: "Generate updated build pipeline snippets for .NET 8 migration. Recommend validation builds on feature branches before merging to main."

  - name: "CI Automation Enhancement"
    prompt: "Identify opportunities to automate test and build verification in CI pipelines. Suggest strategies for continuous integration validation."

  # Testing & Validation
  - name: "Build Validation Strategy"
    prompt: "Propose validation checks to ensure the upgraded solution builds and runs successfully. Recommend automated test execution for unit and integration suites post-upgrade."

  - name: "Service Integration Verification"
    prompt: "Generate validation steps to verify logging, telemetry, and service connectivity. Suggest strategies for verifying backward compatibility and runtime behavior."

  - name: "Deployment Readiness Check"
    prompt: "Recommend UAT deployment verification steps before production rollout. Create comprehensive testing scenarios for upgraded components."

  # Breaking Change Analysis
  - name: "API Deprecation Detection"
    prompt: "Identify deprecated APIs or removed namespaces between target versions. Suggest automated scanning using `.NET Upgrade Assistant` and API Analyzer."

  - name: "API Replacement Strategy"
    prompt: "Recommend replacement APIs or libraries for known breaking areas. Review configuration changes such as `Startup.cs` → `Program.cs` refactoring."

  - name: "Regression Testing Focus"
    prompt: "Suggest regression testing scenarios focused on upgraded API endpoints or services. Create test plans for critical functionality validation."

  # Version Control & Commit Strategy
  - name: "Branching Strategy Planning"
    prompt: "Recommend branching strategy for safe upgrade with rollback capability. Generate commit templates for partial and complete project upgrades."

  - name: "PR Structure Optimization"
    prompt: "Suggest best practices for creating structured PRs (`Upgrade to .NET [Version]`). Identify tagging strategies for PRs involving breaking changes."

  - name: "Code Review Guidelines"
    prompt: "Recommend peer review focus areas (build, test, and dependency validation). Create checklists for effective upgrade reviews."

  # Documentation & Communication
  - name: "Upgrade Documentation Strategy"
    prompt: "Suggest how to document each project's framework change in the PR. Propose automated release note generation summarizing upgrades and test results."

  - name: "Stakeholder Communication"
    prompt: "Recommend communicating version upgrades and migration timelines to consumers. Generate documentation templates for dependency updates and validation results."

  - name: "Progress Tracking Systems"
    prompt: "Suggest maintaining an upgrade summary dashboard or markdown checklist. Create templates for tracking upgrade progress across multiple projects."

  # Tools & Automation
  - name: "Upgrade Tool Selection"
    prompt: "Recommend when and how to use: `.NET Upgrade Assistant`, `dotnet list package --outdated`, `dotnet migrate`, and `graph.json` dependency visualization."

  - name: "Analysis Script Generation"
    prompt: "Generate scripts or prompts for analyzing dependency graphs before upgrading. Propose AI-assisted prompts for Copilot to identify upgrade issues automatically."

  - name: "Multi-Repository Validation"
    prompt: "Suggest how to validate automation output across multiple repositories. Create standardized validation workflows for enterprise-scale upgrades."

  # Final Validation & Delivery
  - name: "Final Solution Validation"
    prompt: "Generate validation steps to confirm the final upgraded solution passes all validation checks. Suggest production deployment verification steps post-upgrade."

  - name: "Deployment Readiness Confirmation"
    prompt: "Recommend generating final test results and build artifacts. Create a checklist summarizing completion across projects (builds/tests/deployment)."

  - name: "Release Documentation"
    prompt: "Generate a release note summarizing framework changes and CI/CD updates. Create comprehensive upgrade summary documentation."

---
