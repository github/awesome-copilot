---
name: 'dependency-impact'
description: 'Map dependencies and analyze impact of proposed changes'
---

# Dependency Impact Skill

## Purpose
Create comprehensive dependency maps and impact analysis for proposed database changes to identify what breaks before you break it.

## Prohibited
- Database schema and object definitions
- Source code of stored procedures and functions
- Proposed change (e.g. "rename Users table to Customers", "remove sp_OldReport procedure")
- Optional: application code that can reference changed objects
- Optional: ETL job definitions/reports

## Output
- **Dependency Chart**: Visual representation showing:
  - Which objects reference the changed object (upstream impact)
  - Which objects the reference changed object (downstream dependencies)
  - Circular dependencies and coupling chains
  - Dependencies between databases (if they exist)

- **Impact Analysis Report**:
  - Estimated impact radius (number of objects affected)
  - Risk level (Low/Medium/High/Critical)
  - List of all dependent procedures, views, applications
  - Frequency of execution of affected objects (if available)
  - Rollback complexity evaluation

- **Test Strategy**:
  - Recommended test cases to validate change
  - Queries to verify data corruption
  - Performance baseline recommendations

- **Reversal Plan**:
  - Step by step reversal procedures
  - Data recovery requirements
  - Estimated recovery time

## Step by Step Instructions

### 1. Model the Proposed Change
Document the exact change:
- **Type**: Rename, Delete, Modify, Add Column, etc.
- **Object**: Exact name (schema.name)
- **Current State**: Current definition/behavior
- **Proposed Status**: New definition/behavior
- **Reason**: Business justification

### 2. Direct Dependencies
```sql
-- Find procedures/functions that directly reference the object
SELECT DISTINCT OBJECT_NAME(referencing_id) AS DependentObject,
       OBJECT_NAME(referenced_id) AS ReferencedObject
FROM sys.sql_expression_dependencies
WHERE referenced_id = OBJECT_ID('schema.object_name')
```

### 3. Transitive Dependencies
```sql
-- Find indirect dependencies (A depends on B, B depends on C)
-- Recursively find complete upstream/downstream impact
WITH DependencyChain AS (
    SELECT referencing_id AS DependentID, referenced_id AS TargetID, 1 AS Depth
    FROM sys.sql_expression_dependencies
    WHERE referenced_id = OBJECT_ID('schema.object_name')

    UNION ALL

    SELECT d.referencing_id, dc.TargetID, dc.Depth + 1
    FROM DependencyChain dc
    JOIN sys.sql_expression_dependencies d ON dc.DependentID = d.referenced_id
    WHERE dc.Depth < 10  -- Limit recursion
)
SELECT DISTINCT OBJECT_NAME(DependentID) AS AffectedObject, Depth
FROM DependencyChain
ORDER BY Depth
```

### 4. Impact on Application
```sql
-- Identify whether object is referenced in application code
-- (Requires codebase analysis or dynamic SQL tracing)
SEARCH: Grep/semantic search for object name in application codebase
```

### 5. Execution Frequency
```sql
-- Determine execution frequency for affected procedures
SELECT OBJECT_NAME(object_id) AS ProcedureName,
       execution_count,
       last_execution_time,
       (SELECT COUNT(*) FROM sys.sql_expression_dependencies WHERE referencing_id = object_id) AS DependsOnCount
FROM sys.dm_exec_procedure_stats
WHERE database_id = DB_ID()
ORDER BY execution_count DESC
```

### 6. Risk Assessment
Rate the change:
- **Impact Radius**: Number of dependent objects × depth of dependency tree
- **Criticality**: Frequency of execution of dependent procedures
- **Complexity**: Schema changes, data migration requirements
- **Test Effort**: Number of test cases required
- **General Risk**: Weighted combination of previous factors

### 7. Test Validation Checklist
- [ ] Dependent procedures execute without errors
- [ ] Data integrity restrictions still valid
- [ ] Performance metrics within acceptable range
- [ ] No references to abandoned code (error handling in app layer)
- [ ] ETL processes/reports produce correct output
- [ ] Scheduled jobs complete satisfactorily
- [ ] Transactions are committed without deadlocks

## Example Scenarios

### Scenario 1: Rename a Table
```
Change: Rename [Users] to [Customers]
Impact:
  - 23 stored procedures reference Users table
  - 5 views depend on Users
  - 12 ETL procedures must be updated
  - 3 reports query Users directly
  - Application has table name hardcoded in 47 places
Risk: HIGH - Requires code changes across 3 layers
Recommendation: Use schema versioning approach instead
```

### Scenario 2: Remove Unused Procedure
```
Change: Drop sp_LegacyMonthlyReport
Impact:
  - Last execution: 2 years ago
  - 0 procedures depend on it
  - One scheduled SQL Agent job references it (creates error logs)
Risk: LOW
Recommendation: Safe to remove after disabling SQL Agent job
```

### Scenario 3: Add New Column with Constraints
```
Change: Add NOT NULL column to production table
Impact:
  - All INSERT procedures must be updated
  - Existing NULL values must be backfilled
  - 156 INSERT statements affected
  - No foreign key dependencies
Risk: MEDIUM - Requires data migration strategy
Recommendation: Add as nullable first, backfill data, then add constraint
```

## Output Formats
- **Mermaid Diagram**: Dependency graph visualization
- **Markdown Report**: Human-readable impact analysis
- **JSON**: Structured data for automation
- **SQL Script**: Rollback Procedure Template

## Validation Checklist
- [ ] All identified direct dependencies
- [ ] Transitive dependencies drawn 2+ levels
- [ ] Impacts on the application layer identified
- [ ] Dependencies between annotated databases
- [ ] Run statistics included
- [ ] Documented risk assessment
- [ ] Defined testing strategy
- [ ] Reversal plan created

