# Architecture Decision Record (ADR) Template

**Title:** [Short noun phrase describing the decision, e.g., "Use Kafka for Order Processing Events"]
**Date:** [YYYY-MM-DD]
**Status:** [Proposed | Accepted | Rejected | Deprecated]

## Context
[Describe the problem, the business context, and the technical constraints. Why are we making this decision now?]

## Decision
[The specific microservices architecture decision made. e.g., "We will use an asynchronous event-driven approach between the Order Service and Inventory Service using RabbitMQ."]

## Consequences
### Positive (Benefits)
* [e.g., Decouples the services, increasing fault tolerance]
* [e.g., Allows independent scaling of the Inventory Service]

### Negative (Trade-offs/Risks)
* [e.g., Introduces eventual consistency, requiring UI changes to handle pending states]
* [e.g., Adds infrastructure complexity (managing message brokers)]
