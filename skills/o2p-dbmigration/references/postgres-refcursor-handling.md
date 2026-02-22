# Oracle to PostgreSQL: Refcursor Handling in Client Applications

## Overview

When migrating from Oracle to PostgreSQL, a critical difference exists in how **refcursor** (reference cursor) output parameters are handled by client applications. Oracle's driver automatically unwraps refcursors to expose result sets directly, while PostgreSQL's Npgsql driver returns a cursor name that must be explicitly fetched. This fundamental difference requires client code modifications to avoid runtime errors.

## The Core Difference

**Oracle Behavior:**
- Refcursor output parameters automatically expose their result set to the data reader
- Client code can immediately access result columns
- No additional commands needed

**PostgreSQL Behavior:**
- Refcursor output parameters return a **cursor name** (e.g., `"<unnamed portal 1>"`)
- The cursor remains open in the database session
- Client must execute `FETCH ALL FROM "<cursor_name>"` to retrieve actual data
- Failure to fetch results in `IndexOutOfRangeException` when accessing expected columns

## Common Error Symptoms

When migrating Oracle code without accounting for this difference:

```
System.IndexOutOfRangeException: Field not found in row: <column_name>
```

This occurs because the data reader contains only the refcursor parameter itself, not the actual query results.


## Database Stored Procedure Pattern

### Oracle Stored Procedure
```sql
CREATE OR REPLACE PROCEDURE get_users(
    p_department_id IN NUMBER,
    cur_result OUT SYS_REFCURSOR
) AS
BEGIN
    OPEN cur_result FOR
        SELECT user_id, user_name, email
        FROM users
        WHERE department_id = p_department_id
        ORDER BY user_name;
END;
```

### PostgreSQL Stored Procedure
```sql
CREATE OR REPLACE PROCEDURE get_users(
    p_department_id IN INTEGER,
    cur_result INOUT refcursor
)
LANGUAGE plpgsql
AS $$
BEGIN
    OPEN cur_result FOR
        SELECT user_id, user_name, email
        FROM users
        WHERE department_id = p_department_id
        ORDER BY user_name;
END;
$$;
```

**Key Difference:** PostgreSQL returns the cursor itself as an `INOUT` parameter, not the result set.



## Client Code Solution (C#)

### Problematic Oracle-Style Code
This code works with Oracle but fails with PostgreSQL:

```csharp
using Npgsql;
using NpgsqlTypes;

public IEnumerable<User> GetUsers(int departmentId)
{
    var users = new List<User>();
    
    using (var connection = new NpgsqlConnection(connectionString))
    {
        connection.Open();
        
        using (var command = new NpgsqlCommand("get_users", connection))
        {
            command.CommandType = CommandType.StoredProcedure;
            
            command.Parameters.AddWithValue("p_department_id", departmentId);
            
            var refcursorParam = new NpgsqlParameter("cur_result", NpgsqlDbType.Refcursor);
            refcursorParam.Direction = ParameterDirection.InputOutput;
            command.Parameters.Add(refcursorParam);
            
            // This executes the procedure
            using (var reader = command.ExecuteReader())
            {
                // PROBLEM: reader only contains the cursor name, not the data
                // Attempting to read "user_id" will throw IndexOutOfRangeException
                while (reader.Read())
                {
                    users.Add(new User
                    {
                        UserId = reader.GetInt32(reader.GetOrdinal("user_id")), // FAILS HERE
                        UserName = reader.GetString(reader.GetOrdinal("user_name")),
                        Email = reader.GetString(reader.GetOrdinal("email"))
                    });
                }
            }
        }
    }
    
    return users;
}
```

### Solution: Explicit Refcursor Unwrapping

```csharp
using Npgsql;
using NpgsqlTypes;

public IEnumerable<User> GetUsers(int departmentId)
{
    var users = new List<User>();
    
    using (var connection = new NpgsqlConnection(connectionString))
    {
        connection.Open();
        
        using (var command = new NpgsqlCommand("get_users", connection))
        {
            command.CommandType = CommandType.StoredProcedure;
            
            command.Parameters.AddWithValue("p_department_id", departmentId);
            
            var refcursorParam = new NpgsqlParameter("cur_result", NpgsqlDbType.Refcursor);
            refcursorParam.Direction = ParameterDirection.InputOutput;
            command.Parameters.Add(refcursorParam);
            
            // Execute procedure to open the cursor
            command.ExecuteNonQuery();
            
            // Extract the cursor name from the output parameter
            string cursorName = (string)refcursorParam.Value;
            
            // Fetch the actual data from the cursor
            using (var fetchCommand = new NpgsqlCommand($"FETCH ALL FROM \"{cursorName}\"", connection))
            {
                fetchCommand.CommandType = CommandType.Text;
                
                using (var reader = fetchCommand.ExecuteReader())
                {
                    // Now reader contains the actual result set
                    while (reader.Read())
                    {
                        users.Add(new User
                        {
                            UserId = reader.GetInt32(reader.GetOrdinal("user_id")),
                            UserName = reader.GetString(reader.GetOrdinal("user_name")),
                            Email = reader.GetString(reader.GetOrdinal("email"))
                        });
                    }
                }
            }
        }
    }
    
    return users;
}
```

### Generic Helper Method

For reusability across multiple procedures, create a generic helper:

```csharp
public static class PostgresHelpers
{
    public static NpgsqlDataReader ExecuteRefcursorProcedure(
        NpgsqlConnection connection,
        string procedureName,
        Dictionary<string, object> parameters,
        string refcursorParameterName)
    {
        using (var command = new NpgsqlCommand(procedureName, connection))
        {
            command.CommandType = CommandType.StoredProcedure;
            
            // Add input parameters
            foreach (var param in parameters)
            {
                command.Parameters.AddWithValue(param.Key, param.Value);
            }
            
            // Add refcursor output parameter
            var refcursorParam = new NpgsqlParameter(refcursorParameterName, NpgsqlDbType.Refcursor);
            refcursorParam.Direction = ParameterDirection.InputOutput;
            command.Parameters.Add(refcursorParam);
            
            // Execute to open the cursor
            command.ExecuteNonQuery();
            
            // Get the cursor name
            string cursorName = (string)refcursorParam.Value;
            
            if (string.IsNullOrEmpty(cursorName))
            {
                return null;
            }
            
            // Fetch and return the actual data
            var fetchCommand = new NpgsqlCommand($"FETCH ALL FROM \"{cursorName}\"", connection);
            fetchCommand.CommandType = CommandType.Text;
            
            // Note: Caller is responsible for disposing the reader
            return fetchCommand.ExecuteReader();
        }
    }
}

// Usage example:
public IEnumerable<User> GetUsers(int departmentId)
{
    var users = new List<User>();
    
    using (var connection = new NpgsqlConnection(connectionString))
    {
        connection.Open();
        
        var parameters = new Dictionary<string, object>
        {
            { "p_department_id", departmentId }
        };
        
        using (var reader = PostgresHelpers.ExecuteRefcursorProcedure(
            connection, 
            "get_users", 
            parameters, 
            "cur_result"))
        {
            if (reader != null)
            {
                while (reader.Read())
                {
                    users.Add(new User
                    {
                        UserId = reader.GetInt32(reader.GetOrdinal("user_id")),
                        UserName = reader.GetString(reader.GetOrdinal("user_name")),
                        Email = reader.GetString(reader.GetOrdinal("email"))
                    });
                }
            }
        }
    }
    
    return users;
}
```



## Transactional Context

When working within transactions, ensure the `FETCH` command uses the same transaction:

```csharp
public IEnumerable<User> GetUsersInTransaction(
    NpgsqlConnection connection, 
    NpgsqlTransaction transaction,
    int departmentId)
{
    var users = new List<User>();
    
    using (var command = new NpgsqlCommand("get_users", connection, transaction))
    {
        command.CommandType = CommandType.StoredProcedure;
        
        command.Parameters.AddWithValue("p_department_id", departmentId);
        
        var refcursorParam = new NpgsqlParameter("cur_result", NpgsqlDbType.Refcursor);
        refcursorParam.Direction = ParameterDirection.InputOutput;
        command.Parameters.Add(refcursorParam);
        
        command.ExecuteNonQuery();
        
        string cursorName = (string)refcursorParam.Value;
        
        // Important: Use the same transaction for the FETCH command
        using (var fetchCommand = new NpgsqlCommand($"FETCH ALL FROM \"{cursorName}\"", connection, transaction))
        {
            fetchCommand.CommandType = CommandType.Text;
            
            using (var reader = fetchCommand.ExecuteReader())
            {
                while (reader.Read())
                {
                    users.Add(new User
                    {
                        UserId = reader.GetInt32(reader.GetOrdinal("user_id")),
                        UserName = reader.GetString(reader.GetOrdinal("user_name")),
                        Email = reader.GetString(reader.GetOrdinal("email"))
                    });
                }
            }
        }
    }
    
    return users;
}
```



## Debugging Tips

### Before Fix - What You'll See
When inspecting the data reader after executing a refcursor procedure without proper unwrapping:

```csharp
// Immediate after ExecuteReader() on the procedure
Console.WriteLine($"Field Count: {reader.FieldCount}"); // Output: 1
Console.WriteLine($"Field Name: {reader.GetName(0)}");   // Output: "cur_result"

// Attempting to access expected columns throws exception:
var userId = reader.GetInt32(reader.GetOrdinal("user_id")); 
// Throws: IndexOutOfRangeException: Field not found in row: user_id
```

### After Fix - What You Should See
After properly fetching from the cursor:

```csharp
// After FETCH ALL FROM cursor
Console.WriteLine($"Field Count: {reader.FieldCount}"); // Output: 3
Console.WriteLine($"Field 0: {reader.GetName(0)}");      // Output: "user_id"
Console.WriteLine($"Field 1: {reader.GetName(1)}");      // Output: "user_name"
Console.WriteLine($"Field 2: {reader.GetName(2)}");      // Output: "email"

// Now columns are accessible
var userId = reader.GetInt32(reader.GetOrdinal("user_id")); // Works correctly
```



## Comparison Table: Oracle vs. PostgreSQL Refcursor Handling

| Aspect | Oracle (ODP.NET) | PostgreSQL (Npgsql) |
|--------|------------------|---------------------|
| **Cursor Return** | Result set directly accessible in data reader | Cursor name string returned in output parameter |
| **Data Access** | Immediate via `ExecuteReader()` | Requires separate `FETCH ALL FROM` command |
| **Code Changes** | `ExecuteReader()` returns data | `ExecuteNonQuery()` → get cursor name → `FETCH` |
| **Multiple Cursors** | Multiple refcursors work automatically | Each requires separate `FETCH` command |
| **Cursor Lifetime** | Managed automatically by driver | Remains open; must manage explicitly |
| **Transaction Handling** | Transparent | `FETCH` must use same transaction context |



## Best Practices

1. **Centralize refcursor handling** - Create a generic helper method to avoid duplicating unwrapping logic across your codebase

2. **Handle null cursors** - Always check if the cursor name is null or empty before attempting to fetch

3. **Transaction consistency** - Ensure `FETCH` commands use the same transaction as the procedure execution

4. **Resource cleanup** - Properly dispose of both the initial command and fetch command resources

5. **Error handling** - Wrap refcursor operations in try-catch blocks to handle potential cursor-related errors gracefully

6. **Documentation** - Clearly document which procedures return refcursors and require special handling

## Migration Checklist

When migrating Oracle applications to PostgreSQL:

- [ ] Identify all stored procedures that return `SYS_REFCURSOR` (Oracle) or `refcursor` (PostgreSQL)
- [ ] Locate client code that calls these procedures
- [ ] Update client code to use the two-step pattern: execute → fetch
- [ ] Test each modified data access method
- [ ] Consider creating a generic helper method for refcursor handling
- [ ] Update unit and integration tests
- [ ] Document the pattern for future development

## References

- [PostgreSQL Documentation: Cursors](https://www.postgresql.org/docs/current/plpgsql-cursors.html)
- [PostgreSQL FETCH Command](https://www.postgresql.org/docs/current/sql-fetch.html)
- [Npgsql Documentation: Basic Types](https://www.npgsql.org/doc/types/basic.html)
- [Npgsql Refcursor Support](https://github.com/npgsql/npgsql/issues/1887)

---

*This document provides guidance for handling refcursor differences when migrating from Oracle to PostgreSQL. Adapt the code examples to your specific application architecture and requirements.*
