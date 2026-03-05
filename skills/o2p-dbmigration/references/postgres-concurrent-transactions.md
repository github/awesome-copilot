# Oracle to PostgreSQL: Concurrent Transaction Handling

## Overview

When migrating from Oracle to PostgreSQL, a critical difference exists in how **concurrent operations on a single database connection** are handled. Oracle's ODP.NET driver allows multiple active commands and result sets on the same connection simultaneously, while PostgreSQL's Npgsql driver enforces a strict **one active command per connection** rule. Code that worked seamlessly in Oracle will throw runtime exceptions in PostgreSQL if concurrent operations share a connection.

## The Core Difference

**Oracle Behavior:**
- A single connection can have multiple active commands executing concurrently
- Opening a second `DataReader` while another is still open is permitted
- Nested or overlapping database calls on the same connection work transparently

**PostgreSQL Behavior:**
- A connection supports only **one active command at a time**
- Attempting to execute a second command while a `DataReader` is open throws an exception
- Lazy-loaded navigation properties or callback-driven reads that trigger additional queries on the same connection will fail

## Common Error Symptoms

When migrating Oracle code without accounting for this difference:

```
System.InvalidOperationException: An operation is already in progress.
```

```
Npgsql.NpgsqlOperationInProgressException: A command is already in progress: <SQL text>
```

These occur when application code attempts to execute a new command on a connection that already has an active `DataReader` or uncommitted command in flight.

---

## Problem Scenarios

### Scenario 1: Iterating a DataReader While Executing Another Command

```csharp
using (var reader = command1.ExecuteReader())
{
    while (reader.Read())
    {
        // PROBLEM: executing a second command on the same connection
        // while the reader is still open
        using (var command2 = new NpgsqlCommand("SELECT ...", connection))
        {
            var value = command2.ExecuteScalar(); // FAILS
        }
    }
}
```

### Scenario 2: Lazy Loading / Deferred Execution in Data Access Layers

```csharp
// Oracle: works because ODP.NET supports concurrent readers
var items = repository.GetItems(); // returns IEnumerable backed by open DataReader
foreach (var item in items)
{
    // PROBLEM: triggers a second query on the same connection
    var details = repository.GetDetails(item.Id); // FAILS on PostgreSQL
}
```

### Scenario 3: Nested Stored Procedure Calls via Application Code

```csharp
// Oracle: ODP.NET handles multiple active commands
command1.ExecuteNonQuery(); // starts a long-running operation
command2.ExecuteScalar();   // FAILS on PostgreSQL — command1 still in progress
```

---

## Solutions

### Solution 1: Materialize Results Before Issuing New Commands (Recommended)

Close the first result set by loading it into memory before executing subsequent commands on the same connection.

```csharp
// Load all results into a list first
var items = new List<Item>();
using (var reader = command1.ExecuteReader())
{
    while (reader.Read())
    {
        items.Add(MapItem(reader));
    }
} // reader is closed and disposed here

// Now safe to execute another command on the same connection
foreach (var item in items)
{
    using (var command2 = new NpgsqlCommand("SELECT ...", connection))
    {
        command2.Parameters.AddWithValue("id", item.Id);
        var value = command2.ExecuteScalar(); // Works
    }
}
```

For LINQ / EF Core scenarios, force materialization with `.ToList()`:

```csharp
// Before (fails on PostgreSQL — deferred execution keeps connection busy)
var items = dbContext.Items.Where(i => i.Active);
foreach (var item in items)
{
    var details = dbContext.Details.FirstOrDefault(d => d.ItemId == item.Id);
}

// After (materializes first query before issuing second)
var items = dbContext.Items.Where(i => i.Active).ToList();
foreach (var item in items)
{
    var details = dbContext.Details.FirstOrDefault(d => d.ItemId == item.Id);
}
```

### Solution 2: Use Separate Connections for Concurrent Operations

When operations genuinely need to run concurrently, open a dedicated connection for each.

```csharp
using (var reader = command1.ExecuteReader())
{
    while (reader.Read())
    {
        // Use a separate connection for the nested query
        using (var connection2 = new NpgsqlConnection(connectionString))
        {
            connection2.Open();
            using (var command2 = new NpgsqlCommand("SELECT ...", connection2))
            {
                var value = command2.ExecuteScalar(); // Works — different connection
            }
        }
    }
}
```

### Solution 3: Restructure to a Single Query

Where possible, combine nested lookups into a single query using JOINs or subqueries to eliminate the need for concurrent commands entirely.

```csharp
// Before: two sequential queries on the same connection
var order = GetOrder(orderId);          // query 1
var details = GetOrderDetails(orderId); // query 2 (fails if query 1 reader still open)

// After: single query with JOIN
using (var command = new NpgsqlCommand(
    "SELECT o.*, d.* FROM orders o JOIN order_details d ON o.id = d.order_id WHERE o.id = @id",
    connection))
{
    command.Parameters.AddWithValue("id", orderId);
    using (var reader = command.ExecuteReader())
    {
        // Process combined result set
    }
}
```

---

## Detection Strategy

### Code Review Checklist

- [ ] Search for methods that open a `DataReader` and call other database methods before closing it
- [ ] Look for `IEnumerable` return types from data access methods that defer execution (indicate open readers)
- [ ] Identify EF Core queries without `.ToList()` / `.ToArray()` that are iterated while issuing further queries
- [ ] Check for nested stored procedure calls in application code that share a connection

### Common Locations to Search

- Data access layers and repository classes
- Service methods that orchestrate multiple repository calls
- Code paths that iterate query results and perform lookups per row
- Event handlers or callbacks triggered during data iteration

### Search Patterns

```regex
ExecuteReader\(.*\)[\s\S]*?Execute(Scalar|NonQuery|Reader)\(
```

```regex
\.Where\(.*\)[\s\S]*?foreach[\s\S]*?dbContext\.
```

---

## Error Messages to Watch For

| Error Message | Likely Cause |
|---------------|--------------|
| `An operation is already in progress` | Second command executed while a `DataReader` is open on the same connection |
| `A command is already in progress: <SQL>` | Npgsql detected overlapping command execution on a single connection |
| `The connection is already in state 'Executing'` | Connection state conflict from concurrent usage |

---

## Comparison Table: Oracle vs. PostgreSQL

| Aspect | Oracle (ODP.NET) | PostgreSQL (Npgsql) |
|--------|------------------|---------------------|
| **Concurrent commands** | Multiple active commands per connection | One active command per connection |
| **Multiple open DataReaders** | Supported | Not supported — must close/materialize first |
| **Nested DB calls during iteration** | Transparent | Throws `InvalidOperationException` |
| **Deferred execution safety** | Safe to iterate and query | Must materialize (`.ToList()`) before issuing new queries |
| **Connection pooling impact** | Lower connection demand | May need more pooled connections if using Solution 2 |

---

## Best Practices

1. **Materialize early** — Call `.ToList()` or `.ToArray()` on query results before iterating and issuing further database calls. This is the simplest and most reliable fix.

2. **Audit data access patterns** — Review all repository and data access methods for deferred-execution return types (`IEnumerable`, `IQueryable`) that callers iterate while issuing additional queries.

3. **Prefer single queries** — Where feasible, combine nested lookups into JOINs or subqueries to eliminate the concurrent-command pattern entirely.

4. **Isolate connections when necessary** — If concurrent operations are genuinely required, use separate connections rather than attempting to share one.

5. **Test iterative workflows** — Integration tests should cover scenarios where code iterates result sets and performs additional database operations per row, as these are the most common failure points.

## Migration Checklist

- [ ] Identify all code paths that execute multiple commands on a single connection concurrently
- [ ] Locate `IEnumerable`-backed data access methods that defer execution with open readers
- [ ] Add `.ToList()` / `.ToArray()` materialization where deferred results are iterated alongside further queries
- [ ] Refactor nested database calls to use separate connections or combined queries where appropriate
- [ ] Verify EF Core navigation properties and lazy loading do not trigger concurrent connection usage
- [ ] Update integration tests to cover iterative data access patterns
- [ ] Load-test connection pool sizing if Solution 2 (separate connections) is used extensively

## References

- [Npgsql Documentation: Basic Usage](https://www.npgsql.org/doc/basic-usage.html)
- [PostgreSQL Documentation: Concurrency Control](https://www.postgresql.org/docs/current/mvcc.html)
- [Npgsql GitHub: Multiple Active Result Sets Discussion](https://github.com/npgsql/npgsql/issues/462)

---

*This document provides guidance for handling concurrent transaction and command differences when migrating from Oracle to PostgreSQL. Adapt the code examples to your specific application architecture and requirements.*
