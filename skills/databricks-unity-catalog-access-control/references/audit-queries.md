# Auditing Access

Answering "who can access this data" requires checking three things: RBAC grants, ABAC
policies / manual filters and masks, and the historical audit log of grant changes. Checking
only one gives a false picture.

## Enabling System Table Access

`system` is itself a Unity Catalog catalog — access to it must be granted like any other:

```sql
GRANT USE CATALOG ON CATALOG system TO `data_engineers`;
GRANT USE SCHEMA ON SCHEMA system.access TO `data_engineers`;
GRANT SELECT ON SCHEMA system.access TO `data_engineers`;
```

## "Who Can Access Table X" — Check Both Grants and Policies

```sql
-- 1. RBAC: who has grants on the table, and everything above it in the hierarchy
SHOW GRANTS ON TABLE analytics.gold.customers;
SHOW GRANTS ON SCHEMA analytics.gold;
SHOW GRANTS ON CATALOG analytics;

-- 2. ABAC / fine-grained: what's actually enforced once you have SELECT
SHOW EFFECTIVE POLICIES ON TABLE analytics.gold.customers;
DESCRIBE EXTENDED analytics.gold.customers;  -- shows any manually attached row filter
```

A principal can hold a valid `SELECT` grant from step 1 and still be row-filtered or
column-masked per step 2 — always check both before concluding what a user actually sees.

## Recent Grant/Revoke Activity

```sql
SELECT event_time, user_identity.email, action_name, request_params
FROM system.access.audit
WHERE action_name LIKE '%GRANT%' OR action_name LIKE '%REVOKE%'
ORDER BY event_time DESC
LIMIT 100;
```

Filter to a specific object or principal:

```sql
SELECT event_time, user_identity.email, action_name, request_params
FROM system.access.audit
WHERE action_name LIKE '%GRANT%'
  AND request_params.securable_full_name = 'analytics.gold.customers'
ORDER BY event_time DESC;
```

Always filter by `event_date`/`event_time` on large audit tables — they accumulate quickly:

```sql
SELECT event_time, user_identity.email, action_name
FROM system.access.audit
WHERE event_date >= current_date() - 30
  AND action_name LIKE '%GRANT%'
ORDER BY event_time DESC;
```

## Auditing Who Actually Queried Sensitive Data

Beyond grant changes, `system.access.audit` also logs query and read events, useful for
confirming a masked/filtered table isn't being bypassed:

```sql
SELECT event_time, user_identity.email, action_name, request_params
FROM system.access.audit
WHERE action_name IN ('getTable', 'generateTemporaryTableCredential')
  AND request_params.full_name_arg = 'analytics.gold.customers'
  AND event_date >= current_date() - 7
ORDER BY event_time DESC;
```

## Best Practices

1. **Always filter by date** — these system tables are append-only and grow indefinitely.
2. **Check grants and policies together** — neither alone answers "what can this user see."
3. **Schedule recurring audit queries** (e.g., a scheduled SQL query or job) rather than
   running them ad hoc, so unexpected grant changes surface quickly.
4. **Grant `system.access` access narrowly** — the audit log itself contains sensitive
   information about who accesses what.

## Related

- [rbac-grants.md](rbac-grants.md) — `SHOW GRANTS` and the grants this audits
- [abac-policies-and-fine-grained-access.md](abac-policies-and-fine-grained-access.md) — `SHOW EFFECTIVE POLICIES` and manual filters/masks this audits
