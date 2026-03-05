# Oracle to PostgreSQL: TO_CHAR() Numeric Conversions

## Problem

Oracle allows `TO_CHAR()` to convert numeric types to strings without a format specifier:
```sql
-- Oracle: Works fine
SELECT TO_CHAR(vessel_id) FROM vessels;
SELECT TO_CHAR(fiscal_year) FROM certificates;
```

PostgreSQL requires a format string when using `TO_CHAR()` with numeric types, otherwise it raises:
```
42883: function to_char(numeric) does not exist
```

## Root Cause

- **Oracle**: `TO_CHAR(number)` without a format mask implicitly converts the number to a string using default formatting
- **PostgreSQL**: `TO_CHAR()` always requires an explicit format string for numeric types (e.g., `'999999'`, `'FM999999'`)

## Solution Patterns

### Pattern 1: Use CAST (Recommended)

The cleanest migration approach is to replace `TO_CHAR(numeric_column)` with `CAST(numeric_column AS TEXT)`:

```sql
-- Oracle
SELECT TO_CHAR(vessel_id) AS vessel_item FROM vessels;

-- PostgreSQL (preferred)
SELECT CAST(vessel_id AS TEXT) AS vessel_item FROM vessels;
```

**Advantages:**
- More idiomatic in PostgreSQL
- Clearer intent
- No format string needed

### Pattern 2: Provide Format String

If you need specific numeric formatting, use an explicit format mask:

```sql
-- PostgreSQL with format
SELECT TO_CHAR(vessel_id, 'FM999999') AS vessel_item FROM vessels;
SELECT TO_CHAR(amount, 'FM999999.00') AS amount_text FROM payments;
```

**Format masks:**
- `'FM999999'`: Fixed-width integer (FM = Fill Mode, removes leading spaces)
- `'FM999999.00'`: Decimal with 2 places
- `'999,999.00'`: With thousand separators

### Pattern 3: String Concatenation

For simple concatenation where numeric conversion is implicit:

```sql
-- Oracle
WHERE TO_CHAR(fiscal_year) = '2024'

-- PostgreSQL (using concatenation)
WHERE fiscal_year::TEXT = '2024'
-- or
WHERE CAST(fiscal_year AS TEXT) = '2024'
```

## Migration Checklist

When migrating SQL containing `TO_CHAR()`:

1. **Identify all TO_CHAR() calls**: Search for `TO_CHAR\(` in SQL strings, stored procedures, and application queries
2. **Check the argument type**:
   - **DATE/TIMESTAMP**: Keep `TO_CHAR()` with format string (e.g., `TO_CHAR(date_col, 'YYYY-MM-DD')`)
   - **NUMERIC/INTEGER**: Replace with `CAST(... AS TEXT)` or add format string
3. **Test the output**: Verify that the string representation matches expectations (no unexpected spaces, decimals, etc.)
4. **Update comparison logic**: If comparing numeric-to-string, ensure consistent types on both sides

## Application Code Review

### VB.NET Example

```vb
' Before (Oracle)
StrSQL = "SELECT DISTINCT TO_CHAR(VESSEL_ID) AS VESSEL_ITEM " _
       & "FROM UM001_CERTIFICATE_ISSUED " _
       & "WHERE TO_CHAR(FISCAL_YEAR_APP_NUM) = '" + strYear + "'"

' After (PostgreSQL)
StrSQL = "SELECT DISTINCT CAST(VESSEL_ID AS TEXT) AS VESSEL_ITEM " _
       & "FROM UM001_CERTIFICATE_ISSUED " _
       & "WHERE CAST(FISCAL_YEAR_APP_NUM AS TEXT) = '" + strYear + "'"
```

### C# Example

```csharp
// Before (Oracle)
var sql = "SELECT TO_CHAR(id) AS id_text FROM entities WHERE TO_CHAR(status) = @status";

// After (PostgreSQL)
var sql = "SELECT CAST(id AS TEXT) AS id_text FROM entities WHERE CAST(status AS TEXT) = @status";
```

## Testing Recommendations

1. **Unit Tests**: Verify numeric-to-string conversions return expected values
   ```csharp
   [Fact]
   public void GetVesselNumbers_ReturnsVesselIdsAsStrings()
   {
       var results = dal.GetVesselNumbers(certificateType);
       Assert.All(results, item => Assert.True(int.TryParse(item.DISPLAY_MEMBER, out _)));
   }
   ```

2. **Integration Tests**: Ensure queries with `CAST()` execute without errors
3. **Comparison Tests**: Verify WHERE clauses with numeric-to-string comparisons filter correctly

## Common Locations

Search for `TO_CHAR` in:
- ✅ Stored procedures and functions (DDL scripts)
- ✅ Application data access layers (DAL classes)
- ✅ Dynamic SQL builders
- ✅ Reporting queries
- ✅ ORM/Entity Framework raw SQL

## Error Messages to Watch For

```
Npgsql.PostgresException: 42883: function to_char(numeric) does not exist
Npgsql.PostgresException: 42883: function to_char(integer) does not exist
Npgsql.PostgresException: 42883: function to_char(bigint) does not exist
```

## See Also

- [oracle-to-postgres-type-coercion.md](oracle-to-postgres-type-coercion.md) - Related type conversion issues
- PostgreSQL Documentation: [Data Type Formatting Functions](https://www.postgresql.org/docs/current/functions-formatting.html)
