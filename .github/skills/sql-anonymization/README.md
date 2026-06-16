# SQL Anonymization Skill

Quick reference for generic SQL anonymization.

## Quick Start

```bash
python .github/skills/sql-anonymization/anonymize_sql.py \
  -i input/db.sql \
  -o input/db_anonymized.sql \
  -v
```

## Optional Custom Rules

```bash
python .github/skills/sql-anonymization/anonymize_sql.py \
  -i input/db.sql \
  -o input/db_anonymized.sql \
  -m .github/skills/sql-anonymization/example_custom_mappings.json
```

## Output

- `db_anonymized.sql`: shareable SQL export
- `anonymization_mappings.json`: generated mapping reference

## Dynamic Coverage

- Database identifiers
- Schema identifiers
- Domain/user principals
- SQL logins/users
- SQL identifiers in brackets (tables, columns, constraints, indexes)
- Email addresses
- Windows paths
- Any custom exact replacements from JSON

## Encoding

- Default: `utf-16`
- Override: `--encoding utf-8`

See [SKILL.md](SKILL.md) for complete details.
