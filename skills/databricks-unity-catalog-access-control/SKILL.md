---
name: databricks-unity-catalog-access-control
description: 'Design and review Databricks Unity Catalog access control: RBAC via GRANT/REVOKE and privilege inheritance, ABAC via governed-tag policies (CREATE POLICY), manual row filters and column masks, plus system.access audit queries to answer who can access a catalog, schema, table, or column.'
---

# Databricks Unity Catalog Access Control

## When to Use This Skill

Use this skill when you need to:

- Write or review `GRANT`/`REVOKE` DDL for a Unity Catalog catalog, schema, table, volume, or function.
- Decide between RBAC (grants), manual row filters/column masks, or tag-driven ABAC policies for a governance requirement.
- Debug why a user or service principal can't see rows or columns they should be able to (or can see ones they shouldn't).
- Design governance that automatically applies to new tables as they're tagged, instead of wiring access control by hand per table.
- Audit who has access to a securable, or review recent grant/revoke activity.

## Privilege Model & Inheritance

Unity Catalog securables form a hierarchy: **metastore → catalog → schema → table/volume/function**. A privilege granted at a higher level is required to reach anything below it — `SELECT` on a table is not enough on its own:

```sql
GRANT USE CATALOG ON CATALOG analytics TO `data_readers`;
GRANT USE SCHEMA ON SCHEMA analytics.gold TO `data_readers`;
GRANT SELECT ON SCHEMA analytics.gold TO `data_readers`;
```

`USE CATALOG` and `USE SCHEMA` are gate privileges: without them, a `SELECT` grant on the table itself is silently useless. This is the single most common "why can't this user query the table" cause — see [Common Pitfalls](#common-pitfalls).

Ownership (`OWNER`) is a separate, powerful privilege: an owner can grant/revoke on the object and, for row filters and column masks, the UDF that implements the policy runs **with the owner's authority**, not the caller's.

```sql
ALTER TABLE analytics.gold.customers OWNER TO `data_platform_admins`;
```

Full privilege list, per-object-type grant patterns, and good/bad examples: [references/rbac-grants.md](references/rbac-grants.md).

## RBAC: Grants and Ownership

Standard access control is principal-based: grant specific privileges to users, service principals, or (preferred) groups.

```sql
-- Good: grant to a group, narrowest object that satisfies the need
GRANT SELECT ON TABLE analytics.gold.customers TO `data_readers`;

-- Bad: grants ALL PRIVILEGES at the catalog level for a single table's read need
GRANT ALL PRIVILEGES ON CATALOG analytics TO `data_readers`;
```

See [references/rbac-grants.md](references/rbac-grants.md) for the full privilege reference, `SHOW GRANTS`, and revoke patterns.

## ABAC: Tag-Driven Policies vs. Manual Fine-Grained Access

Unity Catalog offers **two** mechanisms for row- and column-level security, and the difference matters:

| Mechanism | How it attaches | Scales to new tables? |
|---|---|---|
| **Manual row filter / column mask** | A UDF, wired to one specific table via `ALTER TABLE ... SET ROW FILTER` / `... SET MASK` | No — must be re-wired on every new table |
| **ABAC policy (`CREATE POLICY`)** | A policy attached once at `METASTORE`/`CATALOG`/`SCHEMA`/`TABLE` level, matching tables and columns by **governed tag** (`MATCH COLUMNS has_tag(...)`, `WHEN has_tag_value(...)`) | Yes — any new table/column that gets the matching tag is automatically governed, no extra DDL |

That auto-apply-via-tags behavior is what makes `CREATE POLICY` genuinely **attribute-based** access control rather than per-object RBAC with manual extras. Prefer it when you're governing a category of data (e.g., "anything tagged `pii=ssn`") across many current and future tables; prefer manual row filters/masks when a single table needs bespoke logic that shouldn't generalize.

`MATCH COLUMNS`/`WHEN` only recognize **governed tags** (created with `CREATE GOVERNED TAG`), not an arbitrary tag set via plain `ALTER TABLE ... SET TAGS` — see the reference file before writing a policy against a new tag key.

Minimal example of each (full syntax, `DROP POLICY`, `SHOW POLICIES`, and privilege requirements in the reference file):

```sql
-- Manual: wired to one table
CREATE OR REPLACE FUNCTION analytics.gold.ssn_mask(ssn STRING)
RETURN CASE WHEN is_account_group_member('pii_readers') THEN ssn
            ELSE 'XXX-XX-' || RIGHT(ssn, 4) END;
ALTER TABLE analytics.gold.customers ALTER COLUMN ssn SET MASK analytics.gold.ssn_mask;

-- ABAC: applies to every column tagged pii='ssn' across the schema, automatically.
-- ssn_mask takes only the masked column itself, so no USING COLUMNS is needed here
-- (USING COLUMNS is only for extra arguments beyond the auto-bound matched column).
CREATE POLICY mask_ssn
ON SCHEMA analytics.gold
COLUMN MASK analytics.gold.ssn_mask
TO us_analysts EXCEPT admins
FOR TABLES
MATCH COLUMNS has_tag_value('pii', 'ssn') AS ssn
ON COLUMN ssn;
```

Full reference: [references/abac-policies-and-fine-grained-access.md](references/abac-policies-and-fine-grained-access.md).

## Common Pitfalls

- **Missing `USE CATALOG`/`USE SCHEMA`.** Granting `SELECT` on a table without the enclosing catalog/schema `USE` privileges leaves the grant inert.
- **Over-granting at the catalog level** for a need that only requires one schema or table — violates least privilege and is hard to unwind later.
- **UDF owner lacks access to its own dependency.** A row filter or mask that reads an entitlements table runs as the table owner — if the owner can't read that table, every query against the governed table fails or misbehaves.
- **Checking grants without checking policies (or vice versa).** A principal can hold a valid `SELECT` grant and still be row-filtered or column-masked by an ABAC policy — always check both when reasoning about "what does this user actually see."
- **Using workspace-local groups in `is_member()`** instead of account groups in `is_account_group_member()` — workspace-local group membership doesn't follow the principal across workspaces and is easy to get out of sync.

## Auditing Access

```sql
GRANT USE CATALOG ON CATALOG system TO `data_engineers`;
GRANT USE SCHEMA ON SCHEMA system.access TO `data_engineers`;
GRANT SELECT ON SCHEMA system.access TO `data_engineers`;

-- Who can access this table right now? Check grants AND policies.
SHOW GRANTS ON TABLE analytics.gold.customers;
SHOW EFFECTIVE POLICIES ON TABLE analytics.gold.customers;

-- Recent grant/revoke activity
SELECT event_time, user_identity.email, action_name, request_params
FROM system.access.audit
WHERE action_name LIKE '%GRANT%' OR action_name LIKE '%REVOKE%'
ORDER BY event_time DESC
LIMIT 100;
```

More audit patterns, including lineage-aware "who can reach this data downstream" queries: [references/audit-queries.md](references/audit-queries.md).

## Review Checklist

- [ ] Grants are made to groups (or service principals), not individual users, wherever possible.
- [ ] Least privilege: the narrowest securable and privilege set that satisfies the need.
- [ ] `USE CATALOG`/`USE SCHEMA` granted alongside every object-level grant that needs it.
- [ ] Ownership is set deliberately, and the owner has access to anything a row filter/mask UDF reads.
- [ ] New row filters, masks, or ABAC policies were tested by querying as a **non-privileged** principal, not just verified by inspection.
- [ ] For ABAC policies: the governed tags are applied consistently, and `SHOW EFFECTIVE POLICIES` was checked on a representative table.
- [ ] An audit query (`system.access.audit`) was run before granting broad or catalog-level access, to confirm it's actually needed.
