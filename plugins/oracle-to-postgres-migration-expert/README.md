# Oracle-to-PostgreSQL Migration Expert Plugin

Expert agent for Oracle-to-PostgreSQL application migrations in .NET solutions. Performs code edits, runs commands, and guides users through a structured, gated migration workflow.

## Installation

```bash
# Using Copilot CLI
copilot plugin install oracle-to-postgres-migration-expert@awesome-copilot
```

## What's Included

### Agents

| Agent | Description |
|-------|-------------|
| `Oracle-to-PostgreSQL Migration Expert` | Expert agent for Oracle→PostgreSQL migrations. Makes code edits and runs commands directly, educates users on migration concepts and pitfalls. |

### Skills

| Skill | Description |
|-------|-------------|
| `reviewing-oracle-to-postgres-migration` | Identifies Oracle-to-PostgreSQL migration risks by cross-referencing code against known behavioral differences (empty strings, refcursors, type coercion, sorting/collations, UNION ALL planning risks, materialized-view refresh behavior, timestamps, concurrent transactions, etc.). |
| `creating-oracle-to-postgres-master-migration-plan` | Discovers all projects in a .NET solution, classifies each for Oracle-to-PostgreSQL migration eligibility, and produces a persistent master migration plan. |
| `migrating-oracle-to-postgres-stored-procedures` | Migrates Oracle PL/SQL stored procedures to PostgreSQL PL/pgSQL. Translates Oracle-specific syntax, preserves method signatures and type-anchored parameters, and applies explicit collation rules (`"C"` only when appropriate, locale-specific collations when required). |
| `planning-oracle-to-postgres-migration-integration-testing` | Creates an integration testing plan for .NET data access artifacts, identifying repositories, DAOs, and service layers that need validation coverage. |
| `scaffolding-oracle-to-postgres-migration-test-project` | Scaffolds an xUnit integration test project with a transaction-rollback base class and seed data manager for Oracle-to-PostgreSQL migration validation. |
| `creating-oracle-to-postgres-migration-integration-tests` | Generates DB-agnostic xUnit integration tests with deterministic seed data that validate behavior consistency across both database systems. |
| `creating-oracle-to-postgres-migration-bug-report` | Creates structured bug reports for defects discovered during Oracle-to-PostgreSQL migration validation, with severity, root cause, and remediation steps. |
| `migrating-oracle-to-postgres-data-access-code` | Migrates .NET/C# data access code from Oracle to PostgreSQL (Npgsql). Replaces Oracle NuGet packages, rewrites ADO.NET type references, fixes DbType mappings, updates stored procedure invocation patterns, and adapts connection string configuration. |

## Features

### Educational Guidance

The expert agent educates users throughout the migration journey:

- **Migration Concepts**: Explains Oracle→PostgreSQL differences (empty strings vs NULL, NO_DATA_FOUND exceptions, sort/collation behavior, TO_CHAR conversions, type coercion strictness, REF CURSOR handling, UNION ALL planning caveats, materialized-view refresh needs, concurrent transactions, timestamp/timezone behavior)
- **Pitfall Reference**: Surfaces insights from migration knowledge so users understand why changes are needed
- **Best Practices**: Advises on minimizing changes, preserving logic, and ensuring schema immutability
- **Workflow Guidance**: Presents a six-phase, gated migration workflow with explicit success criteria at each gate

### Suggest-Then-Act Pattern

The expert suggests actionable next steps and only proceeds with user confirmation:

1. **Educate** on the migration topic and why it matters
2. **Suggest** a recommended action with expected outcomes
3. **Confirm** the user wants to proceed
4. **Act** — make edits and run commands directly
5. **Summarize** what was produced and suggest the next step

No autonomous chaining — the user controls the pace and sequence.

For database-changing actions, the expert provides scripts and explicit run instructions; the user applies DB changes.

## Migration Workflow

The expert guides users through a six-phase, gated workflow. Each phase must satisfy its success criteria before advancing.

**Phase 1 — Discovery & Planning** *(solution-wide)*

- Discover all projects and classify migration eligibility
- Produce `Reports/MasterMigrationPlan.md` recording DDL artifact location and whether an external tool (e.g., `ora2pg`) was already used

**Phase 2 — Pre-Migration Planning & Risk Analysis** *(per project)*

- Identify the data-access layer (repositories, DAOs, service classes, SQL/procedure calls)
- Produce `Reports/{ProjectName}/OracleRiskAnalysis.md` — a stable analytical reference of Oracle/PostgreSQL behavioral differences found in the code
- Derive `Reports/{ProjectName}/MigrationChecklist.md` — a numbered, actionable checklist for Phase 5

**Phase 3 — Oracle Test Project Creation & Validation** *(per project)*

- Scaffold an Oracle-targeting xUnit test project and write integration tests
- Establish a passing Oracle baseline — a failing baseline means defects exist *before* migration starts
- Document any behavioral discrepancies as structured bug reports

**Phase 4 — Schema & DDL Migration** *(per project)*

- Skip if `MasterMigrationPlan.md` records an external tool already produced PostgreSQL DDL
- Migrate in dependency order: types/enums → tables/sequences → indexes/constraints → views → triggers → stored procedures (PL/SQL → PL/pgSQL)
- Output artifacts to `DDL/Postgres/{ProjectName}/`; user applies scripts and confirms clean apply

**Phase 5 — Code Migration** *(per project)*

- Copy the application project into a `.Postgres` sibling, add to the solution, and update namespace/assembly name
- Use the `migrating-oracle-to-postgres-data-access-code` skill to work through `MigrationChecklist.md` item by item
- Run `dotnet build` after each item; fix errors before moving on
- Cross-reference completed checklist against `OracleRiskAnalysis.md` to confirm every risk is addressed or deferred with justification

**Phase 6 — PostgreSQL Test Project Creation & Validation** *(per project)*

- Clone the Oracle test project into a `.Postgres`-namespaced test project targeting the Phase 5 application clone
- Migrate the test project, `dotnet build`-gating each change
- Iteratively fix failures reported by the user — stored procedure corrections are written back to `DDL/Postgres/{ProjectName}/`
- Oracle test project must remain unmodified throughout

## Prerequisites

- Visual Studio Code with GitHub Copilot
- .NET solution with Oracle dependencies to migrate
- Access to an Oracle instance (for baseline testing) and a PostgreSQL instance (for validation)

## Directory Structure

The agent expects and creates the following structure in your repository:

```
.github/
└── oracle-to-postgres-migration/
    ├── Reports/
    │   ├── MasterMigrationPlan.md
    │   └── {ProjectName}/
    │       ├── OracleRiskAnalysis.md
    │       ├── MigrationChecklist.md
    │       ├── PostgresTestMigrationPlan.md
    │       └── BUG_REPORT_*.md
    └── DDL/
        ├── Oracle/                  # Oracle DDL scripts (pre-migration)
        └── Postgres/
            └── {ProjectName}/       # PostgreSQL DDL scripts per project (post-migration)
```

## Usage

1. **Ask for Guidance**: Invoke the expert with a migration question or situation (e.g., *"How should I approach migrating my .NET solution to PostgreSQL?"* or *"What does Oracle do with empty strings that's different from PostgreSQL?"*)
2. **Learn & Plan**: The expert explains concepts, surfaces pitfall insights, and presents recommended workflow steps
3. **Choose Your Next Step**: Decide which task to tackle (master plan, risk analysis, testing, code migration, etc.)
4. **Confirm and Act**: Tell the expert to proceed, and it makes edits and runs commands directly
5. **Review & Continue**: Examine the results and ask for the next step

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
