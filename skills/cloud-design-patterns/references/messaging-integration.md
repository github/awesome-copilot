# Messaging & Integration Patterns

## Choreography Pattern

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

## Claim Check Pattern

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

## Competing Consumers Pattern

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

## Messaging Bridge Pattern

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

## Pipes and Filters Pattern

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

## Publisher-Subscriber Pattern

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

## Scheduler Agent Supervisor Pattern

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
