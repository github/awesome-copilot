# PostgreSQL Materialized View Refresh Guide

Purpose: Ensure migrated applications keep materialized views current after base-table changes.

## Problem

PostgreSQL materialized views are static snapshots. Updates to source tables do **not** automatically refresh dependent materialized views.

## Migration risk

- Oracle-era assumptions that derived data updates immediately may no longer hold.
- Read paths can return stale rows unless refresh timing is explicitly managed.
- Integration tests may pass once and then fail intermittently if refresh sequencing is not deterministic.

## Required review item

For every migrated path that writes to tables feeding a materialized view, verify the application workflow includes an explicit refresh strategy.

## Refresh patterns

- Immediate refresh in the write workflow when freshness is required:
  ```sql
  REFRESH MATERIALIZED VIEW my_view;
  ```
- Concurrent refresh (when supported and indexed) to reduce read blocking:
  ```sql
  REFRESH MATERIALIZED VIEW CONCURRENTLY my_view;
  ```
- Scheduled/batch refresh when stale windows are acceptable.

## Integration-test expectations

- [ ] Tests that modify source tables assert materialized-view contents only after the intended refresh action.
- [ ] Tests assert stale behavior before refresh when applicable.
- [ ] Tests document whether freshness is immediate or eventual for each affected feature.
