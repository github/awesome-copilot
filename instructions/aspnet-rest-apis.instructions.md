---
description: 'Guidelines for building REST APIs with ASP.NET'
applyTo: '**/*.cs, **/*.json'
---

# ASP.NET REST API Development

## Instruction
- Guide users through building their first REST API using ASP.NET Core 9.
- Explain both traditional Web API controllers and the newer Minimal API approach.
- Provide educational context for each implementation decision to help users understand the underlying concepts.
- Emphasize best practices for API design, testing, documentation, and deployment.
- Focus on providing explanations alongside code examples rather than just implementing features.

## API Design Fundamentals

- Explain REST architectural principles and how they apply to ASP.NET Core APIs.
- Guide users in designing meaningful resource-oriented URLs and appropriate HTTP verb usage.
- Demonstrate the difference between traditional controller-based APIs and Minimal APIs.
- Explain status codes, content negotiation, and response formatting in the context of REST.
- Help users understand when to choose Controllers vs. Minimal APIs based on project requirements.

## Project Setup and Structure

- Guide users through creating a new ASP.NET Core 9 Web API project with the appropriate templates.
- Explain the purpose of each generated file and folder to build understanding of the project structure.
- Demonstrate how to organize code using feature folders or domain-driven design principles.
- Show proper separation of concerns with models, services, and data access layers.
- Explain the Program.cs and configuration system in ASP.NET Core 9 including environment-specific settings.

## Building Controller-Based APIs

- Guide the creation of RESTful controllers with proper resource naming and HTTP verb implementation.
- Explain attribute routing and its advantages over conventional routing.
- Demonstrate model binding, validation, and the role of [ApiController] attribute.
- Show how dependency injection works within controllers.
- Explain action return types (IActionResult, ActionResult<T>, specific return types) and when to use each.

## Implementing Minimal APIs

- Guide users through implementing the same endpoints using the Minimal API syntax.
- Explain the endpoint routing system and how to organize route groups.
- Demonstrate parameter binding, validation, and dependency injection in Minimal APIs.
- Show how to structure larger Minimal API applications to maintain readability.
- Compare and contrast with controller-based approach to help users understand the differences.

## Data Access Patterns

- Guide the implementation of a data access layer using Entity Framework Core.
- Explain different options (SQL Server, SQLite, In-Memory) for development and production.
- Demonstrate repository pattern implementation and when it's beneficial.
- Show how to implement database migrations and data seeding.
- Explain efficient query patterns to avoid common performance issues.

## Authentication and Authorization

- Guide users through implementing authentication using JWT Bearer tokens.
- Explain OAuth 2.0 and OpenID Connect concepts as they relate to ASP.NET Core.
- Show how to implement role-based and policy-based authorization.
- Demonstrate integration with Microsoft Entra ID (formerly Azure AD).
- Explain how to secure both controller-based and Minimal APIs consistently.

## Validation and Error Handling

- Guide the implementation of model validation using data annotations and FluentValidation.
- Explain the validation pipeline and how to customize validation responses.
- Demonstrate a global exception handling strategy using middleware.
- Show how to create consistent error responses across the API.
- Explain problem details (RFC 7807) implementation for standardized error responses.

## API Versioning and Documentation

- Guide users through implementing and explaining API versioning strategies.
- Demonstrate Swagger/OpenAPI implementation with proper documentation.
- Show how to document endpoints, parameters, responses, and authentication.
- Explain versioning in both controller-based and Minimal APIs.
- Guide users on creating meaningful API documentation that helps consumers.

## Logging and Monitoring

- Guide the implementation of structured logging using Serilog or other providers.
- Explain the logging levels and when to use each.
- Demonstrate integration with Application Insights for telemetry collection.
- Show how to implement custom telemetry and correlation IDs for request tracking.
- Explain how to monitor API performance, errors, and usage patterns.

## Testing REST APIs

- Guide users through creating unit tests for controllers, Minimal API endpoints, and services.
- Explain integration testing approaches for API endpoints.
- Demonstrate how to mock dependencies for effective testing.
- Show how to test authentication and authorization logic.
- Explain test-driven development principles as applied to API development.

## Performance Optimization

- Guide users on implementing caching strategies (in-memory, distributed, response caching).
- Explain asynchronous programming patterns and why they matter for API performance.
- Demonstrate pagination, filtering, and sorting for large data sets.
- Show how to implement compression and other performance optimizations.
- Explain how to measure and benchmark API performance.

## Deployment and DevOps

- Guide users through containerizing their API using .NET's built-in container support (`dotnet publish --os linux --arch x64 -p:PublishProfile=DefaultContainer`).
- Explain the differences between manual Dockerfile creation and .NET's container publishing features.
- Explain CI/CD pipelines for ASP.NET Core applications.
- Demonstrate deployment to Azure App Service, Azure Container Apps, or other hosting options.
- Show how to implement health checks and readiness probes.
- Explain environment-specific configurations for different deployment stages.
