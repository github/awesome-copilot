# Oracle-to-PostgreSQL Database Migration Plugin

Oracle-to-PostgreSQL migration orchestrator for multi-project .NET solutions with comprehensive migration planning, code transformation, integration testing, and reporting capabilities.

## Installation

```bash
# Using Copilot CLI
copilot plugin install o2p-dbmigration@awesome-copilot
```

## What's Included

### Agents

| Agent | Description |
|-------|-------------|
| `o2p-dbmigration-expert` | Parent orchestrator. Interprets the user goal, verifies prerequisites, delegates to the correct subagent, and loops until the goal is satisfied. |
| `o2p-dbmigration-create-master-migration-plan` | Discovers all projects in the solution, assesses Oracle migration eligibility, detects prior progress, and produces a persistent master tracking plan. |
| `o2p-dbmigration-plan-integration-testing` | Creates the integration testing plan for a migrated project. |
| `o2p-dbmigration-scaffold-test-project` | Scaffolds the xUnit integration test project (base class, transaction management, seed manager). Invoked once before test creation. |
| `o2p-dbmigration-migrate-application-codebase` | Migrates .NET application code from Oracle to PostgreSQL data access patterns. |
| `o2p-dbmigration-migrate-stored-procedure` | Converts Oracle stored procedures, functions, and packages to PostgreSQL equivalents. |
| `o2p-dbmigration-create-integration-tests` | Generates integration tests for a migrated project against the PostgreSQL schema. |
| `o2p-dbmigration-run-integration-tests` | Executes the integration test suite and captures results. |
| `o2p-dbmigration-validate-test-results` | Validates test run output and determines whether to exit or loop for remediation. |
| `o2p-dbmigration-create-bug-reports` | Generates structured bug reports for failed tests and tracks remediation progress. |
| `o2p-dbmigration-generate-application-migration-report` | Produces a detailed migration outcome report for a completed project. |

### Skills

| Skill | Description |
|-------|-------------|
| `o2p-dbmigration` | Validates PostgreSQL migration artifacts and integration tests, making sure every reference insight is surfaced before agent workflows sign off. Codifies expectations for validation, testing, and documentation across the migration workload. |

## Features

### Multi-Project Application Migration

The agent handles multiple application projects sequentially, tracking progress across sessions using a persistent Master Migration Plan:

1. Discovers all migration-eligible projects in the solution
2. For each project, performs:
   - Application codebase migration
   - Closed-loop integration testing workflow
   - Status tracking and progress updates
3. Generates comprehensive migration reports

### Closed-Loop Integration Testing

Automated integration testing workflow for each migrated project:

```
plan → scaffold → create tests → run → validate → [EXIT or LOOP]
                        ↑                     │
                        └──── fix ←── bugs ←──┘
```

### Migration Components

- **Application Codebase Migration**: Migrates .NET code from Oracle to PostgreSQL
- **Stored Procedure Migration**: Converts Oracle stored procedures, functions, and packages to PostgreSQL
- **Integration Testing**: Creates and runs comprehensive integration tests
- **Bug Tracking**: Generates bug reports for failed tests and tracks remediation
- **Migration Reports**: Produces detailed migration outcome documentation

## Prerequisites

- Visual Studio Code with GitHub Copilot
- PostgreSQL Extension (`ms-ossdata.vscode-pgsql`)
- .NET solution with Oracle dependencies to migrate

## Directory Structure

The agent expects and creates the following structure in your solution:

```
{SOLUTION_ROOT}/
└── .github/
    └── o2p-dbmigration/
        ├── Reports/
        │   ├── Master Migration Plan.md
    │   ├── Integration Testing Plan.md
    │   ├── Validation Report.md
    │   ├── Application Migration Report.md
    │   ├── BUG_REPORT_*.md
    │   └── TestResults/
        ├── DDL/
        │   ├── Oracle/      # Oracle DDL scripts (pre-migration)
        │   └── Postgres/    # PostgreSQL DDL scripts (post-migration)
```

## Usage

1. **Start Migration**: Invoke the agent with your goal (e.g., "Migrate my solution from Oracle to PostgreSQL")
2. **Master Plan**: The agent creates a master migration plan tracking all projects
3. **Per-Project Migration**: Each project is migrated and tested sequentially
4. **Review Reports**: Check the generated reports for migration status and any issues

## Key Capabilities

- **Cross-Session Tracking**: Resume interrupted migrations from where you left off
- **Automated Testing**: Comprehensive integration tests generated and executed automatically
- **Error Handling**: Detailed bug reports with remediation tracking
- **DDL Management**: Preserves both Oracle and PostgreSQL DDL for reference
- **Minimal Changes**: Keeps changes minimal, preserving application logic where possible

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
