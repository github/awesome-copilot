# ABAC Policies and Manual Fine-Grained Access

Row- and column-level security in Unity Catalog comes in two forms: **manual** row filters
and column masks wired to one table at a time, and **ABAC policies**, which attach once and
apply automatically to every table/column matching a governed tag. Both layer *on top of*
RBAC grants — a principal still needs `SELECT` (see [rbac-grants.md](rbac-grants.md)); these
mechanisms then restrict which rows and column values that principal sees.

## Identity Functions

Used inside filter/mask UDFs and ABAC policy conditions to identify the calling principal:

| Function | Returns |
|---|---|
| `current_user()` | The querying user's email/identity |
| `is_account_group_member('grp')` | `TRUE` if the caller is in account group `grp` — prefer this form |
| `is_member('grp')` | `TRUE` if the caller is in a workspace-local group — avoid; doesn't follow the principal across workspaces |

## Manual Row Filters and Column Masks

These are UDFs attached directly to one table. There is no standalone `CREATE ROW FILTER` or
`CREATE MASK` statement — you create a regular function, then attach it with `ALTER TABLE`.

### Row Filter

A row filter is a UDF returning `BOOLEAN`; rows where it returns `TRUE` are visible.

```sql
CREATE OR REPLACE FUNCTION analytics.gold.region_row_filter(region STRING)
RETURN is_account_group_member('region_admins')
    OR is_account_group_member(concat('region_', lower(region)));

ALTER TABLE analytics.gold.sales SET ROW FILTER analytics.gold.region_row_filter ON (region);

DESCRIBE EXTENDED analytics.gold.sales;   -- confirm the filter is attached
ALTER TABLE analytics.gold.sales DROP ROW FILTER;
```

A more realistic version joins the caller to an entitlements table instead of hardcoding
group-per-region naming:

```sql
CREATE OR REPLACE FUNCTION analytics.gold.region_row_filter(region STRING)
RETURN is_account_group_member('region_admins')
    OR EXISTS (
         SELECT 1 FROM analytics.security.user_region_map m
         WHERE m.user_email = current_user() AND m.region = region
       );
```

### Column Mask

A column mask is a UDF whose first parameter is the column being masked; its return value
replaces the column for unauthorized callers.

```sql
CREATE OR REPLACE FUNCTION analytics.gold.ssn_mask(ssn STRING)
RETURN CASE
  WHEN is_account_group_member('pii_readers') THEN ssn
  ELSE 'XXX-XX-' || RIGHT(ssn, 4)
END;

ALTER TABLE analytics.gold.customers ALTER COLUMN ssn SET MASK analytics.gold.ssn_mask;

-- Masks can take extra arguments from other columns via USING COLUMNS
CREATE OR REPLACE FUNCTION analytics.gold.email_mask(email STRING, tier STRING)
RETURN CASE
  WHEN is_account_group_member('pii_readers') THEN email
  WHEN tier = 'public' THEN email
  ELSE regexp_replace(email, '^[^@]+', '****')
END;

ALTER TABLE analytics.gold.customers
  ALTER COLUMN email SET MASK analytics.gold.email_mask USING COLUMNS (tier);

ALTER TABLE analytics.gold.customers ALTER COLUMN ssn DROP MASK;
```

> The mask/filter UDF runs with the **table owner's** authority. The owner needs access to
> anything the UDF reads (e.g., the entitlements table) — callers do **not** need `EXECUTE`
> on the UDF; Unity Catalog invokes the policy automatically.

### Manual Mechanism: Best Practices

1. Grants first — `SELECT` is still required; filters/masks narrow, they don't grant.
2. Use account groups in `is_account_group_member()`, not individuals or workspace-local groups.
3. Centralize entitlements in a maintained mapping table rather than hardcoded conditions.
4. Test as a **non-privileged** user — verify masked/filtered output with an account that is
   not in the privileged group, not just by reading the DDL.

## ABAC Policies (`CREATE POLICY`)

An ABAC policy attaches at `METASTORE`, `CATALOG`, `SCHEMA`, or `TABLE` level and matches
tables/columns dynamically by **governed tag**, so it applies automatically to new objects
without any further DDL — this is what distinguishes it from the manual mechanism above.

### Prerequisite: the tag must be a governed tag, not just any `SET TAGS` key

`MATCH COLUMNS has_tag(...)` / `has_tag_value(...)` and `WHEN has_tag_value(...)` only
recognize **governed tags** — account-level tag definitions with an enforced set of allowed
values and a permission model for who may assign them. An ordinary ad-hoc tag applied with
`ALTER TABLE ... SET TAGS ('some_key' = 'some_value')` is *not* enough; referencing an
ungoverned key in a policy condition fails with `Unknown tag policy key`.

Create the governed tag first, then assign it like any other tag:

```sql
-- Requires account-level CREATE privilege (account admins and workspace admins have it by default)
CREATE GOVERNED TAG pii
DESCRIPTION 'Indicates what kind of personal identifiable information the asset contains'
VALUES ('ssn', 'ccn', 'dob');

-- Assigning a governed tag's value requires the ASSIGN privilege on that tag
ALTER TABLE analytics.gold.customers ALTER COLUMN ssn SET TAGS ('pii' = 'ssn');
```

Tags applied at a catalog or schema level are inherited by everything beneath them, so a
governed tag on a schema automatically covers every table added to it later. Newly created
governed tags may take a short time to propagate before a policy referencing them can be
created — if `CREATE POLICY` reports `Unknown tag policy key` immediately after creating the
tag, wait briefly and retry before assuming the tag key is wrong.

A `PERMISSION_DENIED ... not authorized to update the tag assignment for the following tag
policies` error on `SET TAGS` means the governed tag exists but you lack `ASSIGN` on it —
that's a separate privilege from creating the tag, and from `MANAGE`/ownership on the table
you're tagging. Remove a governed tag with `DROP GOVERNED TAG tag_key` (an account-level
operation; it un-governs, and removes, that tag key everywhere it was assigned).

### Syntax

```sql
CREATE [OR REPLACE] POLICY policy_name
ON { METASTORE | CATALOG catalog_name | SCHEMA schema_name | TABLE table_name }
[COMMENT description]
{ ROW FILTER function_name | COLUMN MASK function_name [ON COLUMN alias] }
TO principal [, ...] [EXCEPT principal [, ...]]
FOR TABLES
[WHEN condition]
[MATCH COLUMNS condition [AS alias] [, ...]]
[USING COLUMNS (function_arg [, ...])]
```

- `MATCH COLUMNS has_tag(...)` / `has_tag_value(...)` selects which tagged columns the policy
  applies to; `WHEN` filters which tables the policy applies to (e.g., by table-level tag).
- `TO ... EXCEPT ...` scopes who the policy governs, mirroring a `GRANT ... TO` list with
  carve-outs.
- `CREATE OR REPLACE POLICY` requires the full definition every time — there is no
  partial-update form.

Both worked examples below assume `sensitivity`, `geo_region`, and `pii` already exist as
**governed tags** (see the prerequisite above) — referencing any of them before they're
created as governed tags fails with `Unknown tag policy key`.

### Row Filter Policy Example

Applies to every table in the schema tagged `sensitivity=high`, filtering by a column tagged
`geo_region`:

```sql
CREATE FUNCTION analytics.gold.non_eu_region(geo_region STRING) RETURNS BOOLEAN
RETURN geo_region <> 'eu';

CREATE POLICY hide_eu_customers
ON SCHEMA analytics.gold
COMMENT 'Exclude rows with European customers from sensitive tables'
ROW FILTER analytics.gold.non_eu_region
TO us_analysts
FOR TABLES
WHEN has_tag_value('sensitivity', 'high')
MATCH COLUMNS has_tag('geo_region') AS region
USING COLUMNS (region);
```

### Column Mask Policy Example

Applies to every column tagged `pii=ssn` anywhere in the schema:

```sql
CREATE FUNCTION analytics.gold.ssn_to_last_nr(ssn STRING, nr INT) RETURNS STRING
RETURN right(ssn, nr);

CREATE POLICY mask_ssn
ON SCHEMA analytics.gold
COLUMN MASK analytics.gold.ssn_to_last_nr
TO us_analysts EXCEPT admins
FOR TABLES
MATCH COLUMNS has_tag_value('pii', 'ssn') AS ssn
ON COLUMN ssn
USING COLUMNS (4);
```

### Managing Policies

```sql
DROP POLICY policy_name ON SCHEMA analytics.gold;

SHOW POLICIES ON SCHEMA analytics.gold;
SHOW EFFECTIVE POLICIES ON TABLE analytics.gold.customers;  -- what actually applies here, including inherited policies

DESCRIBE POLICY mask_ssn ON SCHEMA analytics.gold;
```

`SHOW EFFECTIVE POLICIES` is the important one when debugging: it resolves everything
inherited from `METASTORE`/`CATALOG`/`SCHEMA` level down to the table you're checking.

### Required Privileges

| Action | Privilege needed |
|---|---|
| Create / edit / delete a policy | `MANAGE` on the securable, or ownership of it |
| View policies | `MANAGE` or `READ METADATA` on the securable, or ownership |
| Reference a UDF in a policy | `EXECUTE` on that UDF |
| Create a metastore-level policy | Metastore admin |

## Choosing Between the Two Mechanisms

- **One table needs bespoke logic that shouldn't generalize** → manual row filter / column mask.
- **A category of data, defined by tags, needs consistent protection now and on future tables**
  → ABAC policy. Tag new tables correctly and they're governed automatically.
- **Both can coexist** on the same table; when reasoning about what a principal sees, check
  both `SHOW EFFECTIVE POLICIES` and any manually attached filter/mask via `DESCRIBE EXTENDED`.

## Related

- [rbac-grants.md](rbac-grants.md) — the underlying grants both mechanisms layer on top of
- [audit-queries.md](audit-queries.md) — verifying who can actually access a securable, accounting for both grants and policies
