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
| `o2p-dbmigration-expert` | Oracle-to-PostgreSQL migration orchestrator for multi-project .NET solutions. Discovers migration-eligible projects, produces a persistent master plan for cross-session tracking, migrates application codebases and stored procedures, runs closed-loop integration testing, and generates migration reports. |

### Skills

| Skill | Description |
|-------|-------------|
| `o2p-dbmigration` | Validates PostgreSQL migration artifacts and integration tests, making sure every reference insight is surfaced before agent workflows sign off. Use when proving migration or integration testing work and confirming the repository references/insights are obeyed. |

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

## Reference Materials

The included skill provides reference guides for common Oracle→PostgreSQL migration patterns:

- Empty strings handling ('' vs NULL)
- NO_DATA_FOUND exceptions
- Oracle parentheses in FROM clauses
- Sorting and collation differences
- TO_CHAR numeric conversions
- Type coercion rules
- REFCURSOR handling
- Concurrent transactions

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
