---
name: clean-architecture
description: 'Enforce Clean Architecture boundaries, the Dependency Rule, and layered separation of concerns across any language or framework. Use when creating, reviewing, or refactoring modules; auditing imports and dependency direction; splitting business logic from infrastructure or presentation; or adopting Hexagonal, Onion, or Clean Architecture patterns.'
---

# Clean Architecture

Enforce Clean Architecture principles — the Dependency Rule, layer boundaries,
and separation of concerns — across any language or framework.

## When to Use This Skill

- Creating or restructuring a project with domain-centric layout
- Reviewing imports and dependency direction between layers
- Splitting business logic from infrastructure, persistence, or UI
- Evaluating pull requests for architectural compliance

## The Dependency Rule

> Source code dependencies must only point **inward**. Nothing in an inner
> circle can know anything at all about something in an outer circle.
> — Robert C. Martin

This single rule governs the entire architecture.

## Layers

From innermost to outermost:

### Layer 1 — Domain Entities

Pure business objects. **Zero external dependencies** — no frameworks, ORMs, or I/O.

**Contains:** Entities, Value Objects, Domain Events, Aggregates, Domain Services, Domain Exceptions

**Rules:**
- MUST NOT import from any outer layer
- MUST NOT depend on frameworks, ORMs, serialization, or I/O
- SHOULD be testable with zero infrastructure setup

### Layer 2 — Use Cases (Application)

Orchestrates domain objects. Defines port interfaces that outer layers implement.

**Contains:** Application Services, Command/Query Handlers, Input/Output DTOs, Port Interfaces (repository/gateway contracts)

**Rules:**
- MAY import from Domain (Layer 1) only
- MUST NOT import from Infrastructure or Presentation
- Defines abstractions — does NOT contain domain logic itself

### Layer 3 — Interface Adapters

Converts data between use case format and external tool format.

**Contains:** Controllers, Repository Implementations, API Clients, Mappers, Presenters

**Rules:**
- MAY import from Use Cases (Layer 2) and Domain (Layer 1)
- Implements port interfaces defined in Layer 2
- All SQL, ORM, HTTP client calls live here

### Layer 4 — Frameworks & Drivers

Glue code and entry points. Minimal custom code.

**Contains:** Composition Root, framework config, CLI entry points, DI wiring

**Rules:**
- Outermost layer — may import anything
- Inner layers MUST NOT depend on anything here

## Review Checklist

When reviewing code, verify each of these:

- [ ] **Dependency direction** — All imports point inward (outer → inner)
- [ ] **Domain purity** — No framework/ORM/HTTP imports in domain layer
- [ ] **Ports in the right place** — Interfaces defined in Use Cases, implemented in Adapters
- [ ] **No business logic in controllers** — Controllers only parse input, call use case, format output
- [ ] **Data at boundaries** — DTOs cross boundaries, not entities or ORM models
- [ ] **Composition Root** — DI wiring centralized at outermost layer only

## Domain Purity — Red Flags

If you see **any** of these in a domain layer file, flag immediately:

| Category | Examples to Flag |
|----------|-----------------|
| ORM | `sqlalchemy`, `django.db`, `Entity Framework`, `@Entity` (JPA), `typeorm` |
| Web framework | `fastapi`, `flask`, `express`, `@nestjs/common`, `Spring MVC`, `ASP.NET` |
| HTTP types | `HttpRequest`, `Response`, `HttpContext` |
| Serialization | `@JsonProperty`, `[JsonIgnore]`, `pydantic.BaseModel` (on entities) |
| Database | `Connection`, `Session`, `DbContext`, `EntityManager` |

## Anti-Patterns

| Anti-Pattern | Fix |
|-------------|-----|
| Entity inherits ORM base class | Separate persistence model; map in repository |
| Controller contains business logic | Move to Use Case |
| Repository returns ORM objects | Map to domain entities inside repository |
| Use Case references concrete infra class | Define port interface; inject via DI |
| Domain imports logging framework | Define Logger port; implement in infrastructure |

## Key Patterns

### Repository (Port + Adapter)

```
# Port — defined in Use Cases layer
interface OrderRepository:
    find_by_id(id) -> Order
    save(order: Order) -> void

# Adapter — defined in Infrastructure layer
class PostgresOrderRepository implements OrderRepository:
    find_by_id(id) -> Order:
        row = self.session.query(OrderModel).get(id)
        return self._to_domain(row)  # Map ORM -> Domain
```

### Use Case

```
class CreateOrderUseCase:
    def __init__(self, repo: OrderRepository, gateway: PaymentGateway):
        ...  # Depends on port interfaces, NOT concrete classes

    def execute(self, input: CreateOrderInput) -> CreateOrderOutput:
        order = Order.create(input.items)     # Domain logic
        self.repo.save(order)                  # Port call
        return CreateOrderOutput(order.id)
```

### Composition Root

```
# Outermost layer — the ONLY place concrete implementations are referenced
app = Application(
    create_order=CreateOrderUseCase(
        repo=PostgresOrderRepository(session),
        gateway=StripePaymentGateway(api_key),
    )
)
```

## Severity Guide

| Severity | Meaning | Example |
|----------|---------|---------|
| CRITICAL | Dependency Rule violation | Domain entity importing ORM |
| HIGH | Wrong-direction boundary crossing | Use Case importing Controller |
| MEDIUM | Leaky abstraction | Returning ORM model from repository |
| LOW | Convention issue | Utility in wrong layer |
