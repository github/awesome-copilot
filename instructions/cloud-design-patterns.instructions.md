---
description: 'Cloud Design Patterns for distributed systems architecture'
applyTo: '**/*.bicep, **/*.tf, **/*.cs, **/*.java, **/*.py, **/*.js, **/*.ts, **/*.go, **/architecture.md, **/design.md, **/README.md'
---

# Cloud Design Patterns

## Overview

Architects design workloads by integrating platform services, functionality, and code to meet both functional and nonfunctional requirements. To design effective workloads, you must understand these requirements and select topologies and methodologies that address the challenges of your workload's constraints. Cloud design patterns provide solutions to many common challenges.

System design heavily relies on established design patterns. You can design infrastructure, code, and distributed systems by using a combination of these patterns. These patterns are crucial for building reliable, highly secure, cost-optimized, operationally efficient, and high-performing applications in the cloud.

The following cloud design patterns are technology-agnostic, which makes them suitable for any distributed system. You can apply these patterns across Azure, other cloud platforms, on-premises setups, and hybrid environments.

### How Cloud Design Patterns Enhance the Design Process

Cloud workloads are vulnerable to the fallacies of distributed computing, which are common but incorrect assumptions about how distributed systems operate. Examples of these fallacies include:

- The network is reliable.
- Latency is zero.
- Bandwidth is infinite.
- The network is secure.
- Topology doesn't change.
- There's one administrator.
- Component versioning is simple.
- Observability implementation can be delayed.

These misconceptions can result in flawed workload designs. Design patterns don't eliminate these misconceptions but help raise awareness, provide compensation strategies, and provide mitigations. Each cloud design pattern has trade-offs. Focus on why you should choose a specific pattern instead of how to implement it.

Consider how to use these industry-standard design patterns as the core building blocks for a well-architected workload design. Each design pattern in the Azure Well-Architected Framework represents one or more of its pillars. Some patterns might introduce trade-offs that affect the goals of other pillars.

## Reliability & Resilience Patterns

### Ambassador Pattern

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

### Bulkhead Pattern

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

### Circuit Breaker Pattern

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

### Compensating Transaction Pattern

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

### Retry Pattern

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

### Health Endpoint Monitoring Pattern

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

### Leader Election Pattern

**Problem**: Distributed tasks need coordination through a single instance.

**Solution**: Coordinate actions in a distributed application by electing one instance as the leader that manages collaborating task instances.

**When to Use**:
- Coordinating distributed tasks
- Managing shared resources in a cluster
- Ensuring single-instance execution of critical tasks

**Implementation Considerations**:
- Use distributed locking mechanisms (Redis, etcd, Zookeeper)
- Handle leader failures with automatic re-election
- Implement heartbeats to detect leader health
- Ensure followers can become leaders quickly

### Saga Pattern

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

### Sequential Convoy Pattern

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

## Performance Patterns

### Asynchronous Request-Reply Pattern

**Problem**: Client applications expect synchronous responses, but back-end processing is asynchronous.

**Solution**: Decouple back-end processing from a front-end host where back-end processing must be asynchronous, but the front end requires a clear response.

**When to Use**:
- Long-running back-end operations
- Client applications can't wait for synchronous responses
- Offloading compute-intensive operations from web tier

**Implementation Considerations**:
- Return HTTP 202 (Accepted) with location header for status checking
- Implement status endpoint for clients to poll
- Consider webhooks for callback notifications
- Use correlation IDs to track requests
- Implement timeouts for long-running operations

### Cache-Aside Pattern

**Problem**: Applications repeatedly access the same data from a data store.

**Solution**: Load data on demand into a cache from a data store when needed.

**When to Use**:
- Frequently accessed, read-heavy data
- Data that changes infrequently
- Reducing load on primary data store

**Implementation Considerations**:
- Check cache before accessing data store
- Load data into cache on cache miss (lazy loading)
- Set appropriate cache expiration policies
- Implement cache invalidation strategies
- Handle cache failures gracefully (fallback to data store)
- Consider cache coherency in distributed scenarios

### CQRS (Command Query Responsibility Segregation) Pattern

**Problem**: Read and write workloads have different requirements and scaling needs.

**Solution**: Separate operations that read data from those that update data by using distinct interfaces.

**When to Use**:
- Read and write workloads have vastly different performance characteristics
- Different teams work on read and write sides
- Need to prevent merge conflicts in collaborative scenarios
- Complex business logic differs between reads and writes

**Implementation Considerations**:
- Separate read and write models
- Use event sourcing to synchronize models
- Scale read and write sides independently
- Consider eventual consistency implications
- Implement appropriate security for commands vs queries

### Index Table Pattern

**Problem**: Queries frequently reference fields that aren't indexed efficiently.

**Solution**: Create indexes over the fields in data stores that queries frequently reference.

**When to Use**:
- Improving query performance
- Supporting multiple query patterns
- Working with NoSQL databases without native indexing

**Implementation Considerations**:
- Create separate tables/collections optimized for specific queries
- Maintain indexes asynchronously using events or triggers
- Consider storage overhead of duplicate data
- Handle index update failures and inconsistencies

### Materialized View Pattern

**Problem**: Data is poorly formatted for required query operations.

**Solution**: Generate prepopulated views over the data in one or more data stores when the data isn't ideally formatted for query operations.

**When to Use**:
- Complex queries over normalized data
- Improving read performance for complex joins/aggregations
- Supporting multiple query patterns efficiently

**Implementation Considerations**:
- Refresh views asynchronously using background jobs or triggers
- Consider staleness tolerance for materialized data
- Balance between storage cost and query performance
- Implement incremental refresh where possible

### Priority Queue Pattern

**Problem**: Some requests need faster processing than others.

**Solution**: Prioritize requests sent to services so that requests with a higher priority are processed more quickly.

**When to Use**:
- Providing different service levels to different customers
- Processing critical operations before less important ones
- Managing mixed workloads with varying importance

**Implementation Considerations**:
- Use message priority metadata
- Implement multiple queues for different priority levels
- Prevent starvation of low-priority messages
- Monitor queue depths and processing times per priority

### Queue-Based Load Leveling Pattern

**Problem**: Intermittent heavy loads can overwhelm services.

**Solution**: Use a queue as a buffer between a task and a service to smooth intermittent heavy loads.

**When to Use**:
- Protecting services from traffic spikes
- Decoupling producers and consumers
- Enabling asynchronous processing

**Implementation Considerations**:
- Choose appropriate queue technology (Azure Storage Queue, Service Bus, etc.)
- Monitor queue length to detect saturation
- Implement auto-scaling based on queue depth
- Set appropriate message time-to-live (TTL)
- Handle poison messages with dead-letter queues

### Rate Limiting Pattern

**Problem**: Service consumption must be controlled to prevent resource exhaustion.

**Solution**: Control the consumption of resources by applications, tenants, or services to prevent resource exhaustion and throttling.

**When to Use**:
- Protecting backend services from overload
- Implementing fair usage policies
- Preventing one tenant from monopolizing resources

**Implementation Considerations**:
- Implement token bucket, leaky bucket, or fixed window algorithms
- Return HTTP 429 (Too Many Requests) when limits exceeded
- Provide Retry-After headers to clients
- Consider different limits for different clients/tiers
- Make limits configurable and monitorable

### Sharding Pattern

**Problem**: A single data store may have limitations in storage capacity and performance.

**Solution**: Divide a data store into a set of horizontal partitions or shards.

**When to Use**:
- Scaling beyond single database limits
- Improving query performance by reducing dataset size
- Distributing load across multiple databases

**Implementation Considerations**:
- Choose appropriate shard key (hash, range, or list-based)
- Avoid hot partitions by selecting balanced shard keys
- Handle cross-shard queries carefully
- Plan for shard rebalancing and splitting
- Consider operational complexity of managing multiple shards

### Throttling Pattern

**Problem**: Resource consumption must be limited to prevent system overload.

**Solution**: Control the consumption of resources used by an application, tenant, or service.

**When to Use**:
- Ensuring system operates within defined capacity
- Preventing resource exhaustion during peak load
- Enforcing SLA-based resource allocation

**Implementation Considerations**:
- Implement at API gateway or service level
- Use different strategies: reject requests, queue, or degrade service
- Return appropriate HTTP status codes (429, 503)
- Provide clear feedback to clients about throttling
- Monitor throttling metrics to adjust capacity

## Messaging & Integration Patterns

### Choreography Pattern

**Problem**: Central orchestrators create coupling and single points of failure.

**Solution**: Let individual services decide when and how a business operation is processed through event-driven collaboration.

**When to Use**:
- Loosely coupled microservices architectures
- Event-driven systems
- Avoiding central orchestration bottlenecks

**Implementation Considerations**:
- Use publish-subscribe messaging for event distribution
- Each service publishes domain events and subscribes to relevant events
- Implement saga pattern for complex workflows
- Ensure idempotency as events may be delivered multiple times
- Provide comprehensive logging and distributed tracing

### Claim Check Pattern

**Problem**: Large messages can overwhelm message infrastructure.

**Solution**: Split a large message into a claim check (reference) and a payload stored separately.

**When to Use**:
- Messages exceed messaging system size limits
- Reducing message bus load
- Handling large file transfers asynchronously

**Implementation Considerations**:
- Store payload in blob storage or database
- Send only reference/URI through message bus
- Implement expiration policies for stored payloads
- Handle access control for payload storage
- Consider costs of storage vs message transmission

### Competing Consumers Pattern

**Problem**: Single consumer may not keep up with message volume.

**Solution**: Enable multiple concurrent consumers to process messages from the same messaging channel.

**When to Use**:
- High message throughput requirements
- Scaling message processing horizontally
- Load balancing across multiple instances

**Implementation Considerations**:
- Ensure messages can be processed in any order
- Use competing consumer queues (Service Bus, RabbitMQ)
- Implement idempotency for message handlers
- Handle poison messages with retry and dead-letter policies
- Scale consumer count based on queue depth

### Messaging Bridge Pattern

**Problem**: Different systems use incompatible messaging technologies.

**Solution**: Build an intermediary to enable communication between messaging systems that are otherwise incompatible.

**When to Use**:
- Migrating between messaging systems
- Integrating with legacy systems
- Connecting cloud and on-premises messaging

**Implementation Considerations**:
- Transform message formats between systems
- Handle protocol differences
- Maintain message ordering if required
- Implement error handling and retry logic
- Monitor bridge performance and health

### Pipes and Filters Pattern

**Problem**: Complex processing tasks are difficult to maintain and reuse.

**Solution**: Break down a task that performs complex processing into a series of separate, reusable elements (filters) connected by channels (pipes).

**When to Use**:
- Processing data streams with multiple transformations
- Building reusable processing components
- Enabling parallel processing of independent operations

**Implementation Considerations**:
- Each filter performs a single transformation
- Connect filters using message queues or streams
- Enable parallel execution where possible
- Handle errors within filters or at pipeline level
- Support filter composition and reordering

### Publisher-Subscriber Pattern

**Problem**: Applications need to broadcast information to multiple interested consumers.

**Solution**: Enable an application to announce events to multiple consumers asynchronously, without coupling senders to receivers.

**When to Use**:
- Broadcasting events to multiple interested parties
- Decoupling event producers from consumers
- Implementing event-driven architectures

**Implementation Considerations**:
- Use topic-based or content-based subscriptions
- Ensure message delivery guarantees match requirements
- Implement subscription filters for selective consumption
- Handle consumer failures without affecting publishers
- Consider message ordering requirements per subscriber

### Scheduler Agent Supervisor Pattern

**Problem**: Distributed actions need coordination and monitoring.

**Solution**: Coordinate a set of actions across distributed services and resources with a supervisor that monitors and manages the workflow.

**When to Use**:
- Orchestrating multi-step workflows
- Coordinating distributed transactions
- Implementing resilient long-running processes

**Implementation Considerations**:
- Scheduler dispatches tasks to agents
- Agents perform work and report status
- Supervisor monitors progress and handles failures
- Implement compensation logic for failed steps
- Maintain state for workflow recovery

## Architecture & Design Patterns

### Anti-Corruption Layer Pattern

**Problem**: New systems must integrate with legacy systems that use outdated models or technologies.

**Solution**: Implement a façade or adapter layer between a modern application and a legacy system to prevent legacy constraints from affecting new design.

**When to Use**:
- Migrating from legacy systems incrementally
- Integrating with third-party systems with different domain models
- Protecting modern architectures from legacy constraints

**Implementation Considerations**:
- Create translation layer between domain models
- Map between legacy and modern data structures
- Isolate legacy system interfaces behind abstractions
- Consider performance impact of translation
- Plan for eventual removal if migration is complete

### Backends for Frontends (BFF) Pattern

**Problem**: A single backend may not optimally serve different client types.

**Solution**: Create separate backend services to serve specific frontend applications or interfaces.

**When to Use**:
- Different client types (web, mobile, IoT) have different needs
- Optimizing payload size and shape per client
- Reducing coupling between frontend and shared backend

**Implementation Considerations**:
- Create one BFF per user experience or client type
- Tailor API contracts to frontend needs
- Avoid duplicating business logic across BFFs
- Share common services between BFFs
- Manage increased number of services

### Gateway Aggregation Pattern

**Problem**: Clients need data from multiple backend services.

**Solution**: Use a gateway to aggregate multiple individual requests into a single request.

**When to Use**:
- Reducing chattiness between clients and backends
- Combining data from multiple sources for a single view
- Reducing latency by parallelizing backend calls

**Implementation Considerations**:
- API gateway aggregates responses from multiple services
- Execute backend calls in parallel where possible
- Handle partial failures appropriately
- Consider caching of aggregated responses
- Avoid creating a monolithic gateway

### Gateway Offloading Pattern

**Problem**: Shared functionality is duplicated across multiple services.

**Solution**: Offload shared or specialized service functionality to a gateway proxy.

**When to Use**:
- Centralizing cross-cutting concerns (SSL, authentication, logging)
- Simplifying service implementation
- Standardizing shared functionality

**Implementation Considerations**:
- Offload SSL termination to gateway
- Implement authentication and authorization at gateway
- Handle rate limiting and throttling
- Provide request/response logging
- Avoid making gateway a bottleneck

### Gateway Routing Pattern

**Problem**: Clients need to access multiple services through a single endpoint.

**Solution**: Route requests to multiple services using a single endpoint.

**When to Use**:
- Providing a single entry point for multiple services
- Abstracting backend service topology from clients
- Enabling service versioning and migration strategies

**Implementation Considerations**:
- Route based on URL path, headers, or query parameters
- Support URL rewriting and transformation
- Enable A/B testing and canary deployments
- Implement health checks for backend services
- Monitor routing performance

### Sidecar Pattern

**Problem**: Applications need auxiliary functionality without coupling.

**Solution**: Deploy components of an application into a separate process or container to provide isolation and encapsulation.

**When to Use**:
- Adding functionality to applications without modifying them
- Implementing cross-cutting concerns (logging, monitoring, security)
- Supporting heterogeneous environments

**Implementation Considerations**:
- Deploy sidecar alongside main application
- Share lifecycle, resources, and network with main application
- Use for proxying, logging, configuration, or monitoring
- Consider resource overhead of additional containers
- Standardize sidecar implementations across services

### Strangler Fig Pattern

**Problem**: Legacy systems are risky to replace all at once.

**Solution**: Incrementally migrate a legacy system by gradually replacing specific pieces of functionality with new applications and services.

**When to Use**:
- Modernizing legacy applications
- Reducing risk of big-bang migrations
- Enabling incremental business value delivery

**Implementation Considerations**:
- Identify functionality to migrate incrementally
- Use facade or proxy to route between old and new
- Migrate less risky components first
- Run old and new systems in parallel initially
- Plan for eventual decommissioning of legacy system

## Deployment & Operational Patterns

### Compute Resource Consolidation Pattern

**Problem**: Multiple tasks consume resources inefficiently when isolated.

**Solution**: Consolidate multiple tasks or operations into a single computational unit.

**When to Use**:
- Reducing infrastructure costs
- Improving resource utilization
- Simplifying deployment and management

**Implementation Considerations**:
- Group related tasks with similar scaling requirements
- Use containers or microservices hosting
- Monitor resource usage per task
- Ensure isolation where needed for security/reliability
- Balance between consolidation and failure isolation

### Deployment Stamps Pattern

**Problem**: Applications need to scale across regions or customer segments.

**Solution**: Deploy multiple independent copies of application components (stamps), including data stores, to serve different regions or customer segments.

**When to Use**:
- Scaling beyond single stamp limits
- Providing regional data residency
- Isolating tenants for security or performance

**Implementation Considerations**:
- Each stamp is a complete, self-contained deployment
- Deploy stamps across regions for geo-distribution
- Route requests to appropriate stamp
- Manage stamp deployments consistently (IaC)
- Plan for stamp capacity and when to add new stamps

### External Configuration Store Pattern

**Problem**: Application configuration is embedded in deployment packages.

**Solution**: Move configuration information out of the application deployment package to a centralized location.

**When to Use**:
- Managing configuration across multiple environments
- Updating configuration without redeployment
- Sharing configuration across multiple applications

**Implementation Considerations**:
- Use Azure App Configuration, Key Vault, or similar services
- Implement configuration change notifications
- Cache configuration locally to reduce dependencies
- Secure sensitive configuration (connection strings, secrets)
- Version configuration changes

### Geode Pattern

**Problem**: Users in different regions experience high latency.

**Solution**: Deploy backend services into a set of geographical nodes, each of which can service any client request in any region.

**When to Use**:
- Reducing latency for globally distributed users
- Providing high availability across regions
- Implementing active-active geo-distribution

**Implementation Considerations**:
- Deploy application instances in multiple regions
- Replicate data globally (consider consistency implications)
- Route users to nearest healthy region
- Implement conflict resolution for multi-master writes
- Monitor regional health and performance

### Static Content Hosting Pattern

**Problem**: Serving static content from compute instances is inefficient.

**Solution**: Deploy static content to a cloud-based storage service that can deliver content directly to the client.

**When to Use**:
- Hosting images, videos, CSS, JavaScript files
- Reducing load on web servers
- Improving content delivery performance

**Implementation Considerations**:
- Use blob storage, CDN, or static website hosting
- Enable CORS for cross-origin access
- Implement caching headers appropriately
- Use CDN for global content distribution
- Secure content with SAS tokens if needed

## Security Patterns

### Federated Identity Pattern

**Problem**: Applications must manage user authentication and authorization.

**Solution**: Delegate authentication to an external identity provider.

**When to Use**:
- Implementing single sign-on (SSO)
- Reducing authentication complexity
- Supporting social identity providers

**Implementation Considerations**:
- Use Azure AD, Auth0, or other identity providers
- Implement OAuth 2.0, OpenID Connect, or SAML
- Store minimal user data locally
- Handle identity provider outages gracefully
- Implement proper token validation

### Quarantine Pattern

**Problem**: External assets may contain malicious content or vulnerabilities.

**Solution**: Ensure that external assets meet a team-agreed quality level before the workload consumes them.

**When to Use**:
- Processing user-uploaded files
- Consuming external data or packages
- Implementing zero-trust architectures

**Implementation Considerations**:
- Scan all external content before use (malware, vulnerabilities)
- Isolate quarantine environment from production
- Define clear quality gates for release
- Implement automated scanning and validation
- Log all quarantine activities for audit

### Valet Key Pattern

**Problem**: Applications shouldn't proxy all client data access.

**Solution**: Use a token or key that provides clients with restricted direct access to a specific resource or service.

**When to Use**:
- Providing direct access to storage without proxying
- Minimizing data transfer through application tier
- Implementing time-limited or constrained access

**Implementation Considerations**:
- Generate SAS tokens or pre-signed URLs
- Set appropriate expiration times
- Limit permissions (read-only, write-only, specific operations)
- Implement token revocation if needed
- Monitor usage of valet keys

## Event-Driven Architecture Patterns

### Event Sourcing Pattern

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

## Best Practices for Pattern Selection

### Selecting Appropriate Patterns

- **Understand the problem**: Clearly identify the specific challenge before choosing a pattern
- **Consider trade-offs**: Each pattern introduces complexity and trade-offs
- **Combine patterns**: Many patterns work better together (Circuit Breaker + Retry, CQRS + Event Sourcing)
- **Start simple**: Don't over-engineer; apply patterns when the need is clear
- **Platform-specific**: Consider Azure services that implement patterns natively

### Well-Architected Framework Alignment

Map selected patterns to Well-Architected Framework pillars:
- **Reliability**: Circuit Breaker, Bulkhead, Retry, Health Endpoint Monitoring
- **Security**: Federated Identity, Valet Key, Gateway Offloading, Quarantine
- **Cost Optimization**: Compute Resource Consolidation, Static Content Hosting, Throttling
- **Operational Excellence**: External Configuration Store, Sidecar, Deployment Stamps
- **Performance Efficiency**: Cache-Aside, CQRS, Materialized View, Sharding

### Pattern Documentation

When implementing patterns, document:
- Which pattern is being used and why
- Trade-offs accepted
- Configuration and tuning parameters
- Monitoring and observability approach
- Failure scenarios and recovery procedures

### Monitoring Patterns

- Implement comprehensive observability for all patterns
- Track pattern-specific metrics (circuit breaker state, cache hit ratio, queue depth)
- Use distributed tracing for patterns involving multiple services
- Alert on pattern degradation (circuit frequently open, high retry rates)

## Azure Service Mappings

### Common Azure Services per Pattern

- **Message Queue**: Azure Service Bus, Azure Storage Queue, Event Hubs
- **Cache**: Azure Cache for Redis, Azure Front Door cache
- **API Gateway**: Azure API Management, Azure Application Gateway
- **Identity**: Azure AD, Azure AD B2C
- **Configuration**: Azure App Configuration, Azure Key Vault
- **Storage**: Azure Storage (Blob, Table, Queue), Azure Cosmos DB
- **Compute**: Azure Functions, Azure Container Apps, Azure Kubernetes Service
- **Event Streaming**: Azure Event Hubs, Azure Event Grid
- **CDN**: Azure CDN, Azure Front Door

## References

- [Cloud Design Patterns - Azure Architecture Center](https://learn.microsoft.com/azure/architecture/patterns/)
- [Azure Well-Architected Framework](https://learn.microsoft.com/azure/architecture/framework/)
- [Distributed Systems Patterns](https://learn.microsoft.com/azure/architecture/patterns/category/distributed-systems)
