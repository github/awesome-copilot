# Oracle-to-PostgreSQL Migration Expert Plugin

Expert agent for Oracle-to-PostgreSQL application migrations in .NET solutions. Performs code edits, runs commands, and invokes extension tools to migrate .NET/Oracle data access patterns to PostgreSQL.

## Installation

```bash
# Using Copilot CLI
copilot plugin install oracle-to-postgres-migration-expert@awesome-copilot
```

## What's Included

### Agents

| Agent | Description |
|-------|-------------|
| `Oracle-to-PostgreSQL Migration Expert` | Expert agent for Oracle→PostgreSQL migrations. Makes code edits and runs commands directly, educates users on migration concepts and pitfalls, and invokes extension tools on user confirmation. |

### Skills

| Skill | Description |
|-------|-------------|
| `reviewing-oracle-to-postgres-migration` | Identifies Oracle-to-PostgreSQL migration risks by cross-referencing code against known behavioral differences (empty strings, refcursors, type coercion, sorting, timestamps, concurrent transactions, etc.). |
| `creating-oracle-to-postgres-master-migration-plan` | Discovers all projects in a .NET solution, classifies each for Oracle-to-PostgreSQL migration eligibility, and produces a persistent master migration plan. |
| `migrating-oracle-to-postgres-stored-procedures` | Migrates Oracle PL/SQL stored procedures to PostgreSQL PL/pgSQL. Translates Oracle-specific syntax, preserves method signatures and type-anchored parameters, and applies `COLLATE "C"` for Oracle-compatible text sorting. |
| `planning-oracle-to-postgres-migration-integration-testing` | Creates an integration testing plan for .NET data access artifacts, identifying repositories, DAOs, and service layers that need validation coverage. |
| `scaffolding-oracle-to-postgres-migration-test-project` | Scaffolds an xUnit integration test project with a transaction-rollback base class and seed data manager for Oracle-to-PostgreSQL migration validation. |
| `creating-oracle-to-postgres-migration-integration-tests` | Generates DB-agnostic xUnit integration tests with deterministic seed data that validate behavior consistency across both database systems. |
| `creating-oracle-to-postgres-migration-bug-report` | Creates structured bug reports for defects discovered during Oracle-to-PostgreSQL migration validation, with severity, root cause, and remediation steps. |

## Features

### Educational Guidance

The expert agent educates users throughout the migration journey:

- **Migration Concepts**: Explains Oracle→PostgreSQL differences (empty strings vs NULL, NO_DATA_FOUND exceptions, sort order, TO_CHAR conversions, type coercion strictness, REF CURSOR handling, concurrent transactions, timestamp/timezone behavior)
- **Pitfall Reference**: Surfaces insights from migration knowledge so users understand why changes are needed
- **Best Practices**: Advises on minimizing changes, preserving logic, and ensuring schema immutability
- **Workflow Guidance**: Presents a four-phase migration workflow as a guide users can follow at their own pace

### Suggest-Then-Act Pattern

The expert suggests actionable next steps and only proceeds with user confirmation:

1. **Educate** on the migration topic and why it matters
2. **Suggest** a recommended action with expected outcomes
3. **Confirm** the user wants to proceed
4. **Act** — make edits, run commands, or invoke extension tools directly
5. **Summarize** what was produced and suggest the next step

No autonomous chaining — the user controls the pace and sequence.

## Migration Workflow

The expert guides users through a four-phase workflow:

**Phase 1 — Discovery & Planning**

1. Create a master migration plan (classifies all projects in the solution)
2. Set up Oracle and PostgreSQL DDL artifacts

**Phase 2 — Code Migration** *(per project)*
3. Migrate application codebase (via `ms-ossdata.vscode-pgsql` extension)
4. Migrate stored procedures (Oracle PL/SQL → PostgreSQL PL/pgSQL)

**Phase 3 — Validation** *(per project)*
5. Plan integration testing
6. Scaffold the xUnit test project
7. Create integration tests
8. Run tests against Oracle (baseline) and PostgreSQL (target)
9. Validate test results
10. Create bug reports for any failures

**Phase 4 — Reporting**
11. Generate final migration report (via `ms-ossdata.vscode-pgsql` extension)

## Prerequisites

- Visual Studio Code with GitHub Copilot
- PostgreSQL Extension (`ms-ossdata.vscode-pgsql`) — required for application code migration and report generation
- .NET solution with Oracle dependencies to migrate

## Directory Structure

The agent expects and creates the following structure in your repository:

```
.github/
└── oracle-to-postgres-migration/
    ├── Reports/
    │   ├── Master Migration Plan.md
    │   ├── {Project} Integration Testing Plan.md
    │   ├── {Project} Application Migration Report.md
    │   ├── BUG_REPORT_*.md
    │   └── TestResults/
    └── DDL/
        ├── Oracle/      # Oracle DDL scripts (pre-migration)
        └── Postgres/    # PostgreSQL DDL scripts (post-migration)
```

## Usage

1. **Ask for Guidance**: Invoke the expert with a migration question or situation (e.g., *"How should I approach migrating my .NET solution to PostgreSQL?"* or *"What does Oracle do with empty strings that's different from PostgreSQL?"*)
2. **Learn & Plan**: The expert explains concepts, surfaces pitfall insights, and presents recommended workflow steps
3. **Choose Your Next Step**: Decide which task to tackle (master plan, code migration, testing, etc.)
4. **Confirm and Act**: Tell the expert to proceed, and it makes edits, runs commands, or invokes extension tools directly
5. **Review & Continue**: Examine the results and ask for the next step

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
