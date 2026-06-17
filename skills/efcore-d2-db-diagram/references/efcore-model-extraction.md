# EF Core Model Extraction

## Files to inspect

Inspect, in this order:

1. `DbContext` classes.
2. `DbSet<T>` declarations.
3. `OnModelCreating`.
4. `IEntityTypeConfiguration<T>` classes.
5. Entity classes.
6. Migrations and model snapshot.
7. Data annotations.

## Mapping priority

When sources conflict, use:

1. Latest migration / model snapshot.
2. Fluent API.
3. Data annotations.
4. EF Core conventions.
5. C# shape.

## Important EF Core APIs

Look for:

- `ToTable`
- `HasKey`
- `HasAlternateKey`
- `HasIndex`
- `IsUnique`
- `Property`
- `HasColumnName`
- `HasColumnType`
- `IsRequired`
- `HasMaxLength`
- `HasConversion`
- `HasOne`
- `WithMany`
- `WithOne`
- `HasForeignKey`
- `OnDelete`
- `OwnsOne`
- `OwnsMany`
- `UsingEntity`
- `Ignore`

## Migrations

Use migrations to detect:

- Actual table names.
- Join tables.
- Shadow FK columns.
- Indexes.
- Composite keys.
- Delete behaviors.
- Migration-only tables.
