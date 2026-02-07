# Star Schema Design for Power BI

## Overview

Star schema is the optimal design pattern for Power BI semantic models. It organizes data into:
- **Dimension tables**: Enable filtering and grouping (the "one" side)
- **Fact tables**: Enable summarization (the "many" side)

## Table Classification

### Dimension Tables
- Contain descriptive attributes for filtering/slicing
- Have unique key columns (one row per entity)
- Examples: Customer, Product, Date, Geography, Employee
- Naming convention: Singular noun (`Customer`, `Product`)

### Fact Tables  
- Contain measurable, quantitative data
- Have foreign keys to dimensions
- Store data at consistent grain (one row per transaction/event)
- Examples: Sales, Orders, Inventory, WebVisits
- Naming convention: Business process noun (`Sales`, `Orders`)

## Design Principles

### 1. Separate Dimensions from Facts
```
BAD:  Single denormalized "Sales" table with customer details
GOOD: "Sales" fact table + "Customer" dimension table
```

### 2. Consistent Grain
Every row in a fact table represents the same thing:
- Order line level (most common)
- Daily aggregation
- Monthly summary

Never mix grains in one table.

### 3. Surrogate Keys
Add surrogate keys when source lacks unique identifiers:
```m
// Power Query: Add index column
= Table.AddIndexColumn(Source, "CustomerKey", 1, 1)
```

### 4. Date Dimension
Always create a dedicated date table:
- Mark as date table in Power BI
- Include fiscal periods if needed
- Add relative date columns (IsCurrentMonth, IsPreviousYear)

```dax
Date = 
ADDCOLUMNS(
    CALENDAR(DATE(2020,1,1), DATE(2030,12,31)),
    "Year", YEAR([Date]),
    "Month", FORMAT([Date], "MMMM"),
    "MonthNum", MONTH([Date]),
    "Quarter", "Q" & FORMAT([Date], "Q"),
    "WeekDay", FORMAT([Date], "dddd")
)
```

## Special Dimension Types

### Role-Playing Dimensions
Same dimension used multiple times (e.g., Date for OrderDate, ShipDate):
- Option 1: Duplicate the table (OrderDate, ShipDate tables)
- Option 2: Use inactive relationships with USERELATIONSHIP in DAX

### Slowly Changing Dimensions (Type 2)
Track historical changes with version columns:
- StartDate, EndDate columns
- IsCurrent flag
- Requires pre-processing in data warehouse

### Junk Dimensions
Combine low-cardinality flags into one table:
```
OrderFlags dimension: IsRush, IsGift, IsOnline
```

### Degenerate Dimensions
Keep transaction identifiers (OrderNumber, InvoiceID) in fact table.

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Wide denormalized tables | Poor performance, hard to maintain | Split into star schema |
| Snowflake (normalized dims) | Extra joins hurt performance | Flatten dimensions |
| Many-to-many without bridge | Ambiguous results | Add bridge/junction table |
| Mixed grain facts | Incorrect aggregations | Separate tables per grain |

## Validation Checklist

- [ ] Each table is clearly dimension or fact
- [ ] Fact tables have foreign keys to all related dimensions
- [ ] Dimensions have unique key columns
- [ ] Date table exists and is marked
- [ ] No circular relationship paths
- [ ] Consistent naming conventions
