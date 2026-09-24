# RBAC: Grants, Privileges, and Ownership

Full reference for role/principal-based access control in Unity Catalog. Layer this with
[abac-policies-and-fine-grained-access.md](abac-policies-and-fine-grained-access.md) when you also need row- or column-level rules.

## Securable Hierarchy

```
metastore
└── catalog
    └── schema
        ├── table
        ├── view
        ├── volume
        └── function
```

A privilege at a given level only takes effect if the principal also holds the necessary
"gate" privilege at every level above it:

| Level | Gate privilege |
|---|---|
| Catalog | `USE CATALOG` |
| Schema | `USE SCHEMA` |

Without `USE CATALOG` on the catalog and `USE SCHEMA` on the schema, a `SELECT` grant on a
table inside them is inert — this is the most common cause of "the grant exists but the user
still can't see the table."

## Privilege Reference by Object Type

| Object | Common privileges |
|---|---|
| Catalog | `USE CATALOG`, `CREATE SCHEMA`, `ALL PRIVILEGES` |
| Schema | `USE SCHEMA`, `CREATE TABLE`, `CREATE VOLUME`, `CREATE FUNCTION`, `CREATE VIEW`, `ALL PRIVILEGES` |
| Table / View | `SELECT`, `MODIFY`, `ALL PRIVILEGES` |
| Volume | `READ VOLUME`, `WRITE VOLUME`, `ALL PRIVILEGES` |
| Function | `EXECUTE`, `ALL PRIVILEGES` |
| Any securable | `MANAGE` (create/alter/drop policies, manage grants without being owner) |

`ALL PRIVILEGES` grants every privilege applicable to that object type — use sparingly; it's
usually broader than the actual need.

## Granting and Revoking

```sql
-- Grant read access on a schema to a group (requires the gate privileges too)
GRANT USE CATALOG ON CATALOG analytics TO `data_readers`;
GRANT USE SCHEMA ON SCHEMA analytics.gold TO `data_readers`;
GRANT SELECT ON SCHEMA analytics.gold TO `data_readers`;

-- Grant at the table level only (narrower than schema-wide SELECT)
GRANT SELECT ON TABLE analytics.gold.customers TO `data_readers`;

-- Grant to a service principal
GRANT SELECT ON TABLE analytics.gold.customers TO `sp-etl-pipeline`;

-- Revoke
REVOKE SELECT ON SCHEMA analytics.gold FROM `data_readers`;
```

### Good vs. Bad Patterns

```sql
-- Good: narrowest object, granted to a group
GRANT SELECT ON TABLE analytics.gold.customers TO `data_readers`;

-- Bad: catalog-wide ALL PRIVILEGES for a read-only need on one table
GRANT ALL PRIVILEGES ON CATALOG analytics TO `data_readers`;

-- Bad: granting to individual users instead of a group
GRANT SELECT ON TABLE analytics.gold.customers TO `alice@example.com`;
```

Prefer groups over individual users so access changes when group membership changes, not by
hunting down per-user grants later.

## Ownership

```sql
ALTER TABLE analytics.gold.customers OWNER TO `data_platform_admins`;
```

The owner:
- Can grant/revoke privileges on the object without needing an explicit `MANAGE` grant.
- Is the identity that row-filter/column-mask UDFs run **as** when attached to the object —
  the owner needs access to anything those UDFs read (e.g., an entitlements table).

## Inspecting Grants

```sql
SHOW GRANTS ON CATALOG analytics;
SHOW GRANTS ON SCHEMA analytics.gold;
SHOW GRANTS ON TABLE analytics.gold.customers;

-- Everything a specific principal was granted on one object (always requires ON <object>;
-- there is no bare "show everything granted to X across every object" form)
SHOW GRANTS `data_readers` ON TABLE analytics.gold.customers;
```

`SHOW GRANTS` only shows RBAC grants — it does not show ABAC policies or manual row
filters/masks that may further restrict what a grantee actually sees. See
[abac-policies-and-fine-grained-access.md](abac-policies-and-fine-grained-access.md) and
[audit-queries.md](audit-queries.md) for the full picture.
