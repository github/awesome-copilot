---
agent: 'agent'
description: 'Update existing object-oriented component documentation following industry best practices and architectural documentation standards.'
tools: ['changes', 'search/codebase', 'edit/editFiles', 'extensions', 'fetch', 'githubRepo', 'openSimpleBrowser', 'problems', 'runTasks', 'search', 'search/searchResults', 'runCommands/terminalLastCommand', 'runCommands/terminalSelection', 'testFailure', 'usages', 'vscodeAPI']
---
# Update Standard OO Component Documentation

Update the existing documentation file at: `${file}` by analyzing the corresponding component code.

Extract the component path from the existing documentation's front matter (`component_path` field) or infer it from the documentation content. Analyze the current component implementation and update the documentation accordingly.

**Documentation Standards:**

- DOC-001: Follow C4 Model documentation levels (Context, Containers, Components, Code)
- DOC-002: Align with Arc42 software architecture documentation template
- DOC-003: Comply with IEEE 1016 Software Design Description standard
- DOC-004: Use Agile Documentation principles (just enough documentation that adds value)
- DOC-005: Target developers and maintainers as primary audience

**Analysis Instructions:**

- ANA-001: Read existing documentation to understand component context and structure
- ANA-002: Identify component path from front matter or content analysis
- ANA-003: Examine current source code files for class structures and inheritance
- ANA-004: Compare existing documentation with current implementation
- ANA-005: Identify design patterns and architectural changes
- ANA-006: Update public APIs, interfaces, and dependencies
- ANA-007: Recognize new/changed creational/structural/behavioral patterns
- ANA-008: Update method parameters, return values, exceptions
- ANA-009: Reassess performance, security, reliability, maintainability
- ANA-010: Update integration patterns and data flow

**Language-Specific Optimizations:**

- LNG-001: **C#/.NET** - async/await, dependency injection, configuration, disposal
- LNG-002: **Java** - Spring framework, annotations, exception handling, packaging
- LNG-003: **TypeScript/JavaScript** - modules, async patterns, types, npm
- LNG-004: **Python** - packages, virtual environments, type hints, testing

**Update Strategy:**

- UPD-001: Preserve existing documentation structure and format
- UPD-002: Update `last_updated` field to current date
- UPD-003: Maintain version history in front matter if present
- UPD-004: Add new sections if component has significantly expanded
- UPD-005: Mark deprecated features or breaking changes
- UPD-006: Update examples to reflect current API
- UPD-007: Refresh dependency lists and versions
- UPD-008: Update mermaid diagrams to reflect current architecture

**Error Handling:**

- ERR-001: Documentation file doesn't exist - provide guidance on file location
- ERR-002: Component path not found in documentation - request clarification
- ERR-003: Source code has moved - suggest updated paths
- ERR-004: Major architectural changes - highlight breaking changes
- ERR-005: Insufficient access to source - document limitations

**Output Format:**

Update the existing Markdown file maintaining its structure while refreshing content to match current implementation. Preserve formatting, heading hierarchy, and existing organizational decisions.

**Required Documentation Structure:**

Update the existing documentation following the same template structure, ensuring all sections reflect current implementation:

```md
---
title: [Component Name] - Technical Documentation
component_path: [Current component path]
version: [Updated version if applicable]
date_created: [Original creation date - preserve]
last_updated: [YYYY-MM-DD - update to current date]
owner: [Preserve existing or update if changed]
tags: [Update tags as needed based on current functionality]
---

# [Component Name] Documentation

[Update introduction to reflect current component purpose and capabilities]

## 1. Component Overview

### Purpose/Responsibility
- OVR-001: Update component's primary responsibility
- OVR-002: Refresh scope (included/excluded functionality)
- OVR-003: Update system context and relationships

## 2. Architecture Section

- ARC-001: Update design patterns used (Repository, Factory, Observer, etc.)
- ARC-002: Refresh internal and external dependencies with current purposes
- ARC-003: Update component interactions and relationships
- ARC-004: Update visual diagrams (UML class, sequence, component)
- ARC-005: Refresh mermaid diagram showing current component structure, relationships, and dependencies

### Component Structure and Dependencies Diagram

Update the mermaid diagram to show current:
- **Component structure** - Current classes, interfaces, and their relationships
- **Internal dependencies** - How components currently interact within the system
- **External dependencies** - Current external libraries, services, databases, APIs
- **Data flow** - Current direction of dependencies and interactions
- **Inheritance/composition** - Current class hierarchies and composition relationships

```mermaid
[Update diagram to reflect current architecture]
```

## 3. Interface Documentation

- INT-001: Update all public interfaces and current usage patterns
- INT-002: Refresh method/property reference table with current API
- INT-003: Update events/callbacks/notification mechanisms

| Method/Property | Purpose | Parameters | Return Type | Usage Notes |
|-----------------|---------|------------|-------------|-------------|
| [Update table with current API] | | | | |

## 4. Implementation Details

- IMP-001: Update main implementation classes and current responsibilities
- IMP-002: Refresh configuration requirements and initialization patterns
- IMP-003: Update key algorithms and business logic
- IMP-004: Update performance characteristics and bottlenecks

## 5. Usage Examples

### Basic Usage

```csharp
// Update basic usage example to current API
```

### Advanced Usage

```csharp
// Update advanced configuration patterns to current implementation
```

- USE-001: Update basic usage examples
- USE-002: Refresh advanced configuration patterns
- USE-003: Update best practices and recommended patterns

## 6. Quality Attributes

- QUA-001: Update security (authentication, authorization, data protection)
- QUA-002: Refresh performance (characteristics, scalability, resource usage)
- QUA-003: Update reliability (error handling, fault tolerance, recovery)
- QUA-004: Refresh maintainability (standards, testing, documentation)
- QUA-005: Update extensibility (extension points, customization options)

## 7. Reference Information

- REF-001: Update dependencies with current versions and purposes
- REF-002: Refresh configuration options reference
- REF-003: Update testing guidelines and mock setup
- REF-004: Refresh troubleshooting (common issues, error messages)
- REF-005: Update related documentation links
- REF-006: Add change history and migration notes for this update

```
