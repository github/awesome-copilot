# Row-Level Security (RLS) in Power BI

## Overview

Row-Level Security restricts data access at the row level based on user identity. Users see only the data they're authorized to view.

## Design Principles

### 1. Filter on Dimension Tables
Apply RLS to dimensions, not fact tables:
- More efficient (smaller tables)
- Filters propagate through relationships
- Easier to maintain

```dax
// On Customer dimension - filters propagate to Sales
[Region] = "West"
```

### 2. Create Minimal Roles
Avoid many role combinations:
- Each role = separate cache
- Roles are additive (union, not intersection)
- Consolidate where possible

### 3. Use Dynamic RLS When Possible
Data-driven rules scale better:
- User mapping in a table
- USERPRINCIPALNAME() for identity
- No role changes when users change

## Static vs Dynamic RLS

### Static RLS
Fixed rules per role:
```dax
// Role: West Region
[Region] = "West"

// Role: East Region  
[Region] = "East"
```

**Pros:** Simple, clear
**Cons:** Doesn't scale, requires role per group

### Dynamic RLS
User identity drives filtering:
```dax
// Single role filters based on logged-in user
[ManagerEmail] = USERPRINCIPALNAME()
```

**Pros:** Scales, self-maintaining
**Cons:** Requires user mapping data

## Implementation Patterns

### Pattern 1: Direct User Mapping
User email in dimension table:
```dax
// On Customer table
[CustomerEmail] = USERPRINCIPALNAME()
```

### Pattern 2: Security Table
Separate table mapping users to data:
```
SecurityMapping table:
| UserEmail | Region |
|-----------|--------|
| joe@co.com | West  |
| sue@co.com | East  |
```

```dax
// On Region dimension
[Region] IN 
    SELECTCOLUMNS(
        FILTER(SecurityMapping, [UserEmail] = USERPRINCIPALNAME()),
        "Region", [Region]
    )
```

### Pattern 3: Manager Hierarchy
Users see their data plus subordinates:
```dax
// Using PATH functions for hierarchy
PATHCONTAINS(Employee[ManagerPath], 
    LOOKUPVALUE(Employee[EmployeeID], Employee[Email], USERPRINCIPALNAME()))
```

### Pattern 4: Multiple Rules
Combine conditions:
```dax
// Users see their region OR if they're a global viewer
[Region] = LOOKUPVALUE(Users[Region], Users[Email], USERPRINCIPALNAME())
|| LOOKUPVALUE(Users[IsGlobal], Users[Email], USERPRINCIPALNAME()) = TRUE()
```

## Creating Roles via MCP

### List Existing Roles
```
security_role_operations(operation: "List")
```

### Create Role with Permission
```
security_role_operations(
  operation: "Create",
  definitions: [{
    name: "Regional Sales",
    modelPermission: "Read",
    description: "Restricts sales data by region"
  }]
)
```

### Add Table Permission (Filter)
```
security_role_operations(
  operation: "CreatePermissions",
  permissionDefinitions: [{
    roleName: "Regional Sales",
    tableName: "Customer",
    filterExpression: "[Region] = USERPRINCIPALNAME()"
  }]
)
```

### Get Effective Permissions
```
security_role_operations(
  operation: "GetEffectivePermissions",
  references: [{ name: "Regional Sales" }]
)
```

## Testing RLS

### In Power BI Desktop
1. Modeling tab > View As
2. Select role(s) to test
3. Optionally specify user identity
4. Verify data filtering

### Test Unexpected Values
For dynamic RLS, test:
- Valid users
- Unknown users (should see nothing or error gracefully)
- NULL/blank values

```dax
// Defensive pattern - returns no data for unknown users
IF(
    USERPRINCIPALNAME() IN VALUES(SecurityMapping[UserEmail]),
    [Region] IN SELECTCOLUMNS(...),
    FALSE()
)
```

## Common Mistakes

### 1. RLS on Fact Tables Only
**Problem:** Large table scans, poor performance
**Solution:** Apply to dimension tables, let relationships propagate

### 2. Using LOOKUPVALUE Instead of Relationships
**Problem:** Expensive, doesn't scale
**Solution:** Create proper relationships, let filters flow

### 3. Expecting Intersection Behavior
**Problem:** Multiple roles = UNION (additive), not intersection
**Solution:** Design roles with union behavior in mind

### 4. Forgetting About DirectQuery
**Problem:** RLS filters become WHERE clauses
**Solution:** Ensure source database can handle the query patterns

### 5. Not Testing Edge Cases
**Problem:** Users see unexpected data
**Solution:** Test with: valid users, invalid users, multiple roles

## Bidirectional RLS

For bidirectional relationships with RLS:
```
Enable "Apply security filter in both directions"
```

Only use when:
- RLS requires filtering through many-to-many
- Dimension-to-dimension security needed

**Caution:** Only one bidirectional relationship per path allowed.

## Performance Considerations

- RLS adds WHERE clauses to every query
- Complex DAX in filters hurts performance
- Test with realistic user counts
- Consider aggregations for large models

## Object-Level Security (OLS)

Restrict access to entire tables or columns:
```
// Via XMLA/TMSL - not available in Desktop UI
```

Use for:
- Hiding sensitive columns (salary, SSN)
- Restricting entire tables
- Combined with RLS for comprehensive security

## Validation Checklist

- [ ] RLS applied to dimension tables (not fact tables)
- [ ] Filters propagate correctly through relationships
- [ ] Dynamic RLS uses USERPRINCIPALNAME()
- [ ] Tested with valid and invalid users
- [ ] Edge cases handled (NULL, unknown users)
- [ ] Performance tested under load
- [ ] Role mappings documented
- [ ] Workspace roles understood (Admins bypass RLS)
