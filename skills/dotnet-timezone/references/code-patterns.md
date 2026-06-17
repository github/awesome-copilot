# .NET Timezone Code Patterns

## Pattern 1: Basic TimeZoneInfo

Use this only when the application is Windows-only and Windows timezone IDs are acceptable.

```csharp
DateTime utcNow = DateTime.UtcNow;
TimeZoneInfo sriLankaTz = TimeZoneInfo.FindSystemTimeZoneById("Sri Lanka Standard Time");
DateTime localTime = TimeZoneInfo.ConvertTimeFromUtc(utcNow, sriLankaTz);

DateTime backToUtc = TimeZoneInfo.ConvertTimeToUtc(localTime, sriLankaTz);

TimeZoneInfo tokyoTz = TimeZoneInfo.FindSystemTimeZoneById("Tokyo Standard Time");
DateTime tokyoTime = TimeZoneInfo.ConvertTime(localTime, sriLankaTz, tokyoTz);
```

Use `TimeZoneConverter` or `NodaTime` instead for Linux, containers, or mixed environments.

## Pattern 2: Cross-Platform With TimeZoneConverter

Recommended default for most .NET apps that run across Windows and Linux.

```xml
<PackageReference Include="TimeZoneConverter" Version="6.*" />
```

```csharp
using TimeZoneConverter;

TimeZoneInfo tz = TZConvert.GetTimeZoneInfo("Asia/Colombo");
DateTime converted = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
```

This also accepts Windows IDs:

```csharp
TimeZoneInfo tz = TZConvert.GetTimeZoneInfo("Sri Lanka Standard Time");
```

## Pattern 3: NodaTime

Use this for strict timezone arithmetic, recurring schedules, or DST edge cases where correctness matters more than minimal dependencies.

```xml
<PackageReference Include="NodaTime" Version="3.*" />
```

```csharp
using NodaTime;

DateTimeZone colomboZone = DateTimeZoneProviders.Tzdb["Asia/Colombo"];
Instant now = SystemClock.Instance.GetCurrentInstant();
ZonedDateTime colomboTime = now.InZone(colomboZone);

DateTimeZone tokyoZone = DateTimeZoneProviders.Tzdb["Asia/Tokyo"];
ZonedDateTime tokyoTime = colomboTime.WithZone(tokyoZone);

LocalDateTime localDt = new LocalDateTime(2024, 6, 15, 14, 30, 0);
ZonedDateTime zoned = colomboZone.AtStrictly(localDt);
Instant utcInstant = zoned.ToInstant();
```

## Pattern 4: DateTimeOffset For APIs

Prefer `DateTimeOffset` for values crossing service or process boundaries.

```csharp
using TimeZoneConverter;

DateTimeOffset utcNow = DateTimeOffset.UtcNow;
TimeZoneInfo tz = TZConvert.GetTimeZoneInfo("Asia/Colombo");
DateTimeOffset colomboTime = TimeZoneInfo.ConvertTime(utcNow, tz);
```

## Pattern 5: ASP.NET Core Persistence And Presentation

Store UTC, convert at the edges.

```csharp
using TimeZoneConverter;

entity.CreatedAtUtc = DateTime.UtcNow;

public DateTimeOffset ToUserTime(DateTime utc, string userIanaTimezone)
{
    var tz = TZConvert.GetTimeZoneInfo(userIanaTimezone);
    return TimeZoneInfo.ConvertTimeFromUtc(utc, tz);
}
```

## Pattern 6: Scheduling And Recurring Jobs

Translate a user-facing local time to UTC before scheduling.

```csharp
using TimeZoneConverter;

TimeZoneInfo tz = TZConvert.GetTimeZoneInfo("Asia/Colombo");
DateTime scheduledLocal = new DateTime(2024, 12, 1, 9, 0, 0, DateTimeKind.Unspecified);
DateTime scheduledUtc = TimeZoneInfo.ConvertTimeToUtc(scheduledLocal, tz);
```

With Hangfire:

```csharp
RecurringJob.AddOrUpdate(
    "morning-job",
    () => DoWork(),
    "0 9 * * *",
    new RecurringJobOptions { TimeZone = tz });
```

## Pattern 7: Ambiguous And Invalid DST Times

Check for repeated or skipped local timestamps when the timezone observes daylight saving time.

```csharp
using TimeZoneConverter;

TimeZoneInfo tz = TZConvert.GetTimeZoneInfo("America/New_York");
DateTime localTime = new DateTime(2024, 11, 3, 1, 30, 0);

if (tz.IsAmbiguousTime(localTime))
{
    var offsets = tz.GetAmbiguousTimeOffsets(localTime);
    var standardOffset = offsets.Min();
    var dto = new DateTimeOffset(localTime, standardOffset);
}

if (tz.IsInvalidTime(localTime))
{
    localTime = localTime.AddHours(1);
}
```

## Common Mistakes

| Wrong | Better |
| --- | --- |
| `DateTime.Now` in server code | `DateTime.UtcNow` |
| Storing local timestamps in the database | Store UTC and convert for display |
| Hardcoding offsets such as `+05:30` | Use timezone IDs |
| Using `FindSystemTimeZoneById("Asia/Colombo")` on Windows | Use `TZConvert.GetTimeZoneInfo("Asia/Colombo")` |
| Comparing local `DateTime` values from different zones | Compare UTC or use `DateTimeOffset` |
| Creating `DateTime` without intentional kind semantics | Use `Utc`, `Local`, or deliberate `Unspecified` |

## Decision Guide

- Use `TimeZoneInfo` only for Windows-only code with Windows IDs.
- Use `TimeZoneConverter` for most cross-platform applications.
- Use `NodaTime` when DST arithmetic or calendaring accuracy is central.
- Use `DateTimeOffset` for APIs and serialized timestamps.
