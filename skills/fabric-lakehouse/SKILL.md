---
name: fabric-lakehouse
description: 'Provide definition and context about Fabric Lakehouse and its capabilities for software systems and AI-powered features. Help users design, build, and optimize Lakehouse solutions using best practices. Includes definition, features, user stories, technical specifications, developer tools, and best practices for implementation.'
metadata:
  author: tedvilutis
  version: "1.0"
---

# Fabric Lakehouse

## Core Concepts

### What is a Lakehouse?

A Lakehouse in Microsoft Fabric is an item that gives users a place to store their tabular, like tables, and non-tabular, like files, data. It combines the flexibility of a data lake with the management capabilities of a data warehouse. It provides:

- **Unified storage** in OneLake for structured and unstructured data
- **Delta Lake format** for ACID transactions, versioning, and time travel
- **SQL analytics endpoint** for T-SQL queries
- **Semantic model** for Power BI integration
- Support for other table formats like CSV, Parquet
- Support for any file formats

### Key Components

- **Delta Tables** | Managed tables with ACID compliance and schema enforcement |
| **Files** | Unstructured/semi-structured data in the Files section |
| **SQL Endpoint** | Auto-generated read-only SQL interface for querying |
| **Shortcuts** | Virtual links to external/internal data without copying |
| **Notebooks** | Interactive Spark notebooks (Python, Scala, R, SQL) |
| **Spark Job Definitions** | Batch processing jobs for production workloads |

### Tabular data in a Lakehouse

Tabular data in a form of tables are stored under "Tables" folder. Main format for tables in Lakehouse is Delta. But Lakehouse can store tabular data in other formats like CSV or Parquet. Note that these formats only available for Spark querying and not accesinble by other compute engines like SQL analytis endpoint or Semantic model.
Tables can be internal, when data is stored under "Tables" folder" or external, when only reference to a table is stored under "Tables" folder but the data itself is stored in a referenced location. Referecing tables are done through Fabric Shortcuts, which can be internal, pointing to other location in fabric, or external pointing to data stored in ADLS Gen2, AWS S3, or Google Cloud storage.

### Schemas for tables in a Lakehouse

When creating a lakehouse user can choose to enable schemas. Schemas are used to organize Lakehouse tables. Schemas are implemented as folders under "Tables" folder and store tables inside of those folders. Default schema "dbo" can't be deleted or renamed. All other schemas are optional and can be created, renamed, or deleted. User can reference schema located in other lakehouse using schema shortcut that way referincing all tables with one shortcut that are at the destination schema.

### Files in a Lakehouse

Files are stored uner "Files" folder. Users can create folders and subfolders to organize their files. Any file format can be stored in Lakehosue.

### Fabric Materialized Views

### Spark Views

## Medallion Architecture (Recommended Pattern)

Implement the three-layer medallion architecture for production Lakehouses:

### Bronze Layer (Raw)
- Store raw data exactly as ingested
- Maintain full fidelity as source of truth
- No transformations applied
- Example path: `Files/bronze/` or `Tables/bronze_*`

### Silver Layer (Enriched)
- Cleansed, deduplicated, standardized data
- Business rules and quality checks applied
- Schema enforcement and validation
- Example path: `Tables/silver_*`

### Gold Layer (Curated)
- Business-ready, aggregated data
- Optimized for analytics and reporting
- Star schema or denormalized structures
- Example path: `Tables/gold_*`

---

## Security

### Item access or control plane security

### Data access or OneLake Security

| Level | Mechanism |
|-------|-----------|
| Workspace | Workspace roles (Admin, Member, Contributor, Viewer) |
| Lakehouse | Item permissions |
| Table/Row | Row-level security (RLS) via SQL endpoint |
| Column | Column-level security |


## PySpark Code Examples

See [PySpark code](references/pyspark.md) for details.

## Lakehouse Shortcuts

Shortcuts create virtual links to data without copying:

### Types of Shortcuts

| Type | Description | Use Case |
|------|-------------|----------|
| **Internal** | Link to other Fabric Lakehouses/tables | Cross-workspace data sharing |
| **ADLS Gen2** | Azure Data Lake Storage Gen2 | External Azure storage |
| **Amazon S3** | AWS S3 buckets | Cross-cloud data access |
| **Dataverse** | Microsoft Dataverse | Business application data |
| **Google Cloud Storage** | GCS buckets | Cross-cloud data access |

### Best Practices for Shortcuts
- Use shortcuts to avoid data duplication
- Implement proper access controls on source data
- Consider latency for external sources
- Use for read-heavy workloads

---

## Getting data into Lakehouse

See [Get data](references/getdata.md) for details.

## Performance Optimization

### V-Order Optimization


### Table Optimization

```sql
%%sql
-- Optimize table (compact small files)
OPTIMIZE silver_transactions

-- Optimize with Z-ordering on query columns
OPTIMIZE silver_transactions ZORDER BY (customer_id, transaction_date)

-- Vacuum old files (default 7 days retention)
VACUUM silver_transactions

-- Vacuum with custom retention
VACUUM silver_transactions RETAIN 168 HOURS
```

### Best Practices

1. **Partitioning**: Partition by high-cardinality columns (date, region)
2. **File Size**: Target 128MB-1GB files for optimal performance
3. **Z-Ordering**: Apply on frequently filtered columns
4. **Caching**: Use `df.cache()` for repeatedly accessed DataFrames
5. **Predicate Pushdown**: Filter early in transformations

---

## Lineage


## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Slow queries | Check partitioning, run OPTIMIZE, add Z-ORDER |
| Small files | Run OPTIMIZE to compact files |
| Schema mismatch | Use mergeSchema option or explicit schema |
| Memory errors | Increase executor memory, optimize joins |
| Concurrent writes | Use Delta MERGE for safe upserts |

