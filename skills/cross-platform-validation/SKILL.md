---
name: 'cross-platform-validation'
description: 'Skill to contrast recommendations with official documentation and map equivalences between database platforms'
---

# Cross-Platform Validation and Official References

## Purpose
Ensure that each recommendation issued by Boost DBA is supported by official documentation and is valid for the client's specific platform and version.

## Source of Truth
Official vendor documentation (Microsoft Docs, PostgreSQL docs, AWS RDS docs) and platform-specific release notes.

## Entries
- Recommendation to validate
- Target platform (SQL Server / Azure SQL / PostgreSQL / AWS RDS / Cosmos DB)
- Specific version or tier (if known)

## Departures
- Recommendation validated with citation of official source
- Compatibility note by version/tier
- Equivalences on other platforms (if applicable)
- Warnings for different behavior between platforms

## Validation Protocol

### Step 1: Identify platform and version
```
Platform: [SQL Server 2019 / Azure SQL Standard / PostgreSQL 15 / ...]
Minimum required version: [...]
Available in tier: [Basic / Standard / Premium / ...]
```

### Step 2: Contrast with official reference
- Search official vendor documentation for the canonical link
- Verify that the documented behavior matches the recommendation
- Note if there are behavior changes between versions

### Step 3: Validated recommendation format
```
RECOMMENDATION: [description]
PLATFORM: [SQL Server / Azure SQL / ...]
MINIMUM VERSION: [2016 / Gen5 / PostgreSQL 12 / ...]
OFFICIAL SOURCE: [URL]
APPLIES IN TIER: [all / Premium / ...]
COMPATIBILITY NOTES: [cross-platform differences if any]
```

### Step 4: Cross-platform mapping (if migration applies)
| Appearance | Origin | Destination | Gap / Equivalence |
|---------|--------|---------|-------------------|
| [feature] | [source implementation] | [target implementation] | [gap or equivalent] |

## Quality Checklist
- [ ] Official source cited with URL
- [ ] Minimum documented version
- [ ] Tier or edition specified when applicable
- [ ] Different behaviors between platforms explicitly noted
- [ ] No extrapolations without documentary evidence
