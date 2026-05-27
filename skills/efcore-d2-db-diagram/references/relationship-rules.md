# Relationship Rules

## One-to-many

Detected from:

- `HasOne(...).WithMany(...)`
- FK property on dependent entity.
- Collection navigation on principal entity.

Render dependent to principal:

```d2
Orders.ClientId -> Clients.Id: "N:1"
```

## One-to-one

Detected from:

- `HasOne(...).WithOne(...)`
- Unique FK index.
- Shared primary key relationship.

Render dependent to principal:

```d2
ClientProfiles.ClientId -> Clients.Id: "1:1"
```

## Many-to-many

Detected from:

- `UsingEntity`
- Two collection navigations without explicit join entity.
- Migration-created join table with two FKs and composite key.

Render the join table explicitly by default.

## Owned types

Detected from:

- `OwnsOne`
- `OwnsMany`
- `[Owned]`

Inline by default unless table splitting or separate table mapping is detected.

## Optional relationships

A relationship is optional when:

- FK is nullable.
- `IsRequired(false)` is configured.
- Migration column is nullable.

Use dashed line for optional relationships.
