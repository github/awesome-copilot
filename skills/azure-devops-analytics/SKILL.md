---
name: azure-devops-analytics
description: Query Azure DevOps Analytics using the OData feed.
---

# Azure DevOps Analytics - OData

Query Azure DevOps Analytics data with OData for work items and historical reporting.

**OData API Version:** v2.0 (latest), v4.0-preview

## Prerequisites

- Project member with Basic access or higher
- Analytics enabled for the organization
- Permission to query Analytics (View Analytics)

## Authentication

Use a PAT with Analytics access and send it as Basic auth.

```bash
# PAT as base64 for curl
# Linux/macOS
PAT_BASE64=$(printf ":%s" "$AZDO_PAT" | base64)

# Windows PowerShell
$PAT_BASE64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$env:AZDO_PAT"))
```

## Base URLs

```text
# Organization-scoped (cross-project)
https://analytics.dev.azure.com/{OrganizationName}/_odata/{version}/

# Project-scoped (recommended for single project)
https://analytics.dev.azure.com/{OrganizationName}/{ProjectName}/_odata/{version}/
```

Notes:
- Use `v2.0` for stable API and `v4.0-preview` for newest features.
- Project-scoped URLs automatically filter to one project and simplify $expand queries.

## Request Templates

### curl

```bash
curl -sS \
  -H "Authorization: Basic $PAT_BASE64" \
  -H "Accept: application/json" \
  "https://analytics.dev.azure.com/{OrganizationName}/{ProjectName}/_odata/v4.0-preview/WorkItems?$select=WorkItemId,Title,State&$top=5"
```

### PowerShell

```powershell
$headers = @{ Authorization = "Basic $PAT_BASE64"; Accept = "application/json" }
$uri = "https://analytics.dev.azure.com/{OrganizationName}/{ProjectName}/_odata/v4.0-preview/WorkItems?`$select=WorkItemId,Title,State&`$top=5"
Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
```

## Query Essentials

### Count entities

Prefer aggregation instead of `$count` URL segment.

```text
https://analytics.dev.azure.com/{OrganizationName}/_odata/v4.0-preview/WorkItems?
  $apply=aggregate($count as Count)
```

### Select specific fields

```text
https://analytics.dev.azure.com/{OrganizationName}/{ProjectName}/_odata/v4.0-preview/WorkItems?
  $select=WorkItemId,WorkItemType,Title,State&$top=3
```

### Filter with multiple conditions

```text
https://analytics.dev.azure.com/{OrganizationName}/{ProjectName}/_odata/v4.0-preview/WorkItems?
  $select=WorkItemId,Title,AssignedTo,State&
  $filter=(WorkItemType eq 'User Story' or WorkItemType eq 'Bug') and (State eq 'New' or State eq 'Active')
```

### Filter by navigation properties

```text
https://analytics.dev.azure.com/{OrganizationName}/{ProjectName}/_odata/v4.0-preview/WorkItems?
  $top=5&
  $filter=Iteration/IterationPath eq '{ProjectName}\\Sprint 3'&
  $select=WorkItemId,WorkItemType,Title,State&
  $orderby=WorkItemId asc
```

### Expand related entities

```text
https://analytics.dev.azure.com/{OrganizationName}/{ProjectName}/_odata/v4.0-preview/WorkItems?
  $filter=WorkItemId eq 480&
  $select=WorkItemId,WorkItemType,Title,State&
  $expand=Iteration($select=IterationName,IterationPath),AssignedTo($select=UserName)
```

### Date filters and time zones

Include time zone offsets with DateTimeOffset filters or use DateSK fields.

```text
# DateTimeOffset with time zone
https://analytics.dev.azure.com/{OrganizationName}/{ProjectName}/_odata/v4.0-preview/WorkItems?
  $filter=CreatedDate ge 2025-01-01T00:00:00-08:00&
  $select=WorkItemId,Title,State

# DateSK for simpler filters
https://analytics.dev.azure.com/{OrganizationName}/{ProjectName}/_odata/v4.0-preview/WorkItems?
  $filter=CreatedDateSK ge 20250101&
  $select=WorkItemId,Title,State
```

### Parameter aliases

```text
https://analytics.dev.azure.com/{OrganizationName}/{ProjectName}/_odata/v4.0-preview/WorkItems?
  $filter=CreatedDateSK ge @createdDateSK&
  $select=WorkItemId,Title,State&
  @createdDateSK=20250101
```

## WorkItems

### Basic list

```text
https://analytics.dev.azure.com/{OrganizationName}/{ProjectName}/_odata/v4.0-preview/WorkItems?
  $select=WorkItemId,Title,State,AssignedTo&
  $filter=State ne 'Closed'&
  $orderby=ChangedDate desc&
  $top=50
```

### Tags filter (recommended)

```text
https://analytics.dev.azure.com/{OrganizationName}/{ProjectName}/_odata/v4.0-preview/WorkItems?
  $filter=Tags/any(t:t/TagName eq 'quality')&
  $select=WorkItemId,Title,State,TagNames
```

## WorkItemRevisions

Use this entity set for history. Do not expand `Revisions` on `WorkItems`.

### Revisions for a single work item

```text
https://analytics.dev.azure.com/{OrganizationName}/{ProjectName}/_odata/v4.0-preview/WorkItemRevisions?
  $filter=WorkItemId eq 480&
  $select=WorkItemId,Revision,State,ChangedDate,Title
```

### Revisions for active work items

```text
https://analytics.dev.azure.com/{OrganizationName}/{ProjectName}/_odata/v4.0-preview/WorkItemRevisions?
  $filter=WorkItem/State eq 'Active'&
  $select=WorkItemId,Revision,State,ChangedDate,Title
```

## WorkItemsSnapshot

Snapshot entities are for aggregation only. Always use $apply and include DateSK or DateValue in groupby.

### Daily count by date

```text
https://analytics.dev.azure.com/{OrganizationName}/{ProjectName}/_odata/v4.0-preview/WorkItemsSnapshot?
  $apply=
    filter(DateSK ge 20250101 and DateSK le 20250131)/
    groupby((DateValue), aggregate($count as Count))
```

### Monthly trend (use IsLastDayOfPeriod)

```text
https://analytics.dev.azure.com/{OrganizationName}/{ProjectName}/_odata/v4.0-preview/WorkItemsSnapshot?
  $apply=
    filter(IsLastDayOfPeriod has Microsoft.VisualStudio.Services.Analytics.Model.Period'Month')/
    groupby((DateValue), aggregate($count as Count))
```

## Paging and limits

- Use server-driven paging via `@odata.nextLink`.
- Avoid client paging with `$skip` and `$top` together; use `$top` only for small samples.
- Keep responses under 800 columns by using explicit `$select` in main and `$expand` clauses.
- GET query length is limited (about 3000 chars). Use the batch endpoint for long queries.

## Batch for long queries

The batch endpoint supports a single operation for long URLs.

```bash
curl -sS \
  -H "Authorization: Basic $PAT_BASE64" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"requests":[{"id":"1","method":"GET","url":"/WorkItems?$select=WorkItemId,Title,State&$filter=State eq \'Active\'"}]}' \
  "https://analytics.dev.azure.com/{OrganizationName}/{ProjectName}/_odata/v4.0-preview/$batch"
```

## Query guidelines (high value)

- Always include `$select` or `$apply` to avoid warnings and large responses.
- Use project-scoped endpoints for single-project reporting.
- Filter by project or include project filters in `$expand` to avoid access errors.
- Do not use snapshot entities without aggregation.
- Do not use key addressing like `WorkItems(1)`; use `$filter=WorkItemId eq 1`.
- Do not expand `Revisions` on `WorkItems`; use `WorkItemRevisions` instead.
- Avoid mixing `$apply` and `$filter` in the same query.

## Performance tips

- Use `RevisedDateSK` filters for history queries on `WorkItemRevisions` and `WorkItemsSnapshot`.
- Prefer DateSK-based filters for large date ranges.
- Prefer `Tags/any(...)` for filtering and `TagNames` for display.
- Use `Prefer: VSTS.Analytics.MaxSize={N}` to fail fast on large datasets.

## Error and warning handling

- Review `@vsts.warnings` in responses and adjust queries.
- 400 responses include detailed `message` fields explaining invalid queries.
