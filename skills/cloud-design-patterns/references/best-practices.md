# Best Practices for Pattern Selection

## Selecting Appropriate Patterns

- **Understand the problem**: Clearly identify the specific challenge before choosing a pattern
- **Consider trade-offs**: Each pattern introduces complexity and trade-offs
- **Combine patterns**: Many patterns work better together (Circuit Breaker + Retry, CQRS + Event Sourcing)
- **Start simple**: Don't over-engineer; apply patterns when the need is clear
- **Platform-specific**: Consider Azure services that implement patterns natively

## Well-Architected Framework Alignment

Map selected patterns to Well-Architected Framework pillars:
- **Reliability**: Circuit Breaker, Bulkhead, Retry, Health Endpoint Monitoring
- **Security**: Federated Identity, Valet Key, Gateway Offloading, Quarantine
- **Cost Optimization**: Compute Resource Consolidation, Static Content Hosting, Throttling
- **Operational Excellence**: External Configuration Store, Sidecar, Deployment Stamps
- **Performance Efficiency**: Cache-Aside, CQRS, Materialized View, Sharding

## Pattern Documentation

When implementing patterns, document:
- Which pattern is being used and why
- Trade-offs accepted
- Configuration and tuning parameters
- Monitoring and observability approach
- Failure scenarios and recovery procedures

## Monitoring Patterns

- Implement comprehensive observability for all patterns
- Track pattern-specific metrics (circuit breaker state, cache hit ratio, queue depth)
- Use distributed tracing for patterns involving multiple services
- Alert on pattern degradation (circuit frequently open, high retry rates)
