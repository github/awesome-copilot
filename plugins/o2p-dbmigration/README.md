# Oracle-to-PostgreSQL Database Migration Plugin

Advisory agent for Oracle-to-PostgreSQL application migrations in .NET solutions. Educates users on migration concepts, pitfalls, and best practices; suggests concrete next steps; and delegates to specialized sub-agents on user confirmation.

## Installation

```bash
# Using Copilot CLI
copilot plugin install o2p-dbmigration@awesome-copilot
```

## What's Included

### Agents

| Agent | Description |
|-------|-------------|
| `o2p-dbmigration-advisor` | Advisory agent. Educates users on Oracle→PostgreSQL migration concepts, references the skill knowledge base, suggests concrete next steps, and delegates to specialized sub-agents on user confirmation. |
| `o2p-dbmigration-create-master-migration-plan` | Discovers all projects in the solution, assesses Oracle migration eligibility, detects prior progress, and produces a persistent master tracking plan. |
| `o2p-dbmigration-plan-integration-testing` | Creates the integration testing plan for a migrated project. |
| `o2p-dbmigration-scaffold-test-project` | Scaffolds the xUnit integration test project (base class, transaction management, seed manager). Invoked once before test creation. |
| `o2p-dbmigration-migrate-stored-procedure` | Converts Oracle stored procedures, functions, and packages to PostgreSQL equivalents. |
| `o2p-dbmigration-create-integration-tests` | Generates integration tests for a migrated project against the PostgreSQL schema. |
| `o2p-dbmigration-run-integration-tests` | Executes the integration test suite and captures results. |
| `o2p-dbmigration-validate-test-results` | Analyzes test results against the skill checklist and highlights failures. |
| `o2p-dbmigration-create-bug-reports` | Generates structured bug reports for failed tests. |

### Skills

| Skill | Description |
|-------|-------------|
| `o2p-dbmigration` | Validates PostgreSQL migration artifacts and integration tests, making sure every reference insight is surfaced before agent workflows sign off. Codifies expectations for validation, testing, and documentation across the migration workload. |

## Features

### Advisory & Educational Guidance

The advisor agent educates users throughout the migration journey:

- **Migration Concepts**: Explains Oracle→PostgreSQL differences (empty strings, null handling, sorting, timestamps, type coercion, etc.)
- **Pitfall Reference**: Surfaces insights from the `o2p-dbmigration` skill references so users understand why changes are needed
- **Best Practices**: Advises on minimizing changes, preserving logic, and ensuring schema immutability
- **Workflow Guidance**: Presents a recommended 11-step migration workflow (discovery, planning, code migration, validation, reporting) as a guide users can follow at their own pace

### Suggest-Then-Delegate Pattern

The advisor suggests actionable next steps and delegates to specialized sub-agents with user confirmation:

1. **Educate** on the migration topic and why it matters
2. **Suggest** a recommended action with expected outcomes
3. **Confirm** the user wants to proceed
4. **Delegate** to the appropriate sub-agent
5. **Summarize** what was produced and suggest the next step

No autonomous chaining — the user controls the pace and sequence.

### Specialized Sub-Agents

The advisor can delegate to 8 specialized sub-agents, each handling one focused role:

- **Master Planning**: Discover projects, classify eligibility
- **Integration Testing**: Plan, scaffold, create test cases, run tests, validate results
- **Stored Procedure Migration**: Convert Oracle procedures to PostgreSQL
- **Bug Reporting**: Generate reports for defects discovered during validation

## Prerequisites

- Visual Studio Code with GitHub Copilot
- PostgreSQL Extension (`ms-ossdata.vscode-pgsql`)
- .NET solution with Oracle dependencies to migrate

## Directory Structure

The agent expects and creates the following structure in your solution:

```
{REPOSITORY_ROOT}/
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

1. **Ask for Guidance**: Invoke the advisor with a migration question or situation (e.g., "How should I approach migrating my .NET solution to PostgreSQL?" or "What does Oracle do with empty strings that's different from PostgreSQL?")
2. **Learn & Plan**: The advisor explains concepts, surfaces reference insights, and presents recommended workflow steps
3. **Choose Your Next Step**: Decide which task you want to tackle (master plan, code migration, testing, etc.)
4. **Delegate on Confirmation**: Tell the advisor to proceed, and it delegates to the appropriate sub-agent
5. **Review & Continue**: Examine the results and ask for the next step

## Key Capabilities

- **Pitfall Education**: References all 9 known Oracle→PostgreSQL migration pitfalls with guidance
- **Best Practices Advice**: Emphasizes minimal changes, preserving logic, and schema immutability
- **User-Paced Workflow**: No automatic sequencing — you control which steps to take and when
- **Smart Delegation**: Offers to delegate to the right sub-agent with prerequisites verification
- **Persistent Artifacts**: Testing plans, validation reports, and bug reports are saved to your repository for reference

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
