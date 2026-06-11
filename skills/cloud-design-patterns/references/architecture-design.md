# Architecture & Design Patterns

## Anti-Corruption Layer Pattern

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

## Backends for Frontends (BFF) Pattern

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

## Gateway Aggregation Pattern

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

## Gateway Offloading Pattern

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

## Gateway Routing Pattern

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

## Sidecar Pattern

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

## Strangler Fig Pattern

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
