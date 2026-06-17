---
name: efcore-d2-db-diagram
description: "Generate D2 database diagrams from Entity Framework Core models. USE FOR: EF Core database diagram, Entity Framework Core ERD, DbContext diagram, C# entity relationship diagram, PostgreSQL schema visualization, generate .d2 file from EF Core entities, Fluent API mapping diagram, migrations-based database diagram, table relationships, owned types, many-to-many join tables, indexes and constraints. DO NOT USE FOR: runtime debugging, database migration execution, schema deployment, SQL performance tuning, or draw.io diagrams."
---

# EF Core D2 Database Diagram Generator

## When to Use

Use this skill when the user wants to generate a database / ERD diagram from an Entity Framework Core codebase.

Typical requests:

- Generate a D2 database diagram from EF Core entities.
- Visualize tables, columns, primary keys, foreign keys and relationships.
- Analyze `DbContext`, `DbSet<T>`, `IEntityTypeConfiguration<T>`, Fluent API and migrations.
- Produce a `.d2` file renderable to SVG/PNG with the `d2` CLI.
- Document the database model of an ASP.NET Core / .NET project.

## Goal

Create a readable D2 entity-relationship diagram that reflects the actual EF Core persistence model, not only the raw C# class shape.

The diagram must prioritize:

1. Database tables and relationships.
2. Primary keys, foreign keys, required/optional columns.
3. Owned types and value objects.
4. Many-to-many relationships and join tables.
5. Indexes, unique constraints and table names.
6. EF Core conventions only when explicit mapping is absent.

Output is `.d2` source code. It can be rendered to SVG or PNG via the `d2` CLI.

## Tools

- **d2 CLI**: render `.d2` files to SVG/PNG.
  - `d2 input.d2 output.svg`
  - `d2 --layout=elk input.d2 output.svg`
- **d2 fmt**: format D2 files.
  - `d2 fmt input.d2`
- No MCP server is required. The skill generates D2 source code as text.

## Recommended Workflow

1. Read the EF Core project structure.
2. Locate all `DbContext` classes.
3. Locate all `DbSet<T>` declarations.
4. Locate entity classes, owned types, enum types and value objects.
5. Read `OnModelCreating` and all `IEntityTypeConfiguration<T>` classes.
6. Read migrations when available to confirm table names, join tables, indexes and delete behaviors.
7. Build a normalized database model before writing D2.
8. Ask the mandatory diagram questionnaire before generation.
9. Generate the `.d2` file using the database model, not raw class nesting.
10. Validate D2 syntax with `d2 fmt` before delivery.
11. Render with `d2 --layout=elk schema.d2 schema.svg` when possible.
12. If regenerating, re-read EF Core mappings and migrations first.

## Mandatory Questions Before Diagram Generation

Ask these questions for every new diagram and every regeneration unless the user already answered them in the same request.

1. `Which DbContext should be diagrammed? (auto-detect/all/specific name)`
2. `Display columns? (all/key-only/none)`
3. `Display column types? (Yes/No)`
4. `Display nullable/required markers? (Yes/No)`
5. `Display indexes and unique constraints? (Yes/No)`
6. `Display enum values? (Yes/No)`
7. `Display owned types? (inline/separate/hide)`
8. `Display many-to-many join tables? (explicit/compact/hide)`
9. `Display audit/technical tables? (Yes/No)`
10. `Display migration-only tables not present as entities? (Yes/No)`
11. `Which grouping mode? (bounded-context/schema/namespace/flat)`
12. `Which layout engine? (elk/dagre/tala)`
13. `Which output format? (d2/svg/png)`

Default values, when the user asks for a quick generation:

- DbContext: `auto-detect`
- Columns: `key-only`
- Column types: `Yes`
- Nullable markers: `Yes`
- Indexes: `Yes`
- Enums: `No`
- Owned types: `inline`
- Join tables: `explicit`
- Audit/technical tables: `No`
- Migration-only tables: `Yes`
- Grouping: `bounded-context`
- Layout: `elk`
- Output: `d2`

## Reference Documents

Load these on demand when needed:

| Reference | When to load |
|---|---|
| `references/efcore-model-extraction.md` | Rules for reading DbContext, DbSet, Fluent API, configurations and migrations |
| `references/d2-erd-style.md` | D2 syntax and visual conventions for ERD diagrams |
| `references/relationship-rules.md` | How to infer one-to-one, one-to-many, many-to-many and owned relationships |
| `references/grouping-modes.md` | Rules for bounded-context, schema, namespace and flat grouping |
| `references/quality-gate.md` | Final checklist before delivering the generated diagram |

## EF Core Extraction Rules

### Source Priority

Use this priority order when sources disagree:

1. Latest applied migration / migration snapshot.
2. Fluent API configuration in `OnModelCreating` or `IEntityTypeConfiguration<T>`.
3. Data annotations.
4. EF Core conventions.
5. Raw C# class shape.

### Required EF Core Concepts to Detect

Detect and represent:

- `DbContext` and `DbSet<T>`.
- Entity class names and actual table names from `ToTable`.
- Schema names from `ToTable("Table", "schema")`.
- Primary keys from `HasKey`, `[Key]`, conventions and migrations.
- Composite keys.
- Foreign keys from `HasForeignKey`, navigation properties and migration operations.
- Delete behavior when explicit: `Cascade`, `Restrict`, `NoAction`, `SetNull`, `ClientSetNull`.
- Required/optional relationship markers.
- Owned types from `OwnsOne`, `OwnsMany` and `[Owned]`.
- Many-to-many relationships from `UsingEntity` and implicit EF Core join tables.
- Indexes from `HasIndex`, `IsUnique` and migrations.
- Alternate keys from `HasAlternateKey`.
- Shadow properties configured in Fluent API.
- Value conversions when they affect persisted type or readability.
- Enum properties.
- Ignored properties and ignored entities.

## Diagram Rendering Rules

### Tables

Represent each persisted table as a D2 node with `shape: sql_table` when possible.

Use this content convention:

```d2
Clients: {
  shape: sql_table
  constraint: primary_key
  Id: uuid {constraint: primary_key}
  Name: text
  Status: enum
}
```

If `sql_table` is unavailable or causes validation issues, fallback to a rectangle with structured text.

### Relationships

Use directional edges from dependent table to principal table.

Labels must include relationship cardinality and FK name when known:

```d2
Offers.ClientId -> Clients.Id: "N:1 FK_Offers_Clients_ClientId"
```

Use these cardinality labels:

- `1:1`
- `1:N`
- `N:1`
- `N:N`
- `owned`

### Owned Types

Owned types default to inline rendering.

Inline example:

```d2
Clients: {
  shape: sql_table
  Id: uuid {constraint: primary_key}
  Address.Street: text
  Address.ZipCode: text
  Address.City: text
}
```

If the user chooses `separate`, represent owned types as visually subordinate tables and use an `owned` relationship.

### Many-to-Many

Default to explicit join tables because EF Core creates real tables.

For implicit many-to-many relationships, create a generated join table node and mark it as `implicit join`.

### Technical Tables

Hide technical tables by default unless requested.

Examples:

- `__EFMigrationsHistory`
- Hangfire tables
- ASP.NET Identity tables
- Audit logs
- Outbox tables

If technical tables are hidden, mention them in the summary after the diagram.

## Grouping Modes

- `bounded-context`: group by detected domain area or folder/module.
- `schema`: group by database schema, e.g. `public`, `auth`, `billing`.
- `namespace`: group by C# namespace.
- `flat`: no containers, all tables at the same level.

## Style Rules

Use consistent styles:

- Primary entity tables: solid border.
- Join tables: dashed border.
- Owned types: lighter stroke or nested inline fields.
- Technical tables: muted style.
- External tables or migration-only tables: dotted border.
- Required relationships: solid line.
- Optional relationships: dashed line.
- Cascade delete: label suffix `cascade`.

## Quality Gate Before Delivery

Before delivering the diagram, verify:

- [ ] The selected DbContext is clear.
- [ ] All `DbSet<T>` entities are considered.
- [ ] Fluent API configurations are read.
- [ ] Migrations are checked when present.
- [ ] Table names and schema names match EF Core mapping.
- [ ] Primary keys are present.
- [ ] Foreign keys and cardinalities are represented.
- [ ] Owned types are handled according to user choice.
- [ ] Many-to-many join tables are explicit unless the user asked otherwise.
- [ ] Hidden technical tables are listed in the final summary.
- [ ] D2 syntax is valid with `d2 fmt`.
- [ ] Edge endpoints use full dot-notation when inside containers.
- [ ] The diagram remains readable and avoids crossing-heavy layouts.

## Output Format

When the user asks for a skill installation, provide this folder structure:

```text
.github/
  skills/
    efcore-d2-db-diagram/
      SKILL.md
      references/
        efcore-model-extraction.md
        d2-erd-style.md
        relationship-rules.md
        grouping-modes.md
        quality-gate.md
```

When the user asks to generate a diagram, provide:

1. The `.d2` source file content.
2. The render command using the selected layout engine.
3. A concise summary of assumptions and hidden tables.
