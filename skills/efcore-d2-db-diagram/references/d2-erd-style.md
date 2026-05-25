# D2 ERD Style

## Recommended header

```d2
vars: {
  d2-config: {
    layout-engine: elk
    theme-id: 300
  }
}
```

## Table node

```d2
Clients: {
  shape: sql_table
  Id: uuid {constraint: primary_key}
  Name: varchar(200)
  Status: enum
}
```

## Relationship

```d2
Offers.ClientId -> Clients.Id: "N:1"
```

## Styles

```d2
classes: {
  join_table: {
    style.stroke-dash: 4
  }
  technical: {
    style.opacity: 0.55
  }
  optional_relation: {
    style.stroke-dash: 3
  }
}
```
