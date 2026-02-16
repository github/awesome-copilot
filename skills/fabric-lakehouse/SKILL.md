---
name: fabric-lakehouse
description: 'Provide definition and context about Fabric Lakehouse and its capabilities for software systems and AI-powered features. Help users design, build, and optimize Lakehouse solutions using best practices.'
metadata:
  author: tedvilutis
  version: "1.0"
---

# Fabric Lakehouse

## Core Concepts

### What is a Lakehouse?

Lakehouse in Microsoft Fabric is an item that gives users a place to store their tabular, like tables, and non-tabular, like files, data. It combines the flexibility of a data lake with the management capabilities of a data warehouse. It provides:

- **Unified storage** in OneLake for structured and unstructured data
- **Delta Lake format** for ACID transactions, versioning, and time travel
- **SQL analytics endpoint** for T-SQL queries
- **Semantic model** for Power BI integration
- Support for other table formats like CSV, Parquet
- Support for any file formats
- Tools for table optimization and data management

### Key Components

- **Delta Tables** Managed tables with ACID compliance and schema enforcement
- **Files** Unstructured/semi-structured data in the Files section
- **SQL Endpoint** Auto-generated read-only SQL interface for querying
- **Shortcuts** Virtual links to external/internal data without copying
- **Fabric Materialized Views** Pre-computed tables for fast query performance

### Tabular data in a Lakehouse

Tabular data in a form of tables are stored under "Tables" folder. Main format for tables in Lakehouse is Delta. Lakehouse can store tabular data in other formats like CSV or Parquet, these formats only available for Spark querying.
Tables can be internal, when data is stored under "Tables" folder" or external, when only reference to a table is stored under "Tables" folder but the data itself is stored in a referenced location. Referecing tables are done through Shortcuts, which can be internal, pointing to other location in Fabric, or external pointing to data stored outside of Fabric.

### Schemas for tables in a Lakehouse

When creating a lakehouse user can choose to enable schemas. Schemas are used to organize Lakehouse tables. Schemas are implemented as folders under "Tables" folder and store tables inside of those folders. Default schema is "dbo" and it can't be deleted or renamed. All other schemas are optional and can be created, renamed, or deleted. User can reference schema located in other lakehouse using Schema Shortcut that way referincing all tables with one shortcut that are at the destination schema.

### Files in a Lakehouse

Files are stored uner "Files" folder. Users can create folders and subfolders to organize their files. Any file format can be stored in Lakehosue.

### Fabric Materialized Views

Set of pre-computed tables that are automatically updated based on schedule. They provide fast query performance for complex aggregations and joins. Materialized views are defined using PySpark or Spark SQL stored in asociated Notebook.

### Spark Views

Logical tables defined by a SQL query. They do not store data but provide a virtual layer for querying. Views are defined using Spark SQL and stored in Lakehouse next to Tables.

## Security

### Item access or control plane security

User can have workspace roles (Admin, Member, Contributor, Viewer) that provide different levels of access to Lakehouse and its contents. User can also get access permission using sharing capabilities of Lakehouse.

### Data access or OneLake Security

For data access use OneLake security model, which is based on Azure Active Directory (AAD) and role-based access control (RBAC). Lakehouse data is stored in OneLake, so access to data is controlled through OneLake permissions. In adition to object-level permissions, Lakehouse also supports column-level and row-level security for tables, allowing fine-grained control over who can see specific columns or rows in a table.


## Lakehouse Shortcuts

Shortcuts create virtual links to data without copying:

### Types of Shortcuts

- **Internal** Link to other Fabric Lakehouses/tables, cross-workspace data sharing 
- **ADLS Gen2**  Azure Data Lake Storage Gen2 external Azure storage
- **Amazon S3** AWS S3 buckets, cross-cloud data access
- **Dataverse** Microsoft Dataverse, business application data
- **Google Cloud Storage** GCS buckets, cross-cloud data access

## Performance Optimization

### V-Order Optimization

For faster data read with semantic model enable V-Order optimization on Delta tables.This presorts data in a way that improves query performance for common access patterns.

### Table Optimization

Tables can also be optimized using OPTIMIZE command, which compacts small files into larger ones and can also apply Z-ordering to improve query performance on specific columns. Regular optimization helps maintain performance as data is ingested and updated over time. Vacuum command can be used to clean up old files and free up storage space, especially after updates and deletes.

## Lineage

Lakehosue item supports lineage, which allows users to track the origin and transformations of data. Lineage information is automatically captured for tables and files in Lakehouse, showing how data flows from source to destination. This helps with debugging, auditing, and understanding data dependencies.

## PySpark Code Examples

See [PySpark code](references/pyspark.md) for details.

## Getting data into Lakehouse

See [Get data](references/getdata.md) for details.

