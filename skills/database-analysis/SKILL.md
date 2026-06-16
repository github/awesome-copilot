---
name: 'database-analysis'
description: 'Comprehensive analysis of stored procedures and schema of SQL Server'
---

# Database Analysis Skill

## Purpose
Extracts and catalogs all database objects, their properties and characteristics from SQL Server environments.

## Prohibited
- SQL Server connection string or credentials
- Name(s) of database to analyze
- Scope: specific schema or complete database
- Optional: filter by object type (procedures, functions, tables, views)

## Output
- **Schema Inventory**: Complete list of all objects with properties
  - Tables: name, columns (type, nullable, default), primary keys, indexes
  - Stored Procedures: parameters, return values, estimated logic complexity
  - Views: dependency chain, column mapping
  - Functions: scalars/table-valued, parameters, return types
  - Indexes: type (clustered, non-clustered), columns, usage statistics

- **Metadata Documentation**: For each object:
  - Creation date, last modification date
  - Disk/memory size
  - Execution statistics (if available)
  - Referenced objects (tables, procedures, functions)

- **Analysis Report**:
  - Count of objects by type
  - Schema complexity metrics
  - Dead code candidates (unused procedures/functions)
  - Performance hotspots

## Step by Step Instructions

### 1. Connect & Authenticate
```sql
-- Verify connection to target database
SELECT DB_NAME() AS [Database], @@SERVERNAME AS [Server]
```

### 2. Extract Objects from Schema
```sql
-- Get all tables, views, stored procedures, and functions
SELECT
    OBJECT_NAME(object_id) AS [Name],
    CASE type WHEN 'U' THEN 'Table' WHEN 'V' THEN 'View'
             WHEN 'P' THEN 'Procedure' WHEN 'FN' THEN 'Function' END AS [Type],
    create_date, modify_date
FROM sys.objects
WHERE database_id = DB_ID()
```

### 3. Analyze Table Structure
```sql
-- Extract table columns, constraints, and indexes
SELECT t.name AS TableName, c.name AS ColumnName, ty.name AS DataType,
       c.max_length, c.is_nullable, c.is_identity
FROM sys.tables t
JOIN sys.columns c ON t.object_id = c.object_id
JOIN sys.types ty ON c.user_type_id = ty.user_type_id
```

### 4. Extract Procedure/Function Code
```sql
-- Get stored procedure and function definitions
SELECT object_id, definition FROM sys.sql_modules WHERE object_id = OBJECT_ID('nombre_procedure')
```

### 5. Map References & Dependencies
```sql
-- Find which objects reference which
SELECT OBJECT_NAME(referencing_id) AS ReferencingObject,
       OBJECT_NAME(referenced_id) AS ReferencedObject
FROM sys.sql_expression_dependencies
```

### 6. Identify Unused Objects
```sql
-- Find stored procedures with zero execution count
SELECT name FROM sys.procedures p
LEFT JOIN sys.dm_exec_procedure_stats s ON p.object_id = s.object_id
WHERE s.object_id IS NULL
```

## Example of Use

**Scenario 1: Complete Database Audit**
- Input: Connection to production SQL Server, 'LegacyERP' database
- Output: Catalog of 3,200+ objects with modification dates, usage statistics
- Use Case: Understand database complexity before modernization

**Scenario 2: Procedure Analysis**
- Input: Specific Stored procedure 'sp_MonthlyClosing'
- Output: Procedure definition, all parameters, referenced tables/procedures, execution count
- Use Case: Evaluate criticality and dependencies of critical ETL

**Scenario 3: Dead Code Detection**
- Entry: Database with performance problems
- Output: List of unused procedures, obsolete functions, abandoned tables
- Use Case: Remove technical debt without affecting production

## Output Formats

- **JSON**: Structured data for automation
- **HTML Report**: Executive-friendly Dashboard
- **SQL Script**: Re-executable analysis queries

## Requirements
- Read access to SQL Server system catalog views (sys.objects, sys.columns, etc.)
- Access to sys.dm_* DMV queries for execution statistics
- No write permissions required (read analysis only)

## Troubleshooting
- **"Permission denied on sys.dm_exec_procedure_stats"**: Limited to procedures executed by current user
- **"Cannot find procedure X"**: Verify that schema name is included (dbo.procedure_name)
- **"Execution stats are NULL"**: The procedure may not have been executed since restarting SQL Server

