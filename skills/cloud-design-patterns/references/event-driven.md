# Event-Driven Architecture Patterns

## Event Sourcing Pattern

**Problem**: Need complete audit trail of all changes to application state.

**Solution**: Use an append-only store to record the full series of events that describe actions taken on data in a domain.

**When to Use**:
- Requiring complete audit trail
- Implementing temporal queries (point-in-time state)
- Supporting event replay and debugging
- Implementing CQRS with eventual consistency

**Implementation Considerations**:
- Store events in append-only log
- Rebuild current state by replaying events
- Implement event versioning strategy
- Handle event schema evolution
- Consider storage growth over time
- Implement snapshots for performance
