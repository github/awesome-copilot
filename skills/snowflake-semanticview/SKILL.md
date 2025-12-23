---
name: snowflake-semanticview
description: Create, alter, and validate Snowflake semantic views using Snowflake CLI (snow). Use when asked to build or troubleshoot semantic views/semantic layer definitions with CREATE/ALTER SEMANTIC VIEW, to validate semantic-view DDL against Snowflake via CLI, or to guide Snowflake CLI installation and connection setup.
---

# Snowflake Semantic Views

## One-Time Setup

- Verify Snowflake CLI installation by opening a new terminal and running `snow --help`.
- If Snowflake CLI is missing or the user cannot install it, direct them to https://docs.snowflake.com/en/developer-guide/snowflake-cli/installation/installation.
- Configure a Snowflake connection with `snow connection add` per https://docs.snowflake.com/en/developer-guide/snowflake-cli/connecting/configure-connections#add-a-connection.
- Use the configured connection for all validation and execution steps.

## Workflow For Each Semantic View Request

1. Confirm the target database, schema, role, warehouse, and final semantic view name.
2. Confirm the model follows a star schema (facts with conformed dimensions).
3. Draft the semantic view DDL using the official syntax:
   - https://docs.snowflake.com/en/sql-reference/sql/create-semantic-view
4. Populate synonyms and comments for each dimension, fact, and metric:
   - Read Snowflake table/view/column comments first (preferred source):
     - https://docs.snowflake.com/en/sql-reference/sql/comment
   - If comments or synonyms are missing, ask whether you can create them, whether the user wants to provide text, or whether you should draft suggestions for approval.
5. Create a temporary validation name (for example, append `__tmp_validate`) while keeping the same database and schema.
6. Always validate by sending the DDL to Snowflake via Snowflake CLI before finalizing:
   - Use `snow sql` to execute the statement with the configured connection.
   - If flags differ by version, check `snow sql --help` and use the connection option shown there.
7. If validation fails, iterate on the DDL and re-run the validation step until it succeeds.
8. Apply the final DDL (create or alter) using the real semantic view name.
9. Clean up any temporary semantic view created during validation.

## Synonyms And Comments (Required)

- Use the semantic view syntax for synonyms and comments:

```
WITH SYNONYMS [ = ] ( 'synonym' [ , ... ] )
COMMENT = 'comment_about_dim_fact_or_metric'
```

- Treat synonyms as informational only; do not use them to reference dimensions, facts, or metrics elsewhere.
- Use Snowflake comments as the preferred and first source for synonyms and comments:
  - https://docs.snowflake.com/en/sql-reference/sql/comment
- If Snowflake comments are missing, ask whether you can create them, whether the user wants to provide text, or whether you should draft suggestions for approval.
- Do not invent synonyms or comments without user approval.

## Validation Pattern (Required)

- Never skip validation. Always execute the DDL against Snowflake with Snowflake CLI before presenting it as final.
- Prefer a temporary name for validation to avoid clobbering the real view.

## Example CLI Validation (Template)

```bash
# Replace placeholders with real values.
snow sql -q "<CREATE OR ALTER SEMANTIC VIEW ...>" --connection <connection_name>
```

If the CLI uses a different connection flag in your version, run:

```bash
snow sql --help
```

## Notes

- Treat installation and connection setup as one-time steps, but confirm they are done before the first validation.
- Keep the final semantic view definition identical to the validated temporary definition except for the name.
- Do not omit synonyms or comments; consider them required for completeness even if optional in syntax.
