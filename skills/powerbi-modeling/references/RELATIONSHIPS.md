# Relationships in Power BI

## Relationship Properties

### Cardinality
| Type | Use Case | Notes |
|------|----------|-------|
| One-to-Many (*:1) | Dimension to Fact | Most common, preferred |
| Many-to-One (1:*) | Fact to Dimension | Same as above, direction reversed |
| One-to-One (1:1) | Dimension extensions | Use sparingly |
| Many-to-Many (*:*) | Bridge tables, complex scenarios | Requires careful design |

### Cross-Filter Direction
| Setting | Behavior | When to Use |
|---------|----------|-------------|
| Single | Filters flow from "one" to "many" | Default, best performance |
| Both | Filters flow in both directions | Only when necessary |

## Best Practices

### 1. Prefer One-to-Many Relationships
```
Customer (1) --> (*) Sales
Product  (1) --> (*) Sales
Date     (1) --> (*) Sales
```

### 2. Use Single-Direction Cross-Filtering
Bidirectional filtering:
- Impacts performance negatively
- Can create ambiguous filter paths
- May produce unexpected results

**Only use bidirectional when:**
- Dimension-to-dimension analysis through fact table
- Specific RLS requirements

**Better alternative:** Use CROSSFILTER in DAX measures:
```dax
Countries Sold = 
CALCULATE(
    DISTINCTCOUNT(Customer[Country]),
    CROSSFILTER(Customer[CustomerKey], Sales[CustomerKey], BOTH)
)
```

### 3. One Active Path Between Tables
- Only one active relationship between any two tables
- Use USERELATIONSHIP for role-playing dimensions:

```dax
Sales by Ship Date = 
CALCULATE(
    [Total Sales],
    USERELATIONSHIP(Sales[ShipDate], Date[Date])
)
```

### 4. Avoid Ambiguous Paths
Circular references cause errors. Solutions:
- Deactivate one relationship
- Restructure model
- Use USERELATIONSHIP in measures

## Relationship Patterns

### Standard Star Schema
```
     [Date]
       |
[Product]--[Sales]--[Customer]
       |
   [Store]
```

### Role-Playing Dimension
```
[Date] --(active)-- [Sales.OrderDate]
   |
   +--(inactive)-- [Sales.ShipDate]
```

### Bridge Table (Many-to-Many)
```
[Customer]--(*)--[CustomerAccount]--(*)--[Account]
```

### Factless Fact Table
```
[Product]--[ProductPromotion]--[Promotion]
```
Used to capture relationships without measures.

## Creating Relationships via MCP

### List Current Relationships
```
relationship_operations(operation: "List")
```

### Create New Relationship
```
relationship_operations(
  operation: "Create",
  definitions: [{
    fromTable: "Sales",
    fromColumn: "ProductKey",
    toTable: "Product", 
    toColumn: "ProductKey",
    crossFilteringBehavior: "OneDirection",
    isActive: true
  }]
)
```

### Deactivate Relationship
```
relationship_operations(
  operation: "Deactivate",
  references: [{ name: "relationship-guid-here" }]
)
```

## Troubleshooting

### "Ambiguous Path" Error
Multiple active paths exist between tables.
- Check for: Multiple fact tables sharing dimensions
- Solution: Deactivate redundant relationships

### Bidirectional Not Allowed
Circular reference would be created.
- Solution: Restructure or use DAX CROSSFILTER

### Relationship Not Detected
Columns may have different data types.
- Ensure both columns have identical types
- Check for trailing spaces in text keys

## Validation Checklist

- [ ] All relationships are one-to-many where possible
- [ ] Cross-filter is single direction by default
- [ ] Only one active path between any two tables
- [ ] Role-playing dimensions use inactive relationships
- [ ] No circular reference paths
- [ ] Key columns have matching data types
