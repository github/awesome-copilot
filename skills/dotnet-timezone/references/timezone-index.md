# .NET Timezone Reference Index

## Windows To IANA Mapping

Use this file for common mappings between Windows timezone IDs and IANA timezone IDs.

### Asia And Pacific

| Display Name | Windows ID | IANA ID | UTC Offset | DST? |
| --- | --- | --- | --- | --- |
| Sri Lanka Standard Time | Sri Lanka Standard Time | Asia/Colombo | +05:30 | No |
| India Standard Time | India Standard Time | Asia/Calcutta | +05:30 | No |
| Pakistan Standard Time | Pakistan Standard Time | Asia/Karachi | +05:00 | No |
| Bangladesh Standard Time | Bangladesh Standard Time | Asia/Dhaka | +06:00 | No |
| Nepal Standard Time | Nepal Standard Time | Asia/Katmandu | +05:45 | No |
| SE Asia Standard Time | SE Asia Standard Time | Asia/Bangkok | +07:00 | No |
| Singapore Standard Time | Singapore Standard Time | Asia/Singapore | +08:00 | No |
| China Standard Time | China Standard Time | Asia/Shanghai | +08:00 | No |
| Tokyo Standard Time | Tokyo Standard Time | Asia/Tokyo | +09:00 | No |
| Korea Standard Time | Korea Standard Time | Asia/Seoul | +09:00 | No |
| AUS Eastern Standard Time | AUS Eastern Standard Time | Australia/Sydney | +10:00/+11:00 | Yes |
| New Zealand Standard Time | New Zealand Standard Time | Pacific/Auckland | +12:00/+13:00 | Yes |
| Arabian Standard Time | Arabian Standard Time | Asia/Dubai | +04:00 | No |
| Arab Standard Time | Arab Standard Time | Asia/Riyadh | +03:00 | No |
| Israel Standard Time | Israel Standard Time | Asia/Jerusalem | +02:00/+03:00 | Yes |
| Turkey Standard Time | Turkey Standard Time | Europe/Istanbul | +03:00 | No |

### Europe

| Display Name | Windows ID | IANA ID | UTC Offset | DST? |
| --- | --- | --- | --- | --- |
| UTC | UTC | Etc/UTC | +00:00 | No |
| GMT Standard Time | GMT Standard Time | Europe/London | +00:00/+01:00 | Yes |
| W. Europe Standard Time | W. Europe Standard Time | Europe/Berlin | +01:00/+02:00 | Yes |
| Central Europe Standard Time | Central Europe Standard Time | Europe/Budapest | +01:00/+02:00 | Yes |
| Romance Standard Time | Romance Standard Time | Europe/Paris | +01:00/+02:00 | Yes |
| E. Europe Standard Time | E. Europe Standard Time | Asia/Nicosia | +02:00/+03:00 | Yes |
| GTB Standard Time | GTB Standard Time | Europe/Bucharest | +02:00/+03:00 | Yes |
| Russian Standard Time | Russian Standard Time | Europe/Moscow | +03:00 | No |

### Americas

| Display Name | Windows ID | IANA ID | UTC Offset | DST? |
| --- | --- | --- | --- | --- |
| Eastern Standard Time | Eastern Standard Time | America/New_York | -05:00/-04:00 | Yes |
| Central Standard Time | Central Standard Time | America/Chicago | -06:00/-05:00 | Yes |
| Mountain Standard Time | Mountain Standard Time | America/Denver | -07:00/-06:00 | Yes |
| Pacific Standard Time | Pacific Standard Time | America/Los_Angeles | -08:00/-07:00 | Yes |
| Alaskan Standard Time | Alaskan Standard Time | America/Anchorage | -09:00/-08:00 | Yes |
| Hawaiian Standard Time | Hawaiian Standard Time | Pacific/Honolulu | -10:00 | No |
| Canada Central Standard Time | Canada Central Standard Time | America/Regina | -06:00 | No |
| SA Eastern Standard Time | SA Eastern Standard Time | America/Cayenne | -03:00 | No |
| E. South America Standard Time | E. South America Standard Time | America/Sao_Paulo | -03:00/-02:00 | Yes |

### Africa

| Display Name | Windows ID | IANA ID | UTC Offset | DST? |
| --- | --- | --- | --- | --- |
| South Africa Standard Time | South Africa Standard Time | Africa/Johannesburg | +02:00 | No |
| Egypt Standard Time | Egypt Standard Time | Africa/Cairo | +02:00 | No |
| E. Africa Standard Time | E. Africa Standard Time | Africa/Nairobi | +03:00 | No |
| W. Central Africa Standard Time | W. Central Africa Standard Time | Africa/Lagos | +01:00 | No |
| Morocco Standard Time | Morocco Standard Time | Africa/Casablanca | +00:00/+01:00 | Yes |

## NodaTime Providers

```csharp
DateTimeZoneProviders.Tzdb["Asia/Colombo"]
DateTimeZoneProviders.Bcl["Sri Lanka Standard Time"]
```

## TimeZoneConverter Examples

```csharp
string ianaId = TZConvert.WindowsToIana("Sri Lanka Standard Time");
string windowsId = TZConvert.IanaToWindows("Asia/Colombo");
TimeZoneInfo tz = TZConvert.GetTimeZoneInfo("Asia/Colombo");
```

## Programmatic Discovery

```csharp
foreach (var tz in TimeZoneInfo.GetSystemTimeZones())
{
    Console.WriteLine($"ID: {tz.Id} | Display: {tz.DisplayName}");
}
```
