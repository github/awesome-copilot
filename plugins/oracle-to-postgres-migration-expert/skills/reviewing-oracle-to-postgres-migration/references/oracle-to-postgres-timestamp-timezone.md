# Oracle to PostgreSQL: CURRENT_TIMESTAMP and NOW() Timezone Handling

## Contents

- Problem
- Behavior Comparison
- PostgreSQL Timezone Precedence
- Common Error Symptoms
- Migration Actions — Npgsql config, DateTime normalization, stored procedures, session timezone, application code
- Integration Test Patterns
- Checklist

## Problem

Oracle's `CURRENT_TIMESTAMP` returns a value in the **session timezone** and stores it in the column's declared precision. When .NET reads this value back via ODP.NET, it is surfaced as a `DateTime` with `Kind=Local`, reflecting the OS timezone of the client.

PostgreSQL's `CURRENT_TIMESTAMP` and `NOW()` both return a `timestamptz` (timestamp with time zone) anchored to **UTC**, regardless of the session timezone setting. How Npgsql surfaces this value depends on the driver version and configuration:

- **Npgsql < 6 / legacy mode (`EnableLegacyTimestampBehavior = true`):** `timestamptz` columns are returned as `DateTime` with `Kind=Unspecified`. This is the source of silent timezone bugs when migrating from Oracle.
- **Npgsql 6+ with legacy mode disabled (the new default):** `timestamptz` columns are returned as `DateTime` with `Kind=Utc`, and writing a `Kind=Unspecified` value throws an exception at insertion time.

Projects that have not yet upgraded to Npgsql 6+, or that explicitly opt back into legacy mode, remain vulnerable to the `Kind=Unspecified` issue. This mismatch — and the ease of accidentally re-enabling legacy mode — causes silent data corruption, incorrect comparisons, and off-by-N-hours bugs that are extremely difficult to trace.

---

## Behavior Comparison

| Aspect | Oracle | PostgreSQL |
|---|---|---|
| `CURRENT_TIMESTAMP` type | `TIMESTAMP WITH LOCAL TIME ZONE` | `timestamptz` (UTC-normalised) |
| Client `DateTime.Kind` via driver | `Local` | `Unspecified` (Npgsql < 6 / legacy mode); `Utc` (Npgsql 6+ default) |
| Session timezone influence | Yes — affects stored/returned value | Affects *display* only; UTC stored internally |
| NOW() equivalent | `SYSDATE` / `CURRENT_TIMESTAMP` | `NOW()` = `CURRENT_TIMESTAMP` (both return `timestamptz`) |
| Implicit conversion on comparison | Oracle applies session TZ offset | PostgreSQL compares UTC; session TZ is display-only |

---

## PostgreSQL Timezone Precedence

PostgreSQL resolves the effective session timezone using the following hierarchy (highest priority wins):

| Level | How it is set |
|---|---|
| **Session** | `SET TimeZone = 'UTC'` sent at connection open |
| **Role** | `ALTER ROLE app_user SET TimeZone = 'UTC'` |
| **Database** | `ALTER DATABASE mydb SET TimeZone = 'UTC'` |
| **Server** | `postgresql.conf` → `TimeZone = 'America/New_York'` |

The session timezone does **not** affect the stored UTC value of a `timestamptz` column — it only controls how `SHOW timezone` and `::text` casts format a value for display. Application code that relies on `DateTime.Kind` or compares timestamps without an explicit timezone can produce incorrect results if the server's default timezone is not UTC.

---

## Common Error Symptoms

- Timestamps read from PostgreSQL have `Kind=Unspecified`; comparisons with `DateTime.UtcNow` or `DateTime.Now` produce incorrect results.
- Date-range queries return too few or too many rows because the WHERE clause comparison is evaluated in a timezone that differs from the stored UTC value.
- Integration tests pass on a developer machine (UTC OS timezone) but fail in CI or production (non-UTC timezone).
- Stored procedure output parameters carrying timestamps arrive with a session-offset applied by the server but are then compared to UTC values in the application.

---

## Migration Actions

### 1. Configure Npgsql for UTC via Connection String or AppContext

Npgsql 6+ ships with `EnableLegacyTimestampBehavior` set to `false` by default, which causes `timestamptz` values to be returned as `DateTime` with `Kind=Utc`. Explicitly setting the switch at startup is still recommended to guard against accidental opt-in to legacy mode (e.g., via a config file or a transitive dependency) and to make the intent visible to future maintainers:

```csharp
// Program.cs / Startup.cs — apply once at application start
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", false);
```

With this switch disabled, Npgsql throws if you try to write a `DateTime` with `Kind=Unspecified` to a `timestamptz` column, making timezone bugs loud and detectable at insertion time rather than silently at query time.

### 2. Normalise DateTime Values Before Persistence

Replace any `DateTime.Now` with `DateTime.UtcNow` throughout the migrated codebase. For values that originate from external input (e.g., user-provided dates deserialized from JSON), ensure they are converted to UTC before being saved:

```csharp
// Before (Oracle-era code — relied on session/OS timezone)
var timestamp = DateTime.Now;

// After (PostgreSQL-compatible)
var timestamp = DateTime.UtcNow;

// For externally-supplied values
var utcTimestamp = dateTimeInput.Kind == DateTimeKind.Utc
    ? dateTimeInput
    : dateTimeInput.ToUniversalTime();
```

### 3. Fix Stored Procedures Using CURRENT_TIMESTAMP / NOW()

Stored procedures that assign `CURRENT_TIMESTAMP` or `NOW()` to a `timestamp without time zone` (`timestamp`) column must be reviewed. Prefer `timestamptz` columns or cast explicitly:

```sql
-- Ambiguous: server timezone influences interpretation
INSERT INTO audit_log (created_at) VALUES (NOW()::timestamp);

-- Safe: always UTC
INSERT INTO audit_log (created_at) VALUES (NOW() AT TIME ZONE 'UTC');

-- Or: use timestamptz column type and let PostgreSQL store UTC natively
INSERT INTO audit_log (created_at) VALUES (CURRENT_TIMESTAMP);
```

### 4. Force Session Timezone on Connection Open (Defence-in-Depth)

Regardless of role or database defaults, set the session timezone explicitly when opening a connection. This guarantees consistent behavior independent of server configuration:

```csharp
// Npgsql connection string approach
var connString = "Host=localhost;Database=mydb;Username=app;Password=...;Timezone=UTC";

// Or: apply via NpgsqlDataSourceBuilder
var dataSource = new NpgsqlDataSourceBuilder(connString)
    .Build();

// Or: execute on every new connection
await using var conn = new NpgsqlConnection(connString);
await conn.OpenAsync();
await using var cmd = new NpgsqlCommand("SET TimeZone = 'UTC'", conn);
await cmd.ExecuteNonQueryAsync();
```

### 5. Application Code — Avoid DateTime.Kind=Unspecified

Audit all repository and data-access code that reads timestamp columns. Where Npgsql returns `Unspecified`, either configure the data source globally (option 1 above) or wrap the read:

```csharp
// Safe reader helper — convert Unspecified to Utc at the boundary
DateTime ReadUtcDateTime(NpgsqlDataReader reader, int ordinal)
{
    var dt = reader.GetDateTime(ordinal);
    return dt.Kind == DateTimeKind.Unspecified
        ? DateTime.SpecifyKind(dt, DateTimeKind.Utc)
        : dt.ToUniversalTime();
}
```

---

## Integration Test Patterns

### Test: Verify timestamps persist and return as UTC

```csharp
[Fact]
public async Task InsertedTimestamp_ShouldRoundTripAsUtc()
{
    var before = DateTime.UtcNow;

    await repository.InsertAuditEntryAsync(/* ... */);

    var retrieved = await repository.GetLatestAuditEntryAsync();

    Assert.Equal(DateTimeKind.Utc, retrieved.CreatedAt.Kind);
    Assert.True(retrieved.CreatedAt >= before,
        "Persisted CreatedAt should not be earlier than the pre-insert UTC timestamp.");
}
```

### Test: Verify timestamp comparisons across Oracle and PostgreSQL baselines

```csharp
[Fact]
public async Task TimestampComparison_ShouldReturnSameRowsAsOracle()
{
    var cutoff = DateTime.UtcNow.AddDays(-1);

    var oracleResults = await oracleRepository.GetEntriesAfter(cutoff);
    var postgresResults = await postgresRepository.GetEntriesAfter(cutoff);

    Assert.Equal(oracleResults.Count, postgresResults.Count);
}
```

---

## Checklist

- [ ] `AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", false)` applied at application startup.
- [ ] All `DateTime.Now` usages in data-access code replaced with `DateTime.UtcNow`.
- [ ] Connection string or connection-open hook sets `Timezone=UTC` / `SET TimeZone = 'UTC'`.
- [ ] Stored procedures that use `CURRENT_TIMESTAMP` or `NOW()` reviewed; `timestamp without time zone` columns explicitly cast or replaced with `timestamptz`.
- [ ] Integration tests assert `DateTime.Kind == Utc` on retrieved timestamp values.
- [ ] Tests cover date-range queries to confirm row counts match Oracle baseline.
