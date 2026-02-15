# Database & Data Management Plugin

Database administration, SQL optimization, and data management tools for PostgreSQL, SQL Server, and general database development best practices.

## Installation

```bash
# Using Copilot CLI
copilot plugin install database-data-management@awesome-copilot
```

## What's Included

### Commands (Slash Commands)

| Command | Description |
|---------|-------------|
| `/database-data-management:sql-optimization` | Universal SQL performance optimization assistant for comprehensive query tuning, indexing strategies, and database performance analysis across all SQL databases (MySQL, PostgreSQL, SQL Server, Oracle). Provides execution plan analysis, pagination optimization, batch operations, and performance monitoring guidance. |
| `/database-data-management:sql-code-review` | Universal SQL code review assistant that performs comprehensive security, maintainability, and code quality analysis across all SQL databases (MySQL, PostgreSQL, SQL Server, Oracle). Focuses on SQL injection prevention, access control, code standards, and anti-pattern detection. Complements SQL optimization prompt for complete development coverage. |
| `/database-data-management:postgresql-optimization` | PostgreSQL-specific development assistant focusing on unique PostgreSQL features, advanced data types, and PostgreSQL-exclusive capabilities. Covers JSONB operations, array types, custom types, range/geometric types, full-text search, window functions, and PostgreSQL extensions ecosystem. |
| `/database-data-management:postgresql-code-review` | PostgreSQL-specific code review assistant focusing on PostgreSQL best practices, anti-patterns, and unique quality standards. Covers JSONB operations, array usage, custom types, schema design, function optimization, and PostgreSQL-exclusive security features like Row Level Security (RLS). |

### Agents

| Agent | Description |
|-------|-------------|
| `postgresql-dba` | Work with PostgreSQL databases using the PostgreSQL extension. |
| `ms-sql-dba` | Work with Microsoft SQL Server databases using the MS SQL extension. |

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
