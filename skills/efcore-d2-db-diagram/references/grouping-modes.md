# Grouping Modes

## bounded-context

Group tables by domain area using folder, namespace and naming clues.

Examples:

- Clients
- Offers
- Freelances
- Billing
- Audit
- Identity

## schema

Group by database schema from `ToTable` or migrations.

## namespace

Group by C# namespace.

## flat

Do not create containers.

Use flat mode for small schemas or when the user wants maximum compatibility.
