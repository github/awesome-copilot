---
description: 'Guidelines for generating SQL statements and stored procedures'
applyTo: '**/*.sql'
---

# SQL Development

## Database schema generation
- all table names should be in singular form
- all column names should be in singular form
- all tables should have a primary key column named `id`
- all tables should have a column named `created_at` to store the creation timestamp
- all tables should have a column named `updated_at` to store the last update timestamp

## Database schema design
- all tables should have a primary key constraint
- all foreign key constraints should have a name
- all foreign key constraints should be defined inline
- all foreign key constraints should have `ON DELETE CASCADE` option
- all foreign key constraints should have `ON UPDATE CASCADE` option
- all foreign key constraints should reference the primary key of the parent table

## SQL Coding Style
- use uppercase for SQL keywords (SELECT, FROM, WHERE)
- use consistent indentation for nested queries and conditions
- include comments to explain complex logic
- break long queries into multiple lines for readability
- organize clauses consistently (SELECT, FROM, JOIN, WHERE, GROUP BY, HAVING, ORDER BY)

## SQL Query Structure
- use explicit column names in SELECT statements instead of SELECT *
- qualify column names with table name or alias when using multiple tables
- limit the use of subqueries when joins can be used instead
- include LIMIT/TOP clauses to restrict result sets
- use appropriate indexing for frequently queried columns
- avoid using functions on indexed columns in WHERE clauses

## Stored Procedure Naming Conventions
- prefix stored procedure names with 'usp_'
- use PascalCase for stored procedure names
- use descriptive names that indicate purpose (e.g., usp_GetCustomerOrders)
- include plural noun when returning multiple records (e.g., usp_GetProducts)
- include singular noun when returning single record (e.g., usp_GetProduct)

## Parameter Handling
- prefix parameters with '@'
- use camelCase for parameter names
- provide default values for optional parameters
- validate parameter values before use
- document parameters with comments
- arrange parameters consistently (required first, optional later)


## Stored Procedure Structure
- include header comment block with description, parameters, and return values
- return standardized error codes/messages
- return result sets with consistent column order
- use OUTPUT parameters for returning status information
- prefix temporary tables with 'tmp_'


## SQL Security Best Practices
- parameterize all queries to prevent SQL injection
- use prepared statements when executing dynamic SQL
- avoid embedding credentials in SQL scripts
- implement proper error handling without exposing system details
- avoid using dynamic SQL within stored procedures

## Transaction Management
- explicitly begin and commit transactions
- use appropriate isolation levels based on requirements
- avoid long-running transactions that lock tables
- use batch processing for large data operations
- include SET NOCOUNT ON for stored procedures that modify data
