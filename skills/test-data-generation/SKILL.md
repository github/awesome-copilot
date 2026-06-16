---
name: 'test-data-generation'
description: 'Skill to generate realistic synthetic data and anonymize production subsets for testing'
---

# Secure Test Data Generation

## Purpose
Create test data that respects real constraints, relationships, and distributions without exposing sensitive production information.

## Inputs
- Target database schema
- Desired volume (number of rows per table)
- Columns or tables with data sensitive to anonymization
- Specific test scenarios (optional)

## Outputs
- Synthetic data generation script
- Anonymization script for production subsets
- Constraints and relationships coverage report
- Security note confirming absence of real data

## Steps

### 1. Inventory of constraints and relationships
```sql
SELECT
    fk.name AS clave_foranea,
    OBJECT_NAME(fk.parent_object_id) AS tabla_hijo,
    COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS columna_hijo,
    OBJECT_NAME(fk.referenced_object_id) AS tabla_padre,
    COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS columna_padre
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
ORDER BY tabla_padre, tabla_hijo;
```

### 2. Identification of sensitive columns
- Detects columns with names that suggest personal data (email, name, ID, telephone, address)
- Mark columns for mandatory anonymization

### 3. Anonymization strategies by type
| Type | Strategy |
|------|-----------|
| Email | user_[ID]@test.test |
| Name | Name_[short hash] |
| Telephone | 000-000-[4 random digits] |
| NIF/DNI | 00000000X |
| Address | Test Street [number] |
| Dates | Shift ±N days random |
| Amounts | Multiply by random factor [0.8-1.2] |

### 4. Integrity validation
- Check FK integrity after generation
- Confirm that no data generated matches production
- Execute security preflight on the generated dataset

## Quality Checklist
- [ ] All FKs respected in insertion order
- [ ] Sensitive columns anonymized without exception
- [ ] Validated dataset: no real identifiable data
- [ ] Script idempotente (truncate + insert)
- [ ] Security preflight executed upon departure
