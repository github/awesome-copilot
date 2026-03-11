---
name: fabric-lakehouse
description: 'Use this skill to get context about Fabric Lakehouse and its features for software systems and AI-powered functions. It offers descriptions of Lakehouse data components, organization with schemas and shortcuts, access control, and code examples. This skill supports users in designing, building, and optimizing Lakehouse solutions using best practices.'
metadata:
  author: tedvilutis
  version: "1.0"
---

# When to Use This Skill

Use this skill when you need to:
- Generate a document or explanation that includes definition and context about Fabric Lakehouse and its capabilities.
- Design, build, and optimize Lakehouse solutions using best practices.
- Understand the core concepts and components of a Lakehouse in Microsoft Fabric.
- Learn how to manage tabular and non-tabular data within a Lakehouse.

# Fabric Lakehouse

## Core Concepts

### What is a Lakehouse?

Lakehouse in Microsoft Fabric is an item that gives users a place to store their tabular data (like tables) and non-tabular data (like files). It combines the flexibility of a data lake with the management capabilities of a data warehouse. It provides:

- **Unified storage** in OneLake for structured and unstructured data
- **Delta Lake format** for ACID transactions, versioning, and time travel
- **SQL analytics endpoint** for T-SQL queries
- **Semantic model** for Power BI integration
- Support for other table formats like CSV, Parquet
- Support for any file formats
- Tools for table optimization and data management

### Key Components

- **Delta Tables**: Managed tables with ACID compliance and schema enforcement
- **Files**: Unstructured/semi-structured data in the Files section
- **SQL Endpoint**: Auto-generated read-only SQL interface for querying
- **Shortcuts**: Virtual links to external/internal data without copying
- **Fabric Materialized Views**: Pre-computed tables for fast query performance

### Tabular data in a Lakehouse

Tabular data in a form of tables are stored under "Tables" folder. Main format for tables in Lakehouse is Delta. Lakehouse can store tabular data in other formats like CSV or Parquet, these formats are only available for Spark querying.
Tables can be internal, when data is stored under "Tables" folder, or external, when only reference to a table is stored under "Tables" folder but the data itself is stored in a referenced location. Tables are referenced through Shortcuts, which can be internal (pointing to another location in Fabric) or external (pointing to data stored outside of Fabric).

### Schemas for tables in a Lakehouse

When creating a lakehouse, users can choose to enable schemas. Schemas are used to organize Lakehouse tables. Schemas are implemented as folders under the "Tables" folder and store tables inside of those folders. The default schema is "dbo" and it can't be deleted or renamed. All other schemas are optional and can be created, renamed, or deleted. Users can reference a schema located in another lakehouse using a Schema Shortcut, thereby referencing all tables in the destination schema with a single shortcut.

### Files in a Lakehouse

Files are stored under "Files" folder. Users can create folders and subfolders to organize their files. Any file format can be stored in Lakehouse.

### Fabric Materialized Views

Set of pre-computed tables that are automatically updated based on a schedule. They provide fast query performance for complex aggregations and joins. Materialized views are defined using PySpark or Spark SQL and stored in an associated Notebook.

### Spark Views

Logical tables defined by a SQL query. They do not store data but provide a virtual layer for querying. Views are defined using Spark SQL and stored in Lakehouse next to Tables.

## Security

### Item access or control plane security

Users can have workspace roles (Admin, Member, Contributor, Viewer) that provide different levels of access to Lakehouse and its contents. Users can also get access permission using sharing capabilities of Lakehouse.

### Data access or OneLake Security

For data access use OneLake security model, which is based on Microsoft Entra ID (formerly Azure Active Directory) and role-based access control (RBAC). Lakehouse data is stored in OneLake, so access to data is controlled through OneLake permissions. In addition to object-level permissions, Lakehouse also supports column-level and row-level security for tables, allowing fine-grained control over who can see specific columns or rows in a table.


## Lakehouse Shortcuts

Shortcuts create virtual links to data without copying:

### Types of Shortcuts

- **Internal**: Link to other Fabric Lakehouses/tables, cross-workspace data sharing 
- **ADLS Gen2**: Link to ADLS Gen2 containers in Azure
- **Amazon S3**: AWS S3 buckets, cross-cloud data access
- **Dataverse**: Microsoft Dataverse, business application data
- **Google Cloud Storage**: GCS buckets, cross-cloud data access

## Performance Optimization

### V-Order Optimization

For faster data read with semantic model enable V-Order optimization on Delta tables. This presorts data in a way that improves query performance for common access patterns.

### Table Optimization

Tables can also be optimized using the OPTIMIZE command, which compacts small files into larger ones and can also apply Z-ordering to improve query performance on specific columns. Regular optimization helps maintain performance as data is ingested and updated over time. The Vacuum command can be used to clean up old files and free up storage space, especially after updates and deletes.

## Lineage

The Lakehouse item supports lineage, which allows users to track the origin and transformations of data. Lineage information is automatically captured for tables and files in Lakehouse, showing how data flows from source to destination. This helps with debugging, auditing, and understanding data dependencies.

## PySpark Code Examples

See [PySpark code](references/pyspark.md) for details.

## Getting data into Lakehouse

See [Get data](references/getdata.md) for details.

