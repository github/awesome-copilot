---
name: 'documentation-recovery'
description: 'Auto-generates missing documentation by analyzing code and extracting metadata'
---

# Documentation Recovery Skill

## Purpose
Create comprehensive and accurate documentation by analyzing SQL Server code artifacts - the documentation no one wrote but everyone needs.

## Prohibited
- SQL Server connection string
- Database objects to document (all specific subset)
- Business process context (optional)
- Stakeholder interview notes (optional)
- Application code that interacts with database (optional)

## Output
- **Data Dictionary**:
  - Each table with business purpose, owner, frequency of use
  - Each column with data type, constraints, business meaning
  - Relationships and foreign keys with business logic
  - Indices with performance implications

- **Procedure Documentation**:
  - Purpose and business context
  - Parameters with descriptions and example values
  - Return values ​​and result sets
  - Dependencies and what objects it modifies
  - Known issues or edge cases
  - Examples of use and typical calling patterns

- **Entity-Relationship Diagrams**:
  - Visual schema with business entity names
  - Data flow between main entities
  - Critical paths and transaction limits

- **Data Lineage Documentation**:
  - How source data flows through ETL to reports
  - Transformation rules and business logic
  - Data quality rules and validation points
  - Historical changes to schema/logic

- **Process Runbooks**:
  - Step-by-step procedures for critical operations
  - When procedures are executed and expected duration
  - What to do if something breaks
  - Success/failure indicators
  - Reversal procedures

## Step by Step Instructions

### 1. Definition of Scope
Identify what to document:
- **Scope**: Complete database vs. specific schemas/modules
- **Audience**: Developers, DBAs, Business Analysts, End Users
- **Level of Detail**: Executive summary vs. technical specification
- **Priority**: Critical systems first, nice-to-have later

### 2. Business Context
Collect meaning of business:
- What does each table represent? (not just technical name)
- What business events trigger procedures?
- What reports/processes depend on this data?
- Who are the owners and stakeholders of the system?

### 3. Schema Documentation
```sql
-- Generate data dictionary from schema
SELECT
    t.name AS TableName,
    c.name AS ColumnName,
    ty.name AS DataType,
    CAST(c.max_length AS VARCHAR(10)) AS Length,
    CASE WHEN c.is_nullable = 1 THEN 'NULL' ELSE 'NOT NULL' END AS Nullable,
    ISNULL(dc.definition, 'N/A') AS DefaultValue,
    OBJECT_DEFINITION(c.default_object_id) AS ComputedFormula
FROM sys.tables t
JOIN sys.columns c ON t.object_id = c.object_id
JOIN sys.types ty ON c.system_type_id = ty.system_type_id
LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
```

### 4. Extract Procedural Logic
```sql
-- Get procedure definition and complexity metrics
SELECT
    OBJECT_NAME(object_id) AS ProcedureName,
    OBJECT_DEFINITION(object_id) AS ProcedureCode,
    (SELECT COUNT(*) FROM sys.sql_expression_dependencies
     WHERE referencing_id = object_id) AS DependenciesCount
FROM sys.procedures
```

### 5. Analyze Parameters & Results
```sql
-- Document procedure parameters
SELECT
    OBJECT_NAME(object_id) AS ProcedureName,
    name AS ParameterName,
    system_type_name(user_type_id) AS DataType,
    is_output,
    has_default_value
FROM sys.parameters
WHERE OBJECT_OBJECTPROPERTY(object_id, 'IsProcedure') = 1
```

### 6. Extracting Business Rules from Real SQL Code

**MANDATORY**: The business rules are extracted by reading the SQL body of the SPs, NOT inferring by name or metadata. The process is:

#### 6.1 Locate Critical/Complex SPs

```powershell
# Locate exact SP line in schema
Select-String -Path "schema/db.sql" -Pattern "NOMBRE_SP" | Select-Object -First 3 LineNumber, Line
```

#### 6.2 Read the Complete Body

```powershell
# Extract full body by line number
Get-Content "schema/db.sql" -TotalCount ($lineStart + 500) | Select-Object -Skip ($lineStart - 1)
```

#### 6.3 Business Rule Template (extracted from real code)

```markdown
### R[N]: [Descriptive rule name]

**Source SP**: `schema.ProcedureName`
**SP date**: [from SP header]
**SP author**: [from SP header]

**Business description**: [Business language, no SQL]

**SQL logic implementing it**:
\`\`\`sql
-- Real SP fragment
CASE WHEN campo = valor THEN ... END
\`\`\`

**Key variables and thresholds**:
| Variable | Value/Type | Meaning |
|---|---|---|
| @PARAM | INT | ... |

**States involved**: (if state machine applies)
| ID | State | Transition condition |
|---|---|---|
| 1 | DRAFT | ... |
| 5 | COMPLETED | ... |

**Dependencies**:
- Read tables: T_TABLA_A, T_TABLA_B
- Written tables: T_TABLA_C
- Called SPs: schema.DEPENDENT_SP

**Open questions**: (what code does not clearly explain)
- Why is magic value 65535 used in F_BAJA?
- Which call controls ID_DICCIONARIO_CONFIG = 498?
```

#### 6.4 Business Rules Signals in SQL

| SQL Pattern | Rule type |
|---|---|
| `CASE WHEN estado = N THEN` | State machine / Transition |
| `IF NOT EXISTS (SELECT...)` | Uniqueness validation |
| `MERGE ... WHEN NOT MATCHED` | Upsert with creation logic |
| `DecryptByKey(campo)` | Sensitive data protected by law |
| `EXEC UP_V_ABRIR_LLAVE` | Access to encrypted data (relevant GDPR) |
| `AVG/SUM/MAX` about hierarchies | Aggregate score calculation |
| `WHILE @Nivel > 0` | Hierarchical propagation of values |
| `ID_TIPOEXCESO = N` | Case list of excesses by type |
| `plc.ParticipanteFinalizadoOAbandono(...)` | Encapsulated Eligibility Logic |
| `B_EXCESO = 1 AND ID_TIPOEXCESO = N` | Classification of regulatory excesses |
| `@ID_DICCIONARIO_CONFIG = N` | Configuration by call |
| `IN ('CABANT01A', ...)` | Cancellation cause codes |

#### 6.5 Extraction Process by SP

For each SP Critical/Complex:
1. Read header → get stated purpose
2. Read parameters → understand the entry contract
3. Identify patterns from table 6.4 → classify rule type
4. Document with template 6.3
5. Mark open questions that require validation with the business

### 7. Create Dependency Matrices
```sql
-- Map which procedures modify which tables
SELECT
    OBJECT_NAME(referencing_id) AS Procedure,
    OBJECT_NAME(referenced_id) AS TableModified,
    'UPDATE' AS ModificationType
FROM sys.sql_expression_dependencies
WHERE OBJECTPROPERTY(referencing_id, 'IsProcedure') = 1
  AND OBJECTPROPERTY(referenced_id, 'IsTable') = 1
```

### 8. Generate Output Documents

**Markdown Template: Table Documentation**
```markdown
## [TableName]

**Business Purpose**: [Which business entity this represents]

**Owner**: [Responsible team/person]

**Usage Frequency**: [How often data is modified/accessed]

### Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| ID | INT | NO | Unique identifier |
| Name | VARCHAR(100) | NO | Business name |

### Relationships
- Foreign Key: ParentTable.ID references [TableName].ParentID

### Indexes
- PK_[TableName]: Clustered on ID
- IX_[TableName]_Name: Non-clustered on Name (INCLUDES ParentID)

### Recent Changes
- 2024-01: Added LastModified column
- 2024-02: Migrated to new schema
```

**Markdown Template: Procedure Documentation**
```markdown
## sp_ProcessMonthlyClosing

**Business Purpose**: Executes end-of-month closing process, reconciles accounts, freezes previous month data

**Owner**: Financial Operations

**Execution Frequency**: Last business day of month at 23:00

### Parameters
- @BusinessUnitID INT - Required - Which business unit to close
- @ClosingDate DATETIME - Optional - Override closing date
- @SendNotifications BIT - Default: 1 - Send notifications to GL team

### Processing Steps
1. Lock current month data
2. Validate that all transactions are posted
3. Execute reconciliation procedures
4. Generate closing reports
5. Archive historical data
6. Unlock previous month

### Error Handling
- If reconciliation fails, transaction is rolled back and error is logged
- Notifications are sent to Operations team with error details

### Known Issues
- Takes 45 minutes to complete in heavy months
- Must run in single-user mode to prevent locks
- Requires manual validation of GL balances

### Recent Incidents
- 2024-01-31: Timeout due to missing index on Transactions.AcctDate
- 2024-02-29: Failed due to missing GL account in control table
```

## Documentation Checklist
- [ ] All tables documented for business purposes
- [ ] All columns documented with meaning and usage
- [ ] All documented procedures with purpose and parameters
- [ ] All relationships and restrictions documented
- [ ] All critical procedures have runbooks
- [ ] Data flow diagrams created for main processes
- [ ] Business rules extracted and documented
- [ ] Known issues and noted workarounds
- [ ] Team property assigned
- [ ] Documented execution patterns

## Maintenance
- Assign owner for continuous updates
- Establish review frequency (quarterly recommended)
- Documentation version control with code
- Create automated validation to detect schema changes

## Output Formats
- **Markdown**: Friendly, readable version control
- **Wiki**: Searchable, linkable (Confluence, GitBook)
- **PDF**: For archiving and distribution
- **HTML Dashboard**: Interactive browser-based documentation

