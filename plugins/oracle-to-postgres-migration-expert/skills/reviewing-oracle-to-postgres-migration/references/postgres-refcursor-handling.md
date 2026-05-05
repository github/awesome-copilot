# Oracle to PostgreSQL: Refcursor Handling in Client Applications

## The Core Difference

Oracle's driver automatically unwraps `SYS_REFCURSOR` output parameters, exposing the result set directly in the data reader. PostgreSQL's Npgsql driver instead returns a **cursor name** (e.g., `"<unnamed portal 1>"`). The client must issue a separate `FETCH ALL FROM "<cursor_name>"` command to retrieve actual rows.

Failing to account for this causes:

```
System.IndexOutOfRangeException: Field not found in row: <column_name>
```

The reader contains only the cursor-name parameter — not the expected result columns.

> **Transaction requirement:** PostgreSQL refcursors are scoped to a transaction. Both the procedure call and the `FETCH` must execute within the same explicit transaction, or the cursor may be closed before the fetch completes under autocommit.

## Solution: Explicit Refcursor Unwrapping (C#)

```csharp
public IEnumerable<User> GetUsers(int departmentId)
{
    var users = new List<User>();
    using var connection = new NpgsqlConnection(connectionString);
    connection.Open();

    // Refcursors are transaction-scoped — wrap both the call and FETCH in one transaction.
    using var tx = connection.BeginTransaction();

    using var command = new NpgsqlCommand("get_users", connection, tx)
    {
        CommandType = CommandType.StoredProcedure
    };
    command.Parameters.AddWithValue("p_department_id", departmentId);
    var refcursorParam = new NpgsqlParameter("cur_result", NpgsqlDbType.Refcursor)
    {
        Direction = ParameterDirection.Output
    };
    command.Parameters.Add(refcursorParam);

    // Execute the procedure to open the cursor.
    command.ExecuteNonQuery();

    // Retrieve the cursor name, then fetch the actual data.
    string cursorName = (string)refcursorParam.Value;
    using var fetchCommand = new NpgsqlCommand($"FETCH ALL FROM \"{cursorName}\"", connection, tx);
    using var reader = fetchCommand.ExecuteReader();
    while (reader.Read())
    {
        users.Add(new User
        {
            UserId   = reader.GetInt32(reader.GetOrdinal("user_id")),
            UserName = reader.GetString(reader.GetOrdinal("user_name")),
            Email    = reader.GetString(reader.GetOrdinal("email"))
        });
    }

    tx.Commit();
    return users;
}
```

## Reusable Helper

Returning a live `NpgsqlDataReader` from a helper leaves the underlying `NpgsqlCommand` undisposed and creates ambiguous ownership. Prefer materializing results inside the helper instead:

```csharp
public static class PostgresHelpers
{
    public static List<T> ExecuteRefcursorProcedure<T>(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        string procedureName,
        Dictionary<string, object> parameters,
        string refcursorParameterName,
        Func<NpgsqlDataReader, T> map)
    {
        using var command = new NpgsqlCommand(procedureName, connection, transaction)
        {
            CommandType = CommandType.StoredProcedure
        };
        foreach (var (key, value) in parameters)
            command.Parameters.AddWithValue(key, value);

        var refcursorParam = new NpgsqlParameter(refcursorParameterName, NpgsqlDbType.Refcursor)
        {
            Direction = ParameterDirection.Output
        };
        command.Parameters.Add(refcursorParam);
        command.ExecuteNonQuery();

        string cursorName = (string)refcursorParam.Value;
        if (string.IsNullOrEmpty(cursorName))
            return new List<T>();

        // fetchCommand is disposed here; results are fully materialized before returning.
        using var fetchCommand = new NpgsqlCommand($"FETCH ALL FROM \"{cursorName}\"", connection, transaction);
        using var reader = fetchCommand.ExecuteReader();

        var results = new List<T>();
        while (reader.Read())
            results.Add(map(reader));
        return results;
    }
}

// Usage:
using var connection = new NpgsqlConnection(connectionString);
connection.Open();
using var tx = connection.BeginTransaction();

var users = PostgresHelpers.ExecuteRefcursorProcedure(
    connection, tx,
    "get_users",
    new Dictionary<string, object> { { "p_department_id", departmentId } },
    "cur_result",
    r => new User
    {
        UserId   = r.GetInt32(r.GetOrdinal("user_id")),
        UserName = r.GetString(r.GetOrdinal("user_name")),
        Email    = r.GetString(r.GetOrdinal("email"))
    });

tx.Commit();
```

## Oracle vs. PostgreSQL Summary

| Aspect | Oracle (ODP.NET) | PostgreSQL (Npgsql) |
|--------|------------------|---------------------|
| **Cursor return** | Result set exposed directly in data reader | Cursor name string in output parameter |
| **Data access** | `ExecuteReader()` returns rows immediately | `ExecuteNonQuery()` → get cursor name → `FETCH ALL FROM` |
| **Transaction** | Transparent | CALL and FETCH must share the same transaction |
| **Multiple cursors** | Automatic | Each requires a separate `FETCH` command |
| **Resource lifetime** | Driver-managed | Cursor is open until fetched or transaction ends |

## Migration Checklist

- [ ] Identify all procedures returning `SYS_REFCURSOR` (Oracle) / `refcursor` (PostgreSQL)
- [ ] Replace `ExecuteReader()` with `ExecuteNonQuery()` → cursor name → `FETCH ALL FROM`
- [ ] Wrap each call-and-fetch pair in an explicit transaction
- [ ] Ensure commands and readers are disposed (prefer materializing results inside a helper)
- [ ] Update unit and integration tests

## References

- [PostgreSQL Documentation: Cursors](https://www.postgresql.org/docs/current/plpgsql-cursors.html)
- [PostgreSQL FETCH Command](https://www.postgresql.org/docs/current/sql-fetch.html)
- [Npgsql Refcursor Support](https://github.com/npgsql/npgsql/issues/1887)
