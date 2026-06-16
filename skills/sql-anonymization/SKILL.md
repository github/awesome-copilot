---
name: 'sql-anonymization'
description: 'Skill for sql-anonymization workflows and guidance.'
---

# SQL Anonymization Skill

**Version:** 2.0
**Status:** Production-Ready
**Domain:** Database Security & Privacy
**Use Case:** Generate shareable SQL exports without hardcoding project-specific values.

---

## Overview

This skill anonymizes SQL Server export files using **dynamic discovery** instead of fixed lists.
It does not assume database names, users, schemas, or organization codes ahead of time.

The anonymizer scans SQL text, detects sensitive identifiers by pattern/context, and applies deterministic replacements while preserving SQL structure.

---

## What Is Anonymized

| Category | Detection Strategy | Replacement Pattern |
|---|---|---|
| Databases | `USE`, `CREATE/ALTER/DROP DATABASE`, 3-part names | `DATABASE_1`, `DATABASE_2` |
| Schemas | `CREATE/ALTER SCHEMA`, 2-part names, `SCHEMA::` | `SCHEMA_1`, `SCHEMA_2` |
| Domain users | `DOMAIN\\user` principals | `DOMAIN_n\\USER_n` |
| SQL principals | `CREATE LOGIN/USER`, `FOR LOGIN`, `ALTER USER` | `PRINCIPAL_n` |
| Emails | Email regex | `user_n@example.com` |
| Windows paths | Path regex (`C:\\...`, `D:\\...`) | `D:\\PATH_n` |
| SQL identifiers | Bracketed identifiers (`[name]`) not excluded/system | `[IDENTIFIER_n]` |
| Custom exact values | `exact_replacements` from JSON | User-defined |

---

## Quick Start

```powershell
python .github/skills/sql-anonymization/anonymize_sql.py `
  -i input/db.sql `
  -o input/db_anonymized.sql
```

Verbose run with custom mappings:

```powershell
python .github/skills/sql-anonymization/anonymize_sql.py `
  -i input/db.sql `
  -o input/db_anonymized.sql `
  -m .github/skills/sql-anonymization/example_custom_mappings.json `
  -v
```

---

## Output

```
input/
├── db.sql
├── db_anonymized.sql
└── anonymization_mappings.json
```

`anonymization_mappings.json` includes all generated substitutions for traceability.

---

## Custom Mapping File

Optional JSON keys:

```json
{
  "exact_replacements": {
    "MY_INTERNAL_NAME": "PROJECT_DEMO"
  },
  "exclude_schemas": ["dbo", "sys"],
  "exclude_databases": ["master", "msdb"]
}
```

Notes:
- `exact_replacements` is applied first.
- Exclusions prevent anonymizing known system/shared identifiers.

---

## CLI Options

| Flag | Description | Default |
|---|---|---|
| `-i, --input` | Input SQL file path | `input/db.sql` |
| `-o, --output` | Output SQL file path | `input/db_anonymized.sql` |
| `-m, --mappings` | Optional JSON config | none |
| `--encoding` | Input/output encoding | `utf-16` |
| `-v, --verbose` | Print per-category details | `False` |

---

## Safety Notes

- Run on exported copies, never directly on production systems.
- This tool anonymizes text in SQL files; it does not connect to SQL Server.
- Always review output and mapping JSON before external sharing.

---

## Troubleshooting

### Encoding mismatch

```powershell
python .github/skills/sql-anonymization/anonymize_sql.py -i input/db.sql -o input/db_anonymized.sql --encoding utf-8
```

### Need explicit replacements

Provide `-m` with `exact_replacements` for project-specific tokens that cannot be inferred from patterns.

### Very large files

Run with `-v` first to understand category volume and tune custom exclusions.

---

## Related Skills

- `security-loop` — applies security review after anonymization
- `documentation-recovery` — recovers documentation from anonymized exports
- `migration-scripting` — generates migration scripts from anonymized SQL
