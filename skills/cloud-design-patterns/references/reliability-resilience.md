# Reliability & Resilience Patterns

## Ambassador Pattern

**Problem**: Services need proxy functionality for network requests (logging, monitoring, routing, security).

**Solution**: Create helper services that send network requests on behalf of a consumer service or application.

**When to Use**:
- Offloading common client connectivity tasks (monitoring, logging, routing)
- Supporting legacy applications that can't be easily modified
- Implementing retry logic, circuit breakers, or timeout handling for remote services

**Implementation Considerations**:
- Deploy ambassador as a sidecar process or container with the application
- Consider network latency introduced by the proxy layer
- Ensure ambassador doesn't become a single point of failure

## Bulkhead Pattern

**Problem**: A failure in one component can cascade and affect the entire system.

**Solution**: Isolate elements of an application into pools so that if one fails, the others continue to function.

**When to Use**:
- Isolating critical resources from less critical ones
- Preventing resource exhaustion in one area from affecting others
- Partitioning consumers and resources to improve availability

**Implementation Considerations**:
- Separate connection pools for different backends
- Partition service instances across different groups
- Use resource limits (CPU, memory, threads) per partition
- Monitor bulkhead health and capacity

## Circuit Breaker Pattern

**Problem**: Applications can waste resources attempting operations that are likely to fail.

**Solution**: Prevent an application from repeatedly trying to execute an operation that's likely to fail, allowing it to continue without waiting for the fault to be fixed.

**When to Use**:
- Protecting against cascading failures
- Failing fast when a remote service is unavailable
- Providing fallback behavior when services are down

**Implementation Considerations**:
- Define threshold for triggering circuit breaker (failures/time window)
- Implement three states: Closed, Open, Half-Open
- Set appropriate timeout values for operations
- Log state transitions and failures for diagnostics
- Provide meaningful error messages to clients

## Compensating Transaction Pattern

**Problem**: Distributed transactions are difficult to implement and may not be supported.

**Solution**: Undo the work performed by a sequence of steps that collectively form an eventually consistent operation.

**When to Use**:
- Implementing eventual consistency in distributed systems
- Rolling back multi-step business processes that fail partway through
- Handling long-running transactions that can't use 2PC

**Implementation Considerations**:
- Define compensating logic for each step in transaction
- Store enough state to undo operations
- Handle idempotency for compensation operations
- Consider ordering dependencies between compensating actions

## Retry Pattern

**Problem**: Transient failures are common in distributed systems.

**Solution**: Enable applications to handle anticipated temporary failures by retrying failed operations.

**When to Use**:
- Handling transient faults (network glitches, temporary unavailability)
- Operations expected to succeed after a brief delay
- Non-idempotent operations with careful consideration

**Implementation Considerations**:
- Implement exponential backoff between retries
- Set maximum retry count to avoid infinite loops
- Distinguish between transient and permanent failures
- Ensure operations are idempotent or track retry attempts
- Consider jitter to avoid thundering herd problem

## Health Endpoint Monitoring Pattern

**Problem**: External tools need to verify system health and availability.

**Solution**: Implement functional checks in an application that external tools can access through exposed endpoints at regular intervals.

**When to Use**:
- Monitoring web applications and back-end services
- Implementing readiness and liveness probes
- Providing detailed health information to orchestrators

**Implementation Considerations**:
- Expose health endpoints (e.g., `/health`, `/ready`, `/live`)
- Check critical dependencies (databases, queues, external services)
- Return appropriate HTTP status codes (200, 503)
- Implement authentication/authorization for sensitive health data
- Provide different levels of detail based on security context

## Leader Election Pattern

**Problem**: Distributed tasks need coordination through a single instance.

**Solution**: Coordinate actions in a distributed application by electing one instance as the leader that manages collaborating task instances.

**When to Use**:
- Coordinating distributed tasks
- Managing shared resources in a cluster
- Ensuring single-instance execution of critical tasks

**Implementation Considerations**:
- Use distributed locking mechanisms (Redis, etcd, ZooKeeper)
- Handle leader failures with automatic re-election
- Implement heartbeats to detect leader health
- Ensure followers can become leaders quickly

## Saga Pattern

**Problem**: Maintaining data consistency across microservices without distributed transactions.

**Solution**: Manage data consistency across microservices in distributed transaction scenarios using a sequence of local transactions.

**When to Use**:
- Long-running business processes spanning multiple services
- Distributed transactions without 2PC support
- Eventual consistency requirements across microservices

**Implementation Considerations**:
- Choose between orchestration (centralized) or choreography (event-based)
- Define compensating transactions for rollback scenarios
- Handle partial failures and rollback logic
- Implement idempotency for all saga steps
- Provide clear audit trails and monitoring

## Sequential Convoy Pattern

**Problem**: Process related messages in order without blocking independent message groups.

**Solution**: Process a set of related messages in a defined order without blocking other message groups.

**When to Use**:
- Message processing requires strict ordering within groups
- Independent message groups can be processed in parallel
- Implementing session-based message processing

**Implementation Considerations**:
- Use session IDs or partition keys to group related messages
- Process each group sequentially but process groups in parallel
- Handle message failures within a session appropriately
